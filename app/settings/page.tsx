"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Palette, Save, Server, User } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";
import {
  ConnectInstanceDialog,
  ConnectionStatusBadge,
} from "@/components/import-link/connect-instance-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Locale } from "@/i18n/config";
import { i18nConfig } from "@/i18n/config";
import { setLocaleCookie } from "@/lib/actions/locale";
import { authClient } from "@/lib/auth-client";
import { useSession, useUpdateUser } from "@/lib/auth-hooks";
import { useTRPC } from "@/lib/trpc/client";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { user, isPending } = useSession();
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();
  const api = useTRPC();
  const queryClient = useQueryClient();

  const [name, setName] = useState(user?.name ?? "");
  const [isNameChanged, setIsNameChanged] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const { theme, setTheme } = useTheme();
  const locale = useLocale() as Locale;
  const router = useRouter();

  const {
    data: peertubeInstances,
    isLoading: isLoadingPeertubeInstances,
    refetch: refetchPeertubeInstances,
  } = useQuery(api.peertubeInstance.listWithAuth.queryOptions({ limit: 50 }));

  const manageablePeertubeInstances = (peertubeInstances ?? []).filter(
    (instance) => !instance.isIndex
  );

  const handleLocaleChange = async (newLocale: Locale) => {
    await setLocaleCookie(newLocale);
    router.refresh();
  };

  const getLocaleLabel = (loc: Locale) => {
    return loc === "en" ? "English" : "Français";
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setIsNameChanged(value !== (user?.name ?? ""));
  };

  const handleUpdateName = async () => {
    if (!isNameChanged) {
      return;
    }

    updateUser(
      { name },
      {
        onSuccess: () => {
          toast.success(t("profileUpdated"));
          setIsNameChanged(false);
        },
        onError: (error) => {
          toast.error(error.message || t("failedUpdateProfile"));
        },
      }
    );
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    setResetSuccess(false);

    const { error } = await authClient.requestPasswordReset({
      email: resetEmail,
    });

    if (error) {
      toast.error(error.message || t("failedSendReset"));
    } else {
      setResetSuccess(true);
      toast.success(t("resetSentIfExists"));
    }

    setIsResetting(false);
  };

  if (isPending || !user) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="h-full gap-0 py-0">
      <CardHeader className="border-b py-3">
        <CardTitle className="font-mono text-muted-foreground text-xs uppercase tracking-widest">
          {t("title")}
        </CardTitle>
      </CardHeader>
      <Tabs
        className="h-full flex-1"
        defaultValue="profile"
        orientation="vertical"
      >
        <TabsList
          className="h-full w-44 shrink-0 rounded-none p-2"
          variant="line"
        >
          <TabsTrigger value="profile">
            <User className="size-4" />
            {t("profileTab")}
          </TabsTrigger>
          <TabsTrigger value="security">
            <KeyRound className="size-4" />
            {t("securityTab")}
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="size-4" />
            {t("appearanceTab")}
          </TabsTrigger>
          <TabsTrigger value="peertube">
            <Server className="size-4" />
            {t("peertubeTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          className="max-w-2xl overflow-y-auto border-l"
          value="profile"
        >
          <div className="p-6">
            <div className="mb-6">
              <h2 className="font-semibold text-lg">{t("profile")}</h2>
              <p className="text-muted-foreground text-sm">
                {t("updateProfile")}
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  defaultValue={user.email}
                  disabled
                  id="email"
                  type="email"
                />
                <p className="text-muted-foreground text-xs">
                  {t("emailCannotChange")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">{t("name")}</Label>
                <Input
                  defaultValue={user.name ?? ""}
                  id="name"
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={t("enterName")}
                  value={name}
                />
              </div>
              <Button
                disabled={!isNameChanged || isUpdating}
                onClick={handleUpdateName}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("saving")}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t("saveChanges")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          className="max-w-2xl overflow-y-auto border-l"
          value="security"
        >
          <div className="p-6">
            <div className="mb-6">
              <h2 className="font-semibold text-lg">{t("password")}</h2>
              <p className="text-muted-foreground text-sm">
                {t("resetPassword")}
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleRequestPasswordReset}>
              <div className="space-y-2">
                <Label htmlFor="reset-email">{t("email")}</Label>
                <Input
                  id="reset-email"
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder={t("enterEmailReset")}
                  type="email"
                  value={resetEmail}
                />
              </div>
              {resetSuccess && (
                <p className="text-green-600 text-sm dark:text-green-400">
                  {t("resetEmailSent")}
                </p>
              )}
              <Button disabled={!resetEmail || isResetting} type="submit">
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("sending")}
                  </>
                ) : (
                  t("sendResetEmail")
                )}
              </Button>
            </form>
          </div>
        </TabsContent>

        <TabsContent
          className="max-w-2xl overflow-y-auto border-l"
          value="appearance"
        >
          <div className="p-6">
            <div className="mb-6">
              <h2 className="font-semibold text-lg">{t("appearance")}</h2>
              <p className="text-muted-foreground text-sm">
                {t("customizeAppearance")}
              </p>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Label>{t("theme")}</Label>
                  <p className="text-muted-foreground text-sm">
                    {t("selectColorScheme")}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="w-[150px]" variant="outline">
                      {theme === "light"
                        ? t("light")
                        : theme === "dark"
                          ? t("dark")
                          : t("system")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      {t("light")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      {t("dark")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                      {t("system")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Label>{t("language")}</Label>
                  <p className="text-muted-foreground text-sm">
                    {t("selectLanguage")}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="w-[150px]" variant="outline">
                      {getLocaleLabel(locale as Locale)}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {i18nConfig.locales.map((loc) => (
                      <DropdownMenuItem
                        key={loc}
                        onClick={() => handleLocaleChange(loc)}
                      >
                        <span className="flex flex-1 items-center">
                          {getLocaleLabel(loc)}
                        </span>
                        {locale === loc && <span className="ml-2">✓</span>}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          className="max-w-2xl overflow-y-auto border-l"
          value="peertube"
        >
          <div className="p-6">
            <div className="mb-6">
              <h2 className="font-semibold text-lg">{t("peertubeTitle")}</h2>
              <p className="text-muted-foreground text-sm">
                {t("peertubeDescription")}
              </p>
            </div>

            {isLoadingPeertubeInstances ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="size-4 animate-spin" />
                {t("loadingInstances")}
              </div>
            ) : manageablePeertubeInstances.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t("noPeertubeInstances")}
              </p>
            ) : (
              <div className="space-y-3">
                {manageablePeertubeInstances.map((instance) => {
                  const isConnected = instance.authStatus === "connected";

                  return (
                    <div
                      className="flex items-center justify-between gap-3 rounded-md border p-3"
                      key={instance.id}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {instance.thumbnail ? (
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-muted">
                            <Image
                              alt={instance.title}
                              className="object-cover"
                              fill
                              src={instance.thumbnail}
                              unoptimized
                            />
                          </div>
                        ) : null}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-sm">
                            {instance.title}
                          </p>
                          <a
                            className="truncate text-muted-foreground text-xs underline-offset-2 hover:underline"
                            href={instance.host}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {instance.host}
                          </a>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {isConnected ? (
                          <ConnectionStatusBadge status={instance.authStatus} />
                        ) : null}
                        <ConnectInstanceDialog
                          allowReconnectWhenConnected
                          host={instance.host}
                          instanceThumbnail={instance.thumbnail}
                          instanceTitle={instance.title}
                          onStatusChange={() => {
                            queryClient.invalidateQueries({
                              queryKey: [["peertubeInstance"]],
                            });
                            refetchPeertubeInstances();
                          }}
                          triggerClassName="h-8"
                          triggerVariant="outline"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
