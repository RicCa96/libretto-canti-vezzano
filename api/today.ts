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
