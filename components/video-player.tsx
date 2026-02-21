'use client'

import { useEffect, useState, useRef } from 'react'
import { Settings, Trash2 } from 'lucide-react'
import type { Video, SearchResult } from '@/lib/types'
import MediaChromePlayer, { type MediaChromePlayerRef } from './media-chrome-player'
import { Button } from '@/components/ui/button'
import EditVideoDialog from './edit-video-dialog'
import DeleteVideoDialog from './delete-video-dialog'

interface VideoPlayerProps {
  video: Video
  onClose: () => void
  selectedResult?: SearchResult | null
  onCurrentTimeChange?: (time: number) => void
  playerRef?: React.RefObject<MediaChromePlayerRef>
  onVideoUpdated?: () => void
  onVideoDeleted?: () => void
}

export default function VideoPlayer({ 
  video, 
  onClose: _onClose, 
  selectedResult,
  onCurrentTimeChange,
  playerRef: externalPlayerRef,
  onVideoUpdated,
  onVideoDeleted
}: VideoPlayerProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const internalPlayerRef = useRef<MediaChromePlayerRef>(null)
  const playerRef = externalPlayerRef || internalPlayerRef
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [, setCurrentTime] = useState(0) // Used via onCurrentTimeChange callback
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pendingSeekRef = useRef<number | null>(null)

  // Unified seek handler - handles both pending seeks and selectedResult changes
  useEffect(() => {
    // Get timestamp from selectedResult or pending seek
    const timestamp = selectedResult?.startTime ?? pendingSeekRef.current
    
    if (timestamp === undefined || timestamp === null || timestamp < 0) {
      pendingSeekRef.current = null
      return
    }
    
    // Capture player ref at effect execution time
    const player = playerRef.current
    console.log('🎯 Seek requested:', {
      timestamp,
      isPlayerReady,
      hasPlayer: !!player,
      source: selectedResult ? 'selectedResult' : 'pendingSeek'
    })
    
    // If player is ready, seek immediately
    if (isPlayerReady && player) {
      console.log('✅ Player ready, seeking to:', timestamp)
      // Clear pending seek
      pendingSeekRef.current = null
      
      // Use a delay to ensure video element is fully ready (especially for HLS)
      const seekTimeout = setTimeout(() => {
        // Access ref again inside timeout to get latest value
        const currentPlayer = playerRef.current
        if (currentPlayer && timestamp !== null) {
          currentPlayer.seekTo(timestamp)
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
    // playerRef is a ref object - refs don't change identity so they don't need to be in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-foreground">{video.title}</h2>
                  <p className="text-xs text-muted-foreground">PeerTube Video</p>
                </div>
                {video.canEdit && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setIsEditDialogOpen(true)}
                      title="Edit video"
                    >
                      <Settings className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      title="Delete video"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {video.canEdit && (
        <>
          <EditVideoDialog
            video={video}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSuccess={() => {
              setIsEditDialogOpen(false)
              onVideoUpdated?.()
            }}
          />
          <DeleteVideoDialog
            video={video}
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onSuccess={() => {
              setIsDeleteDialogOpen(false)
              onVideoDeleted?.()
            }}
          />
        </>
      )}
    </div>
  )
}
