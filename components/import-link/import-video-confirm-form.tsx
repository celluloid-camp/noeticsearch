"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  buildPeerTubeWatchUrl,
  fetchPeerTubeVideo,
} from "@/lib/peertube-client";
import { useTRPC } from "@/lib/trpc/client";

const confirmFormSchema = z.object({
  isPublic: z.boolean(),
});

type ConfirmFormSchema = z.infer<typeof confirmFormSchema>;

export interface ImportVideoConfirmFormInput {
  baseUrl: string;
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
    defaultValues: { isPublic: false },
  });

  const importVideo = useMutation(
    api.video.import.mutationOptions({
      onSuccess: (video) => {
        onSuccess?.(video);
      },
      onError: (err) => {
        toast({
          title: "Import failed",
          description: err.message ?? "Failed to import video.",
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
          {error instanceof Error ? error.message : "Failed to load video info"}
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
                      <FormLabel>Public Video</FormLabel>
                      <FormDescription className="text-xs">
                        Make this video visible to other users. If disabled,
                        only you can see it.
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
            </CardContent>
            <CardContent className="pt-0">
              <div className="flex justify-end">
                <Button disabled={isDisabled} size="lg" type="submit">
                  {importVideo.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Import Video"
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
