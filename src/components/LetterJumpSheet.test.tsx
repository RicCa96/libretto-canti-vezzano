import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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
})
