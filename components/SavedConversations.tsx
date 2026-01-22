'use client'

import { SavedConversation, SearchResult } from '@/lib/types'
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar'

interface SavedConversationsProps {
  conversations: SavedConversation[]
  onLoadResults: (results: SearchResult[]) => void
  onDelete: (id: string) => void
}

export default function SavedConversations({
  conversations,
  onLoadResults,
  onDelete,
}: SavedConversationsProps) {
  if (conversations.length === 0) return null

  return (
    <SidebarMenu>
      {conversations.map((conversation) => (
        <SidebarMenuItem key={conversation.id}>
          <SidebarMenuButton
            onClick={() => onLoadResults(conversation.results)}
            className="flex flex-col items-start gap-0.5 h-auto py-2"
          >
            <span className="text-sm font-medium text-sidebar-foreground truncate w-full">
              {conversation.name}
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              {new Date(conversation.timestamp).toLocaleDateString()}
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
