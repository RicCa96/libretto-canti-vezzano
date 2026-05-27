import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
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
})
