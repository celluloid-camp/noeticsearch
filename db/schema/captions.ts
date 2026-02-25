import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { searchResultTable } from "./search-result";
import { videoTable } from "./videos";

export const captionsTable = pgTable(
  "captions",
  {
    id: serial("id").primaryKey(),
    videoId: integer("video_id")
      .notNull()
      .references(() => videoTable.id, { onDelete: "cascade" }),
    language: text("language").notNull().default("fr"),
    text: text("text").notNull(),
    startTime: real("start_time").notNull(),
    endTime: real("end_time").notNull(),
    raw: jsonb("raw").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("captions_search_index").using(
      "gin",
      sql`(
			setweight(
				to_tsvector(
					CASE ${table.language}
						WHEN 'fr' THEN 'french'::regconfig
						WHEN 'en' THEN 'english'::regconfig
						ELSE 'simple'::regconfig
					END,
					${table.text}
				),
				'A'
			)
		)`
    ),
  ]
);

export const captionRelations = relations(captionsTable, ({ one, many }) => ({
  video: one(videoTable, {
    fields: [captionsTable.videoId],
    references: [videoTable.id],
  }),
  searchResults: many(searchResultTable),
}));
