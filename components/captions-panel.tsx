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
import { Button } from "./ui/button";
import { Card, CardHeader } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { ScrollArea } from "./ui/scroll-area";

interface CaptionsPanelProps {
  highlightTimestamp?: number | null;
  videoId: string;
}

export type Caption = RouterOutput["video"]["getCaptions"][number];

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
  const subtitleRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const [autoScroll, setAutoScroll] = useState(true);
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

  const { data: searchResults } = useQuery({
    ...api.video.getCaptions.queryOptions({
      id: videoId,
      search: debouncedSearch,
    }),
    enabled: isSearching,
  });

  const captions = isSearching ? (searchResults ?? []) : allCaptions;

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
        {captions.length > 0 ? (
          <div className="py-4">
            {captions.map((caption, index) => {
              const allIndex = isSearching
                ? allCaptions.findIndex(
                    (c) =>
                      c.startTime === caption.startTime &&
                      c.endTime === caption.endTime
                  )
                : index;

              return (
                <div key={`${caption.startTime}-${caption.endTime}`}>
                  <button
                    className="group flex w-full cursor-pointer items-start gap-2 px-4 py-2 text-left text-xs transition-colors data-highlight:bg-amber-500/10 data-selected:bg-primary/10"
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
                    tabIndex={0}
                    type="button"
                  >
                    <p className="mb-1 font-mono text-[10px] opacity-75 group-data-highlight:text-amber-600 group-data-selected:text-primary">
                      {formatTime(caption.startTime)}
                    </p>

                    <div className="flex w-6 shrink-0 justify-center pt-0.5">
                      <div className="size-2 shrink-0 rounded-full bg-muted-foreground group-data-highlight:bg-amber-500 group-data-selected:bg-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {caption.headline ? (
                        <p
                          className="line-clamp-3 text-xs leading-snug [&_mark]:rounded-sm [&_mark]:bg-amber-200 [&_mark]:px-0.5 dark:[&_mark]:bg-amber-800"
                          dangerouslySetInnerHTML={{ __html: caption.headline }}
                        />
                      ) : (
                        <p className="line-clamp-3 text-xs leading-snug group-data-highlight:text-amber-900 group-data-selected:text-foreground dark:group-data-highlight:text-amber-100">
                          {caption.text}
                        </p>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground text-sm">
            {isSearching ? "No matching captions" : "No subtitles available"}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
