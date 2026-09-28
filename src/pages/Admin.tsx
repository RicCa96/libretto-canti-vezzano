import { useEffect, useMemo, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { songs } from '../data/songs/index.ts'
import { SongCombobox } from '../components/SongCombobox.tsx'
import { CHURCHES, type Church } from '../lib/churches.ts'
import type { Slot, TodaySet } from '../lib/todaySchema.ts'
import { dirtyChurches, slotsEqual } from '../lib/dirtyChurches.ts'
import { findSlotProblems } from '../lib/slotProblems.ts'
import './Admin.css'

const DEFAULT_LABELS = ['Inizio', 'Offertorio', 'Comunione', 'Fine']

function emptyChurches(): Record<Church, Slot[]> {
  return Object.fromEntries(CHURCHES.map((c) => [c, [] as Slot[]])) as unknown as Record<Church, Slot[]>
}

const validIds = new Set(songs.map((s) => s.id))

function cleanChurches(
  incoming: Partial<Record<Church, Slot[]>> | undefined,
): Record<Church, Slot[]> {
  const cleaned = emptyChurches()
  for (const church of CHURCHES) {
    const list = incoming?.[church]
    cleaned[church] = Array.isArray(list)
      ? list.filter((s) => validIds.has(s.songId))
      : []
  }
  return cleaned
}

function isErrorStatus(status: string): boolean {
  return /^(Password errata|Errore)/.test(status)
}

export function Admin() {
  const [password, setPassword] = useState('')
  const [baseline, setBaseline] = useState<Record<Church, Slot[]>>(emptyChurches)
  const [churches, setChurches] = useState<Record<Church, Slot[]>>(emptyChurches)
  const [activeChurch, setActiveChurch] = useState<Church>(CHURCHES[0])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [showProblems, setShowProblems] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/today')
      .then((r) => {
        if (!r.ok) throw new Error('bad response')
        return r.json() as Promise<TodaySet>
      })
      .then((data) => {
        if (!active) return
        const cleaned = cleanChurches(data.churches)
        setBaseline(cleaned)
        setChurches(cleaned)
      })
      .catch(() => {
        if (!active) return
        setLoadError(true)
        setStatus('Errore nel caricamento della lista corrente.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [loadAttempt])

  const retryLoad = () => {
    setStatus('')
    setLoadError(false)
    setLoading(true)
    setLoadAttempt((n) => n + 1)
  }

  const slots = churches[activeChurch]
  const dirty = useMemo(() => dirtyChurches(baseline, churches), [baseline, churches])
  const problems = useMemo(
    () => (showProblems ? findSlotProblems(churches, dirty, validIds) : []),
    [showProblems, churches, dirty],
  )
  const isInvalid = (i: number, field: 'label' | 'song') =>
    problems.some((p) => p.church === activeChurch && p.index === i && p.field === field)

  const isDirty = dirty.length > 0
  const blocker = useBlocker(isDirty)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('Hai modifiche non salvate. Uscire comunque?')) {
      blocker.proceed()
    } else {
      blocker.reset()
    }
  }, [blocker])

  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const setSlots = (next: Slot[]) =>
    setChurches((c) => ({ ...c, [activeChurch]: next }))

  const addSlot = () => {
    const label = DEFAULT_LABELS[slots.length] ?? 'Canto'
    setSlots([...slots, { label, songId: '' }])
  }
  const updateSlot = (i: number, patch: Partial<Slot>) => {
    setSlots(slots.map((slot, j) => (j === i ? { ...slot, ...patch } : slot)))
  }
  const removeSlot = (i: number) => {
    setSlots(slots.filter((_, j) => j !== i))
  }
  const moveSlot = (from: number, to: number) => {
    if (from === to || to < 0 || to >= slots.length) return
    const next = slots.slice()
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setSlots(next)
  }

  const onDragStart = (i: number) => (e: React.DragEvent<HTMLElement>) => {
    setDragIndex(i)
    e.dataTransfer.effectAllowed = 'move'
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
    if (dirty.length === 0) {
      setStatus('Nessuna modifica da salvare.')
      return
    }
    const found = findSlotProblems(churches, dirty, validIds)
    if (found.length > 0) {
      setShowProblems(true)
      setActiveChurch(found[0].church)
      setStatus('')
      return
    }
    setShowProblems(false)
    setStatus('Salvataggio…')
    const sent = churches
    const changes = Object.fromEntries(dirty.map((c) => [c, sent[c]]))
    setSaving(true)
    try {
      const res = await fetch('/api/today', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ churches: changes }),
      })
      if (res.status === 401) {
        setStatus('Password errata.')
        return
      }
      if (!res.ok) {
        setStatus('Errore nel salvataggio.')
        return
      }
      const data = (await res.json()) as TodaySet
      const saved = cleanChurches(data.churches)
      setBaseline(saved)
      setChurches(
        (prev) =>
          Object.fromEntries(
            CHURCHES.map((c) => [c, slotsEqual(prev[c], sent[c]) ? saved[c] : prev[c]]),
          ) as Record<Church, Slot[]>,
      )
      setStatus(`Salvato alle ${new Date(data.updatedAt).toLocaleString('it-IT')}.`)
    } catch {
      setStatus('Errore di rete.')
    } finally {
      setSaving(false)
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

      {loading && <p className="status">Caricamento lista corrente…</p>}

      {!loadError && (
        <>
          <div className="church-tabs" role="tablist" aria-label="Chiesa">
            {CHURCHES.map((church) => {
              const isActive = church === activeChurch
              const isDirtyTab = dirty.includes(church)
              return (
                <button
                  key={church}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={isDirtyTab ? `${church} (modifiche non salvate)` : undefined}
                  className={'church-tab' + (isActive ? ' church-tab--active' : '')}
                  onClick={() => setActiveChurch(church)}
                >
                  {church}
                  {isDirtyTab && (
                    <span className="church-tab__dirty" aria-hidden="true">
                      ●
                    </span>
                  )}
                </button>
              )
            })}
          </div>

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

                  <div
                    className={
                      'slot-field slot-field--label' +
                      (isInvalid(i, 'label') ? ' is-invalid' : '')
                    }
                  >
                    <label htmlFor={`label-${i}`}>Momento</label>
                    <input
                      id={`label-${i}`}
                      value={slot.label}
                      aria-invalid={isInvalid(i, 'label') || undefined}
                      onChange={(e) => updateSlot(i, { label: e.target.value })}
                    />
                  </div>

                  <div
                    className={
                      'slot-field slot-field--song' +
                      (isInvalid(i, 'song') ? ' is-invalid' : '')
                    }
                  >
                    <label htmlFor={`song-${i}`}>Canto</label>
                    <SongCombobox
                      id={`song-${i}`}
                      songs={songs}
                      value={slot.songId}
                      invalid={isInvalid(i, 'song')}
                      onChange={(id) => updateSlot(i, { songId: id })}
                    />
                  </div>

                  <div className="slot-actions">
                    <button
                      type="button"
                      className="slot-move"
                      onClick={() => moveSlot(i, i - 1)}
                      disabled={i === 0}
                      aria-label={`Sposta su canto ${i + 1}`}
                      title="Sposta su"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="slot-move"
                      onClick={() => moveSlot(i, i + 1)}
                      disabled={i === slots.length - 1}
                      aria-label={`Sposta giù canto ${i + 1}`}
                      title="Sposta giù"
                    >
                      ↓
                    </button>
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
        </>
      )}

      <button
        type="button"
        className="save"
        onClick={save}
        disabled={loading || loadError || saving}
      >
        Salva
      </button>

      {problems.length > 0 && (
        <ul className="status status--error problem-list" role="alert">
          {problems.map((p) => (
            <li key={`${p.church}-${p.index}-${p.field}`}>{p.message}</li>
          ))}
        </ul>
      )}

      {status && (
        <p className={isErrorStatus(status) ? 'status status--error' : 'status'}>
          {status}
        </p>
      )}
      {loadError && (
        <button type="button" className="retry" onClick={retryLoad}>
          Riprova
        </button>
      )}
    </div>
  )
}
