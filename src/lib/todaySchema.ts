export type Slot = { label: string; songId: string }
export type TodaySet = { updatedAt: string; slots: Slot[] }

export type ValidationResult =
  | { ok: true; value: { slots: Slot[] } }
  | { ok: false; error: string }

export function validateTodayPayload(
  payload: unknown,
  validIds: Set<string>,
): ValidationResult {
  if (typeof payload !== 'object' || payload === null) {
    return { ok: false, error: 'payload must be an object' }
  }
  const slots = (payload as { slots?: unknown }).slots
  if (!Array.isArray(slots)) {
    return { ok: false, error: 'slots must be an array' }
  }
  const clean: Slot[] = []
  for (const slot of slots) {
    if (typeof slot !== 'object' || slot === null) {
      return { ok: false, error: 'each slot must be an object' }
    }
    const { label, songId } = slot as { label?: unknown; songId?: unknown }
    if (typeof label !== 'string' || label.trim() === '') {
      return { ok: false, error: 'slot.label must be a non-empty string' }
    }
    if (typeof songId !== 'string' || !validIds.has(songId)) {
      return { ok: false, error: `unknown songId: ${String(songId)}` }
    }
    clean.push({ label, songId })
  }
  return { ok: true, value: { slots: clean } }
}
