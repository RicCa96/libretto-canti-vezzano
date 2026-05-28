import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { songs } from '../data/songs/index.ts'
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
          <section key={letter}>
            <h3 className="index-group-letter">{letter}</h3>
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
    </>
  )
}
