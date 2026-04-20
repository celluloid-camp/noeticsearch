import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { videoTable } from "./videos";

export type TranscriptionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export const transcriptionsTable = pgTable("transcriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  videoId: text("video_id")
    .notNull()
    .references(() => videoTable.id, { onDelete: "cascade" }),
  language: text("language").notNull().default("fr"),
  text: text("text"),
  status: text("status")
    .$type<TranscriptionStatus>()
    .notNull()
    .default("pending"),
  progress: integer("progress").notNull().default(0),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const transcriptionRelations = relations(
  transcriptionsTable,
  ({ one }) => ({
    video: one(videoTable, {
      fields: [transcriptionsTable.videoId],
      references: [videoTable.id],
    }),
  })
);
