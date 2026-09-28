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
  it('is false when a songId differs', () => {
    expect(slotsEqual([a], [{ ...a, songId: 'different' }])).toBe(false)
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
