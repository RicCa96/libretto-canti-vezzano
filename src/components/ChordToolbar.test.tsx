import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ChordToolbar } from './ChordToolbar.tsx'

const PILL = /mostra strumenti accordi/i

function renderToolbar() {
  return render(<ChordToolbar transpose={0} onTransposeChange={() => {}} />)
}

function press(name: string) {
  const button = screen.getByRole('button', { name })
  fireEvent.pointerDown(button)
  fireEvent.click(button)
}

describe('ChordToolbar auto-collapse', () => {
  beforeEach(() => {
    localStorage.clear()
    // Freeze the autoscroll frame loop: jsdom pages have zero height and
    // would hit "bottom" (stopping autoscroll) on the first frame.
    vi.stubGlobal('requestAnimationFrame', () => 1)
    vi.stubGlobal('cancelAnimationFrame', () => {})
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('collapses into a pill after 5s without presses', () => {
    renderToolbar()
    expect(screen.getByRole('toolbar')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(4999))
    expect(screen.getByRole('toolbar')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: PILL })).toBeInTheDocument()
  })

  it('restarts the countdown on every press inside the bar', () => {
    renderToolbar()
    act(() => vi.advanceTimersByTime(4000))
    press('Più veloce')
    act(() => vi.advanceTimersByTime(4000))
    expect(screen.getByRole('toolbar')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
  })

  it('expands back to full size when the pill is clicked, then collapses again', () => {
    renderToolbar()
    act(() => vi.advanceTimersByTime(5000))

    fireEvent.click(screen.getByRole('button', { name: PILL }))
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: PILL })).not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(5000))
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
  })

  it('keeps autoscroll running while collapsed and flags it on the pill', () => {
    renderToolbar()
    press('Avvia scorrimento')
    act(() => vi.advanceTimersByTime(5000))

    const pill = screen.getByRole('button', { name: /scorrimento attivo/i })
    expect(pill).toHaveAttribute('data-running', 'true')

    fireEvent.click(screen.getByRole('button', { name: PILL }))
    expect(
      screen.getByRole('button', { name: 'Ferma scorrimento' }),
    ).toBeInTheDocument()
  })

  it('shows the current toolbar state on the pill', () => {
    localStorage.setItem('libretto-autoscroll-speed', '6')
    render(<ChordToolbar transpose={-3} onTransposeChange={() => {}} />)
    act(() => vi.advanceTimersByTime(5000))

    const pill = screen.getByRole('button', { name: PILL })
    expect(pill).toHaveAccessibleName(
      'Mostra strumenti accordi: scorrimento in pausa, velocità 6, tono −3',
    )
    expect(pill).toHaveAttribute('data-running', 'false')
    expect(pill).toHaveTextContent('6')
    expect(pill).toHaveTextContent('−3')
  })

  it('moves keyboard focus to the pill on collapse and back into the bar on expand', () => {
    renderToolbar()
    screen.getByRole('button', { name: 'Più veloce' }).focus()

    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByRole('button', { name: PILL })).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: PILL }))
    expect(
      screen.getByRole('button', { name: 'Avvia scorrimento' }),
    ).toHaveFocus()
  })

  it('does not steal focus on collapse when focus was elsewhere', () => {
    renderToolbar()
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByRole('button', { name: PILL })).not.toHaveFocus()
  })
})
