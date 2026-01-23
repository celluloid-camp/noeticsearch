'use client'

import { SavedConversation, SearchResult } from '@/lib/types'
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar'
import { X } from 'lucide-react'

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
          <div className="group flex items-center w-full">
            <SidebarMenuButton
              onClick={() => onLoadResults(conversation.results)}
              className="flex flex-col items-start gap-0.5 h-auto py-2 flex-1 min-w-0"
            >
              <span className="text-sm font-medium text-sidebar-foreground truncate w-full">
                {conversation.name}
              </span>
              <span className="text-xs text-sidebar-foreground/60">
                {new Date(conversation.timestamp).toLocaleDateString()}
              </span>
            </SidebarMenuButton>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(conversation.id)
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-sidebar-accent rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground shrink-0"
              aria-label={`Delete ${conversation.name}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
