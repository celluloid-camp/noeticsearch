"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Loader2, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTRPC } from "@/lib/trpc/client";

interface AddToFolderDialogProps {
  children: React.ReactNode;
  videoId: string;
}

export function AddToFolderDialog({
  children,
  videoId,
}: AddToFolderDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const t = useTranslations();
  const { toast } = useToast();
  const api = useTRPC();
  const queryClient = useQueryClient();

  const { data: folders, isLoading: foldersLoading } = useQuery(
    api.folder.listMine.queryOptions()
  );

  const { data: folderIds, isLoading: folderIdsLoading } = useQuery(
    api.folder.getFolderIdsForVideo.queryOptions({ videoId })
  );

  const selectedFolderIds = React.useMemo(
    () => new Set(folderIds ?? []),
    [folderIds]
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [["folder"]] });
  };

  const createFolder = useMutation(
    api.folder.create.mutationOptions({
      onSuccess: () => {
        invalidate();
        setNewFolderName("");
        setIsCreating(false);
        toast({ title: t("folders.createSuccess") });
      },
      onError: (err) => {
        toast({
          title: t("common.error"),
          description: err.message,
          variant: "destructive",
        });
      },
    })
  );

  const addVideo = useMutation(
    api.folder.addVideo.mutationOptions({
      onSuccess: () => {
        invalidate();
        toast({ title: t("folders.addVideoSuccess") });
      },
      onError: (err) => {
        toast({
          title: t("common.error"),
          description: err.message,
          variant: "destructive",
        });
      },
    })
  );

  const removeVideo = useMutation(
    api.folder.removeVideo.mutationOptions({
      onSuccess: () => {
        invalidate();
        toast({ title: t("folders.removeVideoSuccess") });
      },
      onError: (err) => {
        toast({
          title: t("common.error"),
          description: err.message,
          variant: "destructive",
        });
      },
    })
  );

  const handleToggleFolder = (folderId: string, checked: boolean) => {
    if (checked) {
      addVideo.mutate({ folderId, videoId });
    } else {
      removeVideo.mutate({ folderId, videoId });
    }
  };

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) {
      return;
    }
    createFolder.mutate({ name });
  };

  const isLoading = foldersLoading || folderIdsLoading;

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("folders.selectFolders")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : folders && folders.length > 0 ? (
            <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              {folders.map((folder) => {
                const checked = selectedFolderIds.has(folder.id);
                const pending = addVideo.isPending || removeVideo.isPending;
                return (
                  <li key={folder.id}>
                    <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted">
                      <Checkbox
                        checked={checked}
                        disabled={pending}
                        id={`folder-${folder.id}`}
                        onCheckedChange={(val) =>
                          handleToggleFolder(folder.id, Boolean(val))
                        }
                      />
                      <Label
                        className="flex-1 cursor-pointer font-normal"
                        htmlFor={`folder-${folder.id}`}
                      >
                        {folder.name}
                      </Label>
                      <span className="text-muted-foreground text-xs">
                        {t("folders.videosCount", { count: folder.videoCount })}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-2 text-center text-muted-foreground text-sm">
              {t("folders.noFolders")}
            </p>
          )}

          {isCreating ? (
            <div className="flex gap-2">
              <Input
                autoFocus
                className="flex-1"
                maxLength={80}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateFolder();
                  }
                  if (e.key === "Escape") {
                    setIsCreating(false);
                    setNewFolderName("");
                  }
                }}
                placeholder={t("folders.newFolderPlaceholder")}
                value={newFolderName}
              />
              <Button
                disabled={!newFolderName.trim() || createFolder.isPending}
                onClick={handleCreateFolder}
                size="sm"
                type="button"
              >
                {createFolder.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  t("folders.create")
                )}
              </Button>
              <Button
                onClick={() => {
                  setIsCreating(false);
                  setNewFolderName("");
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                {t("folders.cancel")}
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={() => setIsCreating(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              <PlusIcon className="size-4" />
              {t("folders.quickCreateFolder")}
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)} type="button">
            {t("folders.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AddToFolderButton({ videoId }: { videoId: string }) {
  const t = useTranslations();
  return (
    <AddToFolderDialog videoId={videoId}>
      <Button
        onClick={(e) => e.stopPropagation()}
        size="sm"
        type="button"
        variant="outline"
      >
        <FolderPlus className="size-4" />
        <span>{t("folders.addToFolder")}</span>
      </Button>
    </AddToFolderDialog>
  );
}
