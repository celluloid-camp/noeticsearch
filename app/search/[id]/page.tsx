import { notFound } from "next/navigation";
import { caller } from "@/lib/trpc/server";
import { SearchChat } from "./page.client";

export default async function SearchPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const searchHistory = await caller.search.load({ id });

  if (searchHistory) {
    return (
      <SearchChat id={id} initialMessages={searchHistory.messages ?? []} />
    );
  }
  return notFound();
}
