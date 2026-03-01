"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/lib/trpc/client";

const editSearchSchema = z.object({
  isPublic: z.boolean(),
  title: z.string().nullable(),
});

type EditSearchSchema = z.infer<typeof editSearchSchema>;

interface EditSearchDialogProps {
  children: React.ReactNode;
  id: string;
  isPublic: boolean;
  title: string | null;
}

export function EditSearchDialog({
  children,
  id,
  isPublic,
  title,
}: EditSearchDialogProps) {
  const api = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { mutateAsync: updateSearch } = useMutation(
    api.search.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: api.search.load.queryOptions({ id }).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: api.search.list.queryOptions().queryKey,
        });
      },
    })
  );

  const { mutateAsync: deleteSearch } = useMutation(
    api.search.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: api.search.list.queryOptions().queryKey,
        });
      },
    })
  );

  useEffect(() => {
    if (!open) {
      setDeleteDialogOpen(false);
    }
  }, [open]);

  const form = useForm<EditSearchSchema>({
    resolver: zodResolver(editSearchSchema),
    defaultValues: {
      isPublic,
      title: title ?? "",
    },
    values: {
      isPublic,
      title: title ?? "",
    },
  });

  const handleSubmit = async (data: EditSearchSchema) => {
    await updateSearch({
      id,
      isPublic: data.isPublic,
      title: data.title?.trim() ? data.title.trim() : null,
    });
    setOpen(false);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSearch({ id });
      setDeleteDialogOpen(false);
      setOpen(false);
      if (pathname === `/search/${id}`) {
        router.push("/");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit search</DialogTitle>
          <DialogDescription>
            Update the title and visibility of this search.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Search title"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Public</FormLabel>
                    <p className="text-muted-foreground text-sm">
                      Make this search visible to everyone
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter className="flex-row sm:flex-row">
              <Button
                className="mr-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={form.formState.isSubmitting}
                onClick={() => setDeleteDialogOpen(true)}
                type="button"
                variant="ghost"
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
              <Button
                onClick={() => setOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={form.formState.isSubmitting} type="submit">
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>

        <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete search</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this search? This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <Button
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
                onClick={(e) => {
                  e.preventDefault();
                  void handleConfirmDelete();
                }}
                type="button"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
