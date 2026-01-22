'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import VideoCatalog from '@/components/VideoCatalog'
import ChatPanel from '@/components/ChatPanel'
import SavedConversations from '@/components/SavedConversations'
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarRail, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar'
import { Video, SearchResult, SavedConversation, Subtitle } from '@/lib/types'
import Loading from './loading'

const DEFAULT_PUBLIC_VIDEOS: Video[] = [
  {
    id: 'default-peertube-video-2',
    title: 'PeerTube – Second Public Video',
    url: 'https://video.mshparisnord.fr/w/4hMUL4QVGzmx48daxGvj4h',
    thumbnail: '/placeholder.svg',
    subtitles: [],
    addedDate: new Date(),
    isPublic: true,
  },
  {
    id: 'default-peertube-video-3',
    title: 'PeerTube – Third Public Video',
    url: 'https://video.mshparisnord.fr/w/6fXFgBZgaC9PXDX83ZsiXF',
    thumbnail: '/placeholder.svg',
    subtitles: [],
    addedDate: new Date(),
    isPublic: true,
  },
]

const parseVttToSubtitles = (vtt: string): Subtitle[] => {
  const lines = vtt.split(/\r?\n/)
  const subtitles: Subtitle[] = []
  let i = 0

  const parseTime = (t: string): number => {
    // Format: HH:MM:SS.mmm or MM:SS.mmm
    const [hms, msPart] = t.split('.')
    const parts = hms.split(':').map(Number)
    let seconds = 0
    if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
    } else if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1]
    } else if (parts.length === 1) {
      seconds = parts[0]
    }
    const ms = msPart ? Number(msPart) / 1000 : 0
    return seconds + ms
  }

  const formatTimestamp = (seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  while (i < lines.length) {
    const line = lines[i].trim()

    // Look for cue timing line
    if (line.includes('-->')) {
      const [startRaw, endRaw] = line.split('-->').map((part) => part.trim())
      const startTime = parseTime(startRaw)
      const endTime = parseTime(endRaw)

      i++
      const textLines: string[] = []
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i])
        i++
      }

      const text = textLines.join(' ').trim()
      if (text) {
        subtitles.push({
          text,
          timestamp: formatTimestamp(startTime),
          startTime,
          endTime,
        })
      }
    }

    i++
  }

  return subtitles
}

async function fetchPeertubeMetadata(rawUrl: string): Promise<{ title: string; thumbnail: string; subtitles: Subtitle[] }> {
  const trimmed = rawUrl.trim()
  const url = new URL(trimmed)

  const segments = url.pathname.split('/').filter(Boolean)
  const videoId = segments[segments.length - 1]

  if (!videoId) {
    throw new Error('Invalid PeerTube URL')
  }

  // Main video metadata
  const apiUrl = `${url.origin}/api/v1/videos/${videoId}`
  const res = await fetch(apiUrl)

  if (!res.ok) {
    throw new Error('Could not fetch video metadata from PeerTube')
  }

  const data = await res.json()

  const title: string = data.name || data.title || 'Untitled video'

  let thumbnail = ''
  if (data.thumbnailUrl) {
    thumbnail = data.thumbnailUrl
  } else if (data.thumbnailPath) {
    try {
      thumbnail = new URL(data.thumbnailPath, url.origin).toString()
    } catch {
      thumbnail = ''
    }
  }

  // Captions (subtitles) via dedicated captions endpoint
  let subtitles: Subtitle[] = []

  try {
    const captionsRes = await fetch(`${url.origin}/api/v1/videos/${videoId}/captions`)
    if (captionsRes.ok) {
      const captionsJson: { data?: unknown[] } | unknown[] = await captionsRes.json()
      const list: unknown[] = Array.isArray((captionsJson as any)?.data)
        ? ((captionsJson as any).data as unknown[])
        : Array.isArray(captionsJson)
          ? captionsJson
          : []
      const firstCaption = list[0] as { url?: string; captionPath?: string } | undefined

      if (firstCaption) {
        const captionUrl =
          firstCaption.url ||
          (firstCaption.captionPath ? new URL(firstCaption.captionPath, url.origin).toString() : undefined)

        if (captionUrl) {
          const vttRes = await fetch(captionUrl)
          if (vttRes.ok) {
            const vttText = await vttRes.text()
            subtitles = parseVttToSubtitles(vttText)
          }
        }
      }
    }
  } catch {
    // ignore subtitle errors, keep empty list
  }

  return { title, thumbnail, subtitles }
}

export default function Home() {
  const router = useRouter()
  const [videos, setVideos] = useState<Video[]>(DEFAULT_PUBLIC_VIDEOS)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([])
  const [filterTab, setFilterTab] = useState<'all' | 'public' | 'my'>('all')

  const handleAddVideo = (video: Video) => {
    const newVideos = [...videos, { ...video, id: Date.now().toString() }]
    setVideos(newVideos)
    // Store in localStorage for video page access
    localStorage.setItem('videos', JSON.stringify(newVideos))
  }

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      localStorage.removeItem('currentSearchResults')
      return
    }

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
    // Save search results to localStorage
    localStorage.setItem('currentSearchResults', JSON.stringify(results))
  }

  const handlePlayVideo = (result: SearchResult) => {
    const video = videos.find((v) => v.id === result.videoId)
    if (video) {
      // Store videos in localStorage before navigation
      localStorage.setItem('videos', JSON.stringify(videos))
      // Navigate to video page with result as query param
      const resultParam = encodeURIComponent(JSON.stringify(result))
      router.push(`/video/${video.id}?result=${resultParam}`)
    }
  }

  const handleVideoThumbnailClick = (video: Video) => {
    // Store videos in localStorage before navigation
    localStorage.setItem('videos', JSON.stringify(videos))
    router.push(`/video/${video.id}`)
  }

  const handleSaveConversation = (conversation: SavedConversation) => {
    setSavedConversations([...savedConversations, conversation])
  }

  const handleLoadSavedResults = (results: SearchResult[]) => {
    setSearchResults(results)
  }

  const handleDeleteConversation = (id: string) => {
    setSavedConversations(savedConversations.filter((c) => c.id !== id))
  }

  const handleClearSearch = () => {
    setSearchResults([])
    localStorage.removeItem('currentSearchResults')
  }

  // On first load, fetch real metadata for the default PeerTube video
  useEffect(() => {
    const updateDefaultVideo = async () => {
      try {
        await Promise.all(
          DEFAULT_PUBLIC_VIDEOS.map(async (defaultVideo) => {
            const { title, thumbnail, subtitles } = await fetchPeertubeMetadata(defaultVideo.url)

            setVideos((prev) => {
              const updated = prev.map((video) =>
                video.id === defaultVideo.id
                  ? {
                      ...video,
                      title: title.trim(),
                      thumbnail: thumbnail || video.thumbnail,
                      subtitles: subtitles.length > 0 ? subtitles : video.subtitles,
                    }
                  : video,
              )
              // Store updated videos in localStorage
              localStorage.setItem('videos', JSON.stringify(updated))
              return updated
            })
          }),
        )
      } catch {
        // silently keep placeholder title/thumbnail on failure
      }
    }

    updateDefaultVideo()
  }, [])

  // Store videos in localStorage whenever they change
  useEffect(() => {
    if (videos.length > 0) {
      localStorage.setItem('videos', JSON.stringify(videos))
    }
  }, [videos])

  // Listen for video updates from HeaderWrapper
  useEffect(() => {
    const handleVideosUpdated = () => {
      const storedVideos = localStorage.getItem('videos')
      if (storedVideos) {
        try {
          const parsedVideos: Video[] = JSON.parse(storedVideos)
          setVideos(parsedVideos.map((video) => ({
            ...video,
            addedDate: new Date(video.addedDate),
          })))
        } catch (error) {
          console.error('Error parsing videos from localStorage:', error)
        }
      }
    }

    window.addEventListener('videosUpdated', handleVideosUpdated)
    return () => {
      window.removeEventListener('videosUpdated', handleVideosUpdated)
    }
  }, [])

  // Restore search results from localStorage on mount
  useEffect(() => {
    const storedResults = localStorage.getItem('currentSearchResults')
    if (storedResults) {
      try {
        const parsedResults: SearchResult[] = JSON.parse(storedResults)
        setSearchResults(parsedResults)
      } catch (error) {
        console.error('Error parsing stored search results:', error)
      }
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
                onClick={() => setFilterTab('all')}
              >
                <span>All Videos</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={filterTab === 'public'}
                onClick={() => setFilterTab('public')}
              >
                <span>Public Videos</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={filterTab === 'my'}
                onClick={() => setFilterTab('my')}
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
        {/* Main Content */}
        <div className="flex flex-1 gap-4 overflow-hidden p-4">
          {/* Center: Video Catalog */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <Suspense fallback={<Loading />}>
              <VideoCatalog
                videos={videos}
                filterTab={filterTab}
                onAddVideo={handleAddVideo}
                onVideoClick={handleVideoThumbnailClick}
                searchResults={searchResults}
                onClearSearch={handleClearSearch}
              />
            </Suspense>
          </div>

          {/* Right: Chat Panel */}
          <div className="w-96 flex flex-col min-w-0">
            <Suspense fallback={<Loading />}>
              <ChatPanel
                onSearch={handleSearch}
                searchResults={searchResults}
                onPlayVideo={handlePlayVideo}
                onSaveConversation={handleSaveConversation}
              />
            </Suspense>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
