'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from '@/components/ui/sidebar'
import { Video, Globe, User } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface AppLayoutClientProps {
  children: React.ReactNode
}

export default function AppLayoutClient({ children }: AppLayoutClientProps) {
  const pathname = usePathname()

  // Determine active tab based on current route
  const getActiveTab = (): 'all' | 'public' | 'mine' => {
    if (pathname === '/public') return 'public'
    if (pathname === '/mine') return 'mine'
    return 'all'
  }

  const activeTab = getActiveTab()

  return (
    <div className="flex h-full w-full gap-4 p-4 overflow-hidden bg-background">
      <div className="shrink-0 relative" style={{ width: 'auto' }}>
        <SidebarProvider 
          className="flex h-full" 
          style={{ 
            minHeight: 0, 
            width: 'auto', 
            maxWidth: 'none', 
            '--sidebar-width': '16rem'
          } as React.CSSProperties}
        >
        {/* Left Sidebar - Menu */}
        <Sidebar side="left" collapsible="icon" variant="floating">
          <Card className="h-full flex flex-col overflow-hidden p-0 border-0 shadow-none bg-card">
            <SidebarHeader>
              <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
                <p className="text-xs font-semibold text-sidebar-foreground/70 px-1 group-data-[collapsible=icon]:hidden">Library</p>
                <SidebarTrigger />
              </div>
            </SidebarHeader>
            <SidebarContent className="p-0 flex flex-col h-full">
              {/* Video Filters */}
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={activeTab === 'all'} tooltip="All Videos">
                    <Link href="/">
                      <Video className="size-4" />
                      <span>All Videos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={activeTab === 'public'} tooltip="Public Videos">
                    <Link href="/public">
                      <Globe className="size-4" />
                      <span>Public Videos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={activeTab === 'mine'} tooltip="My Videos">
                    <Link href="/mine">
                      <User className="size-4" />
                      <span>My Videos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Card>
        </Sidebar>
        </SidebarProvider>
      </div>

      {/* Central Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background" style={{ flexBasis: 0 }}>
        <Card className="h-full w-full flex flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-auto p-4 w-full">
            {children}
          </div>
        </Card>
      </div>
    </div>
  )
}
