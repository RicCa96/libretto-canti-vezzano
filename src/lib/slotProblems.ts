import type { Church } from './churches.js'
import type { Slot } from './todaySchema.js'

export type SlotProblem = {
  church: Church
  index: number
  field: 'label' | 'song'
  message: string
}

export function findSlotProblems(
  churches: Record<Church, Slot[]>,
  only: readonly Church[],
  validIds: Set<string>,
): SlotProblem[] {
  const problems: SlotProblem[] = []
  for (const church of only) {
    churches[church].forEach((slot, index) => {
      const row = `${church}, riga ${index + 1}`
      if (slot.label.trim() === '') {
        problems.push({ church, index, field: 'label', message: `${row}: il momento è vuoto` })
      }
      if (!validIds.has(slot.songId)) {
        problems.push({ church, index, field: 'song', message: `${row}: scegli un canto` })
      }
    })
  }
  return problems
}
