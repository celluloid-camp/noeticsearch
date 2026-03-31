import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { userTable } from "./auth";
import { videoTable } from "./videos";

export const foldersTable = pgTable(
  "folders",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("folders_user_id_idx").on(table.userId)]
);

export const videoFoldersTable = pgTable(
  "video_folders",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    folderId: text("folder_id")
      .notNull()
      .references(() => foldersTable.id, { onDelete: "cascade" }),
    videoId: text("video_id")
      .notNull()
      .references(() => videoTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("video_folders_folder_id_idx").on(table.folderId),
    index("video_folders_video_id_idx").on(table.videoId),
    unique("video_folders_folder_video_unique").on(
      table.folderId,
      table.videoId
    ),
  ]
);

export const foldersRelations = relations(foldersTable, ({ one, many }) => ({
  user: one(userTable, {
    fields: [foldersTable.userId],
    references: [userTable.id],
  }),
  videoFolders: many(videoFoldersTable),
}));

export const videoFoldersRelations = relations(
  videoFoldersTable,
  ({ one }) => ({
    folder: one(foldersTable, {
      fields: [videoFoldersTable.folderId],
      references: [foldersTable.id],
    }),
    video: one(videoTable, {
      fields: [videoFoldersTable.videoId],
      references: [videoTable.id],
    }),
  })
);
