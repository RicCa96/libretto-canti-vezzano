# Libretto Digitale — Design System v1 (Warm Devotional)

**Date:** 2026-05-28
**Status:** Approved (brainstorming)
**Builds on:** `docs/superpowers/specs/2026-05-27-libretto-digitale-design.md`

## Purpose

Replace the current ad-hoc styling — leftover Vite scaffold tokens, low-contrast
"light on light" headings, and a `prefers-color-scheme: dark` block that fights the
intended cream background — with a coherent design system. The system is "Warm
Devotional": parchment cream, deep maroon, Fraunces italic display, Inter for
everything else, refrains presented with prominence. The goal is a seamless reading
surface so singers can focus on singing.

## Goals

- One source of truth for color, type, spacing, radii, focus, and elevation.
- Every page (landing, index, song, admin) reads as the same product.
- Refrains are visually distinct without being garish; titles feel devotional.
- Form controls and focus styles look intentional, not browser-default.
- Zero functional regressions; all 43 existing tests pass unchanged.

## Non-goals (deferred)

- Dark mode (light-only in v1; a manual toggle is left for a later version).
- Self-hosted fonts (Google Fonts CDN for v1; self-host later).
- Auto-hide / hide-on-scroll behavior for the header or search bar.
- Per-letter jump navigation on the index.
- Visual companion-driven re-mockups of admin — admin reuses the system.

## Design tokens

All tokens live in **`src/styles/tokens.css`** as CSS variables on `:root`.

### Color

```css
/* Surfaces */
--bg:        #fbf6ee;   /* page parchment */
--surface:   #ffffff;   /* card / sheet */
--surface-2: #f3ead7;   /* subtle inset (search field, hover row) */

/* Ink */
--ink:       #1f1410;   /* primary text */
--ink-2:     #3d2c1f;   /* lyric body */
--muted:     #6b513a;   /* secondary text */
--rule:      #e3d4bd;   /* borders / dividers */

/* Brand */
--accent:    #8b1a1a;   /* deep maroon — title accents, refrain label, primary action */
--accent-2:  #a83232;   /* hover */
--accent-on: #ffffff;   /* text on accent */
--focus:     #b8862a;   /* warm gold focus ring */
```

Contrast (WCAG AA on `--bg`):
- `--ink` on `--bg`: ~15:1 — passes AAA.
- `--ink-2` on `--bg`: ~11:1 — passes AAA.
- `--muted` on `--bg`: ~6.5:1 — passes AA for body.
- `--accent` on `--bg`: ~7:1 — passes AA for body and AAA for large text.
- `--accent-on` on `--accent`: ~9:1 — passes AAA.

### Spacing

`--s-1: .25rem; --s-2: .5rem; --s-3: .75rem; --s-4: 1rem; --s-5: 1.5rem; --s-6: 2rem; --s-7: 3rem;`

### Radii

`--r-sm: 4px; --r-md: 8px; --r-pill: 999px;`

### Shadow

`--shadow: 0 1px 2px rgba(31, 20, 16, 0.06);` — used only on cards (intro, today, admin).

### Type

`--font-display: 'Fraunces', Georgia, 'Times New Roman', serif;`
`--font-sans:    'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;`
`--font-mono:    ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, monospace;`

Sizes (rem):
`--fs-display: 2; --fs-display-sm: 1.75; --fs-h2: 1.5; --fs-h3: 1.25; --fs-body: 1; --fs-small: .875; --fs-tiny: .75;`

Lyric body keeps the existing reader-controlled var `--fs-lyric` (set on the song-page
root by the font-size buttons: S=0.95rem, M=1.1rem, L=1.35rem, XL=1.6rem). The hook
and its state are unchanged.

## Typography rules

- **Fraunces (italic by default for titles, upright for section headings):** song
  titles, page headers (`H2`), the wordmark.
- **Inter (400/500/600):** navigation, controls, chips, body lyrics (when not the
  reader-driven `--fs-lyric` flow on the song page), forms, refrain labels, slot
  labels, status text.
- Loaded from Google Fonts via `<link rel="preconnect">` + `<link rel="stylesheet">`
  in `index.html`, with `font-display: swap`. System fallbacks resolve before fonts
  arrive.
- Line heights: 1.5 default, 1.6 for lyric body, 1.05 for display titles.

## Component patterns

### Chip / button (controls + actions)

- Height 32px (square 32×32 for icon-only).
- Radius `--r-md`. Font `--font-sans` 500 / `--fs-small`. Border `1px solid var(--rule)`.
- Variants:
  - **default**: `bg: var(--surface); color: var(--ink);`
  - **pressed** (`aria-pressed="true"`): `bg: var(--accent); color: var(--accent-on); border-color: var(--accent);`
  - **primary** (Save): `bg: var(--accent); color: var(--accent-on); border-color: var(--accent);` — full-width on mobile.
  - **ghost** (Add): `bg: transparent; border-style: dashed;`
- Hover (pointer media): `border-color: var(--accent);` no fill change.
- Transition: `border-color 120ms, background-color 120ms`.

### Search input

- `type="search"`, height 44px, full width.
- `bg: var(--surface-2); border: 1px solid var(--rule); border-radius: var(--r-md);`
- Leading 🔍 inline-SVG icon (16px) inside, color `--muted`, with `padding-inline-start: 2.5rem` on the input.
- Placeholder `--muted`.

### Card

- `bg: var(--surface); border: 1px solid var(--rule); border-radius: var(--r-md);`
- `padding: var(--s-5); box-shadow: var(--shadow);`

### List row (index + today)

- Min height 44px (touch target).
- Padding `var(--s-3) 0`. Bottom rule `1px solid var(--rule)`; last child no rule.
- Hover: `background: var(--surface-2);`
- Anchor inherits color, no underline. Visited = default.

### Refrain block

- Centered text. Inter italic for the refrain lyric lines.
- Label `RITORNELLO` in Inter 600, uppercase, `letter-spacing: 0.22em`, color `--accent`, size `--fs-tiny`, margin-bottom 4px.
- Vertical margins `var(--s-4)` top and bottom.

### Focus

- All interactive elements: `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }`. The default browser blue is removed.

## Per-page application

### Layout (header on every page)

- Sticky: `position: sticky; top: 0; z-index: 10; background: var(--bg);` with a
  1px `--rule` bottom border. Padding `var(--s-3) var(--s-4)`.
- Wordmark: italic Fraunces 1.25rem, color `--ink`, links to `/`.
- Two nav links (Inter `--fs-small` `--muted`) — "Messa di oggi" (`/`) and "Indice"
  (`/canti`). The currently-active route uses `color: var(--accent)` and `text-decoration: underline; text-decoration-thickness: 2px;`.
- On viewports < 640px: nav wraps below the wordmark; on ≥ 640px the nav sits to the
  right of the wordmark.

### Landing (`/`)

- **Intro card**: H2 "Come uso il libretto?" upright Fraunces. Body Inter `--fs-body` `--ink-2`. Final line "Buon canto!" Inter italic.
- **Messa di oggi**: H2 Fraunces `--accent`. Each slot row is a full-row tap target:
  line 1 = tiny `--muted` Inter uppercase slot label; line 2 = Fraunces italic 1.25rem `--ink` song title. Last `updatedAt` rendered Inter tiny `--muted` below the list.
- Empty state ("Nessun canto impostato per oggi") and error state in Inter italic `--muted`.

### Song index (`/canti`)

- Sticky search bar directly under the header (`position: sticky; top: <header-height>;` with `background: var(--bg);` and `padding-block: var(--s-3);` so the underlying list shows through transparency on scroll).
- Letter group header (`H3`) Fraunces upright 1.5rem `--accent`, 1px `--rule` bottom border, top margin `var(--s-5)`.
- List rows per the pattern above.

### Song page (`/canti/:id`)

- Back link "← Indice" Inter `--fs-tiny`, uppercase, `letter-spacing: 0.18em`, color `--accent`.
- Song title Fraunces italic, 2rem on ≥ 640px, 1.75rem on smaller screens, color `--ink`, top margin `var(--s-3)`.
- Controls row (all visible — direction A). All chips per spec, gap `var(--s-2)`, wraps. Three logical groups separated by an invisible spacer (no visible divider, just larger gap `var(--s-3)`):
  - **Accordi** — single toggle, only when `hasChords(song.body)`.
  - **Tono** — `−` / `+` icon chips, only when chords are on.
  - **Testo** — `A−` / `A·` / `A+` icon chips, always.
- Refrain per pattern. Non-refrain lines flush-left, color `--ink-2`, font Inter (the song-body `font-family` switches from the default body to `var(--font-sans)`, since we chose hybrid Fraunces title + Inter body).
- Chord layer (when on): `font-family: var(--font-mono); color: var(--accent); font-weight: 700; font-size: 0.82em;`. Behavior unchanged.

### Admin (`/admin`)

- H2 "Imposta la Messa di oggi" Fraunces upright.
- Labels Inter `--fs-tiny`, uppercase, `--muted`. Inputs/selects height 44px, radius `--r-md`, `bg: var(--surface)`, `border: 1px solid var(--rule)`.
- "+ Aggiungi canto" = ghost chip; "Salva" = primary chip, full-width < 640px.
- Status line below Salva: Inter italic. Color `--accent` when the message starts with "Password errata" / "Errore"; `--muted` otherwise.

## CSS architecture

- **Delete `src/index.css`** (Vite scaffold leftover; source of the rogue `--accent: #aa3bff`, the `color-scheme: light dark` declaration, and the `prefers-color-scheme: dark` block). Remove its import from `src/main.tsx`.
- **Add `src/styles/tokens.css`** — all CSS variables on `:root`, plus `color-scheme: light;` to lock light mode.
- **Add `src/styles/base.css`** — element resets, body defaults (`background`, `color`, `font-family`, `line-height`, `-webkit-font-smoothing`), default `:focus-visible` ring, default link color.
- **Keep `src/styles/app.css`** — Layout/header rules only; everything else stays in component-scoped CSS files.
- **Import order in `src/main.tsx`:** `tokens.css` → `base.css` → `App` (which imports `app.css` and which pulls in per-component CSS via the page/component modules). This guarantees tokens resolve before any consumer.
- Per-component CSS files (`SongBody.css`, `SongPage.css`, `SongIndex.css`, `Landing.css`, `Admin.css`) are rewritten to consume the new tokens. No hand-rolled hex values remain in them.

## Markup changes

- `Layout.tsx`: keep current structure; add `aria-current="page"` via React Router's `NavLink` (replacing `Link` for the nav items only) so active-route styling can hang on a real attribute.
- `SongIndex.tsx`: wrap the existing `<input type="search">` in a small `<label>` flex container that holds the inline icon; keep the existing `aria-label="Cerca un canto"` and `role="searchbox"` behaviors so the search test (`screen.getByRole('searchbox')`) still finds it.
- `SongPage.tsx`: update control labels — "Accordi on/off" stays (test asserts on `/accordi/i` and on its absence when chord-free); transpose buttons keep `aria-label="Abbassa tono"` / `aria-label="Alza tono"`; font-size buttons keep their existing aria-labels. No structural test impact.

## Implementation scope

**In scope:**
1. Replace `src/index.css` with `tokens.css` + `base.css`.
2. Update `main.tsx` imports.
3. Add Fraunces + Inter via `<link>` tags in `index.html` (preconnect + stylesheet).
4. Rewrite every CSS file under `src/` to use the tokens. No hand-rolled colors remain.
5. Replace `Link` with `NavLink` in `Layout.tsx`.
6. Add the inline search-icon wrapper in `SongIndex.tsx`.
7. Verify `npm test` (43/43) and `npm run build` still pass after each commit.

**Not in scope:**
- No changes to `src/lib/*`, `src/hooks/*`, `src/data/*`, `api/*`, `scripts/*`.
- No new components beyond a tiny inline `SearchIcon` SVG in `SongIndex.tsx`.
- No new tests; the visual restyle is verified by manual review and the existing test suite passing.

## Open questions

None. All deferred items are listed under "Not in scope" with rationale.
