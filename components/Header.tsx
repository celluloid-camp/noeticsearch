"use client";

import { LogOut, Search, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut, useSession } from "@/lib/auth-client";
import { LocaleSwitcher } from "./locale-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function Header() {
  const router = useRouter();
  const t = useTranslations();
  const { data: session } = useSession();

  const isLoggedIn = !!session?.user;

  const handleNewSearchClick = () => {
    router.push("/search");
  };

  const handleSignUpClick = () => {
    router.push("/sign-up");
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const getInitials = () => {
    if (session?.user?.name) {
      return session.user.name.charAt(0).toUpperCase();
    }
    if (session?.user?.email) {
      return session.user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-border border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center justify-between gap-4 px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <svg
              aria-hidden="true"
              className="h-5 w-5 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
              <path
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </div>
          <h1 className="font-bold text-foreground text-xl">
            {t("nav.allVideos")}
          </h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          {isLoggedIn ? (
            <>
              {/* New Search Button */}
              <Button
                onClick={handleNewSearchClick}
                type="button"
                variant="secondary"
              >
                <Search className="h-4 w-4" />
                {t("nav.newSearch")}
              </Button>

              <Link href="/import">
                <Button type="button">
                  <Video className="h-4 w-4" />
                  {t("video.import")}
                </Button>
              </Link>

              {/* Avatar + User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="rounded-full"
                    size="icon-lg"
                    type="button"
                    variant="ghost"
                  >
                    <Avatar className="size-10 border-2 border-border">
                      {session?.user?.image ? (
                        <AvatarImage
                          alt=""
                          className="object-cover"
                          src={session.user.image}
                        />
                      ) : null}
                      <AvatarFallback className="bg-secondary font-semibold text-foreground text-sm">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>
                    <p className="font-medium text-sm">
                      {session?.user?.name || "User"}
                    </p>
                    <p className="truncate font-normal text-muted-foreground text-xs">
                      {session?.user?.email}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={handleSignOut}
                    variant="destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("nav.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={handleSignUpClick} type="button">
              {t("nav.signUp")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
