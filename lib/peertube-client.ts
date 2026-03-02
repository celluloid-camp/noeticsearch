import {
  getVideo,
  getVideoCaptions,
  getVideoChapters,
  listVideoStoryboards,
  searchVideos,
} from "@celluloid/peertube-api";
import { createClient } from "@celluloid/peertube-api/client";

import type {
  Storyboard,
  VideoCaption,
  VideoDetails,
} from "@celluloid/peertube-api/types";
import type { VTTCue } from "media-captions";
import { parseResponse } from "media-captions";

export interface PeerTubeVideoInfo {
  author: string | null;
  authorAvatar: string | null;
  baseUrl: string;
  description: string;
  extendedDescription: string;
  thumbnail: string;
  title: string;
  videoId: string;
}

export interface PeerTubeCaptionInfo {
  fileUrl: string;
  language: string;
}

export interface PeerTubeSubtitle {
  endTime: number;
  language: string;
  raw: VTTCue;
  startTime: number;
  text: string;
}

/**
 * Extract base URL and video ID from a PeerTube watch URL
 */
export function parsePeerTubeUrl(
  url: string
): { baseUrl: string; videoId: string } | null {
  try {
    const parsedUrl = new URL(url.trim());
    const segments = parsedUrl.pathname.split("/").filter(Boolean);

    // PeerTube URLs typically have format: /w/{videoId} or /videos/watch/{videoId}
    const videoId = segments.at(-1);

    if (!videoId) {
      return null;
    }

    return {
      baseUrl: parsedUrl.origin,
      videoId,
    };
  } catch {
    return null;
  }
}

/**
 * Validate and fetch video information from PeerTube using the client library
 */
export async function fetchPeerTubeVideoDetails(url: string) {
  const parsed = parsePeerTubeUrl(url);
  if (!parsed) {
    throw new Error("Invalid PeerTube URL format");
  }

  const { baseUrl, videoId } = parsed;
  const client = createClient({ baseUrl });

  try {
    const { data: videoData } = await getVideo({
      client,
      path: { id: videoId },
    });

    if (!videoData) {
      throw new Error(`Video not found url: ${url}`);
    }

    const title = videoData.name || "Untitled video";
    const description = videoData.description || "";

    // Get thumbnail from thumbnails array (PeerTube >= 8.1) or deprecated thumbnailPath
    let thumbnail = "";
    // handle deprecated thumbnailPath
    // @ts-expect-error - thumbnails is deprecated
    if (videoData?.thumbnails && videoData.thumbnails?.length > 0) {
      // @ts-expect-error - thumbnails is deprecated
      thumbnail = videoData.thumbnails[0]?.fileUrl || "";
    } else if (videoData.thumbnailPath) {
      thumbnail = new URL(videoData.thumbnailPath, baseUrl).toString();
    }

    return {
      title,
      description,
      thumbnail,
      videoId,
      baseUrl,
      videoDetails: videoData,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch video: ${error.message}`);
    }
    throw new Error("Failed to fetch video information");
  }
}

export function resolveAuthorAvatarUrl(
  videoDetails: VideoDetails
): string | null {
  const accountAvatar =
    videoDetails.account?.avatars?.[0]?.fileUrl ??
    videoDetails.account?.avatars?.[0]?.path ??
    null;
  if (accountAvatar) {
    return accountAvatar;
  }

  const channelAvatar =
    videoDetails.channel?.avatars?.[0]?.fileUrl ??
    videoDetails.channel?.avatars?.[0]?.path ??
    null;
  if (channelAvatar) {
    return channelAvatar;
  }

  return null;
}

/**
 * Fetch and parse subtitles from PeerTube video
 */
export async function parsePeerTubeVideoCaptions(caption: VideoCaption) {
  if (!caption.fileUrl) {
    throw new Error("Caption file URL is required");
  }
  try {
    const parsed = await parseResponse(fetch(caption.fileUrl));

    // Convert parsed captions to our format
    return parsed.cues.map((cue) => ({
      text: cue.text || "",
      startTime: cue.startTime,
      endTime: cue.endTime,
      language: caption.language || "en",
      cue,
    }));
  } catch (error) {
    // Silently fail for subtitles - they're optional
    console.warn("Failed to fetch subtitles:", error);
    return [];
  }
}

/**
 * Fetch caption list (metadata only, not content)
 */
export async function fetchPeerTubeCaptionList(
  baseUrl: string,
  videoId: string
) {
  const client = createClient({ baseUrl });

  try {
    const { data: captionsResponse } = await getVideoCaptions({
      client,
      path: { id: videoId },
    });

    // Handle different response structures: { data: [...] } or { total: 1, data: [...] }
    const captionsData = Array.isArray(captionsResponse)
      ? captionsResponse
      : captionsResponse?.data || [];

    if (!Array.isArray(captionsData) || captionsData.length === 0) {
      return [];
    }

    // Return only caption metadata (language and URL)
    return captionsData.map((caption) => {
      // Handle language as object { id: "fr", label: "French" } or string
      const language =
        typeof caption.language === "string"
          ? caption.language
          : caption.language?.id || "en";

      return {
        language,
        captionData: caption,
        fileUrl: caption.fileUrl || "",
      };
    });
  } catch (error) {
    // Silently fail for captions - they're optional
    console.warn("Failed to fetch caption list:", error);
    return [];
  }
}

/**
 * Fetch complete video information including caption list (metadata only)
 */
export async function fetchPeerTubeVideo(url: string) {
  const videoInfo = await fetchPeerTubeVideoDetails(url);
  const captions = await fetchPeerTubeCaptionList(
    videoInfo.baseUrl,
    videoInfo.videoId
  );
  const storyboard = await fetchStoryboard(
    videoInfo.baseUrl,
    videoInfo.videoId
  );
  const chapters = await fetchChapters(videoInfo.baseUrl, videoInfo.videoId);

  return {
    ...videoInfo,
    captions,
    storyboard,
    chapters,
  };
}

/**
 * Fetch storyboard metadata for a video. Call once per video,
 * then use `computeSpriteUrl` for each timestamp.
 */
export async function fetchStoryboard(
  baseUrl: string,
  videoId: string
): Promise<Storyboard | null> {
  const client = createClient({ baseUrl });
  const { data: storyboardData } = await listVideoStoryboards({
    client,
    path: { id: videoId },
  });

  const storyboard = storyboardData?.storyboards?.[0];
  if (!storyboard) {
    return null;
  }

  return storyboard;
}

export async function fetchChapters(baseUrl: string, videoId: string) {
  const client = createClient({ baseUrl });
  const { data: chaptersData } = await getVideoChapters({
    client,
    path: { id: videoId },
  });

  if (!chaptersData?.chapters) {
    return [];
  }
  return (
    chaptersData.chapters as {
      title?: string;
      timecode?: number;
    }[]
  ).map((chapter) => ({
    title: chapter.title || "",
    timecode: chapter.timecode || 0,
  }));
}

/**
 * Compute a sprite URL with `#sprite=` fragment for a given timestamp.
 * Pure function, no network calls.
 */
export function computeSpriteUrl(
  storyboard: Storyboard,
  timestampSeconds: number
): string | null {
  const fileUrl = storyboard.fileUrl ?? storyboard.storyboardPath;
  const tileW = storyboard.spriteWidth;
  const tileH = storyboard.spriteHeight;
  const interval = storyboard.spriteDuration;

  if (!(fileUrl && tileW && tileH && interval) || interval <= 0) {
    return null;
  }

  const columns =
    storyboard.totalWidth && tileW
      ? Math.floor(storyboard.totalWidth / tileW)
      : 0;
  if (columns <= 0) {
    return null;
  }

  const totalW = storyboard.totalWidth ?? columns * tileW;
  const spriteIndex = Math.floor(timestampSeconds / interval);
  const row = Math.floor(spriteIndex / columns);
  const col = spriteIndex % columns;
  const totalH = storyboard.totalHeight ?? (row + 1) * tileH;

  const posX = col * tileW;
  const posY = row * tileH;

  return `${fileUrl}#sprite=${posX},${posY},${tileW},${tileH},${totalW},${totalH}`;
}

/**
 * Convenience wrapper: fetch storyboard + compute sprite URL in one call.
 */
export async function getThumbnailAtTimestamp(
  baseUrl: string,
  videoId: string,
  timestampSeconds: number
): Promise<string | null> {
  const data = await fetchStoryboard(baseUrl, videoId);
  if (!data) {
    return null;
  }
  return computeSpriteUrl(data, timestampSeconds);
}

export interface PeerTubeSearchVideosParams {
  /** Page size (1–100). Default 15. */
  count?: number;
  /** Include NSFW results. Default true. */
  nsfw?: boolean;
  /** Search query (required). */
  search: string;
  /** Sort: -match (relevance), -publishedAt, -createdAt, etc. */
  sort?: string;
  /** Pagination offset. Default 0. */
  start?: number;
}

const DEFAULT_COUNT = 15;
const DEFAULT_SORT = "-match";

/**
 * Search videos on a PeerTube instance using the official API client.
 * Call from server to avoid CORS.
 */
export async function searchPeerTubeVideos(
  baseUrl: string,
  params: PeerTubeSearchVideosParams
) {
  const {
    search,
    start = 0,
    count = DEFAULT_COUNT,
    sort = DEFAULT_SORT,
    // nsfw = true,
  } = params;

  const client = createClient({ baseUrl: baseUrl.replace(/\/$/, "") });

  const { data, error } = await searchVideos({
    client,
    query: {
      search: search.trim(),
      start,
      count: Math.min(100, Math.max(1, count)),
      sort: sort as Parameters<typeof searchVideos>[0]["query"]["sort"],
      // nsfw: nsfw ? "true" : "false",
    },
  });

  if (error) {
    throw new Error(`PeerTube search failed: ${String(error)}`);
  }
  if (typeof data?.total !== "number" || !Array.isArray(data?.data)) {
    throw new Error("Invalid PeerTube search response");
  }
  return {
    total: data.total ?? 0,
    data: data.data ?? [],
  };
}

/** Build watch URL for a video on the given instance. */
export function peerTubeWatchUrl(baseUrl: string, shortUUID: string): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/w/${shortUUID}`;
}
