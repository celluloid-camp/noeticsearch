'use client'

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import {
  MediaController,
  MediaControlBar,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaTimeRange,
  MediaTimeDisplay,
  MediaMuteButton,
  MediaVolumeRange,
  MediaFullscreenButton,
  MediaCaptionsButton,
} from 'media-chrome/react'
import Hls from 'hls.js'
import type { Subtitle } from '@/lib/types'

// PeerTube URL pattern matcher
const MATCH_URL = /(https?):\/\/(.*)(\/videos\/watch\/|\/w\/)(.*)/

interface MediaChromePlayerProps {
  url: string
  playing?: boolean
  controls?: boolean
  subtitles?: Subtitle[]
  onReady?: () => void
  onPlay?: () => void
  onPause?: () => void
  onProgress?: (state: { playedSeconds: number }) => void
  onSeek?: (seconds: number) => void
}

export interface MediaChromePlayerRef {
  seekTo: (seconds: number) => void
  getCurrentTime: () => number
  getDuration: () => number
}

const MediaChromePlayer = forwardRef<MediaChromePlayerRef, MediaChromePlayerProps>(function MediaChromePlayer({
  url,
  playing = false,
  controls = true,
  subtitles = [],
  onReady,
  onPlay,
  onPause,
  onProgress,
  onSeek,
}, ref) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [vttUrl, setVttUrl] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const currentTimeRef = useRef(0)
  const isSeekingRef = useRef(false)
  const pendingSeekRef = useRef<number | null>(null)
  const onReadyRef = useRef(onReady)
  const onSeekRef = useRef(onSeek)
  
  // Keep refs in sync with props
  useEffect(() => {
    onReadyRef.current = onReady
    onSeekRef.current = onSeek
  }, [onReady, onSeek])
  
  // Check video ready state periodically as fallback (for non-HLS streams)
  useEffect(() => {
    if (!videoSrc || isReady) return
    
    // Skip polling for HLS streams (handled by HLS.js events)
    if (videoSrc.endsWith('.m3u8')) return
    
    let interval: NodeJS.Timeout | null = null
    let checkCount = 0
    const maxChecks = 100 // Check for up to 20 seconds (100 * 200ms)
    
    const checkVideoReady = () => {
      checkCount++
      const video = videoRef.current
      if (video) {
        // Check if video has metadata or duration (indicates it's loaded)
        if (video.readyState >= 1 || video.duration > 0) {
          console.log('📹 Video ready detected via polling, readyState:', video.readyState, 'duration:', video.duration, 'checks:', checkCount)
          setIsReady(true)
          onReady?.()
          if (interval) {
            clearInterval(interval)
            interval = null
          }
        } else if (checkCount % 5 === 0) { // Log every 5 checks (every second)
          console.log('📹 Polling: video not ready yet, readyState:', video.readyState, 'duration:', video.duration, 'checks:', checkCount)
        }
      }
      
      // Stop checking after max attempts
      if (checkCount >= maxChecks && interval) {
        console.warn('📹 Polling stopped: video did not become ready after', maxChecks, 'checks')
        clearInterval(interval)
        interval = null
      }
    }
    
    // Check immediately
    checkVideoReady()
    
    // Check periodically
    interval = setInterval(checkVideoReady, 200) // Check every 200ms
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [videoSrc, isReady, onReady])
  
  // Fetch video source from PeerTube API
  useEffect(() => {
    const fetchVideoSource = async () => {
      const match = MATCH_URL.exec(url)
      if (!match) return
      
      const [, protocol, domain, , videoId] = match
      if (!videoId) {
        console.error('Invalid PeerTube URL')
        return
      }
      
      const apiUrl = `${protocol}://${domain}/api/v1/videos/${videoId}`

      try {
        console.log('🔍 Fetching video source from:', apiUrl)
        const response = await fetch(apiUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch video metadata: ${response.status} ${response.statusText}`)
        }
        const data = await response.json()
        console.log('📦 Video metadata received:', { 
          hasFiles: !!data.files, 
          filesCount: data.files?.length || 0,
          hasStreamingPlaylists: !!data.streamingPlaylists,
          playlistsCount: data.streamingPlaylists?.length || 0
        })
        
        // Prefer direct file URLs over HLS playlists (better browser compatibility)
        // Get the best quality video source
        // PeerTube API returns files array with different qualities
        let selectedSource: string | null = null
        
        if (data.files && data.files.length > 0) {
          // Sort by resolution/quality and get the best one
          const bestFile = data.files.sort((a: { resolution?: { height?: number } }, b: { resolution?: { height?: number } }) => {
            const aRes = a.resolution?.height || 0
            const bRes = b.resolution?.height || 0
            return bRes - aRes
          })[0]
          
          console.log('📹 Best file selected:', {
            fileUrl: bestFile.fileUrl,
            fileDownloadUrl: bestFile.fileDownloadUrl,
            resolution: bestFile.resolution
          })
          
          if (bestFile.fileUrl) {
            selectedSource = bestFile.fileUrl
            console.log('✅ Using fileUrl:', selectedSource)
          } else if (bestFile.fileDownloadUrl) {
            selectedSource = bestFile.fileDownloadUrl
            console.log('✅ Using fileDownloadUrl:', selectedSource)
          }
        }
        
        // Fallback to HLS playlist if no direct file available
        if (!selectedSource && data.streamingPlaylists && data.streamingPlaylists.length > 0) {
          const playlist = data.streamingPlaylists[0]
          if (playlist.playlistUrl) {
            selectedSource = playlist.playlistUrl
            console.log('✅ Using HLS playlist (fallback):', selectedSource)
            console.warn('⚠️ HLS streams may not work in all browsers without hls.js')
          }
        }
        
        if (selectedSource) {
          setVideoSrc(selectedSource)
        } else {
          console.error('❌ No valid video source found')
          setVideoSrc(null)
        }
      } catch (error) {
        console.error('❌ Error fetching video source:', error)
        // Don't fallback to embed URL - that won't work with Media Chrome
        setVideoSrc(null)
      }
    }

    fetchVideoSource()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  // Handle HLS streams with hls.js
  useEffect(() => {
    if (!videoSrc || !videoSrc.endsWith('.m3u8')) {
      // Clean up HLS if videoSrc is no longer an HLS stream
      if (hlsRef.current) {
        console.log('🧹 Cleaning up HLS instance (not HLS stream anymore)')
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      return
    }
    
    const video = videoRef.current
    if (!video) return
    
    // Check if HLS is supported natively (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('📹 Browser supports HLS natively, using native playback')
      // Clean up any existing HLS instance
      if (hlsRef.current) {
        console.log('🧹 Cleaning up HLS instance (native support)')
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      return
    }
    
    // Check if hls.js is supported
    if (!Hls.isSupported()) {
      console.error('❌ HLS.js is not supported in this browser')
      return
    }
    
    // If HLS is already initialized with the same source and video element, don't re-initialize
    // Also check if the source URL matches to avoid re-initializing with the same source
    if (hlsRef.current && hlsRef.current.media === video) {
      const currentSource = hlsRef.current.url || ''
      if (currentSource === videoSrc) {
        console.log('📹 HLS already initialized with same source and video element, skipping re-initialization')
        return
      } else {
        console.log('📹 HLS source changed, will re-initialize:', currentSource, '->', videoSrc)
      }
    }
    
    console.log('📹 Initializing HLS.js for HLS stream:', videoSrc)
    
    // Store current time before reloading (if we have one)
    const savedCurrentTime = pendingSeekRef.current ?? (video.currentTime > 0 ? video.currentTime : null)
    if (savedCurrentTime) {
      console.log('💾 Saving current time before HLS reload:', savedCurrentTime)
    }
    
    // Clean up existing HLS instance
    if (hlsRef.current) {
      console.log('🧹 Cleaning up existing HLS instance')
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    
    // Create new HLS instance
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 90,
    })
    
    hlsRef.current = hls
    
    // Load the source
    hls.loadSource(videoSrc)
    hls.attachMedia(video)
    
    // Handle HLS events
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      console.log('📹 HLS manifest parsed')
      // Wait for video to have duration and be seekable before marking as ready
      const checkReady = () => {
        if (video.duration > 0 && video.readyState >= 2) {
          console.log('📹 HLS video ready, duration:', video.duration, 'readyState:', video.readyState)
          setIsReady(true)
          onReadyRef.current?.()
          
          // Restore saved current time or execute pending seek
          const seekTime = pendingSeekRef.current ?? savedCurrentTime
          if (seekTime !== null && !isSeekingRef.current) {
            console.log('📹 Restoring seek position after HLS manifest parsed:', seekTime)
            pendingSeekRef.current = null
            setTimeout(() => {
              if (videoRef.current && videoRef.current.readyState >= 2) {
                isSeekingRef.current = true
                videoRef.current.currentTime = seekTime
                currentTimeRef.current = seekTime
                onSeekRef.current?.(seekTime)
                console.log('✅ HLS seek restored to:', seekTime, 'actual:', videoRef.current.currentTime)
                setTimeout(() => {
                  isSeekingRef.current = false
                  // Verify the seek worked
                  const actualTime = videoRef.current?.currentTime ?? 0
                  if (Math.abs(actualTime - seekTime) > 0.5) {
                    console.warn('⚠️ HLS seek verification failed, retrying...')
                    if (videoRef.current) {
                      videoRef.current.currentTime = seekTime
                    }
                  }
                }, 500)
              }
            }, 300)
          }
        } else {
          // Retry after a short delay
          setTimeout(checkReady, 100)
        }
      }
      checkReady()
    })
    
    // Also listen for video loadeddata event (more reliable than loadedmetadata for HLS)
    const handleHlsLoadedData = () => {
      if (video.duration > 0 && video.readyState >= 2) {
        console.log('📹 HLS video loadeddata, duration:', video.duration, 'readyState:', video.readyState)
        setIsReady(true)
        onReadyRef.current?.()
        
        // If there's a pending seek, execute it now
        if (pendingSeekRef.current !== null && !isSeekingRef.current) {
          const seekTime = pendingSeekRef.current
          console.log('📹 Executing pending seek after HLS loadeddata:', seekTime)
          pendingSeekRef.current = null
          setTimeout(() => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              isSeekingRef.current = true
              videoRef.current.currentTime = seekTime
              currentTimeRef.current = seekTime
              onSeekRef.current?.(seekTime)
              setTimeout(() => {
                isSeekingRef.current = false
              }, 500)
            }
          }, 200)
        }
        
        video.removeEventListener('loadeddata', handleHlsLoadedData)
      }
    }
    video.addEventListener('loadeddata', handleHlsLoadedData)
    
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        console.error('❌ HLS fatal error:', data)
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error('💡 Network error, trying to recover...')
            hls.startLoad()
            break
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error('💡 Media error, trying to recover...')
            hls.recoverMediaError()
            break
          default:
            console.error('💡 Fatal error, destroying HLS instance')
            hls.destroy()
            hlsRef.current = null
            break
        }
      } else {
        console.warn('⚠️ HLS non-fatal error:', data)
      }
    })
    
    // Cleanup - only clean up event listeners, NOT HLS instance
    // HLS instance cleanup is handled by the effect when videoSrc changes
    return () => {
      if (video) {
        video.removeEventListener('loadeddata', handleHlsLoadedData)
      }
      // Don't destroy HLS here - let the effect handle it when videoSrc changes
      // This prevents unnecessary re-initialization during re-renders
    }
    // Only depend on videoSrc - not onReady/onSeek to prevent unnecessary re-initialization
  }, [videoSrc])
  
  // Handle video events - wait for video element to be available
  useEffect(() => {
    if (!videoSrc) return
    
    // Skip event setup for HLS streams (hls.js handles it)
    if (videoSrc.endsWith('.m3u8')) return
    
    let cleanup: (() => void) | null = null
    let retryTimeout: NodeJS.Timeout | null = null
    
    // Wait for video element to be available (Media Chrome might render it asynchronously)
    const setupVideoEvents = () => {
      const video = videoRef.current
      if (!video) {
        console.log('⚠️ Video element not found, will retry...')
        // Retry after a short delay
        retryTimeout = setTimeout(setupVideoEvents, 100)
        return
      }

      console.log('📹 Setting up video event listeners, video.readyState:', video.readyState)

      const handleLoadedMetadata = () => {
        console.log('📹 Video loadedmetadata event fired, video.readyState:', video.readyState, 'video.duration:', video.duration)
        setIsReady(true)
        console.log('📹 Calling onReady callback')
        onReady?.()
        
        // If there's a pending seek, execute it now
        if (pendingSeekRef.current !== null && !isSeekingRef.current) {
          const seekTime = pendingSeekRef.current
          console.log('📹 Executing pending seek after loadedmetadata:', seekTime)
          pendingSeekRef.current = null
          setTimeout(() => {
            if (videoRef.current) {
              isSeekingRef.current = true
              videoRef.current.currentTime = seekTime
              currentTimeRef.current = seekTime
              onSeek?.(seekTime)
              setTimeout(() => {
                isSeekingRef.current = false
              }, 500)
            }
          }, 100)
        }
      }
      
      const handleLoadedData = () => {
        console.log('📹 Video loadeddata event fired, video.readyState:', video.readyState)
        // Also set ready on loadeddata as a fallback
        setIsReady((prev) => {
          if (!prev) {
            console.log('📹 Setting ready from loadeddata event')
            onReady?.()
            return true
          }
          return prev
        })
      }
      
      const handleCanPlay = () => {
        console.log('📹 Video canplay event fired, video.readyState:', video.readyState)
        // Also set ready on canplay as a fallback
        setIsReady((prev) => {
          if (!prev) {
            console.log('📹 Setting ready from canplay event')
            onReady?.()
            return true
          }
          return prev
        })
      }

      const handleTimeUpdate = () => {
        currentTimeRef.current = video.currentTime
        onProgress?.({ playedSeconds: video.currentTime })
      }

      const handlePlay = () => {
        onPlay?.()
      }

      const handlePause = () => {
        onPause?.()
      }

      // Check if video is already loaded
      if (video.readyState >= 1) {
        console.log('📹 Video already has metadata, setting ready immediately')
        setIsReady(true)
        onReady?.()
        
        // If there's a pending seek, execute it now
        if (pendingSeekRef.current !== null && !isSeekingRef.current) {
          const seekTime = pendingSeekRef.current
          console.log('📹 Executing pending seek (video already loaded):', seekTime)
          pendingSeekRef.current = null
          setTimeout(() => {
            if (videoRef.current) {
              isSeekingRef.current = true
              videoRef.current.currentTime = seekTime
              currentTimeRef.current = seekTime
              onSeek?.(seekTime)
              setTimeout(() => {
                isSeekingRef.current = false
              }, 500)
            }
          }, 100)
        }
      }

      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      video.addEventListener('loadeddata', handleLoadedData)
      video.addEventListener('canplay', handleCanPlay)
      video.addEventListener('timeupdate', handleTimeUpdate)
      video.addEventListener('play', handlePlay)
      video.addEventListener('pause', handlePause)

      cleanup = () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
        video.removeEventListener('loadeddata', handleLoadedData)
        video.removeEventListener('canplay', handleCanPlay)
        video.removeEventListener('timeupdate', handleTimeUpdate)
        video.removeEventListener('play', handlePlay)
        video.removeEventListener('pause', handlePause)
      }
    }
    
    // Start setup
    setupVideoEvents()
    
    // Return cleanup function
    return () => {
      if (retryTimeout) clearTimeout(retryTimeout)
      if (cleanup) cleanup()
    }
  }, [onReady, onPlay, onPause, onProgress, videoSrc, onSeek])

  // Handle play/pause
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Try to play even if not ready (for auto-play on seek)
    if (playing) {
      const playPromise = video.play()
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error('Error playing video:', error)
        })
      }
    } else {
      video.pause()
    }
  }, [playing])

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      const video = videoRef.current
      console.log('🎯 MediaChromePlayer.seekTo called:', seconds, 'isReady:', isReady, 'video:', !!video)
      
      if (!video) {
        console.error('❌ Video element not found!')
        return
      }
      
      const isHls = hlsRef.current !== null
      console.log('📹 Video state:', {
        readyState: video.readyState,
        duration: video.duration,
        currentTime: video.currentTime,
        paused: video.paused,
        isHls
      })
      
      // Function to actually perform the seek
      const performSeek = () => {
        try {
          // Prevent multiple simultaneous seeks
          if (isSeekingRef.current) {
            console.log('⏳ Seek already in progress, storing for later:', seconds)
            pendingSeekRef.current = seconds
            return
          }
          
          // Ensure we have enough data loaded (readyState >= 2 means HAVE_CURRENT_DATA)
          if (video.readyState < 2) {
            console.log('⏳ Video not ready for seeking, readyState:', video.readyState, 'storing for later')
            pendingSeekRef.current = seconds
            return
          }
          
          // Set seeking flag
          isSeekingRef.current = true
          
          // Video is ready, perform seek
          console.log('🎯 Performing seek to:', seconds, 'currentTime before:', video.currentTime)
          video.currentTime = seconds
          currentTimeRef.current = seconds
          onSeek?.(seconds)
          console.log('✅ Seeked to:', seconds, 'video.currentTime after seek:', video.currentTime)
          
          // Clear seeking flag after a delay
          setTimeout(() => {
            isSeekingRef.current = false
            
            // Verify the seek worked
            const actualTime = video.currentTime
            const diff = Math.abs(actualTime - seconds)
            console.log('⏱️ Seek verification - actual:', actualTime, 'expected:', seconds, 'diff:', diff)
            if (diff > 0.5) {
              console.warn('⚠️ Seek may have failed! Retrying...')
              if (video.readyState >= 2) {
                video.currentTime = seconds
                currentTimeRef.current = seconds
              } else {
                // Store for retry when ready
                pendingSeekRef.current = seconds
              }
            }
          }, 500)
        } catch (error) {
          console.error('❌ Error seeking:', error)
          isSeekingRef.current = false
        }
      }
      
      // Check if video is ready to seek
      if (video.readyState >= 2 && video.duration > 0) {
        console.log('✅ Video ready, seeking immediately')
        performSeek()
      } else if (video.readyState >= 1 || video.duration > 0) {
        // Has metadata but not enough data, wait a bit
        console.log('⏳ Video has metadata but not enough data, waiting...')
        const waitForData = () => {
          if (video.readyState >= 2) {
            performSeek()
          } else {
            setTimeout(waitForData, 100)
          }
        }
        waitForData()
      } else {
        // Wait for metadata - listen to multiple events
        console.log('⏳ Waiting for video metadata...', 'readyState:', video.readyState, 'duration:', video.duration)
        
        let seeked = false
        const performSeekOnce = () => {
          if (!seeked && video.readyState >= 2 && video.duration > 0) {
            seeked = true
            console.log('✅ Metadata loaded, performing seek')
            performSeek()
          }
        }
        
        const handleLoadedData = () => {
          performSeekOnce()
          video.removeEventListener('loadeddata', handleLoadedData)
        }
        
        const handleCanPlay = () => {
          performSeekOnce()
          video.removeEventListener('canplay', handleCanPlay)
        }
        
        const handleCanPlayThrough = () => {
          performSeekOnce()
          video.removeEventListener('canplaythrough', handleCanPlayThrough)
        }
        
        video.addEventListener('loadeddata', handleLoadedData)
        video.addEventListener('canplay', handleCanPlay)
        video.addEventListener('canplaythrough', handleCanPlayThrough)
        
        // Also check periodically as fallback
        let checkCount = 0
        const maxChecks = 100 // 10 seconds
        const checkInterval = setInterval(() => {
          checkCount++
          if (video.readyState >= 2 && video.duration > 0) {
            clearInterval(checkInterval)
            performSeekOnce()
          } else if (checkCount >= maxChecks) {
            clearInterval(checkInterval)
            console.warn('⚠️ Timeout waiting for video to be ready, attempting seek anyway')
            performSeek()
          }
        }, 100)
        
        // Cleanup after timeout
        setTimeout(() => {
          clearInterval(checkInterval)
          video.removeEventListener('loadeddata', handleLoadedData)
          video.removeEventListener('canplay', handleCanPlay)
          video.removeEventListener('canplaythrough', handleCanPlayThrough)
        }, 10000)
      }
    },
    getCurrentTime: () => {
      const video = videoRef.current
      if (video) {
        currentTimeRef.current = video.currentTime
      }
      return currentTimeRef.current
    },
    getDuration: () => {
      const video = videoRef.current
      return video?.duration || 0
    },
  }), [isReady, onSeek])

  // Convert subtitles to WebVTT format
  useEffect(() => {
    if (subtitles.length === 0) {
      setVttUrl(null)
      return
    }

    // Convert subtitles array to WebVTT format
    const formatTime = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = Math.floor(seconds % 60)
      const milliseconds = Math.floor((seconds % 1) * 1000)
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
    }

    let vttContent = 'WEBVTT\n\n'
    subtitles.forEach((subtitle) => {
      const startTime = formatTime(subtitle.startTime)
      const endTime = formatTime(subtitle.endTime)
      vttContent += `${startTime} --> ${endTime}\n${subtitle.text}\n\n`
    })

    // Create blob URL for WebVTT
    const blob = new Blob([vttContent], { type: 'text/vtt' })
    const url = URL.createObjectURL(blob)
    setVttUrl(url)

    // Cleanup blob URL on unmount
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [subtitles])

  if (!videoSrc) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p>Loading video source...</p>
          <p className="text-xs text-gray-400 mt-2">URL: {url}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-black flex flex-col relative overflow-visible">
      <MediaController style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'visible' }}>
        <video
          ref={videoRef}
          slot="media"
          src={videoSrc && !videoSrc.endsWith('.m3u8') ? videoSrc : undefined}
          className="w-full h-full"
          crossOrigin="anonymous"
          preload="auto"
          playsInline
          autoPlay={false}
          muted={false}
          aria-label="Video player"
          onLoadStart={() => {
            console.log('📹 onLoadStart fired, src:', videoSrc, 'isSeeking:', isSeekingRef.current)
            // Don't reset if we're in the middle of a seek or have a pending seek
            if (!isSeekingRef.current && pendingSeekRef.current === null) {
              console.log('📹 Video source loading, resetting ready state')
              setIsReady(false)
            } else {
              console.log('📹 Video source loading but seek in progress, keeping ready state')
            }
          }}
          onLoadedMetadata={() => {
            const video = videoRef.current
            console.log('📹 onLoadedMetadata (inline handler) fired', {
              readyState: video?.readyState,
              duration: video?.duration,
              currentTime: video?.currentTime,
              videoWidth: video?.videoWidth,
              videoHeight: video?.videoHeight
            })
            // Prevent resetting currentTime if we have a pending seek
            if (pendingSeekRef.current !== null && video) {
              console.log('📹 Preventing currentTime reset, pending seek:', pendingSeekRef.current)
              // The seek will be handled by the event listeners
            }
          }}
          onLoadedData={() => {
            const video = videoRef.current
            console.log('📹 onLoadedData (inline handler) fired', {
              readyState: video?.readyState,
              duration: video?.duration,
              currentTime: video?.currentTime,
              isSeeking: isSeekingRef.current,
              pendingSeek: pendingSeekRef.current
            })
            // Don't execute seek here if HLS is active - let HLS handle it
            // This prevents conflicts with HLS.js seeking
            if (hlsRef.current) {
              console.log('📹 HLS is active, skipping seek in onLoadedData (HLS will handle it)')
              return
            }
            // If we have a pending seek and video is ready, execute it (for non-HLS streams)
            if (pendingSeekRef.current !== null && video && video.readyState >= 2 && !isSeekingRef.current) {
              const seekTime = pendingSeekRef.current
              console.log('📹 Executing pending seek from onLoadedData:', seekTime)
              pendingSeekRef.current = null
              isSeekingRef.current = true
              video.currentTime = seekTime
              currentTimeRef.current = seekTime
              onSeek?.(seekTime)
              setTimeout(() => {
                isSeekingRef.current = false
                console.log('📹 Seek completed, currentTime:', video.currentTime)
              }, 500)
            }
          }}
          onCanPlay={() => {
            const video = videoRef.current
            console.log('📹 onCanPlay (inline handler) fired', {
              readyState: video?.readyState,
              duration: video?.duration
            })
          }}
          onError={() => {
            const video = videoRef.current
            const errorInfo: Record<string, unknown> = {
              src: videoSrc,
              networkState: video?.networkState,
              readyState: video?.readyState,
            }
            
            if (video?.error) {
              errorInfo.errorCode = video.error.code
              errorInfo.errorMessage = video.error.message
              
              // Map error codes to human-readable messages
              const errorMessages: Record<number, string> = {
                1: 'MEDIA_ERR_ABORTED - The user aborted the video',
                2: 'MEDIA_ERR_NETWORK - A network error occurred',
                3: 'MEDIA_ERR_DECODE - The video could not be decoded',
                4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - The video source is not supported',
              }
              errorInfo.errorDescription = errorMessages[video.error.code] || 'Unknown error'
            }
            
            // Log network state
            const networkStates: Record<number, string> = {
              0: 'NETWORK_EMPTY - No data',
              1: 'NETWORK_IDLE - Network is idle',
              2: 'NETWORK_LOADING - Loading',
              3: 'NETWORK_NO_SOURCE - No source',
            }
            errorInfo.networkStateDescription = networkStates[video?.networkState ?? -1] || 'Unknown'
            
            console.error('❌ Video error:', errorInfo)
            
            // Check if it's an HLS stream
            if (videoSrc?.endsWith('.m3u8')) {
              console.error('💡 HLS stream detected (.m3u8). Browsers may not support HLS natively.')
              console.error('   Consider using hls.js library for HLS playback.')
            }
            
            // If it's a source not supported error, try to provide helpful info
            if (video?.error?.code === 4) {
              console.error('💡 Video source may not be supported. Try checking:')
              console.error('   - Is the URL accessible?')
              console.error('   - Does it require CORS headers?')
              console.error('   - Is it an HLS stream that needs hls.js?')
              console.error('   - Video format:', videoSrc?.split('.').pop())
            } else if (!video?.error) {
              console.error('💡 Video error object is null. Possible causes:')
              console.error('   - CORS issue preventing video load')
              console.error('   - Video format not supported by browser')
              console.error('   - Network error (check browser network tab)')
            }
          }}
        >
          <track 
            kind="captions" 
            srcLang="en" 
            label="English" 
            src={vttUrl || ''} 
            default={!!vttUrl}
          />
        </video>
        
        {controls && (
          <MediaControlBar>
            <MediaPlayButton />
            <MediaSeekBackwardButton seekOffset={10} />
            <MediaSeekForwardButton seekOffset={10} />
            <MediaTimeRange />
            <MediaTimeDisplay showDuration />
            <MediaMuteButton />
            <MediaVolumeRange />
            {vttUrl && <MediaCaptionsButton />}
            <MediaFullscreenButton />
          </MediaControlBar>
        )}
      </MediaController>
      
    </div>
  )
})

export default MediaChromePlayer
