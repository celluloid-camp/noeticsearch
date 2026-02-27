"use client";

import { useQuery } from "@tanstack/react-query";
import { MediaProvider } from "media-chrome/react/media-store";
import { useParams, useRouter } from "next/navigation";
import { parseAsFloat, useQueryState } from "nuqs";
import { Suspense } from "react";
import Loading from "@/app/loading";
import { CaptionsPanel } from "@/components/captions-panel";
import VideoPlayer from "@/components/video-player";
import { useTRPC } from "@/lib/trpc/client";

export default function VideoPage() {
  const router = useRouter();
  const params = useParams();
  const [timestampParam] = useQueryState("t", parseAsFloat);

  const videoId = params.id as string;

  const api = useTRPC();
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
    <MediaProvider>
      <div className="flex h-full gap-4 overflow-hidden">
        {/* Video Player */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <VideoPlayer video={video} />
        </div>

        {/* Middle: Transcript Panel */}
        <div className="mx-4 flex min-h-0 w-1/3 min-w-0 flex-col overflow-hidden py-6">
          <Suspense fallback={<Loading />}>
            <CaptionsPanel
              highlightTimestamp={timestampParam}
              videoId={videoId}
            />
          </Suspense>
        </div>
      </div>
    </MediaProvider>
  );
}
