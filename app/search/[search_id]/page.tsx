import { notFound } from "next/navigation";
import { caller } from "@/lib/trpc/server";
import { SearchChat } from "./page.client";

export default async function SearchPage(props: {
  params: Promise<{ search_id: string }>;
}) {
  const { search_id } = await props.params;
  const searchHistory = await caller.search.load({ id: search_id });

  if (searchHistory) {
    return (
      <SearchChat
        id={search_id}
        initialMessages={searchHistory.messages ?? []}
      />
    );
  }
  return notFound();
}
