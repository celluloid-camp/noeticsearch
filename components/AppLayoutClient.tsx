'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarRail, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel, SidebarTrigger } from '@/components/ui/sidebar'
import type { SavedConversation, Video, SearchResult } from '@/lib/types'
import SavedConversations from '@/components/SavedConversations'
import ChatPanel from '@/components/ChatPanel'
import ChatPanelTrigger from '@/components/ChatPanelTrigger'
import Loading from '@/app/loading'
import { useSearch } from '@/contexts/SearchContext'

interface AppLayoutClientProps {
  children: React.ReactNode
}

export default function AppLayoutClient({ children }: AppLayoutClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([])
  const [filterTab, setFilterTab] = useState<'all' | 'public' | 'my'>('all')
  const { searchResults, setSearchResults } = useSearch()

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

  // Handle search - context-aware based on current page
  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      localStorage.removeItem('currentSearchResults')
      return
    }

    // Check if we're on video page
    const videoPageMatch = pathname?.match(/^\/video\/([^/]+)$/)
    if (videoPageMatch) {
      // On video page - search only current video
      const videoId = videoPageMatch[1]
      const storedVideos = localStorage.getItem('videos')
      if (storedVideos) {
        try {
          const videos: Video[] = JSON.parse(storedVideos)
          const video = videos.find((v) => v.id === videoId)
          if (video?.subtitles) {
            const results: SearchResult[] = []
            video.subtitles.forEach((subtitle) => {
              if (subtitle.text.toLowerCase().includes(query.toLowerCase())) {
                results.push({
                  videoId: video.id,
                  videoTitle: video.title,
                  videoThumbnail: video.thumbnail,
                  subtitle: subtitle.text,
                  timestamp: subtitle.timestamp,
                  startTime: subtitle.startTime,
                  endTime: subtitle.endTime,
                })
              }
            })
            setSearchResults(results)
            localStorage.setItem(`currentSearchResults_${videoId}`, JSON.stringify(results))
          }
        } catch (error) {
          console.error('Error parsing videos:', error)
        }
      }
    } else {
      // On home page - search all videos
      const storedVideos = localStorage.getItem('videos')
      if (storedVideos) {
        try {
          const videos: Video[] = JSON.parse(storedVideos)
          const results: SearchResult[] = []
          videos.forEach((video) => {
            if (video.subtitles) {
              video.subtitles.forEach((subtitle) => {
                if (subtitle.text.toLowerCase().includes(query.toLowerCase())) {
                  results.push({
                    videoId: video.id,
                    videoTitle: video.title,
                    videoThumbnail: video.thumbnail,
                    subtitle: subtitle.text,
                    timestamp: subtitle.timestamp,
                    startTime: subtitle.startTime,
                    endTime: subtitle.endTime,
                  })
                }
              })
            }
          })
          setSearchResults(results)
          localStorage.setItem('currentSearchResults', JSON.stringify(results))
        } catch (error) {
          console.error('Error parsing videos:', error)
        }
      }
    }
  }

  // Handle play video - navigate to video page
  const handlePlayVideo = (result: SearchResult) => {
    const storedVideos = localStorage.getItem('videos')
    if (storedVideos) {
      try {
        const videos: Video[] = JSON.parse(storedVideos)
        const video = videos.find((v) => v.id === result.videoId)
        if (video) {
          // Navigate to video page with timestamp deep link
          router.push(`/video/${video.id}?t=${result.startTime}`)
        }
      } catch (error) {
        console.error('Error parsing videos:', error)
      }
    }
  }

  // Handle save conversation
  const handleSaveConversation = (conversation: SavedConversation) => {
    const stored = localStorage.getItem('savedConversations')
    const savedConversations: SavedConversation[] = stored ? JSON.parse(stored) : []
    savedConversations.push(conversation)
    localStorage.setItem('savedConversations', JSON.stringify(savedConversations))
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('conversationSaved'))
    // Update local state
    setSavedConversations(savedConversations)
  }

  const handleLoadSavedResults = (results: SearchResult[]) => {
    setSearchResults(results)
    // Navigate to home page if not already there
    if (pathname !== '/') {
      router.push('/')
    }
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
    <SidebarProvider className="flex h-full w-full" style={{ minHeight: 0 }}>
      <Sidebar side="left" collapsible="icon" variant="inset">
        <SidebarHeader>
          <p className="text-xs font-semibold text-sidebar-foreground/70 px-1">Library</p>
        </SidebarHeader>
        <SidebarContent className="p-0 flex flex-col h-full">
          {/* Video Filters */}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={filterTab === 'all'}
                onClick={() => handleFilterTabClick('all')}
              >
                <span>All Videos</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={filterTab === 'public'}
                onClick={() => handleFilterTabClick('public')}
              >
                <span>Public Videos</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={filterTab === 'my'}
                onClick={() => handleFilterTabClick('my')}
              >
                <span>My Videos</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {/* My Searches */}
          <SidebarGroup className="border-t border-border">
            <SidebarGroupLabel className="px-1">
              <p className="text-xs font-semibold text-sidebar-foreground/70">My search</p>
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
            <SidebarGroupLabel className="px-1">
              <p className="text-xs font-semibold text-sidebar-foreground/70">Public search</p>
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
      </Sidebar>
      <SidebarRail />
      <SidebarInset className="flex flex-col overflow-hidden">
        {/* Sidebar Toggle Button */}
        <div className="flex items-center gap-2 px-4 pt-4">
          <SidebarTrigger />
        </div>
        {/* Main Content with Collapsible Chat Panel */}
        <SidebarProvider 
          defaultOpen={true} 
          className="flex flex-1 overflow-hidden bg-background min-h-0"
          style={{ '--sidebar-width': '24rem' } as React.CSSProperties}
        >
          <div className="flex flex-1 gap-4 overflow-hidden p-4 bg-background min-h-0">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {children}
            </div>
          </div>
          {/* Right: Collapsible Chat Panel Sidebar */}
          <Sidebar side="right" collapsible="icon" variant="inset">
            <SidebarContent className="p-0 flex flex-col h-full group-data-[state=collapsed]:hidden">
              <Suspense fallback={<Loading />}>
                <ChatPanel
                  onSearch={handleSearch}
                  searchResults={searchResults}
                  onPlayVideo={handlePlayVideo}
                  onSaveConversation={handleSaveConversation}
                />
              </Suspense>
            </SidebarContent>
          </Sidebar>
          <SidebarRail />
          {/* Chat Panel Toggle Button */}
          <ChatPanelTrigger />
        </SidebarProvider>
      </SidebarInset>
    </SidebarProvider>
  )
}
