import type { UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { searchHistoryTable, searchResultTable } from "@/db/schema";
import { db, getDbErrorMessage } from "../db";
import { searchVideoCaptionsOutputSchema } from "./tools";

const toolOutputSchema = z.array(searchVideoCaptionsOutputSchema);

function extractSearchToolOutput(messages: UIMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") {
      continue;
    }
    for (let j = msg.parts.length - 1; j >= 0; j--) {
      const part = msg.parts[j] as Record<string, unknown>;

      const isSearchTool =
        part.type === "tool-searchVideoCaptions" ||
        (part.type === "dynamic-tool" &&
          part.toolName === "searchVideoCaptions");

      if (!isSearchTool || part.state !== "output-available") {
        continue;
      }

      const parsed = toolOutputSchema.safeParse(part.output);
      if (!parsed.success) {
        continue;
      }

      const input = part.input as
        | { keywords?: string[]; keyword?: string }
        | undefined;
      const keywords =
        input?.keywords ?? (input?.keyword ? [input.keyword] : null);
      return {
        keywords,
        results: parsed.data,
      };
    }
  }
  return null;
}

function extractSetSearchTitleToolOutput(messages: UIMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant") {
      continue;
    }
    for (let j = msg.parts.length - 1; j >= 0; j--) {
      const part = msg.parts[j] as Record<string, unknown>;
      if (part.type !== "tool-setSearchTitle") {
        continue;
      }
      if (part.state !== "output-available") {
        continue;
      }
      const parsed = z.string().safeParse(part.output);
      if (!parsed.success) {
        continue;
      }
      return parsed.data;
    }
  }
  return null;
}

export async function saveSearchHistory({
  id,
  messages,
}: {
  id: string;
  messages?: UIMessage[];
}) {
  try {
    const toolOutput = messages ? extractSearchToolOutput(messages) : null;
    const setSearchTitleToolOutput = messages
      ? extractSetSearchTitleToolOutput(messages)
      : null;

    await db.transaction(async (tx) => {
      await tx
        .update(searchHistoryTable)
        .set({
          messages,
          title: setSearchTitleToolOutput ?? undefined,
          ...(toolOutput?.keywords ? { keywords: toolOutput.keywords } : {}),
        })
        .where(eq(searchHistoryTable.id, id));

      if (toolOutput) {
        await tx
          .delete(searchResultTable)
          .where(eq(searchResultTable.searchId, id));

        const values = toolOutput.results.flatMap((item) =>
          item.captions.map((caption) => ({
            searchId: id,
            videoId: item.videoId,
            captionId: caption.id,
            accuracy: caption.accuracy,
            rank: caption.rank,
          }))
        );

        if (values.length > 0) {
          await tx.insert(searchResultTable).values(values);
        }
      }
    });
  } catch (error) {
    const { message, constraint } = getDbErrorMessage(error);
    console.error("Failed to save search history:", {
      message,
      constraint,
      originalError: error,
    });
  }
}

export async function loadSearchHistory(id: string) {
  const searchHistory = await db.query.searchHistoryTable.findFirst({
    where: eq(searchHistoryTable.id, id),
    columns: {
      messages: true,
      title: true,
    },
  });

  return {
    messages: searchHistory?.messages ?? [],
    title: searchHistory?.title ?? null,
  };
}
