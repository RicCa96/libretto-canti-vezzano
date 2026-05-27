import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Landing } from './Landing.tsx'

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
    mockFetchOnce({ updatedAt: '', slots: [] })
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Come uso il libretto/i)).toBeInTheDocument()
  })

  it("renders today's slots as song links", async () => {
    mockFetchOnce({
      updatedAt: '2026-05-27T08:00:00Z',
      slots: [{ label: 'Inizio', songId: 'eucaristia' }],
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

  it('shows a fallback when there are no songs set', async () => {
    mockFetchOnce({ updatedAt: '', slots: [] })
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    )
    await waitFor(() =>
      expect(
        screen.getByText(/nessun canto.*oggi/i),
      ).toBeInTheDocument(),
    )
  })
})
