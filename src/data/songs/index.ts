import type { Song } from '../types.ts'

const modules = import.meta.glob<{ default: Song }>(
  ['./*.ts', '!./index.ts', '!./index.test.ts'],
  { eager: true },
)

export const songs: Song[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.title.localeCompare(b.title, 'it'))

export const songById: Map<string, Song> = new Map(
  songs.map((s) => [s.id, s]),
)
