import { z } from "zod";
import {
  searchPeerTubePrivateVideos,
  searchPeerTubeVideos,
} from "@/lib/peertube-client";
import { normalizeHost, resolveAccessToken } from "@/lib/peertube-token";
import { protectedProcedure, router } from "../trpc";

export const peertubeSearchRouter = router({
  searchVideos: protectedProcedure
    .input(
      z
        .object({
          baseUrl: z.url(),
          search: z.string().default(""),
          start: z.number().int().min(0).optional().default(0),
          count: z.number().int().min(1).max(100).optional().default(15),
          mineOnly: z.boolean().optional().default(false),
        })
        .refine((v) => v.mineOnly || v.search.trim().length > 0, {
          message: "Search query is required",
          path: ["search"],
        })
    )
    .query(async ({ ctx, input }) => {
      const host = normalizeHost(input.baseUrl);

      // Attempt to get a valid auth token for this user + instance
      const accessToken = await resolveAccessToken(ctx.user.id, host);

      const result = input.mineOnly
        ? await (async () => {
            if (!accessToken) {
              throw new Error(
                "You must be connected to this PeerTube instance to search your own videos"
              );
            }
            return searchPeerTubePrivateVideos(
              input.baseUrl,
              {
                search: input.search,
                start: input.start,
                count: input.count,
              },
              accessToken
            );
          })()
        : await searchPeerTubeVideos(
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
            privacy: v.privacy
              ? {
                  id: v.privacy.id ?? null,
                  label: v.privacy.label ?? null,
                }
              : null,
          };
        }),
      };
    }),
});
