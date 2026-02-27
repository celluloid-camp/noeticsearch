"use client";

import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon, Settings, XIcon } from "lucide-react";
import {
  MediaActionTypes,
  useMediaDispatch,
  useMediaSelector,
} from "media-chrome/react/media-store";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type RouterOutput, useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Card, CardHeader } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface CaptionsPanelProps {
  highlightTimestamp?: number | null;
  videoId: string;
}

export type Caption = RouterOutput["video"]["getCaptions"][number];
const PARAGRAPH_BREAK_GAP_SECONDS = 0.4;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CaptionsPanel({
  videoId,
  highlightTimestamp,
}: CaptionsPanelProps) {
  const api = useTRPC();
  const subtitleRefs = useRef<Record<number, HTMLSpanElement | null>>({});
  const [autoScroll, setAutoScroll] = useState(true);
  const [isParagraphLayout, setIsParagraphLayout] = useState(true);
  const [layoutSwitchKey, setLayoutSwitchKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const debouncedSetSearch = useDebouncedCallback(
    (value: string) => setDebouncedSearch(value.trim()),
    { wait: 300 }
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedSetSearch(value);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setDebouncedSearch("");
  };

  const isSearching = debouncedSearch.length > 0;

  const mediaCurrentTime = useMediaSelector((state) => state.mediaCurrentTime);
  const dispatch = useMediaDispatch();

  const { data: allCaptions = [] } = useQuery(
    api.video.getCaptions.queryOptions({ id: videoId })
  );

  const { data: chapters = [] } = useQuery(
    api.video.getChapters.queryOptions({ id: videoId })
  );
  const { data: searchResults, isFetching: isFetchingSearch } = useQuery({
    ...api.video.getCaptions.queryOptions({
      id: videoId,
      search: debouncedSearch,
    }),
    enabled: isSearching,
  });

  const captions = isSearching ? (searchResults ?? []) : allCaptions;
  const useParagraphLayout = isParagraphLayout && !isSearching;
  const chapterByCaptionIndex = useMemo(() => {
    if (captions.length === 0 || chapters.length === 0) {
      return captions.map(() => null);
    }

    let chapterIndex = 0;
    return captions.map((caption) => {
      while (
        chapterIndex + 1 < chapters.length &&
        chapters[chapterIndex + 1].timecode <= caption.startTime
      ) {
        chapterIndex += 1;
      }
      if (chapters[chapterIndex].timecode <= caption.startTime) {
        return chapters[chapterIndex];
      }
      return null;
    });
  }, [captions, chapters]);

  // Index from URL timestamp param (initial scroll target, based on allCaptions)
  const targetCaptionIndex = useMemo(() => {
    if (
      allCaptions.length === 0 ||
      highlightTimestamp == null ||
      Number.isNaN(Number(highlightTimestamp))
    ) {
      return -1;
    }
    const t = Number(highlightTimestamp);
    const index = allCaptions.findIndex(
      (c) => t >= c.startTime && t <= c.endTime
    );
    if (index !== -1) {
      return index;
    }
    return allCaptions.reduce((closest, c, i) => {
      const closestDiff = Math.abs(allCaptions[closest].startTime - t);
      const diff = Math.abs(c.startTime - t);
      return diff < closestDiff ? i : closest;
    }, 0);
  }, [allCaptions, highlightTimestamp]);

  // Index of the caption matching the current playback time (based on allCaptions)
  const currentCaptionIndex = useMemo(() => {
    if (allCaptions.length === 0 || mediaCurrentTime == null) {
      return -1;
    }
    return allCaptions.findIndex(
      (c) => mediaCurrentTime >= c.startTime && mediaCurrentTime <= c.endTime
    );
  }, [allCaptions, mediaCurrentTime]);

  // Scroll to the URL timestamp caption on load
  useEffect(() => {
    if (targetCaptionIndex < 0) {
      return;
    }
    const id = setTimeout(() => {
      const el = subtitleRefs.current[targetCaptionIndex];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
    return () => clearTimeout(id);
  }, [targetCaptionIndex]);

  // Auto-scroll as playback progresses
  const prevCaptionIndexRef = useRef(-1);
  const currentCaptionIndexRef = useRef(-1);
  useEffect(() => {
    currentCaptionIndexRef.current = currentCaptionIndex;
  }, [currentCaptionIndex]);

  useEffect(() => {
    if (
      !autoScroll ||
      currentCaptionIndex < 0 ||
      currentCaptionIndex === prevCaptionIndexRef.current
    ) {
      return;
    }
    prevCaptionIndexRef.current = currentCaptionIndex;
    const el = subtitleRefs.current[currentCaptionIndex];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [autoScroll, currentCaptionIndex]);

  // Keep the active caption centered when switching layouts.
  useEffect(() => {
    const activeIndex = currentCaptionIndexRef.current;
    if (layoutSwitchKey === 0 || activeIndex < 0) {
      return;
    }
    const id = setTimeout(() => {
      const el = subtitleRefs.current[activeIndex];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 0);
    return () => clearTimeout(id);
  }, [layoutSwitchKey]);

  const handleSubtitleClick = (
    caption: Caption,
    e: React.MouseEvent | React.KeyboardEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setAutoScroll(false);
    dispatch({
      type: MediaActionTypes.MEDIA_PLAY_REQUEST,
    });
    dispatch({
      type: MediaActionTypes.MEDIA_SEEK_REQUEST,
      detail: caption.startTime,
    });
  };

  return (
    <Card className="flex h-full flex-col gap-0 py-0">
      <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-2">
        <span className="font-medium text-sm">Captions</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost">
              <Settings className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              checked={autoScroll}
              onCheckedChange={setAutoScroll}
            >
              Auto-scroll
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={isParagraphLayout}
              onCheckedChange={(checked) => {
                setIsParagraphLayout(checked === true);
                setLayoutSwitchKey((current) => current + 1);
              }}
            >
              Paragraph layout
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <div className="border-b px-2 py-1.5">
        <InputGroup className="h-8">
          <InputGroupAddon>
            <SearchIcon className="text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            className="h-8 text-xs"
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search captions..."
            value={searchQuery}
          />
          {searchQuery && (
            <InputGroupAddon align="inline-end">
              <button
                className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                onClick={clearSearch}
                type="button"
              >
                <XIcon className="size-3" />
              </button>
            </InputGroupAddon>
          )}
        </InputGroup>
      </div>
      <ScrollArea className="min-h-0 flex-1 bg-secondary p-0">
        {isSearching && isFetchingSearch ? (
          <div className="space-y-2 px-4 py-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div className="space-y-1.5" key={`search-skeleton-${i}`}>
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : captions.length > 0 ? (
          useParagraphLayout ? (
            <div className="px-4 py-4 text-sm leading-relaxed">
              {captions.map((caption, index) => {
                const allIndex = isSearching
                  ? allCaptions.findIndex(
                      (c) =>
                        c.startTime === caption.startTime &&
                        c.endTime === caption.endTime
                    )
                  : index;
                const previousCaption = captions[index - 1];
                const gapFromPrevious = previousCaption
                  ? Math.max(0, caption.startTime - previousCaption.endTime)
                  : 0;
                const previousText = previousCaption?.text.trim() ?? "";
                const previousEndsWithComma = /[,;:]$/.test(previousText);
                const previousEndsWithSentence = /[.!?]$/.test(previousText);
                const needsParagraphBreak =
                  index > 0 && gapFromPrevious >= PARAGRAPH_BREAK_GAP_SECONDS;
                const chapter = chapterByCaptionIndex[index];
                const previousChapter = chapterByCaptionIndex[index - 1];
                const showChapterTitle =
                  Boolean(chapter?.title) &&
                  chapter?.title !== previousChapter?.title;
                const inlineSpacingClass =
                  index === 0 || needsParagraphBreak || showChapterTitle
                    ? ""
                    : previousEndsWithComma
                      ? "ml-0"
                      : previousEndsWithSentence || gapFromPrevious >= 0.45
                        ? "ml-px"
                        : "ml-0";

                return (
                  <span key={`${caption.startTime}-${caption.endTime}`}>
                    {showChapterTitle && (
                      <div className="relative my-3 text-center before:absolute before:inset-x-0 before:top-1/2 before:h-px before:-translate-y-1/2 before:bg-border">
                        <span className="relative z-10 bg-secondary px-2 font-medium text-muted-foreground text-sm">
                          {chapter?.title}
                        </span>
                      </div>
                    )}
                    {needsParagraphBreak && (
                      <span aria-hidden className="block h-3" />
                    )}
                    <Tooltip delayDuration={1000}>
                      <TooltipTrigger asChild>
                        <span
                          className={cn(
                            "group inline cursor-pointer rounded-sm border border-transparent px-0 py-0.5 leading-snug transition-colors hover:border-primary data-selected:border-primary/40 data-highlight:bg-amber-500/20 data-selected:bg-primary/15",
                            inlineSpacingClass
                          )}
                          data-highlight={
                            allIndex === targetCaptionIndex || undefined
                          }
                          data-selected={
                            (allIndex === currentCaptionIndex &&
                              allIndex !== targetCaptionIndex) ||
                            undefined
                          }
                          onClick={(e) => {
                            handleSubtitleClick(caption, e);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSubtitleClick(caption, e);
                            }
                          }}
                          ref={(el) => {
                            subtitleRefs.current[allIndex] = el;
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <span
                            className="inline group-data-highlight:text-amber-900 group-data-selected:text-foreground dark:group-data-highlight:text-amber-100 [&_mark]:rounded-sm [&_mark]:bg-amber-200 [&_mark]:px-0.5 dark:[&_mark]:bg-amber-800"
                            dangerouslySetInnerHTML={{
                              __html: caption.headline ?? caption.text,
                            }}
                          />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {formatTime(caption.startTime)}
                      </TooltipContent>
                    </Tooltip>
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="py-2">
              {captions.map((caption, index) => {
                const allIndex = isSearching
                  ? allCaptions.findIndex(
                      (c) =>
                        c.startTime === caption.startTime &&
                        c.endTime === caption.endTime
                    )
                  : index;
                const chapter = chapterByCaptionIndex[index];
                const previousChapter = chapterByCaptionIndex[index - 1];
                const showChapterTitle =
                  Boolean(chapter?.title) &&
                  chapter?.title !== previousChapter?.title;

                return (
                  <div
                    className="px-2"
                    key={`${caption.startTime}-${caption.endTime}`}
                  >
                    {showChapterTitle && (
                      <div className="relative my-3 text-center before:absolute before:inset-x-0 before:top-1/2 before:h-px before:-translate-y-1/2 before:bg-border">
                        <span className="relative z-10 bg-secondary px-2 font-medium text-muted-foreground text-sm">
                          {chapter?.title}
                        </span>
                      </div>
                    )}
                    <span
                      className="group flex cursor-pointer items-start gap-2 rounded-sm border border-transparent px-2 py-1.5 text-sm leading-snug transition-colors hover:border-primary data-selected:border-primary/40 data-highlight:bg-amber-500/10 data-selected:bg-primary/10"
                      data-highlight={
                        allIndex === targetCaptionIndex || undefined
                      }
                      data-selected={
                        (allIndex === currentCaptionIndex &&
                          allIndex !== targetCaptionIndex) ||
                        undefined
                      }
                      onClick={(e) => {
                        handleSubtitleClick(caption, e);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSubtitleClick(caption, e);
                        }
                      }}
                      ref={(el) => {
                        subtitleRefs.current[allIndex] = el;
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="w-10 shrink-0 font-mono text-[10px] opacity-75 group-data-highlight:text-amber-600 group-data-selected:text-primary">
                        {formatTime(caption.startTime)}
                      </span>
                      <span
                        className="group-data-highlight:text-amber-900 group-data-selected:text-foreground dark:group-data-highlight:text-amber-100 [&_mark]:rounded-sm [&_mark]:bg-amber-200 [&_mark]:px-0.5 dark:[&_mark]:bg-amber-800"
                        dangerouslySetInnerHTML={{
                          __html: caption.headline ?? caption.text,
                        }}
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="py-8 text-center text-muted-foreground text-sm">
            {isSearching ? "No matching captions" : "No subtitles available"}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
