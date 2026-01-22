'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from './Header'
import AddVideoModal from './AddVideoModal'
import { Video } from '@/lib/types'

export default function HeaderWrapper() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAddVideoModalOpen, setIsAddVideoModalOpen] = useState(false)

  const handleAvatarClick = () => {
    setIsLoggedIn(!isLoggedIn)
  }

  const handleVideoAdded = (video: Video) => {
    // Get existing videos from localStorage
    const storedVideos = localStorage.getItem('videos')
    const videos: Video[] = storedVideos ? JSON.parse(storedVideos) : []
    const newVideos = [...videos, { ...video, id: Date.now().toString() }]
    localStorage.setItem('videos', JSON.stringify(newVideos))
    
    // Dispatch custom event to notify home page
    window.dispatchEvent(new CustomEvent('videosUpdated'))
    
    // Close modal and navigate to home if not already there
    setIsAddVideoModalOpen(false)
    if (window.location.pathname !== '/') {
      router.push('/')
    }
  }

  return (
    <>
      <Header
        onAddVideoClick={() => setIsAddVideoModalOpen(true)}
        onAvatarClick={handleAvatarClick}
        isLoggedIn={isLoggedIn}
      />
      <AddVideoModal
        isOpen={isAddVideoModalOpen}
        onClose={() => setIsAddVideoModalOpen(false)}
        onVideoAdded={handleVideoAdded}
      />
    </>
  )
}
