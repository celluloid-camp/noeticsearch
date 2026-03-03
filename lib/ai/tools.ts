import { tool as createTool, type InferUITool } from "ai";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db, getDbErrorMessage } from "../db";

interface CaptionSearchRow {
  endTime: number;
  language: string;
  rank: number;
  startTime: number;
  subtitleId: number;
  subtitleText: string;
  videoId: string;
  videoThumbnail: string | null;
  videoTitle: string;
  videoUrl: string;
}

// Full output shape for the searchVideoCaptions tool (for documentation / reuse).
export const searchVideoCaptionsOutputSchema = z.object({
  videoId: z.string(),
  videoTitle: z.string(),
  videoThumbnail: z.string().nullable().optional(),
  videoUrl: z.string(),
  captions: z.array(
    z.object({
      id: z.string(),
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
    limit: z
      .number()
      .min(1)
      .max(50)
      .default(20)
      .describe("Maximum number of results to return"),
    keywords: z
      .array(z.string())
      .min(1)
      .describe(
        "Keywords to search for in video captions. Each keyword is OR-combined using pg full-text search. Provide synonyms or related terms to broaden the search."
      ),
  }),
  execute: async ({ keywords, limit }) => {
    const terms = keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
    if (terms.length === 0) {
      return [];
    }

    const combined = terms.join(" | ");

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
							lower(unaccent(coalesce(c.text, '')))
						) AS document,
						to_tsquery(
							CASE c.language
								WHEN 'fr' THEN 'french'::regconfig
								WHEN 'en' THEN 'english'::regconfig
								ELSE 'simple'::regconfig
							END,
							lower(unaccent(${combined}))
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
					WHERE row_number <= ${limit}
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
          videoId: string;
          videoTitle: string;
          videoThumbnail: string | null;
          videoUrl: string;
          captions: Array<{
            id: string;
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

export const setSearchTitle = createTool({
  description: "Suggest a title for the search",
  inputSchema: z.object({
    title: z.string(),
  }),
  execute: async ({ title }) => {
    return title;
  },
});

export const tools = {
  searchVideoCaptions,
  setSearchTitle,
};

export type SearchVideoCaptionsUITool = InferUITool<typeof searchVideoCaptions>;
