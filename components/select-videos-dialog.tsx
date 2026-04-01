"use client";

import { ListFilter, Plus, Search, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface SelectVideosDialogVideo {
  id: string;
  isPublic?: boolean;
  thumbnail?: string | null;
  title: string;
}

export interface SelectVideosDialogFolder {
  id: string;
  name: string;
  videoIds: string[];
}

type ScopeFilter = "all" | "public" | "mine";

type TriggerVariant = "compact" | "default";

interface SelectVideosDialogProps {
  folders?: SelectVideosDialogFolder[];
  onOpenChange: (open: boolean) => void;
  onSelectionChange: (ids: string[]) => void;
  open: boolean;
  selectedIds: string[];
  triggerVariant?: TriggerVariant;
  videos: SelectVideosDialogVideo[];
}

function VideoRow({
  checked,
  onCheckedChange,
  video,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  video: SelectVideosDialogVideo;
}) {
  const inputId = `dialog-video-${video.id}`;
  return (
    <label
      className={cn(
        "flex min-w-0 cursor-pointer items-center gap-3 overflow-hidden rounded-md border border-transparent px-2 py-2 hover:border-muted hover:bg-muted/50"
      )}
      htmlFor={inputId}
    >
      <Checkbox
        checked={checked}
        id={inputId}
        onCheckedChange={(value: boolean | "indeterminate") =>
          onCheckedChange(value === true)
        }
      />
      <Image
        alt=""
        className="size-10 shrink-0 rounded object-cover"
        height={40}
        src={video.thumbnail ?? "/placeholder.svg"}
        unoptimized
        width={40}
      />
      <span className="min-w-0 flex-1 text-sm">{video.title}</span>
    </label>
  );
}

function SelectedRow({
  onRemove,
  video,
}: {
  onRemove: () => void;
  video: SelectVideosDialogVideo;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden rounded-md border border-transparent px-2 py-1.5 hover:bg-muted/50">
      <Image
        alt=""
        className="size-8 shrink-0 rounded object-cover"
        height={32}
        src={video.thumbnail ?? "/placeholder.svg"}
        unoptimized
        width={32}
      />
      <span className="min-w-0 flex-1 text-sm">{video.title}</span>
      <Button
        aria-label="Remove"
        className="size-6 shrink-0 p-0"
        onClick={onRemove}
        type="button"
        variant="ghost"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

export function SelectVideosDialog({
  onOpenChange,
  onSelectionChange,
  open,
  selectedIds,
  triggerVariant = "default",
  folders = [],
  videos,
}: SelectVideosDialogProps) {
  const t = useTranslations();
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [filter, setFilter] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("__none__");

  const filteredVideos = useMemo(() => {
    let base = videos;
    if (scope === "public") {
      base = base.filter((video) => video.isPublic === true);
    } else if (scope === "mine") {
      base = base.filter((video) => video.isPublic === false);
    }

    const q = filter.trim().toLowerCase();
    if (!q) {
      return base;
    }
    return base.filter((video) => video.title.toLowerCase().includes(q));
  }, [videos, filter, scope]);

  const selectedVideos = useMemo(() => {
    const set = new Set(selectedIds);
    return videos.filter((v) => set.has(v.id));
  }, [videos, selectedIds]);

  const handleToggle = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((_id) => _id !== id));
    }
  };

  const handleRemove = (id: string) => {
    onSelectionChange(selectedIds.filter((_id) => _id !== id));
  };

  const handleSelectFolder = (folderId: string) => {
    setSelectedFolderId(folderId);
    if (folderId === "__none__") {
      return;
    }
    const folder = folders.find((item) => item.id === folderId);
    if (!folder) {
      return;
    }
    onSelectionChange(folder.videoIds);
  };

  const previewVideos = selectedVideos.slice(
    0,
    triggerVariant === "compact" ? 3 : 4
  );
  const isCompact = triggerVariant === "compact";

  const triggerContent =
    isCompact && previewVideos.length > 0 ? (
      <div className="flex items-center gap-1">
        {previewVideos.map((video) => (
          <div
            className="group relative shrink-0 overflow-hidden rounded-sm border border-border bg-muted"
            key={video.id}
          >
            <Image
              alt=""
              className="size-7 object-cover"
              height={28}
              src={video.thumbnail ?? "/placeholder.svg"}
              unoptimized
              width={28}
            />
            <Button
              aria-label={`Remove ${video.title}`}
              className="absolute -top-0.5 -right-0.5 size-4 shrink-0 rounded-full p-0 opacity-90 hover:opacity-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRemove(video.id);
              }}
              type="button"
              variant="secondary"
            >
              <X className="size-2.5" />
            </Button>
          </div>
        ))}
        <span className="truncate text-[11px] text-muted-foreground">
          {selectedVideos.length} {t("video.selected") || "selected"}
        </span>
      </div>
    ) : isCompact ? (
      <div className="flex items-center gap-1.5">
        <ListFilter className="size-3.5 shrink-0" />
        <span className="text-xs">{t("video.selectVideos")}</span>
      </div>
    ) : previewVideos.length > 0 ? (
      <div className="flex flex-col items-start gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {previewVideos.map((video) => (
            <div
              className="group relative shrink-0 overflow-hidden rounded-md border border-border bg-muted ring-1 ring-border"
              key={video.id}
            >
              <Image
                alt=""
                className="size-14 object-cover"
                height={56}
                src={video.thumbnail ?? "/placeholder.svg"}
                unoptimized
                width={56}
              />
              <Button
                aria-label={`Remove ${video.title}`}
                className="absolute top-0 right-0 size-6 shrink-0 rounded-tr rounded-bl p-0 opacity-80 hover:opacity-100"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleRemove(video.id);
                }}
                type="button"
                variant="secondary"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <span className="truncate text-xs/relaxed">
          {selectedVideos.length > 0
            ? `${selectedVideos.length} ${t("video.selected") || "selected"}`
            : ""}
        </span>
      </div>
    ) : (
      <div className="flex aspect-square w-24 shrink-0 flex-col items-center justify-center gap-1.5 rounded-md border border-muted-foreground/40 border-dashed bg-muted/30 text-muted-foreground transition-colors hover:border-muted-foreground/60 hover:bg-muted/50">
        <Plus className="size-5 shrink-0" />
        <span className="text-xs/relaxed">Select videos</span>
      </div>
    );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogTrigger asChild>
        <div
          className={cn(
            "flex cursor-pointer items-center rounded-md transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isCompact
              ? "gap-1.5 px-2 py-1.5"
              : "-mx-1 mt-1.5 w-full flex-col items-start gap-1.5 px-1 py-1"
          )}
        >
          {triggerContent}
        </div>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] min-h-[60vh] flex-col gap-4 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("video.selectVideos")}</DialogTitle>
          <DialogDescription>
            {t("video.selectVideosDescription") ||
              "Filter and choose which videos to include in this search."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Left: scope + filter + all videos */}
          <div className="flex min-h-0 min-w-0 flex-col gap-2">
            <Select onValueChange={handleSelectFolder} value={selectedFolderId}>
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue placeholder={t("folders.selectFolder")} />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="__none__">
                  {t("folders.noFolder")}
                </SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                onChange={(event) => setFilter(event.target.value)}
                placeholder={
                  t("video.filterPlaceholder") || "Filter by title..."
                }
                value={filter}
              />
              <InputGroupAddon align="inline-end">
                <ToggleGroup
                  className="flex flex-nowrap"
                  onValueChange={(value) => {
                    const next = (value as ScopeFilter | null) ?? "all";
                    setScope(next);
                  }}
                  type="single"
                  value={scope}
                  variant="outline"
                >
                  <ToggleGroupItem
                    aria-label={t("video.allVideos")}
                    asChild
                    className="border-none"
                    value="all"
                  >
                    <InputGroupButton
                      size="xs"
                      variant={scope === "all" ? "secondary" : "ghost"}
                    >
                      {t("video.all")}
                    </InputGroupButton>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    aria-label={t("nav.publicVideos")}
                    asChild
                    className="border-none"
                    value="public"
                  >
                    <InputGroupButton
                      size="xs"
                      variant={scope === "public" ? "secondary" : "ghost"}
                    >
                      Public
                    </InputGroupButton>
                  </ToggleGroupItem>
                  <ToggleGroupItem aria-label="My videos" asChild value="mine">
                    <InputGroupButton
                      className="border-none"
                      size="xs"
                      variant={scope === "mine" ? "secondary" : "ghost"}
                    >
                      Mine
                    </InputGroupButton>
                  </ToggleGroupItem>
                </ToggleGroup>
              </InputGroupAddon>
            </InputGroup>
            <ScrollArea className="min-h-0 flex-1 rounded-md border">
              <div className="min-w-0 space-y-0.5 p-2">
                {filteredVideos.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground text-sm">
                    {videos.length === 0
                      ? "No videos available. Import videos first."
                      : "No videos match the filter."}
                  </p>
                ) : (
                  filteredVideos.map((video) => {
                    const checked = selectedIds.includes(video.id);
                    return (
                      <VideoRow
                        checked={checked}
                        key={video.id}
                        onCheckedChange={(c) => handleToggle(video.id, c)}
                        video={video}
                      />
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
          {/* Right: selected videos */}
          <div className="flex min-h-0 min-w-0 flex-col gap-2">
            <p className="shrink-0 font-medium text-muted-foreground text-xs">
              Selected ({selectedVideos.length})
            </p>
            <ScrollArea className="min-h-0 flex-1 rounded-md border">
              <div className="min-w-0 space-y-0.5 p-2">
                {selectedVideos.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground text-sm">
                    No videos selected.
                  </p>
                ) : (
                  selectedVideos.map((video) => {
                    return (
                      <SelectedRow
                        key={video.id}
                        onRemove={() => handleRemove(video.id)}
                        video={video}
                      />
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter showCloseButton={false}>
          <Button onClick={() => onOpenChange(false)}>
            {t("common.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
