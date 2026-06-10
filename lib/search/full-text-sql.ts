import { type SQL, sql } from "drizzle-orm";

/** PeerTube may store language as `fr` or `{"id":"fr","label":"French"}`. */
export function captionLanguageCode(column: SQL | string): SQL {
  const col = typeof column === "string" ? sql.raw(column) : column;
  return sql`
    CASE
      WHEN ${col} IN ('fr', 'en') THEN ${col}
      WHEN substring(${col} from '"id"\\s*:\\s*"([a-z]{2})"') IS NOT NULL THEN substring(
        ${col} from '"id"\\s*:\\s*"([a-z]{2})"'
      )
      ELSE 'fr'
    END
  `;
}

export function regconfigForLanguageCode(languageCode: SQL): SQL {
  return sql`
    CASE
      WHEN ${languageCode} = 'fr' THEN 'french'::regconfig
      WHEN ${languageCode} = 'en' THEN 'english'::regconfig
      ELSE 'simple'::regconfig
    END
  `;
}
