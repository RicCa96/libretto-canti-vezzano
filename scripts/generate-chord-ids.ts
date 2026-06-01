// Scans public/chords/*.pdf and writes src/data/chord-ids.json.
// Run with: npx tsx scripts/generate-chord-ids.ts
// Auto-invoked by `predev` and `prebuild`.
import { readdirSync, writeFileSync, existsSync } from 'node:fs'

const CHORDS_DIR = 'public/chords'
const SONGS_DIR = 'src/data/songs'
const OUT = 'src/data/chord-ids.json'

const songIds = new Set(
  readdirSync(SONGS_DIR)
    .filter(
      (f) => f.endsWith('.ts') && f !== 'index.ts' && f !== 'index.test.ts',
    )
    .map((f) => f.replace(/\.ts$/, '')),
)

const pdfIds = existsSync(CHORDS_DIR)
  ? readdirSync(CHORDS_DIR)
      .filter((f) => f.endsWith('.pdf'))
      .map((f) => f.replace(/\.pdf$/, ''))
  : []

const matched: string[] = []
const orphans: string[] = []
for (const id of pdfIds) {
  if (songIds.has(id)) matched.push(id)
  else orphans.push(id)
}
matched.sort()

writeFileSync(OUT, JSON.stringify(matched, null, 2) + '\n')
console.log(`Wrote ${matched.length} chord ids to ${OUT}`)
if (orphans.length) {
  console.warn(
    `Warning: ${orphans.length} PDF(s) without matching song id:\n  ${orphans.join('\n  ')}`,
  )
}
