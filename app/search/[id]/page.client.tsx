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
import { Shimmer } from "@/components/ai-elements/shimmer";
import { StoryboardImage } from "@/components/storyboard-image";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { SearchVideoCaptionsUITool } from "@/lib/ai/tools";
import { useTRPC } from "@/lib/trpc/client";

export function SearchChat({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: UIMessage[];
}) {
  const api = useTRPC();
  const [input, setInput] = useState("");
  const { data: captionResults = [], refetch } = useQuery(
    api.search.captionResults.queryOptions({ id })
  );

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

  return (
    <div className="flex h-full overflow-hidden">
      {/* Central Video Grid */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          {captionResults.length > 0 ? (
            <div className="flex flex-col gap-4 p-4">
              {captionResults.map((video) => {
                const videoId = video.videoId.toString();
                const videoThumbnail =
                  video.videoThumbnail || "/placeholder.svg";

                const title = video.videoTitle || "Untitled";
                const captions = video.captions ?? [];

                return (
                  <div className="min-w-0" key={videoId}>
                    <Link
                      className="mb-2 inline-block"
                      href={`/video/${videoId}`}
                    >
                      <h3 className="line-clamp-1 font-semibold text-sm hover:underline">
                        {title}
                      </h3>
                    </Link>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {captions.slice(0, 5).map((caption) => {
                        const thumbnail = caption.thumbnail ?? videoThumbnail;

                        return (
                          <Link
                            className="group shrink-0"
                            href={`/video/${videoId}?t=${Math.max(0, Math.floor(caption.startTime))}`}
                            key={caption.id}
                          >
                            <div className="relative aspect-video w-44 overflow-hidden rounded-lg bg-muted sm:w-52">
                              {thumbnail ? (
                                <StoryboardImage
                                  alt={`${title} at ${formatTimestamp(caption.startTime)}`}
                                  className="h-full w-full rounded-lg object-cover transition-opacity group-hover:opacity-80"
                                  loading="lazy"
                                  src={thumbnail}
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                  <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                              )}
                              <span className="absolute right-1.5 bottom-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-white leading-none">
                                {formatTimestamp(caption.startTime)}
                              </span>
                            </div>
                            <div className="mt-1.5 w-44 sm:w-52">
                              {"headline" in caption &&
                              typeof caption.headline === "string" ? (
                                <p
                                  className="line-clamp-2 text-muted-foreground text-xs leading-snug [&_mark]:rounded [&_mark]:bg-primary/25 [&_mark]:px-0.5 [&_mark]:text-foreground"
                                  dangerouslySetInnerHTML={{
                                    __html: caption.headline,
                                  }}
                                />
                              ) : (
                                <p className="line-clamp-2 text-muted-foreground text-xs leading-snug">
                                  {caption.text}
                                </p>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                      {captions.length > 5 && (
                        <Link
                          className="flex aspect-video w-44 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 sm:w-52"
                          href={`/video/${videoId}`}
                        >
                          +{captions.length - 5} more
                        </Link>
                      )}
                    </div>
                  </div>
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
                          const captionVideos: SearchVideoCaptionsUITool["output"] =
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
                                    const captions = video.captions ?? [];

                                    return (
                                      <CarouselItem
                                        className="w-28 shrink-0 pl-1 sm:w-32"
                                        key={video.videoId}
                                      >
                                        <Card className="flex w-full flex-col gap-0 overflow-hidden border py-0">
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
                                            {captions.length > 0 && (
                                              <p className="text-muted-foreground text-xs">
                                                {captions.length} results found
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
