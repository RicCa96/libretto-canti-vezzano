import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutoscroll } from '../hooks/useAutoscroll.ts'
import {
  useAutoscrollSpeed,
  pxPerSecond,
  AUTOSCROLL_MIN_LEVEL,
  AUTOSCROLL_MAX_LEVEL,
} from '../hooks/useAutoscrollSpeed.ts'
import './ChordToolbar.css'

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" />
    </svg>
  )
}

// Keep the screen on while scrolling: musicians aren't touching the device.
function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const acquire = () => {
      navigator.wakeLock
        .request('screen')
        .then((s) => {
          if (cancelled) void s.release()
          else sentinel = s
        })
        .catch(() => {
          /* denied or unsupported: autoscroll still works */
        })
    }
    // The browser drops the lock when the tab is hidden; re-take it on return.
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release()
    }
  }, [enabled])
}

function formatSemitones(n: number): string {
  if (n > 0) return `+${n}`
  if (n < 0) return `−${-n}`
  return '0'
}

type Props = {
  transpose: number
  onTransposeChange: (next: number) => void
}

const COLLAPSE_AFTER_MS = 5000

/**
 * Floating toolbar with every chord-view tool (autoscroll, transposition).
 * After COLLAPSE_AFTER_MS without presses it shrinks to a corner pill that
 * mirrors the current state; tapping the pill expands it again.
 * Autoscroll stops when this unmounts (leaving chords view or the song page).
 */
export function ChordToolbar({ transpose, onTransposeChange }: Props) {
  const [running, setRunning] = useState(false)
  const { level, faster, slower } = useAutoscrollSpeed()
  const stop = useCallback(() => setRunning(false), [])

  useAutoscroll(running, pxPerSecond(level), stop)
  useWakeLock(running)

  const [collapsed, setCollapsed] = useState(false)
  // Bumped on every press inside the bar to restart the collapse countdown.
  const [activity, setActivity] = useState(0)
  const poke = () => setActivity((a) => a + 1)

  const barRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLButtonElement>(null)
  const playRef = useRef<HTMLButtonElement>(null)
  // Set when the toggle should carry keyboard focus across, so it isn't
  // dropped onto <body> when the focused element disappears.
  const moveFocus = useRef(false)

  useEffect(() => {
    if (collapsed) return
    const id = setTimeout(() => {
      moveFocus.current = !!barRef.current?.contains(document.activeElement)
      setCollapsed(true)
    }, COLLAPSE_AFTER_MS)
    return () => clearTimeout(id)
  }, [collapsed, activity])

  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    ;(collapsed ? pillRef : playRef).current?.focus()
  }, [collapsed])

  const speedText = String(level)
  const transposeText = formatSemitones(transpose)

  if (collapsed) {
    return (
      <button
        ref={pillRef}
        type="button"
        className="chord-toolbar-pill"
        data-running={running}
        aria-label={`Mostra strumenti accordi: scorrimento ${
          running ? 'attivo' : 'in pausa'
        }, velocità ${speedText}, tono ${transposeText}`}
        onClick={() => {
          moveFocus.current = true
          setCollapsed(false)
        }}
      >
        {running ? <PlayIcon /> : <PauseIcon />}
        <span className="chord-toolbar__value">
          <span className="chord-toolbar__label">Vel.</span>
          <span>{speedText}</span>
        </span>
        <span className="chord-toolbar__divider" />
        <span className="chord-toolbar__value">
          <span className="chord-toolbar__label">Tono</span>
          <span>{transposeText}</span>
        </span>
      </button>
    )
  }

  return (
    <div
      ref={barRef}
      className="chord-toolbar"
      role="toolbar"
      aria-label="Strumenti accordi"
      onPointerDown={poke}
      onKeyDown={poke}
    >
      <button
        ref={playRef}
        type="button"
        className="chord-toolbar__play"
        data-running={running}
        aria-label={running ? 'Ferma scorrimento' : 'Avvia scorrimento'}
        onClick={() => setRunning((r) => !r)}
      >
        {running ? <PauseIcon /> : <PlayIcon />}
        <span className="chord-toolbar__play-text">{running ? 'Pausa' : 'Scorri'}</span>
      </button>

      <span className="chord-toolbar__group">
        <button
          type="button"
          aria-label="Più lento"
          disabled={level <= AUTOSCROLL_MIN_LEVEL}
          onClick={slower}
        >
          −
        </button>
        <span className="chord-toolbar__value" aria-live="polite">
          <span className="chord-toolbar__label">Velocità</span>
          <span data-testid="autoscroll-speed">{speedText}</span>
        </span>
        <button
          type="button"
          aria-label="Più veloce"
          disabled={level >= AUTOSCROLL_MAX_LEVEL}
          onClick={faster}
        >
          +
        </button>
      </span>

      <span className="chord-toolbar__divider" aria-hidden="true" />

      <span className="chord-toolbar__group">
        <button
          type="button"
          aria-label="Abbassa tono"
          onClick={() => onTransposeChange(transpose - 1)}
        >
          −
        </button>
        <span className="chord-toolbar__value" aria-live="polite">
          <span className="chord-toolbar__label">Tono</span>
          <span data-testid="transpose-offset">{transposeText}</span>
        </span>
        <button
          type="button"
          aria-label="Alza tono"
          onClick={() => onTransposeChange(transpose + 1)}
        >
          +
        </button>
      </span>
    </div>
  )
}
