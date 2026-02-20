'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import VideoPlayer from '@/components/video-player'
import TranscriptionPanel from '@/components/transcription-panel'
import type { Video, SearchResult } from '@/lib/types'
import type { MediaChromePlayerRef } from '@/components/media-chrome-player'
import { useTRPC } from '@/lib/trpc/client'
import Loading from '@/app/loading'

export default function VideoPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const videoId = params.id as string
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const playerRef = useRef<MediaChromePlayerRef | null>(null)

  const api = useTRPC()
  const { data: videoData, isLoading, error } = useQuery(
    api.video.getById.queryOptions({
      id: videoId,
    }),
  )

  const video = videoData ? {
    ...videoData,
    addedDate: new Date(videoData.addedDate),
  } : null

  // Handle URL params for timestamp and selected result
  useEffect(() => {
    if (!video) return

    // Check for timestamp in URL params (deep link)
    const timestampParam = searchParams.get('t')
    if (timestampParam) {
      const timestamp = parseFloat(timestampParam)
      console.log('🔗 URL timestamp param found:', timestampParam, 'parsed:', timestamp)
      if (!Number.isNaN(timestamp) && timestamp >= 0) {
        // Find the subtitle that matches this timestamp
        const matchingSubtitle = video.subtitles.find(
          (sub) => timestamp >= sub.startTime && timestamp <= sub.endTime,
        )
        if (matchingSubtitle) {
          const result = {
            videoId: video.id,
            videoTitle: video.title,
            videoThumbnail: video.thumbnail,
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
          if (video.subtitles.length > 0) {
            const closestSubtitle = video.subtitles.reduce((closest, sub) => {
              const closestDiff = Math.abs(closest.startTime - timestamp)
              const currentDiff = Math.abs(sub.startTime - timestamp)
              return currentDiff < closestDiff ? sub : closest
            }, video.subtitles[0])

            const result = {
              videoId: video.id,
              videoTitle: video.title,
              videoThumbnail: video.thumbnail,
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
  }, [video, searchParams])

  const handleBack = () => {
    router.back()
  }



  if (isLoading) {
    return <Loading />
  }

  if (error || !video) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {error ? 'Error loading video' : 'Video not found'}
          </h1>
          {error && (
            <p className="text-muted-foreground mb-4">{error.message}</p>
          )}
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
    <div className="flex flex-1 gap-4 overflow-hidden h-full">
      {/* Video Player */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <VideoPlayer
          video={video}
          onClose={handleBack}
          selectedResult={selectedResult}
          onCurrentTimeChange={setCurrentTime}
          playerRef={playerRef as React.RefObject<MediaChromePlayerRef>}
        />
      </div>

      {/* Middle: Transcript Panel */}
      <div className="w-96 flex flex-col min-w-0 overflow-hidden h-full">
        <Suspense fallback={<Loading />}>
          <TranscriptionPanel
            videoId={videoId}
            video={video}
            selectedResult={selectedResult}
            currentTime={currentTime}
            playerRef={playerRef as React.RefObject<{ seekTo: (time: number) => void } | null>}
            onSeek={(time) => {
              console.log('🎯 onSeek called from TranscriptionPanel:', time)
              if (playerRef.current) {
                playerRef.current.seekTo(time)
              }
            }}
          />
        </Suspense>
      </div>
    </div>
  )
}
