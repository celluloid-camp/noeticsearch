import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, or } from "drizzle-orm";
import { z } from "zod";
import { foldersTable, videoFoldersTable, videoTable } from "@/db/schema";
import { resolveAuthorAvatarUrl } from "@/lib/peertube-client";
import { protectedProcedure, router } from "../trpc";

export const folderRouter = router({
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(80) }))
    .mutation(async ({ input, ctx }) => {
      const [folder] = await ctx.db
        .insert(foldersTable)
        .values({
          userId: ctx.user.id,
          name: input.name,
        })
        .returning();
      return folder;
    }),

  listMine: protectedProcedure.query(async ({ ctx }) => {
    const folders = await ctx.db
      .select({
        id: foldersTable.id,
        name: foldersTable.name,
        createdAt: foldersTable.createdAt,
        updatedAt: foldersTable.updatedAt,
        videoCount: count(videoFoldersTable.id),
      })
      .from(foldersTable)
      .leftJoin(
        videoFoldersTable,
        eq(videoFoldersTable.folderId, foldersTable.id)
      )
      .where(eq(foldersTable.userId, ctx.user.id))
      .groupBy(foldersTable.id)
      .orderBy(asc(foldersTable.name));

    return folders;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const [folder] = await ctx.db
        .select()
        .from(foldersTable)
        .where(eq(foldersTable.id, input.id))
        .limit(1);

      if (!folder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      if (folder.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not own this folder",
        });
      }

      return folder;
    }),

  rename: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).max(80) }))
    .mutation(async ({ input, ctx }) => {
      const [folder] = await ctx.db
        .select({ userId: foldersTable.userId })
        .from(foldersTable)
        .where(eq(foldersTable.id, input.id))
        .limit(1);

      if (!folder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      if (folder.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not own this folder",
        });
      }

      const [updated] = await ctx.db
        .update(foldersTable)
        .set({ name: input.name, updatedAt: new Date() })
        .where(eq(foldersTable.id, input.id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [folder] = await ctx.db
        .select({ userId: foldersTable.userId })
        .from(foldersTable)
        .where(eq(foldersTable.id, input.id))
        .limit(1);

      if (!folder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      if (folder.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not own this folder",
        });
      }

      await ctx.db
        .delete(foldersTable)
        .where(eq(foldersTable.id, input.id));

      return { success: true };
    }),

  addVideo: protectedProcedure
    .input(z.object({ folderId: z.string(), videoId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Verify folder ownership
      const [folder] = await ctx.db
        .select({ userId: foldersTable.userId })
        .from(foldersTable)
        .where(eq(foldersTable.id, input.folderId))
        .limit(1);

      if (!folder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      if (folder.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not own this folder",
        });
      }

      // Verify video visibility (owner or public)
      const [video] = await ctx.db
        .select({ userId: videoTable.userId, isPublic: videoTable.isPublic })
        .from(videoTable)
        .where(
          and(
            eq(videoTable.id, input.videoId),
            or(eq(videoTable.userId, userId), eq(videoTable.isPublic, true))
          )
        )
        .limit(1);

      if (!video) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Video not found or not accessible",
        });
      }

      const [entry] = await ctx.db
        .insert(videoFoldersTable)
        .values({ folderId: input.folderId, videoId: input.videoId })
        .onConflictDoNothing()
        .returning();

      return entry ?? null;
    }),

  removeVideo: protectedProcedure
    .input(z.object({ folderId: z.string(), videoId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Verify folder ownership
      const [folder] = await ctx.db
        .select({ userId: foldersTable.userId })
        .from(foldersTable)
        .where(eq(foldersTable.id, input.folderId))
        .limit(1);

      if (!folder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      if (folder.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not own this folder",
        });
      }

      await ctx.db
        .delete(videoFoldersTable)
        .where(
          and(
            eq(videoFoldersTable.folderId, input.folderId),
            eq(videoFoldersTable.videoId, input.videoId)
          )
        );

      return { success: true };
    }),

  getVideos: protectedProcedure
    .input(
      z.object({
        folderId: z.string(),
        sortBy: z.enum(["recent", "published", "title"]).default("recent"),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // Verify folder ownership
      const [folder] = await ctx.db
        .select({ userId: foldersTable.userId, name: foldersTable.name })
        .from(foldersTable)
        .where(eq(foldersTable.id, input.folderId))
        .limit(1);

      if (!folder) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Folder not found" });
      }

      if (folder.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not own this folder",
        });
      }

      const rows = await ctx.db
        .select({
          id: videoTable.id,
          title: videoTable.title,
          url: videoTable.url,
          thumbnail: videoTable.thumbnail,
          createdAt: videoTable.createdAt,
          publishedAt: videoTable.publishedAt,
          isPublic: videoTable.isPublic,
          videoDetails: videoTable.videoDetails,
          baseUrl: videoTable.baseUrl,
        })
        .from(videoTable)
        .innerJoin(
          videoFoldersTable,
          eq(videoFoldersTable.videoId, videoTable.id)
        )
        .where(eq(videoFoldersTable.folderId, input.folderId))
        .orderBy(
          input.sortBy === "title"
            ? asc(videoTable.title)
            : input.sortBy === "published"
              ? desc(videoTable.publishedAt)
              : desc(videoTable.createdAt)
        );

      const videos = rows.map((row) => {
        const author =
          row.videoDetails.account?.displayName ??
          row.videoDetails.channel?.displayName ??
          null;
        const authorAvatar = resolveAuthorAvatarUrl(row.videoDetails);
        const instanceHost =
          (row.videoDetails as { account?: { host?: string } | null }).account
            ?.host ??
          (row.videoDetails as { channel?: { host?: string } | null }).channel
            ?.host ??
          row.baseUrl;

        return {
          id: row.id,
          title: row.title,
          url: row.url,
          thumbnail: row.thumbnail || "/placeholder.svg",
          addedDate: row.createdAt,
          publishedAt: row.publishedAt,
          isPublic: row.isPublic,
          author,
          authorAvatar,
          instanceName: instanceHost,
        };
      });

      return { folder, videos };
    }),

  getFolderIdsForVideo: protectedProcedure
    .input(z.object({ videoId: z.string() }))
    .query(async ({ input, ctx }) => {
      const rows = await ctx.db
        .select({ folderId: videoFoldersTable.folderId })
        .from(videoFoldersTable)
        .innerJoin(
          foldersTable,
          eq(foldersTable.id, videoFoldersTable.folderId)
        )
        .where(
          and(
            eq(videoFoldersTable.videoId, input.videoId),
            eq(foldersTable.userId, ctx.user.id)
          )
        );

      return rows.map((r) => r.folderId);
    }),
});
