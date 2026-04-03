import { TRPCError } from "@trpc/server";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { searchHistoryTable, searchResultTable } from "@/db/schema";
import { getDbErrorMessage } from "@/lib/db";
import { protectedProcedure, publicProcedure, router } from "../trpc";
export const searchRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        isPublic: z.boolean().optional(),
        filterType: z.enum(["all", "public", "mine", "custom"]).optional(),
        videoIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { id, isPublic, filterType, videoIds } = input;
        await ctx.db.insert(searchHistoryTable).values({
          id,
          isPublic: isPublic ?? false,
          filterType: filterType ?? "all",
          videoIds: videoIds ?? [],
          userId: ctx.user.id,
        });
        return { id };
      } catch (error) {
        const { message, constraint } = getDbErrorMessage(error);
        console.error("Failed to create search history:", {
          message,
          constraint,
          originalError: error,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
        });
      }
    }),
  load: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const searchHistory = await ctx.db.query.searchHistoryTable.findFirst({
        where: and(
          eq(searchHistoryTable.id, input.id)
          // eq(searchHistoryTable.userId, ctx.user.id)
        ),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        columns: {
          id: true,
          title: true,
          isPublic: true,
          filterType: true,
          videoIds: true,
          messages: true,
          createdAt: true,
        },
      });
      if (!searchHistory) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Search history not found",
        });
      }
      return searchHistory;
    }),
  captionsByVideoId: publicProcedure
    .input(z.object({ videoId: z.string(), searchId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const searchResults = await ctx.db.query.searchResultTable.findMany({
          columns: {
            id: true,
            captionId: true,
          },
          where: and(
            eq(searchResultTable.searchId, input.searchId),
            eq(searchResultTable.videoId, input.videoId)
          ),
        });

        if (searchResults.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Search results not found for this video",
          });
        }

        return searchResults.map((result) => result.captionId);
      } catch (error) {
        const { message, constraint } = getDbErrorMessage(error);
        console.error("Failed to get captions by video id:", {
          message,
          constraint,
          originalError: error,
        });
        return [];
      }
    }),
  captionResults: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      const searchHistory = await ctx.db.query.searchHistoryTable.findFirst({
        where: and(
          eq(searchHistoryTable.id, input.id),
          userId != null
            ? sql`(${searchHistoryTable.isPublic} = true OR ${searchHistoryTable.userId} = ${userId})`
            : eq(searchHistoryTable.isPublic, true)
        ),
        columns: {
          id: true,
          keywords: true,
          userId: true,
        },
      });

      if (!searchHistory) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Search history not found",
        });
      }

      const keywords = (searchHistory.keywords ?? [])
        .map((k) =>
          k
            .trim()
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]/gu, "")
        )
        .filter(Boolean)
        .map((k) => `${k}:*`)
        .join(" | ");

      const raw = await ctx.db.execute(
        sql`
          WITH base AS (
            SELECT
              v.id AS "videoId",
              v.title AS "videoTitle",
              v.thumbnail AS "videoThumbnail",
              v.url AS "videoUrl",
              c.id AS "captionId",
              c.text AS "captionText",
              c.start_time AS "startTime",
              c.end_time AS "endTime",
              c.thumbnail AS "thumbnail",
              c.language,
              sr.accuracy
            FROM search_result sr
            INNER JOIN captions c ON c.id = sr.caption_id
            INNER JOIN videos v ON v.id = sr.video_id
            WHERE sr.search_id = ${input.id}
          ),
          grouped AS (
            SELECT
              "videoId",
              "videoTitle",
              "videoThumbnail",
              "videoUrl",
              json_agg(
                json_build_object(
                  'id',
                  "captionId",
                  'text',
                  "captionText",
                  'headline',
                  ts_headline(
                    CASE language
                      WHEN 'fr' THEN 'french'::regconfig
                      WHEN 'en' THEN 'english'::regconfig
                      ELSE 'simple'::regconfig
                    END,
                    lower(unaccent(coalesce("captionText", ''))),
                    to_tsquery(
                      CASE language
                        WHEN 'fr' THEN 'french'::regconfig
                        WHEN 'en' THEN 'english'::regconfig
                        ELSE 'simple'::regconfig
                      END,
                      lower(unaccent(${keywords}))
                    ),
                    'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15'
                  ),
                  'startTime',
                  "startTime",
                  'endTime',
                  "endTime",
                  'thumbnail',
                  "thumbnail",
                  'language',
                  language,
                  'rank',
                  0,
                  'accuracy',
                  accuracy
                )
                ORDER BY "startTime"
              ) AS captions
            FROM base
            GROUP BY "videoId", "videoTitle", "videoThumbnail", "videoUrl"
          )
          SELECT
            coalesce(
              json_agg(
                json_build_object(
                  'videoId',
                  "videoId",
                  'videoTitle',
                  "videoTitle",
                  'videoThumbnail',
                  "videoThumbnail",
                  'videoUrl',
                  "videoUrl",
                  'captions',
                  captions
                )
              ),
              '[]'::json
            ) AS results
          FROM grouped;
        `
      );

      const rows =
        (raw as unknown as { rows?: { results: unknown }[] }).rows ?? [];
      const results = (rows[0]?.results as unknown) ?? [];
      const canEdit = userId != null && searchHistory.userId === userId;

      return {
        canEdit,
        results: results as {
          videoId: string;
          videoTitle: string;
          videoThumbnail: string | null;
          videoUrl: string;
          captions: Array<{
            id: string;
            thumbnail: string | null;
            text: string;
            headline: string;
            startTime: number;
            endTime: number;
            language: string;
            rank: number;
            accuracy: number;
          }>;
        }[],
      };
    }),
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: searchHistoryTable.id,
        title: searchHistoryTable.title,
        createdAt: searchHistoryTable.createdAt,
      })
      .from(searchHistoryTable)
      .where(eq(searchHistoryTable.userId, ctx.user.id))
      .limit(10)
      .orderBy(desc(searchHistoryTable.createdAt));

    const [{ total }] = await ctx.db
      .select({
        total: sql<number>`cast(count(*) as integer)`,
      })
      .from(searchHistoryTable)
      .where(eq(searchHistoryTable.userId, ctx.user.id));

    return {
      items: rows,
      count: rows.length,
      totalCount: total,
    };
  }),
  publicList: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.user?.id;
    const searchHistories = await ctx.db.query.searchHistoryTable.findMany({
      where:
        userId != null
          ? and(
              eq(searchHistoryTable.isPublic, true),
              ne(searchHistoryTable.userId, userId)
            )
          : eq(searchHistoryTable.isPublic, true),
      columns: {
        id: true,
        title: true,
        createdAt: true,
      },
      orderBy: [desc(searchHistoryTable.createdAt)],
    });
    return searchHistories;
  }),

  publicExpanded: publicProcedure.query(async ({ ctx }) => {
    const searchHistories = await ctx.db.query.searchHistoryTable.findMany({
      where: eq(searchHistoryTable.isPublic, true),
      columns: {
        id: true,
        title: true,
        createdAt: true,
        keywords: true,
      },
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
        results: {
          limit: 10,
          columns: {
            id: true,
            videoId: true,
            captionId: true,
          },
          with: {
            video: {
              columns: {
                id: true,
                title: true,
                thumbnail: true,
              },
            },
          },
        },
      },
      orderBy: [desc(searchHistoryTable.createdAt)],
    });
    return searchHistories;
  }),

  mineExpanded: protectedProcedure.query(async ({ ctx }) => {
    const searchHistories = await ctx.db.query.searchHistoryTable.findMany({
      where: eq(searchHistoryTable.userId, ctx.user.id),
      columns: {
        id: true,
        title: true,
        createdAt: true,
        keywords: true,
      },
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
        results: {
          limit: 10,
          columns: {
            id: true,
            videoId: true,
            captionId: true,
          },
          with: {
            video: {
              columns: {
                id: true,
                title: true,
                thumbnail: true,
              },
            },
          },
        },
      },
      orderBy: [desc(searchHistoryTable.createdAt)],
    });
    return searchHistories;
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        filterType: z.enum(["all", "public", "mine", "custom"]).optional(),
        isPublic: z.boolean().optional(),
        title: z.string().nullable().optional(),
        videoIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, filterType, isPublic, title, videoIds } = input;
      await ctx.db
        .update(searchHistoryTable)
        .set({
          ...(filterType != null && { filterType }),
          ...(isPublic != null && { isPublic }),
          ...(title !== undefined && { title }),
          ...(videoIds != null && { videoIds }),
        })
        .where(
          and(
            eq(searchHistoryTable.id, id),
            eq(searchHistoryTable.userId, ctx.user.id)
          )
        );
      return { id };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(searchHistoryTable)
        .where(eq(searchHistoryTable.id, input.id));
    }),
});
