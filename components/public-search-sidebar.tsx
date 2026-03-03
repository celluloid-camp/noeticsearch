"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/lib/trpc/client";

export function PublicSearchSidebar() {
  const pathname = usePathname();
  const api = useTRPC();

  // Fetch search histories
  const { data: searchList, isLoading: isLoadingSearches } = useQuery(
    api.search.publicList.queryOptions()
  );

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Public searches</SidebarGroupLabel>
      <SidebarGroupContent>
        {isLoadingSearches ? (
          <div className="space-y-2 px-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : searchList && searchList.length > 0 ? (
          <SidebarMenu>
            {searchList.map((search) => {
              const isActive = pathname === `/search/${search.id}`;
              return (
                <SidebarMenuItem key={search.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={search.title ?? ""}
                  >
                    <Link href={`/search/${search.id}`}>
                      <span className="truncate">{search.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        ) : null}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
