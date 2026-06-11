import type { VideoDetails } from "@celluloid/peertube-api/types";
import { createId } from "@paralleldrive/cuid2";
import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { start } from "workflow/api";
import { z } from "zod";
import {
  captionsTable,
  foldersTable,
  searchHistoryTable,
  transcriptionsTable,
  videoFoldersTable,
  videoTable,
} from "@/db/schema";
import { chaptersTable } from "@/db/schema/chapters";
import { searchResultTable } from "@/db/schema/search-result";
import { speakersTable } from "@/db/schema/speakers";
import {
  fetchPeerTubeVideoDetails,
  parsePeerTubeUrl,
  resolveAuthorAvatarUrl,
} from "@/lib/peertube-client";
import { resolveAccessToken } from "@/lib/peertube-token";
import {
  ensureCaptionHeadline,
  parseCaptionSearchTerms,
  searchCaptionsWithHybridFallback,
} from "@/lib/search/caption-search";
import { importVideo } from "@/workflows/import-video";
import { naturalizeCaptions } from "@/workflows/naturalize-captions";
import { protectedProcedure, publicProcedure, router } from "../trpc";

export const videoRouter = router({
  import: protectedProcedure
    .input(
      z.object({
        url: z.url(),
        isPublic: z.boolean().default(false),
        videoPassword: z.string().optional(),
        folderId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { url, isPublic, videoPassword, folderId } = input;
      const userId = ctx.user.id;

      try {
        const parsed = parsePeerTubeUrl(url);
        if (!parsed) {
          throw new Error("Invalid PeerTube URL format");
        }

        const videoId = createId();
        const [video] = await ctx.db
          .insert(videoTable)
          .values({
            id: videoId,
            userId,
            externalId: parsed.videoId,
            baseUrl: parsed.baseUrl,
            title: "Importing video...",
            description: null,
            url,
            thumbnail: null,
            videoDetails: {} as VideoDetails,
            captionList: null,
            storyboard: null,
            importStatus: "processing",
            isPublic,
            publishedAt: new Date(),
            isPasswordProtected: Boolean(videoPassword),
            videoPassword: videoPassword ?? null,
          })
          .returning({
            id: videoTable.id,
          });

        if (folderId) {
          const [folder] = await ctx.db
            .select({ id: foldersTable.id, userId: foldersTable.userId })
            .from(foldersTable)
            .where(eq(foldersTable.id, folderId))
            .limit(1);

          if (!folder || folder.userId !== userId) {
            throw new Error("Folder not found or not accessible");
          }

          await ctx.db
            .insert(videoFoldersTable)
            .values({ folderId, videoId: video.id })
            .onConflictDoNothing();
        }

        start(importVideo, [
          {
            ownerUserId: userId,
            password: videoPassword,
            url,
            videoId: video.id,
          },
        ]).catch(async (err) => {
          console.error("Failed to start import workflow:", err);
          await ctx.db
            .update(videoTable)
            .set({ importStatus: "failed" })
            .where(eq(videoTable.id, video.id));
        });

        return {
          id: video.id,
          status: "processing" as const,
        };
      } catch (error) {
        console.error(error);
        throw new Error("Failed to import video");
      }
    }),

  getImportStatus: protectedProcedure
    .input(z.object({ videoId: z.string() }))
    .query(async ({ input, ctx }) => {
      const [video] = await ctx.db
        .select({
          id: videoTable.id,
          importStatus: videoTable.importStatus,
          userId: videoTable.userId,
        })
        .from(videoTable)
        .where(eq(videoTable.id, input.videoId))
        .limit(1);

      if (!video) {
        throw new Error("Video not found");
      }

      if (video.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("You don't have permission to view import status");
      }

      return {
        status: video.importStatus,
      };
    }),

  getImportStatuses: protectedProcedure
    .input(z.object({ videoIds: z.array(z.string()).min(1).max(20) }))
    .query(async ({ input, ctx }) => {
      const videos = await ctx.db
        .select({
          id: videoTable.id,
          importStatus: videoTable.importStatus,
          userId: videoTable.userId,
          title: videoTable.title,
          url: videoTable.url,
        })
        .from(videoTable)
        .where(
          and(
            inArray(videoTable.id, input.videoIds),
            eq(videoTable.userId, ctx.user.id)
          )
        );

      return videos.map((v) => ({
        videoId: v.id,
        importStatus: v.importStatus,
        title: v.title,
        url: v.url,
      }));
    }),

  listImportProcesses: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(30),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const limit = input?.limit ?? 30;

      const rows = await ctx.db
        .select({
          createdAt: videoTable.createdAt,
          id: videoTable.id,
          importStatus: videoTable.importStatus,
          thumbnail: videoTable.thumbnail,
          title: videoTable.title,
          url: videoTable.url,
        })
        .from(videoTable)
        .where(
          and(
            eq(videoTable.userId, ctx.user.id),
            ne(videoTable.importStatus, "completed")
          )
        )
        .orderBy(
          sql`case when ${videoTable.importStatus} = 'processing' then 0 else 1 end`,
          desc(videoTable.createdAt)
        )
        .limit(limit);

      return rows.map((row) => ({
        createdAt: row.createdAt,
        importStatus: row.importStatus,
        thumbnail: row.thumbnail,
        title: row.title,
        url: row.url,
        videoId: row.id,
      }));
    }),

  importBatch: protectedProcedure
    .input(
      z.object({
        items: z
          .array(
            z.object({
              url: z.url(),
              videoPassword: z.string().optional(),
            })
          )
          .min(1)
          .max(20),
        isPublic: z.boolean().default(false),
        folderId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { items, isPublic, folderId } = input;
      const userId = ctx.user.id;

      // Validate folder ownership once upfront
      let validatedFolderId: string | undefined;
      if (folderId) {
        const [folder] = await ctx.db
          .select({ id: foldersTable.id, userId: foldersTable.userId })
          .from(foldersTable)
          .where(eq(foldersTable.id, folderId))
          .limit(1);

        if (!folder || folder.userId !== userId) {
          throw new Error("Folder not found or not accessible");
        }
        validatedFolderId = folder.id;
      }

      const accepted: { id: string; url: string; status: "processing" }[] = [];
      const rejected: { url: string; reason: string }[] = [];

      for (const item of items) {
        const { url, videoPassword } = item;

        try {
          const parsed = parsePeerTubeUrl(url);
          if (!parsed) {
            rejected.push({ url, reason: "Invalid PeerTube URL format" });
            continue;
          }

          // Check for duplicate (same externalId + baseUrl + user). Previously-
          // failed imports are recycled in-place so the user can retry; any
          // other status is treated as a real duplicate.
          const [existing] = await ctx.db
            .select({
              id: videoTable.id,
              importStatus: videoTable.importStatus,
            })
            .from(videoTable)
            .where(
              and(
                eq(videoTable.userId, userId),
                eq(videoTable.externalId, parsed.videoId),
                eq(videoTable.baseUrl, parsed.baseUrl)
              )
            )
            .limit(1);

          if (existing && existing.importStatus !== "failed") {
            rejected.push({ url, reason: "alreadyImported" });
            continue;
          }

          let resolvedVideoId: string;
          if (existing) {
            resolvedVideoId = existing.id;

            // Wipe any partial state left over from the failed run so the
            // workflow can repopulate cleanly.
            await Promise.all([
              ctx.db
                .delete(captionsTable)
                .where(eq(captionsTable.videoId, resolvedVideoId)),
              ctx.db
                .delete(chaptersTable)
                .where(eq(chaptersTable.videoId, resolvedVideoId)),
              ctx.db
                .delete(speakersTable)
                .where(eq(speakersTable.videoId, resolvedVideoId)),
              ctx.db
                .delete(transcriptionsTable)
                .where(eq(transcriptionsTable.videoId, resolvedVideoId)),
            ]);

            await ctx.db
              .update(videoTable)
              .set({
                title: "Importing video...",
                description: null,
                thumbnail: null,
                videoDetails: {} as VideoDetails,
                captionList: null,
                storyboard: null,
                importStatus: "processing",
                isPublic,
                isPasswordProtected: Boolean(videoPassword),
                videoPassword: videoPassword ?? null,
              })
              .where(eq(videoTable.id, resolvedVideoId));
          } else {
            resolvedVideoId = createId();
            await ctx.db.insert(videoTable).values({
              id: resolvedVideoId,
              userId,
              externalId: parsed.videoId,
              baseUrl: parsed.baseUrl,
              title: "Importing video...",
              description: null,
              url,
              thumbnail: null,
              videoDetails: {} as VideoDetails,
              captionList: null,
              storyboard: null,
              importStatus: "processing",
              isPublic,
              publishedAt: new Date(),
              isPasswordProtected: Boolean(videoPassword),
              videoPassword: videoPassword ?? null,
            });
          }

          if (validatedFolderId) {
            await ctx.db
              .insert(videoFoldersTable)
              .values({
                folderId: validatedFolderId,
                videoId: resolvedVideoId,
              })
              .onConflictDoNothing();
          }

          start(importVideo, [
            {
              ownerUserId: userId,
              password: videoPassword,
              url,
              videoId: resolvedVideoId,
            },
          ]).catch(async (err) => {
            console.error("Failed to start import workflow:", err);
            await ctx.db
              .update(videoTable)
              .set({ importStatus: "failed" })
              .where(eq(videoTable.id, resolvedVideoId));
          });

          accepted.push({
            id: resolvedVideoId,
            url,
            status: "processing",
          });
        } catch (error) {
          console.error("Failed to import video in batch:", error);
          rejected.push({ url, reason: "Failed to import video" });
        }
      }

      return { accepted, rejected };
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
            progress: 0,
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
          progress: true,
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

      const isOwner = video.userId === ctx.user?.id;
      const canEdit = isOwner || ctx.user?.role === "admin";

      // Only the owner gets credentials needed to play protected videos.
      const videoPassword =
        isOwner && video.isPasswordProtected ? video.videoPassword : null;
      const accessToken =
        isOwner && video.requiresInstanceAuth
          ? await resolveAccessToken(video.userId, video.baseUrl)
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
        canEdit,
        isPasswordProtected: video.isPasswordProtected,
        requiresInstanceAuth: video.requiresInstanceAuth,
        videoPassword,
        accessToken,
      };
    }),

  getChapters: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const videoId = input.id;

      const chapters = await ctx.db
        .select({
          id: chaptersTable.id,
          title: chaptersTable.title,
          timecode: chaptersTable.timecode,
        })
        .from(chaptersTable)
        .where(eq(chaptersTable.videoId, videoId))
        .orderBy(asc(chaptersTable.timecode));

      return chapters;
    }),

  updateChapter: protectedProcedure
    .input(
      z.object({
        chapterId: z.string(),
        title: z.string().min(1, "Chapter title is required"),
        timecode: z.number().min(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const trimmedTitle = input.title.trim();
      if (!trimmedTitle) {
        throw new Error("Chapter title is required");
      }

      const [chapter] = await ctx.db
        .select({
          id: chaptersTable.id,
          videoId: chaptersTable.videoId,
        })
        .from(chaptersTable)
        .where(eq(chaptersTable.id, input.chapterId))
        .limit(1);

      if (!chapter) {
        throw new Error("Chapter not found");
      }

      const [video] = await ctx.db
        .select({ userId: videoTable.userId })
        .from(videoTable)
        .where(eq(videoTable.id, chapter.videoId))
        .limit(1);

      if (!video) {
        throw new Error("Video not found");
      }

      if (video.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("You don't have permission to edit this chapter");
      }

      await ctx.db
        .update(chaptersTable)
        .set({ title: trimmedTitle, timecode: input.timecode })
        .where(eq(chaptersTable.id, input.chapterId));

      return { success: true };
    }),

  createChapter: protectedProcedure
    .input(
      z.object({
        videoId: z.string(),
        title: z.string().min(1, "Chapter title is required"),
        timecode: z.number().min(0),
        language: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const trimmedTitle = input.title.trim();
      if (!trimmedTitle) {
        throw new Error("Chapter title is required");
      }

      const [video] = await ctx.db
        .select({ userId: videoTable.userId })
        .from(videoTable)
        .where(eq(videoTable.id, input.videoId))
        .limit(1);

      if (!video) {
        throw new Error("Video not found");
      }

      if (video.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("You don't have permission to add a chapter");
      }

      await ctx.db.insert(chaptersTable).values({
        videoId: input.videoId,
        title: trimmedTitle,
        timecode: input.timecode,
        language: input.language ?? "fr",
      });

      return { success: true };
    }),

  deleteChapter: protectedProcedure
    .input(z.object({ chapterId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [chapter] = await ctx.db
        .select({
          id: chaptersTable.id,
          videoId: chaptersTable.videoId,
        })
        .from(chaptersTable)
        .where(eq(chaptersTable.id, input.chapterId))
        .limit(1);

      if (!chapter) {
        throw new Error("Chapter not found");
      }

      const [video] = await ctx.db
        .select({ userId: videoTable.userId })
        .from(videoTable)
        .where(eq(videoTable.id, chapter.videoId))
        .limit(1);

      if (!video) {
        throw new Error("Video not found");
      }

      if (video.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("You don't have permission to delete this chapter");
      }

      await ctx.db
        .delete(chaptersTable)
        .where(eq(chaptersTable.id, input.chapterId));

      return { success: true };
    }),

  getSpeakers: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const speakers = await ctx.db
        .select({
          id: speakersTable.id,
          name: speakersTable.name,
          start: speakersTable.start,
          end: speakersTable.end,
        })
        .from(speakersTable)
        .where(eq(speakersTable.videoId, input.id))
        .orderBy(asc(speakersTable.start));

      return speakers;
    }),

  createSpeaker: protectedProcedure
    .input(
      z.object({
        videoId: z.string(),
        name: z.string().min(1, "Speaker name is required"),
        start: z.number().min(0),
        end: z.number().min(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new Error("Speaker name is required");
      }
      if (input.end < input.start) {
        throw new Error("End time must be after start time");
      }

      const [video] = await ctx.db
        .select({ userId: videoTable.userId })
        .from(videoTable)
        .where(eq(videoTable.id, input.videoId))
        .limit(1);

      if (!video) {
        throw new Error("Video not found");
      }

      if (video.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("You don't have permission to add a speaker");
      }

      await ctx.db.insert(speakersTable).values({
        videoId: input.videoId,
        name: trimmedName,
        start: input.start,
        end: input.end,
      });

      return { success: true };
    }),

  updateSpeaker: protectedProcedure
    .input(
      z.object({
        speakerId: z.string(),
        name: z.string().min(1, "Speaker name is required"),
        start: z.number().min(0),
        end: z.number().min(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new Error("Speaker name is required");
      }
      if (input.end < input.start) {
        throw new Error("End time must be after start time");
      }

      const [speaker] = await ctx.db
        .select({
          id: speakersTable.id,
          videoId: speakersTable.videoId,
        })
        .from(speakersTable)
        .where(eq(speakersTable.id, input.speakerId))
        .limit(1);

      if (!speaker) {
        throw new Error("Speaker not found");
      }

      const [video] = await ctx.db
        .select({ userId: videoTable.userId })
        .from(videoTable)
        .where(eq(videoTable.id, speaker.videoId))
        .limit(1);

      if (!video) {
        throw new Error("Video not found");
      }

      if (video.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("You don't have permission to edit this speaker");
      }

      await ctx.db
        .update(speakersTable)
        .set({
          name: trimmedName,
          start: input.start,
          end: input.end,
        })
        .where(eq(speakersTable.id, input.speakerId));

      return { success: true };
    }),

  deleteSpeaker: protectedProcedure
    .input(z.object({ speakerId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [speaker] = await ctx.db
        .select({
          id: speakersTable.id,
          videoId: speakersTable.videoId,
        })
        .from(speakersTable)
        .where(eq(speakersTable.id, input.speakerId))
        .limit(1);

      if (!speaker) {
        throw new Error("Speaker not found");
      }

      const [video] = await ctx.db
        .select({ userId: videoTable.userId })
        .from(videoTable)
        .where(eq(videoTable.id, speaker.videoId))
        .limit(1);

      if (!video) {
        throw new Error("Video not found");
      }

      if (video.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("You don't have permission to delete this speaker");
      }

      await ctx.db
        .delete(speakersTable)
        .where(eq(speakersTable.id, input.speakerId));

      return { success: true };
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
        const terms = parseCaptionSearchTerms(trimmed);
        if (terms.length === 0) {
          return [];
        }

        const captions = await searchCaptionsWithHybridFallback(ctx.db, {
          videoId,
          terms,
        });

        return captions.map((sub) => ({
          id: sub.id,
          text: sub.text,
          headline: sub.headline,
          thumbnail: sub.thumbnail,
          timestamp: formatTimestamp(sub.startTime),
          startTime: sub.startTime,
          endTime: sub.endTime,
        }));
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
        thumbnail: sub.thumbnail,
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

      const savedKeywords =
        searchHistory?.keywords?.flatMap((k) => parseCaptionSearchTerms(k)) ??
        [];
      const additionalKeywords = input.keywords
        ? parseCaptionSearchTerms(input.keywords)
        : [];
      const keywordsArray = [...savedKeywords, ...additionalKeywords];

      if (keywordsArray.length === 0) {
        const rows = await ctx.db
          .select({
            id: captionsTable.id,
            text: captionsTable.text,
            thumbnail: captionsTable.thumbnail,
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
          thumbnail: sub.thumbnail,
          timestamp: formatTimestamp(sub.startTime),
          startTime: sub.startTime,
          endTime: sub.endTime,
        }));
      }

      const hasAdditionalKeywords = additionalKeywords.length > 0;

      if (hasAdditionalKeywords) {
        const captions = await searchCaptionsWithHybridFallback(ctx.db, {
          videoId,
          terms: additionalKeywords,
        });

        return captions.map((sub) => ({
          id: sub.id,
          text: sub.text,
          headline: sub.headline,
          thumbnail: sub.thumbnail,
          timestamp: formatTimestamp(sub.startTime),
          startTime: sub.startTime,
          endTime: sub.endTime,
        }));
      }

      const searchResultJoin = and(
        eq(searchResultTable.captionId, captionsTable.id),
        eq(searchResultTable.searchId, input.searchId),
        eq(searchResultTable.videoId, videoId)
      );

      try {
        const highlightQuery = keywordsArray.map((k) => `${k}:*`).join(" | ");
        const highlightTsQuery = sql`to_tsquery('french', lower(unaccent(${highlightQuery})))`;

        const rows = await ctx.db
          .select({
            id: captionsTable.id,
            text: captionsTable.text,
            thumbnail: captionsTable.thumbnail,
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
          .innerJoin(searchResultTable, searchResultJoin)
          .orderBy(asc(captionsTable.startTime));

        return rows.map((sub) => ({
          id: sub.id,
          text: sub.text,
          headline: ensureCaptionHeadline(
            sub.text,
            sub.headline,
            keywordsArray
          ),
          thumbnail: sub.thumbnail,
          timestamp: formatTimestamp(sub.startTime),
          startTime: sub.startTime,
          endTime: sub.endTime,
        }));
      } catch {
        const rows = await ctx.db
          .select({
            id: captionsTable.id,
            text: captionsTable.text,
            thumbnail: captionsTable.thumbnail,
            startTime: captionsTable.startTime,
            endTime: captionsTable.endTime,
          })
          .from(captionsTable)
          .innerJoin(searchResultTable, searchResultJoin)
          .orderBy(asc(captionsTable.startTime));

        return rows.map((sub) => ({
          id: sub.id,
          text: sub.text,
          headline: ensureCaptionHeadline(sub.text, null, keywordsArray),
          thumbnail: sub.thumbnail,
          timestamp: formatTimestamp(sub.startTime),
          startTime: sub.startTime,
          endTime: sub.endTime,
        }));
      }
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
          duration:
            (row.videoDetails as { duration?: number }).duration ?? null,
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

      const parsed = parsePeerTubeUrl(video.url);
      const accessToken = parsed
        ? ((await resolveAccessToken(video.userId, parsed.baseUrl)) ??
          undefined)
        : undefined;

      const details = await fetchPeerTubeVideoDetails(video.url, {
        accessToken,
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

  updateCaption: protectedProcedure
    .input(
      z.object({
        captionId: z.string(),
        text: z.string().min(1, "Caption text is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const trimmedText = input.text.trim();
      if (!trimmedText) {
        throw new Error("Caption text is required");
      }

      const caption = await ctx.db.query.captionsTable.findFirst({
        where: eq(captionsTable.id, input.captionId),
        columns: { id: true, videoId: true },
      });

      if (!caption) {
        throw new Error("Caption not found");
      }

      const [video] = await ctx.db
        .select({ userId: videoTable.userId })
        .from(videoTable)
        .where(eq(videoTable.id, caption.videoId))
        .limit(1);

      if (!video) {
        throw new Error("Video not found");
      }

      if (video.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("You don't have permission to edit this caption");
      }

      await ctx.db
        .update(captionsTable)
        .set({ text: trimmedText })
        .where(eq(captionsTable.id, input.captionId));

      return { success: true };
    }),

  deleteCaption: protectedProcedure
    .input(z.object({ captionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const caption = await ctx.db.query.captionsTable.findFirst({
        where: eq(captionsTable.id, input.captionId),
        columns: { id: true, videoId: true },
      });

      if (!caption) {
        throw new Error("Caption not found");
      }

      const [video] = await ctx.db
        .select({ userId: videoTable.userId })
        .from(videoTable)
        .where(eq(videoTable.id, caption.videoId))
        .limit(1);

      if (!video) {
        throw new Error("Video not found");
      }

      if (video.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("You don't have permission to delete this caption");
      }

      await ctx.db
        .delete(captionsTable)
        .where(eq(captionsTable.id, input.captionId));

      return { success: true };
    }),

  updateTranscription: protectedProcedure
    .input(
      z.object({
        videoId: z.string(),
        text: z
          .string()
          .min(1, "Transcription text is required")
          .max(1_000_000, "Transcription text is too long")
          .refine((v) => v.trim().length > 0, {
            message: "Transcription text cannot be blank",
          }),
      })
    )
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
        throw new Error("You don't have permission to edit this transcription");
      }

      const now = new Date();
      const existing = await ctx.db.query.transcriptionsTable.findFirst({
        where: eq(transcriptionsTable.videoId, input.videoId),
        columns: { id: true },
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(transcriptionsTable)
          .set({
            text: input.text,
            status: "completed",
            error: null,
            updatedAt: now,
          })
          .where(eq(transcriptionsTable.id, existing.id))
          .returning({
            status: transcriptionsTable.status,
            text: transcriptionsTable.text,
            updatedAt: transcriptionsTable.updatedAt,
          });
        return updated;
      }

      const caption = await ctx.db.query.captionsTable.findFirst({
        where: eq(captionsTable.videoId, input.videoId),
        columns: { language: true },
      });

      const [inserted] = await ctx.db
        .insert(transcriptionsTable)
        .values({
          videoId: input.videoId,
          language: caption?.language ?? "fr",
          text: input.text,
          status: "completed",
          updatedAt: now,
        })
        .returning({
          status: transcriptionsTable.status,
          text: transcriptionsTable.text,
          updatedAt: transcriptionsTable.updatedAt,
        });

      return inserted;
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
