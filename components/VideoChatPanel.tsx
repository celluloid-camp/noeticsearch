'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import type React from 'react'
import { SearchResult, ChatMessage, SavedConversation, Video, Subtitle } from '@/lib/types'
import { Send, Save, Bookmark, BookmarkCheck } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface VideoChatPanelProps {
  videoId: string
  video: Video
  onSearch: (query: string) => void
  searchResults: SearchResult[]
  onPlayVideo: (result: SearchResult) => void
  onSaveConversation: (conversation: SavedConversation) => void
  selectedResult?: SearchResult | null
  currentTime?: number
  playerRef?: React.RefObject<{ seekTo: (time: number) => void }>
  onSeek?: (time: number) => void
}

export default function VideoChatPanel({ 
  videoId,
  video,
  onSearch, 
  searchResults, 
  onPlayVideo, 
  onSaveConversation,
  selectedResult,
  currentTime = 0,
  playerRef,
  onSeek
}: VideoChatPanelProps) {
  const [activeTab, setActiveTab] = useState('assistant')
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
    // If we have a selectedResult with a startTime, use that first (for deep linking)
    if (selectedResult?.startTime !== undefined) {
      const seekTime = selectedResult.startTime
      const index = video.subtitles.findIndex(
        (sub) => seekTime >= sub.startTime && seekTime <= sub.endTime
      )
      if (index !== -1) {
        return index
      }
      // If no exact match, find the closest subtitle
      const closestIndex = video.subtitles.reduce((closest, sub, idx) => {
        const closestDiff = Math.abs(video.subtitles[closest].startTime - seekTime)
        const currentDiff = Math.abs(sub.startTime - seekTime)
        return currentDiff < closestDiff ? idx : closest
      }, 0)
      return closestIndex
    }
    // Otherwise, use currentTime from video playback
    return video.subtitles.findIndex(
      (sub) => currentTime >= sub.startTime && currentTime <= sub.endTime
    )
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

  // Find the current subtitle index in the filtered array
  const currentFilteredIndex = currentSubtitleIndex !== -1 
    ? filteredSubtitles.findIndex(({ index }) => index === currentSubtitleIndex)
    : -1

  // Auto-scroll to current subtitle while playing or when selectedResult changes
  useEffect(() => {
    if (activeTab === 'transcript' && currentFilteredIndex !== -1) {
      // Use a small delay to ensure the element is rendered
      const timeoutId = setTimeout(() => {
        const subtitleElement = subtitleRefs.current[currentFilteredIndex]
        if (subtitleElement) {
          subtitleElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else {
          console.log('⚠️ Subtitle element not found for index:', currentFilteredIndex, 'currentSubtitleIndex:', currentSubtitleIndex)
        }
      }, 150) // Increased delay to ensure element is rendered
      
      return () => clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilteredIndex, activeTab, currentSubtitleIndex, selectedResult]) // Depend on selectedResult to trigger when URL timestamp changes

  const handleSubtitleClick = (subtitle: Subtitle) => {
    if (playerRef?.current) {
      playerRef.current.seekTo(subtitle.startTime)
      onSeek?.(subtitle.startTime)
    }
  }
  // Get video-specific localStorage key
  const getMessagesKey = () => `currentChatMessages_${videoId}`

  // Default messages
  const defaultMessages: ChatMessage[] = [
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I can search within this video\'s subtitles. Ask me to find words or phrases, like "find mentions of javascript" or "search for tutorial".',
      timestamp: new Date(),
    },
  ]

  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages)
  
  // Load messages from localStorage on client side only
  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = getMessagesKey()
    const stored = localStorage.getItem(key)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const loadedMessages = parsed.map((msg: { timestamp: string | Date; [key: string]: unknown }) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }))
        setMessages(loadedMessages)
      } catch {
        // Fall back to default if parsing fails
      }
    }
  }, [videoId])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastQuery, setLastQuery] = useState('')
  const [showSavePrompt, setShowSavePrompt] = useState(false)
  const [conversationName, setConversationName] = useState('')
  const [isConversationPublic, setIsConversationPublic] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Reload messages when videoId changes (client side only)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = getMessagesKey()
    const stored = localStorage.getItem(key)
    let newMessages: ChatMessage[]
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        newMessages = parsed.map((msg: { timestamp: string | Date; [key: string]: unknown }) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }))
      } catch {
        // Fall back to default if parsing fails
        newMessages = [
          {
            id: '1',
            role: 'assistant',
            content: 'Hi! I can search within this video\'s subtitles. Ask me to find words or phrases, like "find mentions of javascript" or "search for tutorial".',
            timestamp: new Date(),
          },
        ]
      }
    } else {
      newMessages = [
        {
          id: '1',
          role: 'assistant',
          content: 'Hi! I can search within this video\'s subtitles. Ask me to find words or phrases, like "find mentions of javascript" or "search for tutorial".',
          timestamp: new Date(),
        },
      ]
    }
    setMessages(newMessages)
  }, [videoId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Save messages to localStorage whenever they change (client side only)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (messages.length > 0) {
      const key = getMessagesKey()
      localStorage.setItem(key, JSON.stringify(messages))
    }
  }, [messages, videoId])

  const extractSearchQuery = (text: string): string => {
    // Extract search terms using common patterns
    const patterns = [
      /find\s+(?:mentions?\s+of\s+)?["']?(.+?)["']?(?:\?|$)/i,
      /search\s+for\s+["']?(.+?)["']?(?:\?|$)/i,
      /look\s+for\s+["']?(.+?)["']?(?:\?|$)/i,
      /show\s+me\s+["']?(.+?)["']?(?:\?|$)/i,
      /find\s+["']?(.+?)["']?(?:\?|$)/i,
      /["'](.+?)["']/, // Quoted text
      /(?:search|find|look)\s+(.+?)(?:\?|$)/i, // Fallback pattern
      /(.+?)(?:\?|$)/, // Last resort - everything before ?
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        return match[1].trim().replace(/\s+/g, ' ')
      }
    }

    return text.trim()
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 600))

      const searchQuery = extractSearchQuery(input)
      setLastQuery(searchQuery)
      onSearch(searchQuery)

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          searchResults.length > 0
            ? `I searched this video's subtitles and found ${searchResults.length} result${
                searchResults.length !== 1 ? 's' : ''
              } for "${searchQuery}". Click a result below to jump to that moment.`
            : `I searched this video's subtitles but found no matches for "${searchQuery}". Try a different word or phrase.`,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleSaveConversation = () => {
    if (!conversationName.trim() || searchResults.length === 0) return

    const savedConversation: SavedConversation = {
      id: Date.now().toString(),
      query: lastQuery,
      results: searchResults,
      timestamp: new Date(),
      name: conversationName,
      isPublic: isConversationPublic,
    }

    onSaveConversation(savedConversation)
    setConversationName('')
    setIsConversationPublic(true)
    setShowSavePrompt(false)

    const confirmMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Saved search "${conversationName}" with ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}.`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, confirmMessage])
  }

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="p-4 border-b border-border">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assistant">Assistant</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
          </TabsList>
        </div>

        {/* Assistant Tab */}
        <TabsContent value="assistant" className="flex-1 flex flex-col min-h-0 m-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : 'bg-secondary text-foreground rounded-bl-none'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {/* Search Results Display */}
        {searchResults.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-muted-foreground">Results:</p>
              {!showSavePrompt && (
                <button
                  type="button"
                  onClick={() => setShowSavePrompt(true)}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  <Save className="w-3 h-3" />
                  Save
                </button>
              )}
            </div>

            {showSavePrompt && (
              <div className="p-2 bg-secondary/50 border border-border rounded flex gap-2">
                <div className="flex-1 flex flex-col gap-2">
                  <input
                    type="text"
                    value={conversationName}
                    onChange={(e) => setConversationName(e.target.value)}
                    placeholder="Name this search..."
                    className="w-full px-2 py-1 text-xs bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">Visibility:</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setIsConversationPublic(true)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          isConversationPublic
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-border hover:bg-secondary/60'
                        }`}
                      >
                        Public
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConversationPublic(false)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          !isConversationPublic
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-border hover:bg-secondary/60'
                        }`}
                      >
                        Private
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={handleSaveConversation}
                    disabled={!conversationName.trim()}
                    className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSavePrompt(false)
                      setConversationName('')
                      setIsConversationPublic(true)
                    }}
                    className="px-2 py-1 bg-secondary text-foreground text-xs rounded hover:bg-secondary/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Display results - simplified since all are from the same video */}
            <div className="flex flex-col gap-1">
              {searchResults.slice(0, 10).map((result, idx) => (
                <button
                  key={`${result.startTime}-${result.endTime}-${idx}`}
                  type="button"
                  onClick={() => onPlayVideo(result)}
                  className="text-left p-1.5 bg-background/50 hover:bg-background border border-border rounded cursor-pointer transition-colors text-xs"
                >
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground mt-0.5 shrink-0">
                      {result.timestamp}
                    </span>
                    <p className="text-muted-foreground truncate flex-1">{result.subtitle}</p>
                  </div>
                </button>
              ))}
              {searchResults.length > 10 && (
                <p className="text-xs text-muted-foreground px-1.5">
                  +{searchResults.length - 10} more match{searchResults.length - 10 !== 1 ? 'es' : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-secondary text-foreground rounded-lg rounded-bl-none px-3 py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-border flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search for text..."
              disabled={loading}
              className="flex-1 px-3 py-2 border border-input rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </TabsContent>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="flex-1 flex flex-col min-h-0 m-0">
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
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
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
                      onClick={() => handleSubtitleClick(subtitle)}
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
