import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { songById } from '../data/songs/index.ts'
import { hasChords } from '../lib/chordpro.ts'
import { SongBody } from '../components/SongBody.tsx'
import { useFontSize, FONT_SIZES, FONT_REM } from '../hooks/useFontSize.ts'
import './SongPage.css'

export function SongPage() {
  const { id } = useParams()
  const song = id ? songById.get(id) : undefined
  const [chordsOn, setChordsOn] = useState(false)
  const [transpose, setTranspose] = useState(0)
  const { size, setSize } = useFontSize()

  if (!song) {
    return (
      <>
        <Link className="song-back" to="/canti">
          ← Indice
        </Link>
        <p>Canto non trovato.</p>
      </>
    )
  }

  const chorded = hasChords(song.body)

  return (
    <div style={{ ['--fs-lyric' as string]: FONT_REM[size] }}>
      <Link className="song-back" to="/canti">
        ← Indice
      </Link>
      <h2 className="song-title">{song.title}</h2>

      <div className="song-controls">
        {chorded && (
          <button
            type="button"
            aria-pressed={chordsOn}
            onClick={() => setChordsOn((v) => !v)}
          >
            Accordi {chordsOn ? 'on' : 'off'}
          </button>
        )}
        {chorded && chordsOn && (
          <span className="group">
            <span>Tono</span>
            <button type="button" aria-label="Abbassa tono" onClick={() => setTranspose((t) => t - 1)}>
              −
            </button>
            <button type="button" aria-label="Alza tono" onClick={() => setTranspose((t) => t + 1)}>
              +
            </button>
          </span>
        )}
        <span className="group">
          <span>Testo</span>
          {FONT_SIZES.map((fs) => (
            <button
              key={fs}
              type="button"
              aria-pressed={size === fs}
              aria-label={`Dimensione testo ${fs}`}
              onClick={() => setSize(fs)}
            >
              {fs.toUpperCase()}
            </button>
          ))}
        </span>
      </div>

      <SongBody body={song.body} chordsOn={chordsOn} transpose={transpose} />
    </div>
  )
}
