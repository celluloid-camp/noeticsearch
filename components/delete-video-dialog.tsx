"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { VideoById } from "@/lib/trpc/client";
import { useTRPC } from "@/lib/trpc/client";

interface DeleteVideoDialogProps {
  children: React.ReactNode;
  onSuccess?: () => void;
  video: VideoById;
}

export default function DeleteVideoDialog({
  video,
  children,
  onSuccess,
}: DeleteVideoDialogProps) {
  const [open, setOpen] = useState(false);
  const onOpenChange = setOpen;
  const router = useRouter();
  const api = useTRPC();
  const queryClient = useQueryClient();

  const deleteVideo = useMutation(
    api.video.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Video deleted", {
          description: "The video has been successfully deleted.",
        });
        queryClient.invalidateQueries({
          queryKey: [["video", "getAll"]],
        });
        onSuccess?.();
        router.push("/");
      },
      onError: (error) => {
        toast.error("Error", {
          description: error.message || "Failed to delete video",
        });
      },
    })
  );

  const handleDelete = () => {
    deleteVideo.mutate({ id: video.id });
    router.push("/");
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the video
            "{video.title}" and all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteVideo.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteVideo.isPending}
            onClick={handleDelete}
          >
            {deleteVideo.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
