'use client'

import { Plus } from 'lucide-react'

interface HeaderProps {
  onAddVideoClick: () => void
  onAvatarClick: () => void
  isLoggedIn: boolean
}

export default function Header({ onAddVideoClick, onAvatarClick, isLoggedIn }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center justify-between px-6 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <svg
              className="w-5 h-5 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">VisionSearch</h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Add New Video Button */}
          <button
            onClick={onAddVideoClick}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Video
          </button>

          {/* Avatar/Login */}
          <button
            onClick={onAvatarClick}
            className="w-10 h-10 rounded-full bg-secondary border-2 border-border hover:border-primary transition-colors flex items-center justify-center text-foreground font-semibold text-sm"
          >
            {isLoggedIn ? 'U' : 'L'}
          </button>
        </div>
      </div>
    </header>
  )
}
