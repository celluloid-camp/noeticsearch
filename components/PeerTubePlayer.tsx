'use client'

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'

// PeerTube URL pattern matcher (works with PeerTube >=v3.3)
const MATCH_URL = /(https?):\/\/(.*)(\/videos\/watch\/|\/w\/)(.*)/

// PeerTube Embed API SDK URL
const SDK_URL = 'https://unpkg.com/@peertube/embed-api@0.0.4/build/player.min.js'

// Load script utility
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

// Get PeerTube SDK
const resolves: Record<string, Array<(sdk: any) => void>> = {}
function getSDK(url: string): Promise<any> {
  // Check if PeerTubePlayer is already available
  if ((window as any).PeerTubePlayer) {
    return Promise.resolve((window as any).PeerTubePlayer)
  }

  return new Promise((resolve, reject) => {
    if (resolves[url]) {
      resolves[url].push(resolve)
      return
    }

    resolves[url] = [resolve]

    loadScript(url)
      .then(() => {
        // Wait a bit for the SDK to initialize
        const checkSDK = () => {
          // The PeerTube Embed API exposes PeerTubePlayer constructor
          if ((window as any).PeerTubePlayer) {
            resolves[url].forEach((r) => r((window as any).PeerTubePlayer))
            delete resolves[url]
          } else if ((window as any).PeerTube) {
            // Fallback: check if PeerTube object exists (might contain PeerTubePlayer)
            const sdk = (window as any).PeerTube
            if (sdk.PeerTubePlayer) {
              resolves[url].forEach((r) => r(sdk.PeerTubePlayer))
            } else {
              resolves[url].forEach((r) => r(sdk))
            }
            delete resolves[url]
          } else {
            // Retry after a short delay
            setTimeout(() => {
              if ((window as any).PeerTubePlayer) {
                resolves[url].forEach((r) => r((window as any).PeerTubePlayer))
                delete resolves[url]
              } else {
                reject(new Error('PeerTube SDK not found after loading. Make sure the script loaded correctly.'))
                delete resolves[url]
              }
            }, 100)
          }
        }
        checkSDK()
      })
      .catch((err) => {
        reject(err)
        delete resolves[url]
      })
  })
}

interface PeerTubePlayerProps {
  url: string
  playing?: boolean
  controls?: boolean
  onReady?: () => void
  onPlay?: () => void
  onPause?: () => void
  onProgress?: (state: { playedSeconds: number }) => void
  onSeek?: (seconds: number) => void
  config?: {
    peertube?: {
      isPresenter?: boolean
    }
  }
}

export interface PeerTubePlayerRef {
  seekTo: (seconds: number) => void
  getCurrentTime: () => number
  getDuration: () => number
}

const PeerTubePlayer = forwardRef<PeerTubePlayerRef, PeerTubePlayerProps>(function PeerTubePlayer({
  url,
  playing = false,
  controls = true,
  onReady,
  onPlay,
  onPause,
  onProgress,
  onSeek,
  config,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isReady, setIsReady] = useState(false)
  const currentTimeRef = useRef(0)

  // Get embed URL from PeerTube watch URL
  const getEmbedUrl = (watchUrl: string): string | null => {
    const match = MATCH_URL.exec(watchUrl)
    if (!match) return null

    const [, protocol, domain, , videoId] = match
    const isPresenter = config?.peertube?.isPresenter || false

    return `${protocol}://${domain}/videos/embed/${videoId}?api=1&controls=${controls ? '1' : '0'}&isPresenter=${isPresenter ? '1' : '0'}`
  }

  useEffect(() => {
    const embedUrl = getEmbedUrl(url)
    if (!embedUrl || !containerRef.current) return

    // Load PeerTube SDK and initialize player
    getSDK(SDK_URL)
      .then((PeerTubePlayerClass) => {
        if (!containerRef.current) return

        // Create iframe for embed
        const iframe = document.createElement('iframe')
        iframe.src = embedUrl
        iframe.style.width = '100%'
        iframe.style.height = '100%'
        iframe.style.border = '0'
        iframe.allow = 'autoplay; fullscreen'
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups')
        iframe.id = 'peerTubeContainer'

        containerRef.current.innerHTML = ''
        containerRef.current.appendChild(iframe)
        iframeRef.current = iframe

        // Initialize PeerTube player - wait for iframe to load
        iframe.onload = () => {
          try {
            // Use the PeerTubePlayer class from SDK
            const PeerTubePlayerConstructor = PeerTubePlayerClass || (window as any).PeerTubePlayer
            if (PeerTubePlayerConstructor) {
              playerRef.current = new PeerTubePlayerConstructor(iframe)

              // Setup event listeners
              if (playerRef.current) {
                playerRef.current.addEventListener('playbackStatusUpdate', (data: any) => {
                  currentTimeRef.current = data.position || 0
                  onProgress?.({ playedSeconds: currentTimeRef.current })
                })

                playerRef.current.addEventListener('playbackStatusChange', (status: string) => {
                  if (status === 'playing') {
                    onPlay?.()
                  } else {
                    onPause?.()
                  }
                })

                // Wait for player to be ready
                if (playerRef.current?.ready) {
                  playerRef.current.ready
                    .then(() => {
                      setIsReady(true)
                      onReady?.()
                    })
                    .catch((err: Error) => {
                      console.error('PeerTube player ready error:', err)
                    })
                } else {
                  // If ready promise doesn't exist, assume ready after a delay
                  setTimeout(() => {
                    setIsReady(true)
                    onReady?.()
                  }, 1000)
                }
              }
            } else {
              console.error('PeerTubePlayer constructor not found')
            }
          } catch (err) {
            console.error('Failed to initialize PeerTube player:', err)
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load PeerTube SDK:', err)
      })

    return () => {
      if (playerRef.current) {
        try {
          // Cleanup player if needed
          playerRef.current = null
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }, [url, controls, config])

  // Handle play/pause
  useEffect(() => {
    if (!playerRef.current || !isReady) return

    if (playing) {
      playerRef.current.play()
    } else {
      playerRef.current.pause()
    }
  }, [playing, isReady])

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      if (playerRef.current && isReady) {
        playerRef.current.seek(seconds)
        onSeek?.(seconds)
      }
    },
    getCurrentTime: () => currentTimeRef.current,
    getDuration: () => {
      return playerRef.current?.getDuration?.() || 0
    },
  }), [isReady, onSeek])

  const embedUrl = getEmbedUrl(url)
  if (!embedUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <p>Invalid PeerTube URL</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-black" />
  )
})

// Static method for react-player compatibility
;(PeerTubePlayer as any).canPlay = (url: string) => {
  return MATCH_URL.test(url)
}

export default PeerTubePlayer
