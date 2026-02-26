import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { searchHistoryTable } from "@/db/schema";
import { protectedProcedure, router } from "../trpc";
export const searchRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      await ctx.db.insert(searchHistoryTable).values({
        id,
        userId: ctx.user.id,
      });
      return { id };
    }),
  load: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const searchHistory = await ctx.db.query.searchHistoryTable.findFirst({
        where: and(
          eq(searchHistoryTable.id, input.id),
          eq(searchHistoryTable.userId, ctx.user.id)
        ),
        with: {
          user: true,
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
  captionResults: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const searchHistory = await ctx.db.query.searchHistoryTable.findFirst({
        where: and(
          eq(searchHistoryTable.id, input.id),
          eq(searchHistoryTable.userId, ctx.user.id)
        ),
        columns: {
          id: true,
          keywords: true,
        },
      });

      if (!searchHistory) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Search history not found",
        });
      }

      const keywords = (searchHistory.keywords ?? [])
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean)
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
      return results as {
        videoId: number;
        videoTitle: string;
        videoThumbnail: string | null;
        videoUrl: string;
        captions: Array<{
          id: number;
          thumbnail: string | null;
          text: string;
          headline: string;
          startTime: number;
          endTime: number;
          language: string;
          rank: number;
          accuracy: number;
        }>;
      }[];
    }),
  list: protectedProcedure.query(async ({ ctx }) => {
    const searchHistories = await ctx.db.query.searchHistoryTable.findMany({
      where: eq(searchHistoryTable.userId, ctx.user.id),
      columns: {
        id: true,
        createdAt: true,
      },
    });
    return searchHistories;
  }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(searchHistoryTable)
        .where(eq(searchHistoryTable.id, input.id));
    }),
});
