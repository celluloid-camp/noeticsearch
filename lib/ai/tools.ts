import { tool as createTool, type InferUITool } from "ai";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { searchHistoryTable, searchResultTable } from "@/db/schema";
import { db, getDbErrorMessage } from "../db";

interface CaptionSearchRow {
  videoId: number;
  videoTitle: string;
  videoThumbnail: string | null;
  videoUrl: string;
  subtitleId: number;
  subtitleText: string;
  startTime: number;
  endTime: number;
  language: string;
  rank: number;
}

// Full output shape for the searchVideoCaptions tool (for documentation / reuse).
export const searchVideoCaptionsOutputSchema = z.object({
  videoId: z.number(),
  videoTitle: z.string(),
  videoThumbnail: z.string().nullable().optional(),
  videoUrl: z.string(),
  captions: z.array(
    z.object({
      id: z.number(),
      text: z.string(),
      startTime: z.number(),
      endTime: z.number(),
      language: z.string(),
      rank: z.number(),
      accuracy: z.number(),
    })
  ),
});

export const searchVideoCaptions = createTool({
  description: "Search videos in database using captions",
  inputSchema: z.object({
    keyword: z
      .string()
      .describe(
        "Keyword to find in videos captions, pg full-text search based on each caption."
      ),
  }),
  execute: async ({ keyword }) => {
    const term = keyword.trim();
    if (!term) {
      return [];
    }

    try {
      const result = await db.execute(
        sql`
					WITH matches AS (
						SELECT
							v.id AS video_id,
							v.title AS video_title,
							v.thumbnail AS video_thumbnail,
							v.url AS video_url,
							c.id AS subtitle_id,
							c.text AS subtitle_text,
							c.start_time,
							c.end_time,
							c.language,
							to_tsvector(
								CASE c.language
									WHEN 'fr' THEN 'french'::regconfig
									WHEN 'en' THEN 'english'::regconfig
									ELSE 'simple'::regconfig
								END,
								unaccent(coalesce(c.text, ''))
							) AS document,
							plainto_tsquery(
								CASE c.language
									WHEN 'fr' THEN 'french'::regconfig
									WHEN 'en' THEN 'english'::regconfig
									ELSE 'simple'::regconfig
								END,
								unaccent(${term})
							) AS query
						FROM captions c
						INNER JOIN videos v ON v.id = c.video_id
					),
					ranked AS (
						SELECT
							video_id,
							video_title,
							video_thumbnail,
							video_url,
							subtitle_id,
							subtitle_text,
							start_time,
							end_time,
							language,
							ts_rank_cd(document, query) AS rank,
							query,
							row_number() OVER (
								PARTITION BY video_id
								ORDER BY ts_rank_cd(document, query) DESC, start_time ASC
							) AS row_number
						FROM matches
						WHERE document @@ query
					)
					SELECT
						video_id AS "videoId",
						video_title AS "videoTitle",
						video_thumbnail AS "videoThumbnail",
						video_url AS "videoUrl",
						subtitle_id AS "subtitleId",
						subtitle_text AS "subtitleText",
						start_time AS "startTime",
						end_time AS "endTime",
						language,
						rank
					FROM ranked
					WHERE row_number <= 5
					ORDER BY video_id ASC, rank DESC, start_time ASC
				`
      );

      const rows = ((result as { rows?: unknown[] }).rows ??
        []) as CaptionSearchRow[];
      const maxRank =
        rows.reduce((max, row) => (row.rank > max ? row.rank : max), 0) || 0;
      const grouped = new Map<
        number,
        {
          videoId: number;
          videoTitle: string;
          videoThumbnail: string | null;
          videoUrl: string;
          captions: Array<{
            id: number;
            text: string;
            startTime: number;
            endTime: number;
            language: string;
            rank: number;
          }>;
        }
      >();

      for (const row of rows) {
        const existing = grouped.get(row.videoId);
        const accuracy = maxRank > 0 ? (row.rank / maxRank) * 100 : 0;
        const caption = {
          id: row.subtitleId,
          text: row.subtitleText,
          startTime: row.startTime,
          endTime: row.endTime,
          language: row.language,
          rank: row.rank,
          accuracy,
        };

        if (!existing) {
          grouped.set(row.videoId, {
            videoId: row.videoId,
            videoTitle: row.videoTitle,
            videoThumbnail: row.videoThumbnail,
            videoUrl: row.videoUrl,
            captions: [caption],
          });
          continue;
        }

        existing.captions.push(caption);
      }

      return Array.from(grouped.values());
    } catch (error) {
      const { message, constraint } = getDbErrorMessage(error);
      console.error("Database operation failed:", {
        message,
        constraint,
        originalError: error,
      });

      return [];
    }
  },
});

export const saveLatestSearchResult = createTool({
  description: "Persist the latest search results",
  inputSchema: z.object({
    searchId: z.string().describe("The search ID to persist the results for"),
    keyword: z
      .string()
      .describe("The search keyword to persist for highlighting"),
    results: z
      .array(searchVideoCaptionsOutputSchema)
      .describe("The results to persist"),
  }),
  execute: async ({ searchId, keyword, results }) => {
    const values = results.flatMap((item) =>
      item.captions.map((caption) => ({
        searchId,
        videoId: item.videoId,
        captionId: caption.id,
        accuracy: caption.accuracy,
        rank: caption.rank,
      }))
    );

    try {
      await db.transaction(async (tx) => {
        await tx
          .update(searchHistoryTable)
          .set({
            keyword,
          })
          .where(eq(searchHistoryTable.id, searchId));

        await tx
          .delete(searchResultTable)
          .where(eq(searchResultTable.searchId, searchId));

        if (values.length > 0) {
          await tx.insert(searchResultTable).values(values);
        }
      });

      return {
        searchId,
        savedCount: values.length,
      };
    } catch (error) {
      const { message, constraint } = getDbErrorMessage(error);
      console.error("Failed to persist latest search result:", {
        message,
        constraint,
        originalError: error,
      });

      return {
        searchId,
        savedCount: 0,
        error: message,
      };
    }
  },
});

export const tools = {
  searchVideoCaptions,
  saveLatestSearchResult,
};

export type SearchVideoCaptionsUITool = InferUITool<typeof searchVideoCaptions>;
export type SaveLatestSearchResultUITool = InferUITool<
  typeof saveLatestSearchResult
>;
