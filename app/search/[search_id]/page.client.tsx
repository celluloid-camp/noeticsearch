"use client";

import { type UIMessage, useChat } from "@ai-sdk/react";
import { IconDownload, IconEdit, IconShare } from "@tabler/icons-react";
import {
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { GlobeIcon, Loader2, LockIcon, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { EditSearchDialog } from "@/components/edit-search-dialog";
import { ExportSearchDialog } from "@/components/export-search-dialog";
import { ShareSearchDialog } from "@/components/share-search-dialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-hooks";
import { type RouterOutput, useTRPC } from "@/lib/trpc/client";
import { SearchAssistant } from "./search-assistant";

type CaptionResult =
  RouterOutput["search"]["captionResults"]["results"][number];

const formatTimestamp = (seconds: number) => {
  if (!Number.isFinite(seconds)) {
    return "00:00";
  }
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
};

function SearchResultVideoItem({
  video,
  searchId,
}: {
  video: CaptionResult;
  searchId: string;
}) {
  const t = useTranslations();
  const videoId = video.videoId.toString();
  const videoThumbnail = video.videoThumbnail || "/placeholder.svg";
  const title = video.videoTitle || "Untitled";
  const titleHeadline =
    "videoTitleHeadline" in video &&
    typeof video.videoTitleHeadline === "string" &&
    video.videoTitleHeadline.includes("<mark>")
      ? video.videoTitleHeadline
      : null;
  const captions = video.captions ?? [];

  return (
    <Card className="flex h-[420px] min-w-0 flex-col gap-0 overflow-hidden py-0">
      <Link
        className="relative block h-40 shrink-0 overflow-hidden bg-muted"
        href={`/search/${searchId}/video/${videoId}`}
      >
        {videoThumbnail !== "/placeholder.svg" ? (
          <Image
            alt={title}
            className="object-cover transition-opacity hover:opacity-90"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            src={videoThumbnail}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
          </div>
        )}
      </Link>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
        <Link
          className="line-clamp-2 shrink-0 font-semibold text-sm hover:underline [&_mark]:rounded [&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_mark]:text-foreground dark:[&_mark]:bg-yellow-600"
          href={`/search/${searchId}/video/${videoId}`}
        >
          {titleHeadline ? (
            <span dangerouslySetInnerHTML={{ __html: titleHeadline }} />
          ) : (
            title
          )}
        </Link>
        <ScrollArea className="min-h-0 flex-1 rounded-md border">
          <div className="space-y-0.5 p-2">
            {captions.length === 0 ? (
              <p className="py-2 text-center text-muted-foreground text-xs">
                {t("captions.noSubtitles")}
              </p>
            ) : (
              captions.map((caption) => (
                <Link
                  className="block rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                  href={`/search/${searchId}/video/${videoId}?c=${caption.id}`}
                  key={caption.id}
                >
                  <span className="mr-2 font-mono text-[11px] text-muted-foreground">
                    {formatTimestamp(caption.startTime)}
                  </span>
                  {"headline" in caption &&
                  typeof caption.headline === "string" ? (
                    <span
                      className="text-foreground [&_mark]:rounded [&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_mark]:text-foreground dark:[&_mark]:bg-yellow-600"
                      dangerouslySetInnerHTML={{ __html: caption.headline }}
                    />
                  ) : (
                    <span className="text-foreground">{caption.text}</span>
                  )}
                </Link>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function VideoResultsSkeleton() {
  return (
    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {(["a", "b", "c"] as const).map((key) => (
        <Card
          className="flex h-[420px] min-w-0 flex-col gap-0 overflow-hidden py-0"
          key={key}
        >
          <Skeleton className="h-40 w-full shrink-0 rounded-none" />
          <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
            <Skeleton className="h-4 w-3/4 shrink-0" />
            <div className="flex min-h-0 flex-1 flex-col gap-1.5 rounded-md border p-2">
              {(["a", "b", "c", "d", "e", "f"] as const).map((key) => (
                <div className="flex items-center gap-2 px-2 py-1.5" key={key}>
                  <Skeleton className="h-3 w-8 shrink-0" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SearchChat({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: UIMessage[];
}) {
  const api = useTRPC();
  const queryClient = useQueryClient();
  const t = useTranslations();
  const { data: session } = useSession();
  const { data: search, refetch: refetchSearch } = useSuspenseQuery(
    api.search.load.queryOptions({ id })
  );
  const isOwner = session?.user?.id === search.user.id;

  const { messages, sendMessage, status, regenerate } = useChat({
    id,
    messages: initialMessages,
    resume: isOwner,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest({ messages, id }) {
        return { body: { message: messages.at(-1), id } };
      },
    }),
    onFinish: async () => {
      await queryClient.invalidateQueries(
        api.search.captionResults.queryOptions({ id })
      );
      refetchSearch();
    },
  });

  const { data: captionData, isPending: captionResultsPending } = useQuery(
    api.search.captionResults.queryOptions({ id })
  );
  const captionResults = captionData?.results ?? [];
  const canEdit = captionData?.canEdit ?? false;
  const isSearching = status === "submitted" || status === "streaming";
  const showResultsLoading =
    captionResultsPending || (isSearching && captionResults.length === 0);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          {search.isPublic ? (
            <GlobeIcon className="size-4" />
          ) : (
            <LockIcon className="size-4" />
          )}
          <h1 className="font-bold text-xl">
            {search.title == null ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <p className="font-bold text-lg">{search.title}</p>
            )}
          </h1>
        </div>
        <ButtonGroup>
          {canEdit && (
            <EditSearchDialog
              id={id}
              isPublic={search.isPublic}
              title={search.title}
            >
              <Button type="button" variant="outline">
                <IconEdit className="size-4" />
                {t("common.edit")}
              </Button>
            </EditSearchDialog>
          )}
          <ShareSearchDialog isPublic={search.isPublic}>
            <Button type="button" variant="outline">
              <IconShare className="size-4" />
              {t("common.share")}
            </Button>
          </ShareSearchDialog>
          <ExportSearchDialog
            captionResults={captionResults}
            searchId={id}
            searchTitle={search.title}
          >
            <Button
              disabled={captionResults.length === 0}
              type="button"
              variant="outline"
            >
              <IconDownload className="size-4" />
              {t("common.export")}
            </Button>
          </ExportSearchDialog>
        </ButtonGroup>
      </header>

      {/* Body */}
      <div className="flex h-full min-h-0 flex-1 flex-row gap-4 px-4 py-4">
        {/* Central video grid */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            {showResultsLoading ? (
              <div className="flex flex-col gap-4">
                {isSearching && (
                  <Shimmer className="text-sm" duration={3} spread={3}>
                    {t("search.searching")}
                  </Shimmer>
                )}
                <VideoResultsSkeleton />
              </div>
            ) : captionResults.length > 0 ? (
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {captionResults.map((video) => (
                  <SearchResultVideoItem
                    key={video.videoId}
                    searchId={id}
                    video={video}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="flex max-w-sm flex-col items-center gap-2 text-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Search className="size-5" />
                  </div>
                  <h2 className="font-semibold text-foreground text-sm">
                    {t("search.noResults")}
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    {t("search.noResultsHint")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {isOwner && (
          <SearchAssistant
            chatId={id}
            messages={messages}
            regenerate={regenerate}
            sendMessage={sendMessage}
            status={status}
          />
        )}
      </div>
    </div>
  );
}
