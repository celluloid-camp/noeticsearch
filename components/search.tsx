"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { SearchVideoCaptionsUITool } from "@/lib/ai/tools";

export type FindVideosUIToolOutput = SearchVideoCaptionsUITool["output"];

export const SearchVideo = ({ videos }: { videos: FindVideosUIToolOutput }) => {
  // Handle case where videos might be undefined or not an array
  const videoArray = Array.isArray(videos) ? videos : [];

  if (videoArray.length === 0) {
    return (
      <div className="py-4">
        <p className="text-muted-foreground text-sm">No videos found</p>
      </div>
    );
  }

  return (
    <div className="w-full py-4">
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4" style={{ width: "max-content" }}>
          {videoArray.map((video) => {
            const videoId = video.videoId;
            const thumbnail = video.videoThumbnail || "/placeholder.svg";
            const title = video.videoTitle || "Untitled";

            return (
              <Link
                className="inline-block shrink-0"
                href={`/video/${videoId}`}
                key={videoId}
              >
                <Card className="w-64 cursor-pointer overflow-hidden transition-shadow hover:shadow-lg">
                  <div className="relative aspect-video w-full bg-muted">
                    {thumbnail && thumbnail !== "/placeholder.svg" ? (
                      <Image
                        alt={title}
                        className="object-cover"
                        fill
                        sizes="256px"
                        src={thumbnail}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="mb-1 line-clamp-2 font-semibold text-sm">
                      {title}
                    </h3>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
