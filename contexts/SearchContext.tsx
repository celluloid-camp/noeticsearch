'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { SearchResult } from '@/lib/types'

interface SearchContextType {
  searchResults: SearchResult[]
  setSearchResults: (results: SearchResult[]) => void
  clearSearchResults: () => void
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchResults, setSearchResultsState] = useState<SearchResult[]>([])

  // Load search results from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('currentSearchResults')
    if (stored) {
      try {
        const parsedResults: SearchResult[] = JSON.parse(stored)
        setSearchResultsState(parsedResults)
      } catch (error) {
        console.error('Error parsing stored search results:', error)
      }
    }
  }, [])

  // Save to localStorage whenever search results change
  useEffect(() => {
    if (searchResults.length > 0) {
      localStorage.setItem('currentSearchResults', JSON.stringify(searchResults))
    } else {
      localStorage.removeItem('currentSearchResults')
    }
  }, [searchResults])

  const setSearchResults = useCallback((results: SearchResult[]) => {
    setSearchResultsState(results)
  }, [])

  const clearSearchResults = useCallback(() => {
    setSearchResultsState([])
  }, [])

  return (
    <SearchContext.Provider value={{ searchResults, setSearchResults, clearSearchResults }}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const context = useContext(SearchContext)
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider')
  }
  return context
}
