"use client";

import { KeyRound, Loader2, Palette, Save, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import { i18nConfig } from "@/i18n/config";
import { setLocaleCookie } from "@/lib/actions/locale";
import { authClient } from "@/lib/auth-client";
import { useSession, useUpdateUser } from "@/lib/auth-hooks";

type SettingsTab = "profile" | "security" | "appearance";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const { user, isPending } = useSession();
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const [name, setName] = useState(user?.name ?? "");
  const [isNameChanged, setIsNameChanged] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const { theme, setTheme } = useTheme();
  const locale = useLocale() as Locale;
  const router = useRouter();

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
    <div className="flex min-w-0 flex-col gap-6 overflow-y-auto p-6">
      <div>
        <h1 className="font-bold text-2xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        <nav className="flex w-full shrink-0 space-x-2 overflow-x-auto md:h-auto md:w-[200px] md:flex-col md:space-x-0 md:space-y-1">
          <button
            className={`flex items-center gap-3 rounded-md px-3 py-2 font-medium text-sm transition-colors ${
              activeTab === "profile"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            onClick={() => setActiveTab("profile")}
          >
            <User className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">{t("profileTab")}</span>
          </button>
          <button
            className={`flex items-center gap-3 rounded-md px-3 py-2 font-medium text-sm transition-colors ${
              activeTab === "security"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            onClick={() => setActiveTab("security")}
          >
            <KeyRound className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">{t("securityTab")}</span>
          </button>
          <button
            className={`flex items-center gap-3 rounded-md px-3 py-2 font-medium text-sm transition-colors ${
              activeTab === "appearance"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            onClick={() => setActiveTab("appearance")}
          >
            <Palette className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">{t("appearanceTab")}</span>
          </button>
        </nav>

        <div className="flex-1">
          {activeTab === "profile" && (
            <div className="rounded-lg border p-6">
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
          )}

          {activeTab === "security" && (
            <div className="rounded-lg border p-6">
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
          )}

          {activeTab === "appearance" && (
            <div className="rounded-lg border p-6">
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
          )}
        </div>
      </div>
    </div>
  );
}
