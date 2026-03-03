import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import { index, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
import { videoTable } from "./videos";

export const chaptersTable = pgTable(
  "chapters",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    videoId: text("video_id")
      .notNull()
      .references(() => videoTable.id, { onDelete: "cascade" }),
    language: text("language").notNull().default("fr"),
    title: text("title").notNull(),
    timecode: real("timecode").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("chapters_search_index").using(
      "gin",
      sql`(
			setweight(
				to_tsvector(
					CASE ${table.language}
						WHEN 'fr' THEN 'french'::regconfig
						WHEN 'en' THEN 'english'::regconfig
						ELSE 'simple'::regconfig
					END,
					${table.title}
				),
				'A'
			)
		)`
    ),
  ]
);

export const chapterRelations = relations(chaptersTable, ({ one }) => ({
  video: one(videoTable, {
    fields: [chaptersTable.videoId],
    references: [videoTable.id],
  }),
}));
