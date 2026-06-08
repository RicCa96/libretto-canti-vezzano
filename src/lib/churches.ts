export const CHURCHES = [
  'Vezzano',
  'Puianello',
  'Montalto',
  'Pecorile',
  'La Vecchia',
] as const

export type Church = (typeof CHURCHES)[number]
