import type { Song } from '../types.ts'

const modules = import.meta.glob<{ default: Song }>('./*.json', {
  eager: true,
})

export const songs: Song[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.title.localeCompare(b.title, 'it'))

export const songById: Map<string, Song> = new Map(
  songs.map((s) => [s.id, s]),
)
