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
