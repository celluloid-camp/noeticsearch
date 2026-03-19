import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { start } from "workflow/api";
import { z } from "zod";
import {
  captionsTable,
  searchHistoryTable,
  transcriptionsTable,
  videoTable,
} from "@/db/schema";
import { chaptersTable } from "@/db/schema/chapters";
import { searchResultTable } from "@/db/schema/search-result";
import { getDbErrorMessage } from "@/lib/db";
import {
  computeSpriteUrl,
  fetchPeerTubeVideo,
  fetchPeerTubeVideoDetails,
  parsePeerTubeVideoCaptions,
  resolveAuthorAvatarUrl,
} from "@/lib/peertube-client";
import { naturalizeCaptions } from "@/workflows/naturalize-captions";
import { protectedProcedure, publicProcedure, router } from "../trpc";

export const videoRouter = router({
  import: protectedProcedure
    .input(
      z.object({
        url: z.url(),
        isPublic: z.boolean().default(false),
        videoPassword: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { url, isPublic, videoPassword } = input;
      const userId = ctx.user.id;

      try {
        // Fetch video info from PeerTube using the provided videoId and baseUrl
        const videoInfo = await fetchPeerTubeVideo(url, {
          password: videoPassword,
        });

        // Use the provided videoId as externalId (no need to parse URL)
        const externalId =
          videoInfo.videoDetails.shortUUID ||
          videoInfo.videoDetails.uuid ||
          videoInfo.videoId;

        // we only keep one caption for now
        // Create video
        const [video] = await ctx.db
          .insert(videoTable)
          .values({
            userId,
            externalId,
            baseUrl: videoInfo.baseUrl,
            title: videoInfo.title,
            description: videoInfo.description,
            url,
            thumbnail: videoInfo.thumbnail || null,
            videoDetails: videoInfo.videoDetails,
            captionList: videoInfo.captions,
            storyboard: videoInfo.storyboard,
            isPublic,
            publishedAt: videoInfo.videoDetails.publishedAt ?? new Date(),
            isPasswordProtected: Boolean(videoPassword),
            videoPassword: videoPassword ?? null,
          })
          .returning({
            id: videoTable.id,
          });

        const caption = videoInfo.captions[0].captionData;

        const parsedCaptions = await parsePeerTubeVideoCaptions(url, caption);

        await ctx.db.insert(captionsTable).values(
          parsedCaptions.map((caption) => ({
            videoId: video.id,
            language: caption.language,
            text: caption.text,
            startTime: caption.startTime,
            endTime: caption.endTime,
            raw: JSON.stringify(caption.cue),
            thumbnail: videoInfo.storyboard
              ? computeSpriteUrl(videoInfo.storyboard, caption.startTime)
              : videoInfo.thumbnail,
          }))
        );

        const chapters = videoInfo.chapters;
        if (chapters.length > 0) {
          await ctx.db.insert(chaptersTable).values(
            chapters.map((chapter) => ({
              videoId: video.id,
              language: "fr", // TODO: get language from video details
              title: chapter.title,
              timecode: chapter.timecode,
            }))
          );
        }

        const captionLanguage = parsedCaptions[0]?.language ?? "fr";
        await ctx.db.insert(transcriptionsTable).values({
          videoId: video.id,
          language: captionLanguage,
          status: "pending",
        });

        start(naturalizeCaptions, [video.id]).catch((err) =>
          console.error("Failed to start naturalize workflow:", err)
        );

        return {
          id: video.id,
        };
      } catch (error) {
        console.error(error);
        throw new Error("Failed to import video");
      }
    }),

  generateTranscription: protectedProcedure
    .input(z.object({ videoId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [video] = await ctx.db
        .select({ id: videoTable.id, userId: videoTable.userId })
        .from(videoTable)
        .where(eq(videoTable.id, input.videoId))
        .limit(1);

      if (!video) {
        throw new Error("Video not found");
      }
      if (video.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("You don't have permission to generate transcription");
      }

      const existing = await ctx.db.query.transcriptionsTable.findFirst({
        where: eq(transcriptionsTable.videoId, input.videoId),
        columns: { id: true, status: true },
      });

      if (existing?.status === "pending" || existing?.status === "processing") {
        return { status: "already_running" as const };
      }

      if (existing) {
        await ctx.db
          .update(transcriptionsTable)
          .set({
            status: "pending",
            error: null,
            text: null,
            updatedAt: new Date(),
          })
          .where(eq(transcriptionsTable.id, existing.id));
      } else {
        const caption = await ctx.db.query.captionsTable.findFirst({
          where: eq(captionsTable.videoId, input.videoId),
          columns: { language: true },
        });

        await ctx.db.insert(transcriptionsTable).values({
          videoId: input.videoId,
          language: caption?.language ?? "fr",
          status: "pending",
        });
      }

      start(naturalizeCaptions, [input.videoId]).catch((err) =>
        console.error("Failed to start naturalize workflow:", err)
      );

      return { status: "started" as const };
    }),

  getTranscription: publicProcedure
    .input(z.object({ videoId: z.string() }))
    .query(async ({ input, ctx }) => {
      const transcription = await ctx.db.query.transcriptionsTable.findFirst({
        where: eq(transcriptionsTable.videoId, input.videoId),
        columns: {
          id: true,
          status: true,
          language: true,
          text: true,
          error: true,
          updatedAt: true,
        },
      });

      if (!transcription) {
        return null;
      }

      if (transcription.text) {
        try {
          const parsed = JSON.parse(transcription.text);
          if (typeof parsed === "object" && parsed !== null) {
            transcription.text =
              parsed[transcription.language] ??
              Object.values(parsed)[0] ??
              transcription.text;
          }
        } catch {
          // already plain text
        }
      }

      return transcription;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const [video] = await ctx.db
        .select()
        .from(videoTable)
        .where(eq(videoTable.id, input.id))
        .limit(1);

      if (!video) {
        throw new Error("Video not found");
      }

      const author = resolveAuthorAvatarUrl(video.videoDetails);
      const authorAvatar = author
        ? new URL(author, video.baseUrl).toString()
        : null;

      return {
        id: video.id.toString(),
        title: video.title,
        description: video.description,
        url: video.url,
        thumbnail: video.thumbnail || "/placeholder.svg",
        author:
          video.videoDetails.account?.displayName ??
          video.videoDetails.channel?.displayName ??
          null,
        authorAvatar,
        addedDate: video.createdAt,
        isPublic: video.isPublic,
        canEdit: video.userId === ctx.user?.id || ctx.user?.role === "admin",
      };
    }),

  getChapters: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const videoId = input.id;

      const chapters = await ctx.db
        .select({
          title: chaptersTable.title,
          timecode: chaptersTable.timecode,
        })
        .from(chaptersTable)
        .where(eq(chaptersTable.videoId, videoId))
        .orderBy(asc(chaptersTable.timecode));

      return chapters;
    }),
  getCaptions: publicProcedure
    .input(
      z.object({
        id: z.string(),
        keywords: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const videoId = input.id;
      const trimmed = input.keywords?.trim();

      if (trimmed) {
        const prefixQuery = trimmed
          .split(/[,\s]+/)
          .map((k) =>
            k
              .trim()
              .toLowerCase()
              .replace(/[^\p{L}\p{N}]/gu, "")
          )
          .filter(Boolean)
          .map((k) => `${k}:*`)
          .join(" | ");
        const tsQuery = sql`to_tsquery('french', lower(unaccent(${prefixQuery})))`;

        try {
          const captions = await ctx.db
            .select({
              id: captionsTable.id,
              text: captionsTable.text,
              startTime: captionsTable.startTime,
              endTime: captionsTable.endTime,
              headline: sql<string>`ts_headline(
              'french',
              ${captionsTable.text},
              ${tsQuery},
              'StartSel=<mark>, StopSel=</mark>, MaxFragments=0'
            )`,
            })
            .from(captionsTable)
            .where(
              sql`${eq(captionsTable.videoId, videoId)} AND to_tsvector('french', lower(unaccent(${captionsTable.text}))) @@ ${tsQuery}`
            )
            .orderBy(asc(captionsTable.startTime));

          return captions.map((sub) => ({
            id: sub.id,
            text: sub.text,
            headline: sub.headline,
            timestamp: formatTimestamp(sub.startTime),
            startTime: sub.startTime,
            endTime: sub.endTime,
          }));
        } catch (error) {
          console.error(error);
          const { message, constraint } = getDbErrorMessage(error);
          console.error("Failed to get captions:", {
            message,
            constraint,
            originalError: error,
          });
          return [];
        }
      }

      const captions = await ctx.db
        .select()
        .from(captionsTable)
        .where(eq(captionsTable.videoId, videoId))
        .orderBy(asc(captionsTable.startTime))
        .$dynamic();

      return captions.map((sub) => ({
        id: sub.id,
        text: sub.text,
        headline: null as string | null,
        timestamp: formatTimestamp(sub.startTime),
        startTime: sub.startTime,
        endTime: sub.endTime,
      }));
    }),

  getCaptionBySearchId: publicProcedure
    .input(
      z.object({
        id: z.string(),
        searchId: z.string(),
        keywords: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const videoId = input.id;

      // Load keywords from the saved search to build a tsquery
      const searchHistory = await ctx.db.query.searchHistoryTable.findFirst({
        where: eq(searchHistoryTable.id, input.searchId),
        columns: {
          id: true,
          keywords: true,
        },
      });

      const sanitize = (k: string) =>
        k
          .trim()
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]/gu, "");

      const savedKeywords =
        searchHistory?.keywords?.map(sanitize).filter(Boolean) ?? [];
      const additionalKeywords =
        input.keywords
          ?.split(/[,\s]+/)
          .map(sanitize)
          .filter(Boolean) ?? [];
      const keywordsArray = [...savedKeywords, ...additionalKeywords];

      if (keywordsArray.length === 0) {
        const rows = await ctx.db
          .select({
            id: captionsTable.id,
            text: captionsTable.text,
            startTime: captionsTable.startTime,
            endTime: captionsTable.endTime,
          })
          .from(captionsTable)
          .innerJoin(
            searchResultTable,
            and(
              eq(searchResultTable.captionId, captionsTable.id),
              eq(searchResultTable.searchId, input.searchId),
              eq(searchResultTable.videoId, videoId)
            )
          )
          .orderBy(asc(captionsTable.startTime));

        return rows.map((sub) => ({
          id: sub.id,
          text: sub.text,
          headline: null as string | null,
          timestamp: formatTimestamp(sub.startTime),
          startTime: sub.startTime,
          endTime: sub.endTime,
        }));
      }

      const hasAdditionalKeywords = additionalKeywords.length > 0;

      const highlightQuery = keywordsArray.map((k) => `${k}:*`).join(" | ");
      const highlightTsQuery = sql`to_tsquery('french', lower(unaccent(${highlightQuery})))`;

      if (hasAdditionalKeywords) {
        const filterQuery = additionalKeywords.map((k) => `${k}:*`).join(" | ");
        const filterTsQuery = sql`to_tsquery('french', lower(unaccent(${filterQuery})))`;

        const rows = await ctx.db
          .select({
            id: captionsTable.id,
            text: captionsTable.text,
            startTime: captionsTable.startTime,
            endTime: captionsTable.endTime,
            headline: sql<string>`ts_headline(
              'french',
              ${captionsTable.text},
              ${highlightTsQuery},
              'StartSel=<mark>, StopSel=</mark>, MaxFragments=0'
            )`,
          })
          .from(captionsTable)
          .where(
            sql`${eq(captionsTable.videoId, videoId)} AND to_tsvector('french', lower(unaccent(coalesce(${captionsTable.text}, '')))) @@ ${filterTsQuery}`
          )
          .orderBy(asc(captionsTable.startTime));

        return rows.map((sub) => ({
          id: sub.id,
          text: sub.text,
          headline: sub.headline,
          timestamp: formatTimestamp(sub.startTime),
          startTime: sub.startTime,
          endTime: sub.endTime,
        }));
      }

      const rows = await ctx.db
        .select({
          id: captionsTable.id,
          text: captionsTable.text,
          startTime: captionsTable.startTime,
          endTime: captionsTable.endTime,
          headline: sql<string>`ts_headline(
            'french',
            ${captionsTable.text},
            ${highlightTsQuery},
            'StartSel=<mark>, StopSel=</mark>, MaxFragments=0'
          )`,
        })
        .from(captionsTable)
        .innerJoin(
          searchResultTable,
          and(
            eq(searchResultTable.captionId, captionsTable.id),
            eq(searchResultTable.searchId, input.searchId),
            eq(searchResultTable.videoId, videoId)
          )
        )
        .orderBy(asc(captionsTable.startTime));

      return rows.map((sub) => ({
        id: sub.id,
        text: sub.text,
        headline: sub.headline,
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
          sortBy: z.enum(["recent", "published", "title"]).default("recent"),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const filter = input?.filter || "all";
      const sortBy = input?.sortBy || "recent";
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

      const rows = await ctx.db
        .select({
          id: videoTable.id,
          title: videoTable.title,
          url: videoTable.url,
          thumbnail: videoTable.thumbnail,
          createdAt: videoTable.createdAt,
          publishedAt: videoTable.publishedAt,
          isPublic: videoTable.isPublic,
          videoDetails: videoTable.videoDetails,
          baseUrl: videoTable.baseUrl,
        })
        .from(videoTable)
        .where(whereCondition)
        .orderBy(
          sortBy === "title"
            ? asc(videoTable.title)
            : sortBy === "published"
              ? desc(videoTable.publishedAt)
              : desc(videoTable.createdAt)
        );

      // Transform to match Video type (without subtitles)
      const transformedVideos = rows.map((row) => {
        const author =
          row.videoDetails.account?.displayName ??
          row.videoDetails.channel?.displayName ??
          null;
        const authorAvatar = resolveAuthorAvatarUrl(row.videoDetails);
        // Derive instance name/host from videoDetails when available, fallback to baseUrl
        const instanceHost =
          (row.videoDetails as { account?: { host?: string } | null }).account
            ?.host ??
          (row.videoDetails as { channel?: { host?: string } | null }).channel
            ?.host ??
          row.baseUrl;

        return {
          id: row.id.toString(),
          title: row.title,
          url: row.url,
          thumbnail: row.thumbnail || "/placeholder.svg",
          subtitles: [], // Subtitles not returned in getAll
          addedDate: row.createdAt,
          publishedAt: row.publishedAt,
          isPublic: row.isPublic,
          author,
          authorAvatar,
          instanceName: instanceHost,
        };
      });

      return { videos: transformedVideos };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const videoId = input.id;

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
      const videoId = input.id;

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

  syncThumbnail: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [video] = await ctx.db
        .select({
          id: videoTable.id,
          url: videoTable.url,
          userId: videoTable.userId,
          isPasswordProtected: videoTable.isPasswordProtected,
          videoPassword: videoTable.videoPassword,
        })
        .from(videoTable)
        .where(eq(videoTable.id, input.id))
        .limit(1);

      if (!video) {
        throw new Error("Video not found");
      }

      if (video.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("You don't have permission to update this video");
      }

      const details = await fetchPeerTubeVideoDetails(video.url, {
        password: video.isPasswordProtected
          ? (video.videoPassword ?? undefined)
          : undefined,
      });

      if (!details.thumbnail) {
        throw new Error("No thumbnail available from PeerTube");
      }

      await ctx.db
        .update(videoTable)
        .set({ thumbnail: details.thumbnail })
        .where(eq(videoTable.id, input.id));

      return { thumbnail: details.thumbnail };
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
