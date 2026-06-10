"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Film, RefreshCw, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { VideoById } from "@/lib/trpc/client";
import { useTRPC } from "@/lib/trpc/client";
import DeleteVideoDialog from "./delete-video-dialog";

const editVideoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  isPublic: z.boolean(),
  folderId: z.string(),
});

type EditVideoSchema = z.infer<typeof editVideoSchema>;

interface EditVideoDialogProps {
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  open?: boolean;
  video: VideoById;
}

interface VideoThumbnailProps {
  isSyncing: boolean;
  onSync: () => void;
  src: string;
  title: string;
}

function VideoThumbnail({
  src,
  title,
  onSync,
  isSyncing,
}: VideoThumbnailProps) {
  const [error, setError] = React.useState(false);
  const [cacheBuster, setCacheBuster] = React.useState(0);
  const t = useTranslations();
  const showFallback = error || !src || src === "/placeholder.svg";

  const handleSync = () => {
    setError(false);
    setCacheBuster((n) => n + 1);
    onSync();
  };

  const imgSrc =
    cacheBuster > 0
      ? `${src}${src.includes("?") ? "&" : "?"}v=${cacheBuster}`
      : src;

  return (
    <div className="flex w-48 shrink-0 flex-col gap-2">
      {showFallback ? (
        <div className="flex aspect-video w-full items-center justify-center rounded-md bg-muted">
          <Film className="size-8 text-muted-foreground" />
        </div>
      ) : (
        <div className="relative aspect-video w-full overflow-hidden rounded-md">
          <Image
            alt={title}
            className="object-cover"
            fill
            onError={() => setError(true)}
            sizes="192px"
            src={imgSrc}
          />
        </div>
      )}
      <Button
        className="w-full"
        disabled={isSyncing}
        onClick={handleSync}
        size="sm"
        type="button"
        variant="outline"
      >
        <RefreshCw className={isSyncing ? "animate-spin" : ""} />
        {t("video.syncThumbnail")}
      </Button>
    </div>
  );
}

export function EditVideoDialog({
  children,
  video,
  onOpenChange,
  open: openProp,
  onSuccess,
}: EditVideoDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = (value: boolean) => {
    setInternalOpen(value);
    onOpenChange?.(value);
  };

  const t = useTranslations();
  const api = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<EditVideoSchema>({
    resolver: zodResolver(editVideoSchema),
    defaultValues: {
      title: video.title,
      isPublic: video.isPublic,
      folderId: "__none__",
    },
  });

  const { data: folders, isLoading: foldersLoading } = useQuery({
    ...api.folder.listMine.queryOptions(),
    enabled: open,
  });

  const { data: folderIds, isLoading: folderIdsLoading } = useQuery({
    ...api.folder.getFolderIdsForVideo.queryOptions({ videoId: video.id }),
    enabled: open,
  });

  const currentFolderId = folderIds?.[0] ?? "__none__";

  React.useEffect(() => {
    if (open) {
      form.reset({
        title: video.title,
        isPublic: video.isPublic,
        folderId: currentFolderId,
      });
    }
  }, [form, open, video.title, video.isPublic, currentFolderId]);

  const updateVideo = useMutation(api.video.update.mutationOptions());

  const syncThumbnail = useMutation(
    api.video.syncThumbnail.mutationOptions({
      onSuccess: () => {
        toast.success(t("video.syncThumbnail"), {
          description: t("common.success"),
        });
        queryClient.invalidateQueries({
          queryKey: [["video", "getById"], { input: { id: video.id } }],
        });
        queryClient.invalidateQueries({
          queryKey: [["video", "getAll"]],
        });
      },
      onError: (error) => {
        toast.error(t("common.error") || "Error", {
          description: error.message,
        });
      },
    })
  );

  const addVideoToFolder = useMutation(api.folder.addVideo.mutationOptions());
  const removeVideoFromFolder = useMutation(
    api.folder.removeVideo.mutationOptions()
  );

  const onSubmit = async (data: EditVideoSchema) => {
    try {
      await updateVideo.mutateAsync({
        id: video.id,
        title: data.title,
        isPublic: data.isPublic,
      });

      const selectedFolderId =
        data.folderId === "__none__" ? null : data.folderId;
      const existingFolderIds = folderIds ?? [];
      const toRemove = existingFolderIds.filter(
        (id) => id !== selectedFolderId
      );

      await Promise.all(
        toRemove.map((folderId) =>
          removeVideoFromFolder.mutateAsync({ folderId, videoId: video.id })
        )
      );

      if (selectedFolderId && !existingFolderIds.includes(selectedFolderId)) {
        await addVideoToFolder.mutateAsync({
          folderId: selectedFolderId,
          videoId: video.id,
        });
      }

      toast.success(t("video.editVideo"), {
        description:
          t("common.success") || "The video has been successfully updated.",
      });
      queryClient.invalidateQueries({
        queryKey: [["video", "getById"], { input: { id: video.id } }],
      });
      queryClient.invalidateQueries({
        queryKey: [["video", "getAll"]],
      });
      queryClient.invalidateQueries({ queryKey: [["folder"]] });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(t("common.error") || "Error", {
        description:
          error instanceof Error ? error.message : "Failed to update video",
      });
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("video.editVideo")}</DialogTitle>
          <DialogDescription>
            {t("video.editDescription") ||
              "Update the video title and visibility settings."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex gap-4">
              <VideoThumbnail
                isSyncing={syncThumbnail.isPending}
                onSync={() => syncThumbnail.mutate({ id: video.id })}
                src={video.thumbnail}
                title={video.title}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("video.titleField")}</FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[72px] resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <div className="space-y-4 rounded-lg border p-4">
                      <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>
                            {t("video.publicField") || t("common.public")}
                          </FormLabel>
                          <p className="text-muted-foreground text-xs">
                            {t("video.publicDescription") ||
                              "Make this video visible to everyone"}
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                      <FormField
                        control={form.control}
                        name="folderId"
                        render={({ field: folderField }) => (
                          <FormItem>
                            <div className="space-y-2">
                              <FormLabel>{t("folders.selectFolder")}</FormLabel>
                              {foldersLoading || folderIdsLoading ? (
                                <p className="text-muted-foreground text-xs">
                                  {t("common.loading")}
                                </p>
                              ) : (
                                <Select
                                  onValueChange={folderField.onChange}
                                  value={folderField.value ?? ""}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-9 w-full text-sm">
                                      <SelectValue
                                        placeholder={t("folders.noFolder")}
                                      />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent align="start">
                                    <SelectItem value="__none__">
                                      {t("folders.noFolder")}
                                    </SelectItem>
                                    {(folders ?? []).map((folder) => (
                                      <SelectItem
                                        key={folder.id}
                                        value={folder.id}
                                      >
                                        {folder.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <div className="flex w-full items-center justify-between gap-2">
                <DeleteVideoDialog video={video}>
                  <Button size="sm" type="button" variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("common.delete")}
                  </Button>
                </DeleteVideoDialog>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setOpen(false)}
                    type="button"
                    variant="outline"
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    disabled={
                      updateVideo.isPending ||
                      addVideoToFolder.isPending ||
                      removeVideoFromFolder.isPending
                    }
                    type="submit"
                  >
                    {updateVideo.isPending ||
                    addVideoToFolder.isPending ||
                    removeVideoFromFolder.isPending
                      ? t("common.loading")
                      : t("common.save")}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
