import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { captionsTable } from "./captions";
import { searchHistoryTable } from "./search";
import { videoTable } from "./videos";

export const searchResultTable = pgTable(
  "search_result",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    searchId: text("search_id")
      .notNull()
      .references(() => searchHistoryTable.id, { onDelete: "cascade" }),
    videoId: text("video_id")
      .notNull()
      .references(() => videoTable.id, { onDelete: "cascade" }),
    captionId: text("caption_id")
      .notNull()
      .references(() => captionsTable.id, { onDelete: "cascade" }),
    accuracy: real("accuracy").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("search_result_search_id_idx").on(table.searchId),
    index("search_result_video_id_idx").on(table.videoId),
    index("search_result_caption_id_idx").on(table.captionId),
    uniqueIndex("search_result_search_caption_unique").on(
      table.searchId,
      table.captionId
    ),
  ]
);

export const searchResultRelations = relations(
  searchResultTable,
  ({ one }) => ({
    search: one(searchHistoryTable, {
      fields: [searchResultTable.searchId],
      references: [searchHistoryTable.id],
    }),
    video: one(videoTable, {
      fields: [searchResultTable.videoId],
      references: [videoTable.id],
    }),
    caption: one(captionsTable, {
      fields: [searchResultTable.captionId],
      references: [captionsTable.id],
    }),
  })
);
