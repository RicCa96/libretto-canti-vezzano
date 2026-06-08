import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Admin } from './Admin.tsx'
import { CHURCHES } from '../lib/churches.ts'

const EMPTY_MAP = Object.fromEntries(CHURCHES.map((c) => [c, []]))

describe('Admin', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('renders one tab per church', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ updatedAt: '', churches: EMPTY_MAP }),
      }),
    )
    render(<Admin />)
    for (const church of CHURCHES) {
      expect(await screen.findByRole('tab', { name: church })).toBeInTheDocument()
    }
  })

  it('switches the visible slot list when a tab is clicked', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          updatedAt: '',
          churches: {
            ...EMPTY_MAP,
            Vezzano: [{ label: 'Inizio', songId: 'adeste-fideles' }],
            Puianello: [{ label: 'Offertorio', songId: 'amatevi-fratelli' }],
          },
        }),
      }),
    )
    const user = userEvent.setup()
    render(<Admin />)

    await waitFor(() =>
      expect(screen.getByDisplayValue('Inizio')).toBeInTheDocument(),
    )
    expect(screen.queryByDisplayValue('Offertorio')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Puianello' }))

    await waitFor(() =>
      expect(screen.getByDisplayValue('Offertorio')).toBeInTheDocument(),
    )
    expect(screen.queryByDisplayValue('Inizio')).not.toBeInTheDocument()
  })

  it('saves the full churches map with the password header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ updatedAt: 'now', churches: EMPTY_MAP }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<Admin />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/today'))

    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /aggiungi/i }))
    await user.click(screen.getByRole('button', { name: /salva/i }))

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([, opts]) => opts?.method === 'POST'),
      ).toBe(true),
    )
    const postCall = fetchMock.mock.calls.find(([, opts]) => opts?.method === 'POST')!
    const [, options] = postCall
    expect(options.headers['x-admin-password']).toBe('secret')
    const body = JSON.parse(options.body)
    expect(Object.keys(body.churches).sort()).toEqual([...CHURCHES].sort())
    expect(body.churches[CHURCHES[0]].length).toBe(1)
  })

  it('edits one church without modifying another', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ updatedAt: '', churches: EMPTY_MAP }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<Admin />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/today'))

    // Add a slot on the first tab, then switch and confirm the second tab is still empty.
    await user.click(screen.getByRole('button', { name: /aggiungi/i }))
    expect(screen.getByDisplayValue('Inizio')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: CHURCHES[1] }))
    expect(screen.queryByDisplayValue('Inizio')).not.toBeInTheDocument()
  })
})
