"use client";

import ReactPlayer from "@celluloid/react-player";
import { Settings } from "lucide-react";
import { useMediaRef } from "media-chrome/react/media-store";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { VideoById } from "@/lib/trpc/client";
import { EditVideoDialog } from "./edit-video-dialog";
import { Transcription } from "./transcription-status";

// const MATCH_SRC = /(https?):\/\/([^/]+)\/(?:videos\/watch|w)\/(.+)$/;
// function canPlay(src: string): boolean {
//   return MATCH_SRC.test(src);
// }

// // Create a PlayerEntry for the PeerTube player
// const peertubePlayerEntry: PlayerEntry = {
//   key: "peertube",
//   name: "PeerTube",
//   canPlay,
//   player: PeerTubeVideo as unknown as ComponentType<VideoElementProps>,
// };

// // Register the custom PeerTube player
// ReactPlayer.addCustomPlayer?.(peertubePlayerEntry);

interface VideoPlayerProps {
  video: VideoById;
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const mediaRefCallback = useMediaRef();
  const t = useTranslations();

  return (
    <div className="no-scrollbar mt-4 ml-4 flex h-full w-full flex-col">
      {/* Content */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-hidden">
        <div className="no-scrollbar flex h-full w-full flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4">
            {/* Video Area */}
            <div className="no-scrollbar flex min-w-0 flex-col gap-4">
              {/* Embedded Player */}
              <div className="no-scrollbar relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
                <ReactPlayer
                  config={{
                    peertube: {
                      waitPasswordFromEmbedAPI: 1,
                    },
                  }}
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
                <div className="flex items-center justify-between gap-2">
                  <h2 className="min-w-0 flex-1 font-bold text-foreground text-xl">
                    {video.title}
                  </h2>
                  {video.canEdit ? (
                    <EditVideoDialog onSuccess={() => {}} video={video}>
                      <Button size="sm" variant="outline">
                        <Settings />
                        {t("common.edit")}
                      </Button>
                    </EditVideoDialog>
                  ) : null}
                </div>
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
                <div className="mt-2 w-full">
                  <Transcription canEdit={video.canEdit} videoId={video.id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
