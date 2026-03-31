"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeftIcon } from "lucide-react";
import { MediaProvider } from "media-chrome/react/media-store";
import { useParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { CaptionsPanel } from "@/components/captions-panel";
import { SearchInfoPanel } from "@/components/search-info-panel";
import { Button } from "@/components/ui/button";
import VideoPlayer from "@/components/video-player";
import { useTRPC } from "@/lib/trpc/client";
import Loading from "./loading";

export default function SearchVideoPage() {
  const router = useRouter();
  const params = useParams();
  const searchId = params.search_id as string;
  const videoId = params.video_id as string;

  const api = useTRPC();
  const {
    data: video,
    isLoading: videoLoading,
    error: videoError,
  } = useQuery(api.video.getById.queryOptions({ id: videoId }));

  const handleBack = () => {
    router.push(`/search/${searchId}`);
  };

  const isLoading = videoLoading;
  const error = videoError;
  const videoMissing = !video;

  if (isLoading) {
    return <Loading />;
  }

  if (error || videoMissing) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <AlertTriangle className="size-12" />
          </div>
          <h1 className="font-bold text-2xl text-foreground">
            {error ? "Error loading video" : "Video not found"}
          </h1>
          {error && (
            <p className="text-muted-foreground text-sm">{error.message}</p>
          )}
          <Button onClick={handleBack} type="button" variant="outline">
            <ArrowLeftIcon className="size-4" />
            Back to search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <MediaProvider>
      <div className="mt-2 flex h-full overflow-hidden">
        <VideoPlayer video={video} />

        {/* Right: Search info panel + Transcript */}
        <div className="mx-4 my-4 flex w-96 shrink-0 flex-col space-y-4">
          <Suspense
            fallback={
              <div className="h-24 shrink-0 animate-pulse rounded-lg bg-muted" />
            }
          >
            <SearchInfoPanel searchId={searchId} videoId={videoId} />
          </Suspense>

          {/* Transcript Panel */}
          <Suspense fallback={<Loading />}>
            <CaptionsPanel canEdit={video.canEdit} searchId={searchId} videoId={videoId} />
          </Suspense>
        </div>
      </div>
    </MediaProvider>
  );
}
