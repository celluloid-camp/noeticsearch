import type { RouterOutput } from "@/lib/trpc/client";

export type PublicSearchItem = RouterOutput["search"]["publicExpanded"][number];
export type MineSearchItem = RouterOutput["search"]["mineExpanded"][number];
export type SearchItem = PublicSearchItem | MineSearchItem;

export type SearchThumbnail = NonNullable<
  SearchItem["results"][number]["video"]
>;

export type SearchSort = "recent" | "title" | "oldest";

export function sortSearches(
  items: SearchItem[],
  sortBy: SearchSort
): SearchItem[] {
  const sorted = [...items];
  switch (sortBy) {
    case "title":
      return sorted.sort((a, b) =>
        (a.title ?? "").localeCompare(b.title ?? "", undefined, {
          sensitivity: "base",
        })
      );
    case "oldest":
      return sorted.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    default:
      return sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }
}

export function uniqueThumbnails(
  results: SearchItem["results"]
): SearchThumbnail[] {
  const seen = new Set<string>();
  const out: SearchThumbnail[] = [];
  for (const result of results) {
    if (result.video && !seen.has(result.video.id)) {
      seen.add(result.video.id);
      out.push(result.video);
      if (out.length === 4) {
        break;
      }
    }
  }
  return out;
}

export function primaryThumbnail(
  results: SearchItem["results"]
): SearchThumbnail | null {
  return uniqueThumbnails(results)[0] ?? null;
}
