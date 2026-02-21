import { relations } from "drizzle-orm";
import {
	integer,
	jsonb,
	pgTable,
	real,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { videoTable } from "./videos";

export const subtitleTable = pgTable("subtitles", {
	id: serial("id").primaryKey(),
	videoId: integer("video_id")
		.notNull()
		.references(() => videoTable.id, { onDelete: "cascade" }),
	language: text("language").notNull(),
	text: text("text").notNull(),
	startTime: real("start_time").notNull(),
	endTime: real("end_time").notNull(),
	raw: jsonb("raw").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subtitleRelations = relations(subtitleTable, ({ one }) => ({
	video: one(videoTable, {
		fields: [subtitleTable.videoId],
		references: [videoTable.id],
	}),
}));
