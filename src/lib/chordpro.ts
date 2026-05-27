export type Segment = { chord?: string; text: string }

export type ParsedLine =
  | { type: 'lyric'; segments: Segment[] }
  | { type: 'refrain-label'; text: string }
  | { type: 'blank' }

const CHORD_RE = /\[([^\]]+)\]/g
const REFRAIN_RE = /^\s*RIT\.?\s*$/i

export function hasChords(body: string): boolean {
  return /\[[^\]]+\]/.test(body)
}

function parseLyric(line: string): Segment[] {
  const segments: Segment[] = []
  let cursor = 0
  let chord: string | undefined = undefined
  let m: RegExpExecArray | null
  CHORD_RE.lastIndex = 0
  while ((m = CHORD_RE.exec(line)) !== null) {
    const text = line.slice(cursor, m.index)
    if (chord !== undefined || text.length > 0) {
      segments.push({ chord, text })
    }
    chord = m[1]
    cursor = m.index + m[0].length
  }
  const tail = line.slice(cursor)
  if (chord !== undefined || tail.length > 0) {
    segments.push({ chord, text: tail })
  }
  return segments
}

export function parseChordPro(body: string): ParsedLine[] {
  return body.split('\n').map((line) => {
    if (line.trim() === '') return { type: 'blank' }
    if (REFRAIN_RE.test(line)) return { type: 'refrain-label', text: 'RIT.' }
    return { type: 'lyric', segments: parseLyric(line) }
  })
}
