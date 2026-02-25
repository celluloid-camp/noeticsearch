"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { fetchPeerTubeVideo, parsePeerTubeUrl } from "@/lib/peertube-client";
import { useTRPC } from "@/lib/trpc/client";

const importVideoSchema = z.object({
  url: z.string().url("Invalid URL format").min(1, "PeerTube URL is required"),
  isPublic: z.boolean(),
  videoId: z.string().optional(),
  baseUrl: z.string().optional(),
  // Preview fields (not submitted, used for UI state)
  videoPreview: z
    .object({
      title: z.string(),
      description: z.string(),
      thumbnail: z.string(),
      videoId: z.string(),
      baseUrl: z.string(),
      captions: z.array(
        z.object({
          language: z.string(),
          fileUrl: z.string(),
        })
      ),
    })
    .nullable()
    .optional(),
  isValidating: z.boolean().optional(),
});

type ImportVideoSchema = z.infer<typeof importVideoSchema>;

export default function ImportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const api = useTRPC();

  const form = useForm<ImportVideoSchema>({
    resolver: zodResolver(importVideoSchema),
    defaultValues: {
      url: "",
      isPublic: false,
      videoPreview: null,
      isValidating: false,
    },
  });

  const urlValue = form.watch("url");
  const videoPreview = form.watch("videoPreview");
  const isValidating = form.watch("isValidating") ?? false;

  // Validate and fetch video info when URL changes
  useEffect(() => {
    const validateUrl = async () => {
      const url = urlValue?.trim();
      if (!url) {
        form.setValue("videoPreview", null);
        form.clearErrors("url");
        form.setValue("isValidating", false);
        return;
      }

      // Basic URL validation
      const parsed = parsePeerTubeUrl(url);
      if (!parsed) {
        form.setValue("videoPreview", null);
        form.setError("url", {
          type: "manual",
          message: "Invalid PeerTube URL format",
        });
        form.setValue("isValidating", false);
        return;
      }

      form.setValue("isValidating", true);
      form.clearErrors("url");

      try {
        const videoInfo = await fetchPeerTubeVideo(url);
        const preview = {
          title: videoInfo.title,
          description: videoInfo.description,
          thumbnail: videoInfo.thumbnail,
          videoId: videoInfo.videoId,
          baseUrl: videoInfo.baseUrl,
          captions: videoInfo.captions,
        };

        form.setValue("videoPreview", preview);
        form.setValue("videoId", videoInfo.videoId);
        form.setValue("baseUrl", videoInfo.baseUrl);

        // Check if video has captions
        if (!videoInfo.captions || videoInfo.captions.length === 0) {
          form.setError("url", {
            type: "manual",
            message:
              "This video does not have any captions available. Videos with captions are required for import.",
          });
        } else {
          form.clearErrors("url");
        }
      } catch (error) {
        form.setValue("videoPreview", null);
        form.setError("url", {
          type: "manual",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch video information",
        });
      } finally {
        form.setValue("isValidating", false);
      }
    };

    // Debounce validation
    const timeoutId = setTimeout(validateUrl, 500);
    return () => clearTimeout(timeoutId);
  }, [urlValue, form]);

  const importVideo = useMutation(
    api.video.import.mutationOptions({
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Video imported successfully!",
        });
        form.reset();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description:
            error.message ||
            "Failed to import video. Please check the PeerTube URL and try again.",
          variant: "destructive",
        });
      },
    })
  );

  const onSubmit = async (data: ImportVideoSchema) => {
    const preview = form.getValues("videoPreview");
    const urlError = form.formState.errors.url;

    if (urlError || !preview) {
      toast({
        title: "Validation Error",
        description:
          urlError?.message || "Please fix the URL errors before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Check if video has captions
    if (!preview.captions || preview.captions.length === 0) {
      toast({
        title: "Validation Error",
        description:
          "This video does not have any captions available. Videos with captions are required for import.",
        variant: "destructive",
      });
      return;
    }

    const videoId = form.getValues("videoId");
    const baseUrl = form.getValues("baseUrl");

    if (!(videoId && baseUrl)) {
      toast({
        title: "Validation Error",
        description:
          "Video information is missing. Please wait for validation to complete.",
        variant: "destructive",
      });
      return;
    }

    const video = await importVideo.mutateAsync({
      url: data.url,
      isPublic: data.isPublic,
      videoId,
      baseUrl,
    });
    router.push(`/video/${video.id}`);
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="font-bold text-3xl text-foreground">
              Import PeerTube Video
            </h1>
            <p className="mt-2 text-muted-foreground">
              Import a video from PeerTube by providing its URL. The video
              metadata and subtitles will be automatically fetched.
            </p>
          </div>

          <Form {...form}>
            <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PeerTube URL</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            placeholder="https://peertube.example.com/w/..."
                            type="url"
                            {...field}
                          />
                          {isValidating && (
                            <div className="absolute top-1/2 right-3 -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                          {!isValidating &&
                            videoPreview &&
                            !form.formState.errors.url && (
                              <div className="absolute top-1/2 right-3 -translate-y-1/2">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              </div>
                            )}
                          {!isValidating && form.formState.errors.url && (
                            <div className="absolute top-1/2 right-3 -translate-y-1/2">
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            </div>
                          )}
                        </div>
                        {videoPreview && (
                          <div className="space-y-3 rounded-lg border bg-muted/50 p-3">
                            <div className="flex gap-3">
                              {videoPreview.thumbnail && (
                                <div className="relative h-16 w-24 shrink-0">
                                  <Image
                                    alt={videoPreview.title}
                                    className="rounded object-cover"
                                    fill
                                    src={videoPreview.thumbnail}
                                    unoptimized
                                  />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 font-medium text-foreground text-sm">
                                  {videoPreview.title}
                                </p>
                                {videoPreview.description && (
                                  <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                                    {videoPreview.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            {videoPreview.captions.length > 0 && (
                              <div className="border-t pt-2">
                                <p className="mb-2 font-medium text-foreground text-xs">
                                  Available Captions (
                                  {videoPreview.captions.length}):
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {videoPreview.captions.map(
                                    (caption, index) => (
                                      <div
                                        className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-foreground text-xs"
                                        key={index}
                                      >
                                        <span className="font-medium">
                                          {caption.language.toUpperCase()}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                            {videoPreview.captions.length === 0 && (
                              <div className="border-t pt-2">
                                <p className="font-medium text-destructive text-xs">
                                  ⚠️ No captions available for this video. Videos
                                  with captions are required for import.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Enter the full URL to your PeerTube video (e.g.,
                      https://peertube.example.com/w/abc123)
                    </FormDescription>
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
                      <FormLabel className="text-base">Public Video</FormLabel>
                      <FormDescription>
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

              <Button
                className="w-full"
                disabled={
                  importVideo.isPending ||
                  isValidating ||
                  !!form.formState.errors.url ||
                  !videoPreview ||
                  !videoPreview.captions ||
                  videoPreview.captions.length === 0
                }
                type="submit"
              >
                {importVideo.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import Video"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
