import {
  getVideo,
  getVideoCaptions,
  listVideoStoryboards,
} from "@celluloid/peertube-api";
import { createClient } from "@celluloid/peertube-api/client";
import type { VTTCue } from "media-captions";
import { parseResponse } from "media-captions";

export interface PeerTubeVideoInfo {
  title: string;
  description: string;
  extendedDescription: string;
  author: string | null;
  authorAvatar: string | null;
  thumbnail: string;
  videoId: string;
  baseUrl: string;
}

export interface PeerTubeCaptionInfo {
  language: string;
  fileUrl: string;
}

export interface PeerTubeSubtitle {
  text: string;
  startTime: number;
  endTime: number;
  language: string;
  raw: VTTCue;
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
export async function fetchPeerTubeVideoInfo(
  url: string
): Promise<PeerTubeVideoInfo> {
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
      throw new Error("Video not found");
    }

    const title = videoData.name || "Untitled video";
    const description = videoData.description || "";
    const extendedDescription = videoData.description || "";
    const author =
      videoData.account?.displayName ||
      videoData.account?.name ||
      videoData.channel?.displayName ||
      videoData.channel?.name ||
      null;
    const authorAvatar = resolveAuthorAvatarUrl(videoData, baseUrl);

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
      extendedDescription,
      author,
      authorAvatar,
      thumbnail,
      videoId,
      baseUrl,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch video: ${error.message}`);
    }
    throw new Error("Failed to fetch video information");
  }
}

function resolveAuthorAvatarUrl(
  videoData: Awaited<ReturnType<typeof getVideo>>["data"],
  baseUrl: string
): string | null {
  if (!videoData) {
    return null;
  }

  const accountAvatar =
    videoData.account?.avatars?.[0]?.fileUrl ??
    videoData.account?.avatars?.[0]?.path ??
    null;
  if (accountAvatar) {
    return toAbsoluteUrl(accountAvatar, baseUrl);
  }

  const channelAvatar =
    videoData.channel?.avatars?.[0]?.fileUrl ??
    videoData.channel?.avatars?.[0]?.path ??
    null;
  if (channelAvatar) {
    return toAbsoluteUrl(channelAvatar, baseUrl);
  }

  return null;
}

function toAbsoluteUrl(value: string, baseUrl: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return new URL(value, baseUrl).toString();
}

/**
 * Fetch and parse subtitles from PeerTube video
 */
export async function fetchPeerTubeCaptions(
  baseUrl: string,
  videoId: string
): Promise<PeerTubeSubtitle[]> {
  try {
    const captions = await fetchPeerTubeCaptionList(baseUrl, videoId);

    const caption = captions[0];
    const parsed = await parseResponse(fetch(caption.fileUrl));

    // Convert parsed captions to our format
    const subtitles: PeerTubeSubtitle[] = parsed.cues.map((cue) => ({
      text: cue.text || "",
      startTime: cue.startTime,
      endTime: cue.endTime,
      language: caption.language || "en",
      raw: cue,
    }));

    return subtitles;
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
): Promise<PeerTubeCaptionInfo[]> {
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
export async function fetchPeerTubeVideo(url: string): Promise<{
  title: string;
  description: string;
  thumbnail: string;
  videoId: string;
  baseUrl: string;
  captions: PeerTubeCaptionInfo[];
}> {
  const videoInfo = await fetchPeerTubeVideoInfo(url);
  const captions = await fetchPeerTubeCaptionList(
    videoInfo.baseUrl,
    videoInfo.videoId
  );

  return {
    ...videoInfo,
    captions,
  };
}

/**
 * Get thumbnail URL for a specific timestamp using storyboard
 * Returns the storyboard URL with timestamp parameter if supported,
 * or calculates the position in the sprite
 */
export async function getThumbnailAtTimestamp(
  baseUrl: string,
  videoId: string,
  timestampSeconds: number
): Promise<string | null> {
  const client = createClient({ baseUrl });
  const { data: videoData } = await listVideoStoryboards({
    client,
    path: { id: videoId },
  });

  if (!videoData) {
    return null;
  }

  const storyboard = videoData.storyboards?.[0];
  if (!storyboard) {
    return null;
  }

  // Storyboard shape can vary between PeerTube versions.
  // We support both the documented fields and the ones seen in practice.
  const anyStoryboard = storyboard as {
    fileUrl?: string;
    storyboardPath?: string;
    totalWidth?: number;
    totalHeight?: number;
    spriteWidth?: number;
    spriteHeight?: number;
    thumbnailWidth?: number;
    thumbnailHeight?: number;
    spriteColumns?: number;
    spriteDuration?: number;
  };

  const fileUrl = anyStoryboard.fileUrl ?? anyStoryboard.storyboardPath;

  const baseThumbWidth =
    anyStoryboard.thumbnailWidth ?? anyStoryboard.spriteWidth;
  const baseThumbHeight =
    anyStoryboard.thumbnailHeight ?? anyStoryboard.spriteHeight;

  const columnsExplicit = anyStoryboard.spriteColumns;
  const columnsFromTotal =
    anyStoryboard.totalWidth && anyStoryboard.spriteWidth
      ? Math.floor(anyStoryboard.totalWidth / anyStoryboard.spriteWidth)
      : undefined;

  const columns = columnsExplicit ?? columnsFromTotal ?? 0;
  const interval = anyStoryboard.spriteDuration ?? 0;

  if (
    !fileUrl ||
    typeof baseThumbWidth !== "number" ||
    typeof baseThumbHeight !== "number" ||
    columns <= 0 ||
    interval <= 0
  ) {
    return null;
  }

  const spriteIndex = Math.floor(timestampSeconds / interval);
  const row = Math.floor(spriteIndex / columns);
  const col = spriteIndex % columns;

  const posX = col * baseThumbWidth;
  const posY = row * baseThumbHeight;

  const totalW = anyStoryboard.totalWidth ?? columns * baseThumbWidth;
  const totalH = anyStoryboard.totalHeight ?? (row + 1) * baseThumbHeight;

  return `${toAbsoluteUrl(
    fileUrl,
    baseUrl
  )}#sprite=${posX},${posY},${baseThumbWidth},${baseThumbHeight},${totalW},${totalH}`;
}
