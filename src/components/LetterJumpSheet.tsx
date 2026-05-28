type LetterJumpSheetProps = {
  letters: string[]
  open: boolean
  onClose: () => void
  onPick: (letter: string) => void
}

export function LetterJumpSheet({ letters, open, onClose, onPick }: LetterJumpSheetProps) {
  void onClose
  if (!open) return null
  return (
    <div role="dialog" aria-modal="true" aria-label="Salta a lettera" id="letter-jump-sheet">
      {letters.map((letter) => (
        <button key={letter} type="button" onClick={() => onPick(letter)}>
          {letter}
        </button>
      ))}
    </div>
  )
}
