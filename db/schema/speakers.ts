import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { pgTable, real, text, timestamp } from "drizzle-orm/pg-core";
import { videoTable } from "./videos";

export const speakersTable = pgTable("speakers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  videoId: text("video_id")
    .notNull()
    .references(() => videoTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  start: real("start").notNull(),
  end: real("end").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const speakerRelations = relations(speakersTable, ({ one }) => ({
  video: one(videoTable, {
    fields: [speakersTable.videoId],
    references: [videoTable.id],
  }),
}));
