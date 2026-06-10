"use client";

import { Clock, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useRelativeTime } from "@/hooks/use-relative-time";
import {
  type SearchItem,
  type SearchThumbnail,
  uniqueThumbnails,
} from "@/lib/search/search-item";

function ThumbnailGrid({ thumbnails }: { thumbnails: SearchThumbnail[] }) {
  const slots = thumbnails.length > 0 ? thumbnails.slice(0, 4) : [];
  const placeholders = Math.max(0, 4 - slots.length);

  return (
    <div className="flex gap-1">
      {slots.map((video) =>
        video.thumbnail ? (
          <div
            className="relative size-10 shrink-0 overflow-hidden rounded bg-muted"
            key={video.id}
          >
            <Image
              alt={video.title}
              className="object-cover"
              fill
              sizes="40px"
              src={video.thumbnail}
            />
          </div>
        ) : (
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded bg-muted"
            key={video.id}
          >
            <Search className="size-3 text-muted-foreground/30" />
          </div>
        )
      )}
      {Array.from({ length: placeholders }).map((_, i) => (
        <div className="size-10 shrink-0 rounded bg-muted" key={`ph-${i}`} />
      ))}
    </div>
  );
}

export function HomeSearchCard({ search }: { search: SearchItem }) {
  const relativeTime = useRelativeTime(new Date(search.createdAt));
  const thumbnails = uniqueThumbnails(search.results);
  const keywords = search.keywords ?? [];

  return (
    <Link
      className="group flex flex-col gap-3 rounded-none border border-border p-4 transition-colors hover:border-foreground/30 hover:bg-muted/30"
      href={`/search/${search.id}`}
    >
      {keywords.length > 0 ? (
        <div className="flex min-h-10 flex-wrap gap-x-2 gap-y-1">
          {keywords.map((kw) => (
            <span
              className="font-mono font-semibold text-foreground/70 text-sm leading-tight"
              key={kw}
            >
              #{kw}
            </span>
          ))}
        </div>
      ) : (
        <div className="min-h-10" />
      )}

      <ThumbnailGrid thumbnails={thumbnails} />

      <div className="flex flex-col gap-2">
        <p className="line-clamp-2 font-medium text-sm leading-snug group-hover:text-foreground/80">
          {search.title ?? "Untitled search"}
        </p>
        <div className="flex items-center gap-2">
          <Avatar className="size-5">
            <AvatarImage
              alt={search.user?.name ?? ""}
              src={search.user?.image ?? ""}
            />
            <AvatarFallback className="text-[10px]">
              {(search.user?.name ?? "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-muted-foreground text-xs">
            {search.user?.name ?? "Anonymous"}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
            <Clock className="size-3" />
            {relativeTime}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function HomeSearchCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex min-h-10 flex-wrap gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex gap-1">
        <Skeleton className="size-10 shrink-0 rounded" />
        <Skeleton className="size-10 shrink-0 rounded" />
        <Skeleton className="size-10 shrink-0 rounded" />
        <Skeleton className="size-10 shrink-0 rounded" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 shrink-0 rounded-full" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="ml-auto h-3 w-12 shrink-0" />
        </div>
      </div>
    </div>
  );
}
