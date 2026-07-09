import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    BETTER_AUTH_SECRET: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    MISTRAL_API_KEY: z.string().min(1),
    REDIS_URL: z.string().min(1).optional(),
    ADMIN_EMAIL: z.email(),
    ADMIN_PASSWORD: z.string().min(1),
    WORKFLOW_TARGET_WORLD: z.string().min(1).optional(),
    WORKFLOW_POSTGRES_URL: z.string().min(1).optional(),
    WORKFLOW_POSTGRES_JOB_PREFIX: z.string().min(1).optional(),
    WORKFLOW_POSTGRES_WORKER_CONCURRENCY: z.coerce.number().optional(),
    WORKFLOW_POSTGRES_MAX_POOL_SIZE: z.coerce.number().optional(),
  },
  experimental__runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
