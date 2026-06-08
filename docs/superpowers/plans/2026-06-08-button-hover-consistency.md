# Button Hover Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify hover, active, and focus styles for all interactive controls (buttons, tabs, chips, links) via shared CSS tokens, fixing the `.song-controls button` hover bug along the way.

**Architecture:** CSS-only. Add 5 state/motion tokens to `tokens.css`. Substitute hardcoded hover values across page and component CSS to reference the new tokens. Drop per-component `outline: none` overrides so the base `:focus-visible` ring applies uniformly. No JSX changes. No new shared `.btn` class. No behavior changes.

**Tech Stack:** Vite + React + plain CSS with CSS custom properties. Vitest + React Testing Library (already in place; tests should remain green without modification).

**Reference spec:** `docs/superpowers/specs/2026-06-08-button-hover-consistency-design.md`

---

## File Structure

**Modified files:**
- `src/styles/tokens.css` — add motion + interactive state tokens
- `src/pages/SongPage.css` — fix song-controls hover (the bug)
- `src/pages/Landing.css` — token substitution; drop summary outline override
- `src/pages/Admin.css` — token substitution
- `src/components/LetterJumpSheet.css` — token substitution; drop `outline:none`
- `src/pages/SongIndex.css` — drop `outline:none` on `.index-group-letter:focus-visible`

**No files created. No JSX edits. No test files added** — visual behavior is verified manually; existing tests should pass unchanged.

---

## Task 1: Add interactive state tokens

**Files:**
- Modify: `src/styles/tokens.css`

- [ ] **Step 1: Add tokens to the `:root` block**

Open `src/styles/tokens.css`. After the `--shadow` declaration (line 36) and before the `/* Type */` comment, add:

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

- [ ] **Step 2: Verify build still works**

Run: `npm run build`
Expected: Build succeeds (no CSS errors).

- [ ] **Step 3: Commit**

```bash
git add src/styles/tokens.css
git commit -m "feat(theme): add motion and interactive state tokens"
```

---

## Task 2: Fix `.song-controls button` hover bug

**Files:**
- Modify: `src/pages/SongPage.css:63-87`

- [ ] **Step 1: Replace song-controls button rules**

Replace the existing block (lines 63 through the `[aria-pressed]` rule at line 87) with:

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

Changes vs current:
- Drop `@media (hover: hover)` wrapper around the hover rule.
- Add `color: var(--hover-fg);` to the hover declaration (was previously only `border-color`).
- Replace literal `120ms` with `var(--t-fast)` in the transition.

- [ ] **Step 2: Run existing tests**

Run: `npm test -- SongPage`
Expected: All tests pass.

- [ ] **Step 3: Manual visual check**

Run: `npm run dev`
Open a song page (e.g. `/canto/<any-slug>`). Hover each of the three toggle buttons (Testo / Accordi / Spartito). Expected: border and text both turn red (`--accent`). Active button stays solid red with white text.

- [ ] **Step 4: Commit**

```bash
git add src/pages/SongPage.css
git commit -m "fix(song-controls): unify hover to match other secondary buttons"
```

---

## Task 3: Migrate `Landing.css` to state tokens; drop summary outline overrides

**Files:**
- Modify: `src/pages/Landing.css`

- [ ] **Step 1: Update `.today-tab` transition and hover**

Replace the `.today-tab` and `.today-tab:hover` blocks (lines 245-262) with:

```css
.today-tab {
  height: 36px;
  padding: 0 var(--s-3);
  font-family: var(--font-sans);
  font-size: var(--fs-small);
  font-weight: 500;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--r-md);
  cursor: pointer;
  transition: border-color var(--t-fast), color var(--t-fast), background-color var(--t-fast);
}

.today-tab:hover {
  border-color: var(--hover-border);
  color: var(--hover-fg);
}
```

- [ ] **Step 2: Update `.today-favorite__btn` transition and hover**

Replace the `.today-favorite__btn` and its `:hover` (lines 284-301) with:

```css
.today-favorite__btn {
  appearance: none;
  background: transparent;
  border: 1px dashed var(--rule);
  border-radius: var(--r-md);
  color: var(--muted);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: var(--fs-tiny);
  letter-spacing: 0.04em;
  padding: 0.35rem var(--s-3);
  transition: border-color var(--t-fast), color var(--t-fast);
}

.today-favorite__btn:hover {
  border-color: var(--hover-border);
  color: var(--hover-fg);
}
```

- [ ] **Step 3: Drop accent-colored focus outline on disclosure summaries**

Remove these blocks entirely:

```css
.intro-summary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--r-sm, 4px);
}
```

and

```css
.intro-item > summary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--r-sm, 4px);
}
```

The base `:focus-visible` rule in `src/styles/base.css` (uses `--focus` token, gold) will apply instead.

Note: the `.intro-summary:hover h2, .intro-summary:focus-visible h2 { color: var(--accent); }` rule and the equivalent for `.intro-item > summary` stay — they color the text, not the outline.

- [ ] **Step 4: Run tests**

Run: `npm test -- Landing`
Expected: All tests pass.

- [ ] **Step 5: Manual visual check**

`npm run dev` → Landing page. Tab through with keyboard:
- Intro summary headings get a gold focus ring (was red).
- Today tab hover: border + text turn red.
- Favorite button hover: dashed border + text turn red.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Landing.css
git commit -m "refactor(landing): use shared hover tokens; unify focus ring"
```

---

## Task 4: Migrate `Admin.css` to state tokens

**Files:**
- Modify: `src/pages/Admin.css`

- [ ] **Step 1: Update `.admin .slot-handle:hover`**

Already uses `--ink` and `--surface-2` — these are correct for the icon variant. Replace the `.admin .slot-row` transition (line 55) and `.admin .slot-handle` block (lines 75-100) to use `--t-fast` where literal durations exist:

```css
.admin .slot-row {
  display: grid;
  grid-template-columns: auto 9rem 1fr auto;
  gap: var(--s-3);
  align-items: end;
  margin: var(--s-3) 0;
  padding: var(--s-3);
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--r-md);
  transition: border-color var(--t-fast), opacity var(--t-fast), transform var(--t-fast);
}
```

Leave `.admin .slot-handle` unchanged (no literal duration to migrate). Verify its `:hover` rule remains:

```css
.admin .slot-handle:hover {
  color: var(--ink);
  background: var(--surface-2);
}
```

- [ ] **Step 2: Update `.admin button` transition and hover**

Replace `.admin button` and its `:hover` (lines 108-125) with:

```css
.admin button {
  height: 44px;
  padding: 0 var(--s-3);
  font-family: var(--font-sans);
  font-size: var(--fs-small);
  font-weight: 500;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--r-md);
  cursor: pointer;
  transition: border-color var(--t-fast), color var(--t-fast), background-color var(--t-fast);
}

.admin button:hover:not(:disabled) {
  border-color: var(--hover-border);
  color: var(--hover-fg);
}
```

- [ ] **Step 3: Update `.admin .save:hover` (primary variant)**

Replace lines 146-150 with:

```css
.admin .save:hover {
  background: var(--press-bg);
  border-color: var(--press-border);
  color: var(--accent-on);
}
```

- [ ] **Step 4: Update `.admin .church-tab` transition and hover**

Replace `.admin .church-tab` and its `:hover` (lines 196-213) with:

```css
.admin .church-tab {
  height: 36px;
  padding: 0 var(--s-3);
  font-family: var(--font-sans);
  font-size: var(--fs-small);
  font-weight: 500;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--r-md);
  cursor: pointer;
  transition: border-color var(--t-fast), color var(--t-fast), background-color var(--t-fast);
}

.admin .church-tab:hover {
  border-color: var(--hover-border);
  color: var(--hover-fg);
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- Admin`
Expected: All tests pass.

- [ ] **Step 6: Manual visual check**

`npm run dev` → `/admin`. Hover: church tabs, add/remove buttons, save button, slot-handle. All variants behave per spec table.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Admin.css
git commit -m "refactor(admin): use shared hover tokens across buttons and tabs"
```

---

## Task 5: Migrate `LetterJumpSheet.css`; drop chip outline override

**Files:**
- Modify: `src/components/LetterJumpSheet.css:43-64`

- [ ] **Step 1: Replace `.letter-sheet__chip` and hover/focus block**

Replace lines 43-64 with:

```css
.letter-sheet__chip {
  min-width: 48px;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--r-md);
  cursor: pointer;
  padding: 0;
  transition: border-color var(--t-fast), color var(--t-fast), background-color var(--t-fast);
}

.letter-sheet__chip:hover {
  border-color: var(--hover-border);
  color: var(--hover-fg);
}
```

Changes vs current:
- Drop combined `:hover, :focus-visible` rule and its `outline: none`. Base `:focus-visible` (from `base.css`) now provides the gold focus ring.
- Add explicit `transition` for hover smoothing.

- [ ] **Step 2: Run tests**

Run: `npm test -- LetterJumpSheet`
Expected: All tests pass.

- [ ] **Step 3: Manual visual check**

`npm run dev` → `/canti`. Tap the letter-jump FAB to open the sheet. Tab between chips — focused chip shows gold ring. Hover (or click) a chip — border + text turn red.

- [ ] **Step 4: Commit**

```bash
git add src/components/LetterJumpSheet.css
git commit -m "refactor(letter-sheet): restore base focus ring; share hover tokens"
```

---

## Task 6: Drop `outline:none` on `.index-group-letter`

**Files:**
- Modify: `src/pages/SongIndex.css:64-68`

- [ ] **Step 1: Split hover and focus rules**

Replace lines 64-68 with:

```css
.index-group-letter:hover {
    color: var(--accent-2);
}
```

The base `:focus-visible` selector in `base.css` will provide the gold focus ring on Tab.

- [ ] **Step 2: Run tests**

Run: `npm test -- SongIndex`
Expected: All tests pass.

- [ ] **Step 3: Manual visual check**

`npm run dev` → `/canti`. Tab through letter headings — each gets a gold focus ring. Hover heading — color shifts from red to deeper red (`--accent-2`).

- [ ] **Step 4: Commit**

```bash
git add src/pages/SongIndex.css
git commit -m "refactor(index): restore base focus ring on letter headings"
```

---

## Task 7: Full regression sweep

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All suites pass.

- [ ] **Step 2: Type check**

Run: `npm run build`
Expected: Build succeeds with no TypeScript or CSS errors.

- [ ] **Step 3: Full manual sweep**

`npm run dev`. Visit each page and verify the hover/focus matrix from the spec:

| Surface | Hover behavior | Focus ring |
|---|---|---|
| Landing → today-tab | border + text → red | gold |
| Landing → favorite btn | dashed border + text → red | gold |
| Landing → intro summary | text → red | gold (was red) |
| SongIndex → search input | — | border red on focus-within (unchanged) |
| SongIndex → letter heading | text → deeper red | gold (was none) |
| SongIndex → list row | text → red | gold |
| SongPage → back link | text → deeper red | gold |
| SongPage → toggle button | border + text → red (was only border) | gold |
| Admin → church tab | border + text → red | gold |
| Admin → button | border + text → red | gold |
| Admin → save | bg + border → deeper red | gold |
| Admin → slot-handle | text → ink, bg → surface-2 | gold |
| LetterJumpSheet → chip | border + text → red | gold (was none) |

- [ ] **Step 4: Final commit (if any leftover changes)**

If everything is clean, no commit needed. Otherwise:

```bash
git status
git add -p
git commit -m "chore(theme): final hover consistency cleanup"
```

---

## Self-review notes

- **Spec coverage:** Each spec section maps to a task. Tokens (Task 1) → SongPage bug (Task 2) → Landing/Admin/LetterSheet/Index migration (Tasks 3-6) → regression sweep (Task 7).
- **No placeholders:** Every CSS block is fully written; every command is concrete.
- **Type/identifier consistency:** Token names (`--t-fast`, `--hover-border`, `--hover-fg`, `--press-bg`, `--press-border`) used identically across all tasks.
- **Out of scope confirmed:** No JSX, no palette, no behavior. Link role distinction stays documented only.
