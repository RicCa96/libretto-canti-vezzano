import { describe, it, expect } from 'vitest'
import { transposeChord } from './transpose.ts'

describe('transposeChord', () => {
  it('returns the chord unchanged for 0 semitones', () => {
    expect(transposeChord('C', 0)).toBe('C')
  })
  it('shifts a major chord up', () => {
    expect(transposeChord('C', 2)).toBe('D')
  })
  it('preserves the suffix on minor/seventh chords', () => {
    expect(transposeChord('Am', 2)).toBe('Bm')
    expect(transposeChord('C7', 1)).toBe('C#7')
  })
  it('normalizes flats and wraps at the octave', () => {
    expect(transposeChord('Bb', 1)).toBe('B')
    expect(transposeChord('B', 1)).toBe('C')
    expect(transposeChord('C', -1)).toBe('B')
    expect(transposeChord('C', 12)).toBe('C')
  })
  it('transposes both sides of a slash chord', () => {
    expect(transposeChord('D/F#', 2)).toBe('E/G#')
  })
})
