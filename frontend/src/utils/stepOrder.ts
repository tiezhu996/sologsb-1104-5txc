import type { DisassemblyStep } from '../types/step'

export interface OrderConflict {
  stepId: string
  stepSeq: number
  prerequisiteId: string
  prerequisiteSeq: number
}

/**
 * 找出所有排在自己前置步骤之前的步骤。
 * 前置字段留空、或前置步骤已不存在的，一律按无前置处理。
 */
export function findOrderConflicts(steps: DisassemblyStep[]): OrderConflict[] {
  const seqById = new Map(steps.map((step) => [step.id, step.seq]))
  const conflicts: OrderConflict[] = []
  for (const step of steps) {
    if (!step.prerequisiteStepId) continue
    const prerequisiteSeq = seqById.get(step.prerequisiteStepId)
    if (prerequisiteSeq === undefined) continue
    if (prerequisiteSeq >= step.seq) {
      conflicts.push({
        stepId: step.id,
        stepSeq: step.seq,
        prerequisiteId: step.prerequisiteStepId,
        prerequisiteSeq,
      })
    }
  }
  return conflicts.sort((a, b) => a.stepSeq - b.stepSeq)
}
