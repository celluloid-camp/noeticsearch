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


## boneyard-js

Pixel-perfect skeleton loading screens, extracted directly from your real DOM. No manual measurement, no hand-tuned placeholders.

## How it works

1. Wrap your component with `<Skeleton>` and give it a `name`
2. Optionally add a `fixture` prop with mock data for the build step
3. Run `npx boneyard-js build` — it crawls your app, snapshots every named Skeleton, and writes `.bones.json` files + a `registry.js`
4. Add `import './bones/registry'` once in your app entry — every Skeleton auto-resolves its bones by name

## Install

```
npm install boneyard-js
```

## Quick start

```tsx
// app/layout.tsx — import the registry once (must be client-side for Next.js)
import './bones/registry'
```

```tsx
import { Skeleton } from 'boneyard-js/react'

function BlogPage() {
  const { data, isLoading } = useFetch('/api/post')
  return (
    <Skeleton
      name="blog-card"
      loading={isLoading}
      fixture={<BlogCard data={MOCK_DATA} />}
    >
      {data && <BlogCard data={data} />}
    </Skeleton>
  )
}
```

## The fixture prop

Apps often have authentication or user-specific data that isn't available during the build step. The `fixture` prop provides mock content that only renders when the CLI is capturing — never in production.

```tsx
<Skeleton
  name="dashboard"
  loading={isLoading}
  fixture={<Dashboard data={{
    title: "Sample Title",
    stats: [{ label: "Revenue", value: "$12.3k" }]
  }} />}
>
  {data && <Dashboard data={data} />}
</Skeleton>
```

The mock data doesn't need to be real — it just needs to produce the same layout shape (same number of cards, similar text lengths, etc.).

## Generate the bones

With your dev server running:

```
npx boneyard-js build
```

The CLI:
- Auto-detects your dev server by scanning common ports (3000, 5173, 4321, 8080…)
- Auto-detects Tailwind breakpoints from your config (falls back to 375, 768, 1280)
- Crawls all internal links starting from the root URL
- Finds every `<Skeleton name="...">` on each page
- Captures bones at every breakpoint
- Writes `.bones.json` files + a `registry.js` to your output directory
- Auto-installs Chromium on first run

Or pass a URL explicitly: `npx boneyard-js build http://localhost:5173`

Re-run whenever your layout changes to regenerate. The CLI uses incremental builds — it hashes each skeleton's content and skips unchanged components. Use `--force` to bypass the cache and recapture everything.

**Next.js App Router:** The generated `registry.js` includes `"use client"` automatically. `<Skeleton>` uses hooks — add `"use client"` to any file that imports it.

## Excluding elements from capture

Add `data-no-skeleton` to any element you want to exclude from bone capture:

```tsx
<nav data-no-skeleton>
  {/* No bone will be generated for this element */}
</nav>
```

**Note:** This only affects the capture/snapshot phase — excluded elements won't have bones drawn over them, but they are still hidden at runtime along with all other slot content (via `visibility: hidden`). To keep an element visible during loading, place it **outside** the `<Skeleton>` wrapper.

Or use `snapshotConfig` for more control:

```tsx
<Skeleton
  snapshotConfig={{
    excludeSelectors: ['.icon', '[data-no-skeleton]', 'svg'],
    excludeTags: ['nav', 'footer'],
  }}
>
```

## Dark mode

The component auto-detects dark mode via the `.dark` class on `<html>` or any parent element (standard Tailwind convention). It uses `darkColor` when dark mode is active.

You can also pass colors explicitly:

```tsx
<Skeleton color="rgba(0,0,0,0.08)" darkColor="rgba(255,255,255,0.06)" />
```

### Skeleton props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| loading | boolean | required | Show skeleton when true, real content when false |
| name | string | required | Unique name — the CLI uses this to generate the `.bones.json` file |
| fixture | ReactNode | — | Mock content rendered only during `npx boneyard-js build`. Never touches production |
| initialBones | ResponsiveBones | — | Optional manual override. If you use the registry, you don't need this |
| color | string | rgba(0,0,0,0.08) | Bone fill color for light mode |
| darkColor | string | rgba(255,255,255,0.06) | Bone fill color for dark mode (`.dark` class) |
| animate | "pulse" &#124; "shimmer" &#124; "solid" | "pulse" | Animation style (also accepts true/false) |
| className | string | — | Extra CSS class on the wrapper div |
| fallback | ReactNode | — | What to show if bones haven't been generated yet |
| snapshotConfig | SnapshotConfig | — | Control which elements are included/excluded during capture |

### snapshotConfig

| Option | Default | Description |
|--------|---------|-------------|
| excludeSelectors | [] | CSS selectors to skip (with all children) |
| excludeTags | [] | HTML tags to skip entirely |
| leafTags | p, h1–h6, li, tr | Tags treated as one solid block (merged with defaults) |
| captureRoundedBorders | true | Capture containers with border + border-radius as bones |

### npx boneyard-js build options

```
npx boneyard-js build [url] [options]
  --out <dir>          Output directory (default: ./src/bones)
  --breakpoints <bp>   Viewport widths, comma-separated (auto-detects Tailwind)
  --wait <ms>          Extra wait after page load (default: 800)
  --force              Recapture all (skip incremental cache)
  --watch              Re-capture when your app changes (listens for HMR)
  --no-scan            Skip filesystem route scanning (only crawl links)
  --env-file <path>    Load env vars from file (useful for Bun runtime)
  --native             React Native mode — scans from device (no browser)
```

## Bone format

Bones are stored as compact arrays: `[x, y, w, h, r]` with an optional 6th element `c` for container bones. `x` and `w` are percentages of container width. `y` and `h` are pixels. `r` is border radius (number or "50%"). The runtime also supports the legacy object format `{ x, y, w, h, r, c? }` for backwards compatibility.

## Low-level API (non-React)

```ts
import { snapshotBones } from 'boneyard-js'
const result = snapshotBones(document.querySelector('.card'))

import { renderBones } from 'boneyard-js'
const html = renderBones(result, '#d4d4d4')
container.innerHTML = html

// Manual bone registration (what the generated registry.js does automatically)
import { registerBones } from 'boneyard-js/react'
registerBones({ 'my-card': bonesJson })
```

## Authentication & protected routes

**Web (React/Svelte):** Configure auth in `boneyard.config.json`:
```json
{
  "auth": {
    "cookies": [{ "name": "session", "value": "env[SESSION_TOKEN]", "domain": "localhost" }],
    "headers": { "Authorization": "Bearer env[API_TOKEN]" }
  },
  "resolveEnvVars": true
}
```
Or use the `fixture` prop to provide mock content that renders without auth.

**React Native:** Auth is a non-issue with `--native`. The app is already running on device with the user logged in — just open the screen you want to scan.

## React Native

```tsx
import { Skeleton } from 'boneyard-js/native'

<Skeleton name="profile" loading={isLoading}>
  <ProfileCard />
</Skeleton>
```

Generate bones: `npx boneyard-js build --native --out ./bones`, then open your app on device. The Skeleton component auto-scans in dev mode — walks the React fiber tree, measures each view via UIManager, and sends bone data to the CLI. In production, scan code is completely inactive.

After generating, add `import './bones/registry'` and reload the app.

## Svelte

```svelte
<script>
  import Skeleton from 'boneyard-js/svelte'
  import '../bones/registry'
  let loading = true
</script>

<Skeleton name="card" {loading}>
  <Card />
</Skeleton>
```

Uses Svelte 5 snippets for `fallback` and `fixture`. Same CLI: `npx boneyard-js build`.

## Known limitations

- **Images**: Bone captures the bounding box — works even before the image loads
- **Dynamic content**: Bones reflect the layout at capture time. Re-run the build if layout changes
- **CSS transforms**: Bones use bounding rects, so transforms affect position but not bone sizing
- **React portals**: Elements outside the snapshot root aren't captured
- **Viewport vs container**: Breakpoints are based on viewport width, not container width

## Responsive

The CLI captures bones at multiple breakpoints (default: 375, 768, 1280). At runtime, `<Skeleton>` uses ResizeObserver to pick the closest match. Bones store `x` and `w` as percentages so they scale within a breakpoint range.

Custom breakpoints: `npx boneyard-js build --breakpoints 390,820,1440`

Tailwind breakpoints are auto-detected from your config.

## Config file

Create `boneyard.config.json` in your project root. Controls both the CLI build and runtime defaults for all `<Skeleton>` components:

```json
{
  "breakpoints": [375, 640, 768, 1024, 1280, 1536],
  "out": "./src/bones",
  "wait": 800,
  "color": "#e5e5e5",
  "darkColor": "rgba(255,255,255,0.08)",
  "animate": "pulse"
}
```

Runtime defaults (`color`, `darkColor`, `animate`) are automatically included in the generated `registry.js`. Per-component props and CLI flags override config values. `animate` accepts `"pulse"`, `"shimmer"`, or `"solid"`.

## Package exports

- `boneyard-js` — snapshotBones, renderBones, fromElement
- `boneyard-js/react` — Skeleton, registerBones, configureBoneyard
- `boneyard-js/native` — Skeleton, registerBones, configureBoneyard (React Native)
- `boneyard-js/svelte` — Skeleton component, registerBones
- `boneyard-js/vue` — Skeleton component, registerBones, configureBoneyard
- `boneyard-js/angular` — SkeletonComponent, registerBones, configureBoneyard
- `boneyard-js/vite` — boneyardPlugin() Vite plugin for auto-capture

## Vite plugin

For Vite-based projects (Vue, Svelte, React with Vite), add the plugin to your vite.config.ts — no CLI needed:

```ts
import { boneyardPlugin } from 'boneyard-js/vite'

export default defineConfig({
  plugins: [boneyardPlugin()]
})
```

Captures bones on dev server start and re-captures on every HMR update. Options: `out`, `breakpoints`, `wait`, `framework`, `skipInitial`.
