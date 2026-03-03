import type {
  Storyboard,
  VideoCaption,
  VideoDetails,
} from "@celluloid/peertube-api/types";
import { createId } from "@paralleldrive/cuid2";
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { userTable } from "./auth";
import { searchResultTable } from "./search-result";

export const videoTable = pgTable(
  "videos",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    url: text("url").notNull(),
    baseUrl: text("base_url").notNull(),
    thumbnail: text("thumbnail"),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    publishedAt: timestamp("published_at").notNull().defaultNow(),
    videoDetails: jsonb("video_details").$type<VideoDetails>().notNull(),
    captionList: jsonb("caption_list").$type<VideoCaption[]>(),
    storyboard: jsonb("storyboard").$type<Storyboard>(),
    isPasswordProtected: boolean("is_password_protected")
      .notNull()
      .default(false),
    videoPassword: text("video_password"),
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
