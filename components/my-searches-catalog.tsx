"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useMemo } from "react";
import {
  MySearchCard,
  MySearchCardSkeleton,
} from "@/components/my-search-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { type SearchSort, sortSearches } from "@/lib/search/search-item";
import { useTRPC } from "@/lib/trpc/client";

export function MySearchesCatalogSkeleton() {
  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-border border-b bg-background/95 px-4 pt-4 pb-4 backdrop-blur supports-backdrop-filter:bg-background/80">
        <Skeleton className="h-7 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {(["a", "b", "c", "d", "e", "f", "g", "h"] as const).map((key) => (
          <MySearchCardSkeleton key={key} />
        ))}
      </div>
    </div>
  );
}

export function MySearchesCatalog() {
  const api = useTRPC();
  const tSearch = useTranslations("search");
  const tNav = useTranslations("nav");
  const tVideo = useTranslations("video");
  const [sortBy, setSortBy] = useQueryState(
    "sort",
    parseAsStringEnum<SearchSort>(["recent", "title", "oldest"]).withDefault(
      "recent"
    )
  );

  const { data: searches = [], isLoading } = useQuery(
    api.search.mineExpanded.queryOptions()
  );

  const sortedSearches = useMemo(
    () => sortSearches(searches, sortBy),
    [searches, sortBy]
  );

  if (isLoading) {
    return <MySearchesCatalogSkeleton />;
  }

  const sortLabel =
    sortBy === "title"
      ? tVideo("sortName")
      : sortBy === "oldest"
        ? tSearch("sortOldest")
        : tVideo("sortRecent");

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-border border-b bg-background/95 px-4 pt-4 pb-4 backdrop-blur supports-backdrop-filter:bg-background/80">
        <h2 className="font-mono font-semibold text-lg">
          {tSearch("mySearches")}
        </h2>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg" variant="outline">
                {sortLabel}
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setSortBy("recent")}>
                {tVideo("sortRecent")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSortBy("oldest")}>
                {tSearch("sortOldest")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSortBy("title")}>
                {tVideo("sortName")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Link href="/search">
            <Button size="lg">
              <Search className="size-4" />
              <span>{tNav("newSearch")}</span>
            </Button>
          </Link>
        </div>
      </div>

      {sortedSearches.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8">
          <Empty>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyContent>
              <EmptyTitle>{tSearch("noMySearchesTitle")}</EmptyTitle>
              <EmptyDescription>
                {tSearch("noMySearchesDescription")}
              </EmptyDescription>
              <Button asChild size="lg" variant="secondary">
                <Link href="/search">{tSearch("searchButton")}</Link>
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 px-4 pb-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {sortedSearches.map((search) => (
            <MySearchCard key={search.id} search={search} />
          ))}
        </div>
      )}
    </div>
  );
}
