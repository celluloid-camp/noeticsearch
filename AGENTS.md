# Agent Rules

## Environment Variables

- ALWAYS use `@t3-oss/env-nextjs` for environment variable validation in Next.js projects
- Create an `env.ts` file at the project root using the t3-env pattern
- NEVER use `process.env` directly; import and use `env` from `@/env` instead
- Use `bun` for package management instead of npm/yarn

## File Naming

**CRITICAL RULE: ALWAYS use lowercase dash-separated (kebab-case) names for ALL files**
- Component files: `video-catalog.tsx`, `header.tsx`, `side-bar.tsx`, `video-card.tsx`
- Page files: `import/page.tsx`, `search/page.tsx`
- Utility files: `peertube-client.ts`, `auth-client.ts`
- Route files: `api/videos/route.ts`
- **NEVER use PascalCase or camelCase for file names**
- Use PascalCase ONLY for React component names (the component name inside the file)
- Example: File `video-catalog.tsx` exports component `VideoCatalog`

## tRPC Routes

- Define Zod input schemas in the same file as the router procedure
- Use `publicProcedure` for unauthenticated routes, `protectedProcedure` for authenticated routes
- Place route files in `api/routers/` directory
- Export the router type for client-side type inference

Example router structure:
```typescript
// api/routers/video.ts
import { z } from "zod";
import { publicProcedure, router } from "../trpc";

export const videoRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.db.video.findUnique({ where: { id: input.id } });
    }),
  create: protectedProcedure
    .input(z.object({ title: z.string().min(1), url: z.string().url() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db.video.create({ data: { ...input, userId: ctx.user.id } });
    }),
});
```

## tRPC Client Usage

**CRITICAL RULE: ALWAYS use `useTRPC()` with `useQuery`/`useMutation` and `queryOptions`/`mutationOptions` pattern**

### Queries Pattern (REQUIRED):
```typescript
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";

export function VideoCatalog() {
  const api = useTRPC();
  const { data, isLoading, error } = useQuery(
    api.video.getAll.queryOptions({
      filter: "all",
    }),
  );
  
  // Use data, isLoading, error...
}
```

**NEVER use the direct hook pattern like `trpc.video.getAll.useQuery()`**

### Mutations Pattern (REQUIRED):
```typescript
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";

export function VideoForm() {
  const api = useTRPC();
  const createVideo = useMutation(
    api.video.import.mutationOptions({
      onSuccess: () => {
        // Handle success
      },
    }),
  );
  
  const handleSubmit = () => {
    createVideo.mutate({ url: "...", isPublic: false });
  };
}
```

**Key Points:**
- Always call `useTRPC()` and store in `api` variable
- Use `useQuery` from `@tanstack/react-query` with `api.router.procedure.queryOptions()`
- Use `useMutation` from `@tanstack/react-query` with `api.router.procedure.mutationOptions()`
- This pattern provides better type safety and integration with React Query

## Forms (react-hook-form + Zod)

- Use Zod for form validation schemas
- Use the shadcn/ui `Form` component from `@/components/ui/form`
- Define schemas in a separate `schemas/` folder or co-locate with the form component
- Combine with tRPC mutations using the pattern above

- Always show loading states during form submission
- Handle errors with `form.setError()` for field-level errors or display error toasts
- Reset form after successful submission when appropriate
