import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { songById } from '../data/songs/index.ts'
import chordIds from '../data/chord-ids.json'
import { hasChords } from '../lib/chordpro.ts'
import { SongBody } from '../components/SongBody.tsx'
import { useFontSize, FONT_SIZES, FONT_REM } from '../hooks/useFontSize.ts'
import './SongPage.css'

const chordPdfIds = new Set<string>(chordIds)

type View = 'text' | 'chords' | 'pdf'

export function SongPage() {
  const { id } = useParams()
  const location = useLocation()
  const fromHome = (location.state as { from?: string } | null)?.from === '/'
  const backTo = fromHome ? '/' : '/canti'
  const backLabel = fromHome ? '← Messa di oggi' : '← Indice'
  const song = id ? songById.get(id) : undefined
  const [view, setView] = useState<View>('text')
  const [transpose, setTranspose] = useState(0)
  const { size, setSize } = useFontSize()

  if (!song) {
    return (
      <>
        <Link className="song-back" to={backTo}>
          {backLabel}
        </Link>
        <p>Canto non trovato.</p>
      </>
    )
  }

  const hasInline = hasChords(song.body)
  const hasPdf = chordPdfIds.has(song.id)
  const showSegmented = hasInline && hasPdf
  const showInlineToggle = hasInline && !hasPdf
  const showPdfToggle = !hasInline && hasPdf

  return (
    <div style={{ ['--fs-lyric' as string]: FONT_REM[size] }}>
      <Link className="song-back" to={backTo}>
        {backLabel}
      </Link>
      <h2 className="song-title">
        {song.songNumber !== undefined && (
          <span className="song-number-chip" aria-hidden="true">
            {song.songNumber}
          </span>
        )}
        <span className="song-title__text">{song.title}</span>
      </h2>

      <div className="song-controls">
        {showSegmented && (
          <span className="group">
            <button
              type="button"
              aria-pressed={view === 'text'}
              onClick={() => setView('text')}
            >
              Testo
            </button>
            <button
              type="button"
              aria-pressed={view === 'chords'}
              onClick={() => setView('chords')}
            >
              Accordi
            </button>
            <button
              type="button"
              aria-pressed={view === 'pdf'}
              onClick={() => setView('pdf')}
            >
              Spartito
            </button>
          </span>
        )}
        {showInlineToggle && (
          <button
            type="button"
            aria-pressed={view === 'chords'}
            onClick={() => setView(view === 'chords' ? 'text' : 'chords')}
          >
            Accordi {view === 'chords' ? 'on' : 'off'}
          </button>
        )}
        {showPdfToggle && (
          <button
            type="button"
            aria-pressed={view === 'pdf'}
            onClick={() => setView(view === 'pdf' ? 'text' : 'pdf')}
          >
            Spartito {view === 'pdf' ? 'on' : 'off'}
          </button>
        )}
        {view === 'chords' && (
          <span className="group">
            <span>Tono</span>
            <button
              type="button"
              aria-label="Abbassa tono"
              onClick={() => setTranspose((t) => t - 1)}
            >
              −
            </button>
            <button
              type="button"
              aria-label="Alza tono"
              onClick={() => setTranspose((t) => t + 1)}
            >
              +
            </button>
          </span>
        )}
        {view !== 'pdf' && (
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
        )}
      </div>

      {view === 'pdf' ? (
        <object
          className="song-chord-pdf"
          data={`/chords/${song.id}.pdf`}
          type="application/pdf"
          aria-label={`Spartito con accordi: ${song.title}`}
        >
          <p>
            Il tuo browser non riesce a mostrare il PDF.{' '}
            <a href={`/chords/${song.id}.pdf`} target="_blank" rel="noreferrer">
              Apri lo spartito
            </a>
            .
          </p>
        </object>
      ) : (
        <SongBody body={song.body} chordsOn={view === 'chords'} transpose={transpose} />
      )}
    </div>
  )
}
