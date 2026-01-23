'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel, SidebarTrigger } from '@/components/ui/sidebar'
import { Video, Globe, User, Search, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { SavedConversation, SearchResult } from '@/lib/types'
import SavedConversations from '@/components/SavedConversations'

interface AppLayoutClientProps {
  children: React.ReactNode
}

export default function AppLayoutClient({ children }: AppLayoutClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([])
  const [filterTab, setFilterTab] = useState<'all' | 'public' | 'my'>('all')

  // Load saved conversations from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('savedConversations')
    if (stored) {
      try {
        const conversations: SavedConversation[] = JSON.parse(stored)
        setSavedConversations(conversations)
      } catch (error) {
        console.error('Error parsing saved conversations:', error)
      }
    }
  }, [])

  // Listen for new saved conversations
  useEffect(() => {
    const handleConversationSaved = () => {
      const stored = localStorage.getItem('savedConversations')
      if (stored) {
        try {
          const conversations: SavedConversation[] = JSON.parse(stored)
          setSavedConversations(conversations)
        } catch (error) {
          console.error('Error parsing saved conversations:', error)
        }
      }
    }

    window.addEventListener('conversationSaved', handleConversationSaved)
    return () => {
      window.removeEventListener('conversationSaved', handleConversationSaved)
    }
  }, [])


  const handleLoadSavedResults = (results: SearchResult[]) => {
    // Store results in localStorage for the search page
    localStorage.setItem('currentSearchResults', JSON.stringify(results))
    // Navigate to search page to show results
    router.push('/search')
  }

  const handleDeleteConversation = (id: string) => {
    const updated = savedConversations.filter((c) => c.id !== id)
    setSavedConversations(updated)
    localStorage.setItem('savedConversations', JSON.stringify(updated))
  }

  const handleFilterTabClick = (tab: 'all' | 'public' | 'my') => {
    setFilterTab(tab)
    localStorage.setItem('filterTab', tab)
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('filterTabChanged'))
    // Navigate to home page if not already there
    if (pathname !== '/') {
      router.push('/')
    }
  }

  // Load filterTab from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('filterTab')
    if (stored && (stored === 'all' || stored === 'public' || stored === 'my')) {
      setFilterTab(stored as 'all' | 'public' | 'my')
    }
  }, [])

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
                  <SidebarMenuButton
                    isActive={filterTab === 'all'}
                    onClick={() => handleFilterTabClick('all')}
                    tooltip="All Videos"
                  >
                    <Video className="size-4" />
                    <span>All Videos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={filterTab === 'public'}
                    onClick={() => handleFilterTabClick('public')}
                    tooltip="Public Videos"
                  >
                    <Globe className="size-4" />
                    <span>Public Videos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={filterTab === 'my'}
                    onClick={() => handleFilterTabClick('my')}
                    tooltip="My Videos"
                  >
                    <User className="size-4" />
                    <span>My Videos</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              {/* My Searches */}
              <SidebarGroup className="border-t border-border">
                <SidebarGroupLabel className="px-1 flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mt-0! group-data-[collapsible=icon]:opacity-100!">
                  <Search className="size-4 shrink-0" />
                  <p className="text-xs font-semibold text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">My search</p>
                </SidebarGroupLabel>
                <div className="overflow-y-auto">
                  <SavedConversations
                    conversations={savedConversations}
                    onLoadResults={handleLoadSavedResults}
                    onDelete={handleDeleteConversation}
                  />
                </div>
              </SidebarGroup>
              {/* Public Searches */}
              <SidebarGroup className="flex-1 overflow-y-auto border-t border-border">
                <SidebarGroupLabel className="px-1 flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mt-0! group-data-[collapsible=icon]:opacity-100!">
                  <Users className="size-4 shrink-0" />
                  <p className="text-xs font-semibold text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">Public search</p>
                </SidebarGroupLabel>
                <div className="flex-1 overflow-y-auto">
                  <SavedConversations
                    conversations={savedConversations.filter((c) => c.isPublic)}
                    onLoadResults={handleLoadSavedResults}
                    onDelete={handleDeleteConversation}
                  />
                </div>
              </SidebarGroup>
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
