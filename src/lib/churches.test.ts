import { describe, it, expect } from 'vitest'
import { CHURCHES } from './churches.ts'

describe('CHURCHES', () => {
  it('lists the five canonical church names in order', () => {
    expect(CHURCHES).toEqual([
      'Vezzano',
      'Puianello',
      'Montalto',
      'Pecorile',
      'La Vecchia',
    ])
  })

})
