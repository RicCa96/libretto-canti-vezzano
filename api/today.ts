import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import songIds from '../src/data/song-ids.json' with { type: 'json' }
import { validateTodayPatch, type Slot, type TodaySet } from '../src/lib/todaySchema.js'
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

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'method not allowed' })
}
