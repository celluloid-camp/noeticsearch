export interface SearchResult {
  endTime: number;
  startTime: number;
  subtitle: string;
  timestamp: string;
  videoId: string;
  videoThumbnail: string;
  videoTitle: string;
}

export interface ChatMessage {
  content: string;
  id: string;
  role: "user" | "assistant";
  timestamp: Date;
}

export interface SavedConversation {
  id: string;
  isPublic: boolean;
  name: string;
  query: string;
  results: SearchResult[];
  timestamp: Date;
}
