import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { userTable } from "./auth";
import { searchResultTable } from "./search-result";

export const videoTable = pgTable(
  "videos",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    url: text("url").notNull(),
    thumbnail: text("thumbnail"),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("search_index").using(
      "gin",
      sql`(
				setweight(to_tsvector('french', ${table.title}), 'A') ||
				setweight(to_tsvector('french', ${table.description}), 'B')
		)`
    ),
  ]
);

export const videoRelations = relations(videoTable, ({ one, many }) => ({
  user: one(userTable, {
    fields: [videoTable.userId],
    references: [userTable.id],
  }),
  searchResults: many(searchResultTable),
}));
