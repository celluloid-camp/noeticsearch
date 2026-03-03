import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { boolean, pgTable, text } from "drizzle-orm/pg-core";
import { userTable } from "./auth";

export const peertubeInstanceTable = pgTable("peertube_instances", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
  host: text("host").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  isIndex: boolean("is_index").notNull().default(false),
  thumbnail: text("thumbnail").notNull(),
  isPublic: boolean("is_public").notNull().default(false),
});

export const peertubeInstanceRelations = relations(
  peertubeInstanceTable,
  ({ one }) => ({
    user: one(userTable, {
      fields: [peertubeInstanceTable.userId],
      references: [userTable.id],
    }),
  })
);
