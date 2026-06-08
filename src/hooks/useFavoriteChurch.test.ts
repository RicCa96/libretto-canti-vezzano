import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFavoriteChurch } from './useFavoriteChurch.ts'

const KEY = 'libretto-favorite-church'

describe('useFavoriteChurch', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to null when nothing is stored', () => {
    const { result } = renderHook(() => useFavoriteChurch())
    expect(result.current.favorite).toBeNull()
  })

  it('reads a valid church from localStorage', () => {
    localStorage.setItem(KEY, 'Puianello')
    const { result } = renderHook(() => useFavoriteChurch())
    expect(result.current.favorite).toBe('Puianello')
  })

  it('ignores an unknown value in localStorage', () => {
    localStorage.setItem(KEY, 'NotAChurch')
    const { result } = renderHook(() => useFavoriteChurch())
    expect(result.current.favorite).toBeNull()
  })

  it('persists the chosen church to localStorage', () => {
    const { result } = renderHook(() => useFavoriteChurch())
    act(() => result.current.setFavorite('Montalto'))
    expect(result.current.favorite).toBe('Montalto')
    expect(localStorage.getItem(KEY)).toBe('Montalto')
  })

  it('clears the favorite from state and localStorage', () => {
    localStorage.setItem(KEY, 'Pecorile')
    const { result } = renderHook(() => useFavoriteChurch())
    act(() => result.current.clearFavorite())
    expect(result.current.favorite).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
  })
})
