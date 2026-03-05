"use client";

import { IconVideo, IconWorld } from "@tabler/icons-react";
import { LogOut, PlusIcon, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { MySearchSidebar } from "@/components/search-history-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOut, useSession } from "@/lib/auth-client";
import OurIcon from "../icons/ouricon";
import { PublicSearchSidebar } from "../public-search-sidebar";

export function MainSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const tApp = useTranslations("app");
  const { data: session } = useSession();
  const { state } = useSidebar();

  const isLoggedIn = !!session?.user;
  const isExpanded = state === "expanded";

  const getActiveTab = (): "all" | "public" | "mine" => {
    if (pathname === "/library/public") {
      return "public";
    }
    if (pathname === "/library/mine") {
      return "mine";
    }
    return "all";
  };
  const activeTab = getActiveTab();

  const handleSignUpClick = () => router.push("/sign-up");
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
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-sidebar-border border-b">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center">
            <SidebarMenuButton asChild size="lg" tooltip={tApp("name")}>
              <Link className="flex flex-1 items-center gap-2" href="/">
                <OurIcon />
                <span className="font-mono text-lg">{tApp("name")}</span>
              </Link>
            </SidebarMenuButton>
            <SidebarTrigger className="ml-2 shrink-0" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {isLoggedIn ? <MySearchSidebar /> : null}
        <PublicSearchSidebar />

        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.library")}</SidebarGroupLabel>

          <SidebarMenu>
            {isLoggedIn ? (
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="sm">
                  <Link href="/import">
                    <PlusIcon className="size-4" />
                    <span>{t("nav.addVideo")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : null}

            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={activeTab === "all"}
                tooltip={t("nav.allVideos")}
              >
                <Link href="/library/all">
                  <IconVideo className="size-4" />
                  <span>{t("nav.allVideos")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {isLoggedIn ? (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={activeTab === "mine"}
                  tooltip={t("nav.myVideos")}
                >
                  <Link href="/library/mine">
                    <User className="size-4" />
                    <span>{t("nav.myVideos")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : null}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={activeTab === "public"}
                tooltip={t("nav.publicVideos")}
              >
                <Link href="/library/public">
                  <IconWorld className="size-4" />
                  <span>{t("nav.publicVideos")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border border-t">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className={`flex h-auto w-full min-w-0 shrink-0 items-center justify-start gap-2 rounded-full py-1.5 ${
                      isExpanded ? "pr-2" : "px-2"
                    }`}
                    type="button"
                    variant="ghost"
                  >
                    <Avatar className="size-8 shrink-0 border border-border">
                      {session?.user?.image ? (
                        <AvatarImage
                          alt=""
                          className="object-cover"
                          src={session.user.image}
                        />
                      ) : null}
                      <AvatarFallback className="bg-secondary font-semibold text-foreground text-xs">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    {isExpanded && (
                      <div className="flex min-w-0 flex-col truncate text-left">
                        <span className="truncate font-medium text-sm">
                          {session?.user?.name || t("common.user")}
                        </span>
                        <span className="truncate text-muted-foreground text-xs">
                          {session?.user?.email}
                        </span>
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>
                    <p className="font-medium text-sm">
                      {session?.user?.name || t("common.user")}
                    </p>
                    <p className="truncate font-normal text-muted-foreground text-xs">
                      {session?.user?.email}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      {t("settings.title")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={handleSignOut}
                    variant="destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("nav.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : isExpanded ? (
              <Button onClick={handleSignUpClick} size="lg" type="button">
                {t("nav.signUp")}
              </Button>
            ) : (
              <Button
                onClick={handleSignUpClick}
                size="icon"
                type="button"
                variant="ghost"
              >
                <User className="h-4 w-4" />
              </Button>
            )}
          </div>
          {isExpanded && (
            <div className="flex items-center gap-1">
              <LocaleSwitcher />
            </div>
          )}
        </div>
        {isExpanded && (
          <div className="flex items-center gap-3 px-1 pb-1">
            <Link
              className="text-muted-foreground text-xs hover:text-foreground"
              href="/about"
            >
              About
            </Link>
            <Link
              className="text-muted-foreground text-xs hover:text-foreground"
              href="/privacy"
            >
              Privacy
            </Link>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
