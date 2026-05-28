import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { songById } from '../data/songs/index.ts'
import type { TodaySet } from '../lib/todaySchema.ts'
import './Landing.css'

export function Landing() {
  const [today, setToday] = useState<TodaySet | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/today')
      .then((r) => {
        if (!r.ok) throw new Error('bad response')
        return r.json()
      })
      .then((data: TodaySet) => {
        if (active) setToday(data)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <>
      <section className="intro">
        <h2>Come uso il libretto?</h2>
        <p>
          Il nostro libretto digitale è un libretto intelligente! Per andare al
          testo di un canto, trovane il titolo nell'indice dei canti o nella
          sezione "La Messa di oggi" e toccalo: verrai portato subito al testo.
        </p>
        <p>
          Sotto al titolo di ogni canto trovi il link "← Indice" per tornare
          indietro. <em>Buon canto!</em>
        </p>
      </section>

      <section className="today">
        <h2>La Messa di oggi</h2>
        {error && (
          <p className="today-message">
            Impossibile caricare i canti di oggi. Riprova più tardi.
          </p>
        )}
        {!error && today === null && <p className="today-message">Caricamento…</p>}
        {!error && today !== null && today.slots.length === 0 && (
          <p className="today-message">Nessun canto impostato per oggi.</p>
        )}
        {!error && today !== null && today.slots.length > 0 && (
          <>
            <ul className="today-list">
              {today.slots.map((slot, i) => {
                const song = songById.get(slot.songId)
                return (
                  <li key={i}>
                    <span className="slot-label">{slot.label}</span>
                    {song ? (
                      <Link
                        className="slot-title"
                        to={`/canti/${song.id}`}
                        aria-label={song.title}
                      >
                        {song.songNumber !== undefined && (
                          <span className="song-number-chip" aria-hidden="true">
                            {song.songNumber}
                          </span>
                        )}
                        <span className="slot-title__text">{song.title}</span>
                      </Link>
                    ) : (
                      <span className="slot-title">{slot.songId}</span>
                    )}
                  </li>
                )
              })}
            </ul>
            {today.updatedAt && (
              <p className="today-updated">
                Aggiornato: {new Date(today.updatedAt).toLocaleString('it-IT')}
              </p>
            )}
          </>
        )}
      </section>
    </>
  )
}
