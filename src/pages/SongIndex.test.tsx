import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SongIndex } from './SongIndex.tsx'

function renderIndex() {
  return render(
    <MemoryRouter>
      <SongIndex />
    </MemoryRouter>,
  )
}

describe('SongIndex', () => {
  it('lists songs as links', () => {
    renderIndex()
    expect(screen.getByRole('link', { name: 'EUCARISTIA' })).toBeInTheDocument()
  })

  it('filters the list as the user types', async () => {
    const user = userEvent.setup()
    renderIndex()
    await user.type(screen.getByRole('searchbox'), 'eucar')
    expect(screen.getByRole('link', { name: 'EUCARISTIA' })).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'TI SEGUIRÒ' }),
    ).not.toBeInTheDocument()
  })

  it('shows a message when nothing matches', async () => {
    const user = userEvent.setup()
    renderIndex()
    await user.type(screen.getByRole('searchbox'), 'zzzzz-nope')
    expect(screen.getByText(/nessun canto/i)).toBeInTheDocument()
  })

  it('opens the letter jump sheet when a letter header is clicked', async () => {
    const user = userEvent.setup()
    renderIndex()
    const header = screen.getAllByRole('button', { name: /apri menu lettere/i })[0]
    await user.click(header)
    expect(screen.getByRole('dialog', { name: 'Salta a lettera' })).toBeInTheDocument()
  })

  it('shows only filtered letters in the sheet', async () => {
    const user = userEvent.setup()
    renderIndex()
    // Filter to a single song whose title starts with E
    await user.type(screen.getByRole('searchbox'), 'eucar')
    const header = screen.getAllByRole('button', { name: /apri menu lettere/i })[0]
    await user.click(header)
    const dialog = screen.getByRole('dialog', { name: 'Salta a lettera' })
    // Exactly one chip, for the surviving letter group
    const chips = within(dialog).getAllByRole('button')
    expect(chips).toHaveLength(1)
    expect(chips[0]).toHaveAccessibleName(/^Salta a [A-Z#]$/)
  })

  it('closes the sheet when a chip is clicked', async () => {
    const user = userEvent.setup()
    renderIndex()
    const header = screen.getAllByRole('button', { name: /apri menu lettere/i })[0]
    await user.click(header)
    const dialog = screen.getByRole('dialog', { name: 'Salta a lettera' })
    const firstChip = within(dialog).getAllByRole('button')[0]
    await user.click(firstChip)
    expect(screen.queryByRole('dialog', { name: 'Salta a lettera' })).not.toBeInTheDocument()
  })
})
