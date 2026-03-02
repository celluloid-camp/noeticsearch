"use client";

import { IconSearch } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { ImportVideoSchema } from "@/app/import/link/page";
import { ImportVideoConfirmForm } from "@/components/import-link/import-video-confirm-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { fetchPeerTubeVideo } from "@/lib/peertube-client";
import { useTRPC } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const PEERTUBE_INSTANCES = [
  {
    label: "Public Peertube",
    baseUrl: "https://sepiasearch.org",
    thumbnailUrl: "https://sepiasearch.org/theme/framasoft/img/title.svg",
  },
  {
    label: "Celluloid",
    baseUrl: "https://celluloid.cloud",
    thumbnailUrl:
      "https://celluloid.cloud/lazy-static/avatars/195e16ff-c0c2-4ccd-b3d7-3bfe09c55ffd.jpg",
  },
  {
    label: "MSH Paris Nord",
    baseUrl: "https://video.mshparisnord.fr",
    thumbnailUrl:
      "https://video.mshparisnord.fr/lazy-static/avatars/c17d855c-e600-4c89-865d-89c13bb1d5ca.jpg",
  },
] as const;

type PeerTubeBaseUrl = (typeof PEERTUBE_INSTANCES)[number]["baseUrl"];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ImportSearchPage() {
  const router = useRouter();
  const [selectedBaseUrl, setSelectedBaseUrl] = useState<PeerTubeBaseUrl>(
    PEERTUBE_INSTANCES[0].baseUrl
  );
  const [query, setQuery] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState<{
    baseUrl: PeerTubeBaseUrl;
    search: string;
  } | null>(null);
  const [selectedWatchUrl, setSelectedWatchUrl] = useState<string | null>(null);

  const api = useTRPC();
  const { toast } = useToast();
  const { data, isLoading, isError, error } = useQuery({
    ...api.peertubeSearch.searchVideos.queryOptions({
      baseUrl: submittedSearch?.baseUrl ?? PEERTUBE_INSTANCES[0].baseUrl,
      search: submittedSearch?.search ?? "",
    }),
    enabled: !!submittedSearch?.search,
  });

  const confirmForm = useForm<ImportVideoSchema>({
    defaultValues: {
      url: "",
      isPublic: false,
      videoPreview: null,
      isValidating: false,
    },
  });

  const importVideo = useMutation(
    api.video.import.mutationOptions({
      onSuccess: (video) => {
        toast({
          title: "Success",
          description: "Video imported successfully!",
        });
        confirmForm.reset();
        router.push(`/video/${video.id}`);
      },
      onError: (err) => {
        toast({
          title: "Error",
          description:
            err.message ||
            "Failed to import video. Please try again or check the video URL.",
          variant: "destructive",
        });
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      return;
    }
    setSubmittedSearch({ baseUrl: selectedBaseUrl, search: q });
    setSelectedWatchUrl(null);
  };

  const handleResetSearch = () => {
    setQuery("");
    setSubmittedSearch(null);
    setSelectedWatchUrl(null);
    confirmForm.reset({
      url: "",
      isPublic: false,
      videoPreview: null,
      isValidating: false,
    } as ImportVideoSchema);
  };

  const handleSelectVideo = async (watchUrl: string) => {
    if (selectedWatchUrl === watchUrl) {
      setSelectedWatchUrl(null);
      confirmForm.reset({
        url: "",
        isPublic: false,
        videoPreview: null,
        isValidating: false,
      } as ImportVideoSchema);
      return;
    }

    setSelectedWatchUrl(watchUrl);
    confirmForm.setValue("isValidating", true);
    try {
      const info = await fetchPeerTubeVideo(watchUrl);
      confirmForm.reset({
        url: watchUrl,
        isPublic: false,
        videoPreview: {
          title: info.title,
          description: info.description,
          thumbnail: info.thumbnail,
          videoId: info.videoId,
          baseUrl: info.baseUrl,
          captions: info.captions,
        },
        isValidating: false,
      } as ImportVideoSchema);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      confirmForm.reset({
        url: "",
        isPublic: false,
        videoPreview: null,
        isValidating: false,
      } as ImportVideoSchema);
      setSelectedWatchUrl(null);
      toast({
        title: "Error",
        description:
          err instanceof Error
            ? err.message
            : "Failed to load video details for import.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmImport = async (data: ImportVideoSchema) => {
    const preview = confirmForm.getValues("videoPreview");
    const urlError = confirmForm.formState.errors.url;

    if (urlError || !preview) {
      toast({
        title: "Validation Error",
        description:
          urlError?.message ||
          "Video information is missing. Please try selecting the video again.",
        variant: "destructive",
      });
      return;
    }

    if (!preview.captions || preview.captions.length === 0) {
      toast({
        title: "Validation Error",
        description:
          "This video does not have any captions available. Videos with captions are required for import.",
        variant: "destructive",
      });
      return;
    }

    const video = await importVideo.mutateAsync({
      url: data.url,
      isPublic: data.isPublic,
    });
    router.push(`/video/${video.id}`);
  };

  return (
    <div className="flex h-full w-full flex-col md:flex-row md:items-start">
      {!selectedWatchUrl && (
        <div className="h-full w-full border-r md:w-2/5">
          <Card className="border-none bg-transparent shadow-none ring-0">
            <CardHeader>
              <CardTitle>Search PeerTube instances</CardTitle>
              <CardDescription>
                Choose an instance and search for videos to import.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-1 flex-col gap-2">
                  <Label>Instance</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="flex h-14 w-full items-center justify-between"
                        type="button"
                        variant="outline"
                      >
                        {(() => {
                          const selected =
                            PEERTUBE_INSTANCES.find(
                              ({ baseUrl }) => baseUrl === selectedBaseUrl
                            ) ?? PEERTUBE_INSTANCES[0];
                          return (
                            <div className="flex items-center gap-3">
                              {selected.thumbnailUrl ? (
                                <div className="relative h-8 w-8 overflow-hidden rounded-sm bg-muted">
                                  <Image
                                    alt={selected.label}
                                    className="object-cover"
                                    fill
                                    src={selected.thumbnailUrl}
                                    unoptimized
                                  />
                                </div>
                              ) : null}
                              <div className="flex flex-col text-left">
                                <span>{selected.label}</span>
                                <span className="text-muted-foreground text-xs">
                                  {selected.baseUrl}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className=""
                      style={{ width: "var(--radix-popper-anchor-width)" }}
                    >
                      {PEERTUBE_INSTANCES.map(
                        ({ label, baseUrl, thumbnailUrl }) => (
                          <DropdownMenuItem
                            key={baseUrl}
                            onSelect={() =>
                              setSelectedBaseUrl(baseUrl as PeerTubeBaseUrl)
                            }
                          >
                            <div className="flex items-center gap-3">
                              {thumbnailUrl ? (
                                <div className="relative h-8 w-8 overflow-hidden rounded-sm bg-muted">
                                  <Image
                                    alt={label}
                                    className="object-cover"
                                    fill
                                    src={thumbnailUrl}
                                    unoptimized
                                  />
                                </div>
                              ) : null}
                              <div className="flex flex-col text-left">
                                <span>{label}</span>
                                <span className="text-muted-foreground text-xs">
                                  {baseUrl}
                                </span>
                              </div>
                            </div>
                          </DropdownMenuItem>
                        )
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    className="h-12 text-md"
                    id="search"
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Video title or keywords..."
                    type="search"
                    value={query}
                  />
                </div>
              </CardContent>
              <CardFooter className="mt-4 flex justify-end">
                <Button disabled={!query.trim()} size="lg" type="submit">
                  <IconSearch className="size-4 shrink-0" />
                  Search
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {submittedSearch && (
        <div className="w-full border-r md:h-[calc(100vh-5rem)] md:w-1/2">
          <Card className="flex h-full flex-col border-none bg-transparent shadow-none ring-0">
            <CardHeader className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Results</CardTitle>
                <CardDescription>
                  {(() => {
                    if (isLoading) {
                      return "Searching…";
                    }
                    if (isError) {
                      return error?.message ?? "Search failed.";
                    }
                    if (submittedSearch && data) {
                      return `${data.total} video(s) found.`;
                    }
                    return "Results will appear here after you start a search.";
                  })()}
                </CardDescription>
              </div>
              <Button
                disabled={isLoading && !isError}
                onClick={handleResetSearch}
                size="sm"
                variant="ghost"
              >
                Reset
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <ScrollArea className="h-full pr-1">
                {!(submittedSearch || isLoading || isError) && (
                  <p className="text-muted-foreground text-sm">
                    Start by searching for videos in the form on the left.
                  </p>
                )}
                {submittedSearch && isLoading && (
                  <div className="flex justify-center py-8">
                    <Spinner className="size-8" />
                  </div>
                )}
                {submittedSearch && isError && (
                  <p className="text-destructive text-sm">
                    {error instanceof Error ? error.message : "Search failed."}
                  </p>
                )}
                {submittedSearch &&
                  data &&
                  data.data.length === 0 &&
                  !isLoading &&
                  !isError && (
                    <p className="text-muted-foreground text-sm">
                      No videos found. Try different keywords.
                    </p>
                  )}
                {submittedSearch &&
                  data &&
                  data.data.length > 0 &&
                  !isError && (
                    <div className="space-y-2">
                      {data.data.map((v) => {
                        const author =
                          v.channel?.displayName ??
                          v.channel?.name ??
                          v.account?.displayName ??
                          v.account?.name ??
                          null;
                        const isSelected = selectedWatchUrl === v.watchUrl;

                        return (
                          <button
                            className={cn(
                              "flex w-full gap-3 rounded-md border bg-card p-3 text-left text-xs/relaxed transition-colors hover:bg-muted/60",
                              isSelected && "border-ring bg-muted"
                            )}
                            key={v.watchUrl}
                            onClick={() => handleSelectVideo(v.watchUrl)}
                            type="button"
                          >
                            <div className="relative aspect-video w-48 shrink-0 overflow-hidden rounded-md bg-muted">
                              {v.thumbnailUrl ? (
                                <Image
                                  alt={v.name ?? ""}
                                  className="object-cover"
                                  fill
                                  src={v.thumbnailUrl}
                                  unoptimized
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 font-medium text-foreground text-sm">
                                {v.name}
                              </p>
                              {(author || v.duration) && (
                                <p className="mt-0.5 text-muted-foreground text-xs">
                                  {[
                                    author,
                                    v.duration
                                      ? formatDuration(v.duration)
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedWatchUrl && (
        <div className="w-full md:w-1/2">
          <ImportVideoConfirmForm
            form={confirmForm}
            isSubmitting={importVideo.isPending}
            onSubmit={handleConfirmImport}
          />
        </div>
      )}
    </div>
  );
}
