/**
 * tRPC Client Configuration
 * Client-side utilities for making type-safe API calls
 */

import type { inferRouterOutputs } from "@trpc/server";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@/api";

/**
 * A set of strongly-typed React hooks from your `AppRouter` type signature.
 * Using @trpc/tanstack-react-query for optimal integration
 */
export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();

export type RouterOutput = inferRouterOutputs<AppRouter>;

export type VideoById = RouterOutput["video"]["getById"];
