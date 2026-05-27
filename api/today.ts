import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import songIds from '../src/data/song-ids.json'
import { validateTodayPayload, type TodaySet } from '../src/lib/todaySchema.ts'

const redis = Redis.fromEnv()
const KEY = 'today'
const VALID_IDS = new Set<string>(songIds as string[])
const EMPTY: TodaySet = { updatedAt: '', slots: [] }

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method === 'GET') {
    const data = (await redis.get<TodaySet>(KEY)) ?? EMPTY
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    if (req.headers['x-admin-password'] !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'unauthorized' })
    }
    const result = validateTodayPayload(req.body, VALID_IDS)
    if (!result.ok) {
      return res.status(400).json({ error: result.error })
    }
    const value: TodaySet = {
      updatedAt: new Date().toISOString(),
      slots: result.value.slots,
    }
    await redis.set(KEY, value)
    return res.status(200).json(value)
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'method not allowed' })
}
