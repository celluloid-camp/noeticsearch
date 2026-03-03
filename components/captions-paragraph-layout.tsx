"use client";

import {
  MediaActionTypes,
  useMediaDispatch,
  useMediaSelector,
} from "media-chrome/react/media-store";
import type React from "react";
import { useEffect, useMemo, useRef } from "react";
import type { RouterOutput } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type Caption = RouterOutput["video"]["getCaptions"][number];
type Chapter = RouterOutput["video"]["getChapters"][number];

interface CaptionsParagraphLayoutProps {
  autoScroll: boolean;
  captions: Caption[];
  chapterByCaptionIndex: Array<Chapter | null>;
  onAutoScrollChange: (enabled: boolean) => void;
  targetCaptionIndex: number;
}

const PARAGRAPH_BREAK_GAP_SECONDS = 0.4;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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

export function CaptionsParagraphLayout({
  autoScroll,
  captions,
  chapterByCaptionIndex,
  onAutoScrollChange,
  targetCaptionIndex,
}: CaptionsParagraphLayoutProps) {
  const mediaCurrentTime = useMediaSelector((state) => state.mediaCurrentTime);
  const dispatch = useMediaDispatch();
  const subtitleRefs = useRef<Record<number, HTMLSpanElement | null>>({});

  const currentCaptionIndex = useMemo(() => {
    if (captions.length === 0 || mediaCurrentTime == null) {
      return -1;
    }
    return findCaptionIndexAtTime(captions, mediaCurrentTime);
  }, [captions, mediaCurrentTime]);

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

  const handleSubtitleClick = (
    caption: Caption,
    event: React.MouseEvent | React.KeyboardEvent
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (autoScroll) {
      onAutoScrollChange(false);
    }
    dispatch({
      type: MediaActionTypes.MEDIA_PLAY_REQUEST,
    });
    dispatch({
      type: MediaActionTypes.MEDIA_SEEK_REQUEST,
      detail: caption.startTime,
    });
  };

  return (
    <div className="px-4 py-4 text-sm leading-relaxed">
      {captions.map((caption, index) => {
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
          Boolean(chapter?.title) && chapter?.title !== previousChapter?.title;
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
            {needsParagraphBreak && <span aria-hidden className="block h-3" />}
            <span
              className={cn(
                "group inline cursor-pointer rounded-sm border border-transparent px-0 py-0.5 leading-snug transition-colors hover:border-primary data-selected:border-primary data-highlight:bg-amber-500/20 data-selected:bg-primary/15",
                inlineSpacingClass
              )}
              data-highlight={index === targetCaptionIndex || undefined}
              data-selected={
                (index === currentCaptionIndex &&
                  index !== targetCaptionIndex) ||
                undefined
              }
              onClick={(event) => {
                handleSubtitleClick(caption, event);
              }}
              ref={(el) => {
                subtitleRefs.current[index] = el;
              }}
              role="button"
              tabIndex={0}
              title={formatTime(caption.startTime)}
            >
              <span
                className="inline group-data-highlight:text-amber-900 group-data-selected:text-foreground dark:group-data-highlight:text-amber-100 [&_mark]:rounded [&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_mark]:text-foreground dark:[&_mark]:bg-yellow-600"
                dangerouslySetInnerHTML={{
                  __html: caption.headline ?? caption.text,
                }}
              />
            </span>
          </span>
        );
      })}
    </div>
  );
}
