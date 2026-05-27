// One-time importer: docs/libretto.docx -> src/data/songs/*.json + song-ids.json
// Run with: npx tsx scripts/import-docx.ts
import { execSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { slugify } from '../src/lib/slugify.ts'

const DOCX = 'docs/libretto.docx'
const OUT_DIR = 'src/data/songs'

// 1. Unzip document.xml from the .docx
const tmp = mkdtempSync(join(tmpdir(), 'libretto-'))
execSync(`unzip -o -q "${DOCX}" word/document.xml -d "${tmp}"`)
const xml = readFileSync(join(tmp, 'word/document.xml'), 'utf-8')

// 2. Walk paragraphs; capture style + concatenated run text
type Para = { style: string; text: string }
const paras: Para[] = []
const paraRe = /<w:p[ >][\s\S]*?<\/w:p>/g
for (const p of xml.match(paraRe) ?? []) {
  const style = /<w:pStyle w:val="([^"]+)"/.exec(p)?.[1] ?? ''
  const text = (p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? [])
    .map((t) => t.replace(/<[^>]+>/g, '')) // keep only run text, drop any stray tags
    .join('')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
  paras.push({ style, text })
}

// 3. Split into songs on Heading1; skip landing + index (everything before the
//    first Heading1 that is followed by a "TORNA ALL'INDICE" back-link paragraph).
type Song = { id: string; title: string; body: string }
const songs: Song[] = []
let current: Song | null = null
let expectBacklink = false

for (let i = 0; i < paras.length; i++) {
  const { style, text } = paras[i]
  if (style === 'Heading1') {
    const next = paras[i + 1]
    const isSong = next && /TORNA ALL/i.test(next.text)
    if (isSong) {
      if (current) songs.push(current)
      current = { id: slugify(text), title: text, body: '' }
      expectBacklink = true
      continue
    }
    // Heading1 that is NOT a song (e.g. "INDICE DEI CANTI") ends any current song
    if (current) {
      songs.push(current)
      current = null
    }
    continue
  }
  if (!current) continue
  if (expectBacklink && /TORNA ALL/i.test(text)) {
    expectBacklink = false
    continue // drop the back-link paragraph; the app regenerates it
  }
  // Skip index-style heading rows that may leak between songs
  if (style.startsWith('Heading')) continue
  if (text === '') {
    current.body += '\n'
  } else if (/^RIT\.?\b/i.test(text)) {
    // Emit a standalone RIT. label line, then the refrain's first line
    const rest = text.replace(/^RIT\.?\s*/i, '')
    current.body += 'RIT.\n'
    if (rest) current.body += rest + '\n'
  } else {
    current.body += text + '\n'
  }
}
if (current) songs.push(current)

// 4. Write files
mkdirSync(OUT_DIR, { recursive: true })
for (const song of songs) {
  song.body = song.body.replace(/\n{3,}/g, '\n\n').trim()
  writeFileSync(
    join(OUT_DIR, `${song.id}.json`),
    JSON.stringify(song, null, 2) + '\n',
  )
}
writeFileSync(
  'src/data/song-ids.json',
  JSON.stringify(songs.map((s) => s.id).sort(), null, 2) + '\n',
)
console.log(`Wrote ${songs.length} songs to ${OUT_DIR}`)
