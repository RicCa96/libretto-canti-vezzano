// One-time chord-notation normalizer for src/data/songs/*.json bodies.
//
// Rules (applied inside [Chord] markers only — lyric text is untouched):
//   1. `+` is a redundant major marker → strip it.        Fa+7 → Fa7,  Si+ → Si
//   2. `-` is a minor marker → replace with lowercase m.  Do-  → Dom,  Mi-  → Mim
//   3. `/N` (N = digit, NOT a note) is "same chord then variant" shorthand → expand
//      into two stacked markers.                          [Sol/4]  → [Sol][Sol4]
//                                                         [Do7/4]  → [Do7][Do4]
//      Slash-with-note (bass note, e.g. Re/Fa#) is left alone.
//
// Run with: npx tsx scripts/normalize-chords.ts
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SONGS_DIR = 'src/data/songs'

// Note-name prefix used for the /N shorthand expansion. Italian first (longest match), then English.
const NOTE_PREFIX_RE = /^(Sol|Do|Re|Mi|Fa|La|Si|[A-G])([#b]?)/

function normalizeChord(inner: string): string {
  // 1+2: strip `+`, replace `-` with `m`. Both apply inside the chord token.
  let s = inner.replace(/\+/g, '').replace(/-/g, 'm')

  // 3: handle `/N` (digit) shorthand. Slash followed by a note letter is a bass slash,
  // leave it alone. Slash followed by a digit means "same chord, sus N" — expand.
  const slash = s.indexOf('/')
  if (slash !== -1 && /\d/.test(s[slash + 1] ?? '')) {
    const before = s.slice(0, slash)
    const after = s.slice(slash + 1)
    const m = NOTE_PREFIX_RE.exec(before)
    if (m) {
      const root = m[1] + m[2]
      // Result: `[before][root + after]`. The outer caller wraps each in `[]`.
      return `${before}][${root}${after}`
    }
  }
  return s
}

function normalizeBody(body: string): string {
  return body.replace(/\[([^\]]+)\]/g, (_full, inner: string) => `[${normalizeChord(inner)}]`)
}

const files = readdirSync(SONGS_DIR).filter((f) => f.endsWith('.json'))
let changed = 0
const diffs: string[] = []
for (const f of files) {
  const path = join(SONGS_DIR, f)
  const raw = readFileSync(path, 'utf-8')
  const song = JSON.parse(raw)
  if (typeof song.body !== 'string') continue
  const before = song.body
  const after = normalizeBody(before)
  if (after === before) continue
  song.body = after
  writeFileSync(path, JSON.stringify(song, null, 2) + '\n', 'utf-8')
  changed++
  // Collect a small per-file diff sample so the human can eyeball results.
  const beforeChords = [...before.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1])
  const afterChords = [...after.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1])
  const samples = new Set<string>()
  for (let i = 0, j = 0; i < beforeChords.length && j < afterChords.length; ) {
    if (beforeChords[i] === afterChords[j]) {
      i++
      j++
      continue
    }
    // Mismatch: either a single-rename (Mi- → Mim) or a /N expansion (Sol/4 → Sol + Sol4).
    if (beforeChords[i].includes('/') && /\d/.test(beforeChords[i].split('/')[1] ?? '')) {
      samples.add(`${beforeChords[i]} → ${afterChords[j]} ${afterChords[j + 1]}`)
      i++
      j += 2
    } else {
      samples.add(`${beforeChords[i]} → ${afterChords[j]}`)
      i++
      j++
    }
    if (samples.size >= 4) break
  }
  if (samples.size) diffs.push(`${f}: ${[...samples].join(', ')}`)
}

console.log(`Normalized ${changed}/${files.length} files.`)
for (const d of diffs) console.log(`  ${d}`)
