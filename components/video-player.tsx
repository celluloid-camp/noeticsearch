"use client";

import PeerTubeVideo from "@celluloid/peertube-video-element/react";
import { Settings } from "lucide-react";
import { useMediaRef } from "media-chrome/react/media-store";
import ReactPlayer from "react-player";
import type { PlayerEntry } from "react-player/players";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { VideoById } from "@/lib/trpc/client";
import { EditVideoDialog } from "./edit-video-dialog";

const MATCH_SRC = /(https?):\/\/([^/]+)\/(?:videos\/watch|w)\/(.+)$/;
function canPlay(src: string): boolean {
  return MATCH_SRC.test(src);
}

// Create a PlayerEntry for the PeerTube player
const peertubePlayerEntry: PlayerEntry = {
  key: "peertube",
  name: "PeerTube",
  canPlay,
  player: PeerTubeVideo as any,
};

// Register the custom PeerTube player
ReactPlayer.addCustomPlayer?.(peertubePlayerEntry);

interface VideoPlayerProps {
  video: VideoById;
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const mediaRefCallback = useMediaRef();

  return (
    <div className="mt-4 ml-4 flex h-full w-full flex-col">
      {/* Content */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full w-full flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            {/* Video Area */}
            <div className="flex min-w-0 flex-col gap-4">
              {/* Embedded Player */}
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
                <ReactPlayer
                  controls={true}
                  height="100%"
                  ref={mediaRefCallback}
                  slot="media"
                  src={video.url}
                  width="100%"
                />
              </div>

              {/* Video Title */}
              <div className="flex flex-col gap-1 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-foreground text-xl">
                      {video.title}
                    </h2>
                    <div className="mt-1 flex items-center gap-2">
                      <Avatar className="size-12">
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
                    {video.description && (
                      <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-muted-foreground text-sm">
                        {video.description}
                      </p>
                    )}
                  </div>
                  {video.canEdit ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <EditVideoDialog onSuccess={() => {}} video={video}>
                        <Button variant="outline">
                          <Settings />
                          <span>Edit</span>
                        </Button>
                      </EditVideoDialog>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
