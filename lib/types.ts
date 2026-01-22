export interface Subtitle {
  text: string
  timestamp: string
  startTime: number
  endTime: number
}

export interface Video {
  id: string
  title: string
  url: string
  thumbnail: string
  subtitles: Subtitle[]
  addedDate: Date
  isPublic: boolean
}

export interface SearchResult {
  videoId: string
  videoTitle: string
  videoThumbnail: string
  subtitle: string
  timestamp: string
  startTime: number
  endTime: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface SavedConversation {
  id: string
  query: string
  results: SearchResult[]
  timestamp: Date
  name: string
   isPublic: boolean
}
