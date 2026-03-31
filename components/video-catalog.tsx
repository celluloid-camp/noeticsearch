"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, FolderPlus, Loader2, PlusIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useLocale, useTranslations } from "use-intl/react";
import { AddToFolderDialog } from "@/components/add-to-folder-dialog";
import { CreateFolderDialog } from "@/components/create-folder-dialog";
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
import { useSession } from "@/lib/auth-client";
import { type RouterOutput, useTRPC } from "@/lib/trpc/client";
import { Button } from "./ui/button";

interface VideoCatalogProps {
  filter?: "public" | "all" | "mine";
  title?: string;
}

type CatalogVideo = RouterOutput["video"]["getAll"]["videos"][number];

function VideoCard({
  isLoggedIn,
  locale,
  onVideoClick,
  t,
  video,
}: {
  isLoggedIn: boolean;
  locale: string;
  onVideoClick: (video: { id: string }) => void;
  t: ReturnType<typeof useTranslations>;
  video: CatalogVideo;
}) {
  return (
    <Card
      className="group cursor-pointer overflow-hidden p-0 transition-shadow hover:shadow-lg"
      key={video.id}
      onClick={() => onVideoClick(video)}
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
        {isLoggedIn && (
          <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
            <AddToFolderDialog videoId={video.id}>
              <Button
                className="h-7 px-2"
                onClick={(e) => e.stopPropagation()}
                size="sm"
                type="button"
                variant="secondary"
              >
                <FolderPlus className="size-3.5" />
              </Button>
            </AddToFolderDialog>
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
                {(video.author || video.title || "?").charAt(0).toUpperCase()}
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
  );
}

export default function VideoCatalog({
  filter = "all",
  title = "Videos",
}: VideoCatalogProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const api = useTRPC();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const [sortBy, setSortBy] = useQueryState(
    "sort",
    parseAsStringEnum(["recent", "published", "title"]).withDefault("recent")
  );
  const mineVideosQuery = useQuery({
    ...api.folder.listMineWithVideos.queryOptions({ sortBy }),
    enabled: filter === "mine",
  });
  const videosQuery = useQuery({
    ...api.video.getAll.queryOptions({
      filter,
      sortBy,
    }),
    enabled: filter !== "mine",
  });

  const handleVideoClick = (video: { id: string }) => {
    router.push(`/video/${video.id}`);
  };

  const isLoading =
    filter === "mine" ? mineVideosQuery.isLoading : videosQuery.isLoading;
  const error = filter === "mine" ? mineVideosQuery.error : videosQuery.error;

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

  if (filter === "mine") {
    const folders = mineVideosQuery.data?.folders ?? [];
    const uncategorized = mineVideosQuery.data?.uncategorized ?? [];
    const foldersWithVideos = folders.filter(
      (folder) => folder.videos.length > 0
    );
    const hasAnyVideos =
      uncategorized.length > 0 || foldersWithVideos.length > 0;

    if (!hasAnyVideos) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t("video.noVideosFound")}</EmptyTitle>
              <EmptyDescription>
                {t("video.noVideosMine") ||
                  "You haven't imported any videos yet."}
              </EmptyDescription>
            </EmptyHeader>
            <Link href="/import">
              <Button size="lg" variant="secondary">
                <PlusIcon className="size-4" />
                <span>{t("video.addVideo")}</span>
              </Button>
            </Link>
            <EmptyContent />
          </Empty>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 border-border border-b px-4 pt-4 pb-4">
          <h2 className="font-mono font-semibold text-lg">
            {t("nav.myVideos")}
          </h2>
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
            <CreateFolderDialog />
            <Link href="/import">
              <Button size="lg">
                <PlusIcon className="size-4" />
                <span>{t("video.addVideo")}</span>
              </Button>
            </Link>
          </div>
        </div>

        {foldersWithVideos.map((folder) => (
          <section className="space-y-3 px-4" key={folder.id}>
            <div className="flex items-center justify-between gap-2">
              <Link href={`/library/folders/${folder.id}`}>
                <h3 className="font-semibold text-base hover:underline">
                  {folder.name}
                </h3>
              </Link>
              <p className="text-muted-foreground text-xs">
                {t("folders.videosCount", { count: folder.videos.length })}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {folder.videos.map((video) => (
                <VideoCard
                  isLoggedIn={isLoggedIn}
                  key={`${folder.id}-${video.id}`}
                  locale={locale}
                  onVideoClick={handleVideoClick}
                  t={t}
                  video={video}
                />
              ))}
            </div>
          </section>
        ))}

        {uncategorized.length > 0 ? (
          <section className="space-y-3 px-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">
                {t("folders.uncategorizedVideos")}
              </h3>
              <p className="text-muted-foreground text-xs">
                {t("folders.videosCount", { count: uncategorized.length })}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {uncategorized.map((video) => (
                <VideoCard
                  isLoggedIn={isLoggedIn}
                  key={video.id}
                  locale={locale}
                  onVideoClick={handleVideoClick}
                  t={t}
                  video={video}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  const videos = videosQuery.data?.videos || [];

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
          <VideoCard
            isLoggedIn={isLoggedIn}
            key={video.id}
            locale={locale}
            onVideoClick={handleVideoClick}
            t={t}
            video={video}
          />
        ))}
      </div>
    </div>
  );
}

export function VideoCatalogSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 border-border border-b px-4 pt-4 pb-4">
        <Skeleton className="h-6 w-36" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
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
