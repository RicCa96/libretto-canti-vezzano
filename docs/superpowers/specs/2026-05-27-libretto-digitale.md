# Libretto Digitale dei Canti — Design

**Date:** 2026-05-27
**Status:** Approved (brainstorming)

## Purpose

Replace the parish songbook Word document (`docs/libretto.docx`, 183 songs) with a
smart website. People scan QR codes placed around the church and sing along during
celebrations. The website keeps the document's three sections — a landing page with
usage instructions and "La Messa di oggi", an alphabetical index, and one page per
song — and adds one new capability: **toggleable chords** so musicians and singers
use the same tool.

## Goals

- Mostly-text app: minimal dependencies, fast on phones, robust on poor church wifi.
- Singers' experience stays trivially light — essentially a static text app.
- Chords are optional per song, added over time, and rendered above the lyric line
  when toggled on.
- "La Messa di oggi" is editable without redeploying the site, via a password-gated
  in-app admin page.

## Non-goals (deferred)

- Offline / PWA support (service worker, install). Deferred to a later version.
- Per-user accounts (a single shared admin password is enough for one maintainer).
- A CMS for song lyrics (songs are bundled and edited in the repo).

## Stack & architecture

- **Vite + React 19 + TypeScript** (existing scaffold).
- **React Router** for client routing — the one small library worth adding.
- Hand-written CSS, no UI framework.
- **Static SPA** deployed on **Vercel**. All 183 songs are bundled as data, so song
  reads are instant and need no network.
- **One serverless function** `api/today.ts` is the only server-side, network-dependent
  piece: `GET` returns today's set, `POST` (password-gated) updates it.
- **Store:** Upstash KV (via Vercel Marketplace) holding a single `today` record.
  Vercel Blob is an acceptable fallback if KV setup is problematic.
- **Bundle discipline:** no auth or database SDK ships to the client. The privileged
  work happens in the function. The `/admin` route is lazy-loaded so its code never
  enters the singer bundle.

## Data model

### Songs (bundled, source of truth)

```ts
type Song = {
  id: string;    // slug, e.g. "a-te-vorrei-dire"
  title: string; // "A TE VORREI DIRE"
  body: string;  // ChordPro text; [C] chords inline; "RIT." marks a refrain line
};
```

- `hasChords` is **derived**: `body` contains a `[` chord bracket.
- Stored as `src/data/songs/<id>.json`, one file per song (easy single-song edits,
  clean diffs).
- `src/data/songs/index.ts` imports all songs into a title-sorted array plus a
  `Map<string, Song>` keyed by `id`.

### Today's set (KV, edited via admin)

```ts
type TodaySet = {
  updatedAt: string;                            // ISO timestamp
  slots: { label: string; songId: string }[];   // default labels: Inizio, Offertorio, Comunione, Fine
};
```

- A flexible ordered list, not a fixed four, so the maintainer can add Gloria/Salmo,
  reorder, or leave it short.

## Routes & pages

| Route | Page |
|---|---|
| `/` | **Landing** — "Come uso il libretto?" instructions + **La Messa di oggi** (fetched from `/api/today`, each slot links to its song). |
| `/canti` | **Index** — A–Z grouped list with a **search box** that filters by title. |
| `/canti/:id` | **Song** — title, "← Torna all'indice" back-link, lyrics, plus **chord toggle**, **transpose**, and **font-size** controls. |
| `/admin` | **Admin** — password login → pick slots/songs → save. Lazy-loaded route. |

QR codes point at the root URL; all other navigation happens in-app.

## Chord rendering, transpose, display controls

### Parser

`parseChordPro(body)` turns ChordPro text into structured lines. Each line becomes a
list of `{ chord?: string; text: string }` segments plus a line type
(`lyric` | `refrain-label` | `blank`). `RIT.` lines are flagged as refrain labels;
refrain blocks get a left accent bar.

### Render (style A — chords above the line)

For each lyric line, emit two stacked rows: a monospace chord row aligned over the
lyric row. The chord row is rendered **only** when chords are on. Toggling off omits
the chord row entirely (no reflow surprises).

### Toggle

The chord button is shown only when `hasChords` is true. Songs without chords render
lyrics only, with no toggle.

### Transpose

A pure function `transpose(chord, semitones)` over the 12-note (sharp) scale. Handles
minors (`Am`), sevenths (`C7`), sharps/flats (`F#m`, `Bb`), and slash chords
(`D/F#` — transpose both sides). The reader adjusts by ±1 semitone; transpose state
lives on the song page and resets on navigation. It affects display only and never
mutates stored data.

### Font-size

Three to four steps (S/M/L/XL) applied via a CSS variable on the reader, **persisted
in `localStorage`** so a singer sets it once. Applies to lyric text.

## Admin, function & store

### `api/today.ts` (Vercel serverless function)

- `GET` → reads the `today` key from KV and returns JSON with `Cache-Control: no-store`
  so visitors always get the current set.
- `POST` → checks the `x-admin-password` header against the `ADMIN_PASSWORD` env var;
  validates the payload (every `songId` must exist in a bundled id allowlist); writes
  KV on success. Rejects with 401 on bad password and 400 on invalid payload.

### `/admin` page

- A password field (kept in memory only, never persisted).
- A per-slot song picker (dropdowns sourced from the bundled song list); slots can be
  added/removed/reordered.
- Save issues the `POST`. The page shows the last `updatedAt`.
- Lazy-loaded so its code never enters the singer bundle.

### Secrets

`ADMIN_PASSWORD` and the Upstash credentials live in Vercel environment variables,
never in the repository.

## Content migration (docx → songs)

A one-time, re-runnable Node script `scripts/import-docx.ts`:

1. Parse `docs/libretto.docx` `word/document.xml` by paragraph **runs** (proper run
   handling fixes the `RIT.` text-glue artifact seen during exploration).
2. Split on `Heading1` = song title; skip the landing and index sections.
3. Slugify the title into `id`; collect lyric lines into `body`; mark `RIT.` lines as
   refrains. No chords are added (those are added by hand later).
4. Write `src/data/songs/<id>.json` for all 183 songs.

Verified by manual spot-check of a sample (encoding, accents, refrains), not by CI.

## Testing

- **Unit (Vitest), TDD:** `parseChordPro`, `transpose` (minors, sevenths, slash chords,
  octave wrap-around), `slugify`, today-set payload validation.
- **Component (React Testing Library):** chord toggle shows/hides chords, transpose
  updates the display, search filters the index, font-size persists across reloads.
- **Function:** `api/today` `POST` rejects bad password and unknown `songId`; `GET`
  returns the expected shape.
- **Migration script:** verified by spot-check, not asserted in CI.

## Open questions

None blocking. Chord data is added incrementally after launch; the app must behave
correctly for songs that have no chords yet.
