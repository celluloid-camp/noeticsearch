import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import {
  peertubeInstanceAuthTable,
  peertubeInstanceTable,
} from "@/db/schema";
import { authenticatePeerTube } from "@/lib/peertube-auth";
import { protectedProcedure, router } from "../trpc";

/** Normalize a PeerTube instance host to its origin (no trailing slash). */
function normalizeHost(host: string): string {
  try {
    return new URL(host).origin;
  } catch {
    return host.replace(/\/$/, "");
  }
}

export const peertubeInstanceRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const limit = input?.limit ?? 10;

      const instances = await ctx.db
        .select({
          id: peertubeInstanceTable.id,
          host: peertubeInstanceTable.host,
          title: peertubeInstanceTable.title,
          description: peertubeInstanceTable.description,
          thumbnail: peertubeInstanceTable.thumbnail,
          isIndex: peertubeInstanceTable.isIndex,
        })
        .from(peertubeInstanceTable)
        .where(
          and(
            or(
              eq(peertubeInstanceTable.isPublic, true),
              eq(peertubeInstanceTable.userId, userId)
            )
          )
        )
        .limit(limit);

      return instances;
    }),

  /**
   * Return instances list with isConnected flag for the current user.
   */
  listWithAuth: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const limit = input?.limit ?? 10;

      const instances = await ctx.db
        .select({
          id: peertubeInstanceTable.id,
          host: peertubeInstanceTable.host,
          title: peertubeInstanceTable.title,
          description: peertubeInstanceTable.description,
          thumbnail: peertubeInstanceTable.thumbnail,
          isIndex: peertubeInstanceTable.isIndex,
        })
        .from(peertubeInstanceTable)
        .where(
          and(
            or(
              eq(peertubeInstanceTable.isPublic, true),
              eq(peertubeInstanceTable.userId, userId)
            )
          )
        )
        .limit(limit);

      const authRows = await ctx.db
        .select({
          instanceHost: peertubeInstanceAuthTable.instanceHost,
          status: peertubeInstanceAuthTable.status,
        })
        .from(peertubeInstanceAuthTable)
        .where(eq(peertubeInstanceAuthTable.userId, userId));

      const authByHost = new Map(authRows.map((r) => [r.instanceHost, r]));

      return instances.map((inst) => {
        const authRecord = authByHost.get(normalizeHost(inst.host));
        return {
          ...inst,
          authStatus: authRecord?.status ?? null,
          isConnected: authRecord?.status === "connected",
        };
      });
    }),

  /**
   * Get auth status for the current user on a specific instance.
   */
  authStatus: protectedProcedure
    .input(z.object({ host: z.string().url() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const host = normalizeHost(input.host);

      const [record] = await ctx.db
        .select({
          status: peertubeInstanceAuthTable.status,
          accessTokenExpiresAt: peertubeInstanceAuthTable.accessTokenExpiresAt,
          lastError: peertubeInstanceAuthTable.lastError,
          createdAt: peertubeInstanceAuthTable.createdAt,
          updatedAt: peertubeInstanceAuthTable.updatedAt,
        })
        .from(peertubeInstanceAuthTable)
        .where(
          and(
            eq(peertubeInstanceAuthTable.userId, userId),
            eq(peertubeInstanceAuthTable.instanceHost, host)
          )
        )
        .limit(1);

      if (!record) {
        return { status: null, connectedAt: null, expiresAt: null, lastError: null };
      }

      return {
        status: record.status,
        updatedAt: record.updatedAt,
        expiresAt: record.accessTokenExpiresAt,
        lastError: record.lastError,
      };
    }),

  /**
   * Connect to a PeerTube instance using email/password.
   * Authenticates via PeerTube OAuth ROPC flow, then persists encrypted tokens.
   */
  connect: protectedProcedure
    .input(
      z.object({
        host: z.string().url(),
        email: z.string().min(1),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const host = normalizeHost(input.host);

      let tokenResponse: Awaited<ReturnType<typeof authenticatePeerTube>>;
      try {
        tokenResponse = await authenticatePeerTube(
          host,
          input.email,
          input.password
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Authentication failed";
        const isInvalidCredentials = message === "invalid_credentials";

        // Persist failed status so the UI can show an error state
        await ctx.db
          .insert(peertubeInstanceAuthTable)
          .values({
            userId,
            instanceHost: host,
            usernameOrEmail: input.email,
            status: "failed",
            lastError: isInvalidCredentials
              ? "invalid_credentials"
              : "connection_failed",
          })
          .onConflictDoUpdate({
            target: [
              peertubeInstanceAuthTable.userId,
              peertubeInstanceAuthTable.instanceHost,
            ],
            set: {
              status: "failed",
              lastError: isInvalidCredentials
                ? "invalid_credentials"
                : "connection_failed",
              updatedAt: new Date(),
            },
          });

        throw new Error(
          isInvalidCredentials ? "invalid_credentials" : "connection_failed"
        );
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + tokenResponse.expires_in * 1000);

      await ctx.db
        .insert(peertubeInstanceAuthTable)
        .values({
          userId,
          instanceHost: host,
          usernameOrEmail: input.email,
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          accessTokenExpiresAt: expiresAt,
          status: "connected",
          lastError: null,
          updatedAt: now,
          lastUsedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            peertubeInstanceAuthTable.userId,
            peertubeInstanceAuthTable.instanceHost,
          ],
          set: {
            usernameOrEmail: input.email,
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
            accessTokenExpiresAt: expiresAt,
            status: "connected",
            lastError: null,
            updatedAt: now,
            lastUsedAt: now,
          },
        });

      return {
        success: true,
        status: "connected" as const,
        expiresAt,
      };
    }),

  /**
   * Disconnect from a PeerTube instance by removing stored auth.
   */
  disconnect: protectedProcedure
    .input(z.object({ host: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const host = normalizeHost(input.host);

      await ctx.db
        .delete(peertubeInstanceAuthTable)
        .where(
          and(
            eq(peertubeInstanceAuthTable.userId, userId),
            eq(peertubeInstanceAuthTable.instanceHost, host)
          )
        );

      return { success: true };
    }),
});
