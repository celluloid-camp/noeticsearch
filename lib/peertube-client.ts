import { getVideo, getVideoCaptions } from "@celluloid/peertube-api";
import { createClient } from "@celluloid/peertube-api/client";
import type { VTTCue } from "media-captions";
import { parseResponse } from "media-captions";

export interface PeerTubeVideoInfo {
	title: string;
	description: string;
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
	url: string,
): { baseUrl: string; videoId: string } | null {
	try {
		const parsedUrl = new URL(url.trim());
		const segments = parsedUrl.pathname.split("/").filter(Boolean);

		// PeerTube URLs typically have format: /w/{videoId} or /videos/watch/{videoId}
		const videoId = segments[segments.length - 1];

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
	url: string,
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
		};
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to fetch video: ${error.message}`);
		}
		throw new Error("Failed to fetch video information");
	}
}

/**
 * Fetch and parse subtitles from PeerTube video
 */
export async function fetchPeerTubeSubtitles(
	baseUrl: string,
	videoId: string,
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
	videoId: string,
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
		videoInfo.videoId,
	);

	return {
		...videoInfo,
		captions,
	};
}
