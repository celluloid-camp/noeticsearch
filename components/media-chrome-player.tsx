"use client";

import {
  MediaCaptionsButton,
  MediaControlBar,
  MediaController,
  MediaFullscreenButton,
  MediaMuteButton,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaTimeDisplay,
  MediaTimeRange,
  MediaVolumeRange,
} from "media-chrome/react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import ReactPlayer from "react-player";
import type { Subtitle } from "@/lib/types";

// PeerTube URL pattern matcher
const MATCH_URL = /(https?):\/\/(.*)(\/videos\/watch\/|\/w\/)(.*)/;

interface MediaChromePlayerProps {
  url: string;
  playing?: boolean;
  controls?: boolean;
  subtitles?: Subtitle[];
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onProgress?: (state: { playedSeconds: number }) => void;
  onSeek?: (seconds: number) => void;
}

export interface MediaChromePlayerRef {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

const MediaChromePlayer = forwardRef<
  MediaChromePlayerRef,
  MediaChromePlayerProps
>(function MediaChromePlayer(
  {
    url,
    playing = false,
    controls = true,
    subtitles = [],
    onReady,
    onPlay,
    onPause,
    onProgress,
    onSeek,
  },
  ref
) {
  const playerRef = useRef<ReactPlayer>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [vttUrl, setVttUrl] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const onReadyRef = useRef(onReady);
  const onSeekRef = useRef(onSeek);

  // Keep refs in sync with props
  useEffect(() => {
    onReadyRef.current = onReady;
    onSeekRef.current = onSeek;
  }, [onReady, onSeek]);

  // Fetch video source from PeerTube API
  useEffect(() => {
    const fetchVideoSource = async () => {
      const match = MATCH_URL.exec(url);
      if (!match) {
        // If not a PeerTube URL, use the URL directly
        setVideoSrc(url);
        return;
      }

      const [, protocol, domain, , videoId] = match;
      if (!videoId) {
        console.error("Invalid PeerTube URL");
        return;
      }

      const apiUrl = `${protocol}://${domain}/api/v1/videos/${videoId}`;

      try {
        console.log("🔍 Fetching video source from:", apiUrl);
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch video metadata: ${response.status} ${response.statusText}`
          );
        }
        const data = await response.json();
        console.log("📦 Video metadata received:", {
          hasFiles: !!data.files,
          filesCount: data.files?.length || 0,
          hasStreamingPlaylists: !!data.streamingPlaylists,
          playlistsCount: data.streamingPlaylists?.length || 0,
        });

        // Prefer direct file URLs over HLS playlists
        // Get the best quality video source
        let selectedSource: string | null = null;

        if (data.files && data.files.length > 0) {
          // Sort by resolution/quality and get the best one
          const bestFile = data.files.sort(
            (
              a: { resolution?: { height?: number } },
              b: { resolution?: { height?: number } }
            ) => {
              const aRes = a.resolution?.height || 0;
              const bRes = b.resolution?.height || 0;
              return bRes - aRes;
            }
          )[0];

          console.log("📹 Best file selected:", {
            fileUrl: bestFile.fileUrl,
            fileDownloadUrl: bestFile.fileDownloadUrl,
            resolution: bestFile.resolution,
          });

          if (bestFile.fileUrl) {
            selectedSource = bestFile.fileUrl;
            console.log("✅ Using fileUrl:", selectedSource);
          } else if (bestFile.fileDownloadUrl) {
            selectedSource = bestFile.fileDownloadUrl;
            console.log("✅ Using fileDownloadUrl:", selectedSource);
          }
        }

        // Fallback to HLS playlist if no direct file available
        // react-player can handle HLS natively in supported browsers
        if (
          !selectedSource &&
          data.streamingPlaylists &&
          data.streamingPlaylists.length > 0
        ) {
          const playlist = data.streamingPlaylists[0];
          if (playlist.playlistUrl) {
            selectedSource = playlist.playlistUrl;
            console.log("✅ Using HLS playlist (fallback):", selectedSource);
            console.log(
              "ℹ️ Using react-player which supports HLS natively in supported browsers"
            );
          }
        }

        if (selectedSource) {
          setVideoSrc(selectedSource);
        } else {
          console.error("❌ No valid video source found");
          setVideoSrc(null);
        }
      } catch (error) {
        console.error("❌ Error fetching video source:", error);
        setVideoSrc(null);
      }
    };

    fetchVideoSource();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Get video element from react-player and connect to media-chrome
  useEffect(() => {
    if (!(playerRef.current && videoSrc && containerRef.current)) {
      return;
    }

    const findAndConnectVideo = () => {
      try {
        // Get the internal player (video element) from react-player
        const internalPlayer = playerRef.current?.getInternalPlayer?.();

        if (internalPlayer instanceof HTMLVideoElement) {
          videoRef.current = internalPlayer;

          // Set up the video element for media-chrome
          internalPlayer.setAttribute("slot", "media");
          internalPlayer.setAttribute("data-react-player", "true");
          internalPlayer.style.width = "100%";
          internalPlayer.style.height = "100%";

          // Find the MediaController and add the video to it
          const mediaController =
            containerRef.current?.querySelector("media-controller");
          if (mediaController && !mediaController.contains(internalPlayer)) {
            // Remove any existing video element
            const existingVideo = mediaController.querySelector(
              'video[slot="media"]'
            );
            if (existingVideo && existingVideo !== internalPlayer) {
              existingVideo.remove();
            }
            // Add react-player's video to media-chrome
            mediaController.appendChild(internalPlayer);
            // Update videoRef to point to the connected video
            videoRef.current = internalPlayer;
          }

          console.log("✅ Connected react-player video to media-chrome");
          return true;
        }
      } catch (error) {
        console.error("Error connecting video:", error);
      }
      return false;
    };

    // Try to find and connect video element with retries
    let attempts = 0;
    const maxAttempts = 50;
    const interval = setInterval(() => {
      attempts++;
      if (findAndConnectVideo() || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [videoSrc]);

  // Handle video ready state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isReady) {
      return;
    }

    const handleReady = () => {
      const currentVideo = videoRef.current;
      if (currentVideo && currentVideo.duration > 0) {
        console.log("📹 Video ready, duration:", currentVideo.duration);
        setIsReady(true);
        durationRef.current = currentVideo.duration;
        onReadyRef.current?.();
      }
    };

    const handleLoadedMetadata = () => {
      handleReady();
    };

    const handleLoadedData = () => {
      handleReady();
    };

    const handleCanPlay = () => {
      handleReady();
    };

    // Check if already ready
    if (video.duration > 0) {
      handleReady();
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("canplay", handleCanPlay);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [isReady]);

  // Handle time updates
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const handleTimeUpdate = () => {
      const currentVideo = videoRef.current;
      if (currentVideo) {
        currentTimeRef.current = currentVideo.currentTime;
        onProgress?.({ playedSeconds: currentVideo.currentTime });
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [onProgress]);

  // Handle play/pause events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const handlePlay = () => {
      onPlay?.();
    };

    const handlePause = () => {
      onPause?.();
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [onPlay, onPause]);

  // Handle play/pause prop changes
  useEffect(() => {
    const video = videoRef.current;
    if (!(video && isReady)) {
      return;
    }

    if (playing) {
      video.play().catch((error) => {
        console.error("Error playing video:", error);
      });
    } else {
      video.pause();
    }
  }, [playing, isReady]);

  // Expose methods via ref
  useImperativeHandle(
    ref,
    () => ({
      seekTo: (seconds: number) => {
        const video = videoRef.current;
        const player = playerRef.current;

        console.log(
          "🎯 MediaChromePlayer.seekTo called:",
          seconds,
          "isReady:",
          isReady,
          "video:",
          !!video,
          "player:",
          !!player
        );

        if (player) {
          // Use react-player's seekTo method
          player.seekTo(seconds, "seconds");
          currentTimeRef.current = seconds;
          onSeekRef.current?.(seconds);
        } else if (video) {
          // Fallback to direct video seek
          video.currentTime = seconds;
          currentTimeRef.current = seconds;
          onSeekRef.current?.(seconds);
        }
      },
      getCurrentTime: () => {
        const video = videoRef.current;
        const player = playerRef.current;

        if (player) {
          return player.getCurrentTime() || currentTimeRef.current;
        }
        if (video) {
          currentTimeRef.current = video.currentTime;
          return video.currentTime;
        }
        return currentTimeRef.current;
      },
      getDuration: () => {
        const video = videoRef.current;
        const player = playerRef.current;

        if (player) {
          return player.getDuration() || durationRef.current;
        }
        if (video) {
          durationRef.current = video.duration;
          return video.duration;
        }
        return durationRef.current;
      },
    }),
    [isReady]
  );

  // Convert subtitles to WebVTT format
  useEffect(() => {
    if (subtitles.length === 0) {
      setVttUrl(null);
      return;
    }

    // Convert subtitles array to WebVTT format
    const formatTime = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const milliseconds = Math.floor((seconds % 1) * 1000);
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
    };

    let vttContent = "WEBVTT\n\n";
    subtitles.forEach((subtitle) => {
      const startTime = formatTime(subtitle.startTime);
      const endTime = formatTime(subtitle.endTime);
      vttContent += `${startTime} --> ${endTime}\n${subtitle.text}\n\n`;
    });

    // Create blob URL for WebVTT
    const blob = new Blob([vttContent], { type: "text/vtt" });
    const url = URL.createObjectURL(blob);
    setVttUrl(url);

    // Cleanup blob URL on unmount
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [subtitles]);

  // Enable captions by default when track is loaded
  useEffect(() => {
    if (!(vttUrl && isReady)) {
      return;
    }

    // Function to get the actual react-player video element
    const getReactPlayerVideo = (): HTMLVideoElement | null => {
      // First try to get from react-player directly
      const internalPlayer = playerRef.current?.getInternalPlayer?.();
      if (internalPlayer instanceof HTMLVideoElement) {
        // Make sure it's the one connected to media-chrome
        const mediaController =
          containerRef.current?.querySelector("media-controller");
        if (mediaController?.contains(internalPlayer)) {
          return internalPlayer;
        }
      }

      // Fallback: find video element with data-react-player attribute
      const mediaController =
        containerRef.current?.querySelector("media-controller");
      if (mediaController) {
        const video = mediaController.querySelector(
          'video[data-react-player="true"]'
        ) as HTMLVideoElement;
        if (video) {
          return video;
        }
        // Or find any video with slot="media"
        const videos = mediaController.querySelectorAll('video[slot="media"]');
        for (const vid of videos) {
          if (vid instanceof HTMLVideoElement) {
            return vid;
          }
        }
      }

      return null;
    };

    // Enable text tracks when they're loaded
    const enableTracks = () => {
      const video = getReactPlayerVideo();
      if (!video) {
        return false;
      }

      console.log(
        "📝 Enabling captions. textTracks.length:",
        video.textTracks.length
      );

      // Wait for text tracks to be available
      if (video.textTracks.length > 0) {
        const firstTrack = video.textTracks[0];
        if (firstTrack) {
          console.log(
            "📝 Setting track mode to showing:",
            firstTrack.label,
            "current mode:",
            firstTrack.mode
          );
          firstTrack.mode = "showing";
          console.log("✅ Track mode set to:", firstTrack.mode);
          return true;
        }
      }
      return false;
    };

    // Try to enable tracks multiple times to ensure they're registered
    // The track should already be added as a child of ReactPlayer
    const enableAttempts = [100, 300, 500, 1000, 2000];
    enableAttempts.forEach((delay) => {
      setTimeout(() => {
        enableTracks();
      }, delay);
    });
  }, [vttUrl, isReady]);

  if (!videoSrc) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-white">
        <div className="text-center">
          <p>Loading video source...</p>
          <p className="mt-2 text-gray-400 text-xs">URL: {url}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-visible bg-black"
      ref={containerRef}
    >
      <MediaController
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "visible",
        }}
      >
        {/* React Player - we'll extract its video element for media-chrome */}
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            opacity: 0,
            pointerEvents: "none",
            zIndex: -1,
          }}
        >
          <ReactPlayer
            config={{
              attributes: {
                crossOrigin: "anonymous",
                preload: "auto",
                playsInline: true,
              },
            }}
            controls={false}
            height="100%"
            onDuration={(duration) => {
              durationRef.current = duration;
              if (duration > 0 && !isReady) {
                setIsReady(true);
                onReadyRef.current?.();
              }
            }}
            onPause={() => {
              onPause?.();
            }}
            onPlay={() => {
              onPlay?.();
            }}
            onProgress={(state) => {
              currentTimeRef.current = state.playedSeconds;
              onProgress?.(state);
            }}
            onReady={() => {
              console.log("📹 React-player ready");
              // Video element should be available now
              setTimeout(() => {
                const internalPlayer = playerRef.current?.getInternalPlayer?.();
                if (internalPlayer instanceof HTMLVideoElement) {
                  videoRef.current = internalPlayer;
                  // Connect to media-chrome
                  internalPlayer.setAttribute("slot", "media");
                  const mediaController =
                    containerRef.current?.querySelector("media-controller");
                  if (mediaController) {
                    // Remove placeholder video if exists
                    const placeholder = mediaController.querySelector(
                      'video[slot="media"]:not([data-react-player])'
                    );
                    if (placeholder) {
                      placeholder.remove();
                    }
                    // Add react-player's video
                    if (!mediaController.contains(internalPlayer)) {
                      mediaController.appendChild(internalPlayer);
                    }
                    internalPlayer.setAttribute("data-react-player", "true");
                  }
                }
              }, 100);
            }}
            playing={playing}
            ref={playerRef}
            url={videoSrc}
            width="100%"
          >
            {/* Add track as child of ReactPlayer - this is the proper way */}
            {vttUrl && (
              <track
                default
                kind="captions"
                label="English"
                src={vttUrl}
                srcLang="en"
              />
            )}
          </ReactPlayer>
        </div>

        {/* Placeholder video for media-chrome - will be replaced by react-player's video */}
        <video
          aria-label="Video player"
          autoPlay={false}
          className="h-full w-full"
          crossOrigin="anonymous"
          muted={false}
          playsInline
          preload="auto"
          slot="media"
          src={videoSrc}
        >
          {/* Also add track to placeholder in case it's used */}
          {vttUrl && (
            <track
              default
              kind="captions"
              label="English"
              src={vttUrl}
              srcLang="en"
            />
          )}
        </video>

        {controls && (
          <MediaControlBar>
            <MediaPlayButton />
            <MediaSeekBackwardButton seekOffset={10} />
            <MediaSeekForwardButton seekOffset={10} />
            <MediaTimeRange />
            <MediaTimeDisplay showDuration />
            <MediaMuteButton />
            <MediaVolumeRange />
            <MediaCaptionsButton />
            <MediaFullscreenButton />
          </MediaControlBar>
        )}
      </MediaController>
    </div>
  );
});

// Static method for react-player compatibility
const MediaChromePlayerWithCanPlay =
  MediaChromePlayer as typeof MediaChromePlayer & {
    canPlay: (url: string) => boolean;
  };

MediaChromePlayerWithCanPlay.canPlay = (url: string) => {
  return MATCH_URL.test(url) || url.startsWith("http") || url.startsWith("/");
};

export default MediaChromePlayerWithCanPlay;
