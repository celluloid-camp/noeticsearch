import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { peertubeInstanceTable } from "@/db/schema";
import { protectedProcedure, router } from "../trpc";

export const peertubeInstanceRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const limit = input?.limit ?? 10;

      const instances = await ctx.db
        .select({
          id: peertubeInstanceTable.id,
          host: peertubeInstanceTable.host,
          title: peertubeInstanceTable.title,
          description: peertubeInstanceTable.description,
          thumbnail: peertubeInstanceTable.thumbnail,
          isIndex: peertubeInstanceTable.isIndex,
        })
        .from(peertubeInstanceTable)
        .where(
          and(
            or(
              eq(peertubeInstanceTable.isPublic, true),
              eq(peertubeInstanceTable.userId, userId)
            )
          )
        )
        .limit(limit);

      return instances;
    }),
});
