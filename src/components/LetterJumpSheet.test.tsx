import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LetterJumpSheet } from './LetterJumpSheet.tsx'

function noop() {}

describe('LetterJumpSheet', () => {
  it('renders nothing when closed', () => {
    render(
      <LetterJumpSheet
        letters={['A', 'B', 'C']}
        open={false}
        onClose={noop}
        onPick={noop}
      />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders one chip per letter when open', () => {
    render(
      <LetterJumpSheet
        letters={['A', 'B', 'C']}
        open
        onClose={noop}
        onPick={noop}
      />,
    )
    expect(screen.getByRole('dialog', { name: 'Salta a lettera' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salta a A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salta a B' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salta a C' })).toBeInTheDocument()
  })

  it('fires onPick when a chip is clicked', async () => {
    const onPick = vi.fn()
    const user = userEvent.setup()
    render(
      <LetterJumpSheet letters={['A', 'B']} open onClose={noop} onPick={onPick} />,
    )
    await user.click(screen.getByRole('button', { name: 'Salta a B' }))
    expect(onPick).toHaveBeenCalledWith('B')
  })

  it('does not call onClose when a chip is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <LetterJumpSheet letters={['A']} open onClose={onClose} onPick={noop} />,
    )
    await user.click(screen.getByRole('button', { name: 'Salta a A' }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('fires onClose when ESC is pressed', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <LetterJumpSheet letters={['A']} open onClose={onClose} onPick={noop} />,
    )
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('fires onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <LetterJumpSheet letters={['A']} open onClose={onClose} onPick={noop} />,
    )
    await user.click(document.querySelector('.letter-sheet-backdrop') as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
