"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { VideoPreviewCard } from "@/components/import-link/video-preview-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  buildPeerTubeWatchUrl,
  fetchPeerTubeVideo,
} from "@/lib/peertube-client";
import { useTRPC } from "@/lib/trpc/client";

const confirmFormSchema = z.object({
  isPublic: z.boolean(),
  folderId: z.string(),
});

type ConfirmFormSchema = z.infer<typeof confirmFormSchema>;

export interface ImportVideoConfirmFormInput {
  baseUrl: string;
  folderId?: string;
  videoId: string;
  videoPassword?: string;
}

interface ImportVideoConfirmFormProps {
  baseUrl: string;
  onSuccess?: (video: { id: string }) => void;
  videoId: string;
  videoPassword?: string;
}

export function ImportVideoConfirmForm({
  videoId,
  baseUrl,
  videoPassword,
  onSuccess,
}: ImportVideoConfirmFormProps) {
  const api = useTRPC();
  const t = useTranslations("import");
  const tGlobal = useTranslations();
  const { toast } = useToast();
  const watchUrl = buildPeerTubeWatchUrl(baseUrl, videoId);

  const {
    data: videoInfo,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["peertube-video-preview", videoId, baseUrl, videoPassword ?? ""],
    queryFn: () => fetchPeerTubeVideo(watchUrl, { password: videoPassword }),
    staleTime: 60_000,
  });

  const form = useForm<ConfirmFormSchema>({
    resolver: zodResolver(confirmFormSchema),
    defaultValues: { isPublic: false, folderId: "__none__" },
  });

  const { data: folders } = useQuery(api.folder.listMine.queryOptions());

  const importVideo = useMutation(
    api.video.import.mutationOptions({
      onSuccess: (video) => {
        onSuccess?.(video);
      },
      onError: (err) => {
        toast({
          title: t("importFailedTitle"),
          description: err.message ?? t("importFailedDescription"),
          variant: "destructive",
        });
      },
    })
  );

  const preview = videoInfo
    ? {
        title: videoInfo.title,
        description: videoInfo.description,
        thumbnail: videoInfo.thumbnail,
        videoId: videoInfo.videoId,
        baseUrl: videoInfo.baseUrl,
        captions: videoInfo.captions,
      }
    : null;

  const hasCaptions = preview?.captions && preview.captions.length > 0;
  const isDisabled = importVideo.isPending || !preview || !hasCaptions;

  const onSubmit = (data: ConfirmFormSchema) => {
    importVideo.mutate({
      url: watchUrl,
      isPublic: data.isPublic,
      videoPassword,
      folderId: data.folderId === "__none__" ? undefined : data.folderId,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center border-l p-8">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !preview) {
    return (
      <div className="flex h-full flex-col justify-center border-l p-6">
        <p className="text-destructive text-sm">
          {error instanceof Error ? error.message : t("failedToLoadVideoInfo")}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full border-l">
      <Form {...form}>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <Card className="flex flex-col justify-between border-none bg-transparent shadow-none ring-0">
            <CardContent className="flex flex-col gap-4">
              <VideoPreviewCard preview={preview} />
              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>{t("publicVideo")}</FormLabel>
                      <FormDescription className="text-xs">
                        {t("makeVideoVisibleDescription")}
                      </FormDescription>
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
              <FormField
                control={form.control}
                name="folderId"
                render={({ field }) => (
                  <FormItem className="rounded-lg border p-4">
                    <div className="space-y-2">
                      <FormLabel>{tGlobal("folders.selectFolder")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9 w-full text-sm">
                            <SelectValue
                              placeholder={tGlobal("folders.noFolder")}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent align="start">
                          <SelectItem value="__none__">
                            {tGlobal("folders.noFolder")}
                          </SelectItem>
                          {(folders ?? []).map((folder) => (
                            <SelectItem key={folder.id} value={folder.id}>
                              {folder.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
            <CardContent className="pt-0">
              <div className="flex justify-end">
                <Button disabled={isDisabled} size="lg" type="submit">
                  {importVideo.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("importing")}
                    </>
                  ) : (
                    t("importVideo")
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
