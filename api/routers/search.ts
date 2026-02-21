import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { searchHistoryTable } from "@/db/schema";
import { protectedProcedure, router } from "../trpc";

export const searchRouter = router({
	create: protectedProcedure
		.input(
			z.object({
				id: z.string(),
			}),
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
				where: eq(searchHistoryTable.id, input.id),
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
