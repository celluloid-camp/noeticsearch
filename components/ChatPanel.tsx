'use client'

import React from "react"

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SearchResult, ChatMessage, SavedConversation } from '@/lib/types'
import { Send, Play, Save } from 'lucide-react'

interface ChatPanelProps {
  onSearch: (query: string) => void
  searchResults: SearchResult[]
  onPlayVideo: (result: SearchResult) => void
  onSaveConversation: (conversation: SavedConversation) => void
  externalMessage?: string
  onExternalMessageProcessed?: () => void
}

export default function ChatPanel({ onSearch, searchResults, onPlayVideo, onSaveConversation, externalMessage, onExternalMessageProcessed }: ChatPanelProps) {
  const router = useRouter()
  
  // Initialize messages with default (will load from localStorage on client)
  const defaultMessages: ChatMessage[] = [
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I search inside your video subtitles. Ask me to find words or phrases, like "find videos with javascript" or "search for the word tutorial".',
      timestamp: new Date(),
    },
  ]

  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages)
  
  // Load messages from localStorage on client side only
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const stored = localStorage.getItem('currentChatMessages')
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
  }, [])
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


  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle external message from search page
  useEffect(() => {
    if (externalMessage && externalMessage.trim()) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: externalMessage,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setLoading(true)

      // Extract search query and run search
      const searchQuery = extractSearchQuery(externalMessage)
      setLastQuery(searchQuery)
      onSearch(searchQuery)

      // Notify parent that message was processed (this clears externalMessage)
      onExternalMessageProcessed?.()
      
      // Clear loading if search results are already available (edge case)
      // The main loading clear happens in the searchResults effect
    }
  }, [externalMessage, onSearch, onExternalMessageProcessed])

  // Update assistant message when search results change (for external messages only)
  useEffect(() => {
    if (lastQuery && loading) {
      // Small delay to ensure search has completed
      const timer = setTimeout(() => {
        setLoading(false)
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            searchResults.length > 0
              ? `I searched your video subtitles and found ${searchResults.length} result${
                  searchResults.length !== 1 ? 's' : ''
                } for "${lastQuery}". Click a result below to play the video at that moment.`
              : `I searched your video subtitles but found no matches for "${lastQuery}". Try a different word or phrase.`,
          timestamp: new Date(),
        }

        setMessages((prev) => {
          // Remove any existing assistant message for this query
          const filtered = prev.filter((msg) => !(msg.role === 'assistant' && msg.content.includes(`"${lastQuery}"`)))
          return [...filtered, assistantMessage]
        })
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [searchResults, lastQuery, loading])

  // Fallback: Clear loading state if it's been stuck for too long
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoading(false)
      }, 5000) // Clear loading after 5 seconds max
      return () => clearTimeout(timeout)
    }
  }, [loading])

  // Save messages to localStorage whenever they change (client side only)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (messages.length > 0) {
      localStorage.setItem('currentChatMessages', JSON.stringify(messages))
    }
  }, [messages])

  const extractSearchQuery = (text: string): string => {
    const lowerText = text.toLowerCase()

    // Extract search terms using common patterns
    const patterns = [
      /find\s+(?:videos?\s+)?(?:about\s+)?["']?(.+?)["']?(?:\?|$)/i,
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
            ? `I searched your video subtitles and found ${searchResults.length} result${
                searchResults.length !== 1 ? 's' : ''
              } for "${searchQuery}". Click a result below to play the video at that moment.`
            : `I searched your video subtitles but found no matches for "${searchQuery}". Try a different word or phrase.`,
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
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Search Assistant</h2>
        <p className="text-xs text-muted-foreground mt-1">Ask me to find text in your videos</p>
      </div>

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
                    autoFocus
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

            {/* Group results by video */}
            {(() => {
              const groupedResults = searchResults.reduce<Record<string, SearchResult[]>>(
                (acc, result) => {
                  if (!acc[result.videoId]) {
                    acc[result.videoId] = []
                  }
                  acc[result.videoId].push(result)
                  return acc
                },
                {},
              )

              const videoGroups = Object.entries(groupedResults).slice(0, 3) // Show max 3 videos
              const remainingVideos = Object.keys(groupedResults).length - 3

              return (
                <>
                  {videoGroups.map(([videoId, results]) => {
                    const firstResult = results[0]
                    const displayResults = results.slice(0, 3) // Show max 3 results per video
                    const remainingResults = results.length - 3

                    return (
                      <div key={videoId} className="flex flex-col gap-1">
                        <button
                          onClick={() => onPlayVideo(firstResult)}
                          className="text-left p-2 bg-secondary/50 hover:bg-secondary border border-border rounded cursor-pointer transition-colors text-xs"
                        >
                          <div className="flex items-start gap-2">
                            <Play className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">{firstResult.videoTitle}</p>
                            </div>
                          </div>
                        </button>
                        <div className="ml-5 flex flex-col gap-1">
                          {displayResults.map((result, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                // Navigate to video page with timestamp deep link
                                router.push(`/video/${result.videoId}?t=${result.startTime}`)
                              }}
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
                          {remainingResults > 0 && (
                            <p className="text-xs text-muted-foreground px-1.5">
                              +{remainingResults} more match{remainingResults !== 1 ? 'es' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {remainingVideos > 0 && (
                    <p className="text-xs text-muted-foreground px-1">
                      +{remainingVideos} more video{remainingVideos !== 1 ? 's' : ''}
                    </p>
                  )}
                </>
              )
            })()}
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
    </div>
  )
}
