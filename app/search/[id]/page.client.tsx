"use client";

import { type UIMessage, useChat } from "@ai-sdk/react";
import { useQuery } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { CopyIcon, Loader2, RefreshCcwIcon } from "lucide-react";
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
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SearchVideoCaptionsUITool } from "@/lib/ai/tools";
import { useTRPC } from "@/lib/trpc/client";

interface CaptionMatch {
  id: number;
  text: string;
  startTime: number;
  endTime: number;
  language: string;
  rank: number;
}

interface CaptionSearchVideo {
  videoId: number;
  videoTitle: string;
  videoThumbnail?: string | null;
  videoUrl: string;
  captions: CaptionMatch[];
}

export function SearchChat({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: UIMessage[];
}) {
  const api = useTRPC();
  const [input, setInput] = useState("");
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
  });

  const { data: captionResults = [] } = useQuery({
    ...api.search.captionResults.queryOptions({ id }),
    refetchInterval: status === "streaming" ? 1000 : false,
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

  return (
    <div className="flex h-[calc(100dvh-7rem)] overflow-hidden">
      {/* Central Video Grid */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          {captionResults.length > 0 ? (
            <div className="flex flex-col gap-4 p-4">
              {captionResults.map((video) => {
                const videoId = video.videoId.toString();
                const thumbnail = video.videoThumbnail || "/placeholder.svg";
                const title = video.videoTitle || "Untitled";
                const captions = video.captions ?? [];

                return (
                  <Card
                    className="flex h-36 flex-row items-stretch gap-0 overflow-hidden py-0 transition-shadow hover:shadow-lg sm:h-44"
                    key={videoId}
                  >
                    <Link
                      aria-label={`Open video: ${title}`}
                      className="relative h-36 w-56 shrink-0 bg-muted sm:h-44 sm:w-72"
                      href={`/video/${videoId}`}
                    >
                      {thumbnail && thumbnail !== "/placeholder.svg" ? (
                        <Image
                          alt={title}
                          className="object-cover"
                          fill
                          sizes="288px"
                          src={thumbnail}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                      )}
                    </Link>
                    <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col items-start justify-start overflow-hidden p-4 text-left">
                      <Link
                        className="block w-full shrink-0"
                        href={`/video/${videoId}`}
                      >
                        <h3 className="mb-2 line-clamp-1 font-semibold text-sm">
                          {title}
                        </h3>
                      </Link>
                      {captions.length > 0 ? (
                        <ScrollArea className="min-h-0 w-full flex-1 pr-2">
                          <div className="space-y-1">
                            {captions.map((caption) => (
                              <Link
                                className="block rounded-sm px-1 py-1 hover:bg-muted/60"
                                href={`/video/${videoId}?t=${Math.max(0, Math.floor(caption.startTime))}`}
                                key={caption.id}
                              >
                                <div className="flex items-start gap-2">
                                  <span className="inline-flex shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground leading-none">
                                    {formatTimestamp(caption.startTime)}
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    {caption.text}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">
                Search for videos to see results here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side Chat */}
      <div className="flex min-h-0 w-96 shrink-0 flex-col overflow-hidden rounded-lg border bg-card">
        <header className="shrink-0 border-b px-4 py-3">
          <h2 className="font-semibold text-foreground text-sm">Chat</h2>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Search in video captions
          </p>
        </header>
        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="px-3 py-4">
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
                            <div
                              className="flex items-center gap-2 text-muted-foreground text-sm"
                              key={`${message.id}-${i}`}
                            >
                              <Loader2 className="size-4 shrink-0 animate-spin" />
                              Searching in video captions...
                            </div>
                          );
                        case "output-available": {
                          const toolOutput = part.output as
                            | SearchVideoCaptionsUITool["output"]
                            | undefined;
                          const captionVideos: CaptionSearchVideo[] =
                            Array.isArray(toolOutput) ? toolOutput : [];
                          return (
                            <div className="w-full" key={`${message.id}-${i}`}>
                              <Carousel
                                className="w-full"
                                opts={{
                                  align: "start",
                                  loop: false,
                                  dragFree: true,
                                }}
                              >
                                <CarouselContent className="-ml-1 gap-2">
                                  {captionVideos.map((video) => {
                                    const videoId = video.videoId.toString();
                                    const thumbnail =
                                      video.videoThumbnail ||
                                      "/placeholder.svg";
                                    const title =
                                      video.videoTitle || "Untitled";

                                    return (
                                      <CarouselItem
                                        className="w-28 shrink-0 pl-1 sm:w-32"
                                        key={video.videoId}
                                      >
                                        <Card className="flex w-full flex-col overflow-hidden border">
                                          <Link
                                            aria-label={`Open ${title}`}
                                            className="relative aspect-video w-full shrink-0 bg-muted"
                                            href={`/video/${videoId}`}
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
                                              href={`/video/${videoId}`}
                                            >
                                              {title}
                                            </Link>
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
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput globalDrop multiple onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              value={input}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            </PromptInputTools>
            <PromptInputSubmit disabled={!(input || status)} status={status} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
