import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SongBody } from './SongBody.tsx'

const body = 'RIT.\n[C]Se il sole non [G]illumi[Am]nasse più'

describe('SongBody', () => {
  it('shows lyrics but hides chords when chordsOn is false', () => {
    render(<SongBody body={body} chordsOn={false} transpose={0} />)
    expect(screen.getByText(/Se il sole non/)).toBeInTheDocument()
    expect(screen.queryByText('C')).not.toBeInTheDocument()
  })

  it('shows chords when chordsOn is true', () => {
    render(<SongBody body={body} chordsOn={true} transpose={0} />)
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('Am')).toBeInTheDocument()
  })

  it('applies transposition to displayed chords', () => {
    render(<SongBody body={body} chordsOn={true} transpose={2} />)
    expect(screen.getByText('D')).toBeInTheDocument() // C + 2
    expect(screen.getByText('Bm')).toBeInTheDocument() // Am + 2
  })

  it('renders RIT. as a refrain label', () => {
    render(<SongBody body={body} chordsOn={false} transpose={0} />)
    expect(screen.getByText('RIT.')).toBeInTheDocument()
  })
})
