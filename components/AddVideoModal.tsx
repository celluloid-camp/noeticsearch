'use client'

import { useState } from "react"
import { X } from 'lucide-react'
import type { Video, Subtitle } from '@/lib/types'

interface AddVideoModalProps {
  isOpen: boolean
  onClose: () => void
  onVideoAdded: (video: Video) => void
}

export default function AddVideoModal({ isOpen, onClose, onVideoAdded }: AddVideoModalProps) {
  const [peertubePath, setPeertubePath] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  const generateSampleSubtitles = () => [
    { text: 'Welcome to the tutorial', timestamp: '00:00', startTime: 0, endTime: 5 },
    { text: 'Today we will learn about web development', timestamp: '00:05', startTime: 5, endTime: 10 },
    { text: 'JavaScript is a powerful programming language', timestamp: '00:10', startTime: 10, endTime: 15 },
    { text: 'You can build interactive web applications', timestamp: '00:15', startTime: 15, endTime: 20 },
    { text: 'HTML provides the structure', timestamp: '00:20', startTime: 20, endTime: 25 },
    { text: 'CSS handles the styling', timestamp: '00:25', startTime: 25, endTime: 30 },
    { text: 'Together they create beautiful websites', timestamp: '00:30', startTime: 30, endTime: 35 },
  ]

  const extractThumbnailUrl = (peertubePath: string): string => {
    const match = peertubePath.match(/\/w\/([a-zA-Z0-9_-]+)/)
    if (match) {
      const videoId = match[1]
      return `https://frame.peertube.example.com/${videoId}`
    }
    return ''
  }

  const parseVttToSubtitles = (vtt: string): Subtitle[] => {
    const lines = vtt.split(/\r?\n/)
    const subtitles: Subtitle[] = []
    let i = 0

    const parseTime = (t: string): number => {
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

  const fetchPeertubeMetadata = async (
    peertubeUrl: string,
  ): Promise<{ title: string; thumbnail: string; subtitles: Subtitle[] }> => {
    const trimmed = peertubeUrl.trim()
    let parsedUrl: URL

    try {
      parsedUrl = new URL(trimmed)
    } catch {
      throw new Error('Invalid PeerTube URL')
    }

    const segments = parsedUrl.pathname.split('/').filter(Boolean)
    const videoId = segments[segments.length - 1]

    if (!videoId) {
      throw new Error('Invalid PeerTube URL path')
    }

    // Main video metadata
    const apiUrl = `${parsedUrl.origin}/api/v1/videos/${videoId}`
    const response = await fetch(apiUrl)

    if (!response.ok) {
      throw new Error('Could not fetch video metadata from PeerTube')
    }

    const data = await response.json()

    const title = (data && (data.name || data.title)) || 'Untitled video'
    let thumbnail = ''

    if (data) {
      if (data.thumbnailUrl) {
        thumbnail = data.thumbnailUrl
      } else if (data.thumbnailPath) {
        try {
          thumbnail = new URL(data.thumbnailPath, parsedUrl.origin).toString()
        } catch {
          thumbnail = ''
        }
      }
    }

    // Captions (subtitles) via dedicated captions endpoint
    let subtitles: Subtitle[] = []

    try {
      const captionsRes = await fetch(`${parsedUrl.origin}/api/v1/videos/${videoId}/captions`)
      if (captionsRes.ok) {
        const captionsJson: { data?: unknown[] } | unknown[] = await captionsRes.json()
        const list: unknown[] = Array.isArray((captionsJson as { data?: unknown[] }).data)
          ? ((captionsJson as { data?: unknown[] }).data as unknown[])
          : Array.isArray(captionsJson)
            ? captionsJson
            : []
        const firstCaption = list[0] as { url?: string; captionPath?: string } | undefined

        if (firstCaption) {
          const captionUrl =
            firstCaption.url ||
            (firstCaption.captionPath
              ? new URL(firstCaption.captionPath, parsedUrl.origin).toString()
              : undefined)

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
      // ignore subtitle errors
    }

    return { title, thumbnail, subtitles }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!peertubePath.trim()) {
      setError('PeerTube URL is required')
      return
    }

    setLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 200))

      const { title, thumbnail, subtitles } = await fetchPeertubeMetadata(peertubePath.trim())
      const thumbnailUrl = thumbnail || extractThumbnailUrl(peertubePath) || '/placeholder.svg'

      const newVideo: Video = {
        id: Date.now().toString(),
        title: title.trim(),
        url: peertubePath.trim(),
        thumbnail: thumbnailUrl,
        subtitles: subtitles.length > 0 ? subtitles : generateSampleSubtitles(),
        addedDate: new Date(),
        isPublic: isPublic,
      }

      onVideoAdded(newVideo)
      setPeertubePath('')
      setIsPublic(true)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add video. Please check the PeerTube URL and try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Add New Video</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* PeerTube URL Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="url" className="text-sm font-medium text-foreground">
              PeerTube URL
            </label>
            <input
              id="url"
              type="url"
              value={peertubePath}
              onChange={(e) => setPeertubePath(e.target.value)}
              placeholder="https://peertube.example.com/w/..."
              className="px-3 py-2 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">
              Enter the full URL to your PeerTube video
            </p>
          </div>

          {/* Public/Private Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">Video Privacy:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  isPublic
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                Public
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  !isPublic
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                My Videos
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">{error}</div>}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
          >
            {loading ? 'Adding...' : 'Add Video'}
          </button>
        </form>
      </div>
    </div>
  )
}
