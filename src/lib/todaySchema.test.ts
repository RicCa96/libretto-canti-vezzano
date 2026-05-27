import { describe, it, expect } from 'vitest'
import { validateTodayPayload } from './todaySchema.ts'

const valid = new Set(['ti-seguiro', 'eucaristia'])

describe('validateTodayPayload', () => {
  it('accepts well-formed slots with known song ids', () => {
    const result = validateTodayPayload(
      { slots: [{ label: 'Inizio', songId: 'ti-seguiro' }] },
      valid,
    )
    expect(result).toEqual({
      ok: true,
      value: { slots: [{ label: 'Inizio', songId: 'ti-seguiro' }] },
    })
  })

  it('rejects a non-object payload', () => {
    expect(validateTodayPayload(null, valid).ok).toBe(false)
    expect(validateTodayPayload({ slots: 'nope' }, valid).ok).toBe(false)
  })

  it('rejects a slot with an unknown song id', () => {
    const result = validateTodayPayload(
      { slots: [{ label: 'Inizio', songId: 'does-not-exist' }] },
      valid,
    )
    expect(result.ok).toBe(false)
  })

  it('rejects a slot missing label or songId', () => {
    expect(
      validateTodayPayload({ slots: [{ songId: 'eucaristia' }] }, valid).ok,
    ).toBe(false)
  })
})
