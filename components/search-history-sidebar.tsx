"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/lib/trpc/client";

export function SearchHistorySidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const api = useTRPC();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchToDelete, setSearchToDelete] = useState<string | null>(null);

  // Fetch search histories
  const { data: searchHistories, isLoading: isLoadingSearches } = useQuery(
    api.search.list.queryOptions()
  );

  // Delete mutation
  const deleteSearch = useMutation(
    api.search.delete.mutationOptions({
      onSuccess: () => {
        // Invalidate and refetch the search list
        queryClient.invalidateQueries({
          queryKey: api.search.list.queryOptions().queryKey,
        });
        setDeleteDialogOpen(false);
        const deletedId = searchToDelete;
        setSearchToDelete(null);

        // If we deleted the currently active search, redirect to home
        if (deletedId && pathname === `/search/${deletedId}`) {
          router.push("/");
        }
      },
    })
  );

  const handleDeleteClick = (e: React.MouseEvent, searchId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSearchToDelete(searchId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (searchToDelete) {
      deleteSearch.mutate({ id: searchToDelete });
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Searches</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="sm">
              <Link href="/search">
                <PlusIcon className="size-4" />
                <span>New search</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {isLoadingSearches ? (
          <div className="space-y-2 px-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : searchHistories && searchHistories.length > 0 ? (
          <SidebarMenu>
            {searchHistories.map((search) => {
              const isActive = pathname === `/search/${search.id}`;
              return (
                <SidebarMenuItem key={search.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={search.title ?? ""}
                  >
                    <Link href={`/search/${search.id}`}>
                      {search.title ? (
                        <span className="truncate">{search.title}</span>
                      ) : (
                        <Skeleton className="h-4 w-24" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                  <SidebarMenuAction
                    onClick={(e) => handleDeleteClick(e, search.id)}
                    showOnHover
                    title="Delete search"
                  >
                    <Trash2 className="size-4" />
                  </SidebarMenuAction>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        ) : (
          <div className="px-2 py-4 text-center text-muted-foreground text-xs">
            No searches yet
          </div>
        )}
      </SidebarGroupContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Search</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this search? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSearch.isPending}
              onClick={handleConfirmDelete}
            >
              {deleteSearch.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarGroup>
  );
}
