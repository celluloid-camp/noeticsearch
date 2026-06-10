"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton as BoneyardSkeleton } from "boneyard-js/react";
import { Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  HomeSearchCard,
  HomeSearchCardSkeleton,
} from "@/components/home-search-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useTRPC } from "@/lib/trpc/client";

interface PublicSearchesGridProps {
  mode?: "mine" | "public";
}

export function PublicSearchesGrid({
  mode = "public",
}: PublicSearchesGridProps) {
  const api = useTRPC();
  const t = useTranslations("hero");
  const tSearch = useTranslations("search");
  const tSidebar = useTranslations("sidebar");
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
  const isEmpty = !isLoading && searches.length === 0;

  return (
    <div className="mt-10 px-10">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm tracking-tight">
            {mode === "mine" ? tSearch("mySearches") : t("publicSearchesTitle")}
          </h2>
          {!isLoading && searches.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-muted-foreground text-xs">
              {searches.length}
            </span>
          )}
        </div>
        {mode === "mine" && (
          <Button asChild size="sm" variant="outline">
            <Link href="/mysearch">{tSidebar("seeAllSearches")}</Link>
          </Button>
        )}
      </div>

      {isEmpty ? (
        <Empty>
          <EmptyMedia variant="icon">
            <Search />
          </EmptyMedia>
          <EmptyContent>
            <EmptyTitle>
              {mode === "mine"
                ? tSearch("noMySearchesTitle")
                : tSearch("noPublicSearchesTitle")}
            </EmptyTitle>
            <EmptyDescription>
              {mode === "mine"
                ? tSearch("noMySearchesDescription")
                : tSearch("noPublicSearchesDescription")}
            </EmptyDescription>
            <Button asChild size="sm" variant="outline">
              <Link href="/search">{tSearch("searchButton")}</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <BoneyardSkeleton
          fallback={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(["a", "b", "c", "d", "e", "f"] as const).map((key) => (
                <HomeSearchCardSkeleton key={key} />
              ))}
            </div>
          }
          fixture={
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(["a", "b", "c", "d", "e", "f"] as const).map((key) => (
                <HomeSearchCardSkeleton key={key} />
              ))}
            </div>
          }
          loading={isLoading}
          name="searches-grid"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {searches.map((search) => (
              <HomeSearchCard key={search.id} search={search} />
            ))}
          </div>
        </BoneyardSkeleton>
      )}
    </div>
  );
}
