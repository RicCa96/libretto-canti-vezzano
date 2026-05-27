import { describe, it, expect } from 'vitest'
import { parseChordPro, hasChords } from './chordpro.ts'

describe('hasChords', () => {
  it('is true when a chord bracket is present', () => {
    expect(hasChords('[C]Se il sole')).toBe(true)
  })
  it('is false for plain lyrics', () => {
    expect(hasChords('Se il sole non illuminasse')).toBe(false)
  })
})

describe('parseChordPro', () => {
  it('splits a lyric line into chord/text segments', () => {
    const lines = parseChordPro('[C]Se il sole non [G]illumi[Am]nasse più')
    expect(lines).toEqual([
      {
        type: 'lyric',
        segments: [
          { chord: 'C', text: 'Se il sole non ' },
          { chord: 'G', text: 'illumi' },
          { chord: 'Am', text: 'nasse più' },
        ],
      },
    ])
  })

  it('handles leading text before the first chord', () => {
    const lines = parseChordPro('Se il [C]sole')
    expect(lines[0]).toEqual({
      type: 'lyric',
      segments: [
        { text: 'Se il ' },
        { chord: 'C', text: 'sole' },
      ],
    })
  })

  it('marks RIT. lines as refrain labels', () => {
    const lines = parseChordPro('RIT.')
    expect(lines[0]).toEqual({ type: 'refrain-label', text: 'RIT.' })
  })

  it('marks blank lines', () => {
    const lines = parseChordPro('a\n\nb')
    expect(lines.map((l) => l.type)).toEqual(['lyric', 'blank', 'lyric'])
  })
})
