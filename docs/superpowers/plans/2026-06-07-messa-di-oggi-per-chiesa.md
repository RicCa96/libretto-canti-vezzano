# Messa di oggi per-church songlists — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the landing's single "Messa di oggi" songlist into one list per church (Vezzano, Puianello, Montalto, Pecorile, La Vecchia), exposed through a tabset on landing and admin.

**Architecture:** A new `src/lib/churches.ts` module is the single source of truth for the church list. The Redis `today` key stores `{ updatedAt, churches: Record<Church, Slot[]> }`. Validation enforces all five canonical keys are present. Admin and Landing render a tab strip and show only the active church's list.

**Tech Stack:** React 19 + react-router-dom 7, Vite, Vercel serverless (`@vercel/node`), Upstash Redis, vitest + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-06-07-messa-di-oggi-per-chiesa-design.md`

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `src/lib/churches.ts` | Create | Static `CHURCHES` tuple + `Church` type. |
| `src/lib/churches.test.ts` | Create | Sanity tests on the constant. |
| `src/lib/todaySchema.ts` | Modify | New `TodaySet` shape; validator accepts churches map. |
| `src/lib/todaySchema.test.ts` | Modify | Validator cases for churches map. |
| `api/today.ts` | Modify | GET empty churches map; legacy-shape fallback; POST writes churches map. |
| `api/today.test.ts` | Modify | New GET/POST shape tests; legacy fallback test. |
| `src/pages/Admin.tsx` | Modify | Per-church state, tab strip, save full map. |
| `src/pages/Admin.css` | Modify | `.church-tabs`, `.church-tab`, `.church-tab--active`. |
| `src/pages/Admin.test.tsx` | Modify | Tab interaction + per-church save payload. |
| `src/pages/Landing.tsx` | Modify | Tabset of church songlists, active-only panel. |
| `src/pages/Landing.css` | Modify | `.today-tabs`, `.today-tab`, `.today-tab--active`, `.today-panel`. |
| `src/pages/Landing.test.tsx` | Modify | Tab interaction; empty/loading/error cases. |

---

## Task 1: Static churches list

**Files:**
- Create: `src/lib/churches.ts`
- Create: `src/lib/churches.test.ts`

- [ ] **Step 1: Write the failing test**

Write `src/lib/churches.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { CHURCHES } from './churches.ts'

describe('CHURCHES', () => {
  it('lists the five canonical church names in order', () => {
    expect(CHURCHES).toEqual([
      'Vezzano',
      'Puianello',
      'Montalto',
      'Pecorile',
      'La Vecchia',
    ])
  })

  it('is a readonly tuple', () => {
    // Compile-time check at runtime: array is frozen-equivalent via `as const`.
    // We assert the length so a reordering or accidental push is caught.
    expect(CHURCHES.length).toBe(5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/churches.test.ts`
Expected: FAIL — module `./churches.ts` does not exist.

- [ ] **Step 3: Create the module**

Write `src/lib/churches.ts`:

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/churches.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/churches.ts src/lib/churches.test.ts
git commit -m "feat(churches): add static churches list module"
```

---

## Task 2: Schema update — churches map validation

**Files:**
- Modify: `src/lib/todaySchema.ts`
- Modify: `src/lib/todaySchema.test.ts`

- [ ] **Step 1: Replace the schema tests**

Overwrite `src/lib/todaySchema.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateTodayPayload } from './todaySchema.ts'

const valid = new Set(['ti-seguiro', 'eucaristia'])

function fullChurches(overrides: Record<string, unknown> = {}) {
  return {
    Vezzano: [],
    Puianello: [],
    Montalto: [],
    Pecorile: [],
    'La Vecchia': [],
    ...overrides,
  }
}

describe('validateTodayPayload', () => {
  it('accepts a well-formed churches map with all five churches', () => {
    const result = validateTodayPayload(
      {
        churches: fullChurches({
          Vezzano: [{ label: 'Inizio', songId: 'ti-seguiro' }],
        }),
      },
      valid,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.churches.Vezzano).toEqual([
        { label: 'Inizio', songId: 'ti-seguiro' },
      ])
      expect(result.value.churches.Puianello).toEqual([])
    }
  })

  it('rejects a non-object payload', () => {
    expect(validateTodayPayload(null, valid).ok).toBe(false)
    expect(validateTodayPayload({ churches: 'nope' }, valid).ok).toBe(false)
  })

  it('rejects a payload missing the churches key', () => {
    expect(validateTodayPayload({ slots: [] }, valid).ok).toBe(false)
  })

  it('rejects a payload missing a church key', () => {
    const incomplete = fullChurches() as Record<string, unknown>
    delete incomplete.Montalto
    expect(validateTodayPayload({ churches: incomplete }, valid).ok).toBe(false)
  })

  it('rejects a payload with an unknown church key', () => {
    const extra = fullChurches({ Quattro: [] })
    expect(validateTodayPayload({ churches: extra }, valid).ok).toBe(false)
  })

  it('rejects a slot with an unknown song id', () => {
    const result = validateTodayPayload(
      {
        churches: fullChurches({
          Vezzano: [{ label: 'Inizio', songId: 'does-not-exist' }],
        }),
      },
      valid,
    )
    expect(result.ok).toBe(false)
  })

  it('rejects a slot missing label or songId', () => {
    const result = validateTodayPayload(
      { churches: fullChurches({ Vezzano: [{ songId: 'eucaristia' }] }) },
      valid,
    )
    expect(result.ok).toBe(false)
  })

  it('rejects when a church value is not an array', () => {
    const result = validateTodayPayload(
      { churches: fullChurches({ Vezzano: 'nope' }) },
      valid,
    )
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/todaySchema.test.ts`
Expected: FAIL — existing validator rejects the new shape (no `slots`).

- [ ] **Step 3: Rewrite the schema**

Overwrite `src/lib/todaySchema.ts`:

```ts
import { CHURCHES, type Church } from './churches.ts'

export type Slot = { label: string; songId: string }
export type TodaySet = {
  updatedAt: string
  churches: Record<Church, Slot[]>
}

export type ValidationResult =
  | { ok: true; value: { churches: Record<Church, Slot[]> } }
  | { ok: false; error: string }

function validateSlots(
  raw: unknown,
  validIds: Set<string>,
  churchName: string,
): { ok: true; value: Slot[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, error: `churches.${churchName} must be an array` }
  }
  const clean: Slot[] = []
  for (const slot of raw) {
    if (typeof slot !== 'object' || slot === null) {
      return { ok: false, error: `each slot in ${churchName} must be an object` }
    }
    const { label, songId } = slot as { label?: unknown; songId?: unknown }
    if (typeof label !== 'string' || label.trim() === '') {
      return { ok: false, error: `slot.label must be a non-empty string in ${churchName}` }
    }
    if (typeof songId !== 'string' || !validIds.has(songId)) {
      return { ok: false, error: `unknown songId in ${churchName}: ${String(songId)}` }
    }
    clean.push({ label, songId })
  }
  return { ok: true, value: clean }
}

export function validateTodayPayload(
  payload: unknown,
  validIds: Set<string>,
): ValidationResult {
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

  const out = {} as Record<Church, Slot[]>
  for (const church of CHURCHES) {
    if (!(church in churchesMap)) {
      return { ok: false, error: `missing church: ${church}` }
    }
    const slotsResult = validateSlots(churchesMap[church], validIds, church)
    if (!slotsResult.ok) return slotsResult
    out[church] = slotsResult.value
  }

  return { ok: true, value: { churches: out } }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/todaySchema.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/todaySchema.ts src/lib/todaySchema.test.ts
git commit -m "feat(today-schema): validate per-church songlists payload"
```

---

## Task 3: API — churches map storage and legacy fallback

**Files:**
- Modify: `api/today.ts`
- Modify: `api/today.test.ts`

- [ ] **Step 1: Replace the API tests**

Overwrite `api/today.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = new Map<string, unknown>()
vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: () => ({
      get: async (k: string) => store.get(k) ?? null,
      set: async (k: string, v: unknown) => {
        store.set(k, v)
      },
    }),
  },
}))

import handler from './today.ts'
import { CHURCHES } from '../src/lib/churches.ts'

const EMPTY_MAP = Object.fromEntries(CHURCHES.map((c) => [c, []]))

type ResLike = {
  statusCode: number
  body: unknown
  headers: Record<string, string>
  status: (c: number) => ResLike
  json: (b: unknown) => ResLike
  setHeader: (k: string, v: string) => void
}

function makeRes(): ResLike {
  const res: ResLike = {
    statusCode: 0,
    body: undefined,
    headers: {},
    status(c) {
      this.statusCode = c
      return this
    },
    json(b) {
      this.body = b
      return this
    },
    setHeader(k, v) {
      this.headers[k] = v
    },
  }
  return res
}

beforeEach(() => {
  store.clear()
  process.env.ADMIN_PASSWORD = 'secret'
})

function fullPayload(overrides: Record<string, unknown> = {}) {
  return { churches: { ...EMPTY_MAP, ...overrides } }
}

describe('api/today', () => {
  it('GET returns an empty churches map initially', async () => {
    const res = makeRes()
    await handler({ method: 'GET', headers: {} } as never, res as never)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ updatedAt: '', churches: EMPTY_MAP })
  })

  it('GET falls back to empty churches map for legacy flat data', async () => {
    store.set('today', { updatedAt: 'old', slots: [{ label: 'Inizio', songId: 'x' }] })
    const res = makeRes()
    await handler({ method: 'GET', headers: {} } as never, res as never)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ updatedAt: '', churches: EMPTY_MAP })
  })

  it('GET returns stored churches map', async () => {
    const stored = {
      updatedAt: '2026-06-07T10:00:00.000Z',
      churches: { ...EMPTY_MAP, Vezzano: [{ label: 'Inizio', songId: 'whatever' }] },
    }
    store.set('today', stored)
    const res = makeRes()
    await handler({ method: 'GET', headers: {} } as never, res as never)
    expect(res.body).toEqual(stored)
  })

  it('POST rejects a wrong password with 401', async () => {
    const res = makeRes()
    await handler(
      {
        method: 'POST',
        headers: { 'x-admin-password': 'wrong' },
        body: fullPayload(),
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(401)
  })

  it('POST rejects an unknown song id with 400', async () => {
    const res = makeRes()
    await handler(
      {
        method: 'POST',
        headers: { 'x-admin-password': 'secret' },
        body: fullPayload({
          Vezzano: [{ label: 'Inizio', songId: 'definitely-not-real' }],
        }),
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(400)
  })

  it('POST rejects a payload missing a church with 400', async () => {
    const incomplete = { ...EMPTY_MAP } as Record<string, unknown>
    delete incomplete.Montalto
    const res = makeRes()
    await handler(
      {
        method: 'POST',
        headers: { 'x-admin-password': 'secret' },
        body: { churches: incomplete },
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(400)
  })

  it('POST writes the full churches map and returns it', async () => {
    const res = makeRes()
    await handler(
      {
        method: 'POST',
        headers: { 'x-admin-password': 'secret' },
        body: fullPayload(),
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(200)
    const body = res.body as { updatedAt: string; churches: Record<string, unknown[]> }
    expect(body.updatedAt).not.toBe('')
    expect(body.churches).toEqual(EMPTY_MAP)
    expect(store.get('today')).toEqual(body)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run api/today.test.ts`
Expected: FAIL — current handler returns `{ slots: [] }`, POST validates against the old shape.

- [ ] **Step 3: Update the API handler**

Overwrite `api/today.ts`:

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import songIds from '../src/data/song-ids.json' with { type: 'json' }
import { validateTodayPayload, type TodaySet } from '../src/lib/todaySchema.js'
import { CHURCHES, type Church } from '../src/lib/churches.js'

const redis = Redis.fromEnv()
const KEY = 'today'
const VALID_IDS = new Set<string>(songIds as string[])

function emptyChurches(): Record<Church, []> {
  return Object.fromEntries(CHURCHES.map((c) => [c, []])) as Record<Church, []>
}

const EMPTY: TodaySet = { updatedAt: '', churches: emptyChurches() }

function isValidStoredShape(value: unknown): value is TodaySet {
  if (typeof value !== 'object' || value === null) return false
  const churches = (value as { churches?: unknown }).churches
  return typeof churches === 'object' && churches !== null && !Array.isArray(churches)
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method === 'GET') {
    const raw = await redis.get<unknown>(KEY)
    const data: TodaySet = isValidStoredShape(raw) ? (raw as TodaySet) : EMPTY
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'unauthorized' })
    }
    const result = validateTodayPayload(req.body, VALID_IDS)
    if (result.ok) {
      const value: TodaySet = {
        updatedAt: new Date().toISOString(),
        churches: result.value.churches,
      }
      await redis.set(KEY, value)
      return res.status(200).json(value)
    }
    return res.status(400).json({ error: result.error })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'method not allowed' })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run api/today.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add api/today.ts api/today.test.ts
git commit -m "feat(api/today): store per-church songlists with legacy fallback"
```

---

## Task 4: Admin — per-church state and tab strip

**Files:**
- Modify: `src/pages/Admin.tsx`
- Modify: `src/pages/Admin.test.tsx`

- [ ] **Step 1: Replace the admin tests**

Overwrite `src/pages/Admin.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Admin } from './Admin.tsx'
import { CHURCHES } from '../lib/churches.ts'

const EMPTY_MAP = Object.fromEntries(CHURCHES.map((c) => [c, []]))

describe('Admin', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('renders one tab per church', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ updatedAt: '', churches: EMPTY_MAP }),
      }),
    )
    render(<Admin />)
    for (const church of CHURCHES) {
      expect(await screen.findByRole('tab', { name: church })).toBeInTheDocument()
    }
  })

  it('switches the visible slot list when a tab is clicked', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          updatedAt: '',
          churches: {
            ...EMPTY_MAP,
            Vezzano: [{ label: 'Inizio', songId: 'adeste-fideles' }],
            Puianello: [{ label: 'Offertorio', songId: 'amatevi-fratelli' }],
          },
        }),
      }),
    )
    const user = userEvent.setup()
    render(<Admin />)

    await waitFor(() =>
      expect(screen.getByDisplayValue('Inizio')).toBeInTheDocument(),
    )
    expect(screen.queryByDisplayValue('Offertorio')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Puianello' }))

    await waitFor(() =>
      expect(screen.getByDisplayValue('Offertorio')).toBeInTheDocument(),
    )
    expect(screen.queryByDisplayValue('Inizio')).not.toBeInTheDocument()
  })

  it('saves the full churches map with the password header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ updatedAt: 'now', churches: EMPTY_MAP }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<Admin />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/today'))

    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /aggiungi/i }))
    await user.click(screen.getByRole('button', { name: /salva/i }))

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([, opts]) => opts?.method === 'POST'),
      ).toBe(true),
    )
    const postCall = fetchMock.mock.calls.find(([, opts]) => opts?.method === 'POST')!
    const [, options] = postCall
    expect(options.headers['x-admin-password']).toBe('secret')
    const body = JSON.parse(options.body)
    expect(Object.keys(body.churches).sort()).toEqual([...CHURCHES].sort())
    expect(body.churches[CHURCHES[0]].length).toBe(1)
  })

  it('edits one church without modifying another', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ updatedAt: '', churches: EMPTY_MAP }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<Admin />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/today'))

    // Add a slot on the first tab, then switch and confirm the second tab is still empty.
    await user.click(screen.getByRole('button', { name: /aggiungi/i }))
    expect(screen.getByDisplayValue('Inizio')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: CHURCHES[1] }))
    expect(screen.queryByDisplayValue('Inizio')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/Admin.test.tsx`
Expected: FAIL — no `tab` roles, GET response shape differs.

- [ ] **Step 3: Rewrite the Admin page**

Overwrite `src/pages/Admin.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { songs } from '../data/songs/index.ts'
import { SongCombobox } from '../components/SongCombobox.tsx'
import { CHURCHES, type Church } from '../lib/churches.ts'
import type { Slot, TodaySet } from '../lib/todaySchema.ts'
import './Admin.css'

const DEFAULT_LABELS = ['Inizio', 'Offertorio', 'Comunione', 'Fine']

function emptyChurches(): Record<Church, Slot[]> {
  return Object.fromEntries(CHURCHES.map((c) => [c, []])) as Record<Church, Slot[]>
}

function isErrorStatus(status: string): boolean {
  return /^(Password errata|Errore)/.test(status)
}

export function Admin() {
  const [password, setPassword] = useState('')
  const [churches, setChurches] = useState<Record<Church, Slot[]>>(emptyChurches)
  const [activeChurch, setActiveChurch] = useState<Church>(CHURCHES[0])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/today')
      .then((r) => {
        if (!r.ok) throw new Error('bad response')
        return r.json() as Promise<TodaySet>
      })
      .then((data) => {
        if (!active) return
        const validIds = new Set(songs.map((s) => s.id))
        const incoming = data.churches ?? {}
        const cleaned = emptyChurches()
        for (const church of CHURCHES) {
          const list = Array.isArray(incoming[church]) ? incoming[church] : []
          cleaned[church] = list.filter((s) => validIds.has(s.songId))
        }
        setChurches(cleaned)
      })
      .catch(() => {
        if (active) setStatus('Errore nel caricamento della lista corrente.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const slots = churches[activeChurch]
  const setSlots = (next: Slot[]) =>
    setChurches((c) => ({ ...c, [activeChurch]: next }))

  const addSlot = () => {
    const label = DEFAULT_LABELS[slots.length] ?? 'Canto'
    setSlots([...slots, { label, songId: songs[0]?.id ?? '' }])
  }
  const updateSlot = (i: number, patch: Partial<Slot>) => {
    setSlots(slots.map((slot, j) => (j === i ? { ...slot, ...patch } : slot)))
  }
  const removeSlot = (i: number) => {
    setSlots(slots.filter((_, j) => j !== i))
  }
  const moveSlot = (from: number, to: number) => {
    if (from === to || to < 0 || to >= slots.length) return
    const next = slots.slice()
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setSlots(next)
  }

  const onDragStart = (i: number) => (e: React.DragEvent<HTMLElement>) => {
    setDragIndex(i)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(i))
  }
  const onDragOver = (i: number) => (e: React.DragEvent<HTMLElement>) => {
    if (dragIndex === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== i) setDragOverIndex(i)
  }
  const onDrop = (i: number) => (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault()
    if (dragIndex !== null) moveSlot(dragIndex, i)
    setDragIndex(null)
    setDragOverIndex(null)
  }
  const onDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const save = async () => {
    setStatus('Salvataggio…')
    try {
      const res = await fetch('/api/today', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ churches }),
      })
      if (res.status === 401) {
        setStatus('Password errata.')
        return
      }
      if (!res.ok) {
        setStatus('Errore nel salvataggio.')
        return
      }
      const data = await res.json()
      setStatus(`Salvato alle ${new Date(data.updatedAt).toLocaleString('it-IT')}.`)
    } catch {
      setStatus('Errore di rete.')
    }
  }

  return (
    <div className="admin">
      <h2>Imposta la Messa di oggi</h2>

      <label htmlFor="admin-pw">Password</label>
      <input
        id="admin-pw"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {loading && <p className="status">Caricamento lista corrente…</p>}

      <div className="church-tabs" role="tablist" aria-label="Chiesa">
        {CHURCHES.map((church) => {
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
        })}
      </div>

      <ul className="slot-list">
        {slots.map((slot, i) => {
          const isDragging = dragIndex === i
          const isOver = dragOverIndex === i && dragIndex !== i
          return (
            <li
              className={
                'slot-row' +
                (isDragging ? ' is-dragging' : '') +
                (isOver ? ' is-drop-target' : '')
              }
              key={i}
              onDragOver={onDragOver(i)}
              onDrop={onDrop(i)}
              onDragEnd={onDragEnd}
            >
              <button
                type="button"
                className="slot-handle"
                draggable
                onDragStart={onDragStart(i)}
                onDragEnd={onDragEnd}
                aria-label={`Riordina canto ${i + 1}`}
                title="Trascina per riordinare"
              >
                ⋮⋮
              </button>

              <div className="slot-field slot-field--label">
                <label htmlFor={`label-${i}`}>Momento</label>
                <input
                  id={`label-${i}`}
                  value={slot.label}
                  onChange={(e) => updateSlot(i, { label: e.target.value })}
                />
              </div>

              <div className="slot-field slot-field--song">
                <label htmlFor={`song-${i}`}>Canto</label>
                <SongCombobox
                  id={`song-${i}`}
                  songs={songs}
                  value={slot.songId}
                  onChange={(id) => updateSlot(i, { songId: id })}
                />
              </div>

              <div className="slot-actions">
                <button
                  type="button"
                  className="slot-remove"
                  onClick={() => removeSlot(i)}
                >
                  Rimuovi
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <button type="button" className="add" onClick={addSlot}>
        + Aggiungi canto
      </button>

      <button type="button" className="save" onClick={save}>
        Salva
      </button>

      {status && (
        <p className={isErrorStatus(status) ? 'status status--error' : 'status'}>
          {status}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/Admin.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/Admin.tsx src/pages/Admin.test.tsx
git commit -m "feat(admin): tab per church with isolated slot lists"
```

---

## Task 5: Admin tab styling

**Files:**
- Modify: `src/pages/Admin.css`

- [ ] **Step 1: Append tab styles**

Append to `src/pages/Admin.css` (after the existing `.admin .status--error` block, before the final newline):

```css
.admin .church-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  margin: var(--s-4) 0 0;
}

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
  transition: border-color 120ms, color 120ms, background-color 120ms;
}

.admin .church-tab:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.admin .church-tab--active,
.admin .church-tab--active:hover {
  background: var(--accent);
  color: var(--accent-on);
  border-color: var(--accent);
}
```

- [ ] **Step 2: Verify the dev build does not fail**

Run: `npx tsc -b`
Expected: no type errors. (Pure CSS edit; we run tsc to catch any other regressions.)

- [ ] **Step 3: Commit**

```bash
git add src/pages/Admin.css
git commit -m "style(admin): style church tab strip"
```

---

## Task 6: Landing — tabset of per-church songlists

**Files:**
- Modify: `src/pages/Landing.tsx`
- Modify: `src/pages/Landing.test.tsx`

- [ ] **Step 1: Replace the landing tests**

Overwrite `src/pages/Landing.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Landing } from './Landing.tsx'
import { CHURCHES } from '../lib/churches.ts'

const EMPTY_MAP = Object.fromEntries(CHURCHES.map((c) => [c, []]))

function mockFetchOnce(data: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => data,
    }),
  )
}

describe('Landing', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('renders the instructions section', () => {
    mockFetchOnce({ updatedAt: '', churches: EMPTY_MAP })
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Come uso il libretto/i)).toBeInTheDocument()
  })

  it('renders one tab per church with the first selected by default', async () => {
    mockFetchOnce({ updatedAt: '', churches: EMPTY_MAP })
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    for (const church of CHURCHES) {
      expect(await screen.findByRole('tab', { name: church })).toBeInTheDocument()
    }
    expect(screen.getByRole('tab', { name: CHURCHES[0] })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it("renders the active church's slots as song links", async () => {
    mockFetchOnce({
      updatedAt: '2026-05-27T08:00:00Z',
      churches: {
        ...EMPTY_MAP,
        Vezzano: [{ label: 'Inizio', songId: 'eucaristia' }],
      },
    })
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    await waitFor(() =>
      expect(screen.getByText('Inizio')).toBeInTheDocument(),
    )
    expect(screen.getByRole('link', { name: 'EUCARISTIA' })).toHaveAttribute(
      'href',
      '/canti/eucaristia',
    )
  })

  it('swaps the visible songlist when a different tab is clicked', async () => {
    mockFetchOnce({
      updatedAt: '',
      churches: {
        ...EMPTY_MAP,
        Vezzano: [{ label: 'Inizio', songId: 'eucaristia' }],
        Puianello: [{ label: 'Offertorio', songId: 'adeste-fideles' }],
      },
    })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(screen.getByText('Inizio')).toBeInTheDocument(),
    )
    expect(screen.queryByText('Offertorio')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Puianello' }))

    await waitFor(() =>
      expect(screen.getByText('Offertorio')).toBeInTheDocument(),
    )
    expect(screen.queryByText('Inizio')).not.toBeInTheDocument()
  })

  it("shows an empty-church message when the active church has no songs", async () => {
    mockFetchOnce({ updatedAt: '', churches: EMPTY_MAP })
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    await waitFor(() =>
      expect(screen.getByText(/Nessun canto impostato\./)).toBeInTheDocument(),
    )
  })

  it('shows a single error message and hides tabs on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false }),
    )
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    await waitFor(() =>
      expect(screen.getByText(/Impossibile caricare/i)).toBeInTheDocument(),
    )
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/Landing.test.tsx`
Expected: FAIL — no `tab` roles, current Landing reads `today.slots`.

- [ ] **Step 3: Rewrite the Landing page**

Overwrite `src/pages/Landing.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { songById } from '../data/songs/index.ts'
import { CHURCHES, type Church } from '../lib/churches.ts'
import { slugify } from '../lib/slugify.ts'
import type { TodaySet } from '../lib/todaySchema.ts'
import './Landing.css'

export function Landing() {
  const [today, setToday] = useState<TodaySet | null>(null)
  const [error, setError] = useState(false)
  const [activeChurch, setActiveChurch] = useState<Church>(CHURCHES[0])

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
      <details className="intro">
        <summary className="intro-summary">
          <h2>Come uso il libretto?</h2>
        </summary>
        <p className="intro-lede">
          Il nostro libretto digitale è un libretto intelligente: tocca una
          voce qui sotto per scoprire come usarlo al meglio.
        </p>
        <em>Buon canto!</em>

        <details className="intro-item">
          <summary>Trovare un canto</summary>
          <div className="intro-item__body">
            <p>
              Apri l'<strong>Indice</strong> e cerca un canto per titolo con la
              barra di ricerca in alto. In alternativa scorri l'elenco: tocca
              il titolo per aprire il testo.
            </p>
            <p>
              Nella sezione <strong>"La Messa di oggi"</strong> trovi i canti già scelti per la
              celebrazione: toccali per aprirli al volo.
            </p>
          </div>
        </details>

        <details className="intro-item">
          <summary>Saltare a una lettera</summary>
          <div className="intro-item__body">
            <p>
              Nell'indice ogni gruppo di canti è contrassegnato con una grande lettera.
              Toccala per aprire un menù da cui saltare rapidamente a un'altra
              lettera dell'alfabeto per trovare più in fretta il canto che cerchi.
            </p>
          </div>
        </details>

        <details className="intro-item">
          <summary>Canti con accordi</summary>
          <div className="intro-item__body">
            <p>
              I canti che riportano anche gli accordi sono segnalati nell'indice
              con una piccola icona a forma di nota musicale.
            </p>
            <p>
              Aperto il canto, attiva gli accordi con il pulsante{' '}
              <strong>Accordi on/off</strong>. Quando sono accesi puoi trasporre
              tonalità con i tasti <strong>−</strong> e <strong>+</strong>.
            </p>
          </div>
        </details>

        <details className="intro-item">
          <summary>Dimensione del testo</summary>
          <div className="intro-item__body">
            <p>
              Sopra al canto trovi la sezione <strong>Testo</strong> con i
              pulsanti <strong>S</strong>, <strong>M</strong>,{' '}
              <strong>L</strong> e <strong>XL</strong>: scegli la grandezza
              più comoda per leggere.
            </p>
          </div>
        </details>

        <details className="intro-item">
          <summary>Tornare all'indice</summary>
          <div className="intro-item__body">
            <p>
              Sopra al titolo di ogni canto trovi il link{' '}
              <strong>← Indice</strong> per tornare indietro.{' '}
            </p>
          </div>
        </details>
      </details>

      <section className="today">
        <h2>La Messa di oggi</h2>
        {error && (
          <p className="today-message">
            Impossibile caricare i canti di oggi. Riprova più tardi.
          </p>
        )}
        {!error && today === null && <p className="today-message">Caricamento…</p>}
        {!error && today !== null && (
          <>
            <div className="today-tabs" role="tablist" aria-label="Chiesa">
              {CHURCHES.map((church) => {
                const isActive = church === activeChurch
                return (
                  <button
                    key={church}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`today-panel-${slugify(church)}`}
                    id={`today-tab-${slugify(church)}`}
                    className={'today-tab' + (isActive ? ' today-tab--active' : '')}
                    onClick={() => setActiveChurch(church)}
                  >
                    {church}
                  </button>
                )
              })}
            </div>

            <div
              role="tabpanel"
              id={`today-panel-${slugify(activeChurch)}`}
              aria-labelledby={`today-tab-${slugify(activeChurch)}`}
              className="today-panel"
            >
              {(today.churches[activeChurch] ?? []).length === 0 ? (
                <p className="today-message">Nessun canto impostato.</p>
              ) : (
                <ul className="today-list">
                  {today.churches[activeChurch].map((slot, i) => {
                    const song = songById.get(slot.songId)
                    return (
                      <li key={i}>
                        <span className="slot-label">{slot.label}</span>
                        {song ? (
                          <Link
                            className="slot-title"
                            to={`/canti/${song.id}`}
                            state={{ from: '/' }}
                            aria-label={song.title}
                          >
                            {song.songNumber !== undefined && (
                              <span className="song-number-chip" aria-hidden="true">
                                {song.songNumber}
                              </span>
                            )}
                            <span className="slot-title__text">{song.title}</span>
                          </Link>
                        ) : (
                          <span className="slot-title">{slot.songId}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/Landing.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/pages/Landing.tsx src/pages/Landing.test.tsx
git commit -m "feat(landing): expose per-church songlists via tabset"
```

---

## Task 7: Landing tab styling

**Files:**
- Modify: `src/pages/Landing.css`

- [ ] **Step 1: Append tab styles**

Append to `src/pages/Landing.css`:

```css
.today-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  margin: 0 0 var(--s-3);
}

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
  transition: border-color 120ms, color 120ms, background-color 120ms;
}

.today-tab:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.today-tab--active,
.today-tab--active:hover {
  background: var(--accent);
  color: var(--accent-on);
  border-color: var(--accent);
}

.today-panel {
  margin: 0;
}
```

- [ ] **Step 2: Verify the build does not regress**

Run: `npx tsc -b && npx vitest run`
Expected: full test suite PASS, no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Landing.css
git commit -m "style(landing): style today tab strip"
```

---

## Task 8: End-to-end sanity check

**Files:** none (manual verification).

- [ ] **Step 1: Run dev server**

Run: `npm run dev`
Expected: Vite starts without errors.

- [ ] **Step 2: Smoke test the admin page**

- Open `http://localhost:5173/admin`.
- Confirm five tabs render (Vezzano, Puianello, Montalto, Pecorile, La Vecchia).
- Click each tab: slot list resets to that church's content. Adding a slot on one tab does not affect another.
- Type the admin password, add one song per church, click "Salva".
- Confirm success status with timestamp.

- [ ] **Step 3: Smoke test the landing page**

- Open `http://localhost:5173/`.
- Confirm "La Messa di oggi" section shows five tabs; Vezzano selected by default.
- Switching tabs shows that church's songs. Empty churches show "Nessun canto impostato."
- Click a song link → song page opens with "← Messa di oggi" back link.
- Press back: returns to landing with the previously active church still selected (acceptable to reset — verify behaviour matches spec; spec does not require persistence).

- [ ] **Step 4: Stop dev server**

Ctrl-C.

- [ ] **Step 5 (only if step 2 or 3 surfaced an issue): file follow-up**

If a smoke-test bug is found, fix it in a follow-up commit before declaring done. Do not skip.

---

## Self-Review Notes

- **Spec coverage:** Static church list (Task 1), schema (Task 2), API + legacy fallback (Task 3), admin tabset (Tasks 4–5), landing tabset (Tasks 6–7), all test categories from the spec covered.
- **Placeholder scan:** no TBDs, no "add appropriate handling" — all code blocks complete.
- **Type consistency:** `Record<Church, Slot[]>` used uniformly across `todaySchema.ts`, `api/today.ts`, `Admin.tsx`, `Landing.tsx`. `CHURCHES` imported the same way everywhere.
- **Migration:** legacy flat data discarded on GET (Task 3 test confirms).
- **Out-of-scope guarded:** no per-user church selection, no per-church `updatedAt`, no env-var config — none of these appear in tasks.
