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
})
