# Admin "Messa di oggi" Hardening

**Date:** 2026-09-28
**Status:** Approved
**Scope:** `api/today.ts`, `src/lib/todaySchema.ts`, `src/pages/Admin.tsx` (+ CSS), `src/components/SongCombobox.tsx` (placeholder only if needed), `src/App.tsx`, tests, admin manual.

## Problem

Writing the admin manual (`docs/manuale-admin/messa-di-oggi.md`) surfaced several traps admins must be warned about. They should be fixed in the app instead:

1. **Concurrent overwrite.** Save POSTs all five churches. Two admins with the page open → the later save silently wipes the other's changes, even on different churches.
2. **Save after failed load.** If `GET /api/today` fails the page starts empty; saving then replaces every church with an empty list.
3. **Placeholder song.** A new row is pre-filled with `songs[0]`; if the admin forgets to change it, that song is published.
4. **Vague validation error.** An empty "Momento" anywhere fails the whole save with a generic "Errore nel salvataggio."
5. **No mobile reorder.** Only HTML5 drag-and-drop, unreliable on touch browsers.
6. **Silent loss of unsaved changes.** Reload, tab close or in-app navigation discards edits without warning.

## Goals

- Saving one church never touches churches the admin did not change.
- Impossible to publish from a page that failed to load.
- Impossible to publish a row with no song or an empty Momento; errors name the church and row.
- Reorder works on touch devices.
- Admin is warned before losing unsaved changes (reload, close, in-app nav).

## Non-Goals

- No protection when two admins edit the **same** church (last save wins).
- No per-church versioning / storage schema change.
- No early password check, no auth changes.
- No changes to the public Landing page.

## Design

### 1. Partial save with server-side merge

**Schema (`src/lib/todaySchema.ts`)**
- `validateTodayPayload(payload, validIds, { partial?: boolean })`.
- `partial: false` (default): current behaviour, all churches required.
- `partial: true`: missing churches allowed; unknown church keys still rejected; slot rules unchanged; an empty `churches` object is rejected (`"no churches to update"`).
- Return type for partial: `Partial<Record<Church, Slot[]>>`.

**API (`api/today.ts`)**
- POST validates with `partial: true`.
- Reads stored value; if missing/invalid shape, starts from the empty map. Missing church keys in stored value are filled with `[]`.
- Result: `{ updatedAt: now, churches: { ...stored.churches, ...incoming } }`, written back and returned (full map).
- Read-modify-write is not atomic; two saves in the same instant can still race. Accepted.

**Admin (`src/pages/Admin.tsx`)**
- Keep `baseline: Record<Church, Slot[]>` = lists as loaded (after invalid-song filtering).
- `dirtyChurches` = churches whose current slots differ from baseline (deep compare of label + songId, order-sensitive).
- Save sends only `dirtyChurches`. If none: status "Nessuna modifica da salvare." and no request.
- On 200: `baseline` and `churches` are both set from the response's full map. No church is dirty at that point, so this also pulls in churches other admins saved in the meantime.
- Tabs of dirty churches show a dot `●` (`aria-label` "… (modifiche non salvate)").

### 2. Failed load blocks save

- New state `loadError: boolean`.
- While `loading` or `loadError`, **Salva** is `disabled`.
- Load error message keeps current text plus a **Riprova** button that re-runs the fetch (load logic extracted to a function).

### 3. Empty new row + pre-save check

- `addSlot` creates `{ label, songId: '' }`. `SongCombobox` already renders the placeholder "Cerca un canto…" when `value` matches no song.
- Pure helper `findSlotProblems(churches, onlyChurches): Problem[]` where `Problem = { church, index, field: 'song' | 'label', message }`. Messages:
  - `"<Chiesa>, riga <n>: scegli un canto"`
  - `"<Chiesa>, riga <n>: il momento è vuoto"` (label trimmed)
- Run on dirty churches before POST. If any problems:
  - no request is sent,
  - status shows the problems as a list (error style),
  - offending fields get an `is-invalid` class + `aria-invalid="true"`,
  - active tab switches to the first church with a problem.
- Problems are recomputed on each save attempt; editing a field clears its highlight (highlights derive from last-attempt problems filtered to still-invalid fields).
- Server validation stays as a backstop.

### 4. Up/down buttons

- In `slot-actions`, before **Rimuovi**: `↑` and `↓` buttons (`aria-label` "Sposta su canto n" / "Sposta giù canto n"), calling existing `moveSlot(i, i∓1)`.
- `↑` disabled on first row, `↓` disabled on last row.
- Drag handle unchanged.

### 5. Unsaved-changes guard

**Router migration (`src/App.tsx`)**
- Replace `<BrowserRouter><Routes>…` with `createBrowserRouter` + `<RouterProvider>`; same route tree (`Layout` → index `Landing`, `canti`, `canti/:id`, lazy `admin` with Suspense fallback).
- No behaviour change for other pages.

**Admin**
- `const isDirty = dirtyChurches.length > 0`.
- `useBlocker(isDirty)`; when `blocker.state === 'blocked'`: `window.confirm('Hai modifiche non salvate. Uscire comunque?')` → `proceed()` else `reset()`.
- `beforeunload` listener registered while `isDirty` (calls `preventDefault()`).

## Testing

- `src/lib/todaySchema.test.ts`: partial mode accepts subset, rejects unknown church, rejects empty object; full mode unchanged.
- `api/today.test.ts`: POST with one church merges into stored map and leaves others untouched; POST onto empty/legacy store fills missing churches; existing "missing church → 400" test changes to expect merge success.
- `src/pages/Admin.test.tsx` (render via `createMemoryRouter` + `RouterProvider`, needed by `useBlocker`):
  - only changed churches are POSTed; no request when nothing changed,
  - dirty dot appears on edited tab and clears after save,
  - Salva disabled after failed load; Riprova reloads and enables it,
  - new row has empty song; save blocked with "Vezzano, riga 1: scegli un canto"; empty label message; tab switches to first problem church,
  - ↑/↓ reorder rows and are disabled at edges.
- Unit test for `findSlotProblems`.
- Existing Landing/SongPage/App tests keep passing.

## Follow-up

Update `docs/manuale-admin/messa-di-oggi.md` and `SCREENSHOTS.md`: remove obsolete warnings (concurrency across churches, placeholder song, vague error, mobile drag, silent loss), document ↑/↓, the dirty dot, the pre-save messages, Riprova, and the leave-page confirmation; add screenshots for those.
