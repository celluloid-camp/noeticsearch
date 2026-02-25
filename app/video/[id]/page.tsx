"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { parseAsFloat, useQueryState } from "nuqs";
import { Suspense, useRef, useState } from "react";
import Loading from "@/app/loading";
import { CaptionsPanel } from "@/components/captions-panel";
import type { MediaChromePlayerRef } from "@/components/media-chrome-player";
import VideoPlayer from "@/components/video-player";
import { useTRPC } from "@/lib/trpc/client";

export default function VideoPage() {
  const router = useRouter();
  const params = useParams();
  const [timestampParam] = useQueryState("t", parseAsFloat);

  const videoId = params.id as string;
  const [, setCurrentTime] = useState(0);
  const playerRef = useRef<MediaChromePlayerRef | null>(null);

  const api = useTRPC();
  const queryClient = useQueryClient();
  const {
    data: video,
    isLoading,
    error,
  } = useQuery(
    api.video.getById.queryOptions({
      id: videoId,
    })
  );

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return <Loading />;
  }

  if (error || !video) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="mb-2 font-bold text-2xl text-foreground">
            {error ? "Error loading video" : "Video not found"}
          </h1>
          {error && (
            <p className="mb-4 text-muted-foreground">{error.message}</p>
          )}
          <button
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90"
            onClick={handleBack}
            type="button"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] gap-4 overflow-hidden">
      {/* Video Player */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <VideoPlayer
          onClose={handleBack}
          onCurrentTimeChange={setCurrentTime}
          onVideoDeleted={() => {
            // Navigate away after deletion
            router.push("/");
          }}
          onVideoUpdated={() => {
            // Refetch video data after update
            queryClient.invalidateQueries({
              queryKey: api.video.getById.queryOptions({ id: videoId })
                .queryKey,
            });
          }}
          playerRef={playerRef as React.RefObject<MediaChromePlayerRef>}
          video={video}
        />
      </div>

      {/* Middle: Transcript Panel */}
      <div className="flex min-h-0 w-96 min-w-0 flex-col overflow-hidden">
        <Suspense fallback={<Loading />}>
          <CaptionsPanel timestamp={timestampParam} videoId={videoId} />
        </Suspense>
      </div>
    </div>
  );
}
