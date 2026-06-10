"use client";

import { Clock, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRelativeTime } from "@/hooks/use-relative-time";
import { primaryThumbnail, type SearchItem } from "@/lib/search/search-item";

export function MySearchCard({ search }: { search: SearchItem }) {
  const relativeTime = useRelativeTime(new Date(search.createdAt));
  const thumbnail = primaryThumbnail(search.results);
  const keywords = search.keywords ?? [];
  const title = search.title ?? "Untitled search";

  return (
    <Link className="block" href={`/search/${search.id}`}>
      <Card className="group cursor-pointer gap-0 overflow-hidden py-0 transition-shadow hover:shadow-lg">
        <div className="relative aspect-video w-full bg-muted">
          {thumbnail?.thumbnail ? (
            <Image
              alt={thumbnail.title}
              className="object-cover transition-opacity group-hover:opacity-90"
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              src={thumbnail.thumbnail}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Search className="size-8 opacity-30" />
            </div>
          )}
        </div>
        <CardContent className="space-y-2 px-4 pt-3 pb-4">
          <h3 className="line-clamp-2 font-semibold text-sm leading-snug">
            {title}
          </h3>
          {keywords.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {keywords.slice(0, 4).map((kw) => (
                <span
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                  key={kw}
                >
                  #{kw}
                </span>
              ))}
            </div>
          ) : null}
          <p className="flex items-center gap-1 text-muted-foreground text-xs">
            <Clock className="size-3 shrink-0" />
            {relativeTime}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function MySearchCardSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <Skeleton className="aspect-video w-full rounded-none" />
      <CardContent className="space-y-2 px-4 pt-3 pb-4">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-14 rounded" />
          <Skeleton className="h-5 w-12 rounded" />
        </div>
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}
