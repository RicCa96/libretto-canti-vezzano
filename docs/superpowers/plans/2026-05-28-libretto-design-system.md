# Libretto Design System v1 (Warm Devotional) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the "Warm Devotional" design system (parchment cream + deep maroon, Fraunces italic display + Inter body) across all four pages by replacing the leftover Vite scaffold CSS with a coherent token-driven system. No functional changes.

**Architecture:** Add `src/styles/tokens.css` (CSS variables — color, type, spacing, radii, shadow) and `src/styles/base.css` (element resets + global defaults + focus ring). Delete `src/index.css` (the source of the rogue purple accent and the `prefers-color-scheme: dark` block that fights the cream background). Rewrite every per-component CSS file to consume the tokens. Load Fraunces + Inter from Google Fonts in `index.html`. Tiny markup tweaks where the spec calls for them (NavLink for active-route styling, a wrapped search input with a leading icon, an `<em>` on "Buon canto!").

**Tech Stack:** Vanilla CSS (no preprocessor, no Tailwind), React Router v7 `NavLink`, Google Fonts CDN.

**Constraints to respect:**
- No changes to `src/lib/*`, `src/hooks/*`, `src/data/*`, `api/*`, or `scripts/*`.
- The existing 43 tests must keep passing unchanged. They use semantic queries (`getByRole`, `getByText`) and never depend on class names or pixel values.
- `tsconfig.app.json` has `verbatimModuleSyntax: true` (`import type` for type-only imports) and `allowImportingTsExtensions: true` (import siblings with `.tsx`/`.ts`).

**Visual verification:** After Task 1 and again after Task 7, run `npm run dev` and open `http://localhost:5173/`, `/canti`, a song page, and `/admin` to eyeball the result. This plan does not add visual regression tests.

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `index.html` | Modify | Add Google Fonts `<link>` tags + update `<title>` |
| `src/index.css` | Delete | Remove leftover Vite scaffold tokens (rogue accent + dark-mode block) |
| `src/main.tsx` | Modify | Swap `index.css` import for `tokens.css` + `base.css` |
| `src/styles/tokens.css` | Create | All CSS variables; `color-scheme: light` |
| `src/styles/base.css` | Create | Element resets, body defaults, focus-visible ring |
| `src/styles/app.css` | Rewrite | Sticky header rules; `main` container; uses tokens |
| `src/components/Layout.tsx` | Modify | Replace `Link` with `NavLink` for the two nav items |
| `src/components/SongBody.tsx` | Modify | Walk parsed lines to mark refrain-body lyric lines (presentational only) |
| `src/components/SongBody.css` | Rewrite | New refrain label + body styling; chord layer color/font |
| `src/pages/SongPage.tsx` | Modify | Change back-link text "← Torna all'indice dei canti" → "← Indice" |
| `src/pages/SongPage.css` | Rewrite | Title styling, chip buttons, controls layout, back link |
| `src/pages/SongIndex.tsx` | Modify | Wrap the search input in a label with a leading 🔍 inline SVG |
| `src/pages/SongIndex.css` | Rewrite | Sticky search bar, letter group headers, list rows |
| `src/pages/Landing.tsx` | Modify | Wrap "Buon canto!" in `<em>`; no other content change |
| `src/pages/Landing.css` | Rewrite | Intro card, today list rows, label + title pairs |
| `src/pages/Admin.css` | Rewrite | Form rows, primary/ghost chips, status line |

---

## Task 1: Tokens, base CSS, fonts, scaffold cleanup

**Files:**
- Modify: `index.html`
- Delete: `src/index.css`
- Modify: `src/main.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/styles/base.css`

- [ ] **Step 1: Add Google Fonts links and update title in `index.html`**

Replace the entire `<head>` block of `index.html` with:

```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Libretto Digitale dei Canti</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500;1,9..144,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
```

- [ ] **Step 2: Create `src/styles/tokens.css`**

```css
:root {
  color-scheme: light;

  /* Surfaces */
  --bg:        #fbf6ee;
  --surface:   #ffffff;
  --surface-2: #f3ead7;

  /* Ink */
  --ink:       #1f1410;
  --ink-2:     #3d2c1f;
  --muted:     #6b513a;
  --rule:      #e3d4bd;

  /* Brand */
  --accent:    #8b1a1a;
  --accent-2:  #a83232;
  --accent-on: #ffffff;
  --focus:     #b8862a;

  /* Spacing */
  --s-1: 0.25rem;
  --s-2: 0.5rem;
  --s-3: 0.75rem;
  --s-4: 1rem;
  --s-5: 1.5rem;
  --s-6: 2rem;
  --s-7: 3rem;

  /* Radii */
  --r-sm: 4px;
  --r-md: 8px;
  --r-pill: 999px;

  /* Shadow */
  --shadow: 0 1px 2px rgba(31, 20, 16, 0.06);

  /* Type */
  --font-display: 'Fraunces', Georgia, 'Times New Roman', serif;
  --font-sans:    'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono:    ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, monospace;

  --fs-display:    2rem;
  --fs-display-sm: 1.75rem;
  --fs-h2:         1.5rem;
  --fs-h3:         1.25rem;
  --fs-body:       1rem;
  --fs-small:      0.875rem;
  --fs-tiny:       0.75rem;

  /* Reader-controlled lyric size (default; song page overrides inline) */
  --fs-lyric: 1.1rem;

  /* Layout */
  --maxw: 44rem;
}
```

- [ ] **Step 3: Create `src/styles/base.css`**

```css
* {
  box-sizing: border-box;
}

html {
  font-size: 16px;
}

body {
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--fs-body);
  line-height: 1.5;
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

a {
  color: var(--accent);
}
a:hover {
  color: var(--accent-2);
}

button {
  font: inherit;
}

:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
  border-radius: var(--r-sm);
}
```

- [ ] **Step 4: Swap imports in `src/main.tsx`**

Replace the entire file with:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: Delete `src/index.css`**

```bash
git rm src/index.css
```

- [ ] **Step 6: Verify tests + build are still green**

Run: `npm test`
Expected: 13 files, 43 tests passing.

Run: `npm run build`
Expected: builds cleanly, no errors.

- [ ] **Step 7: Commit**

```bash
git add index.html src/main.tsx src/styles/
git commit -m "feat(ui): add design tokens, base CSS, and Google Fonts"
```

---

## Task 2: Sticky header + active-route nav

**Files:**
- Modify: `src/components/Layout.tsx`
- Rewrite: `src/styles/app.css`

- [ ] **Step 1: Replace `src/components/Layout.tsx`**

```tsx
import { NavLink, Link, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <>
      <header className="app-header">
        <Link to="/" className="app-header__brand">
          <h1>Libretto dei Canti</h1>
        </Link>
        <nav className="app-header__nav">
          <NavLink to="/" end>
            Messa di oggi
          </NavLink>
          <NavLink to="/canti">Indice</NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  )
}
```

`NavLink` automatically sets `aria-current="page"` on the active route, which the CSS hooks onto. `end` on the `/` link ensures it isn't matched while you're at `/canti`.

- [ ] **Step 2: Rewrite `src/styles/app.css` end-to-end**

```css
.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg);
  border-bottom: 1px solid var(--rule);
  padding: var(--s-3) var(--s-4);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--s-2) var(--s-4);
}

.app-header__brand,
.app-header a {
  color: inherit;
  text-decoration: none;
}

.app-header h1 {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 500;
  font-size: var(--fs-h3);
  margin: 0;
  color: var(--ink);
}

.app-header__nav {
  display: flex;
  gap: var(--s-4);
  font-size: var(--fs-small);
}

.app-header__nav a {
  color: var(--muted);
}

.app-header__nav a[aria-current='page'] {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
}

@media (max-width: 640px) {
  .app-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--s-2);
  }
}

main {
  max-width: var(--maxw);
  margin: 0 auto;
  padding: var(--s-4);
}
```

- [ ] **Step 3: Verify tests**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS (Layout still renders "Libretto dei Canti" and the `<Outlet>` child).

Run: `npm test`
Expected: 43 tests passing.

- [ ] **Step 4: Commit**

```bash
git add src/components/Layout.tsx src/styles/app.css
git commit -m "feat(ui): sticky header with active-route NavLink"
```

---

## Task 3: SongBody — refrain block + chord layer styling

**Files:**
- Modify: `src/components/SongBody.tsx`
- Rewrite: `src/components/SongBody.css`

The parser still emits `refrain-label` only for the literal "RIT." line. To give the *following* refrain body lines visual emphasis (centered + italic until the next blank), we annotate them in the renderer — no parser change, purely presentational.

- [ ] **Step 1: Replace `src/components/SongBody.tsx`**

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

  // Annotate lyric lines that fall inside a refrain block (from a refrain-label
  // line up to the next blank line). Purely presentational; the parser is unchanged.
  let inRefrain = false
  const decorated = lines.map((line) => {
    if (line.type === 'blank') {
      inRefrain = false
      return { line, inRefrain: false as const }
    }
    if (line.type === 'refrain-label') {
      inRefrain = true
      return { line, inRefrain: false as const }
    }
    return { line, inRefrain }
  })

  return (
    <div className="song-body">
      {decorated.map(({ line, inRefrain: isRefrainBody }, i) => {
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
        const lineClass = isRefrainBody
          ? 'song-line song-line--refrain-body'
          : 'song-line'
        return (
          <div key={i} className={lineClass}>
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

- [ ] **Step 2: Rewrite `src/components/SongBody.css`**

```css
.song-body {
  font-family: var(--font-sans);
  font-size: var(--fs-lyric);
  color: var(--ink-2);
  line-height: 1.6;
}

.song-line {
  margin: 0.15rem 0;
}

.song-line--blank {
  height: 0.6rem;
}

.song-line--refrain {
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: var(--fs-tiny);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
  margin: var(--s-4) 0 var(--s-1);
  text-align: center;
}

.song-line--refrain-body {
  text-align: center;
  font-style: italic;
  color: var(--ink);
}

.seg {
  display: inline-flex;
  flex-direction: column;
  vertical-align: bottom;
}

.seg__chord {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--accent);
  font-size: 0.82em;
  line-height: 1;
  min-height: 1em;
  white-space: pre;
}

.seg__text {
  white-space: pre;
}
```

- [ ] **Step 3: Verify SongBody tests still pass**

Run: `npx vitest run src/components/SongBody.test.tsx`
Expected: PASS (4 tests). The tests use `getByText`, which is unaffected by classnames or transforms.

Run: `npm test`
Expected: 43 tests passing.

- [ ] **Step 4: Commit**

```bash
git add src/components/SongBody.tsx src/components/SongBody.css
git commit -m "feat(ui): style refrain block and chord layer"
```

---

## Task 4: Song page — title, back link, chip controls

**Files:**
- Modify: `src/pages/SongPage.tsx` (back-link text only)
- Rewrite: `src/pages/SongPage.css`

- [ ] **Step 1: Update the back-link text in `src/pages/SongPage.tsx`**

In both places where it appears, replace `← Torna all'indice dei canti` with `← Indice`. After the edit, the two `<Link className="song-back" to="/canti">` lines read:

```tsx
<Link className="song-back" to="/canti">
  ← Indice
</Link>
```

Leave every other line of the file unchanged. The test asserts `getByRole('link', { name: /indice/i })` and the not-found message asserts `/non trovato/i` — both still match.

- [ ] **Step 2: Rewrite `src/pages/SongPage.css`**

```css
.song-back {
  display: inline-block;
  margin: var(--s-2) 0 var(--s-3);
  font-family: var(--font-sans);
  font-size: var(--fs-tiny);
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
  text-decoration: none;
}
.song-back:hover {
  color: var(--accent-2);
}

.song-title {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 600;
  font-size: var(--fs-display);
  line-height: 1.05;
  color: var(--ink);
  margin: var(--s-3) 0 var(--s-2);
}

@media (max-width: 640px) {
  .song-title {
    font-size: var(--fs-display-sm);
  }
}

.song-controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  align-items: center;
  margin: var(--s-3) 0 var(--s-5);
}

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
  transition: background-color 120ms, border-color 120ms, color 120ms;
}

@media (hover: hover) {
  .song-controls button:hover {
    border-color: var(--accent);
  }
}

.song-controls button[aria-pressed='true'] {
  background: var(--accent);
  color: var(--accent-on);
  border-color: var(--accent);
}

.song-controls .group {
  display: inline-flex;
  align-items: center;
  gap: var(--s-1);
  margin-left: var(--s-2);
}

.song-controls .group > span {
  color: var(--muted);
  font-size: var(--fs-tiny);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-right: var(--s-1);
}
```

- [ ] **Step 3: Verify SongPage tests still pass**

Run: `npx vitest run src/pages/SongPage.test.tsx`
Expected: PASS (3 tests).

Run: `npm test`
Expected: 43 tests passing.

- [ ] **Step 4: Commit**

```bash
git add src/pages/SongPage.tsx src/pages/SongPage.css
git commit -m "feat(ui): restyle song page title and chip controls"
```

---

## Task 5: Song index — sticky search with leading icon, letter headers

**Files:**
- Modify: `src/pages/SongIndex.tsx`
- Rewrite: `src/pages/SongIndex.css`

- [ ] **Step 1: Replace `src/pages/SongIndex.tsx`**

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

The diacritic regex uses ASCII unicode escapes (`̀-ͯ`); do not paste literal combining characters.

- [ ] **Step 2: Rewrite `src/pages/SongIndex.css`**

```css
.index-search {
  position: sticky;
  top: 4rem; /* sits below the sticky header on >640px; harmless when header wraps */
  z-index: 5;
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: 0 var(--s-3);
  height: 44px;
  background: var(--surface-2);
  border: 1px solid var(--rule);
  border-radius: var(--r-md);
  margin: var(--s-3) 0 var(--s-4);
}

.index-search__icon {
  color: var(--muted);
  flex-shrink: 0;
}

.index-search__input {
  flex: 1;
  border: 0;
  background: transparent;
  font-family: var(--font-sans);
  font-size: var(--fs-body);
  color: var(--ink);
  outline: none;
  padding: 0;
}

.index-search__input::placeholder {
  color: var(--muted);
}

.index-search:focus-within {
  border-color: var(--accent);
}

.index-empty {
  color: var(--muted);
  font-style: italic;
  margin-top: var(--s-4);
}

.index-group-letter {
  font-family: var(--font-display);
  font-style: normal;
  font-weight: 600;
  font-size: var(--fs-h2);
  color: var(--accent);
  margin: var(--s-5) 0 var(--s-2);
  padding-bottom: var(--s-1);
  border-bottom: 1px solid var(--rule);
}

.index-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.index-list li {
  border-bottom: 1px solid var(--rule);
}

.index-list li:last-child {
  border-bottom: 0;
}

.index-list a {
  display: block;
  padding: var(--s-3) 0;
  font-family: var(--font-sans);
  font-weight: 500;
  color: var(--ink);
  text-decoration: none;
  min-height: 44px;
}

.index-list a:hover {
  color: var(--accent);
}
```

- [ ] **Step 3: Verify SongIndex tests still pass**

Run: `npx vitest run src/pages/SongIndex.test.tsx`
Expected: PASS (3 tests). `getByRole('searchbox')` still finds the `<input type="search">` inside the new wrapper.

Run: `npm test`
Expected: 43 tests passing.

- [ ] **Step 4: Commit**

```bash
git add src/pages/SongIndex.tsx src/pages/SongIndex.css
git commit -m "feat(ui): restyle song index with sticky search and letter headers"
```

---

## Task 6: Landing — intro card, today list

**Files:**
- Modify: `src/pages/Landing.tsx` (wrap "Buon canto!" in `<em>`)
- Rewrite: `src/pages/Landing.css`

- [ ] **Step 1: Replace `src/pages/Landing.tsx`**

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
          Sotto al titolo di ogni canto trovi il link "← Indice" per tornare
          indietro. <em>Buon canto!</em>
        </p>
      </section>

      <section className="today">
        <h2>La Messa di oggi</h2>
        {error && (
          <p className="today-message">
            Impossibile caricare i canti di oggi. Riprova più tardi.
          </p>
        )}
        {!error && today === null && <p className="today-message">Caricamento…</p>}
        {!error && today !== null && today.slots.length === 0 && (
          <p className="today-message">Nessun canto impostato per oggi.</p>
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
                      <Link className="slot-title" to={`/canti/${song.id}`}>
                        {song.title}
                      </Link>
                    ) : (
                      <span className="slot-title">{slot.songId}</span>
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

- [ ] **Step 2: Rewrite `src/pages/Landing.css`**

```css
.intro {
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--r-md);
  padding: var(--s-5);
  box-shadow: var(--shadow);
  margin-bottom: var(--s-5);
}

.intro h2 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--fs-h2);
  color: var(--ink);
  margin: 0 0 var(--s-3);
}

.intro p {
  color: var(--ink-2);
  margin: var(--s-2) 0;
}

.intro em {
  font-family: var(--font-display);
  font-style: italic;
  color: var(--accent);
}

.today h2 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--fs-h2);
  color: var(--accent);
  margin: 0 0 var(--s-3);
}

.today-message {
  color: var(--muted);
  font-style: italic;
}

.today-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.today-list li {
  padding: var(--s-3) 0;
  border-bottom: 1px solid var(--rule);
}

.today-list li:last-child {
  border-bottom: 0;
}

.slot-label {
  display: block;
  font-size: var(--fs-tiny);
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.16em;
  margin-bottom: var(--s-1);
}

.slot-title {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 500;
  font-size: var(--fs-h3);
  color: var(--ink);
  text-decoration: none;
}

a.slot-title:hover {
  color: var(--accent);
}

.today-updated {
  color: var(--muted);
  font-size: var(--fs-tiny);
  margin-top: var(--s-3);
}
```

- [ ] **Step 3: Verify Landing tests still pass**

Run: `npx vitest run src/pages/Landing.test.tsx`
Expected: PASS (3 tests). `getByText(/Come uso il libretto/i)`, `getByText('Inizio')`, the `EUCARISTIA` link's `href`, and `getByText(/nessun canto.*oggi/i)` all still match.

Run: `npm test`
Expected: 43 tests passing.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Landing.tsx src/pages/Landing.css
git commit -m "feat(ui): restyle landing page and Messa di oggi"
```

---

## Task 7: Admin — forms, primary/ghost buttons, status line

**Files:**
- Rewrite: `src/pages/Admin.css`

No `Admin.tsx` change is needed — the existing markup carries enough class hooks.

- [ ] **Step 1: Rewrite `src/pages/Admin.css`**

```css
.admin h2 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--fs-h2);
  color: var(--ink);
  margin: 0 0 var(--s-4);
}

.admin label {
  display: block;
  font-family: var(--font-sans);
  font-size: var(--fs-tiny);
  font-weight: 500;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin: var(--s-3) 0 var(--s-1);
}

.admin input,
.admin select {
  width: 100%;
  height: 44px;
  padding: 0 var(--s-3);
  font-family: var(--font-sans);
  font-size: var(--fs-body);
  color: var(--ink);
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--r-md);
}

.admin input:focus,
.admin select:focus {
  border-color: var(--accent);
}

.admin .slot-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  align-items: end;
  margin: var(--s-3) 0;
  padding: var(--s-3);
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--r-md);
}

.admin .slot-row > div {
  min-width: 0;
}

.admin .slot-row select {
  flex: 1;
  min-width: 0;
}

.admin button {
  height: 36px;
  padding: 0 var(--s-3);
  font-family: var(--font-sans);
  font-size: var(--fs-small);
  font-weight: 500;
  color: var(--ink);
  background: var(--surface);
  border: 1px dashed var(--rule);
  border-radius: var(--r-md);
  cursor: pointer;
  transition: border-color 120ms, color 120ms, background-color 120ms;
}

.admin button:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.admin .save {
  height: 44px;
  margin-top: var(--s-4);
  padding: 0 var(--s-5);
  background: var(--accent);
  color: var(--accent-on);
  border: 1px solid var(--accent);
  font-weight: 600;
}

.admin .save:hover {
  background: var(--accent-2);
  border-color: var(--accent-2);
  color: var(--accent-on);
}

@media (max-width: 640px) {
  .admin .save {
    width: 100%;
  }
}

.admin .status {
  margin-top: var(--s-3);
  font-style: italic;
  color: var(--muted);
}
```

- [ ] **Step 2: Verify Admin test still passes**

Run: `npx vitest run src/pages/Admin.test.tsx`
Expected: PASS (1 test).

Run: `npm test`
Expected: 13 files, 43 tests passing.

Run: `npm run build`
Expected: builds cleanly.

- [ ] **Step 3: Manual visual check**

Run `npm run dev` and open in a browser:
- `http://localhost:5173/` — sticky header, intro card, Messa di oggi list (empty state OK)
- `http://localhost:5173/canti` — sticky search bar with leading icon, A–Z letter headers in Fraunces maroon
- `http://localhost:5173/canti/eucaristia` — Fraunces italic title, font-size chips, no chord toggle (chord-free song), centered RIT. label
- `http://localhost:5173/admin` — password field, dashed "Aggiungi" ghost chip, maroon "Salva" pill

Confirm no light-on-light text and no purple anywhere.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Admin.css
git commit -m "feat(ui): restyle admin page"
```

---

## Done

All seven tasks complete. `npm test` and `npm run build` both green; every page now consumes the same token set; the Vite-scaffold dark-mode bug is gone.
