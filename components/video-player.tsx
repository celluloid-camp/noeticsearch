"use client";

import { Settings, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { VideoById } from "@/lib/trpc/client";
import type { SearchResult } from "@/lib/types";
import DeleteVideoDialog from "./delete-video-dialog";
import EditVideoDialog from "./edit-video-dialog";
import MediaChromePlayer, {
  type MediaChromePlayerRef,
} from "./media-chrome-player";

interface VideoPlayerProps {
  video: VideoById;
  onClose: () => void;
  selectedResult?: SearchResult | null;
  onCurrentTimeChange?: (time: number) => void;
  playerRef?: React.RefObject<MediaChromePlayerRef>;
  onVideoUpdated?: () => void;
  onVideoDeleted?: () => void;
}

export default function VideoPlayer({
  video,
  onClose: _onClose,
  selectedResult,
  onCurrentTimeChange,
  playerRef: externalPlayerRef,
  onVideoUpdated,
  onVideoDeleted,
}: VideoPlayerProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const internalPlayerRef = useRef<MediaChromePlayerRef>(null);
  const playerRef = externalPlayerRef || internalPlayerRef;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [, setCurrentTime] = useState(0); // Used via onCurrentTimeChange callback
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSeekRef = useRef<number | null>(null);

  // Unified seek handler - handles both pending seeks and selectedResult changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: playerRef.current should not be a dependency for this seek orchestration.
  useEffect(() => {
    // Get timestamp from selectedResult or pending seek
    const timestamp = selectedResult?.startTime ?? pendingSeekRef.current;

    if (timestamp === undefined || timestamp === null || timestamp < 0) {
      pendingSeekRef.current = null;
      return;
    }

    // Capture player ref at effect execution time
    const player = playerRef.current;
    console.log("🎯 Seek requested:", {
      timestamp,
      isPlayerReady,
      hasPlayer: !!player,
      source: selectedResult ? "selectedResult" : "pendingSeek",
    });

    // If player is ready, seek immediately
    if (isPlayerReady && player) {
      console.log("✅ Player ready, seeking to:", timestamp);
      // Clear pending seek
      pendingSeekRef.current = null;

      // Use a delay to ensure video element is fully ready (especially for HLS)
      const seekTimeout = setTimeout(() => {
        // Access ref again inside timeout to get latest value
        const currentPlayer = playerRef.current;
        if (currentPlayer && timestamp !== null) {
          currentPlayer.seekTo(timestamp);
          setCurrentTime(timestamp);
          onCurrentTimeChange?.(timestamp);

          // Auto-play after seeking (with delay for HLS streams)
          setTimeout(() => {
            console.log("▶️ Auto-playing after seek");
            setIsPlaying(true);
          }, 1000);
        }
      }, 500); // Increased delay for HLS streams

      return () => clearTimeout(seekTimeout);
    }
    // Store timestamp to seek when ready
    console.log("⏳ Player not ready, storing timestamp for later:", timestamp);
    pendingSeekRef.current = timestamp;
    // playerRef is a ref object - refs don't change identity so they don't need to be in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedResult, isPlayerReady, onCurrentTimeChange]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Content */}
      <div className="min-h-0 flex-1 overflow-hidden p-4">
        <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            {/* Video Area */}
            <div className="flex min-w-0 flex-col gap-4">
              {/* Embedded Player */}
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
                <MediaChromePlayer
                  controls={true}
                  onPause={() => {
                    setIsPlaying(false);
                    // Stop tracking progress when paused
                    if (progressIntervalRef.current) {
                      clearInterval(progressIntervalRef.current);
                      progressIntervalRef.current = null;
                    }
                  }}
                  onPlay={() => {
                    setIsPlaying(true);
                    // Start tracking progress when playing
                    progressIntervalRef.current = setInterval(() => {
                      if (playerRef.current) {
                        const time = playerRef.current.getCurrentTime();
                        setCurrentTime(time);
                      }
                    }, 100); // Update every 100ms
                  }}
                  onProgress={(state) => {
                    setCurrentTime(state.playedSeconds);
                    onCurrentTimeChange?.(state.playedSeconds);
                  }}
                  onReady={() => {
                    console.log("🎬 MediaChromePlayer onReady called");
                    setIsPlayerReady(true);
                    // Also check for pending seek immediately when ready
                    if (pendingSeekRef.current !== null && playerRef.current) {
                      const timestamp = pendingSeekRef.current;
                      console.log(
                        "🎬 Player ready callback, executing pending seek:",
                        timestamp
                      );
                      setTimeout(() => {
                        if (
                          playerRef.current &&
                          pendingSeekRef.current === timestamp
                        ) {
                          pendingSeekRef.current = null;
                          playerRef.current.seekTo(timestamp);
                          setCurrentTime(timestamp);
                          onCurrentTimeChange?.(timestamp);
                          setTimeout(() => {
                            setIsPlaying(true);
                          }, 800);
                        }
                      }, 500);
                    }
                  }}
                  onSeek={() => {
                    // Handle seek if needed
                  }}
                  playing={isPlaying}
                  ref={playerRef}
                  url={video.url}
                />
              </div>

              {/* Video Title */}
              <div className="flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-foreground text-xl">
                      {video.title}
                    </h2>
                    <div className="mt-1 flex items-center gap-2">
                      <Avatar className="size-8">
                        <AvatarImage
                          alt={video.author ?? "Author"}
                          src={video.authorAvatar ?? undefined}
                        />
                        <AvatarFallback className="text-[10px]">
                          {video.author?.charAt(0)?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-muted-foreground text-xs">
                        {video.author ? `By ${video.author}` : "Unknown author"}
                      </p>
                    </div>
                    {video.extendedDescription && (
                      <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-muted-foreground text-sm">
                        {video.extendedDescription}
                      </p>
                    )}
                  </div>
                  {video.canEdit && (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        onClick={() => setIsEditDialogOpen(true)}
                        size="icon-sm"
                        title="Edit video"
                        variant="ghost"
                      >
                        <Settings className="size-4" />
                      </Button>
                      <Button
                        onClick={() => setIsDeleteDialogOpen(true)}
                        size="icon-sm"
                        title="Delete video"
                        variant="ghost"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {video.canEdit && (
        <>
          <EditVideoDialog
            onOpenChange={setIsEditDialogOpen}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              onVideoUpdated?.();
            }}
            open={isEditDialogOpen}
            video={video}
          />
          <DeleteVideoDialog
            onOpenChange={setIsDeleteDialogOpen}
            onSuccess={() => {
              setIsDeleteDialogOpen(false);
              onVideoDeleted?.();
            }}
            open={isDeleteDialogOpen}
            video={video}
          />
        </>
      )}
    </div>
  );
}
