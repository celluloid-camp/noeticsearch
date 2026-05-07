"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CreateFolderDialog } from "@/components/create-folder-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { openImportProcessDrawer } from "@/lib/import-process-events";
import { useTRPC } from "@/lib/trpc/client";
import type { SelectedVideo } from "./peertube-search-results";

const batchOptionsSchema = z.object({
  isPublic: z.boolean(),
  folderId: z.string(),
});

type BatchOptionsSchema = z.infer<typeof batchOptionsSchema>;

interface BatchImportOptionsFormProps {
  onCancel: () => void;
  onSuccess: (result: {
    accepted: { id: string; url: string; title: string }[];
    rejected: { url: string; reason: string }[];
    isPublic: boolean;
    folderId?: string;
  }) => void;
  selectedVideos: SelectedVideo[];
}

export function BatchImportOptionsForm({
  selectedVideos,
  onSuccess,
  onCancel,
}: BatchImportOptionsFormProps) {
  const api = useTRPC();
  const t = useTranslations("import");
  const tGlobal = useTranslations();
  const { toast } = useToast();
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newlyCreatedFolder, setNewlyCreatedFolder] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const hasNonShareableVideo = useMemo(
    () =>
      selectedVideos.some((v) => {
        const id = v.privacy?.id ?? null;
        // 3 = Private, 5 = Password protected
        return id === 3 || id === 5;
      }),
    [selectedVideos]
  );

  const form = useForm<BatchOptionsSchema>({
    resolver: zodResolver(batchOptionsSchema),
    defaultValues: { isPublic: false, folderId: "__none__" },
  });

  useEffect(() => {
    if (hasNonShareableVideo && form.getValues("isPublic")) {
      form.setValue("isPublic", false, { shouldDirty: false });
    }
  }, [hasNonShareableVideo, form]);

  const { data: folders } = useQuery(api.folder.listMine.queryOptions());
  const folderOptions = [
    ...(newlyCreatedFolder &&
    !(folders ?? []).some((folder) => folder.id === newlyCreatedFolder.id)
      ? [newlyCreatedFolder]
      : []),
    ...(folders ?? []),
  ];

  const importBatch = useMutation(
    api.video.importBatch.mutationOptions({
      onSuccess: (result) => {
        const accepted = result.accepted.map((item) => ({
          id: item.id,
          url: item.url,
          title:
            selectedVideos.find((v) => v.url === item.url)?.name ?? item.url,
        }));

        onSuccess({
          accepted,
          rejected: result.rejected,
          isPublic: form.getValues("isPublic"),
          folderId:
            form.getValues("folderId") === "__none__"
              ? undefined
              : form.getValues("folderId"),
        });

        if (result.rejected.length > 0 && result.accepted.length > 0) {
          toast({
            title: t("importFailedTitle"),
            description: t("batchPartialFailure", {
              count: result.rejected.length,
            }),
            variant: "destructive",
          });
        }
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

  const onSubmit = (data: BatchOptionsSchema) => {
    openImportProcessDrawer();
    importBatch.mutate({
      items: selectedVideos.map((v) => ({ url: v.url })),
      isPublic: data.isPublic,
      folderId: data.folderId === "__none__" ? undefined : data.folderId,
    });
  };

  return (
    <div className="h-full border-l">
      <Form {...form}>
        <form
          className="flex flex-col gap-4 p-6"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <Card className="border-none bg-transparent shadow-none ring-0">
            <CardHeader className="px-0 pt-0">
              <CardTitle>
                {t("importSelected", { count: selectedVideos.length })}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 px-0">
              <div className="rounded-md border">
                <ScrollArea className="h-48 p-3">
                  <ul className="space-y-2">
                    {selectedVideos.map((v) => (
                      <li className="flex items-center gap-2" key={v.id}>
                        <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-sm bg-muted">
                          {v.thumbnailUrl ? (
                            <Image
                              alt={v.name}
                              className="object-cover"
                              fill
                              src={v.thumbnailUrl}
                              unoptimized
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 max-w-full flex-1">
                          <p className="line-clamp-2 text-muted-foreground text-sm leading-snug">
                            {v.name}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
              <div className="space-y-4 rounded-lg border p-4">
                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>{t("publicVideo")}</FormLabel>
                        <FormDescription className="text-xs">
                          {hasNonShareableVideo
                            ? t("makeVideoVisibleDisabledPrivate")
                            : t("makeVideoVisibleDescription")}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={hasNonShareableVideo ? false : field.value}
                          disabled={hasNonShareableVideo}
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
                    <>
                      <FormItem className="space-y-2 border-t pt-4">
                        <FormLabel>{tGlobal("folders.selectFolder")}</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            if (value === "__create__") {
                              setCreateFolderOpen(true);
                              return;
                            }
                            field.onChange(value);
                          }}
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
                            <SelectItem value="__create__">
                              {tGlobal("folders.newFolderPlaceholder")}
                            </SelectItem>
                            {folderOptions.map((folder) => (
                              <SelectItem key={folder.id} value={folder.id}>
                                {folder.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                      <CreateFolderDialog
                        hideTrigger
                        onCreated={(folder) => {
                          setNewlyCreatedFolder(folder);
                          field.onChange(folder.id);
                        }}
                        onOpenChange={setCreateFolderOpen}
                        open={createFolderOpen}
                      />
                    </>
                  )}
                />
              </div>
              <div className="flex justify-between gap-2">
                <Button
                  disabled={importBatch.isPending}
                  onClick={onCancel}
                  type="button"
                  variant="outline"
                >
                  {t("cancel")}
                </Button>
                <Button
                  disabled={importBatch.isPending}
                  size="lg"
                  type="submit"
                >
                  {importBatch.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("importing")}
                    </>
                  ) : (
                    t("importSelected", { count: selectedVideos.length })
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
