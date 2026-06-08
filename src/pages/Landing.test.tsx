import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Landing } from './Landing.tsx'
import { CHURCHES } from '../lib/churches.ts'

const EMPTY_MAP = Object.fromEntries(CHURCHES.map((c) => [c, []]))

function mockFetchOnce(data: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => data,
    }),
  )
}

describe('Landing', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('renders the instructions section', () => {
    mockFetchOnce({ updatedAt: '', churches: EMPTY_MAP })
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Come uso il libretto/i)).toBeInTheDocument()
  })

  it('renders one tab per church with the first selected by default', async () => {
    mockFetchOnce({ updatedAt: '', churches: EMPTY_MAP })
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    for (const church of CHURCHES) {
      expect(await screen.findByRole('tab', { name: church })).toBeInTheDocument()
    }
    expect(screen.getByRole('tab', { name: CHURCHES[0] })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it("renders the active church's slots as song links", async () => {
    mockFetchOnce({
      updatedAt: '2026-05-27T08:00:00Z',
      churches: {
        ...EMPTY_MAP,
        Vezzano: [{ label: 'Inizio', songId: 'eucaristia' }],
      },
    })
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    await waitFor(() =>
      expect(screen.getByText('Inizio')).toBeInTheDocument(),
    )
    expect(screen.getByRole('link', { name: 'EUCARISTIA' })).toHaveAttribute(
      'href',
      '/canti/eucaristia',
    )
  })

  it('swaps the visible songlist when a different tab is clicked', async () => {
    mockFetchOnce({
      updatedAt: '',
      churches: {
        ...EMPTY_MAP,
        Vezzano: [{ label: 'Inizio', songId: 'eucaristia' }],
        Puianello: [{ label: 'Offertorio', songId: 'adeste-fideles' }],
      },
    })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(screen.getByText('Inizio')).toBeInTheDocument(),
    )
    expect(screen.queryByText('Offertorio')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Puianello' }))

    await waitFor(() =>
      expect(screen.getByText('Offertorio')).toBeInTheDocument(),
    )
    expect(screen.queryByText('Inizio')).not.toBeInTheDocument()
  })

  it("shows an empty-church message when the active church has no songs", async () => {
    mockFetchOnce({ updatedAt: '', churches: EMPTY_MAP })
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    await waitFor(() =>
      expect(screen.getByText(/Nessun canto impostato\./)).toBeInTheDocument(),
    )
  })

  it('shows a single error message and hides tabs on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false }),
    )
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    await waitFor(() =>
      expect(screen.getByText(/Impossibile caricare/i)).toBeInTheDocument(),
    )
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })
})
