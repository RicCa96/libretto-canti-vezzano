import { describe, it, expect } from 'vitest'
import { validateTodayPatch, validateTodayPayload } from './todaySchema.ts'

const valid = new Set(['ti-seguiro', 'eucaristia'])

function fullChurches(overrides: Record<string, unknown> = {}) {
  return {
    Vezzano: [],
    Puianello: [],
    Montalto: [],
    Pecorile: [],
    'La Vecchia': [],
    ...overrides,
  }
}

describe('validateTodayPayload', () => {
  it('accepts a well-formed churches map with all five churches', () => {
    const result = validateTodayPayload(
      {
        churches: fullChurches({
          Vezzano: [{ label: 'Inizio', songId: 'ti-seguiro' }],
        }),
      },
      valid,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.churches.Vezzano).toEqual([
        { label: 'Inizio', songId: 'ti-seguiro' },
      ])
      expect(result.value.churches.Puianello).toEqual([])
    }
  })

  it('rejects a non-object payload', () => {
    expect(validateTodayPayload(null, valid).ok).toBe(false)
    expect(validateTodayPayload({ churches: 'nope' }, valid).ok).toBe(false)
  })

  it('rejects a payload missing the churches key', () => {
    expect(validateTodayPayload({ slots: [] }, valid).ok).toBe(false)
  })

  it('rejects a payload missing a church key', () => {
    const incomplete = fullChurches() as Record<string, unknown>
    delete incomplete.Montalto
    expect(validateTodayPayload({ churches: incomplete }, valid).ok).toBe(false)
  })

  it('rejects a payload with an unknown church key', () => {
    const extra = fullChurches({ Quattro: [] })
    expect(validateTodayPayload({ churches: extra }, valid).ok).toBe(false)
  })

  it('rejects a slot with an unknown song id', () => {
    const result = validateTodayPayload(
      {
        churches: fullChurches({
          Vezzano: [{ label: 'Inizio', songId: 'does-not-exist' }],
        }),
      },
      valid,
    )
    expect(result.ok).toBe(false)
  })

  it('rejects a slot missing label or songId', () => {
    const result = validateTodayPayload(
      { churches: fullChurches({ Vezzano: [{ songId: 'eucaristia' }] }) },
      valid,
    )
    expect(result.ok).toBe(false)
  })

  it('rejects when a church value is not an array', () => {
    const result = validateTodayPayload(
      { churches: fullChurches({ Vezzano: 'nope' }) },
      valid,
    )
    expect(result.ok).toBe(false)
  })
})

describe('validateTodayPatch', () => {
  it('accepts a subset of churches', () => {
    const result = validateTodayPatch(
      { churches: { Vezzano: [{ label: 'Inizio', songId: 'ti-seguiro' }] } },
      valid,
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.churches).toEqual({
        Vezzano: [{ label: 'Inizio', songId: 'ti-seguiro' }],
      })
    }
  })

  it('accepts a church being emptied', () => {
    const result = validateTodayPatch({ churches: { Montalto: [] } }, valid)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.churches).toEqual({ Montalto: [] })
  })

  it('rejects an empty churches object', () => {
    const result = validateTodayPatch({ churches: {} }, valid)
    expect(result).toEqual({ ok: false, error: 'no churches to update' })
  })

  it('rejects an unknown church key', () => {
    expect(validateTodayPatch({ churches: { Quattro: [] } }, valid).ok).toBe(false)
  })

  it('rejects a slot with an empty label', () => {
    const result = validateTodayPatch(
      { churches: { Vezzano: [{ label: '   ', songId: 'ti-seguiro' }] } },
      valid,
    )
    expect(result.ok).toBe(false)
  })

  it('rejects a slot with an unknown song id', () => {
    const result = validateTodayPatch(
      { churches: { Vezzano: [{ label: 'Inizio', songId: '' }] } },
      valid,
    )
    expect(result.ok).toBe(false)
  })
})
