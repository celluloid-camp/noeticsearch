'use client'

import { useEffect, useState, useRef } from 'react'
import type { Video, SearchResult } from '@/lib/types'
import MediaChromePlayer, { type MediaChromePlayerRef } from './media-chrome-player'

interface VideoPlayerProps {
  video: Video
  onClose: () => void
  selectedResult?: SearchResult | null
  onCurrentTimeChange?: (time: number) => void
  playerRef?: React.RefObject<MediaChromePlayerRef>
}

export default function VideoPlayer({ 
  video, 
  onClose, 
  selectedResult,
  onCurrentTimeChange,
  playerRef: externalPlayerRef
}: VideoPlayerProps) {
  const internalPlayerRef = useRef<MediaChromePlayerRef>(null)
  const playerRef = externalPlayerRef || internalPlayerRef
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [, setCurrentTime] = useState(0) // Used via onCurrentTimeChange callback
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pendingSeekRef = useRef<number | null>(null)

  // Unified seek handler - handles both pending seeks and selectedResult changes
  useEffect(() => {
    const player = playerRef.current
    if (!player) return
    
    // Get timestamp from selectedResult or pending seek
    const timestamp = selectedResult?.startTime ?? pendingSeekRef.current
    
    if (timestamp === undefined || timestamp === null || timestamp < 0) {
      pendingSeekRef.current = null
      return
    }
    
    console.log('🎯 Seek requested:', {
      timestamp,
      isPlayerReady,
      hasPlayer: !!player,
      source: selectedResult ? 'selectedResult' : 'pendingSeek'
    })
    
    // If player is ready, seek immediately
    if (isPlayerReady) {
      console.log('✅ Player ready, seeking to:', timestamp)
      // Clear pending seek
      pendingSeekRef.current = null
      
      // Use a delay to ensure video element is fully ready (especially for HLS)
      const seekTimeout = setTimeout(() => {
        if (playerRef.current && timestamp !== null) {
          playerRef.current.seekTo(timestamp)
          setCurrentTime(timestamp)
          onCurrentTimeChange?.(timestamp)
          
          // Auto-play after seeking (with delay for HLS streams)
          setTimeout(() => {
            console.log('▶️ Auto-playing after seek')
            setIsPlaying(true)
          }, 1000)
        }
      }, 500) // Increased delay for HLS streams
      
      return () => clearTimeout(seekTimeout)
    } else {
      // Store timestamp to seek when ready
      console.log('⏳ Player not ready, storing timestamp for later:', timestamp)
      pendingSeekRef.current = timestamp
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // playerRef.current is a ref and doesn't need to be in dependencies
  }, [selectedResult, isPlayerReady, onCurrentTimeChange])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])


  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Content */}
      <div className="flex-1 overflow-hidden p-4 min-h-0">
        <div className="bg-card rounded-lg w-full h-full flex flex-col border border-border overflow-hidden">
          <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 min-h-0">
            {/* Video Area */}
            <div className="flex flex-col gap-4 min-w-0">
            {/* Embedded Player */}
            <div className="relative w-full bg-black rounded-lg overflow-hidden border border-border aspect-video">
              <MediaChromePlayer
                ref={playerRef}
                url={video.url}
                playing={isPlaying}
                controls={true}
                subtitles={video.subtitles}
                onReady={() => {
                  console.log('🎬 MediaChromePlayer onReady called')
                  setIsPlayerReady(true)
                  // Also check for pending seek immediately when ready
                  if (pendingSeekRef.current !== null && playerRef.current) {
                    const timestamp = pendingSeekRef.current
                    console.log('🎬 Player ready callback, executing pending seek:', timestamp)
                    setTimeout(() => {
                      if (playerRef.current && pendingSeekRef.current === timestamp) {
                        pendingSeekRef.current = null
                        playerRef.current.seekTo(timestamp)
                        setCurrentTime(timestamp)
                        onCurrentTimeChange?.(timestamp)
                        setTimeout(() => {
                          setIsPlaying(true)
                        }, 800)
                      }
                    }, 500)
                  }
                }}
                onPlay={() => {
                  setIsPlaying(true)
                  // Start tracking progress when playing
                  progressIntervalRef.current = setInterval(() => {
                    if (playerRef.current) {
                      const time = playerRef.current.getCurrentTime()
                      setCurrentTime(time)
                    }
                  }, 100) // Update every 100ms
                }}
                onPause={() => {
                  setIsPlaying(false)
                  // Stop tracking progress when paused
                  if (progressIntervalRef.current) {
                    clearInterval(progressIntervalRef.current)
                    progressIntervalRef.current = null
                  }
                }}
                onProgress={(state) => {
                  setCurrentTime(state.playedSeconds)
                  onCurrentTimeChange?.(state.playedSeconds)
                }}
                onSeek={() => {
                  // Handle seek if needed
                }}
              />
            </div>

            {/* Video Title */}
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold text-foreground">{video.title}</h2>
              <p className="text-xs text-muted-foreground">PeerTube Video</p>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
