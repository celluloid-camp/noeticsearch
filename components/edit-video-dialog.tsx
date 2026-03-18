"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Film, RefreshCw, Trash2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import React from "react";
import { useForm } from "react-hook-form";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { VideoById } from "@/lib/trpc/client";
import { useTRPC } from "@/lib/trpc/client";
import DeleteVideoDialog from "./delete-video-dialog";

const editVideoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  isPublic: z.boolean(),
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

function VideoThumbnail({ src, title, onSync, isSyncing }: VideoThumbnailProps) {
  const [error, setError] = React.useState(false);
  const [cacheBuster, setCacheBuster] = React.useState(0);
  const t = useTranslations();
  const showFallback = error || !src || src === "/placeholder.svg";

  const handleSync = () => {
    setError(false);
    setCacheBuster((n) => n + 1);
    onSync();
  };

  const imgSrc = cacheBuster > 0 ? `${src}${src.includes("?") ? "&" : "?"}v=${cacheBuster}` : src;

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
  const { toast } = useToast();
  const api = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<EditVideoSchema>({
    resolver: zodResolver(editVideoSchema),
    defaultValues: {
      title: video.title,
      isPublic: video.isPublic,
    },
  });

  const updateVideo = useMutation(
    api.video.update.mutationOptions({
      onSuccess: () => {
        toast({
          title: t("video.editVideo"),
          description:
            t("common.success") || "The video has been successfully updated.",
        });
        queryClient.invalidateQueries({
          queryKey: [["video", "getById"], { input: { id: video.id } }],
        });
        queryClient.invalidateQueries({
          queryKey: [["video", "getAll"]],
        });
        setOpen(false);
        onSuccess?.();
      },
      onError: (error) => {
        toast({
          title: t("common.error") || "Error",
          description: error.message || "Failed to update video",
          variant: "destructive",
        });
      },
    })
  );

  const syncThumbnail = useMutation(
    api.video.syncThumbnail.mutationOptions({
      onSuccess: () => {
        toast({ title: t("video.syncThumbnail"), description: t("common.success") });
        queryClient.invalidateQueries({
          queryKey: [["video", "getById"], { input: { id: video.id } }],
        });
        queryClient.invalidateQueries({
          queryKey: [["video", "getAll"]],
        });
      },
      onError: (error) => {
        toast({
          title: t("common.error") || "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    })
  );

  const onSubmit = (data: EditVideoSchema) => {
    updateVideo.mutate({
      id: video.id,
      title: data.title,
      isPublic: data.isPublic,
    });
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
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>{t("video.publicField")}</FormLabel>
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
                  <Button disabled={updateVideo.isPending} type="submit">
                    {updateVideo.isPending
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
