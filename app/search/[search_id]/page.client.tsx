"use client";

import { type UIMessage, useChat } from "@ai-sdk/react";
import { IconDownload, IconEdit, IconShare } from "@tabler/icons-react";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import {
  CopyIcon,
  Globe,
  GlobeIcon,
  ListFilter,
  Loader2,
  LockIcon,
  RefreshCcwIcon,
  Search,
  User,
  Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { EditSearchDialog } from "@/components/edit-search-dialog";
import { ExportSearchDialog } from "@/components/export-search-dialog";
import { SelectVideosDialog } from "@/components/select-videos-dialog";
import { ShareSearchDialog } from "@/components/share-search-dialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroupButton } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { SearchVideoCaptionsUITool } from "@/lib/ai/tools";
import { useTRPC } from "@/lib/trpc/client";

const FILTER_OPTIONS = [
  { value: "all", label: "All videos", icon: Video },
  { value: "public", label: "Public videos", icon: Globe },
  { value: "mine", label: "My videos", icon: User },
  { value: "custom", label: "Custom", icon: ListFilter },
] as const;

export function SearchChat({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: UIMessage[];
}) {
  const api = useTRPC();
  const [input, setInput] = useState("");
  const [customVideoDialogOpen, setCustomVideoDialogOpen] = useState(false);
  const { data: search, refetch: refetchSearch } = useSuspenseQuery(
    api.search.load.queryOptions({ id })
  );
  const videoIds = search.videoIds ?? [];
  const { mutateAsync: updateSearch } = useMutation(
    api.search.update.mutationOptions({
      onSuccess: () => {
        refetchSearch();
      },
    })
  );
  const { data: captionResults = [], refetch } = useQuery(
    api.search.captionResults.queryOptions({ id })
  );
  const { data: videosData } = useQuery({
    ...api.video.getAll.queryOptions({ filter: "all" }),
    enabled: search.filterType === "custom",
  });
  const videos = videosData?.videos ?? [];
  const { messages, sendMessage, status, regenerate } = useChat({
    id,
    messages: initialMessages,
    resume: true,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // only send the last message to the server:
      prepareSendMessagesRequest({ messages, id }) {
        return { body: { message: messages.at(-1), id } };
      },
    }),
    onFinish: async () => {
      refetch();
      refetchSearch();
    },
  });

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);

    if (!hasText) {
      return;
    }

    sendMessage({ text: message.text });
    setInput("");
  };

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

  const SearchResultVideoItem = ({
    video,
  }: {
    video: (typeof captionResults)[number];
  }) => {
    const videoId = video.videoId.toString();
    const videoThumbnail = video.videoThumbnail || "/placeholder.svg";
    const title = video.videoTitle || "Untitled";
    const captions = video.captions ?? [];

    return (
      <Card
        className="flex h-[420px] min-w-0 flex-col gap-0 overflow-hidden py-0"
        key={videoId}
      >
        <Link
          className="relative block h-40 shrink-0 overflow-hidden bg-muted"
          href={`/search/${id}/video/${videoId}`}
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
            className="line-clamp-2 shrink-0 font-semibold text-sm hover:underline"
            href={`/search/${id}/video/${videoId}`}
          >
            {title}
          </Link>
          <ScrollArea className="min-h-0 flex-1 rounded-md border">
            <div className="space-y-0.5 p-2">
              {captions.length === 0 ? (
                <p className="py-2 text-center text-muted-foreground text-xs">
                  No captions
                </p>
              ) : (
                captions.map((caption) => (
                  <Link
                    className="block rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                    href={`/search/${id}/video/${videoId}?c=${caption.id}`}
                    key={caption.id}
                  >
                    <span className="mr-2 font-mono text-[11px] text-muted-foreground">
                      {formatTimestamp(caption.startTime)}
                    </span>
                    {"headline" in caption &&
                    typeof caption.headline === "string" ? (
                      <span
                        className="text-foreground [&_mark]:rounded [&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_mark]:text-foreground dark:[&_mark]:bg-yellow-600"
                        dangerouslySetInnerHTML={{
                          __html: caption.headline,
                        }}
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
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
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
        <div className="flex items-center">
          <ButtonGroup>
            <EditSearchDialog
              id={id}
              isPublic={search.isPublic}
              title={search.title}
            >
              <Button type="button" variant="outline">
                <IconEdit className="size-4" />
                Edit
              </Button>
            </EditSearchDialog>
            <ShareSearchDialog isPublic={search.isPublic}>
              <Button type="button" variant="outline">
                <IconShare className="size-4" />
                Share
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
                Export
              </Button>
            </ExportSearchDialog>
          </ButtonGroup>
        </div>
      </header>
      <div className="flex h-full min-h-0 flex-1 flex-row gap-4 px-4 py-4">
        {/* Central Video Grid */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            {captionResults.length > 0 ? (
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {captionResults.map((video) => (
                  <SearchResultVideoItem key={video.videoId} video={video} />
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="flex max-w-sm flex-col items-center gap-2 text-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Search className="size-5" />
                  </div>
                  <h2 className="font-semibold text-foreground text-sm">
                    No results yet
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    Ask a question about your videos to see matching captions
                    and segments here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side Chat */}
        <Card className="flex h-full min-h-0 w-96 flex-col p-0">
          <CardHeader className="border-b py-3">
            <CardTitle>Assistant</CardTitle>
          </CardHeader>
          <Conversation className="min-h-0 flex-1">
            <ConversationContent className="px-3">
              {messages.map((message, messageIndex) => (
                <Fragment key={message.id}>
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "text": {
                        const isLastMessage =
                          messageIndex === messages.length - 1;

                        return (
                          <Fragment key={`${message.id}-${i}`}>
                            <Message from={message.role}>
                              <MessageContent>
                                <MessageResponse>{part.text}</MessageResponse>
                              </MessageContent>
                            </Message>
                            {message.role === "assistant" && isLastMessage && (
                              <MessageActions>
                                <MessageAction
                                  label="Retry"
                                  onClick={() => regenerate()}
                                >
                                  <RefreshCcwIcon className="size-3" />
                                </MessageAction>
                                <MessageAction
                                  label="Copy"
                                  onClick={() =>
                                    navigator.clipboard.writeText(part.text)
                                  }
                                >
                                  <CopyIcon className="size-3" />
                                </MessageAction>
                              </MessageActions>
                            )}
                          </Fragment>
                        );
                      }
                      case "tool-searchVideoCaptions":
                        switch (part.state) {
                          case "input-available":
                            return (
                              <Shimmer
                                className="text-xs"
                                duration={3}
                                key={`${message.id}-${i}`}
                                spread={3}
                              >
                                Searching videos...
                              </Shimmer>
                            );
                          case "output-available": {
                            const toolOutput = part.output as
                              | SearchVideoCaptionsUITool["output"]
                              | undefined;
                            const captionVideos: SearchVideoCaptionsUITool["output"] =
                              Array.isArray(toolOutput) ? toolOutput : [];
                            return (
                              <div key={`${message.id}-${i}`}>
                                <Carousel
                                  opts={{
                                    align: "start",
                                    loop: false,
                                    dragFree: true,
                                  }}
                                >
                                  <CarouselContent className="-ml-1 basis-1/3 gap-2">
                                    {captionVideos.map((video) => {
                                      const videoId = video.videoId.toString();
                                      const thumbnail =
                                        video.videoThumbnail ||
                                        "/placeholder.svg";
                                      const title =
                                        video.videoTitle || "Untitled";
                                      const captions = video.captions ?? [];

                                      return (
                                        <CarouselItem
                                          className="pl-1"
                                          key={video.videoId}
                                        >
                                          <Card className="flex w-full flex-col gap-0 overflow-hidden border py-0">
                                            <Link
                                              aria-label={`Open ${title}`}
                                              className="relative aspect-video w-full shrink-0 bg-muted"
                                              href={`/search/${id}/video/${videoId}`}
                                            >
                                              {thumbnail !==
                                              "/placeholder.svg" ? (
                                                <Image
                                                  alt={title}
                                                  className="object-cover"
                                                  fill
                                                  sizes="128px"
                                                  src={thumbnail}
                                                />
                                              ) : (
                                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                                  <Loader2 className="h-4 w-4 animate-spin" />
                                                </div>
                                              )}
                                            </Link>
                                            <CardContent className="p-1.5">
                                              <Link
                                                className="line-clamp-2 block font-medium text-xs hover:underline"
                                                href={`/search/${id}/video/${videoId}`}
                                              >
                                                {title}
                                              </Link>
                                              {captions.length > 0 && (
                                                <p className="text-muted-foreground text-xs">
                                                  {captions.length} results
                                                  found
                                                </p>
                                              )}
                                            </CardContent>
                                          </Card>
                                        </CarouselItem>
                                      );
                                    })}
                                  </CarouselContent>
                                  {captionVideos.length > 1 && (
                                    <>
                                      <CarouselPrevious className="-left-1 size-6 border bg-background" />
                                      <CarouselNext className="-right-1 size-6 border bg-background" />
                                    </>
                                  )}
                                </Carousel>
                              </div>
                            );
                          }
                          case "output-error":
                            return (
                              <div
                                className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-destructive text-sm"
                                key={`${message.id}-${i}`}
                              >
                                Error: {part.errorText}
                              </div>
                            );
                          default:
                            return null;
                        }
                      default:
                        return null;
                    }
                  })}
                </Fragment>
              ))}
              {status === "streaming" && (
                <div className="mt-2">
                  <Shimmer className="text-xs" duration={3} spread={3}>
                    Searching...
                  </Shimmer>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <PromptInput className="border-none ring-0" onSubmit={handleSubmit}>
            <PromptInputBody className="border-none ring-0">
              <PromptInputTextarea
                onChange={(e) => setInput(e.target.value)}
                value={input}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <InputGroupButton
                      aria-label="Change search scope"
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {(() => {
                        const current =
                          FILTER_OPTIONS.find(
                            (opt) => opt.value === search.filterType
                          ) ?? FILTER_OPTIONS[0];
                        const Icon = current.icon;
                        return (
                          <>
                            <Icon className="size-4 shrink-0" />
                            <span>{current.label}</span>
                          </>
                        );
                      })()}
                    </InputGroupButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {FILTER_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isActive = search.filterType === opt.value;
                      return (
                        <DropdownMenuItem
                          key={opt.value}
                          onSelect={() => {
                            void updateSearch({
                              id,
                              filterType: opt.value,
                              ...(opt.value !== "custom" && {
                                videoIds: [],
                              }),
                            });
                            if (opt.value === "custom") {
                              setCustomVideoDialogOpen(true);
                            }
                          }}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span>{opt.label}</span>
                          {isActive ? (
                            <span className="ml-auto text-muted-foreground text-xs">
                              Current
                            </span>
                          ) : null}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
                {search.filterType === "custom" && (
                  <SelectVideosDialog
                    onOpenChange={setCustomVideoDialogOpen}
                    onSelectionChange={(ids) => {
                      void updateSearch({ id, videoIds: ids });
                    }}
                    open={customVideoDialogOpen}
                    selectedIds={videoIds}
                    triggerVariant="compact"
                    videos={videos}
                  />
                )}
              </PromptInputTools>
              <PromptInputSubmit
                disabled={!(input || status)}
                status={status}
              />
            </PromptInputFooter>
          </PromptInput>
        </Card>
      </div>
    </div>
  );
}
