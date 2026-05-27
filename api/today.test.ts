import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Upstash so no network is needed
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

describe('api/today', () => {
  it('GET returns an empty set initially', async () => {
    const res = makeRes()
    await handler({ method: 'GET', headers: {} } as never, res as never)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ updatedAt: '', slots: [] })
  })

  it('POST rejects a wrong password with 401', async () => {
    const res = makeRes()
    await handler(
      {
        method: 'POST',
        headers: { 'x-admin-password': 'wrong' },
        body: { slots: [] },
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
        body: { slots: [{ label: 'Inizio', songId: 'definitely-not-real' }] },
      } as never,
      res as never,
    )
    expect(res.statusCode).toBe(400)
  })
})
