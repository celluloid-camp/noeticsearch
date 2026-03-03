import { eq } from "drizzle-orm";
import { z } from "zod";
import { peertubeInstanceTable } from "@/db/schema";
import { protectedProcedure, router } from "../trpc";

export const peertubeInstanceRouter = router({
  listPublic: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 10;

      const instances = await ctx.db
        .select({
          id: peertubeInstanceTable.id,
          host: peertubeInstanceTable.host,
          title: peertubeInstanceTable.title,
          description: peertubeInstanceTable.description,
          thumbnail: peertubeInstanceTable.thumbnail,
        })
        .from(peertubeInstanceTable)
        .where(eq(peertubeInstanceTable.isPublic, true))
        .limit(limit);

      return instances;
    }),
});
