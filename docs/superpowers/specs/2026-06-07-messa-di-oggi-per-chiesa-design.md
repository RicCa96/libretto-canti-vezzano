# Messa di oggi — songlist per church

**Date:** 2026-06-07
**Status:** Approved (pending spec review)

## Summary

Split the "Messa di oggi" section into one songlist per church. Churches are a fixed, code-defined list of five: `Vezzano`, `Puianello`, `Montalto`, `Pecorile`, `La Vecchia`. The admin page edits each church's list independently; the landing page renders all five lists stacked.

## Motivation

The libretto is used across five churches in the same parish. They share the song catalog but choose different songs for each mass. The current single-list model forces a choice between one church's songs and leaves the others unserved. Each church needs its own current-mass songlist on a single shared landing page.

## Non-goals

- Per-user church selection or favourites.
- Per-church `updatedAt` timestamps or partial saves.
- Configurable church list via environment variable or admin UI.
- Migration of existing Redis data into one specific church bucket.

## Architecture

Single Redis key `today` stores the full payload for all five churches. One GET on landing, one POST on admin save, both atomic.

### Static churches list

New module `src/lib/churches.ts`:

```ts
export const CHURCHES = [
  'Vezzano',
  'Puianello',
  'Montalto',
  'Pecorile',
  'La Vecchia',
] as const

export type Church = (typeof CHURCHES)[number]
```

Single source of truth, imported by `api/today.ts`, `src/pages/Landing.tsx`, `src/pages/Admin.tsx`, and `src/lib/todaySchema.ts`.

### Schema (`src/lib/todaySchema.ts`)

```ts
import { CHURCHES, type Church } from './churches'

export type Slot = { label: string; songId: string }
export type TodaySet = {
  updatedAt: string
  churches: Record<Church, Slot[]>
}
```

`validateTodayPayload(payload, validIds)` returns:
- `{ ok: false, error }` if `payload` is not an object.
- `{ ok: false, error }` if `payload.churches` is not an object.
- `{ ok: false, error }` if any key in `payload.churches` is not in `CHURCHES`.
- `{ ok: false, error }` if any name in `CHURCHES` is missing from `payload.churches`.
- `{ ok: false, error }` if any value is not an array of valid `Slot`s (existing per-slot validation: non-empty `label`, `songId` ∈ `validIds`).
- `{ ok: true, value: { churches } }` on success, where `churches` contains exactly the five canonical keys.

### API (`api/today.ts`)

- `EMPTY` constant builds `{ updatedAt: '', churches: { Vezzano: [], Puianello: [], Montalto: [], Pecorile: [], 'La Vecchia': [] } }` by mapping over `CHURCHES`.
- `GET`: read from Redis. If stored shape is the legacy flat `{ slots: Slot[] }` (i.e. no `churches` key or `churches` not an object), return `EMPTY`. Cache-Control `no-store` unchanged.
- `POST`: password check unchanged. Validate via updated `validateTodayPayload`. On success, write `{ updatedAt: new Date().toISOString(), churches: result.value.churches }`. Return that value.
- Method-not-allowed branch unchanged.

### Admin UI (`src/pages/Admin.tsx`)

State changes:
- Replace `slots: Slot[]` with `churches: Record<Church, Slot[]>`.
- Add `activeChurch: Church` (defaults to `CHURCHES[0]`).
- Drag indices stay; they operate on the active church's array.

Layout (top to bottom):
1. Heading "Imposta la Messa di oggi".
2. Password input.
3. Loading message (if loading).
4. **Church tab strip**: one button per church (`CHURCHES`). Active church's button visually marked (CSS class). Clicking sets `activeChurch`. Buttons are keyboard-focusable and labelled.
5. Slot editor (unchanged structure): renders `churches[activeChurch]`. All slot mutations (`addSlot`, `updateSlot`, `removeSlot`, `moveSlot`) operate on the active church's array — they read `churches[activeChurch]`, produce next array, write back into the map.
6. "+ Aggiungi canto" button — adds to active church only.
7. "Salva" button — POSTs the full `churches` map.
8. Status line.

Default labels (`Inizio`, `Offertorio`, `Comunione`, `Fine`) continue to apply per-church based on that church's current slot count.

Loading: when fetching `/api/today`, filter slots per church through `validIds` (same defensive filter as today), then set `churches`.

### Landing UI (`src/pages/Landing.tsx`)

The "Come uso il libretto?" intro section is unchanged.

Replace the single `<section className="today">` with:

```
<section className="today">
  <h2>La Messa di oggi</h2>
  {error message OR loading message OR (
    {CHURCHES.map(church => (
      <section className="today-church" key={church}>
        <h3>{church}</h3>
        {empty list → <p>Nessun canto impostato.</p>}
        {non-empty → existing <ul className="today-list"> rendering, iterating churches[church]}
      </section>
    ))}
    {updatedAt && <p className="today-updated">Aggiornato: …</p>}
  )}
</section>
```

A single `updatedAt` line appears once, at the bottom of the section (the payload updates atomically). Error and loading states are global (one message at top of section, no per-church variants).

Slot rendering inside each church list is unchanged: number chip, `<Link>` to `/canti/:id` with `state={{ from: '/' }}`, label span.

### Styles

- `src/pages/Admin.css`: add `.church-tabs` (flex row of buttons), `.church-tab` (button), `.church-tab--active` (highlighted state).
- `src/pages/Landing.css`: add `.today-church` (per-church block), heading style for `<h3>`.

No restructuring of unrelated classes.

## Data migration

Existing production data in Redis (a flat `{ updatedAt, slots }` object) is discarded on read by the legacy-shape branch in GET. Admin re-enters lists per the next mass. No backup or one-shot migration script — the data has no historical value and the admin workflow already expects fresh weekly input.

## Error handling

- Bad payload from admin → API returns 400 with validation error message (unchanged pattern).
- Redis read failure → existing behaviour (handler throws, Vercel returns 500); landing shows "Impossibile caricare i canti di oggi."
- Unknown `songId` in stored data → landing falls back to rendering the raw id (existing `songById.get` branch), per church.

## Testing

Update or add:

- `src/lib/todaySchema.test.ts`: valid full payload accepted; missing church key rejected; unknown church key rejected; invalid slot inside a church rejected.
- `api/today.test.ts`: GET returns empty churches map when no data; GET returns empty churches map for legacy flat data; POST writes full churches map; POST rejects malformed payload; 401 still enforced.
- `src/pages/Admin.test.tsx`: tabs render five buttons; clicking a tab switches the visible slot list; editing one church does not modify another; save POSTs all five churches.
- `src/pages/Landing.test.tsx`: five church sections render; empty churches show empty message; non-empty churches render slot rows; single `updatedAt` line shown; error state shows one message; loading state shows one message.

## Out of scope

Listed under Non-goals. Anything not enumerated in this spec is deferred.
