'use client'

import React from "react"

import { useState } from 'react'
import { Video, Subtitle } from '@/lib/types'
import { AlertCircle, Loader2 } from 'lucide-react'

interface AddVideoFormProps {
  onVideoAdded: (video: Video) => void
  onCancel: () => void
}

export default function AddVideoForm({ onVideoAdded, onCancel }: AddVideoFormProps) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateMockSubtitles = (videoTitle: string): Subtitle[] => {
    const mockSubtitles: Subtitle[] = [
      {
        text: 'Welcome to this video about ' + videoTitle,
        timestamp: '00:00:02',
        startTime: 2,
        endTime: 6,
      },
      {
        text: 'In this tutorial, we will explore the key concepts',
        timestamp: '00:00:10',
        startTime: 10,
        endTime: 15,
      },
      {
        text: 'Understanding the fundamentals is crucial',
        timestamp: '00:00:20',
        startTime: 20,
        endTime: 25,
      },
      {
        text: 'Let me show you a practical example',
        timestamp: '00:00:30',
        startTime: 30,
        endTime: 35,
      },
      {
        text: 'This is particularly important for beginners',
        timestamp: '00:00:45',
        startTime: 45,
        endTime: 52,
      },
      {
        text: 'Make sure to follow along with the steps',
        timestamp: '00:01:00',
        startTime: 60,
        endTime: 65,
      },
    ]
    return mockSubtitles
  }

  const extractThumbnail = (peertubUrl: string): string => {
    try {
      const url = new URL(peertubUrl)
      const videoId = url.pathname.split('/').pop()
      if (videoId) {
        const domain = url.hostname
        return `https://${domain}/static/thumbnails/${videoId}.jpg`
      }
    } catch (e) {
      console.log('[v0] Failed to parse URL:', e)
    }
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="180"%3E%3Crect fill="%234F46E5" width="320" height="180"/%3E%3Ctext x="160" y="90" fontSize="24" fill="white" textAnchor="middle" dy=".3em"%3EVideo Thumbnail%3C/text%3E%3C/svg%3E'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!url.trim() || !title.trim()) {
        throw new Error('Please fill in both fields')
      }

      // Validate PeerTube URL format
      try {
        const parsedUrl = new URL(url)
        if (!parsedUrl.hostname.includes('peertube') && !url.includes('/videos/')) {
          console.warn(
            '[v0] Warning: URL might not be a valid PeerTube link, but proceeding anyway',
          )
        }
      } catch {
        throw new Error('Invalid URL format')
      }

      // Simulate delay for realistic UX
      await new Promise((resolve) => setTimeout(resolve, 800))

      const newVideo: Video = {
        id: Date.now().toString(),
        title: title.trim(),
        url: url.trim(),
        thumbnail: extractThumbnail(url),
        subtitles: generateMockSubtitles(title),
        addedDate: new Date(),
      }

      onVideoAdded(newVideo)
      setUrl('')
      setTitle('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add video')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 p-4 bg-secondary rounded-lg">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Video Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter video title"
          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">PeerTube URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://peertube.example.com/videos/..."
          className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Paste a PeerTube video URL (supports any PeerTube instance)
        </p>
      </div>

      {error && (
        <div className="flex gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity font-medium text-sm flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Adding...' : 'Add Video'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-2 bg-secondary text-foreground rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
