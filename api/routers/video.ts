import { asc, desc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { captionsTable, videoTable } from "@/db/schema";
import {
  fetchPeerTubeCaptions,
  fetchPeerTubeVideo,
  fetchPeerTubeVideoInfo,
} from "@/lib/peertube-client";
import { protectedProcedure, publicProcedure, router } from "../trpc";

export const videoRouter = router({
  import: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        isPublic: z.boolean().default(false),
        videoId: z.string(),
        baseUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { url, isPublic, videoId, baseUrl } = input;
      const userId = ctx.user.id;

      // Fetch video info from PeerTube using the provided videoId and baseUrl
      const videoInfo = await fetchPeerTubeVideo(url);

      // Use the provided videoId as externalId (no need to parse URL)
      const externalId = videoId;

      // Create video
      const [video] = await ctx.db
        .insert(videoTable)
        .values({
          userId,
          externalId,
          title: videoInfo.title,
          description: videoInfo.description,
          url,
          thumbnail: videoInfo.thumbnail || null,
          isPublic,
        })
        .returning();

      const subtitles = await fetchPeerTubeCaptions(baseUrl, videoId);

      await ctx.db.insert(captionsTable).values(
        subtitles.map((subtitle) => ({
          videoId: video.id,
          language: subtitle.language,
          text: subtitle.text,
          startTime: subtitle.startTime,
          endTime: subtitle.endTime,
          raw: subtitle.raw,
        }))
      );

      return {
        id: video.id.toString(),
        title: video.title,
        url: video.url,
        thumbnail: video.thumbnail || "/placeholder.svg",
        subtitles: [], // Empty for now - will be fetched on-demand
        addedDate: video.createdAt,
        isPublic: video.isPublic,
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const videoId = Number.parseInt(input.id, 10);
      if (Number.isNaN(videoId)) {
        throw new Error("Invalid video ID");
      }

      const [video] = await ctx.db
        .select()
        .from(videoTable)
        .where(eq(videoTable.id, videoId))
        .limit(1);

      if (!video) {
        throw new Error("Video not found");
      }

      let author: string | null = null;
      let authorAvatar: string | null = null;
      let extendedDescription = video.description ?? "";
      try {
        const peertubeInfo = await fetchPeerTubeVideoInfo(video.url);
        author = peertubeInfo.author;
        authorAvatar = peertubeInfo.authorAvatar;
        extendedDescription =
          peertubeInfo.extendedDescription || peertubeInfo.description || "";
      } catch (error) {
        console.warn("Failed to enrich video with PeerTube metadata:", error);
      }

      return {
        id: video.id.toString(),
        title: video.title,
        url: video.url,
        thumbnail: video.thumbnail || "/placeholder.svg",
        author,
        authorAvatar,
        extendedDescription,
        addedDate: video.createdAt,
        isPublic: video.isPublic,
        canEdit: video.userId === ctx.user?.id || ctx.user?.role === "admin",
      };
    }),
  getCaptions: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const videoId = Number.parseInt(input.id, 10);
      if (Number.isNaN(videoId)) {
        throw new Error("Invalid video ID");
      }

      const captions = await ctx.db
        .select()
        .from(captionsTable)
        .where(eq(captionsTable.videoId, videoId))
        .orderBy(asc(captionsTable.startTime));

      return captions.map((sub) => ({
        text: sub.text,
        timestamp: formatTimestamp(sub.startTime),
        startTime: sub.startTime,
        endTime: sub.endTime,
      }));
    }),

  getAll: publicProcedure
    .input(
      z
        .object({
          filter: z.enum(["public", "all", "mine"]).default("all"),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const filter = input?.filter || "all";
      const userId = ctx.user?.id;

      // Build query conditions based on filter
      let whereCondition:
        | ReturnType<typeof eq>
        | ReturnType<typeof or>
        | undefined;
      if (filter === "public") {
        whereCondition = eq(videoTable.isPublic, true);
      } else if (filter === "mine") {
        if (!userId) {
          return { videos: [] };
        }
        whereCondition = eq(videoTable.userId, userId);
      } else {
        // 'all' - show public videos and user's own videos
        if (userId) {
          whereCondition = or(
            eq(videoTable.isPublic, true),
            eq(videoTable.userId, userId)
          );
        } else {
          whereCondition = eq(videoTable.isPublic, true);
        }
      }

      // Fetch videos
      const videos = await ctx.db
        .select()
        .from(videoTable)
        .where(whereCondition)
        .orderBy(desc(videoTable.createdAt));

      // Transform to match Video type (without subtitles)
      const transformedVideos = videos.map((video) => {
        return {
          id: video.id.toString(),
          title: video.title,
          url: video.url,
          thumbnail: video.thumbnail || "/placeholder.svg",
          subtitles: [], // Subtitles not returned in getAll
          addedDate: video.createdAt,
          isPublic: video.isPublic,
        };
      });

      return { videos: transformedVideos };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const videoId = Number.parseInt(input.id, 10);
      if (Number.isNaN(videoId)) {
        throw new Error("Invalid video ID");
      }

      const [video] = await ctx.db
        .select()
        .from(videoTable)
        .where(eq(videoTable.id, videoId))
        .limit(1);

      if (!video) {
        throw new Error("Video not found");
      }

      // Check if user owns the video or is an admin
      if (video.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("You don't have permission to delete this video");
      }

      await ctx.db.delete(videoTable).where(eq(videoTable.id, videoId));
      return { success: true };
    }),
  update: protectedProcedure
    .input(
      z.object({ id: z.string(), title: z.string(), isPublic: z.boolean() })
    )
    .mutation(async ({ input, ctx }) => {
      const videoId = Number.parseInt(input.id, 10);
      if (Number.isNaN(videoId)) {
        throw new Error("Invalid video ID");
      }

      const [video] = await ctx.db
        .select()
        .from(videoTable)
        .where(eq(videoTable.id, videoId))
        .limit(1);

      if (!video) {
        throw new Error("Video not found");
      }

      // Check if user owns the video or is an admin
      if (video.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("You don't have permission to update this video");
      }

      await ctx.db
        .update(videoTable)
        .set({ title: input.title, isPublic: input.isPublic })
        .where(eq(videoTable.id, videoId));
      return { success: true };
    }),

  search: publicProcedure
    .input(z.object({ term: z.string() }))
    .query(async ({ input, ctx }) => {
      const { term } = input;

      const matchQuery = sql`(
				setweight(to_tsvector('french', unaccent(${videoTable.title})), 'A') ||
				setweight(to_tsvector('french', unaccent(${videoTable.description})), 'B')), to_tsquery('french', unaccent(${term}))`;

      const rows = await ctx.db
        .select({
          id: videoTable.id,
          userId: videoTable.userId,
          externalId: videoTable.externalId,
          title: videoTable.title,
          description: videoTable.description,
          url: videoTable.url,
          thumbnail: videoTable.thumbnail,
          isPublic: videoTable.isPublic,
          createdAt: videoTable.createdAt,
          rank: sql`ts_rank(${matchQuery})`,
          rankCd: sql`ts_rank_cd(${matchQuery})`,
        })
        .from(videoTable)
        .where(matchQuery)
        .orderBy((t) => desc(t.rank))
        .limit(25);

      return rows ?? [];
    }),
});

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
