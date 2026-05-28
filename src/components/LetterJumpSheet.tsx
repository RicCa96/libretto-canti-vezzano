import { useEffect, useRef } from 'react'

type LetterJumpSheetProps = {
  letters: string[]
  open: boolean
  onClose: () => void
  onPick: (letter: string) => void
}

export function LetterJumpSheet({ letters, open, onClose, onPick }: LetterJumpSheetProps) {
  const firstChipRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  useEffect(() => {
    if (open) firstChipRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div className="letter-sheet-root">
      <div
        className="letter-sheet-backdrop"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Salta a lettera"
        id="letter-jump-sheet"
        className="letter-sheet"
      >
        <div className="letter-sheet__handle" aria-hidden="true" />
        <div className="letter-sheet__grid">
          {letters.map((letter, i) => (
            <button
              key={letter}
              ref={i === 0 ? firstChipRef : undefined}
              type="button"
              className="letter-sheet__chip"
              aria-label={`Salta a ${letter}`}
              onClick={() => onPick(letter)}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
