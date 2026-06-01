import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Admin } from './Admin.tsx'

describe('Admin', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('saves slots with the password header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ updatedAt: 'now', slots: [] }),
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
  })

  it('prefills slots with the current saved list', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        updatedAt: 'now',
        slots: [{ label: 'Inizio', songId: 'adeste-fideles' }],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<Admin />)

    await waitFor(() =>
      expect(screen.getByDisplayValue('Inizio')).toBeInTheDocument(),
    )
  })
})
