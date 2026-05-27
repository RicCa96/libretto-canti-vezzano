const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
}

function shiftNote(note: string, semitones: number): string {
  const normalized = FLAT_TO_SHARP[note] ?? note
  const i = SHARP.indexOf(normalized)
  if (i === -1) return note
  return SHARP[(((i + semitones) % 12) + 12) % 12]
}

function shiftPart(part: string, semitones: number): string {
  return part.replace(/^([A-G][#b]?)/, (_match, note: string) =>
    shiftNote(note, semitones),
  )
}

export function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord
  const [main, bass] = chord.split('/')
  return bass === undefined
    ? shiftPart(main, semitones)
    : `${shiftPart(main, semitones)}/${shiftPart(bass, semitones)}`
}
