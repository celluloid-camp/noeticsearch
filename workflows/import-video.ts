import type { Storyboard } from "@celluloid/peertube-api/types";
import { eq } from "drizzle-orm";
import { start } from "workflow/api";
import {
  captionsTable,
  chaptersTable,
  transcriptionsTable,
  videoTable,
} from "@/db/schema";
import { db } from "@/lib/db";
import {
  computeSpriteUrl,
  fetchPeerTubeVideo,
  parsePeerTubeVideoCaptions,
} from "@/lib/peertube-client";
import { naturalizeCaptions } from "./naturalize-captions";

type ImportVideoWorkflowInput = {
  password?: string;
  url: string;
  videoId: string;
};

type ParsedCaption = {
  endTime: number;
  language: string;
  raw: { endTime: number; startTime: number; text: string };
  startTime: number;
  text: string;
};

export async function importVideo(input: ImportVideoWorkflowInput) {
  "use workflow";

  await updateImportStatus(input.videoId, "processing");

  try {
    const videoInfo = await fetchVideoInfo(input.url, input.password);
    await updateVideoMetadata(input.videoId, videoInfo);

    const preferredCaption =
      videoInfo.captions.find((caption) => {
        const language = caption.language.toLowerCase();
        return language === "fr" || language.startsWith("fr-");
      })?.captionData ?? videoInfo.captions[0]?.captionData;

    if (!preferredCaption) {
      throw new Error("No captions available for this video");
    }

    const parsedCaptions = await parseCaptions(input.url, preferredCaption);

    if (parsedCaptions.length > 0) {
      await insertCaptions(
        input.videoId,
        parsedCaptions,
        videoInfo.storyboard,
        videoInfo.thumbnail || null
      );
    }

    if (videoInfo.chapters.length > 0) {
      await insertChapters(
        input.videoId,
        videoInfo.chapters,
        videoInfo.captions[0]?.language ?? "fr"
      );
    }

    await ensureTranscription(
      input.videoId,
      parsedCaptions[0]?.language ?? "fr"
    );

    await queueNaturalizeWorkflow(input.videoId);

    await updateImportStatus(input.videoId, "completed");

    return { status: "completed" as const, videoId: input.videoId };
  } catch (error) {
    await updateImportStatus(input.videoId, "failed");
    throw error;
  }
}

async function fetchVideoInfo(url: string, password?: string) {
  "use step";
  return fetchPeerTubeVideo(url, { password });
}

async function updateImportStatus(
  videoId: string,
  status: "processing" | "completed" | "failed"
) {
  "use step";

  await db
    .update(videoTable)
    .set({
      importStatus: status,
    })
    .where(eq(videoTable.id, videoId));
}

async function parseCaptions(
  url: string,
  caption: Parameters<typeof parsePeerTubeVideoCaptions>[1]
) {
  "use step";
  const parsed = await parsePeerTubeVideoCaptions(url, caption);

  // Workflow steps must return serializable values only.
  return parsed.map(
    (item): ParsedCaption => ({
      endTime: item.endTime,
      language: item.language,
      raw: {
        endTime: item.endTime,
        startTime: item.startTime,
        text: item.text,
      },
      startTime: item.startTime,
      text: item.text,
    })
  );
}

async function updateVideoMetadata(
  videoId: string,
  videoInfo: Awaited<ReturnType<typeof fetchPeerTubeVideo>>
) {
  "use step";

  const externalId =
    videoInfo.videoDetails.shortUUID ||
    videoInfo.videoDetails.uuid ||
    videoInfo.videoId;

  await db
    .update(videoTable)
    .set({
      baseUrl: videoInfo.baseUrl,
      captionList: videoInfo.captions,
      description: videoInfo.description,
      externalId,
      publishedAt: videoInfo.videoDetails.publishedAt ?? new Date(),
      storyboard: videoInfo.storyboard,
      thumbnail: videoInfo.thumbnail || null,
      title: videoInfo.title,
      videoDetails: videoInfo.videoDetails,
    })
    .where(eq(videoTable.id, videoId));
}

async function insertCaptions(
  videoId: string,
  parsedCaptions: ParsedCaption[],
  storyboard: Storyboard | null,
  thumbnail: string | null
) {
  "use step";

  await db.insert(captionsTable).values(
    parsedCaptions.map((caption) => ({
      endTime: caption.endTime,
      language: caption.language,
      raw: caption.raw,
      startTime: caption.startTime,
      text: caption.text,
      thumbnail: storyboard
        ? computeSpriteUrl(storyboard, caption.startTime)
        : thumbnail,
      videoId,
    }))
  );
}

async function insertChapters(
  videoId: string,
  chapters: Array<{ timecode: number; title: string }>,
  language: string
) {
  "use step";

  await db.insert(chaptersTable).values(
    chapters.map((chapter) => ({
      language,
      timecode: chapter.timecode,
      title: chapter.title,
      videoId,
    }))
  );
}

async function ensureTranscription(videoId: string, language: string) {
  "use step";

  await db.insert(transcriptionsTable).values({
    language,
    status: "pending",
    videoId,
  });
}

async function queueNaturalizeWorkflow(videoId: string) {
  "use step";

  start(naturalizeCaptions, [videoId]).catch((err) =>
    console.error("Failed to start naturalize workflow:", err)
  );
}
