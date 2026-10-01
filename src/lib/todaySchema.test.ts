import { describe, it, expect } from 'vitest'
import { validateTodayPatch } from './todaySchema.ts'

const valid = new Set(['ti-seguiro', 'eucaristia'])

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

  it('rejects a non-object payload', () => {
    expect(validateTodayPatch(null, valid).ok).toBe(false)
    expect(validateTodayPatch({ churches: 'nope' }, valid).ok).toBe(false)
    expect(validateTodayPatch({ churches: [] }, valid).ok).toBe(false)
  })

  it('rejects a payload missing the churches key', () => {
    expect(validateTodayPatch({ slots: [] }, valid).ok).toBe(false)
  })

  it('rejects a slot missing label or songId', () => {
    expect(
      validateTodayPatch({ churches: { Vezzano: [{ songId: 'eucaristia' }] } }, valid).ok,
    ).toBe(false)
    expect(
      validateTodayPatch({ churches: { Vezzano: [{ label: 'Inizio' }] } }, valid).ok,
    ).toBe(false)
  })

  it('rejects a slot that is not an object', () => {
    expect(validateTodayPatch({ churches: { Vezzano: ['nope'] } }, valid).ok).toBe(false)
  })

  it('rejects when a church value is not an array', () => {
    expect(validateTodayPatch({ churches: { Vezzano: 'nope' } }, valid).ok).toBe(false)
  })
})
