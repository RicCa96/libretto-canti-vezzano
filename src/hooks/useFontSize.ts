import { useState, useCallback } from 'react'

export const FONT_SIZES = ['sm', 'md', 'lg', 'xl'] as const
export type FontSize = (typeof FONT_SIZES)[number]

const KEY = 'libretto-font-size'

export const FONT_REM: Record<FontSize, string> = {
  sm: '0.95rem',
  md: '1.1rem',
  lg: '1.35rem',
  xl: '1.6rem',
}

function read(): FontSize {
  const stored = localStorage.getItem(KEY)
  return FONT_SIZES.includes(stored as FontSize) ? (stored as FontSize) : 'md'
}

export function useFontSize() {
  const [size, setSizeState] = useState<FontSize>(read)
  const setSize = useCallback((next: FontSize) => {
    localStorage.setItem(KEY, next)
    setSizeState(next)
  }, [])
  return { size, setSize }
}
