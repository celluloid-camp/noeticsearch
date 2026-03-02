import { z } from "zod";
import { peerTubeWatchUrl, searchPeerTubeVideos } from "@/lib/peertube-client";
import { publicProcedure, router } from "../trpc";

export const peertubeSearchRouter = router({
  searchVideos: publicProcedure
    .input(
      z.object({
        baseUrl: z.url(),
        search: z.string().min(1, "Search query is required"),
        start: z.number().int().min(0).optional().default(0),
        count: z.number().int().min(1).max(100).optional().default(15),
      })
    )
    .query(async ({ input }) => {
      const result = await searchPeerTubeVideos(input.baseUrl, {
        search: input.search,
        start: input.start,
        count: input.count,
      });
      return {
        total: result.total,
        data: result.data.map((v) => ({
          uuid: v.uuid,
          shortUUID: v.shortUUID,
          name: v.name,
          duration: v.duration,
          // @ts-expect-error - thumbnailUrl is not in the type
          thumbnailUrl: v.thumbnailUrl ?? v.thumbnailUrl,
          account: v.account,
          channel: v.channel,
          publishedAt: v.publishedAt,
          watchUrl: peerTubeWatchUrl(input.baseUrl, v.shortUUID ?? ""),
        })),
      };
    }),
});
