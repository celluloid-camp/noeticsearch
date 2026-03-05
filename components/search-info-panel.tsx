"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTRPC } from "@/lib/trpc/client";
import { Button } from "./ui/button";

export function SearchInfoPanel({
  searchId,
  videoId,
}: {
  searchId: string;
  videoId: string;
}) {
  const api = useTRPC();
  const { data: search } = useSuspenseQuery(
    api.search.load.queryOptions({ id: searchId })
  );
  const { data: captionResults = { results: [], canEdit: false } } =
    useSuspenseQuery(api.search.captionResults.queryOptions({ id: searchId }));

  const otherVideos = captionResults.results.filter(
    (v) => v.videoId !== videoId
  );

  return (
    <Collapsible defaultOpen>
      <Card className="shrink-0">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <Link href={`/search/${searchId}`}>
            <Button variant="ghost">
              <span>{search.title ?? "Untitled search"}</span>
            </Button>
          </Link>
          <CollapsibleTrigger asChild>
            <Button
              aria-label="Toggle other videos"
              className="transition-transform data-[state=open]:rotate-180"
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <ChevronDown className="size-4" />
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="-mx-1 overflow-x-auto overflow-y-hidden px-1">
              <div className="flex w-max flex-row flex-nowrap gap-2 pb-2">
                {otherVideos.length === 0 ? (
                  <p className="py-2 text-muted-foreground text-xs">
                    No other videos in search
                  </p>
                ) : (
                  otherVideos.map((video) => {
                    const id = video.videoId.toString();
                    const thumbnail =
                      video.videoThumbnail || "/placeholder.svg";
                    const title = video.videoTitle || "Untitled";

                    return (
                      <Link
                        className="flex w-36 shrink-0 flex-col gap-1 overflow-hidden rounded-md border bg-muted/50 transition-colors hover:bg-muted"
                        href={`/search/${searchId}/video/${id}`}
                        key={video.videoId}
                      >
                        <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-muted">
                          {thumbnail !== "/placeholder.svg" ? (
                            <Image
                              alt={title}
                              className="object-cover"
                              fill
                              sizes="144px"
                              src={thumbnail}
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center text-muted-foreground text-xs">
                              No preview
                            </div>
                          )}
                        </div>
                        <span className="line-clamp-3 truncate px-1.5 pb-1.5 text-left text-foreground text-xs">
                          {title}
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
