"use client";

import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ListIcon, SearchIcon, WrapText, XIcon } from "lucide-react";
import {
  MediaActionTypes,
  useMediaDispatch,
  useMediaSelector,
} from "media-chrome/react/media-store";
import { parseAsInteger, useQueryState } from "nuqs";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type RouterOutput, useTRPC } from "@/lib/trpc/client";
import { CaptionsParagraphLayout } from "./captions-paragraph-layout";
import { Button } from "./ui/button";
import { Card, CardHeader } from "./ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { Skeleton } from "./ui/skeleton";
import { Switch } from "./ui/switch";

interface CaptionsPanelProps {
  videoId: string;
}

export type Caption = RouterOutput["video"]["getCaptions"][number];
const CAPTION_KEY_SEPARATOR = "::";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getCaptionKey(
  caption: Pick<Caption, "startTime" | "endTime">
): string {
  return `${caption.startTime}${CAPTION_KEY_SEPARATOR}${caption.endTime}`;
}

function findCaptionIndexAtTime(captions: Caption[], time: number): number {
  let low = 0;
  let high = captions.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const caption = captions[mid];

    if (time < caption.startTime) {
      high = mid - 1;
      continue;
    }
    if (time > caption.endTime) {
      low = mid + 1;
      continue;
    }

    return mid;
  }

  return -1;
}

export function CaptionsPanel({ videoId }: CaptionsPanelProps) {
  const api = useTRPC();
  const [captionHighlightId] = useQueryState("c", parseAsInteger);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
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
  const captionIndexByKey = useMemo(() => {
    const indexMap = new Map<string, number>();
    allCaptions.forEach((caption, index) => {
      indexMap.set(getCaptionKey(caption), index);
    });
    return indexMap;
  }, [allCaptions]);
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
  const isVirtualizedListLayout = !useParagraphLayout;
  const rowVirtualizer = useVirtualizer({
    count: isVirtualizedListLayout ? captions.length : 0,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  // Index from URL caption id param (initial scroll target, based on allCaptions)
  const targetCaptionIndex = useMemo(() => {
    if (allCaptions.length === 0 || captionHighlightId == null) {
      return -1;
    }
    return allCaptions.findIndex(
      (caption) => caption.id === captionHighlightId
    );
  }, [allCaptions, captionHighlightId]);

  // Index of the caption matching the current playback time (based on allCaptions)
  const currentCaptionIndex = useMemo(() => {
    if (
      useParagraphLayout ||
      allCaptions.length === 0 ||
      mediaCurrentTime == null
    ) {
      return -1;
    }
    return findCaptionIndexAtTime(allCaptions, mediaCurrentTime);
  }, [allCaptions, mediaCurrentTime, useParagraphLayout]);

  // Scroll to the URL timestamp caption on load
  const scrollToCaptionIndex = useCallback(
    (index: number) => {
      const el = subtitleRefs.current[index];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (isVirtualizedListLayout && !isSearching) {
        rowVirtualizer.scrollToIndex(index, { align: "center" });
      }
    },
    [isSearching, isVirtualizedListLayout, rowVirtualizer]
  );

  useEffect(() => {
    if (useParagraphLayout || targetCaptionIndex < 0) {
      return;
    }
    const id = setTimeout(() => {
      scrollToCaptionIndex(targetCaptionIndex);
    }, 100);
    return () => clearTimeout(id);
  }, [targetCaptionIndex, scrollToCaptionIndex, useParagraphLayout]);

  // Auto-scroll as playback progresses
  const prevCaptionIndexRef = useRef(-1);
  const currentCaptionIndexRef = useRef(-1);
  useEffect(() => {
    currentCaptionIndexRef.current = currentCaptionIndex;
  }, [currentCaptionIndex]);

  useEffect(() => {
    if (
      useParagraphLayout ||
      !autoScroll ||
      currentCaptionIndex < 0 ||
      currentCaptionIndex === prevCaptionIndexRef.current
    ) {
      return;
    }
    prevCaptionIndexRef.current = currentCaptionIndex;
    scrollToCaptionIndex(currentCaptionIndex);
  }, [
    autoScroll,
    currentCaptionIndex,
    scrollToCaptionIndex,
    useParagraphLayout,
  ]);

  // Keep the active caption centered when switching layouts.
  useEffect(() => {
    const activeIndex = currentCaptionIndexRef.current;
    if (useParagraphLayout || layoutSwitchKey === 0 || activeIndex < 0) {
      return;
    }
    const id = setTimeout(() => {
      scrollToCaptionIndex(activeIndex);
    }, 0);
    return () => clearTimeout(id);
  }, [layoutSwitchKey, scrollToCaptionIndex, useParagraphLayout]);

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
    <Card className="flex h-full flex-col gap-0 border border-border py-0">
      <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-2">
        <span className="font-medium text-sm">Captions</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Auto-scroll</span>
            <Switch
              checked={autoScroll}
              onCheckedChange={setAutoScroll}
              size="sm"
            />
          </div>
          <Button
            aria-label={
              isParagraphLayout
                ? "Switch to list layout"
                : "Switch to paragraph layout"
            }
            onClick={() => {
              setIsParagraphLayout((current) => !current);
              setLayoutSwitchKey((current) => current + 1);
            }}
            size="icon-sm"
            title={isParagraphLayout ? "Paragraph layout" : "List layout"}
            variant={isParagraphLayout ? "secondary" : "ghost"}
          >
            {isParagraphLayout ? (
              <WrapText className="size-4" />
            ) : (
              <ListIcon className="size-4" />
            )}
          </Button>
        </div>
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
      <div
        className="min-h-0 flex-1 overflow-y-auto bg-secondary p-0"
        ref={scrollContainerRef}
      >
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
            <CaptionsParagraphLayout
              autoScroll={autoScroll}
              captions={captions}
              chapterByCaptionIndex={chapterByCaptionIndex}
              onAutoScrollChange={setAutoScroll}
              targetCaptionIndex={targetCaptionIndex}
            />
          ) : (
            <div
              className="relative py-2"
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const index = virtualRow.index;
                const caption = captions[index];
                const allIndex = isSearching
                  ? (captionIndexByKey.get(getCaptionKey(caption)) ?? -1)
                  : index;
                const chapter = chapterByCaptionIndex[index];
                const previousChapter = chapterByCaptionIndex[index - 1];
                const showChapterTitle =
                  Boolean(chapter?.title) &&
                  chapter?.title !== previousChapter?.title;

                return (
                  <div
                    className="absolute top-0 left-0 w-full px-2"
                    key={`${caption.startTime}-${caption.endTime}`}
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
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
                      ref={(el) => {
                        if (allIndex >= 0) {
                          subtitleRefs.current[allIndex] = el;
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="w-10 shrink-0 font-mono text-[10px] opacity-75 group-data-highlight:text-amber-600 group-data-selected:text-primary">
                        {formatTime(caption.startTime)}
                      </span>
                      <span
                        className="group-data-highlight:text-amber-900 group-data-selected:text-foreground dark:group-data-highlight:text-amber-100 [&_mark]:rounded [&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_mark]:text-foreground dark:[&_mark]:bg-yellow-600"
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
      </div>
    </Card>
  );
}
