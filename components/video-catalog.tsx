"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/lib/trpc/client";
import type { Video } from "@/lib/types";

interface VideoCatalogProps {
  filter?: "public" | "all" | "mine";
}

export default function VideoCatalog({ filter = "all" }: VideoCatalogProps) {
  const router = useRouter();
  const api = useTRPC();
  const { data, isLoading, error } = useQuery(
    api.video.getAll.queryOptions({
      filter,
    })
  );

  const handleVideoClick = (video: Video) => {
    router.push(`/video/${video.id}`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card className="overflow-hidden" key={i}>
            <Skeleton className="aspect-video w-full" />
            <CardContent className="p-4">
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">
          Failed to load videos: {error.message}
        </p>
      </div>
    );
  }

  const videos = data?.videos || [];

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="mb-2 text-lg text-muted-foreground">No videos found</p>
        <p className="text-muted-foreground text-sm">
          {filter === "mine"
            ? "You haven't imported any videos yet."
            : "Start by importing a video from PeerTube."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {videos.map((video) => (
        <Card
          className="cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
          key={video.id}
          onClick={() => handleVideoClick(video)}
        >
          <div className="relative aspect-video w-full bg-muted">
            {video.thumbnail ? (
              <Image
                alt={video.title}
                className="object-cover"
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                src={video.thumbnail}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
          </div>
          <CardContent className="p-4">
            <h3 className="mb-1 line-clamp-2 font-semibold text-sm">
              {video.title}
            </h3>
            <p className="text-muted-foreground text-xs">
              {new Date(video.addedDate).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
