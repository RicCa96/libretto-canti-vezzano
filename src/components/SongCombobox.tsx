import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Song } from '../data/types.ts'
import './SongCombobox.css'

type Props = {
  id?: string
  songs: Song[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function SongCombobox({
  id,
  songs,
  value,
  onChange,
  placeholder = 'Cerca un canto…',
}: Props) {
  const reactId = useId()
  const inputId = id ?? `song-cb-${reactId}`
  const listboxId = `${inputId}-listbox`

  const selected = useMemo(
    () => songs.find((s) => s.id === value),
    [songs, value],
  )

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightRaw, setHighlight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = useMemo(() => {
    const q = normalize(query).trim()
    if (!q) return songs
    return songs.filter((s) => normalize(s.title).includes(q))
  }, [songs, query])

  // Clamp without state: if filter shrinks past the highlighted row, snap to top.
  const highlight =
    filtered.length === 0
      ? 0
      : Math.min(Math.max(highlightRaw, 0), filtered.length - 1)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-index="${highlight}"]`,
    )
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlight, open])

  const displayValue = open ? query : selected?.title ?? ''

  const commit = useCallback(
    (song: Song) => {
      onChange(song.id)
      setQuery('')
      setOpen(false)
      inputRef.current?.blur()
    },
    [onChange],
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      setHighlight((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && filtered[highlight]) {
        e.preventDefault()
        commit(filtered[highlight])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className="song-cb" ref={wrapRef}>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && filtered[highlight]
            ? `${inputId}-opt-${highlight}`
            : undefined
        }
        autoComplete="off"
        placeholder={placeholder}
        value={displayValue}
        onFocus={() => {
          setQuery('')
          setOpen(true)
          setHighlight(0)
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="song-cb__list"
        >
          {filtered.length === 0 && (
            <li className="song-cb__empty" role="presentation">
              Nessun canto trovato
            </li>
          )}
          {filtered.map((song, i) => (
            <li
              key={song.id}
              id={`${inputId}-opt-${i}`}
              data-index={i}
              role="option"
              aria-selected={song.id === value}
              className={
                'song-cb__opt' +
                (i === highlight ? ' is-active' : '') +
                (song.id === value ? ' is-selected' : '')
              }
              onMouseDown={(e) => {
                e.preventDefault()
                commit(song)
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              {song.songNumber !== undefined && (
                <span className="song-cb__number" aria-hidden="true">
                  {song.songNumber}
                </span>
              )}
              <span className="song-cb__title">{song.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
