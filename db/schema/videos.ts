import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { userTable } from "./auth";

export const videoTable = pgTable("videos", {
	id: serial("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => userTable.id, { onDelete: "cascade" }),
	externalId: text("external_id").notNull(),
	title: text("title").notNull(),
	url: text("url").notNull(),
	thumbnail: text("thumbnail"),
	isPublic: boolean("is_public").notNull().default(false),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
