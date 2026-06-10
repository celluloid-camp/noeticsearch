"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ImportVideoConfirmForm } from "@/components/import-link/import-video-confirm-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchPeerTubeVideo, parsePeerTubeUrl } from "@/lib/peertube-client";

const importVideoSchema = z.object({
  url: z.url("Invalid URL format").min(1, "PeerTube URL is required"),
  isPublic: z.boolean(),
});

export type ImportVideoSchema = z.infer<typeof importVideoSchema>;

type PendingImport = {
  videoId: string;
  baseUrl: string;
  videoPassword?: string;
};

export default function ImportLinkPage() {
  const t = useTranslations("import");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [pendingPasswordUrl, setPendingPasswordUrl] = useState<string | null>(
    null
  );
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(
    null
  );
  const [isValidating, setIsValidating] = useState(false);

  const form = useForm<ImportVideoSchema>({
    resolver: zodResolver(importVideoSchema),
    defaultValues: {
      url: "",
      isPublic: false,
    },
  });

  const urlFromQuery = searchParams.get("url");
  useEffect(() => {
    if (urlFromQuery?.startsWith("http")) {
      form.setValue("url", urlFromQuery);
    }
  }, [urlFromQuery, form]);

  const urlValue = form.watch("url");

  // Validate URL and set pending import when valid (captions check done in confirm form)
  useEffect(() => {
    const validateUrl = async () => {
      const url = urlValue?.trim();
      if (!url) {
        setPendingImport(null);
        form.clearErrors("url");
        setIsValidating(false);
        return;
      }

      const parsed = parsePeerTubeUrl(url);
      if (!parsed) {
        setPendingImport(null);
        form.setError("url", {
          type: "manual",
          message: "Invalid PeerTube URL format",
        });
        setIsValidating(false);
        return;
      }

      setIsValidating(true);
      form.clearErrors("url");

      try {
        const videoInfo = await fetchPeerTubeVideo(url);
        setPasswordRequired(false);
        if (!videoInfo.captions || videoInfo.captions.length === 0) {
          form.setError("url", {
            type: "manual",
            message:
              "This video does not have any captions available. Videos with captions are required for import.",
          });
          setPendingImport(null);
        } else {
          setPendingImport({
            videoId: videoInfo.videoId,
            baseUrl: videoInfo.baseUrl,
          });
        }
      } catch (error) {
        if (
          error instanceof Error &&
          (error as { code?: string }).code === "video_requires_password"
        ) {
          setPendingPasswordUrl(url);
          setPasswordRequired(true);
          setPendingImport(null);
          form.clearErrors("url");
        } else {
          setPendingImport(null);
          form.setError("url", {
            type: "manual",
            message:
              error instanceof Error
                ? error.message
                : "Failed to fetch video information",
          });
        }
      } finally {
        setIsValidating(false);
      }
    };

    const timeoutId = setTimeout(validateUrl, 500);
    return () => clearTimeout(timeoutId);
  }, [urlValue, form]);

  const handleImportSuccess = (video: { id: string }) => {
    toast.success("Success", {
      description: "Video imported successfully!",
    });
    form.reset();
    setPendingImport(null);
    router.replace(`/video/${video.id}`);
  };

  const handlePasswordSubmit = async () => {
    if (!pendingPasswordUrl) {
      return;
    }
    if (!passwordInput) {
      setPasswordError("Password is required.");
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);

    try {
      const videoInfo = await fetchPeerTubeVideo(pendingPasswordUrl, {
        password: passwordInput,
      });

      if (!videoInfo.captions || videoInfo.captions.length === 0) {
        form.setError("url", {
          type: "manual",
          message:
            "This video does not have any captions available. Videos with captions are required for import.",
        });
      } else {
        form.clearErrors("url");
      }

      setPendingImport({
        videoId: videoInfo.videoId,
        baseUrl: videoInfo.baseUrl,
        videoPassword: passwordInput,
      });
      setPasswordRequired(false);
      setPasswordDialogOpen(false);
      setPasswordInput("");
      setPendingPasswordUrl(null);
      setPasswordError(null);
    } catch (error) {
      if (
        error instanceof Error &&
        (error as { code?: string }).code === "video_requires_password"
      ) {
        setPasswordError("Incorrect password. Please try again.");
      } else {
        setPasswordError(
          error instanceof Error
            ? error.message
            : "Failed to fetch video information."
        );
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-full w-full justify-center">
        <Form {...form}>
          <div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
            <form
              className="w-full"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <Card className="border-none bg-transparent shadow-none ring-0">
                <CardHeader>
                  <CardTitle>{t("title")}</CardTitle>
                  <CardDescription>{t("importDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PeerTube URL</FormLabel>
                          <FormControl>
                            <div className="space-y-2">
                              <div className="relative">
                                <Textarea
                                  aria-invalid={!!form.formState.errors.url}
                                  className="min-h-28 resize-y pr-10"
                                  placeholder="https://peertube.example.com/w/..."
                                  {...field}
                                />
                                <div className="absolute top-5 right-3 -translate-y-1/2">
                                  {isValidating ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  ) : pendingImport &&
                                    !form.formState.errors.url ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : form.formState.errors.url ? (
                                    <AlertCircle className="h-4 w-4 text-destructive" />
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription className="text-xs">
                            {t("urlFieldHint")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {passwordRequired ? (
                      <Alert className="border-amber-400">
                        <AlertTriangle className="text-amber-500" />
                        <AlertTitle>{t("passwordProtectedTitle")}</AlertTitle>
                        <AlertDescription>
                          <p>{t("passwordProtectedDescription")}</p>
                          <Button
                            className="mt-2"
                            onClick={() => setPasswordDialogOpen(true)}
                            size="sm"
                            type="button"
                          >
                            {t("enterPassword")}
                          </Button>
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </form>

            {pendingImport ? (
              <ImportVideoConfirmForm
                baseUrl={pendingImport.baseUrl}
                onSuccess={handleImportSuccess}
                videoId={pendingImport.videoId}
                videoPassword={pendingImport.videoPassword}
              />
            ) : (
              <Card className="hidden border-l shadow-none ring-0 md:flex">
                <CardHeader>
                  <CardTitle>{t("guideTitle")}</CardTitle>
                  <CardDescription>{t("guideDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li>{t("guideStep1")}</li>
                    <li>{t("guideStep2")}</li>
                    <li>{t("guideStep3")}</li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </Form>

        <Dialog
          onOpenChange={(open) => {
            setPasswordDialogOpen(open);
            if (!open) {
              setPasswordInput("");
              setPasswordError(null);
              setPendingPasswordUrl(null);
            }
          }}
          open={passwordDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("videoPasswordRequiredTitle")}</DialogTitle>
              <DialogDescription>
                {t("videoPasswordRequiredDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="video-password">
                {t("passwordLabel")}
              </label>
              <Input
                autoFocus
                id="video-password"
                onChange={(e) => setPasswordInput(e.target.value)}
                type="password"
                value={passwordInput}
              />
              {passwordError ? (
                <p className="text-destructive text-xs">{passwordError}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setPasswordDialogOpen(false);
                  setPasswordInput("");
                  setPasswordError(null);
                  setPendingPasswordUrl(null);
                }}
                type="button"
                variant="outline"
              >
                {t("cancel")}
              </Button>
              <Button
                disabled={!passwordInput || passwordLoading}
                onClick={handlePasswordSubmit}
                type="button"
              >
                {passwordLoading ? t("validating") : t("continue")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
