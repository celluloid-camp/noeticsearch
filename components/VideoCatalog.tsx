'use client'

import { useRouter } from 'next/navigation'
import { Video, SearchResult } from '@/lib/types'
import Image from 'next/image'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface VideoCatalogProps {
  videos: Video[]
  onAddVideo: (video: Video) => void
  onVideoClick: (video: Video) => void
  searchResults?: SearchResult[]
  onClearSearch?: () => void
  filterTab: 'all' | 'public' | 'my'
}

export default function VideoCatalog({
  videos,
  onAddVideo,
  onVideoClick,
  searchResults,
  onClearSearch,
  filterTab,
}: VideoCatalogProps) {
  const router = useRouter()

  const filteredVideos = videos.filter((video) => {
    if (filterTab === 'all') return true
    if (filterTab === 'public') return video.isPublic
    if (filterTab === 'my') return !video.isPublic
    return true
  })

  const hasActiveSearch = searchResults && searchResults.length > 0

  const groupedResults = hasActiveSearch && searchResults
    ? searchResults.reduce<Record<string, { video: Video | undefined; matches: SearchResult[] }>>(
        (acc, result) => {
          if (!acc[result.videoId]) {
            acc[result.videoId] = {
              video: videos.find((v) => v.id === result.videoId),
              matches: [],
            }
          }
          acc[result.videoId].matches.push(result)
          return acc
        },
        {},
      )
    : {}

  return (
    <div className="flex flex-col gap-4 h-full min-w-0">
      {/* Video Grid or Search Results Grid */}
      <div className="flex-1 overflow-y-auto">
        {hasActiveSearch ? (
          // Search Results Display (grouped by video)
          !searchResults || searchResults.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              <p>No results found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 pr-2">
              {Object.entries(groupedResults).map(([videoId, group]) => {
                const video = group.video
                if (!video) return null

                return (
                  <div
                    key={videoId}
                    className="cursor-pointer group flex flex-col"
                    onClick={() => {
                      if (video) onVideoClick(video)
                    }}
                  >
                    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border border-border hover:border-primary transition-colors">
                      <img
                        src={video.thumbnail || '/placeholder.svg'}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src =
                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ccc" width="100" height="100"/%3E%3Ctext x="50" y="50" fontSize="14" fill="%23999" textAnchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E'
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg
                            className="w-6 h-6 text-primary-foreground"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 font-medium text-foreground text-sm truncate">{video.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {video.addedDate ? new Date(video.addedDate).toLocaleDateString() : ''}
                    </p>
                    <div className="mt-1 space-y-1 max-h-32 overflow-y-auto pr-1">
                      {group.matches.map((match, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/video/${match.videoId}?t=${match.startTime}`)
                          }}
                          className="text-left text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                        >
                          <span className="font-mono text-[11px] bg-secondary/60 px-1 py-0.5 rounded mr-1">
                            {match.timestamp}
                          </span>
                          <span className="truncate inline-block max-w-full align-middle">{match.subtitle}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          // Regular Video Grid
          filteredVideos.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              <p>
                {videos.length === 0
                  ? 'No videos yet. Add one to get started!'
                  : `No ${filterTab === 'public' ? 'public' : filterTab === 'my' ? 'personal' : ''} videos found.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4 pr-2">
              {filteredVideos.map((video) => (
                <div
                  key={video.id}
                  className="cursor-pointer group"
                  onClick={() => onVideoClick(video)}
                >
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border border-border hover:border-primary transition-colors">
                    <img
                      src={video.thumbnail || '/placeholder.svg'}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ccc" width="100" height="100"/%3E%3Ctext x="50" y="50" fontSize="14" fill="%23999" textAnchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E'
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg
                          className="w-6 h-6 text-primary-foreground"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 font-medium text-foreground text-sm truncate">{video.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {video.addedDate ? new Date(video.addedDate).toLocaleDateString() : ''}
                  </p>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
