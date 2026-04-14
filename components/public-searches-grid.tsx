"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { Clock, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useRelativeTime } from "@/hooks/use-relative-time";
import { type RouterOutput, useTRPC } from "@/lib/trpc/client";

type PublicSearchItem = RouterOutput["search"]["publicExpanded"][number];
type MineSearchItem = RouterOutput["search"]["mineExpanded"][number];
type SearchItem = PublicSearchItem | MineSearchItem;

type ThumbnailItem = NonNullable<SearchItem["results"][number]["video"]>;

function uniqueThumbnails(results: SearchItem["results"]): ThumbnailItem[] {
  const seen = new Set<string>();
  const out: ThumbnailItem[] = [];
  for (const r of results) {
    if (r.video && !seen.has(r.video.id)) {
      seen.add(r.video.id);
      out.push(r.video);
      if (out.length === 4) {
        break;
      }
    }
  }
  return out;
}

function ThumbnailGrid({ thumbnails }: { thumbnails: ThumbnailItem[] }) {
  const slots = thumbnails.length > 0 ? thumbnails.slice(0, 4) : [];
  const placeholders = Math.max(0, 4 - slots.length);

  return (
    <div className="flex gap-1">
      {slots.map((video) =>
        video.thumbnail ? (
          <div
            className="relative size-10 shrink-0 overflow-hidden rounded bg-muted"
            key={video.id}
          >
            <Image
              alt={video.title}
              className="object-cover"
              fill
              sizes="40px"
              src={video.thumbnail}
            />
          </div>
        ) : (
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded bg-muted"
            key={video.id}
          >
            <Search className="size-3 text-muted-foreground/30" />
          </div>
        )
      )}
      {Array.from({ length: placeholders }).map((_, i) => (
        <div className="size-10 shrink-0 rounded bg-muted" key={`ph-${i}`} />
      ))}
    </div>
  );
}

function SearchCard({ search }: { search: SearchItem }) {
  const relativeTime = useRelativeTime(new Date(search.createdAt));
  const thumbnails = uniqueThumbnails(search.results);
  const keywords = search.keywords ?? [];

  return (
    <Link
      className="group flex flex-col gap-3 rounded-none border border-border p-4 transition-colors hover:border-foreground/30 hover:bg-muted/30"
      href={`/search/${search.id}`}
    >
      {/* Row 1 — keywords as # cloud */}
      {keywords.length > 0 ? (
        <div className="flex min-h-10 flex-wrap gap-x-2 gap-y-1">
          {keywords.map((kw) => (
            <span
              className="font-mono font-semibold text-foreground/70 text-sm leading-tight"
              key={kw}
            >
              #{kw}
            </span>
          ))}
        </div>
      ) : (
        <div className="min-h-10" />
      )}

      {/* Row 2 — video thumbnails grid */}
      <ThumbnailGrid thumbnails={thumbnails} />

      {/* Row 3 — title + relative time */}
      <div className="flex flex-col gap-2">
        <p className="line-clamp-2 font-medium text-sm leading-snug group-hover:text-foreground/80">
          {search.title ?? "Untitled search"}
        </p>
        <div className="flex items-center gap-2">
          <Avatar className="size-5">
            <AvatarImage
              alt={search.user?.name ?? ""}
              src={search.user?.image ?? ""}
            />
            <AvatarFallback className="text-[10px]">
              {(search.user?.name ?? "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-muted-foreground text-xs">
            {search.user?.name ?? "Anonymous"}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
            <Clock className="size-3" />
            {relativeTime}
          </span>
        </div>
      </div>
    </Link>
  );
}

function SearchCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      {/* keywords */}
      <div className="flex min-h-10 flex-wrap gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-20" />
      </div>
      {/* thumbnails */}
      <div className="flex gap-1">
        <Skeleton className="size-10 shrink-0 rounded" />
        <Skeleton className="size-10 shrink-0 rounded" />
        <Skeleton className="size-10 shrink-0 rounded" />
        <Skeleton className="size-10 shrink-0 rounded" />
      </div>
      {/* title + user + time */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 shrink-0 rounded-full" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="ml-auto h-3 w-12 shrink-0" />
        </div>
      </div>
    </div>
  );
}

interface PublicSearchesGridProps {
  mode?: "mine" | "public";
}

export function PublicSearchesGrid({
  mode = "public",
}: PublicSearchesGridProps) {
  const api = useTRPC();
  const t = useTranslations("hero");
  const tSearch = useTranslations("search");
  const { data: publicSearches, isLoading: isLoadingPublic } = useQuery(
    api.search.publicExpanded.queryOptions()
  );
  const { data: mineSearches, isLoading: isLoadingMine } = useQuery({
    ...api.search.mineExpanded.queryOptions(),
    enabled: mode === "mine",
  });

  const searches =
    mode === "mine" ? (mineSearches ?? []) : (publicSearches ?? []);
  const isLoading = mode === "mine" ? isLoadingMine : isLoadingPublic;

  const isEmpty = !isLoading && (!searches || searches.length === 0);

  return (
    <div className="mt-10 px-10">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="font-semibold text-sm tracking-tight">
          {mode === "mine" ? tSearch("mySearches") : t("publicSearchesTitle")}
        </h2>
        {!isLoading && searches && searches.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-muted-foreground text-xs">
            {searches.length}
          </span>
        )}
      </div>

      {isEmpty ? (
        <Empty>
          <EmptyMedia variant="icon">
            <Search />
          </EmptyMedia>
          <EmptyContent>
            <EmptyTitle>No public searches yet</EmptyTitle>
            <EmptyDescription>
              Be the first to share a search with the community.
            </EmptyDescription>
            <Button asChild size="sm" variant="outline">
              <Link href="/search">Start searching</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <BoneyardSkeleton
          fallback={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SearchCardSkeleton key={i} />
              ))}
            </div>
          }
          fixture={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SearchCardSkeleton key={i} />
              ))}
            </div>
          }
          loading={isLoading}
          name="searches-grid"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {searches?.map((search) => (
              <SearchCard key={search.id} search={search} />
            ))}
          </div>
        </BoneyardSkeleton>
      )}
    </div>
  );
}
