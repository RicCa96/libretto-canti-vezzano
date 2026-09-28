# Admin "Messa di oggi" Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `/admin` page safe to use: per-church merge on save, no saving after a failed load, no placeholder songs, clear pre-save validation, mobile reorder, and an unsaved-changes guard.

**Architecture:** The API accepts a partial `churches` map and merges it into the stored set. The Admin page keeps a `baseline` copy of what was loaded, computes which churches are dirty, sends only those, and validates them client-side first. Two small pure helpers (`dirtyChurches`, `findSlotProblems`) live in `src/lib/`. The app moves from `<BrowserRouter>` to `createBrowserRouter` so Admin can use `useBlocker`.

**Tech Stack:** React 19, react-router-dom 7.15, Vite, Vitest + Testing Library (jsdom), Vercel serverless function (`api/today.ts`) with Upstash Redis.

**Spec:** `docs/superpowers/specs/2026-09-28-admin-hardening-design.md`

**Deviations from spec (intentional, smaller):**
- Partial validation is a separate exported function `validateTodayPatch` instead of an `{ partial }` flag, so each function has one precise return type.
- Problem highlights are computed live from the current state after a failed save attempt (flag `showProblems`), instead of storing the problem list. Fixing a field clears its highlight immediately; reordering keeps highlights on the right rows.

**Commands:**
- Single test file: `npx vitest run <path>`
- All tests: `npm test`
- Lint: `npm run lint`
- Type-check + build: `npm run build`

Baseline before starting: `npm test` → 16 files, 92 tests, all passing.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/todaySchema.ts` | Modify | Add `validateTodayPatch` (subset of churches allowed) sharing parsing with `validateTodayPayload` |
| `src/lib/todaySchema.test.ts` | Modify | Tests for `validateTodayPatch` |
| `api/today.ts` | Modify | POST validates a patch and merges it into the stored map |
| `api/today.test.ts` | Modify | Merge tests; drop "missing church → 400" |
| `src/lib/dirtyChurches.ts` | Create | `slotsEqual`, `dirtyChurches(baseline, current)` |
| `src/lib/dirtyChurches.test.ts` | Create | Tests |
| `src/lib/slotProblems.ts` | Create | `findSlotProblems(churches, only, validIds)` → Italian messages |
| `src/lib/slotProblems.test.ts` | Create | Tests |
| `src/App.tsx` | Modify | `createBrowserRouter` + `RouterProvider` |
| `src/pages/Admin.tsx` | Modify | Load error/retry, baseline + dirty, partial save, validation, ↑/↓, guard |
| `src/pages/Admin.css` | Modify | Dirty dot, invalid fields, problem list, move buttons, retry |
| `src/pages/Admin.test.tsx` | Modify | Render under a memory data router; new behaviour tests |
| `src/components/SongCombobox.tsx` | Modify | Optional `invalid` prop → `aria-invalid` |
| `docs/manuale-admin/messa-di-oggi.md` | Modify | Reflect new behaviour |
| `docs/manuale-admin/SCREENSHOTS.md` | Modify | New screenshots |

---

### Task 1: `validateTodayPatch` in the schema

**Files:**
- Modify: `src/lib/todaySchema.ts`
- Test: `src/lib/todaySchema.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/lib/todaySchema.test.ts`, change the import line to:

```ts
import { validateTodayPatch, validateTodayPayload } from './todaySchema.ts'
```

Append at the end of the file:

```ts
describe('validateTodayPatch', () => {
  it('accepts a subset of churches', () => {
    const result = validateTodayPatch(
      { churches: { Vezzano: [{ label: 'Inizio', songId: 'ti-seguiro' }] } },
      valid,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.churches).toEqual({
        Vezzano: [{ label: 'Inizio', songId: 'ti-seguiro' }],
      })
    }
  })

  it('accepts a church being emptied', () => {
    const result = validateTodayPatch({ churches: { Montalto: [] } }, valid)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.churches).toEqual({ Montalto: [] })
  })

  it('rejects an empty churches object', () => {
    const result = validateTodayPatch({ churches: {} }, valid)
    expect(result).toEqual({ ok: false, error: 'no churches to update' })
  })

  it('rejects an unknown church key', () => {
    expect(validateTodayPatch({ churches: { Quattro: [] } }, valid).ok).toBe(false)
  })

  it('rejects a slot with an empty label', () => {
    const result = validateTodayPatch(
      { churches: { Vezzano: [{ label: '   ', songId: 'ti-seguiro' }] } },
      valid,
    )
    expect(result.ok).toBe(false)
  })

  it('rejects a slot with an unknown song id', () => {
    const result = validateTodayPatch(
      { churches: { Vezzano: [{ label: 'Inizio', songId: '' }] } },
      valid,
    )
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/todaySchema.test.ts`
Expected: FAIL — `validateTodayPatch is not a function` (or not exported).

- [ ] **Step 3: Implement**

In `src/lib/todaySchema.ts`, keep `Slot`, `TodaySet` and `validateSlots` unchanged. Replace everything from `export type ValidationResult =` (the type) and the whole `validateTodayPayload` function with:

```ts
export type ChurchesPatch = Partial<Record<Church, Slot[]>>

export type ValidationResult =
  | { ok: true; value: { churches: Record<Church, Slot[]> } }
  | { ok: false; error: string }

export type PatchValidationResult =
  | { ok: true; value: { churches: ChurchesPatch } }
  | { ok: false; error: string }
```

(keep `validateSlots` where it is, between the types and the functions), then after `validateSlots`:

```ts
function parseChurches(
  payload: unknown,
  validIds: Set<string>,
  requireAll: boolean,
): { ok: true; value: ChurchesPatch } | { ok: false; error: string } {
  if (typeof payload !== 'object' || payload === null) {
    return { ok: false, error: 'payload must be an object' }
  }
  const churches = (payload as { churches?: unknown }).churches
  if (typeof churches !== 'object' || churches === null || Array.isArray(churches)) {
    return { ok: false, error: 'churches must be an object' }
  }
  const churchesMap = churches as Record<string, unknown>

  const canonical = new Set<string>(CHURCHES)
  for (const key of Object.keys(churchesMap)) {
    if (!canonical.has(key)) {
      return { ok: false, error: `unknown church: ${key}` }
    }
  }

  const out: ChurchesPatch = {}
  for (const church of CHURCHES) {
    if (!(church in churchesMap)) {
      if (requireAll) return { ok: false, error: `missing church: ${church}` }
      continue
    }
    const slotsResult = validateSlots(churchesMap[church], validIds, church)
    if (!slotsResult.ok) return slotsResult
    out[church] = slotsResult.value
  }

  if (Object.keys(out).length === 0) {
    return { ok: false, error: 'no churches to update' }
  }
  return { ok: true, value: out }
}

export function validateTodayPayload(
  payload: unknown,
  validIds: Set<string>,
): ValidationResult {
  const result = parseChurches(payload, validIds, true)
  if (!result.ok) return result
  return { ok: true, value: { churches: result.value as Record<Church, Slot[]> } }
}

export function validateTodayPatch(
  payload: unknown,
  validIds: Set<string>,
): PatchValidationResult {
  const result = parseChurches(payload, validIds, false)
  if (!result.ok) return result
  return { ok: true, value: { churches: result.value } }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/todaySchema.test.ts`
Expected: PASS (all old `validateTodayPayload` tests + 6 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/todaySchema.ts src/lib/todaySchema.test.ts
git commit -m "feat(schema): add validateTodayPatch for partial church updates"
```

---

### Task 2: API merges partial updates

**Files:**
- Modify: `api/today.ts`
- Test: `api/today.test.ts`

- [ ] **Step 1: Write the failing tests**

In `api/today.test.ts`, **delete** the whole test `it('POST rejects a payload missing a church with 400', …)`.

Append inside the `describe('api/today', …)` block, before its closing `})`:

```ts
  it('POST with one church merges it into the stored map', async () => {
    store.set('today', {
      updatedAt: '2026-09-01T10:00:00.000Z',
      churches: {
        ...EMPTY_MAP,
        Vezzano: [{ label: 'Inizio', songId: 'kept-as-is' }],
        Montalto: [{ label: 'Fine', songId: 'to-be-replaced' }],
      },
    })
    const res = makeRes()
    await handler(
      {
        method: 'POST',
        headers: { 'x-admin-password': 'secret' },
        body: { churches: { Montalto: [{ label: 'Inizio', songId: 'adeste-fideles' }] } },
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(200)
    const body = res.body as { updatedAt: string; churches: Record<string, unknown[]> }
    expect(body.churches).toEqual({
      ...EMPTY_MAP,
      Vezzano: [{ label: 'Inizio', songId: 'kept-as-is' }],
      Montalto: [{ label: 'Inizio', songId: 'adeste-fideles' }],
    })
    expect(body.updatedAt).not.toBe('2026-09-01T10:00:00.000Z')
    expect(store.get('today')).toEqual(body)
  })

  it('POST onto legacy stored data fills the other churches with empty lists', async () => {
    store.set('today', { updatedAt: 'old', slots: [{ label: 'Inizio', songId: 'x' }] })
    const res = makeRes()
    await handler(
      {
        method: 'POST',
        headers: { 'x-admin-password': 'secret' },
        body: { churches: { Vezzano: [{ label: 'Inizio', songId: 'adeste-fideles' }] } },
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(200)
    const body = res.body as { churches: Record<string, unknown[]> }
    expect(body.churches).toEqual({
      ...EMPTY_MAP,
      Vezzano: [{ label: 'Inizio', songId: 'adeste-fideles' }],
    })
  })

  it('POST rejects an empty churches object with 400', async () => {
    const res = makeRes()
    await handler(
      {
        method: 'POST',
        headers: { 'x-admin-password': 'secret' },
        body: { churches: {} },
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(400)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run api/today.test.ts`
Expected: FAIL — the merge tests get 400 (`missing church: …`).

- [ ] **Step 3: Implement**

In `api/today.ts`:

Change the schema import to:

```ts
import { validateTodayPatch, type Slot, type TodaySet } from '../src/lib/todaySchema.js'
```

Replace the whole `if (req.method === 'POST') { … }` block with:

```ts
  if (req.method === 'POST') {
    if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'unauthorized' })
    }
    const result = validateTodayPatch(req.body, VALID_IDS)
    if (!result.ok) {
      return res.status(400).json({ error: result.error })
    }
    const raw = await redis.get<unknown>(KEY)
    const stored: Partial<Record<Church, Slot[]>> = isValidStoredShape(raw) ? raw.churches : {}
    const churches = Object.fromEntries(
      CHURCHES.map((c) => {
        const incoming = result.value.churches[c]
        const previous = stored[c]
        return [c, incoming ?? (Array.isArray(previous) ? previous : [])]
      }),
    ) as Record<Church, Slot[]>
    const value: TodaySet = { updatedAt: new Date().toISOString(), churches }
    await redis.set(KEY, value)
    return res.status(200).json(value)
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run api/today.test.ts src/lib/todaySchema.test.ts`
Expected: PASS. (Existing "POST writes the full churches map" still passes: a full map is a valid patch.)

- [ ] **Step 5: Type-check the API**

Run: `npx tsc -p tsconfig.api.json --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add api/today.ts api/today.test.ts
git commit -m "feat(api): merge partial church updates into stored today set"
```

---

### Task 3: `dirtyChurches` helper

**Files:**
- Create: `src/lib/dirtyChurches.ts`
- Test: `src/lib/dirtyChurches.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/dirtyChurches.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { dirtyChurches, slotsEqual } from './dirtyChurches.ts'
import { CHURCHES, type Church } from './churches.ts'
import type { Slot } from './todaySchema.ts'

function map(overrides: Partial<Record<Church, Slot[]>> = {}): Record<Church, Slot[]> {
  return {
    ...(Object.fromEntries(CHURCHES.map((c) => [c, []])) as unknown as Record<Church, Slot[]>),
    ...overrides,
  }
}

const a: Slot = { label: 'Inizio', songId: 'x' }
const b: Slot = { label: 'Fine', songId: 'y' }

describe('slotsEqual', () => {
  it('is true for same labels and songs in same order', () => {
    expect(slotsEqual([a, b], [{ ...a }, { ...b }])).toBe(true)
  })
  it('is false when order differs', () => {
    expect(slotsEqual([a, b], [b, a])).toBe(false)
  })
  it('is false when lengths differ', () => {
    expect(slotsEqual([a], [a, b])).toBe(false)
  })
  it('is false when a label differs', () => {
    expect(slotsEqual([a], [{ ...a, label: 'Ingresso' }])).toBe(false)
  })
})

describe('dirtyChurches', () => {
  it('returns nothing when nothing changed', () => {
    expect(dirtyChurches(map({ Vezzano: [a] }), map({ Vezzano: [{ ...a }] }))).toEqual([])
  })
  it('returns changed churches in canonical order', () => {
    const baseline = map({ Vezzano: [a] })
    const current = map({ Montalto: [b], Vezzano: [] })
    expect(dirtyChurches(baseline, current)).toEqual(['Vezzano', 'Montalto'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/dirtyChurches.test.ts`
Expected: FAIL — cannot resolve `./dirtyChurches.ts`.

- [ ] **Step 3: Implement**

Create `src/lib/dirtyChurches.ts`:

```ts
import { CHURCHES, type Church } from './churches.js'
import type { Slot } from './todaySchema.js'

export function slotsEqual(a: Slot[], b: Slot[]): boolean {
  return (
    a.length === b.length &&
    a.every((slot, i) => slot.label === b[i].label && slot.songId === b[i].songId)
  )
}

export function dirtyChurches(
  baseline: Record<Church, Slot[]>,
  current: Record<Church, Slot[]>,
): Church[] {
  return CHURCHES.filter((c) => !slotsEqual(baseline[c], current[c]))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/dirtyChurches.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dirtyChurches.ts src/lib/dirtyChurches.test.ts
git commit -m "feat(lib): add dirtyChurches helper"
```

---

### Task 4: `findSlotProblems` helper

**Files:**
- Create: `src/lib/slotProblems.ts`
- Test: `src/lib/slotProblems.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/slotProblems.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { findSlotProblems } from './slotProblems.ts'
import { CHURCHES, type Church } from './churches.ts'
import type { Slot } from './todaySchema.ts'

const validIds = new Set(['ok-song'])

function map(overrides: Partial<Record<Church, Slot[]>> = {}): Record<Church, Slot[]> {
  return {
    ...(Object.fromEntries(CHURCHES.map((c) => [c, []])) as unknown as Record<Church, Slot[]>),
    ...overrides,
  }
}

describe('findSlotProblems', () => {
  it('returns nothing for valid slots', () => {
    const churches = map({ Vezzano: [{ label: 'Inizio', songId: 'ok-song' }] })
    expect(findSlotProblems(churches, ['Vezzano'], validIds)).toEqual([])
  })

  it('reports a missing song with church and 1-based row', () => {
    const churches = map({
      Vezzano: [
        { label: 'Inizio', songId: 'ok-song' },
        { label: 'Offertorio', songId: '' },
      ],
    })
    expect(findSlotProblems(churches, ['Vezzano'], validIds)).toEqual([
      { church: 'Vezzano', index: 1, field: 'song', message: 'Vezzano, riga 2: scegli un canto' },
    ])
  })

  it('reports a blank label (whitespace only)', () => {
    const churches = map({ Puianello: [{ label: '  ', songId: 'ok-song' }] })
    expect(findSlotProblems(churches, ['Puianello'], validIds)).toEqual([
      {
        church: 'Puianello',
        index: 0,
        field: 'label',
        message: 'Puianello, riga 1: il momento è vuoto',
      },
    ])
  })

  it('reports label before song for the same row', () => {
    const churches = map({ Vezzano: [{ label: '', songId: '' }] })
    expect(findSlotProblems(churches, ['Vezzano'], validIds).map((p) => p.field)).toEqual([
      'label',
      'song',
    ])
  })

  it('only checks the given churches', () => {
    const churches = map({ Montalto: [{ label: '', songId: '' }] })
    expect(findSlotProblems(churches, ['Vezzano'], validIds)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/slotProblems.test.ts`
Expected: FAIL — cannot resolve `./slotProblems.ts`.

- [ ] **Step 3: Implement**

Create `src/lib/slotProblems.ts`:

```ts
import type { Church } from './churches.js'
import type { Slot } from './todaySchema.js'

export type SlotProblem = {
  church: Church
  index: number
  field: 'label' | 'song'
  message: string
}

export function findSlotProblems(
  churches: Record<Church, Slot[]>,
  only: readonly Church[],
  validIds: Set<string>,
): SlotProblem[] {
  const problems: SlotProblem[] = []
  for (const church of only) {
    churches[church].forEach((slot, index) => {
      const row = `${church}, riga ${index + 1}`
      if (slot.label.trim() === '') {
        problems.push({ church, index, field: 'label', message: `${row}: il momento è vuoto` })
      }
      if (!validIds.has(slot.songId)) {
        problems.push({ church, index, field: 'song', message: `${row}: scegli un canto` })
      }
    })
  }
  return problems
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/slotProblems.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/slotProblems.ts src/lib/slotProblems.test.ts
git commit -m "feat(lib): add findSlotProblems pre-save validation helper"
```

---

### Task 5: Data router + Admin test harness

No behaviour change. Prepares for `useBlocker` (Task 10), which throws outside a data router.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/Admin.test.tsx`

- [ ] **Step 1: Switch App to `createBrowserRouter`**

Replace the whole content of `src/App.tsx` with:

```tsx
import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout.tsx'
import { Landing } from './pages/Landing.tsx'
import { SongIndex } from './pages/SongIndex.tsx'
import { SongPage } from './pages/SongPage.tsx'
import './styles/app.css'

const Admin = lazy(() =>
  import('./pages/Admin.tsx').then((m) => ({ default: m.Admin })),
)

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'canti', element: <SongIndex /> },
      { path: 'canti/:id', element: <SongPage /> },
      {
        path: 'admin',
        element: (
          <Suspense fallback={<p>Caricamento…</p>}>
            <Admin />
          </Suspense>
        ),
      },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
```

- [ ] **Step 2: Render Admin under a memory data router in tests**

In `src/pages/Admin.test.tsx`:

Replace the imports block (lines 1–5) with:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { Admin } from './Admin.tsx'
import { CHURCHES } from '../lib/churches.ts'
```

After `const EMPTY_MAP = …`, add:

```tsx
function renderAdmin() {
  const router = createMemoryRouter(
    [
      { path: '/admin', element: <Admin /> },
      { path: '/', element: <p>home</p> },
    ],
    { initialEntries: ['/admin'] },
  )
  render(<RouterProvider router={router} />)
  return router
}
```

Replace **every** `render(<Admin />)` in the file with `renderAdmin()`.

(`noUnusedLocals` applies to test files too: `act` is imported only in Task 10.)

- [ ] **Step 3: Run the tests**

Run: `npm test`
Expected: PASS, same count as baseline plus the tests added in Tasks 1–4.

- [ ] **Step 4: Smoke-check the dev server routes**

Run: `npm run build`
Expected: build succeeds (tsc + vite).

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/pages/Admin.test.tsx
git commit -m "refactor(router): switch to createBrowserRouter data router"
```

---

### Task 6: Block saving after a failed load + Riprova

**Files:**
- Modify: `src/pages/Admin.tsx`
- Modify: `src/pages/Admin.css`
- Test: `src/pages/Admin.test.tsx`

- [ ] **Step 1: Write the failing test and a load helper**

In `src/pages/Admin.test.tsx`, after `renderAdmin`, add:

```tsx
async function waitForLoaded() {
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /salva/i })).toBeEnabled(),
  )
}
```

In the test `'saves the full churches map with the password header'`, directly after the line
`await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/today'))` add:

```tsx
    await waitForLoaded()
```

Add a new test inside `describe('Admin', …)`:

```tsx
  it('disables Salva when the current list fails to load, and Riprova recovers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ updatedAt: '', churches: EMPTY_MAP }),
      })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAdmin()

    expect(await screen.findByText(/errore nel caricamento/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salva/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Riprova' }))

    await waitForLoaded()
    expect(screen.queryByText(/errore nel caricamento/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Riprova' })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/Admin.test.tsx`
Expected: FAIL — Salva is not disabled / no "Riprova" button.

- [ ] **Step 3: Implement in `src/pages/Admin.tsx`**

3a. Directly **above** `function isErrorStatus(`, add:

```tsx
const validIds = new Set(songs.map((s) => s.id))

function cleanChurches(
  incoming: Partial<Record<Church, Slot[]>> | undefined,
): Record<Church, Slot[]> {
  const cleaned = emptyChurches()
  for (const church of CHURCHES) {
    const list = incoming?.[church]
    cleaned[church] = Array.isArray(list)
      ? list.filter((s) => validIds.has(s.songId))
      : []
  }
  return cleaned
}
```

3b. Replace `  const [loading, setLoading] = useState(true)` with:

```tsx
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
```

3c. Replace the whole first `useEffect(() => { … }, [])` (the fetch of `/api/today`) with:

```tsx
  useEffect(() => {
    let active = true
    fetch('/api/today')
      .then((r) => {
        if (!r.ok) throw new Error('bad response')
        return r.json() as Promise<TodaySet>
      })
      .then((data) => {
        if (!active) return
        setChurches(cleanChurches(data.churches))
      })
      .catch(() => {
        if (!active) return
        setLoadError(true)
        setStatus('Errore nel caricamento della lista corrente.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [loadAttempt])

  const retryLoad = () => {
    setStatus('')
    setLoadError(false)
    setLoading(true)
    setLoadAttempt((n) => n + 1)
  }
```

3d. Replace the Salva button:

```tsx
      <button type="button" className="save" onClick={save}>
        Salva
      </button>
```

with:

```tsx
      <button
        type="button"
        className="save"
        onClick={save}
        disabled={loading || loadError}
      >
        Salva
      </button>
```

3e. Replace the status block at the end:

```tsx
      {status && (
        <p className={isErrorStatus(status) ? 'status status--error' : 'status'}>
          {status}
        </p>
      )}
```

with:

```tsx
      {status && (
        <p className={isErrorStatus(status) ? 'status status--error' : 'status'}>
          {status}
        </p>
      )}
      {loadError && (
        <button type="button" className="retry" onClick={retryLoad}>
          Riprova
        </button>
      )}
```

- [ ] **Step 4: CSS**

Append to `src/pages/Admin.css`:

```css
.admin button.retry {
  margin-top: var(--s-2);
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/pages/Admin.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Admin.tsx src/pages/Admin.css src/pages/Admin.test.tsx
git commit -m "feat(admin): block save after failed load and add Riprova"
```

---

### Task 7: Save only changed churches + unsaved dot

**Files:**
- Modify: `src/pages/Admin.tsx`
- Modify: `src/pages/Admin.css`
- Test: `src/pages/Admin.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `src/pages/Admin.test.tsx`, after `waitForLoaded`, add a stateful API mock:

```tsx
type Churches = Record<string, { label: string; songId: string }[]>

function mockApi(initial: Churches = EMPTY_MAP) {
  let current = { updatedAt: '', churches: initial }
  const fetchMock = vi.fn(async (_url: string, opts?: RequestInit) => {
    if (opts?.method === 'POST') {
      const body = JSON.parse(opts.body as string) as { churches: Churches }
      current = {
        updatedAt: '2026-09-28T10:00:00.000Z',
        churches: { ...current.churches, ...body.churches },
      }
    }
    return { ok: true, status: 200, json: async () => current }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function postBodies(fetchMock: { mock: { calls: unknown[][] } }) {
  return fetchMock.mock.calls
    .filter(([, opts]) => (opts as RequestInit | undefined)?.method === 'POST')
    .map(([, opts]) => JSON.parse((opts as RequestInit).body as string))
}
```

Rename the test `'saves the full churches map with the password header'` to `'saves only the changed churches with the password header'` and replace its last assertion line

```tsx
    expect(Object.keys(body.churches).sort()).toEqual([...CHURCHES].sort())
```

with:

```tsx
    expect(Object.keys(body.churches)).toEqual([CHURCHES[0]])
```

Add new tests:

```tsx
  it('does not send a request when nothing changed', async () => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    renderAdmin()
    await waitForLoaded()

    await user.click(screen.getByRole('button', { name: /salva/i }))

    expect(await screen.findByText('Nessuna modifica da salvare.')).toBeInTheDocument()
    expect(postBodies(fetchMock)).toEqual([])
  })

  it('marks edited churches as unsaved until saved', async () => {
    mockApi()
    const user = userEvent.setup()
    renderAdmin()
    await waitForLoaded()

    await user.click(screen.getByRole('button', { name: /aggiungi/i }))
    expect(
      screen.getByRole('tab', { name: `${CHURCHES[0]} (modifiche non salvate)` }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: CHURCHES[1] })).toBeInTheDocument()

    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /salva/i }))

    expect(await screen.findByText(/^Salvato alle/)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: CHURCHES[0] })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Inizio')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/Admin.test.tsx`
Expected: FAIL — body has all five churches; no "Nessuna modifica…" status; no dirty tab label.

- [ ] **Step 3: Implement in `src/pages/Admin.tsx`**

3a. Change the first import line to:

```tsx
import { useEffect, useMemo, useState } from 'react'
```

and add after the `todaySchema` import:

```tsx
import { dirtyChurches } from '../lib/dirtyChurches.ts'
```

3b. Replace

```tsx
  const [churches, setChurches] = useState<Record<Church, Slot[]>>(emptyChurches)
```

with:

```tsx
  const [baseline, setBaseline] = useState<Record<Church, Slot[]>>(emptyChurches)
  const [churches, setChurches] = useState<Record<Church, Slot[]>>(emptyChurches)
```

3c. In the load effect, replace

```tsx
        setChurches(cleanChurches(data.churches))
```

with:

```tsx
        const cleaned = cleanChurches(data.churches)
        setBaseline(cleaned)
        setChurches(cleaned)
```

3d. Directly after `const slots = churches[activeChurch]`, add:

```tsx
  const dirty = useMemo(() => dirtyChurches(baseline, churches), [baseline, churches])
```

3e. Replace the whole `const save = async () => { … }` with:

```tsx
  const save = async () => {
    if (dirty.length === 0) {
      setStatus('Nessuna modifica da salvare.')
      return
    }
    setStatus('Salvataggio…')
    const changes = Object.fromEntries(dirty.map((c) => [c, churches[c]]))
    try {
      const res = await fetch('/api/today', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ churches: changes }),
      })
      if (res.status === 401) {
        setStatus('Password errata.')
        return
      }
      if (!res.ok) {
        setStatus('Errore nel salvataggio.')
        return
      }
      const data = (await res.json()) as TodaySet
      const saved = cleanChurches(data.churches)
      setBaseline(saved)
      setChurches(saved)
      setStatus(`Salvato alle ${new Date(data.updatedAt).toLocaleString('it-IT')}.`)
    } catch {
      setStatus('Errore di rete.')
    }
  }
```

3f. In the church tabs map, replace

```tsx
          const isActive = church === activeChurch
          return (
            <button
              key={church}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={'church-tab' + (isActive ? ' church-tab--active' : '')}
              onClick={() => setActiveChurch(church)}
            >
              {church}
            </button>
          )
```

with:

```tsx
          const isActive = church === activeChurch
          const isDirtyTab = dirty.includes(church)
          return (
            <button
              key={church}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={isDirtyTab ? `${church} (modifiche non salvate)` : undefined}
              className={'church-tab' + (isActive ? ' church-tab--active' : '')}
              onClick={() => setActiveChurch(church)}
            >
              {church}
              {isDirtyTab && (
                <span className="church-tab__dirty" aria-hidden="true">
                  ●
                </span>
              )}
            </button>
          )
```

- [ ] **Step 4: CSS**

Append to `src/pages/Admin.css`:

```css
.admin .church-tab__dirty {
  margin-left: var(--s-1);
  font-size: 0.7em;
  color: var(--accent);
}

.admin button.church-tab--active .church-tab__dirty {
  color: var(--accent-on);
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/pages/Admin.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Admin.tsx src/pages/Admin.css src/pages/Admin.test.tsx
git commit -m "feat(admin): save only changed churches and mark unsaved tabs"
```

---

### Task 8: Empty new row + pre-save validation

**Files:**
- Modify: `src/components/SongCombobox.tsx`
- Modify: `src/pages/Admin.tsx`
- Modify: `src/pages/Admin.css`
- Test: `src/pages/Admin.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `src/pages/Admin.test.tsx`, after `postBodies`, add:

```tsx
async function chooseSong(
  user: ReturnType<typeof userEvent.setup>,
  query: string,
  index = 0,
) {
  const input = screen.getAllByRole('combobox')[index]
  await user.click(input)
  await user.type(input, query)
  await user.click(screen.getAllByRole('option')[0])
}
```

In the test `'saves only the changed churches with the password header'`, directly after
`await user.click(screen.getByRole('button', { name: /aggiungi/i }))` add:

```tsx
    await chooseSong(user, 'adeste')
```

In the test `'marks edited churches as unsaved until saved'`, directly after
`await user.click(screen.getByRole('button', { name: /aggiungi/i }))` add the same line:

```tsx
    await chooseSong(user, 'adeste')
```

Add new tests:

```tsx
  it('starts a new row with no song and blocks saving until one is chosen', async () => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    renderAdmin()
    await waitForLoaded()

    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /aggiungi/i }))
    expect(screen.getByRole('combobox')).toHaveValue('')

    await user.click(screen.getByRole('button', { name: /salva/i }))

    expect(
      await screen.findByText(`${CHURCHES[0]}, riga 1: scegli un canto`),
    ).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true')
    expect(postBodies(fetchMock)).toEqual([])

    await chooseSong(user, 'adeste')
    expect(screen.queryByText(/scegli un canto/)).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-invalid')

    await user.click(screen.getByRole('button', { name: /salva/i }))
    await waitFor(() => expect(postBodies(fetchMock)).toHaveLength(1))
  })

  it('reports an empty Momento and switches to the church with the problem', async () => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    renderAdmin()
    await waitForLoaded()

    await user.click(screen.getByRole('button', { name: /aggiungi/i }))
    await chooseSong(user, 'adeste')
    await user.clear(screen.getByLabelText('Momento'))
    await user.click(screen.getByRole('tab', { name: CHURCHES[1] }))

    await user.click(screen.getByRole('button', { name: /salva/i }))

    expect(
      await screen.findByText(`${CHURCHES[0]}, riga 1: il momento è vuoto`),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: `${CHURCHES[0]} (modifiche non salvate)` }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Momento')).toHaveAttribute('aria-invalid', 'true')
    expect(postBodies(fetchMock)).toEqual([])
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/Admin.test.tsx`
Expected: FAIL — new row combobox shows the first song's title; no problem messages.

- [ ] **Step 3: `invalid` prop on `SongCombobox`**

In `src/components/SongCombobox.tsx`:

In `type Props`, after `placeholder?: string`, add:

```tsx
  invalid?: boolean
```

In the function parameters, replace

```tsx
  placeholder = 'Cerca un canto…',
}: Props) {
```

with:

```tsx
  placeholder = 'Cerca un canto…',
  invalid = false,
}: Props) {
```

On the `<input` element, directly after `aria-autocomplete="list"`, add:

```tsx
        aria-invalid={invalid || undefined}
```

- [ ] **Step 4: Implement in `src/pages/Admin.tsx`**

4a. Add after the `dirtyChurches` import:

```tsx
import { findSlotProblems } from '../lib/slotProblems.ts'
```

4b. After `const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)`, add:

```tsx
  const [showProblems, setShowProblems] = useState(false)
```

4c. Directly after the `const dirty = useMemo(…)` line, add:

```tsx
  const problems = useMemo(
    () => (showProblems ? findSlotProblems(churches, dirty, validIds) : []),
    [showProblems, churches, dirty],
  )
  const isInvalid = (i: number, field: 'label' | 'song') =>
    problems.some((p) => p.church === activeChurch && p.index === i && p.field === field)
```

4d. In `addSlot`, replace

```tsx
    setSlots([...slots, { label, songId: songs[0]?.id ?? '' }])
```

with:

```tsx
    setSlots([...slots, { label, songId: '' }])
```

4e. In `save`, directly after the `if (dirty.length === 0) { … }` block, add:

```tsx
    const found = findSlotProblems(churches, dirty, validIds)
    if (found.length > 0) {
      setShowProblems(true)
      setActiveChurch(found[0].church)
      setStatus('')
      return
    }
    setShowProblems(false)
```

4f. Replace the Momento field block

```tsx
              <div className="slot-field slot-field--label">
                <label htmlFor={`label-${i}`}>Momento</label>
                <input
                  id={`label-${i}`}
                  value={slot.label}
                  onChange={(e) => updateSlot(i, { label: e.target.value })}
                />
              </div>
```

with:

```tsx
              <div
                className={
                  'slot-field slot-field--label' +
                  (isInvalid(i, 'label') ? ' is-invalid' : '')
                }
              >
                <label htmlFor={`label-${i}`}>Momento</label>
                <input
                  id={`label-${i}`}
                  value={slot.label}
                  aria-invalid={isInvalid(i, 'label') || undefined}
                  onChange={(e) => updateSlot(i, { label: e.target.value })}
                />
              </div>
```

4g. Replace the Canto field block

```tsx
              <div className="slot-field slot-field--song">
                <label htmlFor={`song-${i}`}>Canto</label>
                <SongCombobox
                  id={`song-${i}`}
                  songs={songs}
                  value={slot.songId}
                  onChange={(id) => updateSlot(i, { songId: id })}
                />
              </div>
```

with:

```tsx
              <div
                className={
                  'slot-field slot-field--song' +
                  (isInvalid(i, 'song') ? ' is-invalid' : '')
                }
              >
                <label htmlFor={`song-${i}`}>Canto</label>
                <SongCombobox
                  id={`song-${i}`}
                  songs={songs}
                  value={slot.songId}
                  invalid={isInvalid(i, 'song')}
                  onChange={(id) => updateSlot(i, { songId: id })}
                />
              </div>
```

4h. Directly **before** the `{status && (` block at the end, add:

```tsx
      {problems.length > 0 && (
        <ul className="status status--error problem-list" role="alert">
          {problems.map((p) => (
            <li key={`${p.church}-${p.index}-${p.field}`}>{p.message}</li>
          ))}
        </ul>
      )}
```

- [ ] **Step 5: CSS**

Append to `src/pages/Admin.css`:

```css
.admin .slot-field.is-invalid input {
  border-color: var(--accent);
}

.admin .slot-field.is-invalid label {
  color: var(--accent);
}

.admin .problem-list {
  margin: var(--s-3) 0 0;
  padding-left: var(--s-4);
}
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/pages/Admin.test.tsx src/components`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/SongCombobox.tsx src/pages/Admin.tsx src/pages/Admin.css src/pages/Admin.test.tsx
git commit -m "feat(admin): empty new rows and pre-save validation with row messages"
```

---

### Task 9: ↑ / ↓ reorder buttons

**Files:**
- Modify: `src/pages/Admin.tsx`
- Modify: `src/pages/Admin.css`
- Test: `src/pages/Admin.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `src/pages/Admin.test.tsx`:

```tsx
  it('reorders rows with the up/down buttons', async () => {
    mockApi({
      ...EMPTY_MAP,
      [CHURCHES[0]]: [
        { label: 'Inizio', songId: 'adeste-fideles' },
        { label: 'Fine', songId: 'amatevi-fratelli' },
      ],
    })
    const user = userEvent.setup()
    renderAdmin()
    await waitForLoaded()
    await waitFor(() => expect(screen.getAllByLabelText('Momento')).toHaveLength(2))

    expect(screen.getByRole('button', { name: 'Sposta su canto 1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sposta giù canto 2' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Sposta giù canto 1' }))
    expect(screen.getAllByLabelText('Momento').map((el) => (el as HTMLInputElement).value)).toEqual([
      'Fine',
      'Inizio',
    ])

    await user.click(screen.getByRole('button', { name: 'Sposta su canto 2' }))
    expect(screen.getAllByLabelText('Momento').map((el) => (el as HTMLInputElement).value)).toEqual([
      'Inizio',
      'Fine',
    ])
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/Admin.test.tsx -t "up/down"`
Expected: FAIL — no button named "Sposta su canto 1".

- [ ] **Step 3: Implement**

In `src/pages/Admin.tsx`, replace

```tsx
              <div className="slot-actions">
                <button
                  type="button"
                  className="slot-remove"
```

with:

```tsx
              <div className="slot-actions">
                <button
                  type="button"
                  className="slot-move"
                  onClick={() => moveSlot(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Sposta su canto ${i + 1}`}
                  title="Sposta su"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="slot-move"
                  onClick={() => moveSlot(i, i + 1)}
                  disabled={i === slots.length - 1}
                  aria-label={`Sposta giù canto ${i + 1}`}
                  title="Sposta giù"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="slot-remove"
```

- [ ] **Step 4: CSS**

Append to `src/pages/Admin.css`:

```css
.admin button.slot-move {
  width: 44px;
  padding: 0;
  font-size: var(--fs-body);
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/pages/Admin.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Admin.tsx src/pages/Admin.css src/pages/Admin.test.tsx
git commit -m "feat(admin): add up/down buttons to reorder songs on touch devices"
```

---

### Task 10: Unsaved-changes guard

**Files:**
- Modify: `src/pages/Admin.tsx`
- Test: `src/pages/Admin.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `src/pages/Admin.test.tsx`, change the Testing Library import to:

```tsx
import { act, render, screen, waitFor } from '@testing-library/react'
```

and change `afterEach(() => vi.unstubAllGlobals())` to:

```tsx
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })
```

Add tests:

```tsx
  it('asks for confirmation before leaving with unsaved changes', async () => {
    mockApi()
    const confirmSpy = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    const user = userEvent.setup()
    const router = renderAdmin()
    await waitForLoaded()

    await user.click(screen.getByRole('button', { name: /aggiungi/i }))

    await act(async () => {
      await router.navigate('/')
    })
    await waitFor(() =>
      expect(confirmSpy).toHaveBeenCalledWith('Hai modifiche non salvate. Uscire comunque?'),
    )
    expect(router.state.location.pathname).toBe('/admin')

    await act(async () => {
      await router.navigate('/')
    })
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.getByText('home')).toBeInTheDocument()
  })

  it('leaves without confirmation when there are no changes', async () => {
    mockApi()
    const confirmSpy = vi.spyOn(window, 'confirm')
    const router = renderAdmin()
    await waitForLoaded()

    await act(async () => {
      await router.navigate('/')
    })
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('warns on page unload only while there are unsaved changes', async () => {
    mockApi()
    const user = userEvent.setup()
    renderAdmin()
    await waitForLoaded()

    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)

    await user.click(screen.getByRole('button', { name: /aggiungi/i }))

    const dirtyEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirtyEvent)
    expect(dirtyEvent.defaultPrevented).toBe(true)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/Admin.test.tsx -t "leav|unload"`
Expected: FAIL — confirm never called; path changes to `/` immediately; `defaultPrevented` false.

- [ ] **Step 3: Implement in `src/pages/Admin.tsx`**

3a. Add after the React import:

```tsx
import { useBlocker } from 'react-router-dom'
```

3b. Directly after the `isInvalid` helper (added in Task 8), add:

```tsx
  const isDirty = dirty.length > 0
  const blocker = useBlocker(isDirty)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('Hai modifiche non salvate. Uscire comunque?')) {
      blocker.proceed()
    } else {
      blocker.reset()
    }
  }, [blocker])

  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/pages/Admin.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Admin.tsx src/pages/Admin.test.tsx
git commit -m "feat(admin): confirm before leaving with unsaved changes"
```

---

### Task 11: Full verification

- [ ] **Step 1: All tests**

Run: `npm test`
Expected: all files pass; 0 failures.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors. If `react-hooks` flags anything in the new effects, fix it without disabling the rule (e.g. keep `setState` calls inside promise callbacks, as in Task 6).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `tsc -b` and `vite build` succeed.

- [ ] **Step 4: Manual check (optional, requires Vercel env)**

Run `npx vercel dev` (needs Upstash env vars + `ADMIN_PASSWORD`), open `/admin` and verify on desktop and a phone-width viewport:
- tab dot appears after an edit, disappears after save;
- a new row shows "Cerca un canto…"; Salva shows "…: scegli un canto";
- ↑/↓ move rows; clicking "Messa di oggi" in the header with unsaved changes asks for confirmation;
- two browser windows editing different churches: both changes survive.

- [ ] **Step 5: Commit any lint/build fixes**

```bash
git add -A src api
git commit -m "chore(admin): lint and type fixes"
```

(Skip if nothing changed.)

---

### Task 12: Update the admin manual

**Files:**
- Modify: `docs/manuale-admin/messa-di-oggi.md`
- Modify: `docs/manuale-admin/SCREENSHOTS.md`

- [ ] **Step 1: Chapter 2 ("Prima di iniziare")** — replace the last paragraph with:

```markdown
Puoi usare un computer, un tablet o un telefono: tutte le funzioni sono disponibili su ogni dispositivo.
```

- [ ] **Step 2: Chapter 3** — after the paragraph starting "Mentre la pagina si carica…", add:

```markdown
Se il caricamento non riesce compare **"Errore nel caricamento della lista corrente."** con il pulsante **Riprova**. Finché i canti non sono stati caricati il pulsante **Salva** resta disattivato: così non si rischia di cancellare per errore i canti già pubblicati.

![Errore di caricamento con pulsante Riprova](img/15-riprova.png)

> 📸 **Screenshot 15** — Messaggio "Errore nel caricamento della lista corrente." con il pulsante "Riprova" e il pulsante "Salva" disattivato (grigio).
```

- [ ] **Step 3: Chapter 4 table** — replace row ④ with:

```markdown
| ④ | Elenco dei canti della chiesa selezionata | Ogni riga è un canto: maniglia ⋮⋮, **Momento**, **Canto**, **↑ ↓**, **Rimuovi** |
```

- [ ] **Step 4: Chapter 6** — replace the bullet list with:

```markdown
- Ogni chiesa ha il **proprio elenco** di canti, indipendente dalle altre.
- Puoi passare da una chiesa all'altra **senza perdere** le modifiche già fatte.
- Le chiese con **modifiche non ancora salvate** mostrano un pallino **●** accanto al nome.
- Un solo **Salva** pubblica **tutte le chiese modificate** insieme. Le chiese che non hai toccato non vengono modificate, anche se nel frattempo un altro amministratore le ha aggiornate.
- Se una chiesa non ha canti, sul libretto i fedeli vedranno la scritta **"Nessun canto impostato."**

![Scheda con modifiche non salvate](img/16-pallino-modifiche.png)

> 📸 **Screenshot 16** — Schede delle chiese con il pallino ● accanto a una chiesa modificata e non ancora salvata.
```

- [ ] **Step 5: Chapter 7** — replace the final `> ⚠️ **Attenzione:** anche il campo **Canto** …` block with:

```markdown
Il campo **Canto** della nuova riga è **vuoto** (mostra "Cerca un canto…"): sceglilo come spiegato nel capitolo successivo. Se lo lasci vuoto il salvataggio viene bloccato e ti viene indicata la riga da completare.
```

- [ ] **Step 6: Chapter 9** — replace the `> ⚠️ **Il campo Momento non può restare vuoto.** …` block with:

```markdown
> ⚠️ **Il campo Momento non può restare vuoto.** Se lo lasci vuoto, premendo **Salva** compare un messaggio come **"Vezzano, riga 2: il momento è vuoto"** e il campo viene evidenziato in rosso. Nulla viene pubblicato finché non lo compili.
```

- [ ] **Step 7: Chapter 10** — replace the whole chapter body (from "I canti appaiono sul libretto…" to the end of the chapter) with:

```markdown
I canti appaiono sul libretto **nello stesso ordine** in cui sono nell'elenco. Ci sono due modi per spostarli.

**Con i pulsanti ↑ e ↓ (telefono, tablet e computer)**

- **↑** sposta il canto di una posizione verso l'alto.
- **↓** lo sposta di una posizione verso il basso.
- Sulla prima riga ↑ è disattivato, sull'ultima ↓ è disattivato.

![Pulsanti ↑ e ↓](img/10-riordina.png)

> 📸 **Screenshot 10** — Primo piano di una riga con i pulsanti ↑ e ↓ evidenziati (preferibilmente da telefono).

**Trascinando (computer)**

1. Porta il puntatore sulla **maniglia ⋮⋮** a sinistra della riga ("Trascina per riordinare").
2. Tieni premuto e trascina la riga nella nuova posizione (la destinazione viene evidenziata).
3. Rilascia.

> 💡 **Nota:** spostando una riga il **Momento si sposta con lei**. Se hai scambiato Inizio e Fine, ricordati di correggere anche le etichette.
```

- [ ] **Step 8: Chapter 12** — replace the whole chapter body with:

```markdown
Quando hai finito con **tutte** le chiese che dovevi modificare:

1. Controlla che la password sia inserita.
2. Premi **Salva**.
3. Prima di inviare, il sito controlla le righe delle chiese modificate. Se manca qualcosa compare l'elenco dei problemi, ad esempio:
   - **"Vezzano, riga 3: scegli un canto"**
   - **"Puianello, riga 1: il momento è vuoto"**

   I campi da correggere sono evidenziati in rosso e viene aperta la scheda della prima chiesa con un problema. Correggi e premi di nuovo **Salva**.
4. Se tutto è in ordine compare **"Salvataggio…"** e poi **"Salvato alle 28/9/2026, 18:30:00."** *(con la data e l'ora del momento)*. I pallini ● spariscono.

![Controlli prima del salvataggio](img/17-controlli.png)

> 📸 **Screenshot 17** — Elenco rosso dei problemi sotto il pulsante "Salva" e una riga con il campo evidenziato in rosso.

![Messaggio di salvataggio riuscito](img/12-salvato.png)

> 📸 **Screenshot 12** — Parte bassa della pagina dopo il salvataggio: pulsante "Salva" e messaggio "Salvato alle …".

Se premi **Salva** senza aver cambiato nulla compare **"Nessuna modifica da salvare."**

**Uscire senza salvare.** Se provi a lasciare la pagina con modifiche non salvate (menu in alto, ricaricamento, chiusura della scheda) il sito ti chiede conferma. Scegli **Annulla** (o **Resta**) per rimanere sulla pagina e salvare.

![Conferma di uscita](img/18-conferma-uscita.png)

> 📸 **Screenshot 18** — Finestra del browser "Hai modifiche non salvate. Uscire comunque?".
```

- [ ] **Step 9: Chapter 14 table** — replace the table with:

```markdown
| Messaggio / situazione | Cosa significa | Cosa fare |
|---|---|---|
| **Password errata.** | La password inserita non è corretta. Nulla è stato salvato. | Correggi la password e premi di nuovo **Salva**. Le modifiche sono ancora sulla pagina. |
| **"…, riga N: scegli un canto"** / **"…, riga N: il momento è vuoto"** | Una riga è incompleta. Nulla è stato salvato. | Completa i campi in rosso e premi di nuovo **Salva**. |
| **Nessuna modifica da salvare.** | Non hai cambiato nulla rispetto all'ultimo salvataggio. | Nessuna azione necessaria. |
| **Errore nel salvataggio.** | Il sito ha rifiutato i dati per un motivo imprevisto. | Riprova; se persiste, contatta il responsabile tecnico. |
| **Errore di rete.** | Connessione a internet assente o instabile. | Controlla la connessione e premi di nuovo **Salva** (non ricaricare, perderesti le modifiche). |
| **Errore nel caricamento della lista corrente.** | All'apertura non è stato possibile leggere i canti salvati. **Salva** è disattivato. | Premi **Riprova**. Se persiste, contatta il responsabile tecnico. |
| Un canto salvato in precedenza non compare più nell'elenco | Quel canto è stato tolto dal libretto e viene scartato automaticamente. | Scegli un canto sostitutivo e salva. |
| Sul libretto vedo ancora i canti vecchi | La pagina del libretto non è stata ricaricata. | Ricarica la pagina del libretto. |
```

- [ ] **Step 10: Chapter 15** — replace the numbered list with:

```markdown
1. **Un Salva pubblica tutte le chiese modificate** (quelle con il pallino ●), esattamente come le vedi sulla pagina. Le altre chiese restano come sono.
2. **Due amministratori non devono modificare la stessa chiesa nello stesso momento**: vince l'ultimo salvataggio. Chiese diverse invece non si disturbano.
3. **Apri (o ricarica) la pagina `/admin` subito prima di lavorare**, così parti dai canti più recenti.
4. **Verifica il risultato** sulla pagina principale dopo ogni salvataggio.
```

- [ ] **Step 11: Chapter 16** — replace step 5 with:

```markdown
5. Riordina con **↑ ↓** (o trascinando **⋮⋮**), togli con **Rimuovi**.
```

and step 7 with:

```markdown
7. **Salva** → correggi eventuali righe in rosso → attendi "Salvato alle …".
```

- [ ] **Step 12: SCREENSHOTS.md** — replace the `10-riordina.png` line and append new entries:

```markdown
- [ ] `10-riordina.png` — pulsanti ↑ ↓ di una riga (da telefono)
```

After the `14-errore.png` line add:

```markdown
- [ ] `15-riprova.png` — errore di caricamento con "Riprova" e "Salva" disattivato
- [ ] `16-pallino-modifiche.png` — scheda chiesa con pallino ● di modifiche non salvate
- [ ] `17-controlli.png` — elenco rosso dei problemi + campo evidenziato
- [ ] `18-conferma-uscita.png` — finestra "Hai modifiche non salvate. Uscire comunque?"
```

- [ ] **Step 13: Commit**

```bash
git add docs/manuale-admin
git commit -m "docs(manual): add admin guide for setting la Messa di oggi"
```
