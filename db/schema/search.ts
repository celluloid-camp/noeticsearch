import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { userTable } from "./auth";

export const searchHistory = pgTable("search_history", {
	id: serial("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => userTable.id, { onDelete: "cascade" }),
	query: text("query").notNull(),
	results: jsonb("results"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
