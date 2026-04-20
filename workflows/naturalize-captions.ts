import { mistral } from "@ai-sdk/mistral";
import { generateText } from "ai";
import { and, asc, eq } from "drizzle-orm";
import { sleep } from "workflow";
import { captionsTable, transcriptionsTable } from "@/db/schema";
import { db } from "@/lib/db";

const BATCH_SIZE = 50;

export async function naturalizeCaptions(videoId: string) {
  "use workflow";

  await updateTranscriptionStatus(videoId, "processing", 0);

  const captions = await fetchCaptions(videoId);

  if (captions.length === 0) {
    await updateTranscriptionStatus(videoId, "completed", 100);
    return { videoId, status: "skipped", reason: "no captions" };
  }

  try {
    const languages = [...new Set(captions.map((c) => c.language))];
    const results: { language: string; status: string }[] = [];

    const totalBatchesAllLangs = languages.reduce((sum, lang) => {
      const langCaptions = captions.filter((c) => c.language === lang);
      return sum + Math.ceil(langCaptions.length / BATCH_SIZE);
    }, 0);
    let completedBatches = 0;

    for (const language of languages) {
      const langCaptions = captions.filter((c) => c.language === language);
      const batches = chunkArray(langCaptions, BATCH_SIZE);
      const transcriptionParts: string[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const text = await naturalizeBatch(batch, language, i, batches.length);
        transcriptionParts.push(text);

        completedBatches++;
        const progress = Math.round(
          (completedBatches / totalBatchesAllLangs) * 100
        );
        await updateTranscriptionStatus(videoId, "processing", progress);

        if (i < batches.length - 1) {
          await sleep("1s");
        }
      }

      const fullText = transcriptionParts.join("\n\n");
      await saveTranscription(videoId, language, fullText);
      results.push({ language, status: "done" });
    }

    return { videoId, status: "completed", results };
  } catch (error) {
    await markTranscriptionFailed(
      videoId,
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}

async function fetchCaptions(videoId: string) {
  "use step";

  return db
    .select({
      id: captionsTable.id,
      text: captionsTable.text,
      startTime: captionsTable.startTime,
      endTime: captionsTable.endTime,
      language: captionsTable.language,
    })
    .from(captionsTable)
    .where(eq(captionsTable.videoId, videoId))
    .orderBy(asc(captionsTable.startTime));
}

async function naturalizeBatch(
  captions: { text: string; startTime: number; endTime: number }[],
  language: string,
  batchIndex: number,
  totalBatches: number
) {
  "use step";

  const rawText = captions.map((c) => c.text).join("\n");

  const languageLabel =
    language === "fr" ? "French" : language === "en" ? "English" : language;
  const continuationNote =
    totalBatches > 1
      ? `This is part ${batchIndex + 1} of ${totalBatches}. Maintain continuity with surrounding parts.`
      : "";

  const { text } = await generateText({
    model: mistral("mistral-small"),
    system: `You are a professional transcription editor. Your task is to transform raw auto-generated video captions into clean, readable text.

Rules:
- Fix punctuation, capitalization, and sentence structure
- Merge fragmented sentences into coherent paragraphs
- Remove filler words, repetitions, and transcription artifacts
- Preserve the original meaning and all factual content exactly
- Do NOT add, interpret, or summarize content
- Do NOT add headers, titles, or formatting markers
- Output in ${languageLabel}
${continuationNote}`,
    prompt: rawText,
  });

  return text;
}

async function updateTranscriptionStatus(
  videoId: string,
  status: "pending" | "processing" | "completed" | "failed",
  progress?: number
) {
  "use step";

  await db
    .update(transcriptionsTable)
    .set({
      status,
      ...(progress !== undefined && { progress }),
      updatedAt: new Date(),
    })
    .where(eq(transcriptionsTable.videoId, videoId));
}

async function markTranscriptionFailed(videoId: string, error: string) {
  "use step";

  await db
    .update(transcriptionsTable)
    .set({ status: "failed", error, updatedAt: new Date() })
    .where(eq(transcriptionsTable.videoId, videoId));
}

async function saveTranscription(
  videoId: string,
  language: string,
  text: string
) {
  "use step";

  await db
    .update(transcriptionsTable)
    .set({
      text,
      status: "completed",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(transcriptionsTable.videoId, videoId),
        eq(transcriptionsTable.language, language)
      )
    );
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
