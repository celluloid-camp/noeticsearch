import { tool as createTool, type InferUITool } from "ai";
import { z } from "zod";
import { findRelevantVideos } from "./search";

export const findVideos = createTool({
	description:
		"find relevant videos from database based on the users question.",
	inputSchema: z.object({
		query: z.string().describe("The query to find relevant videos"),
	}),
	execute: async ({ query }) => findRelevantVideos(query),
});

export const tools = {
	findVideos: findVideos,
};

export type FindVideosUITool = InferUITool<typeof findVideos>;
