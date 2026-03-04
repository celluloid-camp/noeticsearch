"use client";

import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SearchIcon, XIcon } from "lucide-react";
import {
  MediaActionTypes,
  useMediaDispatch,
  useMediaSelector,
} from "media-chrome/react/media-store";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type RouterOutput, useTRPC } from "@/lib/trpc/client";
import { Card, CardFooter, CardHeader } from "./ui/card";
import { Input } from "./ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { Skeleton } from "./ui/skeleton";
import { Switch } from "./ui/switch";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

type CaptionsPanelProps = {
  videoId: string;
  searchId?: string;
};

export type Caption = RouterOutput["video"]["getCaptions"][number];
const CAPTION_KEY_SEPARATOR = "::";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function parseTimeInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parts = trimmed.split(":");
  if (parts.length === 1) {
    const seconds = Number(parts[0]);
    if (Number.isNaN(seconds) || seconds < 0) {
      return null;
    }
    return seconds;
  }

  if (parts.length === 2) {
    const [minutesPart, secondsPart] = parts;
    const minutes = Number(minutesPart);
    const seconds = Number(secondsPart);
    if (
      Number.isNaN(minutes) ||
      Number.isNaN(seconds) ||
      minutes < 0 ||
      seconds < 0
    ) {
      return null;
    }
    return minutes * 60 + seconds;
  }

  return null;
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

export function CaptionsPanel({ videoId, searchId }: CaptionsPanelProps) {
  const api = useTRPC();
  const t = useTranslations();
  const [captionHighlightId] = useQueryState("c");

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const subtitleRefs = useRef<Record<number, HTMLSpanElement | null>>({});
  const [autoScroll, setAutoScroll] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "transcript" | "search" | "marked"
  >("transcript");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [timestampFrom, setTimestampFrom] = useState("");
  const [timestampTo, setTimestampTo] = useState("");

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

  const captionsQueryOptions = searchId
    ? api.video.getCaptionBySearchId.queryOptions({
        id: videoId,
        searchId,
      })
    : api.video.getCaptions.queryOptions({ id: videoId });
  const { data: allCaptions = [] } = useQuery(captionsQueryOptions);

  const { data: chapters = [] } = useQuery(
    api.video.getChapters.queryOptions({ id: videoId })
  );
  const searchCaptionsQueryOptions = searchId
    ? api.video.getCaptionBySearchId.queryOptions({
        id: videoId,
        searchId,
        keywords: debouncedSearch,
      })
    : api.video.getCaptions.queryOptions({
        id: videoId,
        keywords: debouncedSearch,
      });
  const { data: searchResults, isFetching: isFetchingSearch } = useQuery({
    ...searchCaptionsQueryOptions,
    enabled: isSearching,
  });

  const baseCaptions = isSearching ? (searchResults ?? []) : allCaptions;
  const fromSeconds = useMemo(
    () => parseTimeInput(timestampFrom),
    [timestampFrom]
  );
  const toSeconds = useMemo(() => parseTimeInput(timestampTo), [timestampTo]);
  const captions = useMemo(() => {
    if (fromSeconds == null && toSeconds == null) {
      return baseCaptions;
    }
    return baseCaptions.filter((caption) => {
      const start = caption.startTime;
      if (fromSeconds != null && start < fromSeconds) {
        return false;
      }
      if (toSeconds != null && start > toSeconds) {
        return false;
      }
      return true;
    });
  }, [baseCaptions, fromSeconds, toSeconds]);
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
  const rowVirtualizer = useVirtualizer({
    count: captions.length,
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
    if (allCaptions.length === 0 || mediaCurrentTime == null) {
      return -1;
    }
    return findCaptionIndexAtTime(allCaptions, mediaCurrentTime);
  }, [allCaptions, mediaCurrentTime]);

  // Scroll to the URL timestamp caption on load
  const scrollToCaptionIndex = useCallback(
    (index: number) => {
      const el = subtitleRefs.current[index];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      if (!isSearching) {
        rowVirtualizer.scrollToIndex(index, { align: "center" });
      }
    },
    [isSearching, rowVirtualizer]
  );

  useEffect(() => {
    if (targetCaptionIndex < 0) {
      return;
    }
    const id = setTimeout(() => {
      scrollToCaptionIndex(targetCaptionIndex);
    }, 100);
    return () => clearTimeout(id);
  }, [targetCaptionIndex, scrollToCaptionIndex]);

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
    scrollToCaptionIndex(currentCaptionIndex);
  }, [autoScroll, currentCaptionIndex, scrollToCaptionIndex]);

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
      <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-4">
        <div className="flex flex-col gap-2">
          <span className="font-medium text-sm">
            {t("captions.transcription")}
          </span>
        </div>
      </CardHeader>
      <Tabs
        className="self-end"
        onValueChange={(value) =>
          setActiveTab(value as "transcript" | "search" | "marked")
        }
        value={activeTab}
      >
        <TabsList className="h-7" variant="line">
          <TabsTrigger value="transcript">
            {t("captions.transcript")}
          </TabsTrigger>
          <TabsTrigger value="search">{t("captions.search")}</TabsTrigger>
          <TabsTrigger value="marked">{t("captions.marked")}</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="border-b px-2 py-1.5">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <InputGroup className="h-8">
              <InputGroupAddon>
                <SearchIcon className="text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-8 text-xs"
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={
                  t("captions.findPlaceholder") || "Find in transcription..."
                }
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
          <div className="flex items-center gap-1">
            <Input
              className="h-8 w-14 appearance-none bg-background px-2 text-[11px] [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
              onChange={(e) => setTimestampFrom(e.target.value)}
              placeholder="mm:ss"
              type="time"
              value={timestampFrom}
            />
            <span className="text-[11px] text-muted-foreground">–</span>
            <Input
              className="h-8 w-14 appearance-none bg-background px-2 text-[11px] [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
              onChange={(e) => setTimestampTo(e.target.value)}
              placeholder="mm:ss"
              type="time"
              value={timestampTo}
            />
          </div>
        </div>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto p-0"
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
                  data-index={virtualRow.index}
                  key={virtualRow.key}
                  ref={rowVirtualizer.measureElement}
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
                    <span className="w-10 shrink-0 font-mono text-xs opacity-75 group-data-highlight:text-amber-600 group-data-selected:text-primary">
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
        ) : (
          <div className="py-8 text-center text-muted-foreground text-sm">
            {isSearching ? t("captions.noMatching") : t("captions.noSubtitles")}
          </div>
        )}
      </div>
      <CardFooter className="flex items-center justify-end border-t px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {t("captions.autoScroll")}
          </span>
          <Switch
            checked={autoScroll}
            onCheckedChange={setAutoScroll}
            size="sm"
          />
        </div>
      </CardFooter>
    </Card>
  );
}
