'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import VideoCatalog from '@/components/VideoCatalog'
import type { Video, Subtitle } from '@/lib/types'
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
  {
    id: 'default-peertube-video-4',
    title: 'Séminaire Pharmakon / édition 2020 séance 5 / Exorganologie III. Remondialisation, localités et modernité',
    url: 'https://video.mshparisnord.fr/w/eiPkiGskftKSD1a7GimFS7',
    thumbnail: '/placeholder.svg',
    subtitles: [],
    addedDate: new Date(),
    isPublic: true,
  },
  {
    id: 'default-peertube-video-5',
    title: 'Séminaire Pharmakon / édition 2019 séance 7 / Exorganologie II, Remondialisation et internation',
    url: 'https://video.mshparisnord.fr/w/h87RD24r5BFFsfpZG39ygf',
    thumbnail: '/placeholder.svg',
    subtitles: [],
    addedDate: new Date(),
    isPublic: true,
  },
  {
    id: 'default-peertube-video-6',
    title: 'Séminaire Pharmakon / édition 2020 séance 6 / Exorganologie III. Remondialisation, localités et modernité',
    url: 'https://video.mshparisnord.fr/w/mBbPr21isuiXvwE28h2yq5',
    thumbnail: '/placeholder.svg',
    subtitles: [],
    addedDate: new Date(),
    isPublic: true,
  },
  {
    id: 'default-peertube-video-7',
    title: 'Pharmakon / Cours 2013-2014 séance 1',
    url: 'https://video.mshparisnord.fr/w/o7NSYoKFWjFXPDSFQ1ATLK',
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
      const list: unknown[] = Array.isArray((captionsJson as { data?: unknown[] })?.data)
        ? ((captionsJson as { data: unknown[] }).data as unknown[])
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
  const [filterTab, setFilterTab] = useState<'all' | 'public' | 'my'>('all')

  const handleAddVideo = (video: Video) => {
    const newVideos = [...videos, { ...video, id: Date.now().toString() }]
    setVideos(newVideos)
    // Store in localStorage for video page access
    localStorage.setItem('videos', JSON.stringify(newVideos))
  }


  const handleVideoThumbnailClick = (video: Video) => {
    // Store videos in localStorage before navigation
    localStorage.setItem('videos', JSON.stringify(videos))
    router.push(`/video/${video.id}`)
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


  // Load filterTab from localStorage on mount and sync with changes
  useEffect(() => {
    const stored = localStorage.getItem('filterTab')
    if (stored && (stored === 'all' || stored === 'public' || stored === 'my')) {
      setFilterTab(stored as 'all' | 'public' | 'my')
    }

    // Listen for filterTab changes from AppLayout
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'filterTab' && e.newValue) {
        if (e.newValue === 'all' || e.newValue === 'public' || e.newValue === 'my') {
          setFilterTab(e.newValue as 'all' | 'public' | 'my')
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom events (for same-tab updates)
    const handleFilterTabChange = () => {
      const stored = localStorage.getItem('filterTab')
      if (stored && (stored === 'all' || stored === 'public' || stored === 'my')) {
        setFilterTab(stored as 'all' | 'public' | 'my')
      }
    }

    window.addEventListener('filterTabChanged', handleFilterTabChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('filterTabChanged', handleFilterTabChange)
    }
  }, [])

  return (
    <div className="flex flex-col gap-4 min-w-0 h-full overflow-hidden">
      <Suspense fallback={<Loading />}>
        <VideoCatalog
          videos={videos}
          filterTab={filterTab}
          onAddVideo={handleAddVideo}
          onVideoClick={handleVideoThumbnailClick}
        />
      </Suspense>
    </div>
  )
}
