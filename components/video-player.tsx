"use client";

import ReactPlayer from "@celluloid/react-player";
import { Settings } from "lucide-react";
import { useMediaRef, useMediaSelector } from "media-chrome/react/media-store";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { VideoById } from "@/lib/trpc/client";
import { EditVideoDialog } from "./edit-video-dialog";
import { Transcription } from "./transcription-status";

interface VideoPlayerProps {
  video: VideoById;
}

// PeerTube embed-api player surface we rely on. The element's `api` property
// is set asynchronously once the iframe has loaded the embed SDK.
type PeerTubeEmbedApi = {
  ready: Promise<void>;
  setVideoPassword?: (password: string) => Promise<void>;
};

type PeerTubePlayerElement = HTMLElement & {
  api: PeerTubeEmbedApi | null;
};

/**
 * Append the user's PeerTube access token to the embed URL so the instance
 * authorizes playback of private/internal videos. PeerTube reads the token
 * from the URL fragment when present.
 */
function buildPlayableUrl(url: string, accessToken: string | null): string {
  if (!accessToken) {
    return url;
  }
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("accessToken", accessToken);
    return parsed.toString();
  } catch {
    return url;
  }
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const mediaRefCallback = useMediaRef();
  const mediaPaused = useMediaSelector((state) => state.mediaPaused);
  const t = useTranslations();
  const playerElementRef = useRef<PeerTubePlayerElement | null>(null);
  // Capture once on mount — toggling autoplay later reloads the PeerTube iframe.

  const playableUrl = useMemo(
    () => buildPlayableUrl(video.url, video.accessToken),
    [video.url, video.accessToken]
  );

  const peertubeConfig = useMemo(
    () =>
      video.isPasswordProtected && video.videoPassword
        ? { waitPasswordFromEmbedAPI: 1 as const, warningTitle: 0 as const }
        : undefined,
    [video.isPasswordProtected, video.videoPassword]
  );

  const setPlayerRef = useCallback(
    (element: HTMLMediaElement | null) => {
      playerElementRef.current =
        element as unknown as PeerTubePlayerElement | null;
      mediaRefCallback(element);
    },
    [mediaRefCallback]
  );

  // When the video is password-protected we must inject the password through
  // the embed API as soon as it becomes available (the element awaits
  // `api.ready`, which only resolves after `setVideoPassword` is called).
  useEffect(() => {
    if (!(video.isPasswordProtected && video.videoPassword)) {
      return;
    }
    const element = playerElementRef.current;
    if (!element) {
      return;
    }

    let cancelled = false;
    const password = video.videoPassword;

    const trySetPassword = () => {
      const api = element.api;
      if (!api?.setVideoPassword) {
        return false;
      }

      // The embed API resolves once the password is accepted; ignore failures
      // since PeerTube will surface them in the iframe UI.
      api.setVideoPassword(password).catch(() => undefined);
      return true;
    };

    if (trySetPassword()) {
      return;
    }

    const interval = window.setInterval(() => {
      if (cancelled || trySetPassword()) {
        window.clearInterval(interval);
      }
    }, 100);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [video.isPasswordProtected, video.videoPassword, playableUrl]);

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
                  autoPlay={true}
                  config={
                    peertubeConfig
                      ? { peertube: peertubeConfig }
                      : { peertube: { warningTitle: 0 } }
                  }
                  controls={true}
                  height="100%"
                  playing={mediaPaused === false}
                  ref={setPlayerRef}
                  slot="media"
                  src={playableUrl}
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
