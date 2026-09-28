import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { Admin } from './Admin.tsx'
import { CHURCHES } from '../lib/churches.ts'

const EMPTY_MAP = Object.fromEntries(CHURCHES.map((c) => [c, []]))

function renderAdmin() {
  const router = createMemoryRouter(
    [
      { path: '/admin', element: <Admin /> },
      { path: '/', element: <p>home</p> },
    ],
    { initialEntries: ['/admin'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

async function waitForLoaded() {
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /salva/i })).toBeEnabled(),
  )
}

type Churches = Record<string, { label: string; songId: string }[]>

function mockApi(initial: Churches = EMPTY_MAP) {
  let current = { updatedAt: '', churches: initial }
  const fetchMock = vi.fn(async (_url: string, opts?: RequestInit) => {
    if (opts?.method === 'POST') {
      const body = JSON.parse(opts.body as string) as { churches: Churches }
      current = {
        updatedAt: '2026-09-28T10:00:00.000Z',
        churches: { ...current.churches, ...body.churches },
      }
    }
    return { ok: true, status: 200, json: async () => current }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function postBodies(fetchMock: { mock: { calls: unknown[][] } }) {
  return fetchMock.mock.calls
    .filter(([, opts]) => (opts as RequestInit | undefined)?.method === 'POST')
    .map(([, opts]) => JSON.parse((opts as RequestInit).body as string))
}

async function chooseSong(
  user: ReturnType<typeof userEvent.setup>,
  query: string,
  index = 0,
) {
  const input = screen.getAllByRole('combobox')[index]
  await user.click(input)
  await user.type(input, query)
  await user.click(screen.getAllByRole('option')[0])
}

describe('Admin', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders one tab per church', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ updatedAt: '', churches: EMPTY_MAP }),
      }),
    )
    renderAdmin()
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
    renderAdmin()

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

  it('saves only the changed churches with the password header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ updatedAt: 'now', churches: EMPTY_MAP }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderAdmin()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/today'))
    await waitForLoaded()

    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /aggiungi/i }))
    await chooseSong(user, 'adeste')
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
    expect(Object.keys(body.churches)).toEqual([CHURCHES[0]])
    expect(body.churches[CHURCHES[0]].length).toBe(1)
  })

  it('edits one church without modifying another', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ updatedAt: '', churches: EMPTY_MAP }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderAdmin()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/today'))

    // Add a slot on the first tab, then switch and confirm the second tab is still empty.
    await user.click(screen.getByRole('button', { name: /aggiungi/i }))
    expect(screen.getByDisplayValue('Inizio')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: CHURCHES[1] }))
    expect(screen.queryByDisplayValue('Inizio')).not.toBeInTheDocument()
  })

  it('disables Salva when the current list fails to load, and Riprova recovers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ updatedAt: '', churches: EMPTY_MAP }),
      })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAdmin()

    expect(await screen.findByText(/errore nel caricamento/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /salva/i })).toBeDisabled()
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /aggiungi/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Riprova' }))

    await waitForLoaded()
    expect(screen.queryByText(/errore nel caricamento/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Riprova' })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(screen.getAllByRole('tab')).toHaveLength(CHURCHES.length)
    expect(screen.getByRole('button', { name: /aggiungi/i })).toBeInTheDocument()
  })

  it('does not send a request when nothing changed', async () => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    renderAdmin()
    await waitForLoaded()

    await user.click(screen.getByRole('button', { name: /salva/i }))

    expect(await screen.findByText('Nessuna modifica da salvare.')).toBeInTheDocument()
    expect(postBodies(fetchMock)).toEqual([])
  })

  it('marks edited churches as unsaved until saved', async () => {
    mockApi()
    const user = userEvent.setup()
    renderAdmin()
    await waitForLoaded()

    await user.click(screen.getByRole('button', { name: /aggiungi/i }))
    await chooseSong(user, 'adeste')
    expect(
      screen.getByRole('tab', { name: `${CHURCHES[0]} (modifiche non salvate)` }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: CHURCHES[1] })).toBeInTheDocument()

    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /salva/i }))

    expect(await screen.findByText(/^Salvato alle/)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: CHURCHES[0] })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Inizio')).toBeInTheDocument()
  })

  it('starts a new row with no song and blocks saving until one is chosen', async () => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    renderAdmin()
    await waitForLoaded()

    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /aggiungi/i }))
    expect(screen.getByRole('combobox')).toHaveValue('')

    await user.click(screen.getByRole('button', { name: /salva/i }))

    expect(
      await screen.findByText(`${CHURCHES[0]}, riga 1: scegli un canto`),
    ).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true')
    expect(postBodies(fetchMock)).toEqual([])

    await chooseSong(user, 'adeste')
    expect(screen.queryByText(/scegli un canto/)).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-invalid')

    await user.click(screen.getByRole('button', { name: /salva/i }))
    await waitFor(() => expect(postBodies(fetchMock)).toHaveLength(1))
  })

  it('reports an empty Momento and switches to the church with the problem', async () => {
    const fetchMock = mockApi()
    const user = userEvent.setup()
    renderAdmin()
    await waitForLoaded()

    await user.click(screen.getByRole('button', { name: /aggiungi/i }))
    await chooseSong(user, 'adeste')
    await user.clear(screen.getByLabelText('Momento'))
    await user.click(screen.getByRole('tab', { name: CHURCHES[1] }))

    await user.click(screen.getByRole('button', { name: /salva/i }))

    expect(
      await screen.findByText(`${CHURCHES[0]}, riga 1: il momento è vuoto`),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: `${CHURCHES[0]} (modifiche non salvate)` }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('Momento')).toHaveAttribute('aria-invalid', 'true')
    expect(postBodies(fetchMock)).toEqual([])
  })

  it('reorders rows with the up/down buttons', async () => {
    mockApi({
      ...EMPTY_MAP,
      [CHURCHES[0]]: [
        { label: 'Inizio', songId: 'adeste-fideles' },
        { label: 'Fine', songId: 'amatevi-fratelli' },
      ],
    })
    const user = userEvent.setup()
    renderAdmin()
    await waitForLoaded()
    await waitFor(() => expect(screen.getAllByLabelText('Momento')).toHaveLength(2))

    expect(screen.getByRole('button', { name: 'Sposta su canto 1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sposta giù canto 2' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Sposta giù canto 1' }))
    expect(screen.getAllByLabelText('Momento').map((el) => (el as HTMLInputElement).value)).toEqual([
      'Fine',
      'Inizio',
    ])

    await user.click(screen.getByRole('button', { name: 'Sposta su canto 2' }))
    expect(screen.getAllByLabelText('Momento').map((el) => (el as HTMLInputElement).value)).toEqual([
      'Inizio',
      'Fine',
    ])
  })

  it('keeps edits made while a save is in flight, and keeps the church marked unsaved', async () => {
    let resolvePost: () => void = () => {}
    const pending = new Promise<void>((resolve) => {
      resolvePost = resolve
    })
    const fetchMock = vi.fn(async (_url: string, opts?: RequestInit) => {
      if (opts?.method === 'POST') {
        const body = JSON.parse(opts.body as string) as { churches: Churches }
        await pending
        return {
          ok: true,
          status: 200,
          json: async () => ({
            updatedAt: '2026-09-28T10:00:00.000Z',
            churches: { ...EMPTY_MAP, ...body.churches },
          }),
        }
      }
      return { ok: true, status: 200, json: async () => ({ updatedAt: '', churches: EMPTY_MAP }) }
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderAdmin()
    await waitForLoaded()

    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /aggiungi/i }))
    await chooseSong(user, 'adeste')
    const saveButton = screen.getByRole('button', { name: /salva/i })
    await user.click(saveButton)

    expect(saveButton).toBeDisabled()

    // Edit made while the save request is still pending; not part of this
    // save, so it can stay without a song chosen.
    await user.click(screen.getByRole('button', { name: /aggiungi/i }))

    resolvePost()
    await waitFor(() => expect(saveButton).toBeEnabled())

    expect(screen.getByDisplayValue('Offertorio')).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: `${CHURCHES[0]} (modifiche non salvate)` }),
    ).toBeInTheDocument()
  })

  it('asks for confirmation before leaving with unsaved changes', async () => {
    mockApi()
    const confirmSpy = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    const user = userEvent.setup()
    const router = renderAdmin()
    await waitForLoaded()

    await user.click(screen.getByRole('button', { name: /aggiungi/i }))

    await act(async () => {
      await router.navigate('/')
    })
    await waitFor(() =>
      expect(confirmSpy).toHaveBeenCalledWith('Hai modifiche non salvate. Uscire comunque?'),
    )
    expect(router.state.location.pathname).toBe('/admin')

    await act(async () => {
      await router.navigate('/')
    })
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.getByText('home')).toBeInTheDocument()
  })

  it('leaves without confirmation when there are no changes', async () => {
    mockApi()
    const confirmSpy = vi.spyOn(window, 'confirm')
    const router = renderAdmin()
    await waitForLoaded()

    await act(async () => {
      await router.navigate('/')
    })
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it('warns on page unload only while there are unsaved changes', async () => {
    mockApi()
    const user = userEvent.setup()
    renderAdmin()
    await waitForLoaded()

    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)

    await user.click(screen.getByRole('button', { name: /aggiungi/i }))

    const dirtyEvent = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirtyEvent)
    expect(dirtyEvent.defaultPrevented).toBe(true)
  })
})
