# Letter Jump Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bottom-sheet letter jump menu to the song index page so mobile users can jump directly to any letter group by tapping the letter header.

**Architecture:** A new `LetterJumpSheet` component renders a modal bottom sheet with one chip per letter currently shown in the index. `SongIndex` converts each section's letter heading into a `<button>` that opens the sheet, owns the open/close state, and scrolls the page to the picked letter via `scrollIntoView` on a stable section id. ESC, backdrop click, and chip click all close the sheet; focus returns to the originating header.

**Tech Stack:** React 19, react-router-dom 7, Vitest, @testing-library/react, @testing-library/user-event, plain CSS.

**Spec:** `docs/superpowers/specs/2026-05-28-letter-jump-sheet-design.md`

---

## File Structure

- **Create:** `src/components/LetterJumpSheet.tsx` — the sheet component
- **Create:** `src/components/LetterJumpSheet.css` — sheet visuals (backdrop, slide-up, chip grid)
- **Create:** `src/components/LetterJumpSheet.test.tsx` — unit tests for the sheet in isolation
- **Modify:** `src/pages/SongIndex.tsx` — headers become buttons, mount sheet, scroll handler
- **Modify:** `src/pages/SongIndex.css` — button reset on `.index-group-letter`, `scroll-margin-top` on sections
- **Modify:** `src/pages/SongIndex.test.tsx` — integration assertions

---

## Task 1: LetterJumpSheet — renders nothing when closed

**Files:**
- Create: `src/components/LetterJumpSheet.test.tsx`
- Create: `src/components/LetterJumpSheet.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/LetterJumpSheet.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LetterJumpSheet } from './LetterJumpSheet.tsx'

function noop() {}

describe('LetterJumpSheet', () => {
  it('renders nothing when closed', () => {
    render(
      <LetterJumpSheet
        letters={['A', 'B', 'C']}
        open={false}
        onClose={noop}
        onPick={noop}
      />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/LetterJumpSheet.test.tsx`

Expected: FAIL — `Cannot find module './LetterJumpSheet.tsx'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/LetterJumpSheet.tsx`:

```tsx
type LetterJumpSheetProps = {
  letters: string[]
  open: boolean
  onClose: () => void
  onPick: (letter: string) => void
}

export function LetterJumpSheet({ letters, open, onClose, onPick }: LetterJumpSheetProps) {
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
```

The unused `onClose` import is intentional — it is consumed in later tasks. Suppress the lint warning by referencing it inside the component body (added in Task 3).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/LetterJumpSheet.test.tsx`

Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/LetterJumpSheet.tsx src/components/LetterJumpSheet.test.tsx
git commit -m "feat(index): scaffold LetterJumpSheet component"
```

---

## Task 2: LetterJumpSheet — renders a chip per letter when open

**Files:**
- Modify: `src/components/LetterJumpSheet.test.tsx`
- Modify: `src/components/LetterJumpSheet.tsx`

- [ ] **Step 1: Write the failing test**

Append inside the `describe('LetterJumpSheet', …)` block in `src/components/LetterJumpSheet.test.tsx`:

```tsx
it('renders one chip per letter when open', () => {
  render(
    <LetterJumpSheet
      letters={['A', 'B', 'C']}
      open
      onClose={noop}
      onPick={noop}
    />,
  )
  expect(screen.getByRole('dialog', { name: 'Salta a lettera' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Salta a A' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Salta a B' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Salta a C' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/LetterJumpSheet.test.tsx`

Expected: FAIL — the chip buttons currently have no accessible name matching `Salta a X` (visible text is the bare letter).

- [ ] **Step 3: Update implementation**

Replace the body of `LetterJumpSheet` in `src/components/LetterJumpSheet.tsx`:

```tsx
type LetterJumpSheetProps = {
  letters: string[]
  open: boolean
  onClose: () => void
  onPick: (letter: string) => void
}

export function LetterJumpSheet({ letters, open, onClose, onPick }: LetterJumpSheetProps) {
  if (!open) return null
  // onClose used in later tasks for ESC/backdrop handling
  void onClose
  return (
    <div className="letter-sheet-root">
      <div className="letter-sheet-backdrop" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Salta a lettera"
        id="letter-jump-sheet"
        className="letter-sheet"
      >
        <div className="letter-sheet__handle" aria-hidden="true" />
        <div className="letter-sheet__grid">
          {letters.map((letter) => (
            <button
              key={letter}
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/LetterJumpSheet.test.tsx`

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/LetterJumpSheet.tsx src/components/LetterJumpSheet.test.tsx
git commit -m "feat(index): render letter chips in LetterJumpSheet"
```

---

## Task 3: LetterJumpSheet — chip click fires onPick, ESC and backdrop fire onClose

**Files:**
- Modify: `src/components/LetterJumpSheet.test.tsx`
- Modify: `src/components/LetterJumpSheet.tsx`

- [ ] **Step 1: Write the failing tests**

Append inside the `describe` block in `src/components/LetterJumpSheet.test.tsx`:

```tsx
it('fires onPick when a chip is clicked', async () => {
  const onPick = vi.fn()
  const user = userEvent.setup()
  render(
    <LetterJumpSheet letters={['A', 'B']} open onClose={noop} onPick={onPick} />,
  )
  await user.click(screen.getByRole('button', { name: 'Salta a B' }))
  expect(onPick).toHaveBeenCalledWith('B')
})

it('does not call onClose when a chip is clicked', async () => {
  const onClose = vi.fn()
  const user = userEvent.setup()
  render(
    <LetterJumpSheet letters={['A']} open onClose={onClose} onPick={noop} />,
  )
  await user.click(screen.getByRole('button', { name: 'Salta a A' }))
  expect(onClose).not.toHaveBeenCalled()
})

it('fires onClose when ESC is pressed', async () => {
  const onClose = vi.fn()
  const user = userEvent.setup()
  render(
    <LetterJumpSheet letters={['A']} open onClose={onClose} onPick={noop} />,
  )
  await user.keyboard('{Escape}')
  expect(onClose).toHaveBeenCalledTimes(1)
})

it('fires onClose when the backdrop is clicked', async () => {
  const onClose = vi.fn()
  const user = userEvent.setup()
  render(
    <LetterJumpSheet letters={['A']} open onClose={onClose} onPick={noop} />,
  )
  await user.click(document.querySelector('.letter-sheet-backdrop') as HTMLElement)
  expect(onClose).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/LetterJumpSheet.test.tsx`

Expected: FAIL — the chip-click + onPick test passes (already wired), but the ESC and backdrop tests fail because the sheet does not yet listen for them. The "does not call onClose" test passes.

- [ ] **Step 3: Add ESC + backdrop handling**

Replace the contents of `src/components/LetterJumpSheet.tsx`:

```tsx
import { useEffect } from 'react'

type LetterJumpSheetProps = {
  letters: string[]
  open: boolean
  onClose: () => void
  onPick: (letter: string) => void
}

export function LetterJumpSheet({ letters, open, onClose, onPick }: LetterJumpSheetProps) {
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

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
          {letters.map((letter) => (
            <button
              key={letter}
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/LetterJumpSheet.test.tsx`

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/LetterJumpSheet.tsx src/components/LetterJumpSheet.test.tsx
git commit -m "feat(index): close LetterJumpSheet on ESC and backdrop click"
```

---

## Task 4: LetterJumpSheet — focus first chip on open, lock body scroll

**Files:**
- Modify: `src/components/LetterJumpSheet.test.tsx`
- Modify: `src/components/LetterJumpSheet.tsx`

- [ ] **Step 1: Write the failing tests**

Append inside the `describe` block in `src/components/LetterJumpSheet.test.tsx`:

```tsx
it('focuses the first chip when opened', () => {
  render(
    <LetterJumpSheet letters={['A', 'B']} open onClose={noop} onPick={noop} />,
  )
  expect(screen.getByRole('button', { name: 'Salta a A' })).toHaveFocus()
})

it('locks body scroll while open and restores it on close', () => {
  const { rerender } = render(
    <LetterJumpSheet letters={['A']} open onClose={noop} onPick={noop} />,
  )
  expect(document.body.style.overflow).toBe('hidden')
  rerender(
    <LetterJumpSheet letters={['A']} open={false} onClose={noop} onPick={noop} />,
  )
  expect(document.body.style.overflow).toBe('')
})
```

The `toHaveFocus` matcher is provided by `@testing-library/jest-dom`; verify it is imported by the existing test setup (`src/test/setup.ts` or equivalent) before running. If it is not, import `'@testing-library/jest-dom/vitest'` at the top of this test file.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/LetterJumpSheet.test.tsx`

Expected: FAIL — no auto-focus, no body scroll lock yet.

- [ ] **Step 3: Add focus + scroll lock**

Replace the contents of `src/components/LetterJumpSheet.tsx`:

```tsx
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/LetterJumpSheet.test.tsx`

Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/LetterJumpSheet.tsx src/components/LetterJumpSheet.test.tsx
git commit -m "feat(index): auto-focus first chip and lock body scroll"
```

---

## Task 5: LetterJumpSheet styles

**Files:**
- Create: `src/components/LetterJumpSheet.css`
- Modify: `src/components/LetterJumpSheet.tsx` (add CSS import)

No new tests in this task — visual styles are not asserted in unit tests.

- [ ] **Step 1: Create the stylesheet**

Create `src/components/LetterJumpSheet.css`:

```css
.letter-sheet-root {
  position: fixed;
  inset: 0;
  z-index: 50;
}

.letter-sheet-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  animation: letter-sheet-fade-in 160ms ease-out;
}

.letter-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  max-width: 32rem;
  margin: 0 auto;
  background: var(--surface-2);
  border-top-left-radius: var(--r-lg);
  border-top-right-radius: var(--r-lg);
  padding: var(--s-3) var(--s-4) var(--s-5);
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.18);
  animation: letter-sheet-slide-up 200ms ease-out;
}

.letter-sheet__handle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--rule);
  margin: 0 auto var(--s-3);
}

.letter-sheet__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
  gap: var(--s-2);
}

.letter-sheet__chip {
  min-width: 48px;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  color: var(--ink);
  background: var(--surface-1);
  border: 1px solid var(--rule);
  border-radius: var(--r-md);
  cursor: pointer;
  padding: 0;
}

.letter-sheet__chip:hover,
.letter-sheet__chip:focus-visible {
  color: var(--accent);
  border-color: var(--accent);
  outline: none;
}

@keyframes letter-sheet-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes letter-sheet-slide-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .letter-sheet-backdrop,
  .letter-sheet {
    animation: none;
  }
}
```

- [ ] **Step 2: Import the stylesheet from the component**

Add at the top of `src/components/LetterJumpSheet.tsx`, after the existing `import` lines:

```tsx
import './LetterJumpSheet.css'
```

- [ ] **Step 3: Run the full test suite to confirm nothing broke**

Run: `npm test`

Expected: PASS — all existing suites green, including the 8 `LetterJumpSheet` tests.

- [ ] **Step 4: Commit**

```bash
git add src/components/LetterJumpSheet.tsx src/components/LetterJumpSheet.css
git commit -m "feat(index): style LetterJumpSheet bottom sheet"
```

---

## Task 6: SongIndex — turn letter headers into buttons that open the sheet

**Files:**
- Modify: `src/pages/SongIndex.test.tsx`
- Modify: `src/pages/SongIndex.tsx`
- Modify: `src/pages/SongIndex.css`

- [ ] **Step 1: Write the failing test**

Append inside the `describe('SongIndex', …)` block in `src/pages/SongIndex.test.tsx`:

```tsx
it('opens the letter jump sheet when a letter header is clicked', async () => {
  const user = userEvent.setup()
  renderIndex()
  const header = screen.getAllByRole('button', { name: /apri menu lettere/i })[0]
  await user.click(header)
  expect(screen.getByRole('dialog', { name: 'Salta a lettera' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/SongIndex.test.tsx`

Expected: FAIL — no buttons with name `apri menu lettere` exist yet.

- [ ] **Step 3: Update `SongIndex.tsx`**

Replace the contents of `src/pages/SongIndex.tsx`:

```tsx
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { songs } from '../data/songs/index.ts'
import { LetterJumpSheet } from '../components/LetterJumpSheet.tsx'
import './SongIndex.css'

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function SearchIcon() {
  return (
    <svg
      className="index-search__icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function SongIndex() {
  const [query, setQuery] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null)

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

  const letters = useMemo(() => groups.map(([letter]) => letter), [groups])

  function handleHeaderClick(e: React.MouseEvent<HTMLButtonElement>) {
    lastTriggerRef.current = e.currentTarget
    setSheetOpen(true)
  }

  function handlePick(letter: string) {
    const el = document.getElementById(`letter-${letter}`)
    el?.scrollIntoView({ block: 'start' })
    setSheetOpen(false)
  }

  function handleClose() {
    setSheetOpen(false)
    lastTriggerRef.current?.focus()
  }

  return (
    <>
      <div className="index-search">
        <SearchIcon />
        <input
          type="search"
          className="index-search__input"
          placeholder="Cerca un canto…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cerca un canto"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="index-empty">Nessun canto trovato.</p>
      ) : (
        groups.map(([letter, list]) => (
          <section key={letter} id={`letter-${letter}`}>
            <button
              type="button"
              className="index-group-letter"
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              aria-controls="letter-jump-sheet"
              aria-label={`${letter} — apri menu lettere`}
              onClick={handleHeaderClick}
            >
              {letter}
            </button>
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
      <LetterJumpSheet
        letters={letters}
        open={sheetOpen}
        onClose={handleClose}
        onPick={handlePick}
      />
    </>
  )
}
```

- [ ] **Step 4: Update `SongIndex.css`**

In `src/pages/SongIndex.css`, replace the existing `.index-group-letter` block with:

```css
.index-group-letter {
  display: block;
  width: 100%;
  appearance: none;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--rule);
  cursor: pointer;
  text-align: left;
  font-family: var(--font-display);
  font-style: normal;
  font-weight: 600;
  font-size: var(--fs-h2);
  color: var(--accent);
  margin: var(--s-5) 0 var(--s-2);
  padding: 0 0 var(--s-1);
}

.index-group-letter:hover,
.index-group-letter:focus-visible {
  color: var(--accent-strong, var(--accent));
  outline: none;
}
```

Then append at the bottom of `src/pages/SongIndex.css`:

```css
section[id^='letter-'] {
  scroll-margin-top: calc(4rem + 44px + var(--s-4));
}
```

The `scroll-margin-top` value matches the sticky search bar offset (`top: 4rem` + `height: 44px` + bottom margin `var(--s-4)`) so the jumped-to letter is not hidden behind it.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/pages/SongIndex.test.tsx`

Expected: FAIL on the existing `'lists songs as links'` style assertions only if they relied on `<h3>`. Inspect failures.

If any pre-existing test fails because the letter header changed role, leave the test as-is — the new query selector `getAllByRole('button', { name: /apri menu lettere/i })` is the canonical way to find headers going forward. The existing tests in `SongIndex.test.tsx` look up links by accessible name and do not touch the letter heading element directly, so they should continue to pass.

Re-run: `npx vitest run src/pages/SongIndex.test.tsx`

Expected: PASS (4 tests — 3 pre-existing + 1 new).

- [ ] **Step 6: Commit**

```bash
git add src/pages/SongIndex.tsx src/pages/SongIndex.css src/pages/SongIndex.test.tsx
git commit -m "feat(index): make letter headers open LetterJumpSheet"
```

---

## Task 7: SongIndex — sheet reflects filtered letters and closes after pick

**Files:**
- Modify: `src/pages/SongIndex.test.tsx`

- [ ] **Step 1: Write the failing tests**

Append inside the `describe('SongIndex', …)` block in `src/pages/SongIndex.test.tsx`:

```tsx
it('shows only filtered letters in the sheet', async () => {
  const user = userEvent.setup()
  renderIndex()
  // Filter to a single song whose title starts with E
  await user.type(screen.getByRole('searchbox'), 'eucar')
  const header = screen.getAllByRole('button', { name: /apri menu lettere/i })[0]
  await user.click(header)
  const dialog = screen.getByRole('dialog', { name: 'Salta a lettera' })
  // Exactly one chip, for the surviving letter group
  const chips = within(dialog).getAllByRole('button')
  expect(chips).toHaveLength(1)
  expect(chips[0]).toHaveAccessibleName(/^Salta a [A-Z#]$/)
})

it('closes the sheet when a chip is clicked', async () => {
  const user = userEvent.setup()
  renderIndex()
  const header = screen.getAllByRole('button', { name: /apri menu lettere/i })[0]
  await user.click(header)
  const dialog = screen.getByRole('dialog', { name: 'Salta a lettera' })
  const firstChip = within(dialog).getAllByRole('button')[0]
  await user.click(firstChip)
  expect(screen.queryByRole('dialog', { name: 'Salta a lettera' })).not.toBeInTheDocument()
})
```

Add `within` to the existing `@testing-library/react` import at the top of the file:

```tsx
import { render, screen, within } from '@testing-library/react'
```

- [ ] **Step 2: Run tests to verify they fail or pass as expected**

Run: `npx vitest run src/pages/SongIndex.test.tsx`

Expected: PASS — Task 6 already wired `letters` from `groups` and `handlePick` closes the sheet. These tests guard that behaviour. If they fail, the wiring from Task 6 has a bug; debug before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/pages/SongIndex.test.tsx
git commit -m "test(index): assert sheet tracks filtered letters and closes on pick"
```

---

## Task 8: Verify the whole build

**Files:** none.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: PASS — every existing suite plus the new `LetterJumpSheet` suite (8 tests) and the new `SongIndex` assertions (3 added).

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: no errors. Fix any reported in the files we touched (`LetterJumpSheet.tsx`, `SongIndex.tsx`) — do not silence rules without cause.

- [ ] **Step 3: Run type-check + build**

Run: `npm run build`

Expected: type-check passes, Vite build succeeds.

- [ ] **Step 4: Manual smoke check (optional but recommended)**

Run: `npm run dev` then open the song index page in a mobile-sized viewport (DevTools responsive mode). Confirm:

- Tapping a letter header opens the sheet from the bottom.
- Tapping a chip jumps to that letter and the chosen header is not hidden behind the sticky search bar.
- ESC closes the sheet; backdrop click closes it; focus returns to the originating header.
- Search filtering prunes the chip set.

- [ ] **Step 5: Final commit (if any cleanup was required)**

```bash
git status
# If clean, nothing to commit. Otherwise:
git add -A
git commit -m "chore(index): cleanup after letter jump sheet implementation"
```
