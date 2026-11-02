import { useState, useCallback } from 'react'

const KEY = 'libretto-autoscroll-speed'

// Pixels per second for each speed level (index 0 = level 1).
// Slow end suits long, sparse songs; fast end suits dense chord sheets at large font.
const SPEEDS_PX_S = [6, 9, 12, 16, 20, 25, 31, 38, 46, 56] as const

export const AUTOSCROLL_MIN_LEVEL = 1
export const AUTOSCROLL_MAX_LEVEL = SPEEDS_PX_S.length
export const AUTOSCROLL_DEFAULT_LEVEL = 4

export function pxPerSecond(level: number): number {
  return SPEEDS_PX_S[clamp(level) - 1]
}

function clamp(level: number): number {
  return Math.min(AUTOSCROLL_MAX_LEVEL, Math.max(AUTOSCROLL_MIN_LEVEL, level))
}

function read(): number {
  const stored = Number(localStorage.getItem(KEY))
  return Number.isInteger(stored) &&
    stored >= AUTOSCROLL_MIN_LEVEL &&
    stored <= AUTOSCROLL_MAX_LEVEL
    ? stored
    : AUTOSCROLL_DEFAULT_LEVEL
}

export function useAutoscrollSpeed() {
  const [level, setLevelState] = useState<number>(read)

  const setLevel = useCallback((next: number) => {
    const value = clamp(next)
    localStorage.setItem(KEY, String(value))
    setLevelState(value)
  }, [])

  const faster = useCallback(() => setLevel(level + 1), [level, setLevel])
  const slower = useCallback(() => setLevel(level - 1), [level, setLevel])

  return { level, setLevel, faster, slower }
}
