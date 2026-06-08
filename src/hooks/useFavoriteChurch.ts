import { useState, useCallback } from 'react'
import { CHURCHES, type Church } from '../lib/churches.ts'

const KEY = 'libretto-favorite-church'
const CHURCH_SET = new Set<string>(CHURCHES)

function read(): Church | null {
  const stored = localStorage.getItem(KEY)
  return stored !== null && CHURCH_SET.has(stored) ? (stored as Church) : null
}

export function useFavoriteChurch() {
  const [favorite, setFavoriteState] = useState<Church | null>(read)
  const setFavorite = useCallback((next: Church) => {
    localStorage.setItem(KEY, next)
    setFavoriteState(next)
  }, [])
  const clearFavorite = useCallback(() => {
    localStorage.removeItem(KEY)
    setFavoriteState(null)
  }, [])
  return { favorite, setFavorite, clearFavorite }
}
