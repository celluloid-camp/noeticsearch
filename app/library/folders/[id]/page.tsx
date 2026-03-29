"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, FolderOpen, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useLocale, useTranslations } from "next-intl";
import { AddToFolderButton } from "@/components/add-to-folder-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/lib/trpc/client";

export default function FolderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const api = useTRPC();

  const folderId = params.id as string;

  const [sortBy, setSortBy] = useQueryState(
    "sort",
    parseAsStringEnum(["recent", "published", "title"]).withDefault("recent")
  );

  const { data, isLoading, error } = useQuery(
    api.folder.getVideos.queryOptions({ folderId, sortBy })
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 border-border border-b px-4 pt-4 pb-4">
          <Skeleton className="size-8" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
            <Card className="overflow-hidden p-0" key={i}>
              <Skeleton className="aspect-video w-full" />
              <CardContent className="px-4 pt-0 pb-4">
                <Skeleton className="mb-2 h-4 w-full" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-14" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">{error.message}</p>
      </div>
    );
  }

  const folder = data?.folder;
  const videos = data?.videos ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 border-border border-b px-4 pt-4 pb-4">
        <div className="flex items-center gap-3">
          <Button
            asChild
            size="icon"
            type="button"
            variant="ghost"
          >
            <Link href="/library/folders">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h2 className="font-mono font-semibold text-lg">
            {folder?.name ?? t("folders.folderDetail")}
          </h2>
        </div>
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
      </div>

      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8">
          <Empty>
            <EmptyMedia variant="icon">
              <FolderOpen />
            </EmptyMedia>
            <EmptyContent>
              <EmptyTitle>{t("folders.noVideosInFolder")}</EmptyTitle>
              <EmptyDescription>
                {t("folders.noVideosInFolderDescription")}
              </EmptyDescription>
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {videos.map((video) => (
            <Card
              className="group cursor-pointer overflow-hidden p-0 transition-shadow hover:shadow-lg"
              key={video.id}
              onClick={() => router.push(`/video/${video.id}`)}
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
                <div
                  className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <AddToFolderButton videoId={video.id} />
                </div>
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
                        {video.author ?? t("video.unknownAuthor")}
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
      )}
    </div>
  );
}
