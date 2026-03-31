"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
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
  onCreated?: () => void;
}

export function CreateFolderDialog({ onCreated }: CreateFolderDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const t = useTranslations();
  const { toast } = useToast();
  const api = useTRPC();
  const queryClient = useQueryClient();

  const createFolder = useMutation(
    api.folder.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [["folder"]] });
        toast({ title: t("folders.createSuccess") });
        setName("");
        setOpen(false);
        onCreated?.();
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
        setOpen(nextOpen);
        if (!nextOpen) {
          setName("");
        }
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button size="lg" type="button" variant="outline">
          <PlusIcon className="size-4" />
          <span>{t("folders.createFolder")}</span>
        </Button>
      </DialogTrigger>
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
