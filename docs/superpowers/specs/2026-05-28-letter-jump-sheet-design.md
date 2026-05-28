# Letter Jump Sheet — Design

**Date:** 2026-05-28
**Status:** Draft, awaiting review

## Goal

Improve mobile navigation on the song index page by allowing the user to jump directly to any letter group. Clicking a letter header opens a bottom sheet listing every letter currently present in the index; selecting a letter scrolls the page to that letter group and closes the sheet.

## Non-goals

- Smooth-scroll animation (instant jump preferred).
- A "stay open" mode for the sheet (auto-close after each pick).
- A persistent alphabet sidebar or floating button.
- Touch drag-to-dismiss gesture (ESC + backdrop suffice).
- Full A–Z keypad with disabled letters (only present letters are shown).

## User flow

1. User scrolls song index, sees current group's letter header.
2. User taps the letter header.
3. Bottom sheet slides up over the page with a grid of letter chips — one chip per letter that has at least one song in the current (possibly filtered) view.
4. User taps a chip.
5. Page jumps instantly to that letter's section; sheet closes; focus returns to the originating header.
6. ESC key or backdrop tap also closes the sheet without jumping.

## Architecture

A new self-contained `LetterJumpSheet` component renders the sheet UI. `SongIndex` owns the open/close state and the list of letters. Letter headers become `<button>` elements that toggle the sheet. Section anchors use stable ids so a chip click can scroll into view via `scrollIntoView`.

No portal library, no new state machine: a controlled boolean and a `useRef` to restore focus on close.

## Components

### `LetterJumpSheet` (new)

Location: `src/components/LetterJumpSheet.tsx` (+ `LetterJumpSheet.css`).

Props:

```ts
type LetterJumpSheetProps = {
  letters: string[]      // letters currently present, in display order
  open: boolean
  onClose: () => void
  onPick: (letter: string) => void
}
```

Responsibilities:

- Render backdrop + sheet container when `open`. Sheet element carries `id="letter-jump-sheet"` so triggering headers can reference it via `aria-controls`.
- Render a grid of chips, one per letter in `letters`.
- Handle ESC key and backdrop click → `onClose`.
- Focus the first chip when opened.
- Lock `body` scroll while open (toggle `overflow: hidden` on `document.body`).
- Apply `role="dialog"`, `aria-modal="true"`, `aria-label="Salta a lettera"`.

Chip click:

```ts
function handleChipClick(letter: string) {
  onPick(letter)
}
```

The parent decides what `onPick` does (scroll + close); the sheet does not know about anchors.

### `SongIndex.tsx` changes

- New state: `const [sheetOpen, setSheetOpen] = useState(false)`.
- New ref: `const lastTriggerRef = useRef<HTMLButtonElement | null>(null)` for focus restoration.
- Section structure changes:
  - `<h3>` → `<button>` with `className="index-group-letter"` (visual style preserved via CSS adjustments — reset button defaults).
  - Each section gets `id={\`letter-${letter}\`}` on the `<section>` (scroll target).
  - Button gets `aria-haspopup="dialog"` and `aria-expanded={sheetOpen}`.
- `letters` derived from existing `groups`: `groups.map(([letter]) => letter)`.
- `onPick` handler:

  ```ts
  function handlePick(letter: string) {
    const el = document.getElementById(`letter-${letter}`)
    el?.scrollIntoView({ block: 'start' })
    setSheetOpen(false)
  }
  ```

- `onClose` handler restores focus to `lastTriggerRef.current`.

### CSS (`LetterJumpSheet.css`)

- `.letter-sheet-backdrop`: `position: fixed; inset: 0; background: rgba(0,0,0,0.4);` fade in via opacity transition.
- `.letter-sheet`: `position: fixed; left: 0; right: 0; bottom: 0;` rounded top corners (`var(--r-lg)`), `background: var(--surface-2)`, `padding: var(--s-4)`, max-width on wider viewports, centered, slide-in via `transform: translateY(100%) → 0`.
- `.letter-sheet__handle`: 4px-tall, 40px-wide rounded bar centered at top, decorative.
- `.letter-sheet__grid`: CSS grid, `grid-template-columns: repeat(auto-fill, minmax(48px, 1fr))`, gap `var(--s-2)`.
- `.letter-sheet__chip`: min 48×48 (tap target), `var(--font-display)`, neutral border, accent on hover/focus, no underline, button reset.
- Respects `prefers-reduced-motion`: skip slide/fade transitions.

### `SongIndex.css` changes

- `.index-group-letter` retains visual identity (font, color, border-bottom).
- Add button resets: `appearance: none; background: transparent; border: 0; padding: 0; cursor: pointer; text-align: left; width: 100%;` while keeping the existing `margin`, `padding-bottom`, `border-bottom`, and typography rules.
- Hover/focus: subtle accent shift on color to hint affordance.

## Data flow

```
[letter header] click
        │
        ▼
setSheetOpen(true); lastTriggerRef = clicked button
        │
        ▼
<LetterJumpSheet open letters={letters} … />
        │
   chip click ──► onPick(letter) ──► scrollIntoView(#letter-X); setSheetOpen(false)
   ESC / backdrop ──► onClose ──► setSheetOpen(false); focus(lastTriggerRef)
```

`letters` always reflects the current `groups`, which is already memoised from `filtered`, so search filtering automatically prunes the sheet.

## Accessibility

- Sheet: `role="dialog"`, `aria-modal="true"`, `aria-label="Salta a lettera"`.
- Letter headers: `<button>` with `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls="letter-jump-sheet"`.
- Chips: `<button>` with `aria-label={\`Salta a \${letter}\`}`.
- ESC closes; backdrop click closes; focus returns to triggering header.
- Body scroll locked while open.
- Tap targets ≥ 44×44 (chips at 48).
- Reduced-motion: no slide/fade.

## Error handling / edge cases

- Filtered view yields no songs → existing `index-empty` branch remains; no sheet, no headers, no change.
- Filtered view yields a single letter → sheet still works (one chip); not blocked.
- `scrollIntoView` target missing (race between filter change and pick) → `el?.scrollIntoView` is a no-op; sheet still closes.
- Rapid header taps before sheet animates → React state guards prevent double-open; only the latest trigger ref is stored.

## Testing

### `LetterJumpSheet.test.tsx` (new)

- Renders nothing when `open=false`.
- Renders one chip per letter when `open=true`.
- Chip click fires `onPick` with that letter.
- ESC key fires `onClose`.
- Backdrop click fires `onClose`.
- Chip click does NOT also fire `onClose` (parent owns close logic on pick).
- First chip is focused on open.

### `SongIndex.test.tsx` additions

- Clicking a letter header opens the sheet (`aria-expanded="true"`).
- Sheet lists only letters present in the current filtered view (filter by typed query, assert chip set).
- Clicking a chip closes the sheet.
- After close, focus returns to the triggering header.

### Manual checks

- Mobile viewport (iOS Safari, Android Chrome): sheet usable with one thumb.
- Page jump lands header at top of viewport, not hidden behind sticky search bar — verify; if needed, add `scroll-margin-top` matching the sticky offset.

## File changes summary

- **New:** `src/components/LetterJumpSheet.tsx`, `src/components/LetterJumpSheet.css`, `src/components/LetterJumpSheet.test.tsx`.
- **Edit:** `src/pages/SongIndex.tsx` (state, ref, header → button, section id, sheet mount, handlers).
- **Edit:** `src/pages/SongIndex.css` (button reset on `.index-group-letter`, optional `scroll-margin-top` on `section`).
- **Edit:** `src/pages/SongIndex.test.tsx` (new assertions for sheet behaviour).
