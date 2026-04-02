"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTRPC } from "@/lib/trpc/client";

export interface BatchImportItem {
  id: string;
  title: string;
  url: string;
}

export interface BatchRejectedItem {
  reason: string;
  url: string;
}

interface BatchImportStatusProps {
  accepted: BatchImportItem[];
  folderId?: string;
  isPublic: boolean;
  onDone?: () => void;
  rejected: BatchRejectedItem[];
}

function StatusBadge({ status }: { status: string | null }) {
  const t = useTranslations("import");

  if (status === "completed") {
    return (
      <Badge className="gap-1" variant="default">
        <CheckCircle2 className="size-3" />
        {t("batchCompleted")}
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge className="gap-1" variant="destructive">
        <XCircle className="size-3" />
        {t("batchFailed")}
      </Badge>
    );
  }
  return (
    <Badge className="gap-1" variant="secondary">
      <Loader2 className="size-3 animate-spin" />
      {t("batchProcessing")}
    </Badge>
  );
}

export function BatchImportStatus({
  accepted,
  rejected,
  isPublic,
  folderId,
  onDone,
}: BatchImportStatusProps) {
  const api = useTRPC();
  const t = useTranslations("import");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const videoIds = accepted.map((item) => item.id);

  const { data: statuses } = useQuery({
    ...api.video.getImportStatuses.queryOptions({ videoIds }),
    enabled: videoIds.length > 0,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) {
        return 2000;
      }
      const allDone = data.every(
        (s) => s.importStatus === "completed" || s.importStatus === "failed"
      );
      return allDone ? false : 2000;
    },
  });

  const retryMutation = useMutation(
    api.video.importBatch.mutationOptions({
      onSuccess: (result) => {
        if (result.accepted.length > 0) {
          queryClient.invalidateQueries({
            queryKey: api.video.getImportStatuses.queryKey({ videoIds }),
          });
        }
        if (result.rejected.length > 0) {
          toast({
            title: t("importFailedTitle"),
            description: result.rejected.map((r) => r.reason).join(", "),
            variant: "destructive",
          });
        }
      },
      onError: (err) => {
        toast({
          title: t("importFailedTitle"),
          description: err.message,
          variant: "destructive",
        });
      },
    })
  );

  const statusMap = new Map(
    (statuses ?? []).map((s) => [s.videoId, s.importStatus])
  );

  const completedCount = (statuses ?? []).filter(
    (s) => s.importStatus === "completed"
  ).length;
  const failedCount = (statuses ?? []).filter(
    (s) => s.importStatus === "failed"
  ).length;
  const processingCount = (statuses ?? []).filter(
    (s) => s.importStatus !== "completed" && s.importStatus !== "failed"
  ).length;

  const allDone =
    accepted.length > 0 &&
    statuses?.length === accepted.length &&
    processingCount === 0;

  // Store onDone in a ref so changes to the callback don't re-trigger the effect
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (allDone) {
      onDoneRef.current?.();
    }
  }, [allDone]);

  const handleRetry = (item: BatchImportItem) => {
    retryMutation.mutate({
      items: [{ url: item.url }],
      isPublic,
      folderId,
    });
  };

  return (
    <div className="h-full border-l p-6">
      <Card className="border-none bg-transparent shadow-none ring-0">
        <CardHeader>
          <CardTitle>{t("batchProgressTitle")}</CardTitle>
          <CardDescription>
            {t("batchSummary", {
              total: accepted.length + rejected.length,
              completed: completedCount,
              failed: failedCount + rejected.length,
              processing: processingCount,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {accepted.map((item) => {
            const status = statusMap.get(item.id) ?? null;
            const isFailed = status === "failed";

            return (
              <div
                className="flex items-center justify-between gap-3 rounded-md border p-3"
                key={item.id}
              >
                <div className="min-w-0 flex-1">
                  <Link
                    className="block truncate font-medium text-sm underline-offset-2 hover:underline"
                    href={`/video/${item.id}`}
                  >
                    {item.title}
                  </Link>
                  <p className="truncate text-muted-foreground text-xs">
                    {item.url}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={status} />
                  {isFailed && (
                    <Button
                      disabled={retryMutation.isPending}
                      onClick={() => handleRetry(item)}
                      size="sm"
                      variant="outline"
                    >
                      <RefreshCw className="size-3" />
                      {tCommon("retry")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {rejected.map((item) => (
            <div
              className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3"
              key={item.url}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-muted-foreground text-xs">
                  {item.url}
                </p>
                <p className="text-destructive text-xs">
                  {item.reason === "alreadyImported"
                    ? t("alreadyImported")
                    : item.reason}
                </p>
              </div>
              <Badge className="shrink-0 gap-1" variant="destructive">
                <XCircle className="size-3" />
                {t("batchFailed")}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
