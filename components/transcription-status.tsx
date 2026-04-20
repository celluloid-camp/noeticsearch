"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  DownloadIcon,
  Loader2Icon,
  Maximize2,
  PencilIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Textarea } from "@/components/ui/textarea";
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
        <StatusDescription
          progress={transcription?.progress}
          status={status}
          t={t}
        />
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
                <FullscreenDialog
                  canEdit={canEdit}
                  locale={locale}
                  t={t}
                  transcription={transcription}
                  videoId={videoId}
                />
              </div>
            )}
          </CardFooter>
        )}
    </Card>
  );
}

interface FullscreenDialogProps {
  canEdit?: boolean;
  locale: string;
  t: ReturnType<typeof useTranslations>;
  transcription: { text: string | null; updatedAt: Date };
  videoId: string;
}

function FullscreenDialog({
  canEdit,
  locale,
  t,
  transcription,
  videoId,
}: FullscreenDialogProps) {
  const api = useTRPC();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const originalText = transcription.text ?? "";
  const isDirty = isEditing && draftText !== originalText;

  const updateTranscription = useMutation(
    api.video.updateTranscription.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [["video", "getTranscription"], { input: { videoId } }],
        });
        setIsEditing(false);
        toast.success(t("saveSuccess"));
      },
      onError: () => {
        toast.error(t("saveError"));
      },
    })
  );

  const handleEditStart = useCallback(() => {
    setDraftText(originalText);
    setIsEditing(true);
  }, [originalText]);

  const handleCancelEdit = useCallback(() => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      setIsEditing(false);
    }
  }, [isDirty]);

  const handleSave = useCallback(() => {
    const trimmed = draftText.trim();
    updateTranscription.mutate({ videoId, text: trimmed });
  }, [draftText, videoId, updateTranscription]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && isDirty) {
        setShowDiscardConfirm(true);
        return;
      }
      if (!nextOpen) {
        setIsEditing(false);
        setDraftText("");
      }
      setOpen(nextOpen);
    },
    [isDirty]
  );

  const handleConfirmDiscardAndClose = useCallback(() => {
    setShowDiscardConfirm(false);
    setIsEditing(false);
    setDraftText("");
    setOpen(false);
  }, []);

  const isSaveDisabled =
    updateTranscription.isPending || !isDirty || draftText.trim().length === 0;

  return (
    <>
      <Dialog onOpenChange={handleOpenChange} open={open}>
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
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <span className="text-muted-foreground text-xs">
                    {relativeTime(transcription.updatedAt, locale)}
                  </span>
                )}
                {canEdit && !isEditing && (
                  <Button onClick={handleEditStart} size="sm" variant="ghost">
                    <PencilIcon />
                    {t("edit")}
                  </Button>
                )}
                {isEditing && (
                  <>
                    <Button
                      disabled={isSaveDisabled}
                      onClick={handleSave}
                      size="sm"
                      variant="default"
                    >
                      {updateTranscription.isPending ? (
                        <Loader2Icon className="animate-spin" />
                      ) : null}
                      {updateTranscription.isPending ? t("saving") : t("save")}
                    </Button>
                    <Button
                      disabled={updateTranscription.isPending}
                      onClick={handleCancelEdit}
                      size="sm"
                      variant="ghost"
                    >
                      <XIcon />
                      {t("cancel")}
                    </Button>
                  </>
                )}
              </div>
            </div>
            {isEditing ? (
              <Textarea
                className="h-[calc(100vh-56px)] flex-1 resize-none rounded-none border-0 p-4 font-mono text-sm leading-relaxed focus-visible:ring-0"
                disabled={updateTranscription.isPending}
                onChange={(e) => setDraftText(e.target.value)}
                value={draftText}
              />
            ) : (
              <ScrollArea className="h-[calc(100vh-56px)] p-4">
                <p className="whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
                  {transcription.text ?? ""}
                </p>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        onOpenChange={setShowDiscardConfirm}
        open={showDiscardConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unsavedChangesTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("unsavedChangesDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDiscardConfirm(false)}>
              {t("continueEditing")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscardAndClose}>
              {t("discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StatusDescription({
  progress,
  status,
  t,
}: {
  progress: number | undefined;
  status: string | undefined;
  t: ReturnType<typeof useTranslations>;
}) {
  if (status === "pending" || status === "processing") {
    const showProgress = status === "processing" && typeof progress === "number";
    return (
      <CardDescription className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
        <Loader2Icon className="size-3.5 animate-spin" />
        {t(status as "pending" | "processing")}
        {showProgress && ` — ${progress}%`}
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
