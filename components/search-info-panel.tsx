"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useTRPC } from "@/lib/trpc/client";

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
  const { data: captionResults = [] } = useSuspenseQuery(
    api.search.captionResults.queryOptions({ id: searchId })
  );

  const videoIdNum = Number.parseInt(videoId, 10);
  const otherVideos = captionResults.filter((v) => v.videoId !== videoIdNum);

  return (
    <Card className="shrink-0">
      <CardHeader>
        <Link
          className="font-semibold text-sm hover:underline"
          href={`/search/${searchId}`}
        >
          {search.title ?? "Untitled search"}
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="-mx-1 overflow-x-auto overflow-y-hidden px-1">
          <div className="flex w-max flex-row flex-nowrap gap-2 pb-2">
            {otherVideos.length === 0 ? (
              <p className="py-2 text-muted-foreground text-xs">
                No other videos in search
              </p>
            ) : (
              otherVideos.map((video) => {
                const id = video.videoId.toString();
                const thumbnail = video.videoThumbnail || "/placeholder.svg";
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
                    <span className="line-clamp-2 truncate px-1.5 pb-1.5 text-left text-foreground text-xs">
                      {title}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
