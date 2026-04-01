import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { peertubeInstanceAuthTable } from "@/db/schema";
import { decrypt, encrypt } from "@/lib/encryption";
import { refreshPeerTubeToken } from "@/lib/peertube-auth";
import { searchPeerTubeVideos } from "@/lib/peertube-client";
import type { Context } from "../trpc";
import { protectedProcedure, router } from "../trpc";

/** Normalize a PeerTube instance host to its origin (no trailing slash). */
function normalizeHost(host: string): string {
  try {
    return new URL(host).origin;
  } catch {
    return host.replace(/\/$/, "");
  }
}

/**
 * Resolve a valid access token for the current user on the given host.
 * Handles token refresh transparently and updates the DB.
 * Returns null if no auth exists or tokens are unusable.
 */
async function resolveAccessToken(
  db: Context["db"],
  userId: string,
  host: string
): Promise<string | null> {
  const [record] = await db
    .select()
    .from(peertubeInstanceAuthTable)
    .where(
      and(
        eq(peertubeInstanceAuthTable.userId, userId),
        eq(peertubeInstanceAuthTable.instanceHost, host)
      )
    )
    .limit(1);

  if (!record?.accessTokenEncrypted) {
    return null;
  }

  const now = new Date();
  const isExpired =
    record.accessTokenExpiresAt != null && record.accessTokenExpiresAt <= now;

  if (!isExpired) {
    return decrypt(record.accessTokenEncrypted);
  }

  // Try refresh
  if (!record.refreshTokenEncrypted) {
    await db
      .update(peertubeInstanceAuthTable)
      .set({ status: "expired", updatedAt: now })
      .where(eq(peertubeInstanceAuthTable.id, record.id));
    return null;
  }

  try {
    const refreshToken = decrypt(record.refreshTokenEncrypted);
    const tokenResponse = await refreshPeerTubeToken(host, refreshToken);
    const expiresAt = new Date(
      now.getTime() + tokenResponse.expires_in * 1000
    );

    await db
      .update(peertubeInstanceAuthTable)
      .set({
        accessTokenEncrypted: encrypt(tokenResponse.access_token),
        refreshTokenEncrypted: encrypt(tokenResponse.refresh_token),
        accessTokenExpiresAt: expiresAt,
        status: "connected",
        lastError: null,
        updatedAt: now,
        lastUsedAt: now,
      })
      .where(eq(peertubeInstanceAuthTable.id, record.id));

    return tokenResponse.access_token;
  } catch {
    await db
      .update(peertubeInstanceAuthTable)
      .set({
        status: "expired",
        lastError: "token_refresh_failed",
        updatedAt: now,
      })
      .where(eq(peertubeInstanceAuthTable.id, record.id));
    return null;
  }
}

export const peertubeSearchRouter = router({
  searchVideos: protectedProcedure
    .input(
      z.object({
        baseUrl: z.url(),
        search: z.string().min(1, "Search query is required"),
        start: z.number().int().min(0).optional().default(0),
        count: z.number().int().min(1).max(100).optional().default(15),
      })
    )
    .query(async ({ ctx, input }) => {
      const host = normalizeHost(input.baseUrl);

      // Attempt to get a valid auth token for this user + instance
      const accessToken = await resolveAccessToken(
        ctx.db,
        ctx.user.id,
        host
      );

      const result = await searchPeerTubeVideos(
        input.baseUrl,
        {
          search: input.search,
          start: input.start,
          count: input.count,
        },
        accessToken ?? undefined
      );

      const base = input.baseUrl.replace(/\/$/, "");
      return {
        total: result.total,
        data: result.data.map((v) => {
          const raw = v as {
            thumbnailUrl?: string;
            thumbnailPath?: string;
            thumbnails?: Array<{ fileUrl?: string }>;
          };
          const thumbnailUrl =
            raw.thumbnailUrl ??
            (raw.thumbnails?.length ? raw.thumbnails[0]?.fileUrl : undefined) ??
            (raw.thumbnailPath
              ? new URL(raw.thumbnailPath, base).toString()
              : undefined);
          return {
            id: v.id ?? 0,
            uuid: v.uuid,
            shortUUID: v.shortUUID,
            name: v.name,
            duration: v.duration,
            thumbnailUrl,
            account: v.account,
            channel: v.channel,
            publishedAt: v.publishedAt,
          };
        }),
      };
    }),
});

