"use client";

import type { ChatStatus, UIMessage, UseChatHelpers } from "@ai-sdk/react";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
  CopyIcon,
  Globe,
  ListFilter,
  Loader2,
  RefreshCcwIcon,
  User,
  Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
import { SelectVideosDialog } from "@/components/select-videos-dialog";
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
import type { SearchVideoCaptionsUITool } from "@/lib/ai/tools";
import { useTRPC } from "@/lib/trpc/client";

const FILTER_OPTIONS = [
  { value: "all", labelKey: "filterAll", icon: Video },
  { value: "public", labelKey: "filterPublic", icon: Globe },
  { value: "mine", labelKey: "filterMine", icon: User },
  { value: "custom", labelKey: "filterCustom", icon: ListFilter },
] as const;

export function SearchAssistant({
  chatId,
  messages,
  sendMessage,
  status,
  regenerate,
}: {
  chatId: string;
  messages: UIMessage[];
  sendMessage: UseChatHelpers<UIMessage>["sendMessage"];
  status: ChatStatus;
  regenerate: UseChatHelpers<UIMessage>["regenerate"];
}) {
  const api = useTRPC();
  const [input, setInput] = useState("");
  const [customVideoDialogOpen, setCustomVideoDialogOpen] = useState(false);
  const tSearch = useTranslations("search");
  const tCommon = useTranslations("common");

  const { data: search, refetch: refetchSearch } = useSuspenseQuery(
    api.search.load.queryOptions({ id: chatId })
  );
  const videoIds = search.videoIds ?? [];

  const { mutateAsync: updateSearch } = useMutation(
    api.search.update.mutationOptions({
      onSuccess: () => {
        refetchSearch();
      },
    })
  );

  const { data: videosData } = useQuery({
    ...api.video.getAll.queryOptions({ filter: "all" }),
    enabled: search.filterType === "custom",
  });
  const videos = videosData?.videos ?? [];
  const { data: foldersData } = useQuery({
    ...api.folder.listMineWithVideos.queryOptions({ sortBy: "recent" }),
    enabled: search.filterType === "custom",
  });
  const folderOptions = (foldersData?.folders ?? []).map((folder) => ({
    id: folder.id,
    name: folder.name,
    videoIds: folder.videos.map((video) => video.id),
  }));

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text) {
      return;
    }
    sendMessage({ text: message.text });
    setInput("");
  };

  return (
    <Card className="flex h-full min-h-0 w-96 shrink-0 flex-col p-0">
      <CardHeader className="border-b py-3">
        <CardTitle>{tSearch("newSearch")}</CardTitle>
      </CardHeader>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="px-3">
          {messages.map((message, messageIndex) => (
            <Fragment key={message.id}>
              {message.parts.map((part, i) => {
                switch (part.type) {
                  case "text": {
                    const isLastMessage = messageIndex === messages.length - 1;
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
                              label={tCommon("retry")}
                              onClick={() => regenerate()}
                            >
                              <RefreshCcwIcon className="size-3" />
                            </MessageAction>
                            <MessageAction
                              label={tCommon("copy")}
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
                  case "tool-search_video":
                    switch (part.state) {
                      case "input-streaming":
                      case "input-available":
                        return (
                          <Shimmer
                            className="text-xs"
                            duration={3}
                            key={`${message.id}-${i}`}
                            spread={3}
                          >
                            {tSearch("searching")}
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
                                    video.videoThumbnail || "/placeholder.svg";
                                  const title = video.videoTitle || "";
                                  const captions = video.captions ?? [];
                                  return (
                                    <CarouselItem
                                      className="pl-1"
                                      key={video.videoId}
                                    >
                                      <Card className="flex w-full flex-col gap-0 overflow-hidden border py-0">
                                        <Link
                                          aria-label={
                                            title
                                              ? tSearch("openVideo", { title })
                                              : undefined
                                          }
                                          className="relative aspect-video w-full shrink-0 bg-muted"
                                          href={`/search/${chatId}/video/${videoId}`}
                                        >
                                          {thumbnail !== "/placeholder.svg" ? (
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
                                            href={`/search/${chatId}/video/${videoId}`}
                                          >
                                            {title}
                                          </Link>
                                          {captions.length > 0 && (
                                            <p className="text-muted-foreground text-xs">
                                              {tSearch("resultsFound", {
                                                count: captions.length,
                                              })}
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
          {status === "submitted" && (
            <div className="mt-2">
              <Shimmer className="text-xs" duration={3} spread={3}>
                {tSearch("searching")}
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
            placeholder={tSearch("placeholder")}
            value={input}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <InputGroupButton
                  aria-label={tSearch("changeScope")}
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
                        <span>{tSearch(current.labelKey)}</span>
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
                          id: chatId,
                          filterType: opt.value,
                          ...(opt.value !== "custom" && { videoIds: [] }),
                        });
                        if (opt.value === "custom") {
                          setCustomVideoDialogOpen(true);
                        }
                      }}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{tSearch(opt.labelKey)}</span>
                      {isActive && (
                        <span className="ml-auto text-muted-foreground text-xs">
                          {tSearch("filterCurrent")}
                        </span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            {search.filterType === "custom" && (
              <SelectVideosDialog
                folders={folderOptions}
                onOpenChange={setCustomVideoDialogOpen}
                onSelectionChange={(ids) => {
                  void updateSearch({ id: chatId, videoIds: ids });
                }}
                open={customVideoDialogOpen}
                selectedIds={videoIds}
                triggerVariant="compact"
                videos={videos}
              />
            )}
          </PromptInputTools>
          <PromptInputSubmit disabled={!(input || status)} status={status} />
        </PromptInputFooter>
      </PromptInput>
    </Card>
  );
}
