import { tool as createTool, type InferUITool } from "ai";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db, getDbErrorMessage } from "../db";
import {
  captionLanguageCode,
  regconfigForLanguageCode,
} from "../search/full-text-sql";

interface CaptionSearchRow {
  endTime: number;
  language: string;
  rank: number;
  startTime: number;
  subtitleId: string;
  subtitleText: string;
  videoId: string;
  videoThumbnail: string | null;
  videoTitle: string;
  videoUrl: string;
}

const captionResultSchema = z.object({
  id: z.string(),
  text: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  language: z.string(),
  rank: z.number(),
  accuracy: z.number(),
});

export const searchVideoCaptionsOutputSchema = z.object({
  videoId: z.string(),
  videoTitle: z.string(),
  videoThumbnail: z.string().nullable().optional(),
  videoUrl: z.string(),
  captions: z.array(captionResultSchema),
});

const searchVideoCaptionsInputSchema = z.object({
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
      "Keywords to search for in video captions, titles, and descriptions. Each keyword is OR-combined for PostgreSQL full-text search."
    ),
});

interface SearchVideoToolArgs {
  filter: "all" | "public" | "mine" | "custom";
  userId: string;
  videoIds: string[];
}

export const searchVideoTool = ({
  filter,
  videoIds,
  userId,
}: SearchVideoToolArgs) =>
  createTool({
    description:
      "Search videos in the database using full-text search on captions, video titles, and descriptions",
    inputSchema: searchVideoCaptionsInputSchema,
    execute: async ({ keywords, limit }) => {
      const terms = keywords
        .map((k) =>
          k
            .trim()
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]/gu, "")
        )
        .filter(Boolean);
      if (terms.length === 0) {
        return [];
      }
      const prefixQuery = terms.map((t) => `${t}:*`).join(" | ");

      const filterCondition =
        filter === "public"
          ? sql`AND v.is_public = true`
          : filter === "mine"
            ? sql`AND (v.user_id = ${userId} OR v.is_public = true)`
            : filter === "custom" && videoIds.length > 0
              ? sql`AND v.id = ANY(ARRAY[${sql.join(
                  videoIds.map((id) => sql`${id}`),
                  sql`, `
                )}]::text[])`
              : sql``;

      try {
        const result = await db.execute(
          sql`
				WITH caption_rows AS (
					SELECT
						v.id AS video_id,
						v.title AS video_title,
						v.description AS video_description,
						v.thumbnail AS video_thumbnail,
						v.url AS video_url,
						c.id AS subtitle_id,
						c.text AS subtitle_text,
						c.start_time,
						c.end_time,
						c.language,
						${captionLanguageCode(sql`c.language`)} AS caption_language
					FROM captions c
					INNER JOIN videos v ON v.id = c.video_id
					WHERE true ${filterCondition}
				),
				matches AS (
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
						caption_language,
						to_tsvector(
							${regconfigForLanguageCode(sql`caption_language`)},
							lower(unaccent(coalesce(subtitle_text, '')))
						) AS caption_document,
						setweight(
							to_tsvector(
								'french',
								lower(unaccent(coalesce(video_title, '')))
							),
							'A'
						) || setweight(
							to_tsvector(
								'french',
								lower(unaccent(coalesce(video_description, '')))
							),
							'B'
						) AS video_document,
						to_tsquery(
							${regconfigForLanguageCode(sql`caption_language`)},
							lower(unaccent(${prefixQuery}))
						) AS caption_query,
						to_tsquery('french', lower(unaccent(${prefixQuery}))) AS video_query
					FROM caption_rows
				),
				caption_hits AS (
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
						ts_rank_cd(caption_document, caption_query) AS rank
					FROM matches
					WHERE caption_document @@ caption_query
				),
				video_only_hits AS (
					SELECT DISTINCT ON (video_id)
						video_id,
						video_title,
						video_thumbnail,
						video_url,
						subtitle_id,
						subtitle_text,
						start_time,
						end_time,
						language,
						ts_rank_cd(video_document, video_query) AS rank
					FROM matches
					WHERE video_document @@ video_query
						AND video_id NOT IN (SELECT video_id FROM caption_hits)
					ORDER BY video_id, start_time ASC
				),
				combined AS (
					SELECT * FROM caption_hits
					UNION ALL
					SELECT * FROM video_only_hits
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
						rank,
						row_number() OVER (
							PARTITION BY video_id
							ORDER BY rank DESC, start_time ASC
						) AS row_number
					FROM combined
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
          string,
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
              accuracy: number;
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

export type SearchVideoCaptionsUITool = InferUITool<
  ReturnType<typeof searchVideoTool>
>;
