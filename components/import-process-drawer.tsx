"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  getImportProcessDrawerOpen,
  setImportProcessDrawerOpen,
  subscribeImportProcessDrawer,
} from "@/lib/import-process-events";
import { useTRPC } from "@/lib/trpc/client";

function ImportStatusBadge({ status }: { status: string }) {
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
      <Spinner className="size-3" />
      {t("batchProcessing")}
    </Badge>
  );
}

export function ImportProcessDrawer() {
  const api = useTRPC();
  const t = useTranslations("import");
  const open = useSyncExternalStore(
    subscribeImportProcessDrawer,
    getImportProcessDrawerOpen,
    getImportProcessDrawerOpen
  );

  const { data, isLoading } = useQuery({
    ...api.video.listImportProcesses.queryOptions({ limit: 30 }),
    refetchInterval: (query) => {
      const processes = query.state.data ?? [];
      return processes.some((item) => item.importStatus === "processing")
        ? 2000
        : false;
    },
  });

  const processes = data ?? [];

  return (
    <Drawer
      direction="right"
      onOpenChange={setImportProcessDrawerOpen}
      open={open}
    >
      <DrawerContent className="data-[vaul-drawer-direction=right]:w-[92vw] data-[vaul-drawer-direction=right]:sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>{t("importProcessTitle")}</DrawerTitle>
          <DrawerDescription>{t("importProcessDescription")}</DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 px-4 pb-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  className="flex items-center gap-3 rounded-md border p-3"
                  key={index}
                >
                  <Skeleton className="h-10 w-16 shrink-0 rounded-sm" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : processes.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <Clock3 />
              </EmptyMedia>
              <EmptyContent>
                <EmptyTitle>{t("importProcessEmptyTitle")}</EmptyTitle>
                <EmptyDescription>
                  {t("importProcessEmptyDescription")}
                </EmptyDescription>
              </EmptyContent>
            </Empty>
          ) : (
            <ScrollArea className="h-[70vh] pr-1">
              <div className="space-y-3">
                {processes.map((item) => (
                  <div
                    className="flex items-center gap-3 rounded-md border p-3"
                    key={item.videoId}
                  >
                    <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-sm bg-muted">
                      {item.thumbnail ? (
                        <Image
                          alt={item.title}
                          className="object-cover"
                          fill
                          src={item.thumbnail}
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        className="line-clamp-2 block font-medium text-sm leading-snug underline-offset-2 hover:underline"
                        href={`/video/${item.videoId}`}
                      >
                        {item.title}
                      </Link>
                      <p className="line-clamp-2 break-all text-muted-foreground text-xs leading-snug">
                        {item.url}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <ImportStatusBadge status={item.importStatus} />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
