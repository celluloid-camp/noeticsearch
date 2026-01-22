'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import VideoPlayer from '@/components/VideoPlayer'
import VideoChatPanel from '@/components/VideoChatPanel'
import type { Video, SearchResult, SavedConversation } from '@/lib/types'
import type { MediaChromePlayerRef } from '@/components/MediaChromePlayer'
import { useSearch } from '@/contexts/SearchContext'
import Loading from '@/app/loading'

export default function VideoPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const videoId = params.id as string
  const [video, setVideo] = useState<Video | null>(null)
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  const { searchResults, setSearchResults } = useSearch()
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const playerRef = useRef<MediaChromePlayerRef | null>(null)


  useEffect(() => {
    // Get video from localStorage (stored by home page)
    const storedVideos = localStorage.getItem('videos')
    if (storedVideos) {
      try {
        const videos: Video[] = JSON.parse(storedVideos)
        const foundVideo = videos.find((v) => v.id === videoId)
        if (foundVideo) {
          // Parse dates and subtitles properly
          const videoWithDates: Video = {
            ...foundVideo,
            addedDate: new Date(foundVideo.addedDate),
            subtitles: foundVideo.subtitles.map((sub) => ({
              ...sub,
            })),
          }
          setVideo(videoWithDates)

          // Check for timestamp in URL params (deep link)
          const timestampParam = searchParams.get('t')
          if (timestampParam) {
            const timestamp = parseFloat(timestampParam)
            console.log('🔗 URL timestamp param found:', timestampParam, 'parsed:', timestamp)
            if (!Number.isNaN(timestamp) && timestamp >= 0) {
              // Find the subtitle that matches this timestamp
              const matchingSubtitle = videoWithDates.subtitles.find(
                (sub) => timestamp >= sub.startTime && timestamp <= sub.endTime,
              )
              if (matchingSubtitle) {
                const result = {
                  videoId: videoWithDates.id,
                  videoTitle: videoWithDates.title,
                  videoThumbnail: videoWithDates.thumbnail,
                  subtitle: matchingSubtitle.text,
                  timestamp: matchingSubtitle.timestamp,
                  startTime: timestamp, // Use the exact timestamp from URL for seeking
                  endTime: matchingSubtitle.endTime,
                }
                console.log('✅ Found matching subtitle, setting selectedResult:', result)
                setSelectedResult(result)
                // Also update currentTime immediately so transcription panel highlights correctly
                setCurrentTime(timestamp)
              } else {
                // If no matching subtitle found, find the closest one
                if (videoWithDates.subtitles.length > 0) {
                  const closestSubtitle = videoWithDates.subtitles.reduce((closest, sub) => {
                    const closestDiff = Math.abs(closest.startTime - timestamp)
                    const currentDiff = Math.abs(sub.startTime - timestamp)
                    return currentDiff < closestDiff ? sub : closest
                  }, videoWithDates.subtitles[0])
                  
                  const result = {
                    videoId: videoWithDates.id,
                    videoTitle: videoWithDates.title,
                    videoThumbnail: videoWithDates.thumbnail,
                    subtitle: closestSubtitle.text,
                    timestamp: closestSubtitle.timestamp,
                    startTime: timestamp, // Use the exact timestamp from URL for seeking
                    endTime: closestSubtitle.endTime,
                  }
                  console.log('📍 No exact match, using closest subtitle, setting selectedResult:', result)
                  setSelectedResult(result)
                  // Also update currentTime immediately so transcription panel highlights correctly
                  setCurrentTime(timestamp)
                }
              }
            } else {
              console.warn('⚠️ Invalid timestamp in URL:', timestampParam)
            }
          }

          // Check for selected result in URL params (legacy support)
          const resultParam = searchParams.get('result')
          if (resultParam) {
            try {
              const result: SearchResult = JSON.parse(decodeURIComponent(resultParam))
              setSelectedResult(result)
            } catch (error) {
              console.error('Error parsing result param:', error)
            }
          }
        }
      } catch (error) {
        console.error('Error parsing stored videos:', error)
      }
    }

    setLoading(false)
  }, [videoId, searchParams])

  const handleBack = () => {
    router.back()
  }

  const handleSearch = (query: string) => {
    if (!video || !query.trim()) {
      setSearchResults([])
      localStorage.removeItem(`currentSearchResults_${videoId}`)
      return
    }

    const results: SearchResult[] = []
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
    setSearchResults(results)
    // Also save to video-specific key for VideoChatPanel
    localStorage.setItem(`currentSearchResults_${videoId}`, JSON.stringify(results))
  }

  const handlePlayVideo = (result: SearchResult) => {
    // Seek to the timestamp in the current video
    setSelectedResult(result)
    // The VideoPlayer will handle seeking when selectedResult changes
  }

  const handleSaveConversation = (conversation: SavedConversation) => {
    // Load existing saved conversations
    const stored = localStorage.getItem('savedConversations')
    const savedConversations: SavedConversation[] = stored ? JSON.parse(stored) : []
    savedConversations.push(conversation)
    localStorage.setItem('savedConversations', JSON.stringify(savedConversations))
    // Dispatch event to notify AppLayout
    window.dispatchEvent(new CustomEvent('conversationSaved'))
  }

  // Load search results from localStorage on mount
  useEffect(() => {
    if (video) {
      const stored = localStorage.getItem(`currentSearchResults_${videoId}`)
      if (stored) {
        try {
          const results: SearchResult[] = JSON.parse(stored)
          setSearchResults(results)
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [video, videoId, setSearchResults])

  if (loading) {
    return <Loading />
  }

  if (!video) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Video not found</h1>
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 gap-4 overflow-hidden">
      {/* Video Player */}
      <div className="flex-1 flex flex-col min-w-0">
        <VideoPlayer 
          video={video} 
          onClose={handleBack} 
          selectedResult={selectedResult}
          onCurrentTimeChange={setCurrentTime}
          playerRef={playerRef as React.RefObject<MediaChromePlayerRef>}
        />
      </div>

      {/* Middle: Transcript Panel */}
      <div className="w-96 flex flex-col min-w-0 border-l border-border">
        <Suspense fallback={<Loading />}>
          <VideoChatPanel
            videoId={videoId}
            video={video}
            onSearch={handleSearch}
            searchResults={searchResults}
            onPlayVideo={handlePlayVideo}
            onSaveConversation={handleSaveConversation}
            selectedResult={selectedResult}
            currentTime={currentTime}
            playerRef={playerRef as React.RefObject<{ seekTo: (time: number) => void }>}
            onSeek={(time) => {
              if (playerRef.current) {
                playerRef.current.seekTo(time)
              }
            }}
          />
        </Suspense>
      </div>
      {/* Note: ChatPanel is already in the global layout on the right */}
    </div>
  )
}
