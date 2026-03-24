"use client";

import { IconRefresh } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface PeerTubeSearchResultsProps {
  baseUrl: string;
  onReset: () => void;
  onVideoSelect: (videoId: number) => void;
  search: string;
  selectedVideoId?: number | null;
}

export function PeerTubeSearchResults({
  baseUrl,
  search,
  onVideoSelect,
  onReset,
  selectedVideoId,
}: PeerTubeSearchResultsProps) {
  const api = useTRPC();
  const t = useTranslations("import");
  const [localSelected, setLocalSelected] = useState<number | null>(null);

  const activeSelected = selectedVideoId ?? localSelected;

  const { data, isLoading, isError, error } = useQuery(
    api.peertubeSearch.searchVideos.queryOptions({ baseUrl, search })
  );

  const handleSelect = (videoId: number) => {
    const next = activeSelected === videoId ? null : videoId;
    setLocalSelected(next);
    if (next) {
      onVideoSelect(next);
    }
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
        <div>
          <CardTitle>{t("results")}</CardTitle>
          <CardDescription>{description}</CardDescription>
          {baseUrl}
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
                const isSelected = activeSelected === v.id;

                return (
                  <button
                    className={cn(
                      "flex w-full gap-3 rounded-md p-3 text-left text-xs/relaxed transition-colors hover:bg-muted/60",
                      isSelected && "border-ring bg-muted"
                    )}
                    key={v.id}
                    onClick={() => handleSelect(v.id)}
                    type="button"
                  >
                    <div className="relative aspect-video w-48 shrink-0 overflow-hidden rounded-md bg-muted">
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
    </Card>
  );
}
