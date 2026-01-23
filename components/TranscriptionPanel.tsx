'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import type React from 'react'
import type { SearchResult, SavedConversation, Video, Subtitle } from '@/lib/types'
import type { MediaChromePlayerRef } from '@/components/MediaChromePlayer'
import { Bookmark, BookmarkCheck } from 'lucide-react'

interface TranscriptionPanelProps {
  videoId: string
  video: Video
  onSearch: (query: string) => void
  searchResults: SearchResult[]
  onPlayVideo: (result: SearchResult) => void
  onSaveConversation: (conversation: SavedConversation) => void
  selectedResult?: SearchResult | null
  currentTime?: number
  playerRef?: React.RefObject<MediaChromePlayerRef | { seekTo: (time: number) => void } | null> | React.RefObject<MediaChromePlayerRef | null>
  onSeek?: (time: number) => void
}

export default function TranscriptionPanel({ 
  videoId,
  video,
  onSearch: _onSearch, 
  searchResults: _searchResults, 
  onPlayVideo: _onPlayVideo, 
  onSaveConversation: _onSaveConversation,
  selectedResult,
  currentTime = 0,
  playerRef,
  onSeek
}: TranscriptionPanelProps) {
  const [transcriptSearchQuery, setTranscriptSearchQuery] = useState('')
  const [showMarkedOnly, setShowMarkedOnly] = useState(false)
  const subtitleRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  
  // Initialize marked subtitles (will load from localStorage on client)
  const [markedSubtitles, setMarkedSubtitles] = useState<Set<number>>(new Set())
  
  // Load marked subtitles from localStorage (client side only)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(`markedSubtitles_${videoId}`)
    if (stored) {
      try {
        const indices = JSON.parse(stored) as number[]
        setMarkedSubtitles(new Set(indices))
      } catch {
        // Keep default empty set
      }
    }
  }, [videoId])
  
  const toggleMarkSubtitle = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const newMarked = new Set(markedSubtitles)
    if (newMarked.has(index)) {
      newMarked.delete(index)
    } else {
      newMarked.add(index)
    }
    setMarkedSubtitles(newMarked)
    // Save to localStorage (client side only)
    if (typeof window !== 'undefined') {
      localStorage.setItem(`markedSubtitles_${videoId}`, JSON.stringify(Array.from(newMarked)))
    }
  }

  // Find the currently playing subtitle based on currentTime or selectedResult (in original array)
  // Use useMemo to ensure recalculation when selectedResult or currentTime changes
  const currentSubtitleIndex = useMemo(() => {
    console.log('🔍 Calculating currentSubtitleIndex:', { currentTime: currentTime.toFixed(2), selectedResultTime: selectedResult?.startTime })
    
    // If we have a selectedResult with a startTime, use that first (for deep linking)
    // But only if it's very recent (within last 2 seconds) to allow currentTime to take over
    if (selectedResult?.startTime !== undefined) {
      const seekTime = selectedResult.startTime
      const timeDiff = Math.abs(currentTime - seekTime)
      // If currentTime has moved significantly from selectedResult, use currentTime instead
      if (timeDiff > 2) {
        // Use currentTime - find the subtitle that matches current playback
        const index = video.subtitles.findIndex(
          (sub) => currentTime >= sub.startTime && currentTime <= sub.endTime
        )
        if (index !== -1) {
          console.log('✅ Found subtitle by currentTime:', index, 'time:', currentTime.toFixed(2))
          return index
        }
      } else {
        // Use selectedResult time
        const index = video.subtitles.findIndex(
          (sub) => seekTime >= sub.startTime && seekTime <= sub.endTime
        )
        if (index !== -1) {
          console.log('✅ Found subtitle by selectedResult:', index, 'time:', seekTime.toFixed(2))
          return index
        }
        // If no exact match, find the closest subtitle
        const closestIndex = video.subtitles.reduce((closest, sub, idx) => {
          const closestDiff = Math.abs(video.subtitles[closest].startTime - seekTime)
          const currentDiff = Math.abs(sub.startTime - seekTime)
          return currentDiff < closestDiff ? idx : closest
        }, 0)
        console.log('📍 Using closest subtitle:', closestIndex)
        return closestIndex
      }
    }
    // Otherwise, use currentTime from video playback
    const index = video.subtitles.findIndex(
      (sub) => currentTime >= sub.startTime && currentTime <= sub.endTime
    )
    if (index !== -1) {
      console.log('✅ Found subtitle by currentTime (no selectedResult):', index, 'time:', currentTime.toFixed(2))
    } else {
      console.log('❌ No subtitle found for currentTime:', currentTime.toFixed(2))
    }
    return index
  }, [selectedResult?.startTime, currentTime, video.subtitles])
  
  // Filter subtitles based on search and marked state
  const filteredSubtitles = video.subtitles
    .map((subtitle, index) => ({ subtitle, index }))
    .filter(({ subtitle, index }) => {
      // Filter by search query
      if (transcriptSearchQuery.trim()) {
        const matchesSearch = subtitle.text.toLowerCase().includes(transcriptSearchQuery.toLowerCase())
        if (!matchesSearch) return false
      }
      
      // Filter by marked state
      if (showMarkedOnly) {
        return markedSubtitles.has(index)
      }
      
      return true
    })

  // Auto-scroll to current subtitle while playing or when selectedResult changes
  useEffect(() => {
    // Only scroll if we have a valid current subtitle index
    if (currentSubtitleIndex !== -1) {
      // Find the filtered index for the current subtitle
      const filteredIdx = filteredSubtitles.findIndex(({ index }) => index === currentSubtitleIndex)
      
      console.log('📜 Scroll effect triggered:', {
        currentSubtitleIndex,
        filteredIdx,
        currentTime: currentTime.toFixed(2),
        filteredCount: filteredSubtitles.length
      })
      
      if (filteredIdx !== -1) {
        // Use multiple attempts to ensure scrolling works
        const scrollToSubtitle = () => {
          const subtitleElement = subtitleRefs.current[filteredIdx]
          if (subtitleElement) {
            console.log('📜 Scrolling to subtitle:', filteredIdx, 'currentSubtitleIndex:', currentSubtitleIndex, 'currentTime:', currentTime.toFixed(2))
            try {
              subtitleElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
              return true
            } catch (error) {
              console.error('❌ Error scrolling:', error)
              return false
            }
          }
          console.log('⚠️ Subtitle element not found in refs. filteredIdx:', filteredIdx, 'available refs:', Object.keys(subtitleRefs.current).length)
          return false
        }
        
        const timeouts: NodeJS.Timeout[] = []
        
        // Try immediately
        if (!scrollToSubtitle()) {
          // Retry with delays if element not ready
          timeouts.push(setTimeout(() => {
            if (!scrollToSubtitle()) {
              timeouts.push(setTimeout(() => {
                scrollToSubtitle()
              }, 200))
            }
          }, 100))
        }
        
        return () => {
          timeouts.forEach(timeout => {
            clearTimeout(timeout)
          })
        }
      } else {
        console.log('⚠️ Current subtitle not in filtered list:', currentSubtitleIndex, 'filtered count:', filteredSubtitles.length)
      }
    } else {
      console.log('⚠️ No current subtitle index found. currentTime:', currentTime.toFixed(2))
    }
  }, [currentSubtitleIndex, filteredSubtitles, currentTime]) // Update when current subtitle or time changes

  const handleSubtitleClick = (subtitle: Subtitle, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const seekTime = subtitle.startTime
    console.log('🎯 Subtitle clicked:', seekTime, 'onSeek available:', !!onSeek, 'playerRef available:', !!playerRef?.current)
    
    // Always try onSeek callback first (most reliable)
    if (onSeek) {
      console.log('✅ Calling onSeek with time:', seekTime)
      onSeek(seekTime)
    }
    
    // Also try direct playerRef access as backup
    if (playerRef?.current) {
      const player = playerRef.current
      // Check if player has seekTo method (MediaChromePlayerRef or compatible)
      if (player && typeof (player as MediaChromePlayerRef).seekTo === 'function') {
        console.log('✅ Also calling playerRef.seekTo with time:', seekTime)
        try {
          ;(player as MediaChromePlayerRef).seekTo(seekTime)
        } catch (error) {
          console.error('❌ Error calling seekTo:', error)
        }
      } else {
        console.warn('⚠️ playerRef.current does not have seekTo method')
      }
    } else {
      console.warn('⚠️ playerRef.current is not available')
    }
  }

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg">
          <div className="flex-1 flex flex-col bg-secondary rounded-lg border border-border overflow-hidden min-h-0">
            {/* Controls */}
            <div className="shrink-0 p-3 border-b border-border space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search subtitles..."
                  value={transcriptSearchQuery}
                  onChange={(e) => setTranscriptSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowMarkedOnly(!showMarkedOnly)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    showMarkedOnly
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border border-border hover:bg-background/80'
                  }`}
                >
                  {showMarkedOnly ? 'Show All' : 'Show Marked'}
                </button>
              </div>
              {filteredSubtitles.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {transcriptSearchQuery.trim() || showMarkedOnly ? ' found' : ''}
                </p>
              )}
            </div>
            
            {/* Filtered subtitles list */}
            <div 
              className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0"
              id="transcription-scroll-container"
            >
              {filteredSubtitles.length > 0 ? (
                filteredSubtitles.map(({ subtitle, index: originalIndex }, filteredIndex) => {
                  // Check if this subtitle matches the selected result
                  // Match by text or by timestamp/startTime
                  const isSelected = selectedResult && (
                    selectedResult.subtitle === subtitle.text ||
                    (selectedResult.startTime !== undefined &&
                     selectedResult.startTime >= subtitle.startTime && 
                     selectedResult.startTime <= subtitle.endTime) ||
                    (selectedResult.startTime !== undefined &&
                     selectedResult.startTime === subtitle.startTime)
                  )
                  // Check if this is the currently playing subtitle (from currentTime or selectedResult)
                  const isCurrentlyPlaying = currentSubtitleIndex === originalIndex
                  
                  // If we have a selectedResult, also check if this subtitle matches it by index
                  const matchesSelectedResult = selectedResult && currentSubtitleIndex === originalIndex
                  
                  // Debug logging
                  if (isSelected) {
                    console.log('Subtitle highlighted:', {
                      originalIndex,
                      filteredIndex,
                      subtitleText: subtitle.text,
                      selectedText: selectedResult.subtitle,
                      selectedStartTime: selectedResult.startTime,
                      subtitleStartTime: subtitle.startTime,
                      subtitleEndTime: subtitle.endTime
                    })
                  }
                  
                  // Determine highlight style
                  // Priority: selectedResult > currentlyPlaying
                  let highlightClass = 'bg-background border border-border hover:bg-background/80'
                  if (isSelected || matchesSelectedResult) {
                    // Selected from URL/search result - primary color (highest priority)
                    highlightClass = 'bg-primary text-primary-foreground border border-primary'
                  } else if (isCurrentlyPlaying) {
                    // Currently playing - different color (blue/cyan)
                    highlightClass = 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/40'
                  }

                  const isMarked = markedSubtitles.has(originalIndex)

                  return (
                    <button
                      type="button"
                      key={`${subtitle.startTime}-${subtitle.endTime}-${originalIndex}`}
                      ref={(el) => {
                        // Use filteredIndex for refs so scrolling works correctly
                        subtitleRefs.current[filteredIndex] = el
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleSubtitleClick(subtitle, e)
                      }}
                      className={`p-3 rounded-lg cursor-pointer transition-all text-xs text-left w-full ${highlightClass} relative group`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-[10px] opacity-75 mb-1">{subtitle.timestamp}</p>
                          <p className="line-clamp-3">{subtitle.text}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => toggleMarkSubtitle(originalIndex, e)}
                          className={`shrink-0 p-1 rounded transition-colors ${
                            isMarked
                              ? 'text-yellow-500 hover:text-yellow-600'
                              : 'text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100'
                          }`}
                          title={isMarked ? 'Unmark subtitle' : 'Mark subtitle'}
                        >
                          {isMarked ? (
                            <BookmarkCheck className="w-4 h-4" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="text-center text-muted-foreground text-sm py-8">
                  {transcriptSearchQuery.trim() || showMarkedOnly
                    ? 'No subtitles match your filters'
                    : 'No subtitles available'}
                </div>
              )}
            </div>
          </div>
    </div>
  )
}
