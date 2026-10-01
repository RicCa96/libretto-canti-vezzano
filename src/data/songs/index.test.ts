import { describe, it, expect } from 'vitest'
import { songs, songById } from './index.ts'
import songIds from '../song-ids.json'

describe('song files', () => {
  const files = import.meta.glob<{ default: { id: string } }>(
    ['./*.ts', '!./index.ts', '!./index.test.ts'],
    { eager: true },
  )

  it('use the filename as id', () => {
    for (const [path, mod] of Object.entries(files)) {
      expect(mod.default.id, path).toBe(path.slice(2, -3))
    }
  })

  it('have unique ids', () => {
    const ids = songs.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // The API only accepts ids listed in song-ids.json: a song missing from it
  // shows on the site but cannot be saved into "Messa di oggi".
  it('match song-ids.json exactly', () => {
    const fromFiles = songs.map((s) => s.id).sort()
    expect([...songIds].sort()).toEqual(fromFiles)
  })
})

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
