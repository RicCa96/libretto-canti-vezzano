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
