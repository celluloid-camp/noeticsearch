"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTRPC } from "@/lib/trpc/client";

interface CreateFolderDialogProps {
  hideTrigger?: boolean;
  onCreated?: (folder: { id: string; name: string }) => void;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  trigger?: ReactNode;
}

export function CreateFolderDialog({
  onCreated,
  open,
  onOpenChange,
  hideTrigger = false,
  trigger,
}: CreateFolderDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState("");
  const t = useTranslations();
  const { toast } = useToast();
  const api = useTRPC();
  const queryClient = useQueryClient();
  const dialogOpen = open ?? internalOpen;
  const setDialogOpen = (nextOpen: boolean) => {
    if (open === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const createFolder = useMutation(
    api.folder.create.mutationOptions({
      onSuccess: (folder) => {
        queryClient.invalidateQueries({ queryKey: [["folder"]] });
        toast({ title: t("folders.createSuccess") });
        setName("");
        setDialogOpen(false);
        onCreated?.({ id: folder.id, name: folder.name });
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
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    createFolder.mutate({ name: trimmed });
  };

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        setDialogOpen(nextOpen);
        if (!nextOpen) {
          setName("");
        }
      }}
      open={dialogOpen}
    >
      {hideTrigger ? null : (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="lg" type="button" variant="outline">
              <PlusIcon className="size-4" />
              <span>{t("folders.createFolder")}</span>
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("folders.createFolder")}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCreate();
            }
          }}
          placeholder={t("folders.newFolderPlaceholder")}
          value={name}
        />
        <DialogFooter>
          <Button
            onClick={() => setOpen(false)}
            type="button"
            variant="outline"
          >
            {t("folders.cancel")}
          </Button>
          <Button
            disabled={!name.trim() || createFolder.isPending}
            onClick={handleCreate}
            type="button"
          >
            {createFolder.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              t("folders.create")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
