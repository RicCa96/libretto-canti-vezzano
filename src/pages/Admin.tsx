import { useState } from 'react'
import { songs } from '../data/songs/index.ts'
import { SongCombobox } from '../components/SongCombobox.tsx'
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
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

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
  const moveSlot = (from: number, to: number) => {
    if (from === to || to < 0) return
    setSlots((s) => {
      if (to >= s.length) return s
      const next = s.slice()
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const onDragStart = (i: number) => (e: React.DragEvent<HTMLElement>) => {
    setDragIndex(i)
    e.dataTransfer.effectAllowed = 'move'
    // Required for Firefox to initiate drag.
    e.dataTransfer.setData('text/plain', String(i))
  }
  const onDragOver = (i: number) => (e: React.DragEvent<HTMLElement>) => {
    if (dragIndex === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== i) setDragOverIndex(i)
  }
  const onDrop = (i: number) => (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault()
    if (dragIndex !== null) moveSlot(dragIndex, i)
    setDragIndex(null)
    setDragOverIndex(null)
  }
  const onDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
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

      <ul className="slot-list">
        {slots.map((slot, i) => {
          const isDragging = dragIndex === i
          const isOver = dragOverIndex === i && dragIndex !== i
          return (
            <li
              className={
                'slot-row' +
                (isDragging ? ' is-dragging' : '') +
                (isOver ? ' is-drop-target' : '')
              }
              key={i}
              onDragOver={onDragOver(i)}
              onDrop={onDrop(i)}
              onDragEnd={onDragEnd}
            >
              <button
                type="button"
                className="slot-handle"
                draggable
                onDragStart={onDragStart(i)}
                onDragEnd={onDragEnd}
                aria-label={`Riordina canto ${i + 1}`}
                title="Trascina per riordinare"
              >
                ⋮⋮
              </button>

              <div className="slot-field slot-field--label">
                <label htmlFor={`label-${i}`}>Momento</label>
                <input
                  id={`label-${i}`}
                  value={slot.label}
                  onChange={(e) => updateSlot(i, { label: e.target.value })}
                />
              </div>

              <div className="slot-field slot-field--song">
                <label htmlFor={`song-${i}`}>Canto</label>
                <SongCombobox
                  id={`song-${i}`}
                  songs={songs}
                  value={slot.songId}
                  onChange={(id) => updateSlot(i, { songId: id })}
                />
              </div>

              <div className="slot-actions">
                <button
                  type="button"
                  className="slot-remove"
                  onClick={() => removeSlot(i)}
                >
                  Rimuovi
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <button type="button" className="add" onClick={addSlot}>
        + Aggiungi canto
      </button>

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
