import { describe, it, expect } from 'vitest'
import { transposeChord } from './transpose.ts'

describe('transposeChord (English notation)', () => {
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

describe('transposeChord (Italian notation)', () => {
  it('returns the chord unchanged for 0 semitones', () => {
    expect(transposeChord('Do', 0)).toBe('Do')
  })
  it('shifts a major chord up', () => {
    expect(transposeChord('Do', 2)).toBe('Re')
    expect(transposeChord('Sol', 2)).toBe('La')
  })
  it('preserves the suffix on minor/seventh chords', () => {
    expect(transposeChord('Lam', 2)).toBe('Sim')
    expect(transposeChord('Mim', 3)).toBe('Solm')
    expect(transposeChord('Do7', 1)).toBe('Do#7')
    expect(transposeChord('Re4', 2)).toBe('Mi4')
  })
  it('normalizes flats and wraps at the octave', () => {
    expect(transposeChord('Sib', 1)).toBe('Si')
    expect(transposeChord('Si', 1)).toBe('Do')
    expect(transposeChord('Do', -1)).toBe('Si')
    expect(transposeChord('Do', 12)).toBe('Do')
  })
  it('transposes both sides of a slash chord', () => {
    expect(transposeChord('Re/Fa#', 2)).toBe('Mi/Sol#')
  })
  it('keeps Italian output for Italian input (no English bleed)', () => {
    expect(transposeChord('Sol', 5)).toBe('Do')
    expect(transposeChord('Fa#m', 1)).toBe('Solm')
  })
})
