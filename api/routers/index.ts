/**
 * This file contains the root router of your tRPC-backend
 */
import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { videoRouter } from "./video";

export const appRouter = router({
	healthcheck: publicProcedure
		.meta({ openapi: { method: "GET", path: "/health" } })
		.input(z.object({}))
		.output(z.string())
		.query(() => "yay!"),
	video: videoRouter,
});

export type AppRouter = typeof appRouter;
