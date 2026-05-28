// 12-tone scales in both notations. Index = semitones from C/Do.
const EN_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const IT_SHARP = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'] as const

// Flat → sharp aliases, used so we can index into the *_SHARP arrays.
const EN_FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
}
const IT_FLAT_TO_SHARP: Record<string, string> = {
  Reb: 'Do#',
  Mib: 'Re#',
  Solb: 'Fa#',
  Lab: 'Sol#',
  Sib: 'La#',
}

// Match the longest Italian note name first, then fall back to a single-letter English note.
// Accidental (#/b) is captured as an optional second group.
const NOTE_RE = /^(Sol|Do|Re|Mi|Fa|La|Si|[A-G])([#b]?)/

type NoteInfo = { index: number; italian: boolean }

function noteInfo(prefix: string): NoteInfo | null {
  const itFlat = IT_FLAT_TO_SHARP[prefix]
  if (itFlat) return { index: IT_SHARP.indexOf(itFlat as (typeof IT_SHARP)[number]), italian: true }
  const enFlat = EN_FLAT_TO_SHARP[prefix]
  if (enFlat) return { index: EN_SHARP.indexOf(enFlat as (typeof EN_SHARP)[number]), italian: false }
  const itIdx = IT_SHARP.indexOf(prefix as (typeof IT_SHARP)[number])
  if (itIdx !== -1) return { index: itIdx, italian: true }
  const enIdx = EN_SHARP.indexOf(prefix as (typeof EN_SHARP)[number])
  if (enIdx !== -1) return { index: enIdx, italian: false }
  return null
}

function shiftPart(part: string, semitones: number): string {
  const m = NOTE_RE.exec(part)
  if (!m) return part
  const prefix = m[1] + m[2]
  const info = noteInfo(prefix)
  if (!info) return part
  const next = (((info.index + semitones) % 12) + 12) % 12
  const replacement = info.italian ? IT_SHARP[next] : EN_SHARP[next]
  return replacement + part.slice(prefix.length)
}

export function transposeChord(chord: string, semitones: number): string {
  if (semitones === 0) return chord
  const [main, bass] = chord.split('/')
  return bass === undefined
    ? shiftPart(main, semitones)
    : `${shiftPart(main, semitones)}/${shiftPart(bass, semitones)}`
}
