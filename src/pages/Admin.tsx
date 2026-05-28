import { useState } from 'react'
import { songs } from '../data/songs/index.ts'
import type { Slot } from '../lib/todaySchema.ts'
import './Admin.css'

const DEFAULT_LABELS = ['Inizio', 'Offertorio', 'Comunione', 'Fine']

function isErrorStatus(status: string): boolean {
  return /^(Password errata|Errore)/.test(status)
}

export function Admin() {
  const [password, setPassword] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [status, setStatus] = useState('')

  const addSlot = () => {
    const label = DEFAULT_LABELS[slots.length] ?? 'Canto'
    setSlots((s) => [...s, { label, songId: songs[0]?.id ?? '' }])
  }
  const updateSlot = (i: number, patch: Partial<Slot>) => {
    setSlots((s) => s.map((slot, j) => (j === i ? { ...slot, ...patch } : slot)))
  }
  const removeSlot = (i: number) => {
    setSlots((s) => s.filter((_, j) => j !== i))
  }

  const save = async () => {
    setStatus('Salvataggio…')
    try {
      const res = await fetch('/api/today', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ slots }),
      })
      if (res.status === 401) {
        setStatus('Password errata.')
        return
      }
      if (!res.ok) {
        setStatus('Errore nel salvataggio.')
        return
      }
      const data = await res.json()
      setStatus(`Salvato alle ${new Date(data.updatedAt).toLocaleString('it-IT')}.`)
    } catch {
      setStatus('Errore di rete.')
    }
  }

  return (
    <div className="admin">
      <h2>Imposta la Messa di oggi</h2>

      <label htmlFor="admin-pw">Password</label>
      <input
        id="admin-pw"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {slots.map((slot, i) => (
        <div className="slot-row" key={i}>
          <div>
            <label htmlFor={`label-${i}`}>Momento</label>
            <input
              id={`label-${i}`}
              value={slot.label}
              onChange={(e) => updateSlot(i, { label: e.target.value })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor={`song-${i}`}>Canto</label>
            <select
              id={`song-${i}`}
              value={slot.songId}
              onChange={(e) => updateSlot(i, { songId: e.target.value })}
            >
              {songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={() => removeSlot(i)}>
            Rimuovi
          </button>
        </div>
      ))}

      <div>
        <button type="button" onClick={addSlot}>
          + Aggiungi canto
        </button>
      </div>

      <button type="button" className="save" onClick={save}>
        Salva
      </button>

      {status && (
        <p className={isErrorStatus(status) ? 'status status--error' : 'status'}>
          {status}
        </p>
      )}
    </div>
  )
}
