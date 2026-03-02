"use client";

import { Loader2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { ImportVideoSchema } from "@/app/import/link/page";
import { VideoPreviewCard } from "@/components/import-link/video-preview-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

interface ImportVideoConfirmFormProps {
  form: UseFormReturn<ImportVideoSchema>;
  isSubmitting: boolean;
  onSubmit: (data: ImportVideoSchema) => Promise<void> | void;
}

export function ImportVideoConfirmForm({
  form,
  isSubmitting,
  onSubmit,
}: ImportVideoConfirmFormProps) {
  const videoPreview = form.watch("videoPreview");
  const isValidating = form.watch("isValidating") ?? false;
  const urlError = form.formState.errors.url;

  if (!videoPreview) {
    return null;
  }

  const isDisabled =
    isSubmitting ||
    isValidating ||
    !!urlError ||
    !videoPreview.captions ||
    videoPreview.captions.length === 0;

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Card className="flex flex-col justify-between border-none bg-transparent shadow-none ring-0">
          <CardContent className="flex flex-col gap-4">
            <VideoPreviewCard preview={videoPreview} />
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-md">Public Video</FormLabel>
                    <FormDescription>
                      Make this video visible to other users. If disabled, only
                      you can see it.
                    </FormDescription>
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
          </CardContent>
          <CardContent className="pt-0">
            <div className="flex justify-end">
              <Button disabled={isDisabled} size="lg" type="submit">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import Video"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
