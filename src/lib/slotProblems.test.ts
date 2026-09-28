import { describe, it, expect } from 'vitest'
import { findSlotProblems } from './slotProblems.ts'
import { CHURCHES, type Church } from './churches.ts'
import type { Slot } from './todaySchema.ts'

const validIds = new Set(['ok-song'])

function map(overrides: Partial<Record<Church, Slot[]>> = {}): Record<Church, Slot[]> {
  return {
    ...(Object.fromEntries(CHURCHES.map((c) => [c, []])) as unknown as Record<Church, Slot[]>),
    ...overrides,
  }
}

describe('findSlotProblems', () => {
  it('returns nothing for valid slots', () => {
    const churches = map({ Vezzano: [{ label: 'Inizio', songId: 'ok-song' }] })
    expect(findSlotProblems(churches, ['Vezzano'], validIds)).toEqual([])
  })

  it('reports a missing song with church and 1-based row', () => {
    const churches = map({
      Vezzano: [
        { label: 'Inizio', songId: 'ok-song' },
        { label: 'Offertorio', songId: '' },
      ],
    })
    expect(findSlotProblems(churches, ['Vezzano'], validIds)).toEqual([
      { church: 'Vezzano', index: 1, field: 'song', message: 'Vezzano, riga 2: scegli un canto' },
    ])
  })

  it('reports a blank label (whitespace only)', () => {
    const churches = map({ Puianello: [{ label: '  ', songId: 'ok-song' }] })
    expect(findSlotProblems(churches, ['Puianello'], validIds)).toEqual([
      {
        church: 'Puianello',
        index: 0,
        field: 'label',
        message: 'Puianello, riga 1: il momento è vuoto',
      },
    ])
  })

  it('reports label before song for the same row', () => {
    const churches = map({ Vezzano: [{ label: '', songId: '' }] })
    expect(findSlotProblems(churches, ['Vezzano'], validIds).map((p) => p.field)).toEqual([
      'label',
      'song',
    ])
  })

  it('only checks the given churches', () => {
    const churches = map({ Montalto: [{ label: '', songId: '' }] })
    expect(findSlotProblems(churches, ['Vezzano'], validIds)).toEqual([])
  })
})
