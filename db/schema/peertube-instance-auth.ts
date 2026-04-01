import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { userTable } from "./auth";

export const peertubeInstanceAuthTable = pgTable(
  "peertube_instance_auth",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    instanceHost: text("instance_host").notNull(),
    usernameOrEmail: text("username_or_email").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    scopes: text("scopes"),
    status: text("status", { enum: ["connected", "expired", "failed"] })
      .notNull()
      .default("failed"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => [
    uniqueIndex("peertube_instance_auth_user_host_idx").on(
      table.userId,
      table.instanceHost
    ),
    index("peertube_instance_auth_user_id_idx").on(table.userId),
    index("peertube_instance_auth_host_idx").on(table.instanceHost),
  ]
);

export const peertubeInstanceAuthRelations = relations(
  peertubeInstanceAuthTable,
  ({ one }) => ({
    user: one(userTable, {
      fields: [peertubeInstanceAuthTable.userId],
      references: [userTable.id],
    }),
  })
);
