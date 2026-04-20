"use client";

import { IconRefresh } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, Square } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/lib/trpc/client";
import { cn, formatDuration } from "@/lib/utils";

export interface SelectedVideo {
  id: number;
  name: string;
  thumbnailUrl?: string | null;
  url: string;
}

interface PeerTubeSearchResultsProps {
  baseUrl: string;
  onImportSelected: (videos: SelectedVideo[]) => void;
  onReset: () => void;
  search: string;
}

export function PeerTubeSearchResults({
  baseUrl,
  search,
  onImportSelected,
  onReset,
}: PeerTubeSearchResultsProps) {
  const api = useTRPC();
  const t = useTranslations("import");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data, isLoading, isError, error } = useQuery(
    api.peertubeSearch.searchVideos.queryOptions({ baseUrl, search })
  );

  const handleToggle = (videoId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const handleImportSelected = () => {
    if (!data) {
      return;
    }
    const selected = data.data
      .filter((v) => selectedIds.has(v.id))
      .map((v) => ({
        id: v.id,
        name: v.name ?? "",
        thumbnailUrl: v.thumbnailUrl ?? null,
        url: `${baseUrl.replace(/\/$/, "")}/w/${v.uuid}`,
      }));
    onImportSelected(selected);
  };

  let description: string;
  if (isLoading) {
    description = t("searching");
  } else if (isError) {
    description = error?.message ?? t("searchFailed");
  } else if (data) {
    description = t("videosFound", { count: data.total });
  } else {
    description = t("resultsPlaceholder");
  }

  return (
    <Card className="flex h-full flex-col border-none bg-transparent shadow-none ring-0">
      <CardHeader className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <CardTitle>{t("results")}</CardTitle>
          <CardDescription>{description}</CardDescription>
          <p className="truncate text-muted-foreground text-xs">{baseUrl}</p>
        </div>
        <Button
          disabled={isLoading && !isError}
          onClick={onReset}
          size="sm"
          variant="outline"
        >
          <IconRefresh />
          {t("reset")}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-1">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => (
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
          {isError && (
            <p className="text-destructive text-sm">
              {error instanceof Error ? error.message : t("searchFailed")}
            </p>
          )}
          {data?.data.length === 0 && (
            <p className="text-muted-foreground text-sm">
              {t("noVideosFoundTryKeywords")}
            </p>
          )}
          {!isError && data && data.data.length > 0 && (
            <div className="space-y-2">
              {data.data.map((v) => {
                const author =
                  v.channel?.displayName ??
                  v.channel?.name ??
                  v.account?.displayName ??
                  v.account?.name ??
                  null;
                const isSelected = selectedIds.has(v.id);

                return (
                  <button
                    className={cn(
                      "flex w-full gap-3 rounded-md p-3 text-left text-xs/relaxed transition-colors hover:bg-muted/60",
                      isSelected && "border-ring bg-muted"
                    )}
                    key={v.id}
                    onClick={() => handleToggle(v.id)}
                    type="button"
                  >
                    <div className="flex shrink-0 items-start pt-1">
                      {isSelected ? (
                        <CheckSquare className="size-4 text-primary" />
                      ) : (
                        <Square className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-md bg-muted">
                      {v.thumbnailUrl ? (
                        <Image
                          alt={v.name ?? ""}
                          className="object-cover"
                          fill
                          src={v.thumbnailUrl}
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-medium text-foreground text-sm">
                        {v.name}
                      </p>
                      {(author || v.duration) && (
                        <p className="mt-0.5 text-muted-foreground text-xs">
                          {[
                            author,
                            v.duration ? formatDuration(v.duration) : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      {!(isLoading || isError) && data && data.data.length > 0 && (
        <CardFooter className="flex items-center justify-between gap-2 border-t pt-4">
          <span className="text-muted-foreground text-sm">
            {selectedIds.size > 0
              ? t("selectedCount", { count: selectedIds.size })
              : t("selectVideosHint")}
          </span>
          <Button
            disabled={selectedIds.size === 0}
            onClick={handleImportSelected}
            size="sm"
          >
            {t("importSelected", { count: selectedIds.size })}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
