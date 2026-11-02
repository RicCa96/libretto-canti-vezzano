import { useEffect, useRef } from 'react'

// Longest frame gap honoured; anything longer (backgrounded tab, debugger
// pause) is treated as this, so the page never jumps when it resumes.
const MAX_FRAME_MS = 100

function atBottom(): boolean {
  const max = document.documentElement.scrollHeight - window.innerHeight
  return window.scrollY >= max - 1
}

/**
 * Scrolls the window down at `pxPerSec` while `active` is true.
 * Calls `onEnd` (once) when the bottom of the page is reached.
 * Sub-pixel progress is accumulated so slow speeds still move smoothly.
 */
export function useAutoscroll(
  active: boolean,
  pxPerSec: number,
  onEnd: () => void,
) {
  const speedRef = useRef(pxPerSec)
  const onEndRef = useRef(onEnd)
  useEffect(() => {
    speedRef.current = pxPerSec
    onEndRef.current = onEnd
  })

  useEffect(() => {
    if (!active) return

    let frame = 0
    let last: number | null = null
    let carry = 0

    const tick = (now: number) => {
      if (last !== null) {
        const dt = Math.min(now - last, MAX_FRAME_MS)
        carry += (speedRef.current * dt) / 1000
        const step = Math.floor(carry)
        if (step >= 1) {
          window.scrollBy(0, step)
          carry -= step
        }
        if (atBottom()) {
          frame = 0
          onEndRef.current()
          return
        }
      }
      last = now
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => {
      if (frame) cancelAnimationFrame(frame)
    }
  }, [active])
}
