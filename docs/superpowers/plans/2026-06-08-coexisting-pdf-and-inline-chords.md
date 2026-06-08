# Coexisting PDF Sheets and Inline ChordPro Chords — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let inline ChordPro chords and PDF sheet music coexist on the same song, exposed through a three-way view toggle on `SongPage`.

**Architecture:** Replace the boolean `chordsOn` state in `src/pages/SongPage.tsx` with a `View = 'text' | 'chords' | 'pdf'` state. Pick the control shape (no toggle / single button / segmented) based on the `(hasInline, hasPdf)` pair, and gate the body, transpose, and font-size controls on the active view. No data-format change.

**Tech Stack:** React 18, TypeScript, React Router, Vitest, Testing Library, ChordPro inline brackets.

**Spec:** `docs/superpowers/specs/2026-06-08-coexisting-pdf-and-inline-chords-design.md`

---

## File Structure

- **Modify:** `src/pages/SongPage.tsx` — single source of behavioral change. Replace `chordsOn`/`hasPdf`/`showPdf` triad with a `View` state machine and per-mode control rendering.
- **Modify:** `src/pages/SongPage.test.tsx` — add tests for inline-only, pdf-only, both, and neither cases. Use `vi.mock` of `../data/songs/index.ts` to inject a song that has both inline brackets and an entry in `chord-ids.json`.

No CSS changes — the existing `.song-controls` and `.song-controls .group` rules already cover any new button arrangement.

---

## Test fixtures used in tests

Choose existing songs whose state is known and stable:

- **inline + pdf (both):** mock `madre-della-speranza` (in `chord-ids.json`) by overriding its body to contain ChordPro brackets via `vi.mock`.
- **pdf only:** `madre-della-speranza` real body — present in `chord-ids.json`, body has no `[X]` brackets.
- **inline only:** `acqua-siamo-noi` — has inline brackets, not in `chord-ids.json`.
- **neither:** `eucaristia` — already used by the existing test.

Verify these assumptions with:

```bash
grep -E "^  \"madre-della-speranza\"|^  \"acqua-siamo-noi\"" src/data/chord-ids.json
grep -c "\[[A-G]" src/data/songs/acqua-siamo-noi.ts
grep -c "\[[A-G]" src/data/songs/madre-della-speranza.ts
grep -c "\[[A-G]" src/data/songs/eucaristia.ts
```

Expected: `madre-della-speranza` listed, `acqua-siamo-noi` NOT listed; bracket count > 0 for `acqua-siamo-noi`, 0 for the other two.

---

## Task 1: Failing test — Testo is default, all 3 buttons present when both modes exist

**Files:**
- Modify: `src/pages/SongPage.test.tsx`

- [ ] **Step 1: Add the `vi.mock` for `songById` at the top of the test file**

Add `vi` to the existing vitest import and place the mock factory **before** the `import { SongPage }` line. `vi.mock` is hoisted, so the factory must construct its own Map without referencing module-scope variables.

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../data/songs/index.ts', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../data/songs/index.ts')>()
  const overridden = new Map(actual.songById)
  const original = actual.songById.get('madre-della-speranza')
  if (original) {
    overridden.set('madre-della-speranza', {
      ...original,
      body: '[C]Madre della [G]speranza\n[Am]veglia sul [F]cammino',
    })
  }
  return { ...actual, songById: overridden }
})

import { SongPage } from './SongPage.tsx'
```

- [ ] **Step 2: Add the test**

Append inside `describe('SongPage', ...)`:

```tsx
it('renders 3-way view toggle and defaults to Testo when both inline and pdf exist', () => {
  renderSong('madre-della-speranza')

  expect(screen.getByRole('button', { name: 'Testo' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(screen.getByRole('button', { name: 'Accordi' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  expect(screen.getByRole('button', { name: 'Spartito' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )

  // Default view = Testo → no PDF object, no chord spans.
  expect(
    document.querySelector('object[type="application/pdf"]'),
  ).toBeNull()
  expect(document.querySelector('.chord')).toBeNull()
})
```

- [ ] **Step 3: Run test, expect FAIL**

Run: `npx vitest run src/pages/SongPage.test.tsx -t "3-way view toggle"`
Expected: FAIL. The current implementation renders a single "Accordi off" button (no buttons named "Testo" / "Spartito"), so `getByRole('button', { name: 'Testo' })` throws.

- [ ] **Step 4: Commit the failing test**

```bash
git add src/pages/SongPage.test.tsx
git commit -m "test(song-page): add failing test for 3-way view toggle"
```

---

## Task 2: Implement the View state machine and control rendering

**Files:**
- Modify: `src/pages/SongPage.tsx`

- [ ] **Step 1: Replace the file contents**

Overwrite `src/pages/SongPage.tsx` with:

```tsx
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { songById } from '../data/songs/index.ts'
import chordIds from '../data/chord-ids.json'
import { hasChords } from '../lib/chordpro.ts'
import { SongBody } from '../components/SongBody.tsx'
import { useFontSize, FONT_SIZES, FONT_REM } from '../hooks/useFontSize.ts'
import './SongPage.css'

const chordPdfIds = new Set<string>(chordIds)

type View = 'text' | 'chords' | 'pdf'

export function SongPage() {
  const { id } = useParams()
  const location = useLocation()
  const fromHome = (location.state as { from?: string } | null)?.from === '/'
  const backTo = fromHome ? '/' : '/canti'
  const backLabel = fromHome ? '← Messa di oggi' : '← Indice'
  const song = id ? songById.get(id) : undefined
  const [view, setView] = useState<View>('text')
  const [transpose, setTranspose] = useState(0)
  const { size, setSize } = useFontSize()

  if (!song) {
    return (
      <>
        <Link className="song-back" to={backTo}>
          {backLabel}
        </Link>
        <p>Canto non trovato.</p>
      </>
    )
  }

  const hasInline = hasChords(song.body)
  const hasPdf = chordPdfIds.has(song.id)
  const showSegmented = hasInline && hasPdf
  const showInlineToggle = hasInline && !hasPdf
  const showPdfToggle = !hasInline && hasPdf

  return (
    <div style={{ ['--fs-lyric' as string]: FONT_REM[size] }}>
      <Link className="song-back" to={backTo}>
        {backLabel}
      </Link>
      <h2 className="song-title">
        {song.songNumber !== undefined && (
          <span className="song-number-chip" aria-hidden="true">
            {song.songNumber}
          </span>
        )}
        <span className="song-title__text">{song.title}</span>
      </h2>

      <div className="song-controls">
        {showSegmented && (
          <span className="group">
            <button
              type="button"
              aria-pressed={view === 'text'}
              onClick={() => setView('text')}
            >
              Testo
            </button>
            <button
              type="button"
              aria-pressed={view === 'chords'}
              onClick={() => setView('chords')}
            >
              Accordi
            </button>
            <button
              type="button"
              aria-pressed={view === 'pdf'}
              onClick={() => setView('pdf')}
            >
              Spartito
            </button>
          </span>
        )}
        {showInlineToggle && (
          <button
            type="button"
            aria-pressed={view === 'chords'}
            onClick={() => setView(view === 'chords' ? 'text' : 'chords')}
          >
            Accordi {view === 'chords' ? 'on' : 'off'}
          </button>
        )}
        {showPdfToggle && (
          <button
            type="button"
            aria-pressed={view === 'pdf'}
            onClick={() => setView(view === 'pdf' ? 'text' : 'pdf')}
          >
            Spartito {view === 'pdf' ? 'on' : 'off'}
          </button>
        )}
        {view === 'chords' && (
          <span className="group">
            <span>Tono</span>
            <button
              type="button"
              aria-label="Abbassa tono"
              onClick={() => setTranspose((t) => t - 1)}
            >
              −
            </button>
            <button
              type="button"
              aria-label="Alza tono"
              onClick={() => setTranspose((t) => t + 1)}
            >
              +
            </button>
          </span>
        )}
        {view !== 'pdf' && (
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
        )}
      </div>

      {view === 'pdf' ? (
        <object
          className="song-chord-pdf"
          data={`/chords/${song.id}.pdf`}
          type="application/pdf"
          aria-label={`Spartito con accordi: ${song.title}`}
        >
          <p>
            Il tuo browser non riesce a mostrare il PDF.{' '}
            <a href={`/chords/${song.id}.pdf`} target="_blank" rel="noreferrer">
              Apri lo spartito
            </a>
            .
          </p>
        </object>
      ) : (
        <SongBody body={song.body} chordsOn={view === 'chords'} transpose={transpose} />
      )}
    </div>
  )
}
```

Notes on the diff vs. previous version:
- `chordsOn` removed; `view` replaces it.
- `chorded`/`showPdf`/`hasPdf` recomputed cleanly from `(hasInline, hasPdf)`.
- Single button labels keep the existing "Accordi on/off" copy so existing PDF-only and inline-only screens look identical to today.
- Transpose visible iff `view === 'chords'`. Font size hidden iff `view === 'pdf'`. These match the spec.
- 3-way control wrapped in `.group` so existing CSS spaces it.

- [ ] **Step 2: Run the new test, expect PASS**

Run: `npx vitest run src/pages/SongPage.test.tsx -t "3-way view toggle"`
Expected: PASS.

- [ ] **Step 3: Run all existing SongPage tests, expect PASS**

Run: `npx vitest run src/pages/SongPage.test.tsx`
Expected: All tests pass (including the 3 pre-existing tests). If `hides the chord toggle when the song has no chords` fails, the regex `/accordi/i` may now match a different element — confirm it still selects nothing on `eucaristia` (it should: that song has neither inline chords nor a PDF entry).

- [ ] **Step 4: Commit the implementation**

```bash
git add src/pages/SongPage.tsx
git commit -m "feat(song-page): support coexisting inline chords and pdf sheets"
```

---

## Task 3: Test — switching to Accordi reveals chord spans, switching to Spartito reveals PDF object

**Files:**
- Modify: `src/pages/SongPage.test.tsx`

- [ ] **Step 1: Add the test**

Append inside `describe('SongPage', ...)`:

```tsx
it('switches body between text, chords, and pdf via segmented control', async () => {
  const { default: userEvent } = await import('@testing-library/user-event')
  const user = userEvent.setup()
  renderSong('madre-della-speranza')

  // Initial: Testo → no chord spans, no PDF.
  expect(document.querySelector('.chord')).toBeNull()
  expect(
    document.querySelector('object[type="application/pdf"]'),
  ).toBeNull()

  // Switch to Accordi → chord spans appear, no PDF.
  await user.click(screen.getByRole('button', { name: 'Accordi' }))
  expect(document.querySelector('.chord')).not.toBeNull()
  expect(
    document.querySelector('object[type="application/pdf"]'),
  ).toBeNull()

  // Switch to Spartito → PDF appears, transpose group is gone.
  await user.click(screen.getByRole('button', { name: 'Spartito' }))
  const pdf = document.querySelector('object[type="application/pdf"]')
  expect(pdf).not.toBeNull()
  expect(pdf?.getAttribute('data')).toBe('/chords/madre-della-speranza.pdf')
  expect(
    screen.queryByRole('button', { name: 'Abbassa tono' }),
  ).not.toBeInTheDocument()

  // Switch back to Testo → no chord spans, no PDF.
  await user.click(screen.getByRole('button', { name: 'Testo' }))
  expect(document.querySelector('.chord')).toBeNull()
  expect(
    document.querySelector('object[type="application/pdf"]'),
  ).toBeNull()
})
```

The `'.chord'` selector matches `SongBody`'s chord span class. Verify in `src/components/SongBody.tsx` that chord spans use `className="chord"`; if a different class name is used, update the selector to match the real class before running the test.

- [ ] **Step 2: Run the test, expect PASS**

Run: `npx vitest run src/pages/SongPage.test.tsx -t "switches body between text, chords"`
Expected: PASS. If FAIL because of selector mismatch, adjust the selector to whatever `SongBody` actually emits (use a more permissive `screen.getByText` on a chord like `C` rendered above a line).

- [ ] **Step 3: Commit**

```bash
git add src/pages/SongPage.test.tsx
git commit -m "test(song-page): verify view switching reveals chords and pdf"
```

---

## Task 4: Test — transpose buttons only present in Accordi view

**Files:**
- Modify: `src/pages/SongPage.test.tsx`

- [ ] **Step 1: Add the test**

```tsx
it('shows transpose buttons only in Accordi view', async () => {
  const { default: userEvent } = await import('@testing-library/user-event')
  const user = userEvent.setup()
  renderSong('madre-della-speranza')

  // Testo: no transpose.
  expect(
    screen.queryByRole('button', { name: 'Abbassa tono' }),
  ).not.toBeInTheDocument()

  // Accordi: transpose visible.
  await user.click(screen.getByRole('button', { name: 'Accordi' }))
  expect(
    screen.getByRole('button', { name: 'Abbassa tono' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Alza tono' }),
  ).toBeInTheDocument()

  // Spartito: transpose hidden again.
  await user.click(screen.getByRole('button', { name: 'Spartito' }))
  expect(
    screen.queryByRole('button', { name: 'Abbassa tono' }),
  ).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run, expect PASS**

Run: `npx vitest run src/pages/SongPage.test.tsx -t "transpose"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/SongPage.test.tsx
git commit -m "test(song-page): scope transpose controls to Accordi view"
```

---

## Task 5: Regression test — inline-only song keeps single "Accordi on/off" button

**Files:**
- Modify: `src/pages/SongPage.test.tsx`

- [ ] **Step 1: Add the test**

```tsx
it('renders only the Accordi toggle for a song with inline chords and no pdf', () => {
  renderSong('acqua-siamo-noi')

  expect(
    screen.getByRole('button', { name: /accordi off/i }),
  ).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Testo' })).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Spartito' }),
  ).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run, expect PASS**

Run: `npx vitest run src/pages/SongPage.test.tsx -t "Accordi toggle"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/SongPage.test.tsx
git commit -m "test(song-page): regression for inline-only chord toggle"
```

---

## Task 6: Regression test — pdf-only song shows single "Spartito on/off" button

**Files:**
- Modify: `src/pages/SongPage.test.tsx`

Because the global `vi.mock` for `madre-della-speranza` injects inline brackets, this test needs a different pdf-only fixture. Use a real chord-ids song whose body is still untouched by the mock.

- [ ] **Step 1: Pick a pdf-only fixture untouched by the mock**

Choose `consolate-isaia-40` (present in `chord-ids.json`, body has no inline brackets). Verify:

```bash
grep '"consolate-isaia-40"' src/data/chord-ids.json
grep -c "\[[A-G]" src/data/songs/consolate-isaia-40.ts
```

Expected: id listed; bracket count = 0.

- [ ] **Step 2: Add the test**

```tsx
it('renders only the Spartito toggle for a song with pdf and no inline chords', () => {
  renderSong('consolate-isaia-40')

  expect(
    screen.getByRole('button', { name: /spartito off/i }),
  ).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Testo' })).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Accordi' }),
  ).not.toBeInTheDocument()
})
```

- [ ] **Step 3: Run, expect PASS**

Run: `npx vitest run src/pages/SongPage.test.tsx -t "Spartito toggle"`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/SongPage.test.tsx
git commit -m "test(song-page): regression for pdf-only spartito toggle"
```

---

## Task 7: Full verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test -- --run`
Expected: all tests pass, no warnings about act() or unhandled errors.

- [ ] **Step 2: Run type check + build**

Run: `npm run build`
Expected: build succeeds, no TS errors.

- [ ] **Step 3: Manual smoke test in the dev server**

```bash
npm run dev
```

Visit:
- `/canti/eucaristia` — no view toggle, just font size.
- `/canti/acqua-siamo-noi` — "Accordi off" single button; clicking shows chords + transpose.
- `/canti/consolate-isaia-40` — "Spartito off" single button; clicking embeds the PDF.
- `/canti/madre-della-speranza` — single "Spartito off" button (still pdf-only in production data — the 3-way control only appears after this song's `body` is edited to include `[X]` brackets, which is the user's manual workflow).

Confirm each screen behaves as listed, then stop the dev server.

- [ ] **Step 4: Final commit only if anything changed**

If steps 1-3 produced no changes, skip. Otherwise commit fixups under an appropriate `fix(song-page): …` message.

---

## Self-review notes

- **Spec coverage:**
  - "Three view modes" → Task 2 introduces `View`, Tasks 1/3 verify default + switching.
  - "Single button when only one mode" → Tasks 5 (inline-only) + 6 (pdf-only).
  - "No toggle when neither" → already covered by the existing `hides the chord toggle when the song has no chords` test, unchanged.
  - "Transpose only when Accordi" → Task 4.
  - "Font size hidden in PDF view" → Task 3 implicitly (Spartito branch covers it); the implementation gates the font-size group on `view !== 'pdf'`.
  - "No data-format change" → Task 2's diff touches only `SongPage.tsx`.
- **Placeholder scan:** no TBDs, every step shows the code or command.
- **Type consistency:** `View` defined once in Task 2 and consumed by tests; button accessible names (`Testo`, `Accordi`, `Spartito`) match between implementation and tests.
- **Risk:** `vi.mock` order matters. The factory must precede `import { SongPage }` in the test file because Vitest hoists `vi.mock` calls before imports — Task 1 places it correctly.
