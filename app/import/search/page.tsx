"use client";

import { IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ImportVideoConfirmForm } from "@/components/import-link/import-video-confirm-form";
import { PeerTubeSearchResults } from "@/components/import-link/peertube-search-results";
import {
  ConnectInstanceDialog,
  ConnectionStatusBadge,
} from "@/components/import-link/connect-instance-dialog";
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
import { useToast } from "@/hooks/use-toast";
import { type RouterOutput, useTRPC } from "@/lib/trpc/client";

export type PeerTubeInstance =
  RouterOutput["peertubeInstance"]["listWithAuth"][number];

export default function ImportSearchPage() {
  const router = useRouter();
  const api = useTRPC();
  const { toast } = useToast();
  const t = useTranslations("import");
  const tCommon = useTranslations("common");
  const { data: instances, refetch: refetchInstances } = useQuery(
    api.peertubeInstance.listWithAuth.queryOptions({
      limit: 10,
    })
  );

  const [selectedInstance, setSelectedInstance] =
    useState<PeerTubeInstance | null>(null);

  const activeInstance = selectedInstance ?? instances?.[0] ?? null;
  const [query, setQuery] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState<string | null>(null);

  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    videoId: string;
    baseUrl: string;
  } | null>(null);

  const handleImportSuccess = (video: { id: string }) => {
    toast({
      title: tCommon("success"),
      description: t("importSuccessDescription"),
    });
    setPendingImport(null);
    setSelectedVideoId(null);
    router.replace(`/video/${video.id}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      return;
    }
    setSubmittedSearch(q);
    setSelectedVideoId(null);
  };

  const handleResetSearch = () => {
    setQuery("");
    setSubmittedSearch(null);
    setSelectedVideoId(null);
    setPendingImport(null);
    setSelectedInstance(null);
  };

  const handleSelectVideo = (videoId: number) => {
    if (selectedVideoId === videoId) {
      setSelectedVideoId(null);
      setPendingImport(null);
      return;
    }

    setPendingImport({
      videoId: String(videoId),
      baseUrl: activeInstance?.host ?? "",
    });
  };

  return (
    <div className="flex h-full w-full flex-col md:flex-row md:items-start">
      {!pendingImport && (
        <div className="h-full w-full border-r md:w-2/5">
          <Card className="border-none bg-transparent shadow-none ring-0">
            <CardHeader>
              <CardTitle>{t("peerTubeInstancesTitle")}</CardTitle>
              <CardDescription>{t("searchImportDescription")}</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-1 flex-col gap-2">
                  <Label>{t("instance")}</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="flex h-14 w-full items-center justify-between"
                        type="button"
                        variant="outline"
                      >
                        {activeInstance ? (
                          <div className="flex items-center gap-3">
                            {activeInstance.thumbnail ? (
                              <div className="relative h-8 w-8 overflow-hidden rounded-sm bg-white">
                                <Image
                                  alt={activeInstance.title}
                                  className="object-cover"
                                  fill
                                  src={activeInstance.thumbnail}
                                  unoptimized
                                />
                              </div>
                            ) : null}
                            <div className="flex flex-col text-left">
                              <span>{activeInstance.title}</span>
                              <span className="text-muted-foreground text-xs">
                                {activeInstance.host}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {t("noPublicInstances")}
                          </span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className=""
                      style={{ width: "var(--radix-popper-anchor-width)" }}
                    >
                      {(instances ?? []).map((instance) => (
                        <DropdownMenuItem
                          key={instance.host}
                          onSelect={() => setSelectedInstance(instance)}
                        >
                          <div className="flex items-center gap-3">
                            {instance.thumbnail ? (
                              <div className="relative h-8 w-8 overflow-hidden rounded-sm bg-muted">
                                <Image
                                  alt={instance.title}
                                  className="object-cover"
                                  fill
                                  src={instance.thumbnail}
                                  unoptimized
                                />
                              </div>
                            ) : null}
                            <div className="flex flex-1 flex-col text-left">
                              <span>{instance.title}</span>
                              <span className="text-muted-foreground text-xs">
                                {instance.host}
                              </span>
                            </div>
                            <ConnectionStatusBadge
                              status={instance.authStatus}
                            />
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Connection status + connect button for active instance */}
                  {activeInstance && (
                    <div className="flex items-center justify-between gap-2">
                      <ConnectionStatusBadge
                        status={activeInstance.authStatus}
                      />
                      <ConnectInstanceDialog
                        host={activeInstance.host}
                        instanceTitle={activeInstance.title}
                        onStatusChange={() => {
                          refetchInstances();
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="search">{t("searchVideosLabel")}</Label>
                  <Input
                    className="h-12 text-md"
                    id="search"
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("searchVideosPlaceholder")}
                    type="search"
                    value={query}
                  />
                </div>
              </CardContent>
              <CardFooter className="mt-4 flex justify-end">
                <Button disabled={!query.trim()} size="lg" type="submit">
                  <IconSearch className="size-4 shrink-0" />
                  {t("searchVideosSubmit")}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {submittedSearch && (
        <div className="w-full border-r md:h-[calc(100vh-5rem)] md:w-1/2">
          <PeerTubeSearchResults
            baseUrl={activeInstance?.host ?? ""}
            onReset={handleResetSearch}
            onVideoSelect={handleSelectVideo}
            search={submittedSearch}
            selectedVideoId={selectedVideoId}
          />
        </div>
      )}

      {pendingImport && (
        <div className="w-full md:w-1/2">
          <ImportVideoConfirmForm
            baseUrl={pendingImport.baseUrl}
            onSuccess={handleImportSuccess}
            videoId={pendingImport.videoId}
          />
        </div>
      )}

      {pendingImport || submittedSearch ? null : (
        <div className="hidden w-full md:block md:w-1/2">
          <Card className="border-none shadow-none ring-0">
            <CardHeader>
              <CardTitle>{t("searchGuideTitle")}</CardTitle>
              <CardDescription>{t("searchGuideDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>{t("searchGuideStep1")}</li>
                <li>{t("searchGuideStep2")}</li>
                <li>{t("searchGuideStep3")}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
