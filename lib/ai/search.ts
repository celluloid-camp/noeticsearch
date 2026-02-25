import type { UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { searchHistoryTable } from "@/db/schema";
import { db } from "../db";

export async function saveSearchHistory({
  id,
  messages,
}: {
  id: string;
  messages?: UIMessage[];
  activeStreamId?: string | null;
}) {
  await db
    .update(searchHistoryTable)
    .set({
      messages,
    })
    .where(eq(searchHistoryTable.id, id));
}

export async function loadSearchHistory(id: string) {
  const searchHistory = await db.query.searchHistoryTable.findFirst({
    where: eq(searchHistoryTable.id, id),
    columns: {
      messages: true,
    },
  });

  return {
    messages: searchHistory?.messages ?? [],
  };
}
