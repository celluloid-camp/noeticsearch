"use client";

import { useChat } from "@ai-sdk/react";
import { useMutation } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { Search, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/lib/trpc/client";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const api = useTRPC();

  const { mutateAsync: createSearch, isPending: isLoading } = useMutation(
    api.search.create.mutationOptions()
  );

  const { sendMessage, id: chatId } = useChat({
    resume: true,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // only send the last message to the server:
      prepareSendMessagesRequest({ messages, id }) {
        return { body: { message: messages.at(-1), id } };
      },
    }),
  });

  const handleSearch = async () => {
    if (query.trim()) {
      const { id } = await createSearch({ id: chatId });
      sendMessage(
        { text: query },
        {
          body: {
            id,
          },
        }
      );
      router.push(`/search/${id}`);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="flex w-full max-w-2xl flex-col items-center gap-6">
          <h1 className="font-semibold text-3xl text-foreground">
            Search Assistant
          </h1>

          {/* Search Input Form */}
          <div className="w-full">
            <div className="relative">
              <Search className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 transform text-muted-foreground" />
              <input
                className="w-full rounded-xl border border-border bg-background py-4 pr-14 pl-12 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                placeholder="Search in video subtitles..."
                ref={inputRef}
                type="text"
                value={query}
              />
              <Button
                aria-label="Send search"
                className="absolute top-1/2 right-2 -translate-y-1/2 transform rounded-lg bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!query.trim() || isLoading}
                onClick={handleSearch}
                type="button"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Helper Text */}
          <p className="max-w-md text-center text-muted-foreground text-sm">
            Ask me to find words or phrases in your video subtitles, like "find
            videos with javascript" or "search for the word tutorial".
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
