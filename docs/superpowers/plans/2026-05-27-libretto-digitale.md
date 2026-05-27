# Libretto Digitale dei Canti — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the blank React scaffold into a static song-book SPA — 183 bundled liturgical songs with an A–Z searchable index, per-song pages with toggleable/transposable chords and font-size control, plus a "Messa di oggi" section editable via a password-gated admin page backed by one Vercel serverless function.

**Architecture:** Static Vite + React 19 + TypeScript SPA on Vercel. Songs are bundled JSON (one file per song). Chord lyrics use ChordPro inline brackets (`[C]like [G]this`) parsed into structured lines and rendered chords-above-line. The only server-side piece is `api/today.ts` (GET reads today's set, password-gated POST writes it) backed by Upstash KV. Auth/DB code never enters the singer bundle; the `/admin` route is lazy-loaded.

**Tech Stack:** Vite 8, React 19, TypeScript, React Router 7, Vitest + React Testing Library + jsdom for tests, `@upstash/redis` + `@vercel/node` for the function.

**Conventions to respect:**
- `tsconfig.app.json` has `verbatimModuleSyntax: true` → type-only imports MUST use `import type { … }`.
- `allowImportingTsExtensions: true` → existing code imports with `.tsx`/`.ts` extensions; match that style in `src/`.
- `noUnusedLocals` / `noUnusedParameters` are on → no dangling vars.
- Run a single test file with `npx vitest run <path>`. Run all with `npm test`.

---

## File structure

| File | Responsibility |
|---|---|
| `src/lib/slugify.ts` | Title → URL slug (accent-stripping). |
| `src/lib/chordpro.ts` | `parseChordPro` + `hasChords`. ChordPro text → structured lines. |
| `src/lib/transpose.ts` | `transposeChord` — shift one chord by N semitones. |
| `src/lib/todaySchema.ts` | `TodaySet`/`Slot` types + `validateTodayPayload` (shared by function + admin). |
| `src/data/types.ts` | `Song` type. |
| `src/data/songs/<id>.json` | One song per file (`{id,title,body}`). |
| `src/data/songs/index.ts` | Glob-load songs → sorted array + `songById` Map. |
| `src/data/song-ids.json` | Flat array of valid song ids (generated; read by the function). |
| `scripts/import-docx.ts` | One-time docx → song JSON + song-ids.json generator. |
| `src/App.tsx` | Router + routes (replaces scaffold). |
| `src/components/Layout.tsx` | Shared shell (header/nav, `<Outlet/>`). |
| `src/components/SongBody.tsx` | Renders parsed ChordPro given `chordsOn` + `transpose`. |
| `src/hooks/useFontSize.ts` | Font-size step persisted in `localStorage`. |
| `src/pages/Landing.tsx` | Instructions + "La Messa di oggi" (fetches `/api/today`). |
| `src/pages/SongIndex.tsx` | A–Z list + search filter. |
| `src/pages/SongPage.tsx` | One song + chord/transpose/font controls. |
| `src/pages/Admin.tsx` | Password + slot picker → POST (lazy-loaded). |
| `src/styles/app.css` | App styling. |
| `src/test/setup.ts` | jest-dom matchers for Vitest. |
| `api/today.ts` | Vercel function: GET/POST today's set. |
| `vercel.json` | SPA rewrite so client routes resolve. |
| `vite.config.ts` | Add Vitest config block. |

---

## Task 1: Dependencies & test setup

**Files:**
- Modify: `package.json` (deps + scripts)
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Install runtime + dev dependencies**

```bash
npm install react-router-dom@^7 @upstash/redis
npm install -D vitest@^3 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vercel/node
```

- [ ] **Step 2: Add the test script**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

Replace the file with:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
```

- [ ] **Step 4: Create the test setup file**

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Add Vitest globals to TypeScript types**

In `tsconfig.app.json`, change the `"types"` array to:

```json
"types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"],
```

- [ ] **Step 6: Verify the toolchain runs**

Create a throwaway `src/test/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `npm test`
Expected: 1 passing test. Then delete `src/test/smoke.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.app.json src/test/setup.ts
git commit -m "chore: add router, upstash, and vitest test toolchain"
```

---

## Task 2: `slugify`

**Files:**
- Create: `src/lib/slugify.ts`
- Test: `src/lib/slugify.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/slugify.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { slugify } from './slugify.ts'

describe('slugify', () => {
  it('lowercases and hyphenates words', () => {
    expect(slugify('A TE VORREI DIRE')).toBe('a-te-vorrei-dire')
  })
  it('strips accents', () => {
    expect(slugify('ANDRÒ A VEDERLA UN DÌ')).toBe('andro-a-vederla-un-di')
  })
  it('drops parentheses and apostrophes', () => {
    expect(slugify('ALLELUIA (TAIZÉ)')).toBe('alleluia-taize')
    expect(slugify("LAUDATO SII, O MI' SIGNORE")).toBe('laudato-sii-o-mi-signore')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/slugify.test.ts`
Expected: FAIL — cannot find module `./slugify.ts`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/slugify.ts`:

```ts
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics → hyphen
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/slugify.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/slugify.ts src/lib/slugify.test.ts
git commit -m "feat: add slugify helper"
```

---

## Task 3: ChordPro parser

**Files:**
- Create: `src/lib/chordpro.ts`
- Test: `src/lib/chordpro.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/chordpro.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseChordPro, hasChords } from './chordpro.ts'

describe('hasChords', () => {
  it('is true when a chord bracket is present', () => {
    expect(hasChords('[C]Se il sole')).toBe(true)
  })
  it('is false for plain lyrics', () => {
    expect(hasChords('Se il sole non illuminasse')).toBe(false)
  })
})

describe('parseChordPro', () => {
  it('splits a lyric line into chord/text segments', () => {
    const lines = parseChordPro('[C]Se il sole non [G]illumi[Am]nasse più')
    expect(lines).toEqual([
      {
        type: 'lyric',
        segments: [
          { chord: 'C', text: 'Se il sole non ' },
          { chord: 'G', text: 'illumi' },
          { chord: 'Am', text: 'nasse più' },
        ],
      },
    ])
  })

  it('handles leading text before the first chord', () => {
    const lines = parseChordPro('Se il [C]sole')
    expect(lines[0]).toEqual({
      type: 'lyric',
      segments: [
        { text: 'Se il ' },
        { chord: 'C', text: 'sole' },
      ],
    })
  })

  it('marks RIT. lines as refrain labels', () => {
    const lines = parseChordPro('RIT.')
    expect(lines[0]).toEqual({ type: 'refrain-label', text: 'RIT.' })
  })

  it('marks blank lines', () => {
    const lines = parseChordPro('a\n\nb')
    expect(lines.map((l) => l.type)).toEqual(['lyric', 'blank', 'lyric'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/chordpro.test.ts`
Expected: FAIL — cannot find module `./chordpro.ts`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/chordpro.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/chordpro.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/chordpro.ts src/lib/chordpro.test.ts
git commit -m "feat: add ChordPro parser"
```

---

## Task 4: `transposeChord`

**Files:**
- Create: `src/lib/transpose.ts`
- Test: `src/lib/transpose.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/transpose.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { transposeChord } from './transpose.ts'

describe('transposeChord', () => {
  it('returns the chord unchanged for 0 semitones', () => {
    expect(transposeChord('C', 0)).toBe('C')
  })
  it('shifts a major chord up', () => {
    expect(transposeChord('C', 2)).toBe('D')
  })
  it('preserves the suffix on minor/seventh chords', () => {
    expect(transposeChord('Am', 2)).toBe('Bm')
    expect(transposeChord('C7', 1)).toBe('C#7')
  })
  it('normalizes flats and wraps at the octave', () => {
    expect(transposeChord('Bb', 1)).toBe('B')
    expect(transposeChord('B', 1)).toBe('C')
    expect(transposeChord('C', -1)).toBe('B')
    expect(transposeChord('C', 12)).toBe('C')
  })
  it('transposes both sides of a slash chord', () => {
    expect(transposeChord('D/F#', 2)).toBe('E/G#')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/transpose.test.ts`
Expected: FAIL — cannot find module `./transpose.ts`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/transpose.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/transpose.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/transpose.ts src/lib/transpose.test.ts
git commit -m "feat: add chord transpose helper"
```

---

## Task 5: Today's-set validator

**Files:**
- Create: `src/lib/todaySchema.ts`
- Test: `src/lib/todaySchema.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/todaySchema.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateTodayPayload } from './todaySchema.ts'

const valid = new Set(['ti-seguiro', 'eucaristia'])

describe('validateTodayPayload', () => {
  it('accepts well-formed slots with known song ids', () => {
    const result = validateTodayPayload(
      { slots: [{ label: 'Inizio', songId: 'ti-seguiro' }] },
      valid,
    )
    expect(result).toEqual({
      ok: true,
      value: { slots: [{ label: 'Inizio', songId: 'ti-seguiro' }] },
    })
  })

  it('rejects a non-object payload', () => {
    expect(validateTodayPayload(null, valid).ok).toBe(false)
    expect(validateTodayPayload({ slots: 'nope' }, valid).ok).toBe(false)
  })

  it('rejects a slot with an unknown song id', () => {
    const result = validateTodayPayload(
      { slots: [{ label: 'Inizio', songId: 'does-not-exist' }] },
      valid,
    )
    expect(result.ok).toBe(false)
  })

  it('rejects a slot missing label or songId', () => {
    expect(
      validateTodayPayload({ slots: [{ songId: 'eucaristia' }] }, valid).ok,
    ).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/todaySchema.test.ts`
Expected: FAIL — cannot find module `./todaySchema.ts`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/todaySchema.ts`:

```ts
export type Slot = { label: string; songId: string }
export type TodaySet = { updatedAt: string; slots: Slot[] }

export type ValidationResult =
  | { ok: true; value: { slots: Slot[] } }
  | { ok: false; error: string }

export function validateTodayPayload(
  payload: unknown,
  validIds: Set<string>,
): ValidationResult {
  if (typeof payload !== 'object' || payload === null) {
    return { ok: false, error: 'payload must be an object' }
  }
  const slots = (payload as { slots?: unknown }).slots
  if (!Array.isArray(slots)) {
    return { ok: false, error: 'slots must be an array' }
  }
  const clean: Slot[] = []
  for (const slot of slots) {
    if (typeof slot !== 'object' || slot === null) {
      return { ok: false, error: 'each slot must be an object' }
    }
    const { label, songId } = slot as { label?: unknown; songId?: unknown }
    if (typeof label !== 'string' || label.trim() === '') {
      return { ok: false, error: 'slot.label must be a non-empty string' }
    }
    if (typeof songId !== 'string' || !validIds.has(songId)) {
      return { ok: false, error: `unknown songId: ${String(songId)}` }
    }
    clean.push({ label, songId })
  }
  return { ok: true, value: { slots: clean } }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/todaySchema.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/todaySchema.ts src/lib/todaySchema.test.ts
git commit -m "feat: add today-set payload validator"
```

---

## Task 6: Song type + data index + sample songs

**Files:**
- Create: `src/data/types.ts`
- Create: `src/data/songs/ti-seguiro.json`
- Create: `src/data/songs/eucaristia.json`
- Create: `src/data/songs/index.ts`
- Test: `src/data/songs/index.test.ts`

- [ ] **Step 1: Create the Song type**

Create `src/data/types.ts`:

```ts
export type Song = {
  id: string
  title: string
  body: string
}
```

- [ ] **Step 2: Create two sample songs**

Create `src/data/songs/ti-seguiro.json`:

```json
{
  "id": "ti-seguiro",
  "title": "TI SEGUIRÒ",
  "body": "RIT.\nTi seguirò, ti seguirò o Signore\ne nella tua strada camminerò.\n\nTi seguirò nella via dell'amore\ne donerò al mondo la vita."
}
```

Create `src/data/songs/eucaristia.json`:

```json
{
  "id": "eucaristia",
  "title": "EUCARISTIA",
  "body": "Grazie, Signore, per il pane,\ngrazie per il vino offerto a noi."
}
```

- [ ] **Step 3: Write the failing test**

Create `src/data/songs/index.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { songs, songById } from './index.ts'

describe('song index', () => {
  it('loads bundled songs', () => {
    expect(songs.length).toBeGreaterThanOrEqual(2)
  })
  it('sorts songs by title (Italian locale)', () => {
    const titles = songs.map((s) => s.title)
    const sorted = [...titles].sort((a, b) => a.localeCompare(b, 'it'))
    expect(titles).toEqual(sorted)
  })
  it('looks a song up by id', () => {
    expect(songById.get('eucaristia')?.title).toBe('EUCARISTIA')
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/data/songs/index.test.ts`
Expected: FAIL — cannot find module `./index.ts`.

- [ ] **Step 5: Write the index**

Create `src/data/songs/index.ts`:

```ts
import type { Song } from '../types.ts'

const modules = import.meta.glob<{ default: Song }>('./*.json', {
  eager: true,
})

export const songs: Song[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.title.localeCompare(b.title, 'it'))

export const songById: Map<string, Song> = new Map(
  songs.map((s) => [s.id, s]),
)
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/data/songs/index.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add src/data/types.ts src/data/songs/
git commit -m "feat: add Song type and bundled song index"
```

---

## Task 7: docx → songs import script

**Files:**
- Create: `scripts/import-docx.ts`
- Generates: `src/data/songs/<id>.json` ×183, `src/data/song-ids.json`

This script is run once (and re-runnable). It is verified by spot-check, not by CI.

- [ ] **Step 1: Write the import script**

Create `scripts/import-docx.ts`:

```ts
// One-time importer: docs/libretto.docx -> src/data/songs/*.json + song-ids.json
// Run with: npx tsx scripts/import-docx.ts
import { execSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { slugify } from '../src/lib/slugify.ts'

const DOCX = 'docs/libretto.docx'
const OUT_DIR = 'src/data/songs'

// 1. Unzip document.xml from the .docx
const tmp = mkdtempSync(join(tmpdir(), 'libretto-'))
execSync(`unzip -o -q "${DOCX}" word/document.xml -d "${tmp}"`)
const xml = readFileSync(join(tmp, 'word/document.xml'), 'utf-8')

// 2. Walk paragraphs; capture style + concatenated run text
type Para = { style: string; text: string }
const paras: Para[] = []
const paraRe = /<w:p[ >][\s\S]*?<\/w:p>/g
for (const p of xml.match(paraRe) ?? []) {
  const style = /<w:pStyle w:val="([^"]+)"/.exec(p)?.[1] ?? ''
  const text = (p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? [])
    .map((t) => t.replace(/<[^>]+>/g, '')) // keep only run text, drop any stray tags
    .join('')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
  paras.push({ style, text })
}

// 3. Split into songs on Heading1; skip landing + index (everything before the
//    first Heading1 that is followed by a "TORNA ALL'INDICE" back-link paragraph).
type Song = { id: string; title: string; body: string }
const songs: Song[] = []
let current: Song | null = null
let expectBacklink = false

for (let i = 0; i < paras.length; i++) {
  const { style, text } = paras[i]
  if (style === 'Heading1') {
    const next = paras[i + 1]
    const isSong = next && /TORNA ALL/i.test(next.text)
    if (isSong) {
      if (current) songs.push(current)
      current = { id: slugify(text), title: text, body: '' }
      expectBacklink = true
      continue
    }
    // Heading1 that is NOT a song (e.g. "INDICE DEI CANTI") ends any current song
    if (current) {
      songs.push(current)
      current = null
    }
    continue
  }
  if (!current) continue
  if (expectBacklink && /TORNA ALL/i.test(text)) {
    expectBacklink = false
    continue // drop the back-link paragraph; the app regenerates it
  }
  // Skip index-style heading rows that may leak between songs
  if (style.startsWith('Heading')) continue
  if (text === '') {
    current.body += '\n'
  } else if (/^RIT\.?\b/i.test(text)) {
    // Emit a standalone RIT. label line, then the refrain's first line
    const rest = text.replace(/^RIT\.?\s*/i, '')
    current.body += 'RIT.\n'
    if (rest) current.body += rest + '\n'
  } else {
    current.body += text + '\n'
  }
}
if (current) songs.push(current)

// 4. Write files
mkdirSync(OUT_DIR, { recursive: true })
for (const song of songs) {
  song.body = song.body.replace(/\n{3,}/g, '\n\n').trim()
  writeFileSync(
    join(OUT_DIR, `${song.id}.json`),
    JSON.stringify(song, null, 2) + '\n',
  )
}
writeFileSync(
  'src/data/song-ids.json',
  JSON.stringify(songs.map((s) => s.id).sort(), null, 2) + '\n',
)
console.log(`Wrote ${songs.length} songs to ${OUT_DIR}`)
```

- [ ] **Step 2: Run the importer**

Run: `npx tsx scripts/import-docx.ts`
Expected: `Wrote 183 songs to src/data/songs` (the count should be ~183; a small variance is acceptable if the docx has stray headings).

> If `tsx` is not installed, run `npx --yes tsx scripts/import-docx.ts`.

- [ ] **Step 3: Spot-check the output**

Open three generated files and confirm encoding, accents, and refrains look right:

```bash
cat src/data/songs/a-te-vorrei-dire.json
cat src/data/songs/ti-seguiro.json
cat src/data/songs/eucaristia.json
```

Confirm: accented characters intact (à, è, ò), `RIT.` appears on its own line before refrain text, no `<w:...>` tag fragments remain, and `src/data/song-ids.json` lists the ids. The two hand-written samples (`ti-seguiro`, `eucaristia`) may be overwritten by real docx content — that is fine.

- [ ] **Step 4: Confirm the data index still loads**

Run: `npx vitest run src/data/songs/index.test.ts`
Expected: PASS — `songs.length` now ≥ 180.

- [ ] **Step 5: Commit**

```bash
git add scripts/import-docx.ts src/data/songs/ src/data/song-ids.json
git commit -m "feat: import 183 songs from libretto.docx"
```

---

## Task 8: App shell — router, layout, base CSS

**Files:**
- Create: `src/styles/app.css`
- Create: `src/components/Layout.tsx`
- Modify: `src/App.tsx` (replace scaffold entirely)
- Modify: `src/main.tsx` (drop the old `App.css` import path if present — keep as is; it imports `index.css`)
- Delete: `src/App.css` (scaffold styles no longer used)
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/App.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout.tsx'

describe('Layout', () => {
  it('renders the app title and an outlet child', () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<p>child page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Libretto dei Canti')).toBeInTheDocument()
    expect(screen.getByText('child page')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — cannot find module `./components/Layout.tsx`.

- [ ] **Step 3: Create the base CSS**

Create `src/styles/app.css`:

```css
:root {
  --fs-lyric: 1.1rem;
  --maxw: 44rem;
  --accent: #c0392b;
  --ink: #1a1a1a;
  --muted: #666;
  --bg: #fbfaf7;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  color: var(--ink);
  background: var(--bg);
  line-height: 1.5;
}

.app-header {
  border-bottom: 1px solid #e4e0d8;
  padding: 0.75rem 1rem;
}
.app-header a { color: inherit; text-decoration: none; }
.app-header h1 { font-size: 1.1rem; margin: 0; }
.app-header nav { display: flex; gap: 1rem; margin-top: 0.25rem; font-size: 0.9rem; }
.app-header nav a { color: var(--muted); }

main { max-width: var(--maxw); margin: 0 auto; padding: 1rem; }

a { color: var(--accent); }
```

- [ ] **Step 4: Create the Layout**

Create `src/components/Layout.tsx`:

```tsx
import { Link, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <>
      <header className="app-header">
        <Link to="/">
          <h1>Libretto dei Canti</h1>
        </Link>
        <nav>
          <Link to="/">Messa di oggi</Link>
          <Link to="/canti">Indice</Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  )
}
```

- [ ] **Step 5: Replace `src/App.tsx`**

Replace the entire file with:

```tsx
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout.tsx'
import { Landing } from './pages/Landing.tsx'
import { SongIndex } from './pages/SongIndex.tsx'
import { SongPage } from './pages/SongPage.tsx'
import './styles/app.css'

const Admin = lazy(() =>
  import('./pages/Admin.tsx').then((m) => ({ default: m.Admin })),
)

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="canti" element={<SongIndex />} />
          <Route path="canti/:id" element={<SongPage />} />
          <Route
            path="admin"
            element={
              <Suspense fallback={<p>Caricamento…</p>}>
                <Admin />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

> Note: `Landing`, `SongIndex`, `SongPage`, and `Admin` are created in later tasks. The app will not compile until Tasks 11–15 are done; `src/App.test.tsx` only imports `Layout`, so it passes now. Run the full app (`npm run dev`) after Task 15.

- [ ] **Step 6: Delete the unused scaffold CSS**

```bash
git rm src/App.css
```

- [ ] **Step 7: Run the Layout test to verify it passes**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/components/Layout.tsx src/styles/app.css src/App.test.tsx
git commit -m "feat: add router, layout shell, and base styles"
```

---

## Task 9: `SongBody` component

**Files:**
- Create: `src/components/SongBody.tsx`
- Create: `src/components/SongBody.css`
- Test: `src/components/SongBody.test.tsx`

Renders parsed ChordPro. When `chordsOn` is true, each lyric segment shows its (optionally transposed) chord above the text. Refrain labels get an accent.

- [ ] **Step 1: Write the failing test**

Create `src/components/SongBody.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SongBody } from './SongBody.tsx'

const body = 'RIT.\n[C]Se il sole non [G]illumi[Am]nasse più'

describe('SongBody', () => {
  it('shows lyrics but hides chords when chordsOn is false', () => {
    render(<SongBody body={body} chordsOn={false} transpose={0} />)
    expect(screen.getByText(/Se il sole non/)).toBeInTheDocument()
    expect(screen.queryByText('C')).not.toBeInTheDocument()
  })

  it('shows chords when chordsOn is true', () => {
    render(<SongBody body={body} chordsOn={true} transpose={0} />)
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('Am')).toBeInTheDocument()
  })

  it('applies transposition to displayed chords', () => {
    render(<SongBody body={body} chordsOn={true} transpose={2} />)
    expect(screen.getByText('D')).toBeInTheDocument() // C + 2
    expect(screen.getByText('Bm')).toBeInTheDocument() // Am + 2
  })

  it('renders RIT. as a refrain label', () => {
    render(<SongBody body={body} chordsOn={false} transpose={0} />)
    expect(screen.getByText('RIT.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/SongBody.test.tsx`
Expected: FAIL — cannot find module `./SongBody.tsx`.

- [ ] **Step 3: Create the component CSS**

Create `src/components/SongBody.css`:

```css
.song-body {
  font-size: var(--fs-lyric);
  white-space: normal;
}
.song-line { margin: 0.15rem 0; }
.song-line--refrain { font-weight: 700; color: var(--muted); margin-top: 0.6rem; }
.song-line--blank { height: 0.6rem; }

.seg {
  display: inline-flex;
  flex-direction: column;
  vertical-align: bottom;
}
.seg__chord {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 700;
  color: var(--accent);
  font-size: 0.8em;
  line-height: 1;
  min-height: 1em;
  white-space: pre;
}
.seg__text { white-space: pre; }
```

- [ ] **Step 4: Create the component**

Create `src/components/SongBody.tsx`:

```tsx
import { parseChordPro } from '../lib/chordpro.ts'
import { transposeChord } from '../lib/transpose.ts'
import './SongBody.css'

type Props = {
  body: string
  chordsOn: boolean
  transpose: number
}

export function SongBody({ body, chordsOn, transpose }: Props) {
  const lines = parseChordPro(body)
  return (
    <div className="song-body">
      {lines.map((line, i) => {
        if (line.type === 'blank') {
          return <div key={i} className="song-line song-line--blank" />
        }
        if (line.type === 'refrain-label') {
          return (
            <div key={i} className="song-line song-line--refrain">
              {line.text}
            </div>
          )
        }
        return (
          <div key={i} className="song-line">
            {line.segments.map((seg, j) => (
              <span key={j} className="seg">
                {chordsOn && (
                  <span className="seg__chord">
                    {seg.chord ? transposeChord(seg.chord, transpose) : ''}
                  </span>
                )}
                <span className="seg__text">{seg.text}</span>
              </span>
            ))}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/SongBody.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/SongBody.tsx src/components/SongBody.css src/components/SongBody.test.tsx
git commit -m "feat: add SongBody renderer with chord toggle and transpose"
```

---

## Task 10: `useFontSize` hook

**Files:**
- Create: `src/hooks/useFontSize.ts`
- Test: `src/hooks/useFontSize.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useFontSize.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFontSize, FONT_SIZES } from './useFontSize.ts'

describe('useFontSize', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to "md"', () => {
    const { result } = renderHook(() => useFontSize())
    expect(result.current.size).toBe('md')
  })

  it('persists the chosen size to localStorage', () => {
    const { result } = renderHook(() => useFontSize())
    act(() => result.current.setSize('lg'))
    expect(result.current.size).toBe('lg')
    expect(localStorage.getItem('libretto-font-size')).toBe('lg')
  })

  it('reads an existing value from localStorage', () => {
    localStorage.setItem('libretto-font-size', 'xl')
    const { result } = renderHook(() => useFontSize())
    expect(result.current.size).toBe('xl')
  })

  it('exposes the available sizes in order', () => {
    expect(FONT_SIZES).toEqual(['sm', 'md', 'lg', 'xl'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useFontSize.test.ts`
Expected: FAIL — cannot find module `./useFontSize.ts`.

- [ ] **Step 3: Write the hook**

Create `src/hooks/useFontSize.ts`:

```ts
import { useState, useCallback } from 'react'

export const FONT_SIZES = ['sm', 'md', 'lg', 'xl'] as const
export type FontSize = (typeof FONT_SIZES)[number]

const KEY = 'libretto-font-size'

export const FONT_REM: Record<FontSize, string> = {
  sm: '0.95rem',
  md: '1.1rem',
  lg: '1.35rem',
  xl: '1.6rem',
}

function read(): FontSize {
  const stored = localStorage.getItem(KEY)
  return FONT_SIZES.includes(stored as FontSize) ? (stored as FontSize) : 'md'
}

export function useFontSize() {
  const [size, setSizeState] = useState<FontSize>(read)
  const setSize = useCallback((next: FontSize) => {
    localStorage.setItem(KEY, next)
    setSizeState(next)
  }, [])
  return { size, setSize }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useFontSize.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useFontSize.ts src/hooks/useFontSize.test.ts
git commit -m "feat: add persisted font-size hook"
```

---

## Task 11: Song page

**Files:**
- Create: `src/pages/SongPage.tsx`
- Create: `src/pages/SongPage.css`
- Test: `src/pages/SongPage.test.tsx`

Composes `SongBody` with chord toggle (only when the song has chords), transpose ±, and font-size buttons. Looks the song up from the route param.

- [ ] **Step 1: Write the failing test**

Create `src/pages/SongPage.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { SongPage } from './SongPage.tsx'

function renderSong(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/canti/${id}`]}>
      <Routes>
        <Route path="/canti/:id" element={<SongPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SongPage', () => {
  beforeEach(() => localStorage.clear())

  it('shows the song title and a back link', () => {
    renderSong('eucaristia')
    expect(
      screen.getByRole('heading', { name: 'EUCARISTIA' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /indice/i })).toBeInTheDocument()
  })

  it('shows a not-found message for an unknown id', () => {
    renderSong('nope-not-real')
    expect(screen.getByText(/non trovato/i)).toBeInTheDocument()
  })

  it('hides the chord toggle when the song has no chords', () => {
    renderSong('eucaristia') // sample has no [chords]
    expect(
      screen.queryByRole('button', { name: /accordi/i }),
    ).not.toBeInTheDocument()
  })
})
```

> This test relies on the sample `eucaristia.json` (no chords). If the docx import overwrote it with a chorded version, point the test at any known chord-free song id, or keep `eucaristia` chord-free.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/SongPage.test.tsx`
Expected: FAIL — cannot find module `./SongPage.tsx`.

- [ ] **Step 3: Create the page CSS**

Create `src/pages/SongPage.css`:

```css
.song-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin: 0.75rem 0 1rem;
  font-size: 0.9rem;
}
.song-controls button {
  border: 1px solid #d6d1c7;
  background: #fff;
  border-radius: 0.4rem;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
}
.song-controls button[aria-pressed='true'] { background: var(--accent); color: #fff; border-color: var(--accent); }
.song-controls .group { display: inline-flex; gap: 0.25rem; align-items: center; }
.song-controls .group span { color: var(--muted); }
.song-back { display: inline-block; margin-bottom: 0.5rem; }
.song-title { margin: 0.2rem 0 0; }
```

- [ ] **Step 4: Create the page**

Create `src/pages/SongPage.tsx`:

```tsx
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { songById } from '../data/songs/index.ts'
import { hasChords } from '../lib/chordpro.ts'
import { SongBody } from '../components/SongBody.tsx'
import { useFontSize, FONT_SIZES, FONT_REM } from '../hooks/useFontSize.ts'
import './SongPage.css'

export function SongPage() {
  const { id } = useParams()
  const song = id ? songById.get(id) : undefined
  const [chordsOn, setChordsOn] = useState(false)
  const [transpose, setTranspose] = useState(0)
  const { size, setSize } = useFontSize()

  if (!song) {
    return (
      <>
        <Link className="song-back" to="/canti">
          ← Torna all'indice dei canti
        </Link>
        <p>Canto non trovato.</p>
      </>
    )
  }

  const chorded = hasChords(song.body)

  return (
    <div style={{ ['--fs-lyric' as string]: FONT_REM[size] }}>
      <Link className="song-back" to="/canti">
        ← Torna all'indice dei canti
      </Link>
      <h2 className="song-title">{song.title}</h2>

      <div className="song-controls">
        {chorded && (
          <button
            type="button"
            aria-pressed={chordsOn}
            onClick={() => setChordsOn((v) => !v)}
          >
            Accordi {chordsOn ? 'on' : 'off'}
          </button>
        )}
        {chorded && chordsOn && (
          <span className="group">
            <span>Tono</span>
            <button type="button" aria-label="Abbassa tono" onClick={() => setTranspose((t) => t - 1)}>
              −
            </button>
            <button type="button" aria-label="Alza tono" onClick={() => setTranspose((t) => t + 1)}>
              +
            </button>
          </span>
        )}
        <span className="group">
          <span>Testo</span>
          {FONT_SIZES.map((fs) => (
            <button
              key={fs}
              type="button"
              aria-pressed={size === fs}
              aria-label={`Dimensione testo ${fs}`}
              onClick={() => setSize(fs)}
            >
              {fs.toUpperCase()}
            </button>
          ))}
        </span>
      </div>

      <SongBody body={song.body} chordsOn={chordsOn} transpose={transpose} />
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/pages/SongPage.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/pages/SongPage.tsx src/pages/SongPage.css src/pages/SongPage.test.tsx
git commit -m "feat: add song page with chord, transpose, and font controls"
```

---

## Task 12: Song index page with search

**Files:**
- Create: `src/pages/SongIndex.tsx`
- Create: `src/pages/SongIndex.css`
- Test: `src/pages/SongIndex.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/SongIndex.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SongIndex } from './SongIndex.tsx'

function renderIndex() {
  return render(
    <MemoryRouter>
      <SongIndex />
    </MemoryRouter>,
  )
}

describe('SongIndex', () => {
  it('lists songs as links', () => {
    renderIndex()
    expect(screen.getByRole('link', { name: 'EUCARISTIA' })).toBeInTheDocument()
  })

  it('filters the list as the user types', async () => {
    const user = userEvent.setup()
    renderIndex()
    await user.type(screen.getByRole('searchbox'), 'eucar')
    expect(screen.getByRole('link', { name: 'EUCARISTIA' })).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'TI SEGUIRÒ' }),
    ).not.toBeInTheDocument()
  })

  it('shows a message when nothing matches', async () => {
    const user = userEvent.setup()
    renderIndex()
    await user.type(screen.getByRole('searchbox'), 'zzzzz-nope')
    expect(screen.getByText(/nessun canto/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/SongIndex.test.tsx`
Expected: FAIL — cannot find module `./SongIndex.tsx`.

- [ ] **Step 3: Create the page CSS**

Create `src/pages/SongIndex.css`:

```css
.index-search {
  width: 100%;
  padding: 0.6rem 0.8rem;
  font-size: 1rem;
  border: 1px solid #d6d1c7;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}
.index-group-letter {
  margin: 1rem 0 0.3rem;
  color: var(--accent);
  border-bottom: 1px solid #eee;
}
.index-list { list-style: none; padding: 0; margin: 0; }
.index-list li { padding: 0.35rem 0; border-bottom: 1px solid #f0ede6; }
.index-list a { text-decoration: none; }
```

- [ ] **Step 4: Create the page**

Create `src/pages/SongIndex.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { songs } from '../data/songs/index.ts'
import './SongIndex.css'

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function SongIndex() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    if (q === '') return songs
    return songs.filter((s) => normalize(s.title).includes(q))
  }, [query])

  const groups = useMemo(() => {
    const map = new Map<string, typeof songs>()
    for (const song of filtered) {
      const letter = song.title[0]?.toUpperCase() ?? '#'
      const list = map.get(letter) ?? []
      list.push(song)
      map.set(letter, list)
    }
    return [...map.entries()]
  }, [filtered])

  return (
    <>
      <input
        type="search"
        className="index-search"
        placeholder="Cerca un canto…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Cerca un canto"
      />
      {filtered.length === 0 ? (
        <p>Nessun canto trovato.</p>
      ) : (
        groups.map(([letter, list]) => (
          <section key={letter}>
            <h3 className="index-group-letter">{letter}</h3>
            <ul className="index-list">
              {list.map((song) => (
                <li key={song.id}>
                  <Link to={`/canti/${song.id}`}>{song.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/pages/SongIndex.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/pages/SongIndex.tsx src/pages/SongIndex.css src/pages/SongIndex.test.tsx
git commit -m "feat: add searchable A-Z song index"
```

---

## Task 13: Landing page + "Messa di oggi"

**Files:**
- Create: `src/pages/Landing.tsx`
- Create: `src/pages/Landing.css`
- Test: `src/pages/Landing.test.tsx`

Fetches `/api/today`, renders each slot as a link to its song. Handles loading, empty, and error states.

- [ ] **Step 1: Write the failing test**

Create `src/pages/Landing.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Landing } from './Landing.tsx'

function mockFetchOnce(data: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => data,
    }),
  )
}

describe('Landing', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('renders the instructions section', () => {
    mockFetchOnce({ updatedAt: '', slots: [] })
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Come uso il libretto/i)).toBeInTheDocument()
  })

  it("renders today's slots as song links", async () => {
    mockFetchOnce({
      updatedAt: '2026-05-27T08:00:00Z',
      slots: [{ label: 'Inizio', songId: 'eucaristia' }],
    })
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    await waitFor(() =>
      expect(screen.getByText('Inizio')).toBeInTheDocument(),
    )
    expect(screen.getByRole('link', { name: 'EUCARISTIA' })).toHaveAttribute(
      'href',
      '/canti/eucaristia',
    )
  })

  it('shows a fallback when there are no songs set', async () => {
    mockFetchOnce({ updatedAt: '', slots: [] })
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    await waitFor(() =>
      expect(
        screen.getByText(/nessun canto.*oggi/i),
      ).toBeInTheDocument(),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/Landing.test.tsx`
Expected: FAIL — cannot find module `./Landing.tsx`.

- [ ] **Step 3: Create the page CSS**

Create `src/pages/Landing.css`:

```css
.intro { background: #fff; border: 1px solid #eee; border-radius: 0.6rem; padding: 1rem; }
.intro h2 { margin-top: 0; }
.today h2 { color: var(--accent); }
.today-list { list-style: none; padding: 0; margin: 0; }
.today-list li { padding: 0.5rem 0; border-bottom: 1px solid #f0ede6; }
.today-list .slot-label { display: block; font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.03em; }
.today-list a { font-size: 1.1rem; text-decoration: none; }
.today-updated { color: var(--muted); font-size: 0.8rem; }
```

- [ ] **Step 4: Create the page**

Create `src/pages/Landing.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { songById } from '../data/songs/index.ts'
import type { TodaySet } from '../lib/todaySchema.ts'
import './Landing.css'

export function Landing() {
  const [today, setToday] = useState<TodaySet | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/today')
      .then((r) => {
        if (!r.ok) throw new Error('bad response')
        return r.json()
      })
      .then((data: TodaySet) => {
        if (active) setToday(data)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <>
      <section className="intro">
        <h2>Come uso il libretto?</h2>
        <p>
          Il nostro libretto digitale è un libretto intelligente! Per andare al
          testo di un canto, trovane il titolo nell'indice dei canti o nella
          sezione "La Messa di oggi" e toccalo: verrai portato subito al testo.
        </p>
        <p>
          Sotto al titolo di ogni canto trovi il link "← Torna all'indice dei
          canti" per tornare indietro. Buon canto!
        </p>
      </section>

      <section className="today">
        <h2>La Messa di oggi</h2>
        {error && <p>Impossibile caricare i canti di oggi. Riprova più tardi.</p>}
        {!error && today === null && <p>Caricamento…</p>}
        {!error && today !== null && today.slots.length === 0 && (
          <p>Nessun canto impostato per oggi.</p>
        )}
        {!error && today !== null && today.slots.length > 0 && (
          <>
            <ul className="today-list">
              {today.slots.map((slot, i) => {
                const song = songById.get(slot.songId)
                return (
                  <li key={i}>
                    <span className="slot-label">{slot.label}</span>
                    {song ? (
                      <Link to={`/canti/${song.id}`}>{song.title}</Link>
                    ) : (
                      <span>{slot.songId}</span>
                    )}
                  </li>
                )
              })}
            </ul>
            {today.updatedAt && (
              <p className="today-updated">
                Aggiornato: {new Date(today.updatedAt).toLocaleString('it-IT')}
              </p>
            )}
          </>
        )}
      </section>
    </>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/pages/Landing.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/pages/Landing.tsx src/pages/Landing.css src/pages/Landing.test.tsx
git commit -m "feat: add landing page with Messa di oggi"
```

---

## Task 14: `api/today` serverless function

**Files:**
- Create: `api/today.ts`
- Test: `api/today.test.ts`

GET reads the `today` record; POST validates the password and payload, then writes. Uses the validator from Task 5 and the id allowlist from Task 7.

- [ ] **Step 1: Write the failing test**

Create `api/today.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Upstash so no network is needed
const store = new Map<string, unknown>()
vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: () => ({
      get: async (k: string) => store.get(k) ?? null,
      set: async (k: string, v: unknown) => {
        store.set(k, v)
      },
    }),
  },
}))

import handler from './today.ts'

type ResLike = {
  statusCode: number
  body: unknown
  headers: Record<string, string>
  status: (c: number) => ResLike
  json: (b: unknown) => ResLike
  setHeader: (k: string, v: string) => void
}

function makeRes(): ResLike {
  const res: ResLike = {
    statusCode: 0,
    body: undefined,
    headers: {},
    status(c) {
      this.statusCode = c
      return this
    },
    json(b) {
      this.body = b
      return this
    },
    setHeader(k, v) {
      this.headers[k] = v
    },
  }
  return res
}

beforeEach(() => {
  store.clear()
  process.env.ADMIN_PASSWORD = 'secret'
})

describe('api/today', () => {
  it('GET returns an empty set initially', async () => {
    const res = makeRes()
    await handler({ method: 'GET', headers: {} } as never, res as never)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ updatedAt: '', slots: [] })
  })

  it('POST rejects a wrong password with 401', async () => {
    const res = makeRes()
    await handler(
      {
        method: 'POST',
        headers: { 'x-admin-password': 'wrong' },
        body: { slots: [] },
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(401)
  })

  it('POST rejects an unknown song id with 400', async () => {
    const res = makeRes()
    await handler(
      {
        method: 'POST',
        headers: { 'x-admin-password': 'secret' },
        body: { slots: [{ label: 'Inizio', songId: 'definitely-not-real' }] },
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/today.test.ts`
Expected: FAIL — cannot find module `./today.ts`.

- [ ] **Step 3: Write the function**

Create `api/today.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import songIds from '../src/data/song-ids.json'
import { validateTodayPayload, type TodaySet } from '../src/lib/todaySchema.ts'

const redis = Redis.fromEnv()
const KEY = 'today'
const VALID_IDS = new Set<string>(songIds as string[])
const EMPTY: TodaySet = { updatedAt: '', slots: [] }

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method === 'GET') {
    const data = (await redis.get<TodaySet>(KEY)) ?? EMPTY
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'unauthorized' })
    }
    const result = validateTodayPayload(req.body, VALID_IDS)
    if (!result.ok) {
      return res.status(400).json({ error: result.error })
    }
    const value: TodaySet = {
      updatedAt: new Date().toISOString(),
      slots: result.value.slots,
    }
    await redis.set(KEY, value)
    return res.status(200).json(value)
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'method not allowed' })
}
```

> The function imports `song-ids.json` (generated in Task 7) and the validator from `src/lib`. Vercel bundles these into the function automatically. `resolveJsonModule` is on by default in Vite's tsconfig; if a type error appears on the JSON import, add `"resolveJsonModule": true` to `tsconfig.app.json`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/today.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add api/today.ts api/today.test.ts
git commit -m "feat: add password-gated today serverless function"
```

---

## Task 15: Admin page

**Files:**
- Create: `src/pages/Admin.tsx`
- Create: `src/pages/Admin.css`
- Test: `src/pages/Admin.test.tsx`

Password field (memory only) + editable slot list (label text + song dropdown, add/remove) → POSTs to `/api/today` with the `x-admin-password` header.

- [ ] **Step 1: Write the failing test**

Create `src/pages/Admin.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Admin } from './Admin.tsx'

describe('Admin', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('saves slots with the password header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ updatedAt: 'now', slots: [] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<Admin />)

    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /aggiungi/i }))
    await user.click(screen.getByRole('button', { name: /salva/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [, options] = fetchMock.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(options.headers['x-admin-password']).toBe('secret')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/Admin.test.tsx`
Expected: FAIL — cannot find module `./Admin.tsx`.

- [ ] **Step 3: Create the page CSS**

Create `src/pages/Admin.css`:

```css
.admin label { display: block; margin: 0.5rem 0 0.2rem; font-size: 0.9rem; color: var(--muted); }
.admin input,
.admin select { padding: 0.4rem; font-size: 1rem; border: 1px solid #d6d1c7; border-radius: 0.4rem; }
.admin .slot-row { display: flex; gap: 0.5rem; align-items: end; margin: 0.4rem 0; }
.admin .slot-row select { flex: 1; }
.admin button { cursor: pointer; padding: 0.4rem 0.8rem; border-radius: 0.4rem; border: 1px solid #d6d1c7; background: #fff; }
.admin .save { background: var(--accent); color: #fff; border-color: var(--accent); margin-top: 1rem; }
.admin .status { margin-top: 0.75rem; font-size: 0.9rem; }
```

- [ ] **Step 4: Create the page**

Create `src/pages/Admin.tsx`:

```tsx
import { useState } from 'react'
import { songs } from '../data/songs/index.ts'
import type { Slot } from '../lib/todaySchema.ts'
import './Admin.css'

const DEFAULT_LABELS = ['Inizio', 'Offertorio', 'Comunione', 'Fine']

export function Admin() {
  const [password, setPassword] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [status, setStatus] = useState('')

  const addSlot = () => {
    const label = DEFAULT_LABELS[slots.length] ?? 'Canto'
    setSlots((s) => [...s, { label, songId: songs[0]?.id ?? '' }])
  }
  const updateSlot = (i: number, patch: Partial<Slot>) => {
    setSlots((s) => s.map((slot, j) => (j === i ? { ...slot, ...patch } : slot)))
  }
  const removeSlot = (i: number) => {
    setSlots((s) => s.filter((_, j) => j !== i))
  }

  const save = async () => {
    setStatus('Salvataggio…')
    try {
      const res = await fetch('/api/today', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ slots }),
      })
      if (res.status === 401) {
        setStatus('Password errata.')
        return
      }
      if (!res.ok) {
        setStatus('Errore nel salvataggio.')
        return
      }
      const data = await res.json()
      setStatus(`Salvato alle ${new Date(data.updatedAt).toLocaleString('it-IT')}.`)
    } catch {
      setStatus('Errore di rete.')
    }
  }

  return (
    <div className="admin">
      <h2>Imposta la Messa di oggi</h2>

      <label htmlFor="admin-pw">Password</label>
      <input
        id="admin-pw"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {slots.map((slot, i) => (
        <div className="slot-row" key={i}>
          <div>
            <label htmlFor={`label-${i}`}>Momento</label>
            <input
              id={`label-${i}`}
              value={slot.label}
              onChange={(e) => updateSlot(i, { label: e.target.value })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor={`song-${i}`}>Canto</label>
            <select
              id={`song-${i}`}
              value={slot.songId}
              onChange={(e) => updateSlot(i, { songId: e.target.value })}
            >
              {songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={() => removeSlot(i)}>
            Rimuovi
          </button>
        </div>
      ))}

      <div>
        <button type="button" onClick={addSlot}>
          + Aggiungi canto
        </button>
      </div>

      <button type="button" className="save" onClick={save}>
        Salva
      </button>

      {status && <p className="status">{status}</p>}
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/pages/Admin.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: all tests across all files PASS.

- [ ] **Step 7: Verify the app builds**

Run: `npm run build`
Expected: TypeScript compiles and Vite builds with no errors.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Admin.tsx src/pages/Admin.css src/pages/Admin.test.tsx
git commit -m "feat: add admin page for setting today's songs"
```

---

## Task 16: Vercel deploy config + README

**Files:**
- Create: `vercel.json`
- Modify: `README.md`

- [ ] **Step 1: Create the SPA rewrite config**

Create `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This serves `index.html` for client routes (`/canti/...`, `/admin`) while leaving `/api/*` to the function.

- [ ] **Step 2: Document setup in the README**

Replace `README.md` with:

````markdown
# Libretto Digitale dei Canti

Digital songbook for the parish liturgical songs. Static React SPA on Vercel with
one serverless function for the daily "Messa di oggi" set.

## Develop

```bash
npm install
npm run dev      # app at http://localhost:5173
npm test         # run the test suite
npm run build    # production build
```

## Songs

Songs are bundled JSON in `src/data/songs/<id>.json` (`{ id, title, body }`).
`body` uses ChordPro inline brackets — `[C]Se il sole non [G]illumi[Am]nasse più`.
Add chords to a song by editing its `body`; the chord toggle appears automatically.

Re-import from the source document with:

```bash
npx tsx scripts/import-docx.ts
```

## Deploy (Vercel)

1. Import the repo into Vercel.
2. Add the **Upstash** integration (Marketplace) — it sets
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. Add an `ADMIN_PASSWORD` environment variable.
4. Deploy. The QR codes around the church should point at the deployment root URL.

Set today's songs at `/admin` (enter the admin password).
````

- [ ] **Step 3: Commit**

```bash
git add vercel.json README.md
git commit -m "chore: add Vercel config and project README"
```

---

## Done

After Task 16: `npm test` is green, `npm run build` succeeds, and `npm run dev` serves the full app. Deploy to Vercel, configure Upstash + `ADMIN_PASSWORD`, then add chords to songs over time by editing each `body`.
