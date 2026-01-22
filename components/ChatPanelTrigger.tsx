'use client'

import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'

export default function ChatPanelTrigger() {
  const { toggleSidebar } = useSidebar()
  
  return (
    <div className="absolute right-4 top-4 z-10">
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={toggleSidebar}
        aria-label="Toggle Chat Panel"
      >
        <MessageSquare />
        <span className="sr-only">Toggle Chat Panel</span>
      </Button>
    </div>
  )
}
