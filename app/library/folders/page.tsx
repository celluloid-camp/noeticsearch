"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, MoreHorizontal, Pencil, PlusIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import React from "react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useTRPC } from "@/lib/trpc/client";

function RenameFolderDialog({
  folder,
  open,
  onOpenChange,
}: {
  folder: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = React.useState(folder.name);
  const t = useTranslations();
  const { toast } = useToast();
  const api = useTRPC();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (open) setName(folder.name);
  }, [open, folder.name]);

  const rename = useMutation(
    api.folder.rename.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [["folder"]] });
        toast({ title: t("folders.renameSuccess") });
        onOpenChange(false);
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

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("folders.renameFolder")}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              rename.mutate({ id: folder.id, name: name.trim() });
            }
          }}
          placeholder={t("folders.newFolderPlaceholder")}
          value={name}
        />
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            {t("folders.cancel")}
          </Button>
          <Button
            disabled={!name.trim() || rename.isPending}
            onClick={() => rename.mutate({ id: folder.id, name: name.trim() })}
            type="button"
          >
            {t("folders.rename")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteFolderDialog({
  folder,
  open,
  onOpenChange,
}: {
  folder: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const { toast } = useToast();
  const api = useTRPC();
  const queryClient = useQueryClient();

  const deleteFolder = useMutation(
    api.folder.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [["folder"]] });
        toast({ title: t("folders.deleteSuccess") });
        onOpenChange(false);
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

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("folders.deleteFolder")}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          {t("folders.confirmDelete")}
        </p>
        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            {t("folders.cancel")}
          </Button>
          <Button
            disabled={deleteFolder.isPending}
            onClick={() => deleteFolder.mutate({ id: folder.id })}
            type="button"
            variant="destructive"
          >
            {t("folders.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FoldersPage() {
  const t = useTranslations();
  const { toast } = useToast();
  const api = useTRPC();
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [renameFolder, setRenameFolder] = React.useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteFolder, setDeleteFolder] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data: folders, isLoading } = useQuery(
    api.folder.listMine.queryOptions()
  );

  const createFolder = useMutation(
    api.folder.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [["folder"]] });
        toast({ title: t("folders.createSuccess") });
        setNewFolderName("");
        setIsCreating(false);
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

  const handleCreate = () => {
    const name = newFolderName.trim();
    if (!name) return;
    createFolder.mutate({ name });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 border-border border-b px-4 pt-4 pb-4">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
            <Skeleton className="h-24 w-full rounded-lg" key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 border-border border-b px-4 pt-4 pb-4">
        <h2 className="font-mono font-semibold text-lg">{t("folders.title")}</h2>
        <Button
          onClick={() => setIsCreating(true)}
          size="lg"
          type="button"
        >
          <PlusIcon className="size-4" />
          {t("folders.createFolder")}
        </Button>
      </div>

      {isCreating && (
        <div className="flex gap-2 px-4">
          <Input
            autoFocus
            className="flex-1"
            maxLength={80}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
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
            onClick={handleCreate}
            type="button"
          >
            {t("folders.create")}
          </Button>
          <Button
            onClick={() => {
              setIsCreating(false);
              setNewFolderName("");
            }}
            type="button"
            variant="outline"
          >
            {t("folders.cancel")}
          </Button>
        </div>
      )}

      {folders && folders.length === 0 && !isCreating ? (
        <div className="flex flex-col items-center justify-center p-8">
          <Empty>
            <EmptyMedia variant="icon">
              <FolderOpen />
            </EmptyMedia>
            <EmptyContent>
              <EmptyTitle>{t("folders.noFolders")}</EmptyTitle>
              <EmptyDescription>
                {t("folders.noFoldersDescription")}
              </EmptyDescription>
              <Button
                onClick={() => setIsCreating(true)}
                size="sm"
                type="button"
                variant="outline"
              >
                <PlusIcon className="size-4" />
                {t("folders.createFolder")}
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {folders?.map((folder) => (
            <div
              className="group relative rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
              key={folder.id}
            >
              <Link
                className="flex flex-col gap-2"
                href={`/library/folders/${folder.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <FolderOpen className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">{folder.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {t("folders.videosCount", { count: folder.videoCount })}
                    </p>
                  </div>
                </div>
              </Link>
              <div
                className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="size-7"
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() =>
                        setRenameFolder({ id: folder.id, name: folder.name })
                      }
                    >
                      <Pencil className="mr-2 size-4" />
                      {t("folders.rename")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        setDeleteFolder({ id: folder.id, name: folder.name })
                      }
                      variant="destructive"
                    >
                      <Trash2 className="mr-2 size-4" />
                      {t("folders.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {renameFolder && (
        <RenameFolderDialog
          folder={renameFolder}
          onOpenChange={(open) => {
            if (!open) setRenameFolder(null);
          }}
          open
        />
      )}
      {deleteFolder && (
        <DeleteFolderDialog
          folder={deleteFolder}
          onOpenChange={(open) => {
            if (!open) setDeleteFolder(null);
          }}
          open
        />
      )}
    </div>
  );
}
