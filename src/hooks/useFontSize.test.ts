import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFontSize, FONT_SIZES } from './useFontSize.ts'

describe('useFontSize', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to "md"', () => {
    const { result } = renderHook(() => useFontSize())
    expect(result.current.size).toBe('md')
  })

  it('persists the chosen size to localStorage', () => {
    const { result } = renderHook(() => useFontSize())
    act(() => result.current.setSize('lg'))
    expect(result.current.size).toBe('lg')
    expect(localStorage.getItem('libretto-font-size')).toBe('lg')
  })

  it('reads an existing value from localStorage', () => {
    localStorage.setItem('libretto-font-size', 'xl')
    const { result } = renderHook(() => useFontSize())
    expect(result.current.size).toBe('xl')
  })

  it('exposes the available sizes in order', () => {
    expect(FONT_SIZES).toEqual(['sm', 'md', 'lg', 'xl'])
  })
})
