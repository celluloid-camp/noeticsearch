"use client";

import { KeyRound, Loader2, Palette, Save, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
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
          toast.success("Profile updated successfully");
          setIsNameChanged(false);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to update profile");
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
      toast.error(error.message || "Failed to send reset email");
    } else {
      setResetSuccess(true);
      toast.success("If an account exists, a reset email has been sent");
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
        <h1 className="font-bold text-2xl">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
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
            <span className="hidden md:inline">Profile</span>
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
            <span className="hidden md:inline">Security</span>
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
            <span className="hidden md:inline">Appearance</span>
          </button>
        </nav>

        <div className="flex-1">
          {activeTab === "profile" && (
            <div className="rounded-lg border p-6">
              <div className="mb-6">
                <h2 className="font-semibold text-lg">Profile</h2>
                <p className="text-muted-foreground text-sm">
                  Update your profile information
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    defaultValue={user.email}
                    disabled
                    id="email"
                    type="email"
                  />
                  <p className="text-muted-foreground text-xs">
                    Your email cannot be changed
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    defaultValue={user.name ?? ""}
                    id="name"
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Enter your name"
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="rounded-lg border p-6">
              <div className="mb-6">
                <h2 className="font-semibold text-lg">Password</h2>
                <p className="text-muted-foreground text-sm">
                  Reset your password via email
                </p>
              </div>
              <form className="space-y-4" onSubmit={handleRequestPasswordReset}>
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email to receive reset link"
                    type="email"
                    value={resetEmail}
                  />
                </div>
                {resetSuccess && (
                  <p className="text-green-600 text-sm dark:text-green-400">
                    Password reset email sent! Check your inbox.
                  </p>
                )}
                <Button disabled={!resetEmail || isResetting} type="submit">
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Email"
                  )}
                </Button>
              </form>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="rounded-lg border p-6">
              <div className="mb-6">
                <h2 className="font-semibold text-lg">Appearance</h2>
                <p className="text-muted-foreground text-sm">
                  Customize how the application looks
                </p>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <p className="text-muted-foreground text-sm">
                      Select your preferred color scheme
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="w-[150px]" variant="outline">
                        {theme === "light"
                          ? "Light"
                          : theme === "dark"
                            ? "Dark"
                            : "System"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setTheme("light")}>
                        Light
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("dark")}>
                        Dark
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme("system")}>
                        System
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <p className="text-muted-foreground text-sm">
                      Select your preferred language
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
