"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/hooks/use-toast";
import { useTRPC } from "@/lib/trpc/client";
import type { Video } from "@/lib/types";

const editVideoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  isPublic: z.boolean(),
});

type EditVideoSchema = z.infer<typeof editVideoSchema>;

interface EditVideoDialogProps {
  video: Video;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function EditVideoDialog({
  video,
  open,
  onOpenChange,
  onSuccess,
}: EditVideoDialogProps) {
  const { toast } = useToast();
  const api = useTRPC();
  const queryClient = useQueryClient();

  const form = useForm<EditVideoSchema>({
    resolver: zodResolver(editVideoSchema),
    defaultValues: {
      title: video.title,
      isPublic: video.isPublic,
    },
  });

  const updateVideo = useMutation(
    api.video.update.mutationOptions({
      onSuccess: () => {
        toast({
          title: "Video updated",
          description: "The video has been successfully updated.",
        });
        queryClient.invalidateQueries({
          queryKey: [["video", "getById"], { input: { id: video.id } }],
        });
        queryClient.invalidateQueries({
          queryKey: [["video", "getAll"]],
        });
        onSuccess?.();
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to update video",
          variant: "destructive",
        });
      },
    })
  );

  const onSubmit = (data: EditVideoSchema) => {
    updateVideo.mutate({
      id: video.id,
      title: data.title,
      isPublic: data.isPublic,
    });
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Video</DialogTitle>
          <DialogDescription>
            Update the video title and visibility settings.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <FormLabel className="text-base">Public</FormLabel>
                    <p className="text-muted-foreground text-sm">
                      Make this video visible to everyone
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
            <DialogFooter>
              <Button
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={updateVideo.isPending} type="submit">
                {updateVideo.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
