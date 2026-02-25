import type { UIMessage } from "ai";
import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { userTable } from "./auth";
import { searchResultTable } from "./search-result";

export const searchHistoryTable = pgTable("search_history", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
  messages: jsonb("messages").$type<UIMessage[]>(),
  results: jsonb("results"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const searchHistoryRelations = relations(
  searchHistoryTable,
  ({ one, many }) => ({
    user: one(userTable, {
      fields: [searchHistoryTable.userId],
      references: [userTable.id],
    }),
    results: many(searchResultTable),
  })
);
