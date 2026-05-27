import { describe, it, expect } from 'vitest'
import { slugify } from './slugify.ts'

describe('slugify', () => {
  it('lowercases and hyphenates words', () => {
    expect(slugify('A TE VORREI DIRE')).toBe('a-te-vorrei-dire')
  })
  it('strips accents', () => {
    expect(slugify('ANDRÒ A VEDERLA UN DÌ')).toBe('andro-a-vederla-un-di')
  })
  it('drops parentheses and apostrophes', () => {
    expect(slugify('ALLELUIA (TAIZÉ)')).toBe('alleluia-taize')
    expect(slugify("LAUDATO SII, O MI' SIGNORE")).toBe('laudato-sii-o-mi-signore')
  })
})
