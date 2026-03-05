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

## Translations (next-intl)

This project uses **next-intl** for internationalization.

### Supported Locales
- `en` (default)
- `fr`

Locale is resolved from a cookie (`NEXT_LOCALE`) or the `Accept-Language` header — **no locale prefix in URLs**.

### Message Files
Translation strings live in `messages/` at the project root:
- `messages/en.json` — English
- `messages/fr.json` — French

### Adding or Updating Translations

**CRITICAL RULE: ALWAYS update BOTH `messages/en.json` and `messages/fr.json` when adding new keys.**

Messages are organized by feature namespace:

```
common      → shared UI labels (save, cancel, delete, error, success…)
nav         → sidebar / navigation links
search      → search page and history
video       → video catalog, player, edit dialog
captions    → transcript panel
import      → import flow
auth        → sign-in / sign-up pages
settings    → user settings page
sidebar     → search history sidebar
app         → app-level (name, etc.)
```

To add a key, insert it in the correct namespace object in **both** JSON files:

```json
// messages/en.json
{
  "video": {
    "myNewKey": "My label"
  }
}

// messages/fr.json
{
  "video": {
    "myNewKey": "Mon libellé"
  }
}
```

### Using Translations in Components

**Server components** (and server-side code):
```typescript
import { getTranslations } from "next-intl/server";

const t = await getTranslations();
t("video.myNewKey");
```

**Client components:**
```typescript
"use client";
import { useTranslations } from "next-intl";

const t = useTranslations();
t("video.myNewKey");
// or scope to a namespace:
const t = useTranslations("video");
t("myNewKey");
```

### Config & Setup Files
- `i18n/config.ts` — locale list, default locale, cookie name
- `i18n/request.ts` — next-intl server request config (loads message JSON)
- `middleware.ts` — locale detection middleware (reads cookie / Accept-Language)

## Empty States

**CRITICAL RULE: ALWAYS use the `Empty` component from `@/components/ui/empty` for empty states.**

- NEVER build custom empty states with raw `div` + icon + text combinations
- Use the compound component pattern: `Empty > EmptyMedia + EmptyContent > EmptyTitle + EmptyDescription + (optional action)`
- Use `EmptyMedia variant="icon"` for icon-based empty states

```tsx
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { InboxIcon } from "lucide-react";

<Empty>
  <EmptyMedia variant="icon">
    <InboxIcon />
  </EmptyMedia>
  <EmptyContent>
    <EmptyTitle>Nothing here yet</EmptyTitle>
    <EmptyDescription>
      Add something to get started.
    </EmptyDescription>
    <Button size="sm" variant="outline">Get started</Button>
  </EmptyContent>
</Empty>
```

Available sub-components:
- `Empty` — outer container (dashed border, centered flex column)
- `EmptyMedia` — icon/image wrapper; use `variant="icon"` for a rounded muted background
- `EmptyHeader` — alternative header wrapper
- `EmptyTitle` — bold title text
- `EmptyDescription` — muted description text
- `EmptyContent` — wraps title + description + action in a column

## Loading States

**CRITICAL RULE: ALWAYS use `Skeleton` for loading states instead of `Spinner`.**

- Use `Skeleton` from `@/components/ui/skeleton` to mirror the shape of the content being loaded.
- Match the skeleton layout to the actual content structure (thumbnail dimensions, text line widths, etc.).
- Only use `Spinner` for actions/mutations (form submit, button click) where there is no content shape to mirror.

Example — list of video cards loading:
```tsx
import { Skeleton } from "@/components/ui/skeleton";

{isLoading && (
  <div className="space-y-2">
    {Array.from({ length: 5 }).map((_, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
      <div className="flex gap-3 p-3" key={i}>
        <Skeleton className="aspect-video w-48 shrink-0 rounded-md" />
        <div className="flex flex-1 flex-col gap-2 pt-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    ))}
  </div>
)}
```

## Date & Time

This project uses **date-fns** (v4) for all date and time formatting.

- NEVER use `new Date().toLocaleDateString()`, `toLocaleTimeString()`, or manual time diff calculations
- ALWAYS import utilities from `date-fns` (e.g. `formatDistanceToNow`, `format`, `formatRelative`)
- ALWAYS pass the active locale from `useLocale()` (next-intl) mapped to a `date-fns/locale` object

### Locale mapping pattern (client components)

```typescript
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useLocale } from "next-intl";

const DATE_FNS_LOCALES: Record<string, Locale> = { en: enUS, fr };

// Inside a component or hook:
const locale = useLocale();
const relative = formatDistanceToNow(date, {
  addSuffix: true,
  locale: DATE_FNS_LOCALES[locale] ?? enUS,
});
```

### Server components

```typescript
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { getLocale } from "next-intl/server";

const DATE_FNS_LOCALES: Record<string, Locale> = { en: enUS, fr };

const locale = await getLocale();
const formatted = format(date, "PPP", { locale: DATE_FNS_LOCALES[locale] ?? enUS });
```

## Linting & Formatting

This project uses **Biome** with **Ultracite** presets for linting and formatting.

### Commands
- `bun run lint` - Run biome check
- `bun run lint:fix` - Fix linting issues automatically
- `bun run format` - Format code

### Configuration
The biome.json extends Ultracite presets (core, react, next) with custom overrides for project-specific rules.

## Git Hooks

This project uses **Lefthook** for managing git hooks.

### Hooks
- **pre-commit**: Runs biome check and format
- **pre-push**: Runs biome check

### Manual Run
- `bunx lefthook run pre-commit`
- `bunx lefthook run pre-push`
