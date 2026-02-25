"use client";

import { useQuery } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useMemo, useRef } from "react";
import { type RouterOutput, useTRPC } from "@/lib/trpc/client";

interface CaptionsPanelProps {
  videoId: string;
  timestamp?: number | null;
}

export type Caption = RouterOutput["video"]["getCaptions"][number];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CaptionsPanel({ videoId, timestamp }: CaptionsPanelProps) {
  const api = useTRPC();
  const subtitleRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const disableAutoScrollFromTimestampRef = useRef(false);
  const { data: captions = [] } = useQuery(
    api.video.getCaptions.queryOptions({ id: videoId })
  );

  // Index of the caption to highlight/scroll to (contains timestamp or closest)
  const targetCaptionIndex = useMemo(() => {
    if (
      captions.length === 0 ||
      timestamp == null ||
      Number.isNaN(Number(timestamp))
    ) {
      return -1;
    }
    const t = Number(timestamp);
    const index = captions.findIndex((c) => t >= c.startTime && t <= c.endTime);
    if (index !== -1) {
      return index;
    }
    return captions.reduce((closest, c, i) => {
      const closestDiff = Math.abs(captions[closest].startTime - t);
      const diff = Math.abs(c.startTime - t);
      return diff < closestDiff ? i : closest;
    }, 0);
  }, [captions, timestamp]);

  // When captions have loaded and we have a timestamp, scroll to that caption
  useEffect(() => {
    if (targetCaptionIndex < 0) {
      return;
    }
    const scrollToCaption = () => {
      const el = subtitleRefs.current[targetCaptionIndex];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    const id = setTimeout(scrollToCaption, 100);
    return () => clearTimeout(id);
  }, [targetCaptionIndex]);

  const handleSubtitleClick = (
    _caption: Caption,
    e: React.MouseEvent | React.KeyboardEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    disableAutoScrollFromTimestampRef.current = false;
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-secondary">
        {/* Captions timeline */}
        <div
          className="min-h-0 flex-1 overflow-y-auto py-4"
          id="transcription-scroll-container"
        >
          {captions.length > 0 ? (
            <div className="min-h-full px-3">
              {captions.map((caption, index) => {
                const isSelected = index === targetCaptionIndex;

                return (
                  <div key={`${caption.startTime}-${caption.endTime}`}>
                    <button
                      className={`flex w-full cursor-pointer items-start gap-3 rounded-r py-2 text-left text-xs transition-colors ${isSelected ? "bg-primary/10" : ""}`}
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
                        subtitleRefs.current[index] = el;
                      }}
                      tabIndex={0}
                      type="button"
                    >
                      <div className="flex w-6 shrink-0 justify-center pt-0.5">
                        <div
                          className={`h-2 w-2 shrink-0 rounded-full ${isSelected ? "bg-primary" : "bg-muted-foreground"}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 font-mono text-[10px] opacity-75">
                          {formatTime(caption.startTime)} →{" "}
                          {formatTime(caption.endTime)}
                        </p>
                        <p className="line-clamp-3 text-xs leading-snug">
                          {caption.text}
                        </p>
                      </div>
                    </button>
                    {/* Line segment between this dot and the next */}
                    {index < captions.length - 1 && (
                      <div className="flex w-full">
                        <div className="flex w-6 shrink-0 justify-center">
                          <div aria-hidden className="h-4 w-px bg-border" />
                        </div>
                        <div className="flex-1" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No subtitles available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
