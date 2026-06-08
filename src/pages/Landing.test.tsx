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

const FAVORITE_KEY = 'libretto-favorite-church'

describe('Landing', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

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

  it('preselects the stored favorite church on load', async () => {
    localStorage.setItem(FAVORITE_KEY, 'Montalto')
    mockFetchOnce({ updatedAt: '', churches: EMPTY_MAP })
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    const tab = await screen.findByRole('tab', { name: /Montalto/ })
    expect(tab).toHaveAttribute('aria-selected', 'true')
  })

  it('falls back to the first church when the stored favorite is invalid', async () => {
    localStorage.setItem(FAVORITE_KEY, 'NotAChurch')
    mockFetchOnce({ updatedAt: '', churches: EMPTY_MAP })
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    const tab = await screen.findByRole('tab', { name: CHURCHES[0] })
    expect(tab).toHaveAttribute('aria-selected', 'true')
  })

  it('marks the active church as favorite and persists it, with a star in the tab', async () => {
    mockFetchOnce({ updatedAt: '', churches: EMPTY_MAP })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    await user.click(await screen.findByRole('tab', { name: 'Puianello' }))
    await user.click(screen.getByRole('button', { name: /Imposta come preferita/i }))

    expect(localStorage.getItem(FAVORITE_KEY)).toBe('Puianello')
    expect(
      screen.getByRole('tab', { name: /Puianello.*preferita/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Rimuovi preferita/i }),
    ).toBeInTheDocument()
  })

  it('clears the favorite when the active church is already the favorite', async () => {
    localStorage.setItem(FAVORITE_KEY, 'Pecorile')
    mockFetchOnce({ updatedAt: '', churches: EMPTY_MAP })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    await screen.findByRole('tab', { name: /Pecorile.*preferita/i })
    await user.click(screen.getByRole('button', { name: /Rimuovi preferita/i }))

    expect(localStorage.getItem(FAVORITE_KEY)).toBeNull()
    expect(
      screen.getByRole('button', { name: /Imposta come preferita/i }),
    ).toBeInTheDocument()
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
