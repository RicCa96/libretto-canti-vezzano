import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { songById } from '../data/songs/index.ts'
import { CHURCHES, type Church } from '../lib/churches.ts'
import { slugify } from '../lib/slugify.ts'
import type { TodaySet } from '../lib/todaySchema.ts'
import { useFavoriteChurch } from '../hooks/useFavoriteChurch.ts'
import './Landing.css'

export function Landing() {
  const [today, setToday] = useState<TodaySet | null>(null)
  const [error, setError] = useState(false)
  const { favorite, setFavorite, clearFavorite } = useFavoriteChurch()
  const [activeChurch, setActiveChurch] = useState<Church>(
    () => favorite ?? CHURCHES[0],
  )

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
      <details className="intro">
        <summary className="intro-summary">
          <h2>Come uso il libretto?</h2>
        </summary>
        <p className="intro-lede">
          Il nostro libretto digitale è un libretto intelligente: tocca una
          voce qui sotto per scoprire come usarlo al meglio.
        </p>
        <em>Buon canto!</em>

        <details className="intro-item">
          <summary>Trovare un canto</summary>
          <div className="intro-item__body">
            <p>
              Apri l'<strong>Indice</strong> e cerca un canto per titolo con la
              barra di ricerca in alto. In alternativa scorri l'elenco: tocca
              il titolo per aprire il testo.
            </p>
            <p>
              Nella sezione <strong>"La Messa di oggi"</strong> trovi i canti già scelti per la
              celebrazione: toccali per aprirli al volo.
            </p>
          </div>
        </details>

        <details className="intro-item">
          <summary>Saltare a una lettera</summary>
          <div className="intro-item__body">
            <p>
              Nell'indice ogni gruppo di canti è contrassegnato con una grande lettera.
              Toccala per aprire un menù da cui saltare rapidamente a un'altra
              lettera dell'alfabeto per trovare più in fretta il canto che cerchi.
            </p>
          </div>
        </details>

        <details className="intro-item">
          <summary>Canti con accordi</summary>
          <div className="intro-item__body">
            <p>
              I canti che riportano anche gli accordi sono segnalati nell'indice
              con una piccola icona a forma di nota musicale.
            </p>
            <p>
              Aperto il canto, attiva gli accordi con il pulsante{' '}
              <strong>Accordi on/off</strong>. Quando sono accesi puoi trasporre
              tonalità con i tasti <strong>−</strong> e <strong>+</strong>.
            </p>
          </div>
        </details>

        <details className="intro-item">
          <summary>Dimensione del testo</summary>
          <div className="intro-item__body">
            <p>
              Sopra al canto trovi la sezione <strong>Testo</strong> con i
              pulsanti <strong>S</strong>, <strong>M</strong>,{' '}
              <strong>L</strong> e <strong>XL</strong>: scegli la grandezza
              più comoda per leggere.
            </p>
          </div>
        </details>

        <details className="intro-item">
          <summary>Tornare all'indice</summary>
          <div className="intro-item__body">
            <p>
              Sopra al titolo di ogni canto trovi il link{' '}
              <strong>← Indice</strong> per tornare indietro.{' '}
            </p>
          </div>
        </details>
      </details>

      <section className="today">
        <h2>La Messa di oggi</h2>
        {error && (
          <p className="today-message">
            Impossibile caricare i canti di oggi. Riprova più tardi.
          </p>
        )}
        {!error && today === null && <p className="today-message">Caricamento…</p>}
        {!error && today !== null && (
          <>
            <div className="today-tabs" role="tablist" aria-label="Chiesa">
              {CHURCHES.map((church) => {
                const isActive = church === activeChurch
                const isFavorite = church === favorite
                return (
                  <button
                    key={church}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`today-panel-${slugify(church)}`}
                    id={`today-tab-${slugify(church)}`}
                    aria-label={isFavorite ? `${church} (preferita)` : undefined}
                    className={'today-tab' + (isActive ? ' today-tab--active' : '')}
                    onClick={() => setActiveChurch(church)}
                  >
                    {isFavorite && (
                      <span className="today-tab__star" aria-hidden="true">
                        ★
                      </span>
                    )}
                    {church}
                  </button>
                )
              })}
            </div>

            <div className="today-favorite">
              {favorite === activeChurch ? (
                <button
                  type="button"
                  className="today-favorite__btn today-favorite__btn--active"
                  onClick={clearFavorite}
                >
                  ★ Rimuovi preferita
                </button>
              ) : (
                <button
                  type="button"
                  className="today-favorite__btn"
                  onClick={() => setFavorite(activeChurch)}
                >
                  ☆ Imposta come preferita
                </button>
              )}
            </div>

            <div
              role="tabpanel"
              id={`today-panel-${slugify(activeChurch)}`}
              aria-labelledby={`today-tab-${slugify(activeChurch)}`}
              className="today-panel"
            >
              {(today.churches[activeChurch] ?? []).length === 0 ? (
                <p className="today-message">Nessun canto impostato.</p>
              ) : (
                <ul className="today-list">
                  {today.churches[activeChurch].map((slot, i) => {
                    const song = songById.get(slot.songId)
                    return (
                      <li key={i}>
                        <span className="slot-label">{slot.label}</span>
                        {song ? (
                          <Link
                            className="slot-title"
                            to={`/canti/${song.id}`}
                            state={{ from: '/' }}
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
              )}
            </div>

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
