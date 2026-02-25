"use client";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { MainSidebar } from "./layout/sidebar";

interface AppLayoutClientProps {
  children: React.ReactNode;
}

export default function AppLayoutClient({ children }: AppLayoutClientProps) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full">
        <MainSidebar />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            {isMobile && <SidebarTrigger />}
          </header>
          <div className="px-4 py-8">{children}</div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
