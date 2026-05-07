import {
  getApiV1UsersMeVideos,
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
 * Build a PeerTube watch URL from base URL and video ID
 */
export function buildPeerTubeWatchUrl(
  baseUrl: string,
  videoId: string
): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/w/${videoId}`;
}

/**
 * Validate and fetch video information from PeerTube using the client library.
 *
 * Pass `accessToken` to fetch private/internal videos owned by the authenticated
 * user. Pass `password` for password-protected videos.
 */
export async function fetchPeerTubeVideoDetails(
  url: string,
  options?: { password?: string; accessToken?: string }
) {
  const parsed = parsePeerTubeUrl(url);
  if (!parsed) {
    throw new Error("Invalid PeerTube URL format");
  }

  const { baseUrl, videoId } = parsed;
  const client = createClient({
    baseUrl,
    ...(options?.accessToken
      ? { headers: { Authorization: `Bearer ${options.accessToken}` } }
      : {}),
  });

  try {
    const headers =
      options?.password != null
        ? { "x-peertube-video-password": options.password }
        : undefined;

    const { data: videoData, error: apiError } = await getVideo({
      client,
      path: { id: videoId },
      ...(headers ? { headers } : {}),
    });

    if (apiError) {
      // Handle password-protected videos explicitly so the UI can prompt
      if ((apiError as { code?: string }).code === "video_requires_password") {
        const err = new Error("video_requires_password");
        (err as { code?: string }).code = apiError.code;
        throw err;
      }

      throw new Error(
        (apiError as { message?: string }).message ||
          "Failed to fetch video information"
      );
    }

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
    // Preserve explicit password-required errors so callers can detect them
    if (
      error instanceof Error &&
      (error as { code?: string }).code === "video_requires_password"
    ) {
      throw error;
    }
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
 * Resolve caption URL from fileUrl or captionPath (relative to baseUrl).
 */
function resolveCaptionUrl(
  caption: VideoCaption & { captionPath?: string },
  baseUrl: string
): string {
  if (caption.fileUrl) {
    return caption.fileUrl;
  }
  if (caption.captionPath) {
    return new URL(caption.captionPath, baseUrl).toString();
  }
  throw new Error("Caption fileUrl or captionPath is required");
}

/**
 * Fetch and parse subtitles from PeerTube video.
 *
 * Pass `accessToken` so private/internal video caption files (which are
 * gated behind auth) can be downloaded.
 */
export async function parsePeerTubeVideoCaptions(
  url: string,
  caption: VideoCaption & { captionPath?: string },
  accessToken?: string
) {
  const baseUrl = parsePeerTubeUrl(url)?.baseUrl ?? "";
  const captionUrl = resolveCaptionUrl(caption, baseUrl);
  try {
    const parsed = await parseResponse(
      fetch(
        captionUrl,
        accessToken
          ? { headers: { Authorization: `Bearer ${accessToken}` } }
          : undefined
      )
    );

    // Convert parsed captions to our format
    return parsed.cues.map((cue) => ({
      text: cue.text || "",
      startTime: cue.startTime,
      endTime: cue.endTime,
      language:
        typeof caption.language === "string"
          ? caption.language
          : caption.language?.id || "en",
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
  videoId: string,
  options?: { password?: string; accessToken?: string }
) {
  const client = createClient({
    baseUrl,
    ...(options?.accessToken
      ? { headers: { Authorization: `Bearer ${options.accessToken}` } }
      : {}),
  });

  try {
    const headers =
      options?.password != null
        ? { "x-peertube-video-password": options.password }
        : undefined;
    const { data: captionsResponse } = await getVideoCaptions({
      client,
      path: { id: videoId },
      ...(headers ? { headers } : {}),
    });

    // Handle different response structures: { data: [...] } or { total: 1, data: [...] }
    const captionsData = Array.isArray(captionsResponse)
      ? captionsResponse
      : captionsResponse?.data || [];

    if (!Array.isArray(captionsData) || captionsData.length === 0) {
      return [];
    }

    // Return only caption metadata (language and URL)
    const base = baseUrl.replace(/\/$/, "");
    return captionsData.map((caption) => {
      // Handle language as object { id: "fr", label: "French" } or string
      const language =
        typeof caption.language === "string"
          ? caption.language
          : caption.language?.id || "en";
      const raw = caption as { fileUrl?: string; captionPath?: string };
      const fileUrl =
        raw.fileUrl ||
        (raw.captionPath ? new URL(raw.captionPath, base).toString() : "");

      return {
        language,
        captionData: caption,
        fileUrl,
      };
    });
  } catch (error) {
    // Silently fail for captions - they're optional
    console.warn("Failed to fetch caption list:", error);
    return [];
  }
}

/**
 * Fetch complete video information including caption list (metadata only).
 *
 * Pass `accessToken` to fetch private/internal videos owned by the
 * authenticated user.
 */
export async function fetchPeerTubeVideo(
  url: string,
  options?: { password?: string; accessToken?: string }
) {
  const videoInfo = await fetchPeerTubeVideoDetails(url, options);
  const captions = await fetchPeerTubeCaptionList(
    videoInfo.baseUrl,
    videoInfo.videoId,
    options
  );
  const storyboard = await fetchStoryboard(
    videoInfo.baseUrl,
    videoInfo.videoId,
    options?.accessToken
  );
  const chapters = await fetchChapters(
    videoInfo.baseUrl,
    videoInfo.videoId,
    options?.accessToken
  );

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
  videoId: string,
  accessToken?: string
): Promise<Storyboard | null> {
  const client = createClient({
    baseUrl,
    ...(accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : {}),
  });
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

export async function fetchChapters(
  baseUrl: string,
  videoId: string,
  accessToken?: string
) {
  const client = createClient({
    baseUrl,
    ...(accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : {}),
  });
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
 * Optionally pass an access token for authenticated searches.
 */
export async function searchPeerTubeVideos(
  baseUrl: string,
  params: PeerTubeSearchVideosParams,
  accessToken?: string
) {
  const {
    search,
    start = 0,
    count = DEFAULT_COUNT,
    sort = DEFAULT_SORT,
    // nsfw = true,
  } = params;

  const client = createClient({
    baseUrl: baseUrl.replace(/\/$/, ""),
    ...(accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : {}),
  });

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

export interface PeerTubeSearchPrivateVideosParams {
  /** Page size (1–100). Default 15. */
  count?: number;
  /** Plain text search applied to the user's own videos. Optional. */
  search?: string;
  /** Sort key. Default -publishedAt. */
  sort?: NonNullable<
    NonNullable<Parameters<typeof getApiV1UsersMeVideos>[0]>["query"]
  >["sort"];
  /** Pagination offset. Default 0. */
  start?: number;
}

const DEFAULT_PRIVATE_SORT: PeerTubeSearchPrivateVideosParams["sort"] =
  "-publishedAt";

/**
 * List the authenticated user's own videos (including private/unlisted)
 * on a PeerTube instance using `GET /api/v1/users/me/videos`.
 *
 * Unlike `searchPeerTubeVideos`, an `accessToken` is required because this
 * endpoint always operates on the currently authenticated user.
 */
export async function searchPeerTubePrivateVideos(
  baseUrl: string,
  params: PeerTubeSearchPrivateVideosParams,
  accessToken: string
) {
  const {
    search,
    start = 0,
    count = DEFAULT_COUNT,
    sort = DEFAULT_PRIVATE_SORT,
  } = params;

  if (!accessToken) {
    throw new Error(
      "An access token is required to list a user's private videos"
    );
  }

  const client = createClient({
    baseUrl: baseUrl.replace(/\/$/, ""),
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const trimmedSearch = search?.trim();

  const { data, error } = await getApiV1UsersMeVideos({
    client,
    query: {
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
      start,
      count: Math.min(100, Math.max(1, count)),
      sort,
    },
  });

  if (error) {
    throw new Error(`PeerTube private search failed: ${String(error)}`);
  }
  if (typeof data?.total !== "number" || !Array.isArray(data?.data)) {
    throw new Error("Invalid PeerTube private search response");
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
