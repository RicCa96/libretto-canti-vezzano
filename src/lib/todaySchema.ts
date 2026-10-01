import { CHURCHES, type Church } from './churches.js'

export type Slot = { label: string; songId: string }
export type TodaySet = {
  updatedAt: string
  churches: Record<Church, Slot[]>
}

export type ChurchesPatch = Partial<Record<Church, Slot[]>>

export type PatchValidationResult =
  | { ok: true; value: { churches: ChurchesPatch } }
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

export function validateTodayPatch(
  payload: unknown,
  validIds: Set<string>,
): PatchValidationResult {
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
    if (!(church in churchesMap)) continue
    const slotsResult = validateSlots(churchesMap[church], validIds, church)
    if (!slotsResult.ok) return slotsResult
    out[church] = slotsResult.value
  }

  if (Object.keys(out).length === 0) {
    return { ok: false, error: 'no churches to update' }
  }
  return { ok: true, value: { churches: out } }
}
