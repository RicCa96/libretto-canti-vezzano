import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAutoscroll } from './useAutoscroll.ts'

// Manual requestAnimationFrame driver so tests control time.
let frames: Map<number, FrameRequestCallback>
let nextId: number
function flushFrame(time: number) {
  const pending = [...frames.values()]
  frames.clear()
  pending.forEach((cb) => cb(time))
}

let scrollY: number
let scrollHeight: number

beforeEach(() => {
  frames = new Map()
  nextId = 1
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = nextId++
    frames.set(id, cb)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))

  scrollY = 0
  scrollHeight = 5000
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    get: () => scrollHeight,
  })
  vi.spyOn(window, 'scrollBy').mockImplementation(((_x: number, y: number) => {
    scrollY += y
  }) as typeof window.scrollBy)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useAutoscroll', () => {
  it('does nothing while inactive', () => {
    renderHook(() => useAutoscroll(false, 100, vi.fn()))
    expect(frames.size).toBe(0)
    expect(window.scrollBy).not.toHaveBeenCalled()
  })

  it('scrolls by speed × elapsed time, accumulating sub-pixel steps', () => {
    renderHook(() => useAutoscroll(true, 10, vi.fn()))
    flushFrame(1000) // first frame only sets the baseline
    flushFrame(1050) // 0.5px — not enough to move
    expect(scrollY).toBe(0)
    flushFrame(1100) // 1.0px accumulated
    expect(scrollY).toBe(1)
    for (let t = 1200; t <= 2100; t += 100) flushFrame(t) // +10px over 1s
    expect(scrollY).toBe(11)
  })

  it('clamps long gaps (e.g. backgrounded tab) to avoid jumps', () => {
    renderHook(() => useAutoscroll(true, 100, vi.fn()))
    flushFrame(0)
    flushFrame(60_000)
    expect(scrollY).toBeLessThanOrEqual(10)
  })

  it('stops and calls onEnd at the bottom of the page', () => {
    scrollHeight = 800 + 5 // 5px left to scroll
    const onEnd = vi.fn()
    renderHook(() => useAutoscroll(true, 100, onEnd))
    flushFrame(0)
    flushFrame(100)
    flushFrame(200)
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(frames.size).toBe(0)
  })

  it('cancels the loop on unmount', () => {
    const { unmount } = renderHook(() => useAutoscroll(true, 100, vi.fn()))
    expect(frames.size).toBe(1)
    unmount()
    expect(frames.size).toBe(0)
  })
})
