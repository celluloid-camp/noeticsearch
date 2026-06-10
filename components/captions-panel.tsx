"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useDebouncedCallback } from "@tanstack/react-pacer";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  EllipsisVertical,
  LinkIcon,
  Mic2,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UserPlus,
  XIcon,
} from "lucide-react";
import {
  MediaActionTypes,
  useMediaDispatch,
  useMediaSelector,
} from "media-chrome/react/media-store";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useQueryState } from "nuqs";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { type RouterOutput, useTRPC } from "@/lib/trpc/client";
import { StoryboardImage } from "./storyboard-image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Card, CardFooter, CardHeader } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { Skeleton } from "./ui/skeleton";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";

type CaptionsPanelProps = {
  canEdit?: boolean;
  searchId?: string;
  videoId: string;
};

export type Caption = RouterOutput["video"]["getCaptions"][number];
type Chapter = RouterOutput["video"]["getChapters"][number];
type Speaker = RouterOutput["video"]["getSpeakers"][number];
const CAPTION_KEY_SEPARATOR = "::";

function findSpeakerAtTime(speakers: Speaker[], time: number): Speaker | null {
  return (
    speakers.find((speaker) => time >= speaker.start && time <= speaker.end) ??
    null
  );
}

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

const editCaptionSchema = z.object({
  text: z.string().min(1, "Caption text is required"),
});
type EditCaptionSchema = z.infer<typeof editCaptionSchema>;

interface EditCaptionDialogProps {
  caption: Caption | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  videoId: string;
}

function EditCaptionDialog({
  caption,
  open,
  onOpenChange,
  videoId,
}: EditCaptionDialogProps) {
  const t = useTranslations();
  const api = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<EditCaptionSchema>({
    resolver: zodResolver(editCaptionSchema),
    defaultValues: { text: caption?.text ?? "" },
  });

  useEffect(() => {
    if (caption) {
      form.reset({ text: caption.text });
    }
  }, [caption, form]);

  const updateCaption = useMutation(
    api.video.updateCaption.mutationOptions({
      onSuccess: () => {
        toast.success(t("captions.editCaptionSuccess"));
        queryClient.invalidateQueries({
          queryKey: [["video", "getCaptions"], { input: { id: videoId } }],
        });
        queryClient.invalidateQueries({
          queryKey: [["video", "getCaptionBySearchId"]],
        });
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(t("captions.editCaptionError"), {
          description: error.message,
        });
      },
    })
  );

  const onSubmit = (data: EditCaptionSchema) => {
    if (!caption) {
      return;
    }
    updateCaption.mutate({ captionId: caption.id, text: data.text });
  };

  const isDirty = form.formState.isDirty;
  const isDisabled = !isDirty || updateCaption.isPending;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("captions.editCaptionTitle")}</DialogTitle>
          {caption && (
            <DialogDescription>
              {t("captions.timeRange")}: {formatTime(caption.startTime)} –{" "}
              {formatTime(caption.endTime)}
            </DialogDescription>
          )}
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("captions.captionText")}</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[100px] resize-y" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                {t("common.cancel")}
              </Button>
              <Button disabled={isDisabled} type="submit">
                {updateCaption.isPending
                  ? t("common.loading")
                  : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteCaptionDialogProps {
  caption: Caption | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  videoId: string;
}

function DeleteCaptionDialog({
  caption,
  open,
  onOpenChange,
  videoId,
}: DeleteCaptionDialogProps) {
  const t = useTranslations();
  const api = useTRPC();
  const queryClient = useQueryClient();

  const deleteCaption = useMutation(
    api.video.deleteCaption.mutationOptions({
      onSuccess: () => {
        toast.success(t("captions.deleteCaptionSuccess"));
        queryClient.invalidateQueries({
          queryKey: [["video", "getCaptions"], { input: { id: videoId } }],
        });
        queryClient.invalidateQueries({
          queryKey: [["video", "getCaptionBySearchId"]],
        });
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(t("captions.deleteCaptionError"), {
          description: error.message,
        });
        onOpenChange(false);
      },
    })
  );

  const handleDelete = () => {
    if (!caption) {
      return;
    }
    deleteCaption.mutate({ captionId: caption.id });
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("captions.deleteCaptionTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("captions.deleteCaptionDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteCaption.isPending}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteCaption.isPending}
            onClick={handleDelete}
          >
            {deleteCaption.isPending ? t("common.loading") : t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const editChapterSchema = z.object({
  title: z.string().min(1, "Chapter title is required"),
  timecode: z
    .string()
    .min(1, "Start time is required")
    .refine((value) => parseTimeInput(value) !== null, "Invalid time"),
});
type EditChapterSchema = z.infer<typeof editChapterSchema>;

interface ChapterDialogProps {
  chapter: Chapter | null;
  defaultTimecode?: string;
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  open: boolean;
  videoId: string;
}

function ChapterDialog({
  chapter,
  defaultTimecode = "00:00",
  mode,
  open,
  onOpenChange,
  videoId,
}: ChapterDialogProps) {
  const t = useTranslations();
  const api = useTRPC();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const isCreate = mode === "create";

  const form = useForm<EditChapterSchema>({
    resolver: zodResolver(editChapterSchema),
    defaultValues: {
      title: "",
      timecode: defaultTimecode,
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    if (isCreate) {
      form.reset({ title: "", timecode: defaultTimecode });
      return;
    }
    if (chapter) {
      form.reset({
        title: chapter.title,
        timecode: formatTime(chapter.timecode),
      });
    }
  }, [open, isCreate, chapter, defaultTimecode, form]);

  const invalidateChapters = () => {
    queryClient.invalidateQueries({
      queryKey: [["video", "getChapters"], { input: { id: videoId } }],
    });
  };

  const createChapter = useMutation(
    api.video.createChapter.mutationOptions({
      onSuccess: () => {
        toast.success(t("captions.addChapterSuccess"));
        invalidateChapters();
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(t("captions.addChapterError"), {
          description: error.message,
        });
      },
    })
  );

  const updateChapter = useMutation(
    api.video.updateChapter.mutationOptions({
      onSuccess: () => {
        toast.success(t("captions.editChapterSuccess"));
        invalidateChapters();
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(t("captions.editChapterError"), {
          description: error.message,
        });
      },
    })
  );

  const deleteChapter = useMutation(
    api.video.deleteChapter.mutationOptions({
      onSuccess: () => {
        toast.success(t("captions.deleteChapterSuccess"));
        invalidateChapters();
        setDeleteConfirmOpen(false);
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(t("captions.deleteChapterError"), {
          description: error.message,
        });
        setDeleteConfirmOpen(false);
      },
    })
  );

  const onSubmit = (data: EditChapterSchema) => {
    const timecode = parseTimeInput(data.timecode);
    if (timecode === null) {
      form.setError("timecode", {
        message: t("captions.chapterTimecodeInvalid"),
      });
      return;
    }

    if (isCreate) {
      createChapter.mutate({
        videoId,
        title: data.title,
        timecode,
      });
      return;
    }

    if (!chapter) {
      return;
    }

    updateChapter.mutate({
      chapterId: chapter.id,
      title: data.title,
      timecode,
    });
  };

  const handleDelete = () => {
    if (!chapter) {
      return;
    }
    deleteChapter.mutate({ chapterId: chapter.id });
  };

  const isDirty = form.formState.isDirty;
  const isPending = isCreate
    ? createChapter.isPending
    : updateChapter.isPending;
  const isDisabled = isCreate
    ? !form.formState.isValid || isPending
    : !isDirty || isPending;

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isCreate
                ? t("captions.addChapterTitle")
                : t("captions.editChapterTitle")}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("captions.chapterTitle")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timecode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("captions.chapterTimecode")}</FormLabel>
                    <FormControl>
                      <Input placeholder="mm:ss" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter
                className={
                  isCreate ? "gap-2 sm:justify-end" : "gap-2 sm:justify-between"
                }
              >
                {!isCreate && (
                  <Button
                    disabled={deleteChapter.isPending}
                    onClick={() => setDeleteConfirmOpen(true)}
                    type="button"
                    variant="destructive"
                  >
                    {t("captions.deleteChapter")}
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={() => onOpenChange(false)}
                    type="button"
                    variant="outline"
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button disabled={isDisabled} type="submit">
                    {isPending ? t("common.loading") : t("common.save")}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={setDeleteConfirmOpen} open={deleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("captions.deleteChapterTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("captions.deleteChapterDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteChapter.isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteChapter.isPending}
              onClick={handleDelete}
            >
              {deleteChapter.isPending
                ? t("common.loading")
                : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const editSpeakerSchema = z
  .object({
    name: z.string().min(1, "Speaker name is required"),
    start: z
      .string()
      .min(1, "Start time is required")
      .refine((value) => parseTimeInput(value) !== null, "Invalid time"),
    end: z
      .string()
      .min(1, "End time is required")
      .refine((value) => parseTimeInput(value) !== null, "Invalid time"),
  })
  .refine(
    (data) => {
      const start = parseTimeInput(data.start);
      const end = parseTimeInput(data.end);
      return start !== null && end !== null && end >= start;
    },
    { message: "End time must be after start time", path: ["end"] }
  );
type EditSpeakerSchema = z.infer<typeof editSpeakerSchema>;

interface SpeakerDialogProps {
  defaultEnd?: string;
  defaultStart?: string;
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  open: boolean;
  speaker: Speaker | null;
  videoId: string;
}

function SpeakerDialog({
  defaultEnd = "00:00",
  defaultStart = "00:00",
  mode,
  open,
  onOpenChange,
  speaker,
  videoId,
}: SpeakerDialogProps) {
  const t = useTranslations();
  const api = useTRPC();
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const isCreate = mode === "create";

  const form = useForm<EditSpeakerSchema>({
    resolver: zodResolver(editSpeakerSchema),
    defaultValues: {
      name: "",
      start: defaultStart,
      end: defaultEnd,
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    if (isCreate) {
      form.reset({ name: "", start: defaultStart, end: defaultEnd });
      return;
    }
    if (speaker) {
      form.reset({
        name: speaker.name,
        start: formatTime(speaker.start),
        end: formatTime(speaker.end),
      });
    }
  }, [open, isCreate, speaker, defaultStart, defaultEnd, form]);

  const invalidateSpeakers = () => {
    queryClient.invalidateQueries({
      queryKey: [["video", "getSpeakers"], { input: { id: videoId } }],
    });
  };

  const createSpeaker = useMutation(
    api.video.createSpeaker.mutationOptions({
      onSuccess: () => {
        toast.success(t("captions.addSpeakerSuccess"));
        invalidateSpeakers();
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(t("captions.addSpeakerError"), {
          description: error.message,
        });
      },
    })
  );

  const updateSpeaker = useMutation(
    api.video.updateSpeaker.mutationOptions({
      onSuccess: () => {
        toast.success(t("captions.editSpeakerSuccess"));
        invalidateSpeakers();
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(t("captions.editSpeakerError"), {
          description: error.message,
        });
      },
    })
  );

  const deleteSpeaker = useMutation(
    api.video.deleteSpeaker.mutationOptions({
      onSuccess: () => {
        toast.success(t("captions.deleteSpeakerSuccess"));
        invalidateSpeakers();
        setDeleteConfirmOpen(false);
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(t("captions.deleteSpeakerError"), {
          description: error.message,
        });
        setDeleteConfirmOpen(false);
      },
    })
  );

  const onSubmit = (data: EditSpeakerSchema) => {
    const start = parseTimeInput(data.start);
    const end = parseTimeInput(data.end);
    if (start === null || end === null) {
      return;
    }

    if (isCreate) {
      createSpeaker.mutate({
        videoId,
        name: data.name,
        start,
        end,
      });
      return;
    }

    if (!speaker) {
      return;
    }

    updateSpeaker.mutate({
      speakerId: speaker.id,
      name: data.name,
      start,
      end,
    });
  };

  const handleDelete = () => {
    if (!speaker) {
      return;
    }
    deleteSpeaker.mutate({ speakerId: speaker.id });
  };

  const isDirty = form.formState.isDirty;
  const isPending = isCreate
    ? createSpeaker.isPending
    : updateSpeaker.isPending;
  const isDisabled = isCreate
    ? !form.formState.isValid || isPending
    : !isDirty || isPending;

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isCreate
                ? t("captions.addSpeakerTitle")
                : t("captions.editSpeakerTitle")}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("captions.speakerName")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("captions.speakerStart")}</FormLabel>
                      <FormControl>
                        <Input placeholder="mm:ss" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("captions.speakerEnd")}</FormLabel>
                      <FormControl>
                        <Input placeholder="mm:ss" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter
                className={
                  isCreate ? "gap-2 sm:justify-end" : "gap-2 sm:justify-between"
                }
              >
                {!isCreate && (
                  <Button
                    disabled={deleteSpeaker.isPending}
                    onClick={() => setDeleteConfirmOpen(true)}
                    type="button"
                    variant="destructive"
                  >
                    {t("captions.deleteSpeaker")}
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={() => onOpenChange(false)}
                    type="button"
                    variant="outline"
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button disabled={isDisabled} type="submit">
                    {isPending ? t("common.loading") : t("common.save")}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={setDeleteConfirmOpen} open={deleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("captions.deleteSpeakerTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("captions.deleteSpeakerDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSpeaker.isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSpeaker.isPending}
              onClick={handleDelete}
            >
              {deleteSpeaker.isPending
                ? t("common.loading")
                : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CaptionActionsMenu({
  canEdit,
  caption,
  onAddChapter,
  onAddSpeaker,
  onDelete,
  onEdit,
  onShare,
}: {
  canEdit: boolean;
  caption: Caption;
  onAddChapter: (caption: Caption) => void;
  onAddSpeaker: (caption: Caption) => void;
  onDelete: (caption: Caption) => void;
  onEdit: (caption: Caption) => void;
  onShare: (caption: Caption) => void;
}) {
  const t = useTranslations();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={t("captions.captionActions")}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          type="button"
        >
          <EllipsisVertical className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {canEdit && (
          <>
            <DropdownMenuItem onSelect={() => onEdit(caption)}>
              <PencilIcon />
              {t("captions.editCaption")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAddChapter(caption)}>
              <PlusIcon />
              {t("captions.addChapter")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAddSpeaker(caption)}>
              <UserPlus />
              {t("captions.addSpeaker")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onDelete(caption)}
              variant="destructive"
            >
              <Trash2Icon />
              {t("captions.deleteCaption")}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onSelect={() => onShare(caption)}>
          <LinkIcon />
          {t("captions.shareCaption")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CaptionsPanel({
  videoId,
  searchId,
  canEdit = false,
}: CaptionsPanelProps) {
  const api = useTRPC();
  const t = useTranslations();
  const [captionHighlightId] = useQueryState("c");

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const subtitleRefs = useRef<Record<number, HTMLSpanElement | null>>({});
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [timestampFrom, setTimestampFrom] = useState("");
  const [timestampTo, setTimestampTo] = useState("");

  const [editCaption, setEditCaption] = useState<Caption | null>(null);
  const [deleteCaption, setDeleteCaption] = useState<Caption | null>(null);
  const [editChapter, setEditChapter] = useState<Chapter | null>(null);
  const [chapterDialogMode, setChapterDialogMode] = useState<
    "create" | "edit" | null
  >(null);
  const [createChapterTimecode, setCreateChapterTimecode] = useState("00:00");
  const [editSpeaker, setEditSpeaker] = useState<Speaker | null>(null);
  const [speakerDialogMode, setSpeakerDialogMode] = useState<
    "create" | "edit" | null
  >(null);
  const [createSpeakerStart, setCreateSpeakerStart] = useState("00:00");
  const [createSpeakerEnd, setCreateSpeakerEnd] = useState("00:00");
  const [shareCaption, setShareCaption] = useState<Caption | null>(null);

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
  const mediaDuration = useMediaSelector((state) => state.mediaDuration);
  const dispatch = useMediaDispatch();
  const hasSeekedToTargetRef = useRef(false);

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
  const { data: speakers = [] } = useQuery(
    api.video.getSpeakers.queryOptions({ id: videoId })
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
  const speakerByCaptionIndex = useMemo(() => {
    if (captions.length === 0 || speakers.length === 0) {
      return captions.map(() => null);
    }

    return captions.map((caption) =>
      findSpeakerAtTime(speakers, caption.startTime)
    );
  }, [captions, speakers]);
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
    hasSeekedToTargetRef.current = false;
  }, [captionHighlightId]);

  // Seek to the shared caption once the media store has metadata. Do not wait
  // for mediaLoading (readyState >= 3) — PeerTube only reaches that after play.
  useEffect(() => {
    if (targetCaptionIndex < 0 || hasSeekedToTargetRef.current) {
      return;
    }
    if (
      mediaDuration == null ||
      !Number.isFinite(mediaDuration) ||
      mediaDuration <= 0
    ) {
      return;
    }

    const caption = allCaptions[targetCaptionIndex];
    if (!caption) {
      return;
    }

    hasSeekedToTargetRef.current = true;
    scrollToCaptionIndex(targetCaptionIndex);

    dispatch({
      type: MediaActionTypes.MEDIA_SEEK_REQUEST,
      detail: caption.startTime,
    });
    dispatch({
      type: MediaActionTypes.MEDIA_PLAY_REQUEST,
    });

    const playRetry = window.setTimeout(() => {
      dispatch({
        type: MediaActionTypes.MEDIA_PLAY_REQUEST,
      });
    }, 400);

    return () => window.clearTimeout(playRetry);
  }, [
    targetCaptionIndex,
    allCaptions,
    mediaDuration,
    scrollToCaptionIndex,
    dispatch,
  ]);

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

  const getShareUrl = () => {
    if (!shareCaption) {
      return "";
    }
    const url = new URL(window.location.href);
    url.searchParams.set("c", shareCaption.id);
    return url.toString();
  };

  const handleCopyShareLink = () => {
    const shareUrl = getShareUrl();
    if (!shareUrl) {
      return;
    }
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        toast.success(t("captions.shareCaptionSuccess"));
      })
      .catch(() => {
        toast.error(t("captions.shareCaptionError"));
      });
  };

  const handleEditCaption = (caption: Caption) => {
    setEditCaption(caption);
  };

  const handleDeleteCaption = (caption: Caption) => {
    setDeleteCaption(caption);
  };

  const handleShareCaption = (caption: Caption) => {
    setShareCaption(caption);
  };

  const handleEditChapter = (chapter: Chapter, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditChapter(chapter);
    setChapterDialogMode("edit");
  };

  const handleAddChapterFromCaption = (caption: Caption) => {
    setEditChapter(null);
    setCreateChapterTimecode(formatTime(caption.startTime));
    setChapterDialogMode("create");
  };

  const handleAddSpeakerFromCaption = (caption: Caption) => {
    setEditSpeaker(null);
    setCreateSpeakerStart(formatTime(caption.startTime));
    setCreateSpeakerEnd(formatTime(caption.endTime));
    setSpeakerDialogMode("create");
  };

  const handleEditSpeaker = (speaker: Speaker, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditSpeaker(speaker);
    setSpeakerDialogMode("edit");
  };

  const handleEditDialogChange = (open: boolean) => {
    if (!open) {
      setEditCaption(null);
    }
  };

  const handleDeleteDialogChange = (open: boolean) => {
    if (!open) {
      setDeleteCaption(null);
    }
  };

  const handleEditChapterDialogChange = (open: boolean) => {
    if (!open) {
      setEditChapter(null);
      setChapterDialogMode(null);
      setCreateChapterTimecode("00:00");
    }
  };

  const handleEditSpeakerDialogChange = (open: boolean) => {
    if (!open) {
      setEditSpeaker(null);
      setSpeakerDialogMode(null);
      setCreateSpeakerStart("00:00");
      setCreateSpeakerEnd("00:00");
    }
  };

  const handleShareDialogChange = (open: boolean) => {
    if (!open) {
      setShareCaption(null);
    }
  };

  return (
    <>
      <Card className="flex h-full flex-col gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-4">
          <span className="font-medium text-sm">
            {t("captions.transcription")}
          </span>
        </CardHeader>
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
                const speaker = speakerByCaptionIndex[index];
                const previousSpeaker = speakerByCaptionIndex[index - 1];
                const showSpeaker =
                  Boolean(speaker?.name) && speaker?.id !== previousSpeaker?.id;

                return (
                  <div
                    className="absolute top-0 left-0 w-full px-2"
                    data-index={virtualRow.index}
                    key={virtualRow.key}
                    ref={rowVirtualizer.measureElement}
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    {showChapterTitle && chapter && (
                      <div className="relative my-3 text-center before:absolute before:inset-x-0 before:top-1/2 before:h-px before:-translate-y-1/2 before:bg-border">
                        <span className="relative z-10 inline-flex items-center gap-1 bg-secondary px-2 font-medium text-muted-foreground text-sm">
                          {chapter.title}
                          {canEdit && (
                            <button
                              aria-label={t("captions.editChapter")}
                              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              onClick={(e) => handleEditChapter(chapter, e)}
                              type="button"
                            >
                              <PencilIcon className="size-3" />
                            </button>
                          )}
                        </span>
                      </div>
                    )}
                    {showSpeaker && speaker && (
                      <div className="my-2 flex items-center gap-1.5 px-2">
                        <Mic2 className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="font-medium text-muted-foreground text-sm">
                          {speaker.name}
                        </span>
                        {canEdit && (
                          <button
                            aria-label={t("captions.editSpeaker")}
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={(e) => handleEditSpeaker(speaker, e)}
                            type="button"
                          >
                            <PencilIcon className="size-3" />
                          </button>
                        )}
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
                        className="min-w-0 flex-1 group-data-highlight:text-amber-900 group-data-selected:text-foreground dark:group-data-highlight:text-amber-100 [&_mark]:rounded [&_mark]:bg-yellow-200 [&_mark]:px-0.5 [&_mark]:text-foreground dark:[&_mark]:bg-yellow-600"
                        dangerouslySetInnerHTML={{
                          __html: caption.headline ?? caption.text,
                        }}
                      />
                      <span className="shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                        <CaptionActionsMenu
                          canEdit={canEdit}
                          caption={caption}
                          onAddChapter={handleAddChapterFromCaption}
                          onAddSpeaker={handleAddSpeakerFromCaption}
                          onDelete={handleDeleteCaption}
                          onEdit={handleEditCaption}
                          onShare={handleShareCaption}
                        />
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {isSearching
                ? t("captions.noMatching")
                : t("captions.noSubtitles")}
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

      <EditCaptionDialog
        caption={editCaption}
        onOpenChange={handleEditDialogChange}
        open={editCaption !== null}
        videoId={videoId}
      />

      <DeleteCaptionDialog
        caption={deleteCaption}
        onOpenChange={handleDeleteDialogChange}
        open={deleteCaption !== null}
        videoId={videoId}
      />

      <ChapterDialog
        chapter={editChapter}
        defaultTimecode={createChapterTimecode}
        mode={chapterDialogMode ?? "edit"}
        onOpenChange={handleEditChapterDialogChange}
        open={chapterDialogMode !== null}
        videoId={videoId}
      />

      <SpeakerDialog
        defaultEnd={createSpeakerEnd}
        defaultStart={createSpeakerStart}
        mode={speakerDialogMode ?? "edit"}
        onOpenChange={handleEditSpeakerDialogChange}
        open={speakerDialogMode !== null}
        speaker={editSpeaker}
        videoId={videoId}
      />

      <Dialog
        onOpenChange={handleShareDialogChange}
        open={shareCaption !== null}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("captions.shareCaption")}</DialogTitle>
            <DialogDescription>
              {t("captions.shareCaptionDescription")}
            </DialogDescription>
          </DialogHeader>
          {shareCaption ? (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-md border bg-muted">
                <div className="absolute inset-x-0 bottom-2 z-10 flex justify-center px-3">
                  <span className="line-clamp-2 max-w-[92%] rounded bg-black/85 px-2 py-1 text-center text-white text-xs">
                    {shareCaption.text}
                  </span>
                </div>
                {shareCaption.thumbnail?.includes("#sprite=") ? (
                  <StoryboardImage
                    alt={t("captions.shareCaptionThumbnailAlt")}
                    className="aspect-video w-full"
                    src={shareCaption.thumbnail}
                  />
                ) : (
                  <Image
                    alt={t("captions.shareCaptionThumbnailAlt")}
                    className="aspect-video w-full object-cover"
                    height={180}
                    src={shareCaption.thumbnail ?? "/placeholder.svg"}
                    unoptimized
                    width={320}
                  />
                )}
              </div>
              <Input readOnly value={getShareUrl()} />
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setShareCaption(null)} variant="outline">
              {t("common.close")}
            </Button>
            <Button onClick={handleCopyShareLink}>
              {t("captions.copyCaptionLink")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
