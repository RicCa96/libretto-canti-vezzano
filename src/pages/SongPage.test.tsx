import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../data/songs/index.ts', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../data/songs/index.ts')>()
  const overridden = new Map(actual.songById)
  const original = actual.songById.get('madre-della-speranza')
  if (original) {
    overridden.set('madre-della-speranza', {
      ...original,
      body: '[C]Madre della [G]speranza\n[Am]veglia sul [F]cammino',
    })
  }
  return { ...actual, songById: overridden }
})

import { SongPage } from './SongPage.tsx'

function renderSong(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/canti/${id}`]}>
      <Routes>
        <Route path="/canti/:id" element={<SongPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SongPage', () => {
  beforeEach(() => localStorage.clear())

  it('shows the song title and a back link', () => {
    renderSong('eucaristia')
    expect(
      screen.getByRole('heading', { name: 'EUCARISTIA' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /indice/i })).toBeInTheDocument()
  })

  it('shows a not-found message for an unknown id', () => {
    renderSong('nope-not-real')
    expect(screen.getByText(/non trovato/i)).toBeInTheDocument()
  })

  it('hides the chord toggle when the song has no chords', () => {
    renderSong('eucaristia') // sample has no [chords]
    expect(
      screen.queryByRole('button', { name: /accordi/i }),
    ).not.toBeInTheDocument()
  })

  it('renders 3-way view toggle and defaults to Testo when both inline and pdf exist', () => {
    renderSong('madre-della-speranza')

    expect(screen.getByRole('button', { name: 'Testo' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Accordi' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Spartito' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    expect(document.querySelector('object[type="application/pdf"]')).toBeNull()
    expect(document.querySelector('.seg__chord')).toBeNull()
  })

  it('switches body between text, chords, and pdf via segmented control', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderSong('madre-della-speranza')

    expect(document.querySelector('.seg__chord')).toBeNull()
    expect(document.querySelector('object[type="application/pdf"]')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Accordi' }))
    expect(document.querySelector('.seg__chord')).not.toBeNull()
    expect(document.querySelector('object[type="application/pdf"]')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Spartito' }))
    const pdf = document.querySelector('object[type="application/pdf"]')
    expect(pdf).not.toBeNull()
    expect(pdf?.getAttribute('data')).toBe('/chords/madre-della-speranza.pdf')
    expect(
      screen.queryByRole('button', { name: 'Abbassa tono' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Testo' }))
    expect(document.querySelector('.seg__chord')).toBeNull()
    expect(document.querySelector('object[type="application/pdf"]')).toBeNull()
  })

  it('shows transpose buttons only in Accordi view', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderSong('madre-della-speranza')

    expect(
      screen.queryByRole('button', { name: 'Abbassa tono' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Accordi' }))
    expect(
      screen.getByRole('button', { name: 'Abbassa tono' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Alza tono' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Spartito' }))
    expect(
      screen.queryByRole('button', { name: 'Abbassa tono' }),
    ).not.toBeInTheDocument()
  })

  it('renders only the Accordi toggle for a song with inline chords and no pdf', () => {
    renderSong('acqua-siamo-noi')

    expect(
      screen.getByRole('button', { name: /accordi off/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Testo' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Spartito' }),
    ).not.toBeInTheDocument()
  })

  it('renders only the Spartito toggle for a song with pdf and no inline chords', () => {
    renderSong('consolate-isaia-40')

    expect(
      screen.getByRole('button', { name: /spartito off/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Testo' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Accordi' }),
    ).not.toBeInTheDocument()
  })
})
