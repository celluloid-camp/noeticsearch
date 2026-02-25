import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { searchHistoryTable, searchResultTable } from "@/db/schema";
import { protectedProcedure, router } from "../trpc";

export const searchRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      await ctx.db.insert(searchHistoryTable).values({
        id,
        userId: ctx.user.id,
      });
      return { id };
    }),
  load: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const searchHistory = await ctx.db.query.searchHistoryTable.findFirst({
        where: and(
          eq(searchHistoryTable.id, input.id),
          eq(searchHistoryTable.userId, ctx.user.id)
        ),
        with: {
          user: true,
        },
      });
      if (!searchHistory) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Search history not found",
        });
      }
      return searchHistory;
    }),
  captionResults: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const searchHistory = await ctx.db.query.searchHistoryTable.findFirst({
        where: and(
          eq(searchHistoryTable.id, input.id),
          eq(searchHistoryTable.userId, ctx.user.id)
        ),
        columns: {
          id: true,
        },
      });

      if (!searchHistory) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Search history not found",
        });
      }

      const references = await ctx.db.query.searchResultTable.findMany({
        where: eq(searchResultTable.searchId, input.id),
        with: {
          video: true,
          caption: true,
        },
        orderBy: (searchResult, { asc }) => [asc(searchResult.id)],
      });

      const grouped = new Map<
        number,
        {
          videoId: number;
          videoTitle: string;
          videoThumbnail: string | null;
          videoUrl: string;
          captions: Array<{
            id: number;
            text: string;
            startTime: number;
            endTime: number;
            language: string;
            rank: number;
          }>;
        }
      >();

      for (const reference of references) {
        if (!(reference.video && reference.caption)) {
          continue;
        }

        const existing = grouped.get(reference.video.id);
        const caption = {
          id: reference.caption.id,
          text: reference.caption.text,
          startTime: reference.caption.startTime,
          endTime: reference.caption.endTime,
          language: reference.caption.language,
          rank: 0,
        };

        if (!existing) {
          grouped.set(reference.video.id, {
            videoId: reference.video.id,
            videoTitle: reference.video.title,
            videoThumbnail: reference.video.thumbnail ?? null,
            videoUrl: reference.video.url,
            captions: [caption],
          });
          continue;
        }

        existing.captions.push(caption);
      }

      return Array.from(grouped.values());
    }),
  list: protectedProcedure.query(async ({ ctx }) => {
    const searchHistories = await ctx.db.query.searchHistoryTable.findMany({
      where: eq(searchHistoryTable.userId, ctx.user.id),
      columns: {
        id: true,
        createdAt: true,
      },
    });
    return searchHistories;
  }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db
        .delete(searchHistoryTable)
        .where(eq(searchHistoryTable.id, input.id));
    }),
});
