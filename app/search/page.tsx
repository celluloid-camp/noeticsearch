'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ChatPanel from '@/components/ChatPanel'
import VideoCatalog from '@/components/VideoCatalog'
import Loading from '@/app/loading'
import { useSearch } from '@/contexts/SearchContext'
import type { Video, SearchResult, SavedConversation } from '@/lib/types'
import { Search, Send, Edit2, Globe, Lock, Check, X, Plus } from 'lucide-react'
import AddVideoModal from '@/components/AddVideoModal'

// Generate a unique search ID
const generateSearchId = (): string => {
  return `search_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { searchResults, setSearchResults, clearSearchResults } = useSearch()
  const [filterTab, setFilterTab] = useState<'all' | 'public' | 'my'>('all')
  const [initialQuery, setInitialQuery] = useState('')
  const [videos, setVideos] = useState<Video[]>([])
  const [externalMessage, setExternalMessage] = useState<string>('')
  const [lastSearchQuery, setLastSearchQuery] = useState<string>('')
  const [searchId, setSearchId] = useState<string>('')
  const [searchName, setSearchName] = useState<string>('')
  const [isSearchPublic, setIsSearchPublic] = useState<boolean>(false)
  const [isEditingName, setIsEditingName] = useState<boolean>(false)
  const [editedName, setEditedName] = useState<string>('')
  const [isAddVideoModalOpen, setIsAddVideoModalOpen] = useState<boolean>(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const nameInputRef = React.useRef<HTMLInputElement>(null)

  // Initialize or get search ID from URL
  useEffect(() => {
    const idFromUrl = searchParams.get('id')
    const forceNew = searchParams.get('new') === 'true'
    
    if (forceNew || !idFromUrl) {
      // Generate new search ID and update URL
      const newId = generateSearchId()
      setSearchId(newId)
      // Clear search results for new search
      clearSearchResults()
      setLastSearchQuery('')
      setExternalMessage('')
      setInitialQuery('')
      // Remove 'new' parameter if present
      router.replace(`/search?id=${newId}`, { scroll: false })
    } else {
      setSearchId(idFromUrl)
    }
  }, [searchParams, router, clearSearchResults])

  // Load filterTab from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('filterTab')
    if (stored && (stored === 'all' || stored === 'public' || stored === 'my')) {
      setFilterTab(stored as 'all' | 'public' | 'my')
    }
  }, [])

  // Load videos from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('videos')
    if (stored) {
      try {
        const videosData: Video[] = JSON.parse(stored)
        setVideos(videosData)
      } catch (error) {
        console.error('Error parsing videos:', error)
      }
    }
  }, [])

  // Load search results from localStorage on mount (only if not a new search)
  useEffect(() => {
    const forceNew = searchParams.get('new') === 'true'
    if (forceNew) {
      // Don't load previous results for new searches
      return
    }
    
    const stored = localStorage.getItem('currentSearchResults')
    if (stored) {
      try {
        const results: SearchResult[] = JSON.parse(stored)
        if (results.length > 0) {
          setSearchResults(results)
        }
      } catch (error) {
        console.error('Error parsing search results:', error)
      }
    }
  }, [setSearchResults, searchParams])

  // Focus input when there are no results
  useEffect(() => {
    if (searchResults.length === 0 && inputRef.current) {
      inputRef.current.focus()
    }
  }, [searchResults.length])

  // Handle search - search videos based on filter tab
  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      localStorage.removeItem('currentSearchResults')
      return
    }

    // Use videos from state if available, otherwise from localStorage
    const videosToSearch = videos.length > 0 ? videos : (() => {
      const stored = localStorage.getItem('videos')
      if (stored) {
        try {
          return JSON.parse(stored) as Video[]
        } catch (error) {
          console.error('Error parsing videos:', error)
          return []
        }
      }
      return []
    })()

    if (videosToSearch.length === 0) {
      console.warn('No videos available for search')
      setSearchResults([])
      return
    }
    
    // Filter videos based on filterTab
    const filteredVideos = videosToSearch.filter((video) => {
      if (filterTab === 'all') return true
      if (filterTab === 'public') return video.isPublic
      if (filterTab === 'my') return !video.isPublic
      return true
    })

    const results: SearchResult[] = []
    filteredVideos.forEach((video) => {
      if (video.subtitles && video.subtitles.length > 0) {
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
    })
    
    console.log('Search results:', results.length, 'for query:', query)
    setSearchResults(results)
    localStorage.setItem('currentSearchResults', JSON.stringify(results))
  }

  // Load existing conversation data when searchId is available
  useEffect(() => {
    if (searchId) {
      const stored = localStorage.getItem('savedConversations')
      if (stored) {
        try {
          const savedConversations: SavedConversation[] = JSON.parse(stored)
          const existingConversation = savedConversations.find((c) => c.id === searchId)
          if (existingConversation) {
            setSearchName(existingConversation.name)
            setIsSearchPublic(existingConversation.isPublic)
          }
        } catch (error) {
          console.error('Error loading conversation:', error)
        }
      }
    }
  }, [searchId])

  // Auto-save conversation when search results are set (only when send button is clicked)
  useEffect(() => {
    if (searchResults.length > 0 && lastSearchQuery.trim() && searchId) {
      // Small delay to avoid saving multiple times
      const timeoutId = setTimeout(() => {
        // Check if conversation already exists for this search ID
        const stored = localStorage.getItem('savedConversations')
        const savedConversations: SavedConversation[] = stored ? JSON.parse(stored) : []
        
        // Check if a conversation with this search ID already exists
        const existingConversation = savedConversations.find(
          (c) => c.id === searchId
        )
        
        if (existingConversation) {
          // Update existing conversation with new results
          existingConversation.results = searchResults
          existingConversation.query = lastSearchQuery
          existingConversation.timestamp = new Date()
          existingConversation.name = searchName || existingConversation.name
          existingConversation.isPublic = isSearchPublic
          localStorage.setItem('savedConversations', JSON.stringify(savedConversations))
          window.dispatchEvent(new CustomEvent('conversationSaved'))
        } else {
          // Create new conversation with the search ID
          const conversationName = searchName || (lastSearchQuery.length > 50 
            ? `${lastSearchQuery.substring(0, 50)}...` 
            : lastSearchQuery)
          const newConversation: SavedConversation = {
            id: searchId, // Use the search ID
            query: lastSearchQuery,
            results: searchResults,
            timestamp: new Date(),
            name: conversationName,
            isPublic: isSearchPublic, // Use current visibility state
          }
          savedConversations.push(newConversation)
          localStorage.setItem('savedConversations', JSON.stringify(savedConversations))
          // Dispatch event to notify other components (like AppLayoutClient)
          window.dispatchEvent(new CustomEvent('conversationSaved'))
          // Update local state
          setSearchName(conversationName)
        }
      }, 500) // Delay to ensure search is complete
      
      return () => clearTimeout(timeoutId)
    }
  }, [searchResults, lastSearchQuery, searchId, searchName, isSearchPublic])

  // Handle initial search from input field
  const handleInitialSearch = () => {
    if (initialQuery.trim()) {
      const query = initialQuery.trim()
      // Clear the input
      setInitialQuery('')
      // Store the query for auto-saving
      setLastSearchQuery(query)
      // Set external message - ChatPanel will handle the search
      setExternalMessage(query)
    }
  }

  // Handle when external message is processed
  const handleExternalMessageProcessed = () => {
    setExternalMessage('')
    // Note: lastSearchQuery is kept to auto-save the conversation when results arrive
  }

  // Handle filter tab change
  const handleFilterTabClick = (tab: 'all' | 'public' | 'my') => {
    setFilterTab(tab)
    localStorage.setItem('filterTab', tab)
    // Re-run search if there's an initial query
    if (initialQuery.trim()) {
      handleSearch(initialQuery.trim())
    }
  }

  // Handle play video - navigate to video page
  const handlePlayVideo = (result: SearchResult) => {
    const video = videos.find((v) => v.id === result.videoId)
    if (video) {
      // Navigate to video page with timestamp deep link
      router.push(`/video/${video.id}?t=${result.startTime}`)
    }
  }

  // Handle video click
  const handleVideoClick = (video: Video) => {
    // Store videos in localStorage before navigation
    localStorage.setItem('videos', JSON.stringify(videos))
    router.push(`/video/${video.id}`)
  }

  // Handle clear search
  const handleClearSearch = () => {
    clearSearchResults()
    setInitialQuery('')
    setExternalMessage('')
    setLastSearchQuery('')
    // Generate new search ID for new search
    const newId = generateSearchId()
    setSearchId(newId)
    router.replace(`/search?id=${newId}`, { scroll: false })
  }

  // Handle save conversation
  const handleSaveConversation = (conversation: SavedConversation) => {
    const stored = localStorage.getItem('savedConversations')
    const savedConversations: SavedConversation[] = stored ? JSON.parse(stored) : []
    savedConversations.push(conversation)
    localStorage.setItem('savedConversations', JSON.stringify(savedConversations))
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('conversationSaved'))
  }

  const hasResults = searchResults.length > 0

  // Handle name editing
  const handleStartEditName = () => {
    setEditedName(searchName)
    setIsEditingName(true)
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }

  const handleSaveName = () => {
    if (editedName.trim()) {
      setSearchName(editedName.trim())
      updateConversationName(editedName.trim())
    }
    setIsEditingName(false)
  }

  const handleCancelEditName = () => {
    setIsEditingName(false)
    setEditedName('')
  }

  const handleToggleVisibility = () => {
    const newVisibility = !isSearchPublic
    setIsSearchPublic(newVisibility)
    updateConversationVisibility(newVisibility)
  }

  // Update conversation name in localStorage
  const updateConversationName = (newName: string) => {
    if (!searchId) return
    const stored = localStorage.getItem('savedConversations')
    if (stored) {
      try {
        const savedConversations: SavedConversation[] = JSON.parse(stored)
        const conversation = savedConversations.find((c) => c.id === searchId)
        if (conversation) {
          conversation.name = newName
          localStorage.setItem('savedConversations', JSON.stringify(savedConversations))
          window.dispatchEvent(new CustomEvent('conversationSaved'))
        }
      } catch (error) {
        console.error('Error updating conversation name:', error)
      }
    }
  }

  // Update conversation visibility in localStorage
  const updateConversationVisibility = (isPublic: boolean) => {
    if (!searchId) return
    const stored = localStorage.getItem('savedConversations')
    if (stored) {
      try {
        const savedConversations: SavedConversation[] = JSON.parse(stored)
        const conversation = savedConversations.find((c) => c.id === searchId)
        if (conversation) {
          conversation.isPublic = isPublic
          localStorage.setItem('savedConversations', JSON.stringify(savedConversations))
          window.dispatchEvent(new CustomEvent('conversationSaved'))
        }
      } catch (error) {
        console.error('Error updating conversation visibility:', error)
      }
    }
  }

  return (
    <div className="flex h-full w-full gap-4 p-4 overflow-hidden">
      {/* Left: Video Catalog with Results or Welcome Section */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {hasResults ? (
          <div className="h-full flex flex-col overflow-hidden">
            {/* Search Title Header */}
            <div className="shrink-0 p-4 border-b border-border bg-background">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  {isEditingName ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveName()
                          } else if (e.key === 'Escape') {
                            handleCancelEditName()
                          }
                        }}
                        className="flex-1 px-2 py-1 text-lg font-semibold bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={handleSaveName}
                        className="p-1.5 hover:bg-secondary rounded transition-colors"
                        aria-label="Save name"
                      >
                        <Check className="h-4 w-4 text-primary" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditName}
                        className="p-1.5 hover:bg-secondary rounded transition-colors"
                        aria-label="Cancel editing"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-lg font-semibold text-foreground truncate">
                        {searchName || 'Untitled Search'}
                      </h1>
                      <button
                        type="button"
                        onClick={handleStartEditName}
                        className="p-1.5 hover:bg-secondary rounded transition-colors shrink-0"
                        aria-label="Edit search name"
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleToggleVisibility}
                  className={`p-2 rounded-lg transition-colors shrink-0 ${
                    isSearchPublic
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                  }`}
                  aria-label={isSearchPublic ? 'Make private' : 'Make public'}
                  title={isSearchPublic ? 'Make private' : 'Make public'}
                >
                  {isSearchPublic ? (
                    <Globe className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <VideoCatalog
                videos={videos}
                onAddVideo={() => {}}
                onVideoClick={handleVideoClick}
                searchResults={searchResults}
                onClearSearch={handleClearSearch}
                filterTab={filterTab}
              />
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-6 w-full max-w-3xl">
              <h1 className="text-3xl font-semibold text-foreground">Search Assistant</h1>
              
              {/* Filter Tabs and Add Video Button - Centered */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleFilterTabClick('all')}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    filterTab === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  All Videos
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterTabClick('public')}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    filterTab === 'public'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  Public Videos
                </button>
                <button
                  type="button"
                  onClick={() => handleFilterTabClick('my')}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    filterTab === 'my'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  My Videos
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddVideoModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Video
                </button>
              </div>

              {/* Large Search Input - Centered */}
              <div className="w-full max-w-2xl">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={initialQuery}
                    onChange={(e) => setInitialQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleInitialSearch()
                      }
                    }}
                    placeholder="Search in video subtitles..."
                    className="w-full pl-12 pr-14 py-4 text-base bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={handleInitialSearch}
                    disabled={!initialQuery.trim()}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Send search"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Helper Text */}
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Ask me to find words or phrases in your video subtitles, like "find videos with javascript" or "search for the word tutorial".
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Add Video Modal */}
      <AddVideoModal
        isOpen={isAddVideoModalOpen}
        onClose={() => setIsAddVideoModalOpen(false)}
        onVideoAdded={(video) => {
          // Get existing videos from localStorage
          const storedVideos = localStorage.getItem('videos')
          const videos: Video[] = storedVideos ? JSON.parse(storedVideos) : []
          const newVideos = [...videos, { ...video, id: Date.now().toString() }]
          localStorage.setItem('videos', JSON.stringify(newVideos))
          
          // Update local videos state
          setVideos(newVideos)
          
          // Dispatch custom event to notify other pages
          window.dispatchEvent(new CustomEvent('videosUpdated'))
          
          // Close modal
          setIsAddVideoModalOpen(false)
        }}
      />

      {/* Right: Chat Panel - Always rendered, hidden when no results */}
      <div className={`${hasResults ? 'w-96' : 'w-0'} flex flex-col min-w-0 shrink-0 overflow-hidden transition-all duration-200 ${hasResults ? '' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex-1 overflow-hidden h-full">
          <Suspense fallback={<Loading />}>
            <ChatPanel
              onSearch={handleSearch}
              searchResults={searchResults}
              onPlayVideo={handlePlayVideo}
              onSaveConversation={handleSaveConversation}
              externalMessage={externalMessage}
              onExternalMessageProcessed={handleExternalMessageProcessed}
            />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
