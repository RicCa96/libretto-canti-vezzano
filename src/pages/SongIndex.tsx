import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { songs } from '../data/songs/index.ts'
import { LetterJumpSheet } from '../components/LetterJumpSheet.tsx'
import './SongIndex.css'

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function SearchIcon() {
  return (
    <svg
      className="index-search__icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function SongIndex() {
  const [query, setQuery] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null)

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    if (q === '') return songs
    return songs.filter((s) => normalize(s.title).includes(q))
  }, [query])

  const groups = useMemo(() => {
    const map = new Map<string, typeof songs>()
    for (const song of filtered) {
      const letter = song.title[0]?.toUpperCase() ?? '#'
      const list = map.get(letter) ?? []
      list.push(song)
      map.set(letter, list)
    }
    return [...map.entries()]
  }, [filtered])

  const letters = useMemo(() => groups.map(([letter]) => letter), [groups])

  const handleHeaderClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    lastTriggerRef.current = e.currentTarget
    setSheetOpen(true)
  }, [])

  const handlePick = useCallback((letter: string) => {
    document.getElementById(`letter-${letter}`)?.scrollIntoView({ block: 'start' })
    setSheetOpen(false)
  }, [])

  const handleClose = useCallback(() => {
    setSheetOpen(false)
    lastTriggerRef.current?.focus()
  }, [])

  return (
    <>
      <div className="index-search">
        <SearchIcon />
        <input
          type="search"
          className="index-search__input"
          placeholder="Cerca un canto…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cerca un canto"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="index-empty">Nessun canto trovato.</p>
      ) : (
        groups.map(([letter, list]) => (
          <section key={letter} id={`letter-${letter}`}>
            <button
              type="button"
              className="index-group-letter"
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              aria-controls="letter-jump-sheet"
              aria-label={`${letter} — apri menu lettere`}
              onClick={handleHeaderClick}
            >
              {letter}
            </button>
            <ul className="index-list">
              {list.map((song) => (
                <li key={song.id}>
                  <Link to={`/canti/${song.id}`}>{song.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      <LetterJumpSheet
        letters={letters}
        open={sheetOpen}
        onClose={handleClose}
        onPick={handlePick}
      />
    </>
  )
}
