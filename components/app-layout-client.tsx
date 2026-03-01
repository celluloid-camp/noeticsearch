import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { MainSidebar } from "./layout/sidebar";
import { Toaster } from "./ui/sonner";

interface AppLayoutClientProps {
  children: React.ReactNode;
}

export default function AppLayoutClient({ children }: AppLayoutClientProps) {
  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full overflow-hidden">
        <MainSidebar />
        <SidebarInset className="overflow-hidden">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
            <SidebarTrigger />
          </header>
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </SidebarInset>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}
