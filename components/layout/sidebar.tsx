"use client";

import { Globe, LogOut, Search, User, Video } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SearchHistorySidebar } from "@/components/search-history-sidebar";
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

export function MainSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const { data: session } = useSession();
  const { state } = useSidebar();

  const isLoggedIn = !!session?.user;
  const isExpanded = state === "expanded";

  const getActiveTab = (): "all" | "public" | "mine" => {
    if (pathname === "/public") {
      return "public";
    }
    if (pathname === "/mine") {
      return "mine";
    }
    return "all";
  };
  const activeTab = getActiveTab();

  const handleNewSearchClick = () => router.push("/search");
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
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader className="border-sidebar-border border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="VisionSearch">
              <Link href="/">
                <OurIcon />
                <span>VisionSearch</span>
              </Link>
            </SidebarMenuButton>
            <SidebarTrigger className="ml-auto" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Library</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={activeTab === "all"}
                tooltip="All Videos"
              >
                <Link href="/">
                  <Video className="size-4" />
                  <span>All Videos</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={activeTab === "public"}
                tooltip="Public Videos"
              >
                <Link href="/public">
                  <Globe className="size-4" />
                  <span>Public Videos</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={activeTab === "mine"}
                tooltip="My Videos"
              >
                <Link href="/mine">
                  <User className="size-4" />
                  <span>My Videos</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SearchHistorySidebar />
      </SidebarContent>

      <div className="flex flex-wrap items-center gap-2">
        <LocaleSwitcher />
        {isLoggedIn ? (
          <>
            <Button
              className="shrink-0"
              onClick={handleNewSearchClick}
              size="sm"
              type="button"
              variant="secondary"
            >
              {isExpanded ? (
                <>
                  <Search className="h-4 w-4" />
                  New search
                </>
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
            <Link href="/import">
              <Button className="shrink-0" size="sm" type="button">
                <Video className="h-4 w-4" />
                {isExpanded && t("video.import")}
              </Button>
            </Link>
          </>
        ) : null}
      </div>
      <SidebarFooter className="border-sidebar-border border-t">
        <div className="flex flex-wrap items-center gap-2">
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="flex h-auto w-full min-w-0 shrink-0 items-center justify-start gap-2 rounded-full py-1.5 pr-2"
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
                        {session?.user?.name || "User"}
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
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={handleSignUpClick} size="sm" type="button">
              Sign up
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
