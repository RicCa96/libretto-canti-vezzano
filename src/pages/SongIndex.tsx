import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { songs } from '../data/songs/index.ts'
import { hasChords } from '../lib/chordpro.ts'
import { LetterJumpSheet } from '../components/LetterJumpSheet.tsx'
import './SongIndex.css'

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function ChordIcon() {
  return (
    <svg
      className="song-chord-icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9 3v10.55A4 4 0 1 0 11 17V7h6V3H9z" />
    </svg>
  )
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
  const [triggerLetter, setTriggerLetter] = useState<string | null>(null)
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

  const handleHeaderClick = useCallback((e: React.MouseEvent<HTMLButtonElement>, letter: string) => {
    lastTriggerRef.current = e.currentTarget
    setTriggerLetter(letter)
    setSheetOpen(true)
  }, [])

  const handlePick = useCallback((letter: string) => {
    const section = document.getElementById(`letter-${letter}`)
    section?.scrollIntoView({ block: 'start' })
    setSheetOpen(false)
    setTriggerLetter(null)
    section?.querySelector<HTMLButtonElement>('button.index-group-letter')?.focus()
  }, [])

  const handleClose = useCallback(() => {
    setSheetOpen(false)
    setTriggerLetter(null)
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
              aria-expanded={triggerLetter === letter ? true : undefined}
              aria-controls="letter-jump-sheet"
              aria-label={`${letter} — apri menu lettere`}
              onClick={(e) => handleHeaderClick(e, letter)}
            >
              {letter}
            </button>
            <ul className="index-list">
              {list.map((song) => (
                <li key={song.id}>
                  <Link
                    to={`/canti/${song.id}`}
                    className="index-list__link"
                    aria-label={song.title}
                  >
                    {song.songNumber !== undefined && (
                      <span className="song-number-chip" aria-hidden="true">
                        {song.songNumber}
                      </span>
                    )}
                    <span className="index-list__title">{song.title}</span>
                    {hasChords(song.body) && (
                      <span className="song-chord-flag" title="Con accordi">
                        <ChordIcon />
                      </span>
                    )}
                  </Link>
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
