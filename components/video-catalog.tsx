"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2, PlusIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useLocale, useTranslations } from "use-intl/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/lib/trpc/client";
import { Button } from "./ui/button";

interface VideoCatalogProps {
  filter?: "public" | "all" | "mine";
  title?: string;
}

export default function VideoCatalog({
  filter = "all",
  title = "Videos",
}: VideoCatalogProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const api = useTRPC();
  const [sortBy, setSortBy] = useQueryState(
    "sort",
    parseAsStringEnum(["recent", "published", "title"]).withDefault("recent")
  );
  const { data, isLoading, error } = useQuery(
    api.video.getAll.queryOptions({
      filter,
      sortBy,
    })
  );

  const handleVideoClick = (video: { id: string }) => {
    router.push(`/video/${video.id}`);
  };

  if (isLoading) {
    return <VideoCatalogSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">
          Failed to load videos: {error.message}
        </p>
      </div>
    );
  }

  const videos = data?.videos || [];

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("video.noVideosFound")}</EmptyTitle>
            <EmptyDescription>
              {filter === "mine"
                ? t("video.noVideosMine") ||
                  "You haven't imported any videos yet."
                : t("video.startImport") ||
                  "Start by importing a video from PeerTube."}
            </EmptyDescription>
          </EmptyHeader>
          {["mine", "all"].includes(filter) ? (
            <Link href="/import">
              <Button size="lg" variant="secondary">
                <PlusIcon className="size-4" />
                <span>{t("video.addVideo")}</span>
              </Button>
            </Link>
          ) : null}
          <EmptyContent />
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 border-border border-b px-4 pt-4 pb-4">
        <h2 className="font-mono font-semibold text-lg">{title}</h2>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg" variant="outline">
                {sortBy === "recent"
                  ? t("video.sortRecent")
                  : sortBy === "published"
                    ? t("video.sortPublished")
                    : t("video.sortName")}
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setSortBy("recent")}>
                {t("video.sortRecent")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSortBy("published")}>
                {t("video.sortPublished")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSortBy("title")}>
                {t("video.sortName")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {["mine", "all"].includes(filter) ? (
            <Link href="/import">
              <Button size="lg">
                <PlusIcon className="size-4" />
                <span>{t("video.addVideo")}</span>
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {videos.map((video) => (
          <Card
            className="cursor-pointer overflow-hidden p-0 transition-shadow hover:shadow-lg"
            key={video.id}
            onClick={() => handleVideoClick(video)}
          >
            <div className="relative aspect-video w-full bg-muted">
              {video.thumbnail ? (
                <Image
                  alt={video.title}
                  className="object-cover"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  src={video.thumbnail}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
            </div>
            <CardContent className="px-4 pt-0 pb-4">
              <h3 className="mb-1 line-clamp-2 font-semibold text-sm">
                {video.title}
              </h3>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Avatar>
                    {video.authorAvatar ? (
                      <AvatarImage
                        alt={video.author ?? ""}
                        className="object-cover"
                        src={video.authorAvatar}
                      />
                    ) : null}
                    <AvatarFallback className="text-[10px]">
                      {(video.author || video.title || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="max-w-40 truncate text-muted-foreground text-xs capitalize">
                      {video.author ?? "Unknown author"}
                    </span>
                    <span className="max-w-40 truncate text-[11px] text-muted-foreground">
                      #{video.instanceName}
                    </span>
                  </div>
                </div>
                <p className="shrink-0 text-[11px] text-muted-foreground">
                  {new Date(video.addedDate).toLocaleDateString(locale, {
                    dateStyle: "short",
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function VideoCatalogSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card className="overflow-hidden p-0" key={i}>
          <Skeleton className="aspect-video w-full" />
          <CardContent className="space-y-2 px-4 pt-0 pb-4">
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
