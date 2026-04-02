"use client";

import { IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { BatchImportOptionsForm } from "@/components/import-link/batch-import-options-form";
import {
  ConnectInstanceDialog,
  ConnectionStatusBadge,
} from "@/components/import-link/connect-instance-dialog";
import {
  PeerTubeSearchResults,
  type SelectedVideo,
} from "@/components/import-link/peertube-search-results";
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

type ImportStage =
  | { kind: "idle" }
  | { kind: "options"; videos: SelectedVideo[] };

export default function ImportSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useTRPC();
  const { toast } = useToast();
  const t = useTranslations("import");
  const { data: instances, refetch: refetchInstances } = useQuery(
    api.peertubeInstance.listWithAuth.queryOptions({
      limit: 10,
    })
  );

  const [selectedInstance, setSelectedInstance] =
    useState<PeerTubeInstance | null>(null);

  const activeInstance = selectedInstance ?? instances?.[0] ?? null;
  const isLoginDisabled = activeInstance?.isIndex ?? false;
  const initialQ = searchParams.get("q")?.trim() ?? "";
  const [query, setQuery] = useState(initialQ);
  const [submittedSearch, setSubmittedSearch] = useState<string | null>(
    initialQ.length > 0 ? initialQ : null
  );

  const [importStage, setImportStage] = useState<ImportStage>({ kind: "idle" });

  const handleInstanceSelect = (instance: PeerTubeInstance) => {
    setSelectedInstance(instance);
    setQuery("");
    setSubmittedSearch(null);
    setImportStage({ kind: "idle" });
    router.replace("/import/search");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      return;
    }
    setSubmittedSearch(q);
    router.replace(`/import/search?q=${encodeURIComponent(q)}`);
    setImportStage({ kind: "idle" });
  };

  const handleResetSearch = () => {
    setQuery("");
    setSubmittedSearch(null);
    router.replace("/import/search");
    setImportStage({ kind: "idle" });
    setSelectedInstance(null);
  };

  const handleImportSelected = (videos: SelectedVideo[]) => {
    setImportStage({ kind: "options", videos });
  };

  const handleBatchSubmit = (result: {
    accepted: { id: string; url: string; title: string }[];
    rejected: { url: string; reason: string }[];
    isPublic: boolean;
    folderId?: string;
  }) => {
    if (result.accepted.length > 0) {
      router.push(
        result.folderId
          ? `/library/folders/${result.folderId}`
          : "/library/mine"
      );
      return;
    }

    toast({
      title: t("importFailedTitle"),
      description: t("importFailedDescription"),
      variant: "destructive",
    });
  };

  const handleCancelOptions = () => {
    setImportStage({ kind: "idle" });
  };

  return (
    <div className="flex h-full w-full flex-col md:flex-row md:items-start">
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
                <div className="relative">
                  <div className="min-w-0 flex-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="flex h-14 w-full items-center justify-start pr-28"
                          type="button"
                          variant="outline"
                        >
                          {activeInstance ? (
                            <div className="flex min-w-0 items-center gap-3">
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
                              <div className="flex min-w-0 flex-col text-left">
                                <span className="truncate">
                                  {activeInstance.title}
                                </span>
                                <span className="truncate text-muted-foreground text-xs">
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
                            className="w-full"
                            key={instance.host}
                            onSelect={() => handleInstanceSelect(instance)}
                          >
                            <div className="flex w-full items-center gap-3">
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
                              <div className="flex min-w-0 flex-1 flex-col text-left">
                                <span className="truncate">
                                  {instance.title}
                                </span>
                                <span className="truncate text-muted-foreground text-xs">
                                  {instance.host}
                                </span>
                              </div>
                              <span className="ml-auto">
                                <ConnectionStatusBadge
                                  status={instance.authStatus}
                                />
                              </span>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
                    {activeInstance && !isLoginDisabled ? (
                      <ConnectInstanceDialog
                        host={activeInstance.host}
                        instanceThumbnail={activeInstance.thumbnail}
                        instanceTitle={activeInstance.title}
                        onStatusChange={() => {
                          refetchInstances();
                        }}
                        triggerClassName="h-8 border-border px-2.5"
                        triggerVariant="outline"
                      />
                    ) : null}
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </div>
                </div>
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

      {submittedSearch && (
        <div className="w-full border-r md:h-[calc(100vh-5rem)] md:w-1/2">
          <PeerTubeSearchResults
            baseUrl={activeInstance?.host ?? ""}
            onImportSelected={handleImportSelected}
            onReset={handleResetSearch}
            search={submittedSearch}
          />
        </div>
      )}

      {importStage.kind === "options" && (
        <div className="w-full md:w-1/2">
          <BatchImportOptionsForm
            onCancel={handleCancelOptions}
            onSuccess={handleBatchSubmit}
            selectedVideos={importStage.videos}
          />
        </div>
      )}

      {importStage.kind === "idle" && !submittedSearch ? (
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
      ) : null}
    </div>
  );
}
