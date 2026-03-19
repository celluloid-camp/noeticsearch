"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  DownloadIcon,
  Loader2Icon,
  Maximize2,
  SparklesIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { relativeTime } from "@/lib/date";
import { useTRPC } from "@/lib/trpc/client";

interface TranscriptionProps {
  canEdit?: boolean;
  videoId: string;
}

export function Transcription({ videoId, canEdit }: TranscriptionProps) {
  const api = useTRPC();
  const t = useTranslations("transcription");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const { data: transcription } = useQuery({
    ...api.video.getTranscription.queryOptions({ videoId }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "pending" || status === "processing") {
        return 3000;
      }
      return false;
    },
  });

  const generate = useMutation(
    api.video.generateTranscription.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [["video", "getTranscription"], { input: { videoId } }],
        });
      },
    })
  );

  const status = transcription?.status;
  const isCompleted = status === "completed" && transcription?.text;

  const renderAction = () => {
    if (!canEdit) {
      return null;
    }

    if (!transcription) {
      return (
        <CardAction>
          <Button
            disabled={generate.isPending}
            onClick={() => generate.mutate({ videoId })}
            size="sm"
            variant="ghost"
          >
            {generate.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <SparklesIcon />
            )}
            {t("generate")}
          </Button>
        </CardAction>
      );
    }

    if (status === "failed") {
      return (
        <CardAction>
          <Button
            disabled={generate.isPending}
            onClick={() => generate.mutate({ videoId })}
            size="sm"
            variant="ghost"
          >
            {generate.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <SparklesIcon />
            )}
            {t("retry")}
          </Button>
        </CardAction>
      );
    }

    if (isCompleted) {
      return (
        <CardAction>
          <Button
            disabled={generate.isPending}
            onClick={() => generate.mutate({ videoId })}
            size="sm"
            variant="ghost"
          >
            {generate.isPending ? (
              <Loader2Icon className="animate-spin" />
            ) : (
              <SparklesIcon />
            )}
            {t("regenerate")}
          </Button>
        </CardAction>
      );
    }

    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <StatusDescription status={status} t={t} />
        <CardDescription>{t("explanation")}</CardDescription>
        {renderAction()}
      </CardHeader>
      {isCompleted && (
        <CardContent>
          <ScrollArea className="h-64">
            <p className="whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
              {transcription.text}
            </p>
          </ScrollArea>
        </CardContent>
      )}
      {transcription?.updatedAt &&
        status !== "pending" &&
        status !== "processing" && (
          <CardFooter className="justify-between text-muted-foreground text-xs">
            {relativeTime(transcription.updatedAt, locale)}
            {isCompleted && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() =>
                    downloadAsTextFile(
                      transcription.text ?? "",
                      `transcription-${videoId}.txt`
                    )
                  }
                  size="sm"
                  variant="ghost"
                >
                  <DownloadIcon />
                  {t("download")}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      aria-label={t("openFullscreen")}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Maximize2 />
                    </Button>
                  </DialogTrigger>
                  <DialogContent
                    className="h-[90vh] w-[80vw] max-w-[80vw] gap-0 p-0 sm:max-w-[80vw]"
                    showCloseButton={true}
                  >
                    <div className="flex h-full w-full flex-col bg-background">
                      <div className="flex items-center justify-between border-b px-4 py-3">
                        <div className="font-medium text-sm">{t("title")}</div>
                        <span className="text-muted-foreground text-xs">
                          {relativeTime(transcription.updatedAt, locale)}
                        </span>
                      </div>
                      <ScrollArea className="h-[calc(100vh-56px)] p-4">
                        <p className="whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
                          {transcription.text ?? ""}
                        </p>
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardFooter>
        )}
    </Card>
  );
}

function StatusDescription({
  status,
  t,
}: {
  status: string | undefined;
  t: ReturnType<typeof useTranslations>;
}) {
  if (status === "pending" || status === "processing") {
    return (
      <CardDescription className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
        <Loader2Icon className="size-3.5 animate-spin" />
        {t(status as "pending" | "processing")}
      </CardDescription>
    );
  }
  if (status === "failed") {
    return (
      <CardDescription className="flex items-center gap-1.5 text-destructive">
        <AlertTriangleIcon className="size-3.5" />
        {t("failed")}
      </CardDescription>
    );
  }
  if (status === "completed") {
    return null;
  }
  return <CardDescription>{t("notGenerated")}</CardDescription>;
}

function downloadAsTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
