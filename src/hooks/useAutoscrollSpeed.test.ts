import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useAutoscrollSpeed,
  AUTOSCROLL_MIN_LEVEL,
  AUTOSCROLL_MAX_LEVEL,
  AUTOSCROLL_DEFAULT_LEVEL,
  pxPerSecond,
} from './useAutoscrollSpeed.ts'

const KEY = 'libretto-autoscroll-speed'

describe('useAutoscrollSpeed', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to the default level', () => {
    const { result } = renderHook(() => useAutoscrollSpeed())
    expect(result.current.level).toBe(AUTOSCROLL_DEFAULT_LEVEL)
  })

  it('reads a valid stored level', () => {
    localStorage.setItem(KEY, '7')
    const { result } = renderHook(() => useAutoscrollSpeed())
    expect(result.current.level).toBe(7)
  })

  it('ignores an invalid stored level', () => {
    localStorage.setItem(KEY, '99')
    const { result } = renderHook(() => useAutoscrollSpeed())
    expect(result.current.level).toBe(AUTOSCROLL_DEFAULT_LEVEL)
  })

  it('increments, decrements and persists, clamped to bounds', () => {
    localStorage.setItem(KEY, String(AUTOSCROLL_MAX_LEVEL - 1))
    const { result } = renderHook(() => useAutoscrollSpeed())

    act(() => result.current.faster())
    expect(result.current.level).toBe(AUTOSCROLL_MAX_LEVEL)
    act(() => result.current.faster())
    expect(result.current.level).toBe(AUTOSCROLL_MAX_LEVEL)
    expect(localStorage.getItem(KEY)).toBe(String(AUTOSCROLL_MAX_LEVEL))

    act(() => result.current.setLevel(AUTOSCROLL_MIN_LEVEL))
    act(() => result.current.slower())
    expect(result.current.level).toBe(AUTOSCROLL_MIN_LEVEL)
    expect(localStorage.getItem(KEY)).toBe(String(AUTOSCROLL_MIN_LEVEL))
  })

  it('maps levels to strictly increasing speeds', () => {
    for (let l = AUTOSCROLL_MIN_LEVEL; l < AUTOSCROLL_MAX_LEVEL; l++) {
      expect(pxPerSecond(l + 1)).toBeGreaterThan(pxPerSecond(l))
    }
  })
})
