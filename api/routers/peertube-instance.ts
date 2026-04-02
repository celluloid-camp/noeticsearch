import { getConfig } from "@celluloid/peertube-api";
import { createClient } from "@celluloid/peertube-api/client";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { peertubeInstanceAuthTable, peertubeInstanceTable } from "@/db/schema";
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

async function fetchInstanceMetadata(host: string) {
  try {
    const client = createClient({ baseUrl: host.replace(/\/$/, "") });
    const { data, error } = await getConfig({ client });
    if (error || !data) {
      return { thumbnail: null, title: null };
    }

    const instanceWithLogo = data.instance as
      | (NonNullable<typeof data.instance> & {
          logo?: Array<{ fileUrl?: string; path?: string }>;
        })
      | undefined;
    const rawTitle = data.instance?.name?.trim() ?? "";
    const rawImage =
      instanceWithLogo?.logo?.[0]?.fileUrl ??
      instanceWithLogo?.logo?.[0]?.path ??
      data.instance?.avatars?.[0]?.fileUrl ??
      data.instance?.avatars?.[0]?.path ??
      "";

    const title = rawTitle.length > 0 ? rawTitle : null;
    const thumbnail = rawImage ? new URL(rawImage, host).toString() : null;

    return { thumbnail, title };
  } catch {
    return { thumbnail: null, title: null };
  }
}

export const peertubeInstanceRouter = router({
  listOwnWithAuth: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const limit = input?.limit ?? 50;

      const instances = await ctx.db
        .select({
          description: peertubeInstanceTable.description,
          host: peertubeInstanceTable.host,
          id: peertubeInstanceTable.id,
          isIndex: peertubeInstanceTable.isIndex,
          thumbnail: peertubeInstanceTable.thumbnail,
          title: peertubeInstanceTable.title,
        })
        .from(peertubeInstanceTable)
        .where(
          and(
            eq(peertubeInstanceTable.userId, userId),
            eq(peertubeInstanceTable.isIndex, false),
            eq(peertubeInstanceTable.isPublic, false)
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

  addOwn: protectedProcedure
    .input(
      z.object({
        description: z.string().trim().max(500).optional(),
        host: z.string().url(),
        thumbnail: z.string().url().optional(),
        title: z.string().trim().min(1).max(120).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const host = normalizeHost(input.host);
      const hostUrl = new URL(host);
      const instanceMetadata = await fetchInstanceMetadata(host);

      const [existing] = await ctx.db
        .select({ id: peertubeInstanceTable.id })
        .from(peertubeInstanceTable)
        .where(
          and(
            eq(peertubeInstanceTable.userId, userId),
            eq(peertubeInstanceTable.host, host)
          )
        )
        .limit(1);

      if (existing) {
        throw new Error("instance_already_exists");
      }

      const [instance] = await ctx.db
        .insert(peertubeInstanceTable)
        .values({
          description: input.description,
          host,
          isIndex: false,
          isPublic: false,
          thumbnail:
            input.thumbnail ??
            instanceMetadata.thumbnail ??
            `${host}/favicon.ico`,
          title: input.title ?? instanceMetadata.title ?? hostUrl.hostname,
          userId,
        })
        .returning({
          description: peertubeInstanceTable.description,
          host: peertubeInstanceTable.host,
          id: peertubeInstanceTable.id,
          isIndex: peertubeInstanceTable.isIndex,
          thumbnail: peertubeInstanceTable.thumbnail,
          title: peertubeInstanceTable.title,
        });

      return instance;
    }),

  removeOwn: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const [instance] = await ctx.db
        .select({
          host: peertubeInstanceTable.host,
          id: peertubeInstanceTable.id,
        })
        .from(peertubeInstanceTable)
        .where(
          and(
            eq(peertubeInstanceTable.id, input.id),
            eq(peertubeInstanceTable.userId, userId),
            eq(peertubeInstanceTable.isIndex, false),
            eq(peertubeInstanceTable.isPublic, false)
          )
        )
        .limit(1);

      if (!instance) {
        throw new Error("instance_not_found");
      }

      await ctx.db
        .delete(peertubeInstanceAuthTable)
        .where(
          and(
            eq(peertubeInstanceAuthTable.userId, userId),
            eq(
              peertubeInstanceAuthTable.instanceHost,
              normalizeHost(instance.host)
            )
          )
        );

      await ctx.db
        .delete(peertubeInstanceTable)
        .where(
          and(
            eq(peertubeInstanceTable.id, instance.id),
            eq(peertubeInstanceTable.userId, userId)
          )
        );

      return { success: true };
    }),

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
        return {
          status: null,
          connectedAt: null,
          expiresAt: null,
          lastError: null,
        };
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

      const [instance] = await ctx.db
        .select({ isIndex: peertubeInstanceTable.isIndex })
        .from(peertubeInstanceTable)
        .where(eq(peertubeInstanceTable.host, host))
        .limit(1);

      if (instance?.isIndex) {
        throw new Error("instance_auth_not_allowed");
      }

      let tokenResponse: Awaited<ReturnType<typeof authenticatePeerTube>>;
      try {
        tokenResponse = await authenticatePeerTube(
          host,
          input.email,
          input.password
        );
      } catch (err) {
        console.error("Failed to authenticate PeerTube:", err);
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
      const expiresAt = new Date(
        now.getTime() + tokenResponse.expires_in * 1000
      );

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
