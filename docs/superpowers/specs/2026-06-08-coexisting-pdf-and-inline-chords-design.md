# Coexisting PDF Sheets and Inline ChordPro Chords

## Problem

`SongPage.tsx` currently treats PDF sheet music and inline ChordPro chords as
mutually exclusive. If a song id appears in `src/data/chord-ids.json`, the
"Accordi on" button swaps directly to the PDF viewer, and any chord brackets
present in the song `body` are never rendered.

This blocks the workflow where guitar chords are written by hand inline in
`body` while a separately authored PDF (piano, brass, etc.) is also available
for the same song.

## Goal

Let inline chords and PDF sheets coexist on the same song. When both exist,
the user can choose between three views: plain lyrics, inline guitar chords,
or the PDF sheet. When only one (or neither) exists, the UI degrades to the
simpler control shape it has today.

## Non-goals

- No support for multiple PDFs per song (one piano sheet per song is enough
  for now).
- No data-format change to `Song`, the JSON song files, or
  `chord-ids.json` — `chord-ids.json` remains the PDF allowlist.
- No persistence of the chosen view across navigations or sessions.
- No change to the PDF asset pipeline (`public/chords/<id>.pdf`).

## Design

### View state

Replace the boolean `chordsOn` in `src/pages/SongPage.tsx` with a single
discriminated state:

```ts
type View = 'text' | 'chords' | 'pdf'
```

Default value: `'text'`. View resets to `'text'` on navigation between songs
(natural consequence of `useState` per-route).

Derived per song:

- `hasInline = hasChords(song.body)` — already exposed by
  `src/lib/chordpro.ts`.
- `hasPdf = chordPdfIds.has(song.id)` — already computed from
  `chord-ids.json`.

### Control rendering

The control bar branches on `(hasInline, hasPdf)`:

| inline | pdf  | Control                                                          |
| ------ | ---- | ---------------------------------------------------------------- |
| no     | no   | no view toggle (current behavior)                                |
| yes    | no   | single button: "Accordi on/off" — toggles `text` ↔ `chords`      |
| no     | yes  | single button: "Spartito on/off" — toggles `text` ↔ `pdf`        |
| yes    | yes  | segmented control: **Testo / Accordi / Spartito**                |

Adjacent controls follow the active view:

- Transpose (`Tono − +`) shown only when `view === 'chords'`.
- Font size (S/M/L) shown when `view !== 'pdf'` (PDF has its own sizing).

### Body rendering

- `view === 'pdf'` → `<object data="/chords/<id>.pdf">` block (unchanged from
  current PDF branch).
- otherwise → `<SongBody body={song.body} chordsOn={view === 'chords'}
  transpose={transpose} />`.

### Accessibility

The 3-way segmented control uses `<button>` elements with
`aria-pressed={view === '<value>'}`, matching the existing toggle pattern.
Single-button cases keep the existing `aria-pressed` semantics. No
`role="tablist"` — these select a view of the same content, not separate tab
panels.

## Files touched

- `src/pages/SongPage.tsx` — state + control logic.
- `src/pages/SongPage.test.tsx` — new test cases.

No other source files change. `chord-ids.json`, `SongBody.tsx`, `chordpro.ts`,
and CSS files are untouched (the existing `.song-controls .group` and button
styles cover the new segmented control).

## Test plan

`src/pages/SongPage.test.tsx` additions:

1. **Both inline + pdf** — render a song id present in `chord-ids.json` whose
   body also contains ChordPro brackets. Assert:
   - All three buttons (Testo, Accordi, Spartito) are present.
   - Default view is Testo: `<SongBody>` renders, no `<object>`.
   - Click Accordi → chord spans appear, no PDF.
   - Click Spartito → `<object data="/chords/<id>.pdf">` appears, transpose
     and font-size groups are gone.
   - Click Testo → back to lyrics-only.
2. **Transpose visibility** — assert transpose `−`/`+` buttons appear only
   when Accordi is active.
3. **Inline only** — song with chord brackets, id NOT in `chord-ids.json`:
   single "Accordi on/off" button toggles `text` ↔ `chords` (regression of
   current behavior).
4. **PDF only** — song id in `chord-ids.json`, body without brackets: single
   "Spartito on/off" button toggles `text` ↔ `pdf` (regression).
5. **Neither** — no toggle button rendered (regression).

## Migration

None required. The change is purely a render-time branch on data that is
already present. Songs gain the 3-way control automatically when their `body`
gains chord brackets AND their id is listed in `chord-ids.json`.
