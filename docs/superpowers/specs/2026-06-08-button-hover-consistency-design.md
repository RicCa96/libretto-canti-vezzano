# Button & Interactive State Consistency

**Date:** 2026-06-08
**Status:** Draft
**Scope:** CSS-only refactor across `src/styles` + page/component CSS files.

## Problem

Hover and focus styles for interactive controls (buttons, tabs, chips, links) have drifted across the codebase. Notable divergences:

- `.song-controls button:hover` changes only `border-color` and is gated behind `@media (hover: hover)`. Every other secondary button (tabs, admin buttons, letter-sheet chips) also changes `color` and is not gated.
- Disclosure summaries override the base `:focus-visible` outline (`--focus` token) with an accent-colored outline; `.letter-sheet__chip` and `.index-group-letter` drop the outline entirely. The result is inconsistent focus rings across the same page.
- Transition durations are mostly `120ms`, but disclosure summaries use `160ms` for color/border alongside the chevron rotate, with no clear reason.

## Goals

1. Single visual language for interactive state across the app.
2. Fix the actual hover bug on the song page (3-way Testo/Accordi/Spartito toggle does not change text color on hover).
3. No JSX changes. No new component class. No behavior changes.

## Non-Goals

- No new `.btn` utility class or markup churn.
- No palette changes.
- No new component variants beyond what already exists.
- Row-link vs inline-link patterns stay distinct (different roles).

## Design

### 1. New tokens (`src/styles/tokens.css`)

Add to the existing `:root` block:

```css
/* Motion */
--t-fast: 120ms;
--ease:   ease;

/* Interactive state */
--hover-border: var(--accent);
--hover-fg:     var(--accent);
--press-bg:     var(--accent-2);
--press-border: var(--accent-2);
```

These centralize the hover/active colors and the default transition timing.

### 2. Canonical interactive variants

Four variants are documented here and applied by the existing per-component selectors. No new shared class.

#### Secondary (default button / tab / chip)

Base: `background: var(--surface); border: 1px solid var(--rule); color: var(--ink);`
Hover: `border-color: var(--hover-border); color: var(--hover-fg);`
Pressed/active: `background: var(--accent); border-color: var(--accent); color: var(--accent-on);`
Transition: `border-color var(--t-fast), color var(--t-fast), background-color var(--t-fast);`

Applies to: `.today-tab`, `.admin .church-tab`, `.admin button` (non-primary), `.song-controls button`, `.letter-sheet__chip`.

#### Primary

Base: `background: var(--accent); border: 1px solid var(--accent); color: var(--accent-on);`
Hover: `background: var(--press-bg); border-color: var(--press-border);`

Applies to: `.admin .save`.

#### Ghost (dashed, subtle)

Base: `background: transparent; border: 1px dashed var(--rule); color: var(--muted);`
Hover: `border-color: var(--hover-border); color: var(--hover-fg);`
Active: solid border + accent color.

Applies to: `.today-favorite__btn`.

#### Icon (transparent, no border)

Base: `background: transparent; border: 0; color: var(--muted);`
Hover: `color: var(--ink); background: var(--surface-2);`

Applies to: `.admin .slot-handle`.

### 3. Concrete fixes

#### Fix 1 — `src/pages/SongPage.css`

Remove `@media (hover: hover)` wrapper. Add `color: var(--accent)` to the hover rule. Use token-based transition.

```css
.song-controls button {
  height: 32px;
  padding: 0 var(--s-3);
  font-family: var(--font-sans);
  font-size: var(--fs-small);
  font-weight: 500;
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--rule);
  border-radius: var(--r-md);
  cursor: pointer;
  transition: border-color var(--t-fast), color var(--t-fast), background-color var(--t-fast);
}

.song-controls button:hover {
  border-color: var(--hover-border);
  color: var(--hover-fg);
}

.song-controls button[aria-pressed='true'] {
  background: var(--accent);
  color: var(--accent-on);
  border-color: var(--accent);
}
```

Why no hover-media gate: every other secondary control hovers on touch identically (touch devices already show the press state on tap). Consistency wins.

#### Fix 2 — `src/pages/Landing.css`

Update `.today-tab`, `.today-tab--active*`, `.today-favorite__btn` to reference `--hover-border`, `--hover-fg`, `--t-fast`.

#### Fix 3 — `src/pages/Admin.css`

Same token substitution for `.admin button`, `.admin .save`, `.admin .church-tab`, `.admin .slot-handle`.

#### Fix 4 — `src/components/LetterJumpSheet.css`

Use `--hover-border` / `--hover-fg`. Drop `outline: none` on `.letter-sheet__chip:focus-visible` so the base `:focus-visible` ring (`--focus`) applies. Keep the border-color hover effect — focus and hover can coexist.

#### Fix 5 — `src/pages/SongIndex.css`

`.index-group-letter:focus-visible`: drop `outline: none`; let base focus ring show. Hover keeps `color: var(--accent-2)` (heading-as-link role).

#### Fix 6 — Disclosure summaries (`src/pages/Landing.css`)

Drop the accent-colored outline override on `.intro-summary:focus-visible` and `.intro-item > summary:focus-visible`. Rely on base `:focus-visible` from `src/styles/base.css`.

Chevron rotate transition stays at `160ms` (motion feel for the disclosure twist). Color change on summary text uses `--t-fast`.

### 4. Link roles (documented, no code change)

Two intentional patterns. Documented to prevent future drift:

- **Inline link** — base `color: var(--accent)`, hover `color: var(--accent-2)`. Examples: `.song-back`, `.index-group-letter` (heading-as-link).
- **Row link** — base `color: var(--ink)`, hover `color: var(--accent)`. Whole row is the click target. Examples: `.index-list a`, `a.slot-title`.

## Files Touched

- `src/styles/tokens.css` — add 5 tokens
- `src/pages/SongPage.css` — fix `.song-controls button` hover (main bug)
- `src/pages/Landing.css` — token substitution + drop summary outline override
- `src/pages/Admin.css` — token substitution
- `src/components/LetterJumpSheet.css` — token substitution + drop `outline:none`
- `src/pages/SongIndex.css` — drop `outline:none` on `.index-group-letter:focus-visible`

## Risks

- Removing the `@media (hover: hover)` gate may cause a brief hover style flash on touch devices after tap. Mitigation: pressed/active state (`aria-pressed='true'`) overrides hover, so the visual end-state remains correct.
- Restoring base focus rings on disclosure summaries changes the focus color from accent (red) to focus (gold). This is the intentional, documented focus color in `tokens.css`.

## Testing

Manual visual check on:
- Landing: today-tab interaction, favorite toggle.
- SongIndex: jump letter, list item, search focus.
- SongPage: Testo/Accordi/Spartito toggle hover + active.
- Admin: church-tabs, add/remove/save buttons, slot-handle, save (primary).
- LetterJumpSheet: chip hover + focus (Tab through).
- All `:focus-visible` rings should be gold (`--focus`) except for links where color shift suffices.

Existing Vitest suites (`*.test.tsx`) should remain green — no behavior or DOM change.
