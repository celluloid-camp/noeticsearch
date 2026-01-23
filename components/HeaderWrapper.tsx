'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from './Header'

export default function HeaderWrapper() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const handleAvatarClick = () => {
    setIsLoggedIn(!isLoggedIn)
  }

  const handleNewSearchClick = () => {
    router.push('/search?new=true')
  }

  return (
    <Header
      onNewSearchClick={handleNewSearchClick}
      onAvatarClick={handleAvatarClick}
      isLoggedIn={isLoggedIn}
    />
  )
}
