import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout.tsx'

describe('Layout', () => {
  it('renders the app title and an outlet child', () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<p>child page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Libretto dei Canti')).toBeInTheDocument()
    expect(screen.getByText('child page')).toBeInTheDocument()
  })
})
