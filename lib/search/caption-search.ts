import { and, asc, eq, or, type SQL, sql } from "drizzle-orm";
import { captionsTable } from "@/db/schema";
import type { db } from "@/lib/db";

type Database = typeof db;

const FTS_REGCONFIG = "french";

export function parseCaptionSearchTerms(keywords: string): string[] {
  return keywords
    .split(/[,\s]+/)
    .map((k) =>
      k
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, "")
    )
    .filter(Boolean);
}

export function buildPrefixTsQueryString(terms: string[]): string {
  return terms.map((k) => `${k}:*`).join(" | ");
}

function escapeRegex(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Strip diacritics — mirrors PostgreSQL `unaccent()` for regex matching. */
export function normalizeAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function wordBoundaryRegex(term: string): string {
  return `(^|[^[:alpha:]])(${escapeRegex(term)})([^[:alpha:]]|$)`;
}

/**
 * Highlight word matches in original text (preserves accents/casing).
 * Compares accent-stripped forms so "même" matches "meme" and vice versa.
 */
export function highlightCaptionTerms(text: string, terms: string[]): string {
  if (terms.length === 0) {
    return text;
  }

  const normalizedTerms = new Set(terms.map(normalizeAccents));
  const wordRegex = /[\p{L}\p{N}]+/gu;
  let result = "";
  let lastIndex = 0;

  for (const match of text.matchAll(wordRegex)) {
    const word = match[0];
    const start = match.index ?? 0;
    result += text.slice(lastIndex, start);

    if (normalizedTerms.has(normalizeAccents(word))) {
      result += `<mark>${word}</mark>`;
    } else {
      result += word;
    }

    lastIndex = start + word.length;
  }

  result += text.slice(lastIndex);
  return result;
}

/** Use ts_headline when it marks matches; otherwise fall back to regex highlight. */
export function ensureCaptionHeadline(
  text: string,
  headline: string | null | undefined,
  terms: string[]
): string {
  if (headline?.includes("<mark>")) {
    return headline;
  }
  return highlightCaptionTerms(text, terms);
}

function captionTextMatchesTerms(terms: string[]): SQL {
  const conditions = terms.map((term) => {
    const normalizedTerm = normalizeAccents(term);
    return sql`lower(unaccent(coalesce(${captionsTable.text}, ''))) ~* ${wordBoundaryRegex(normalizedTerm)}`;
  });

  return conditions.length === 1 ? conditions[0]! : or(...conditions)!;
}

export type CaptionSearchRow = {
  id: string;
  text: string;
  thumbnail: string | null;
  startTime: number;
  endTime: number;
  headline: string | null;
};

async function searchCaptionsByRegex(
  database: Database,
  videoId: string,
  terms: string[],
  extraWhere?: SQL
): Promise<CaptionSearchRow[]> {
  const baseWhere = extraWhere
    ? and(eq(captionsTable.videoId, videoId), extraWhere)
    : eq(captionsTable.videoId, videoId);

  const captions = await database
    .select({
      id: captionsTable.id,
      text: captionsTable.text,
      thumbnail: captionsTable.thumbnail,
      startTime: captionsTable.startTime,
      endTime: captionsTable.endTime,
    })
    .from(captionsTable)
    .where(and(baseWhere, captionTextMatchesTerms(terms)))
    .orderBy(asc(captionsTable.startTime));

  return captions.map((sub) => ({
    ...sub,
    headline: highlightCaptionTerms(sub.text, terms),
  }));
}

async function searchCaptionsByFts(
  database: Database,
  videoId: string,
  terms: string[],
  extraWhere?: SQL
): Promise<CaptionSearchRow[]> {
  const prefixQuery = buildPrefixTsQueryString(terms);
  const tsQuery = sql`to_tsquery(${FTS_REGCONFIG}, lower(unaccent(${prefixQuery})))`;
  const baseWhere = extraWhere
    ? and(eq(captionsTable.videoId, videoId), extraWhere)
    : eq(captionsTable.videoId, videoId);

  const captions = await database
    .select({
      id: captionsTable.id,
      text: captionsTable.text,
      thumbnail: captionsTable.thumbnail,
      startTime: captionsTable.startTime,
      endTime: captionsTable.endTime,
      headline: sql<string>`ts_headline(
        ${FTS_REGCONFIG},
        ${captionsTable.text},
        ${tsQuery},
        'StartSel=<mark>, StopSel=</mark>, MaxFragments=0'
      )`,
    })
    .from(captionsTable)
    .where(
      sql`${baseWhere} AND to_tsvector(${FTS_REGCONFIG}, lower(unaccent(coalesce(${captionsTable.text}, '')))) @@ ${tsQuery}`
    )
    .orderBy(asc(captionsTable.startTime));

  return captions.map((sub) => ({
    ...sub,
    headline: ensureCaptionHeadline(sub.text, sub.headline, terms),
  }));
}

/**
 * Full-text search with regex word-boundary fallback for terms dropped by
 * French/English stop-word dictionaries (e.g. "nous", "la", "même").
 */
export async function searchCaptionsWithHybridFallback(
  database: Database,
  options: {
    videoId: string;
    terms: string[];
    extraWhere?: SQL;
  }
): Promise<CaptionSearchRow[]> {
  const { videoId, terms, extraWhere } = options;

  if (terms.length === 0) {
    return [];
  }

  try {
    const ftsResults = await searchCaptionsByFts(
      database,
      videoId,
      terms,
      extraWhere
    );
    if (ftsResults.length > 0) {
      return ftsResults;
    }
  } catch {
    // Stop-word-only queries yield an empty tsquery (no throw in some PG versions).
  }

  return searchCaptionsByRegex(database, videoId, terms, extraWhere);
}
