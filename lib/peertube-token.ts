import { and, eq } from "drizzle-orm";
import { peertubeInstanceAuthTable } from "@/db/schema";
import { db } from "@/lib/db";
import { refreshPeerTubeToken } from "@/lib/peertube-auth";

/** Normalize a PeerTube instance host to its origin (no trailing slash). */
export function normalizeHost(host: string): string {
  try {
    return new URL(host).origin;
  } catch {
    return host.replace(/\/$/, "");
  }
}

/**
 * Resolve a valid access token for the given user on the given host.
 * Handles token refresh transparently and updates the DB.
 * Returns null if no auth exists or tokens are unusable.
 */
export async function resolveAccessToken(
  userId: string,
  host: string
): Promise<string | null> {
  const normalized = normalizeHost(host);
  const [record] = await db
    .select()
    .from(peertubeInstanceAuthTable)
    .where(
      and(
        eq(peertubeInstanceAuthTable.userId, userId),
        eq(peertubeInstanceAuthTable.instanceHost, normalized)
      )
    )
    .limit(1);

  if (!record?.accessToken) {
    return null;
  }

  const now = new Date();
  const isExpired =
    record.accessTokenExpiresAt != null && record.accessTokenExpiresAt <= now;

  if (!isExpired) {
    return record.accessToken;
  }

  if (!record.refreshToken) {
    await db
      .update(peertubeInstanceAuthTable)
      .set({ status: "expired", updatedAt: now })
      .where(eq(peertubeInstanceAuthTable.id, record.id));
    return null;
  }

  try {
    const tokenResponse = await refreshPeerTubeToken(
      normalized,
      record.refreshToken
    );
    const expiresAt = new Date(now.getTime() + tokenResponse.expires_in * 1000);

    await db
      .update(peertubeInstanceAuthTable)
      .set({
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
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
