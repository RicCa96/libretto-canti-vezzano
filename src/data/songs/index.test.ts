import { describe, it, expect } from 'vitest'
import { songs, songById } from './index.ts'

describe('song index', () => {
  it('loads bundled songs', () => {
    expect(songs.length).toBeGreaterThanOrEqual(2)
  })
  it('sorts songs by title (Italian locale)', () => {
    const titles = songs.map((s) => s.title)
    const sorted = [...titles].sort((a, b) => a.localeCompare(b, 'it'))
    expect(titles).toEqual(sorted)
  })
  it('looks a song up by id', () => {
    expect(songById.get('eucaristia')?.title).toBe('EUCARISTIA')
  })
})
