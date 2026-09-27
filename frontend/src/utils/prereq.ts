import type { DisassemblyStep, PrereqViolation } from '../types/step'

/**
 * 找出当前编排里所有“顺序对不上”的步骤对：
 * 某步登记的前置步骤必须排在它前面（步号更小），否则就是冲突。
 * 前置指向的步骤不存在（历史数据或已被删除）时不算顺序冲突，
 * 由界面单独以“前置缺失”提示。
 */
export function listPrereqViolations(steps: DisassemblyStep[]): PrereqViolation[] {
  const ordered = [...steps].sort((a, b) => a.seq - b.seq)
  const indexById = new Map(ordered.map((step, index) => [step.id, index]))
  const violations: PrereqViolation[] = []

  for (const step of ordered) {
    const predecessorId = step.predecessorId
    if (!predecessorId) continue
    const predecessorIndex = indexById.get(predecessorId)
    if (predecessorIndex === undefined) continue
    const stepIndex = indexById.get(step.id) ?? 0
    if (predecessorIndex >= stepIndex) {
      violations.push({
        stepId: step.id,
        predecessorId,
        stepSeq: step.seq,
        predecessorSeq: ordered[predecessorIndex]?.seq ?? 0,
      })
    }
  }

  return violations
}

/** 本步与前置步骤是否顺序对不上。 */
export function violationForStep(
  violations: PrereqViolation[],
  stepId: string,
): PrereqViolation | undefined {
  return violations.find((item) => item.stepId === stepId)
}

/** 本步登记的前置步骤是否已不存在。 */
export function isPrereqMissing(steps: DisassemblyStep[], step: DisassemblyStep): boolean {
  if (!step.predecessorId) return false
  return !steps.some((item) => item.id === step.predecessorId)
}

/**
 * 检查把某步设为另一步的前置是否会形成循环依赖。
 * 沿 predecessorId 链向上追溯，若能回到 stepId 本身就会成环。
 */
export function wouldCreateCycle(
  steps: DisassemblyStep[],
  stepId: string,
  newPredecessorId: string,
): boolean {
  const predecessorById = new Map(
    steps.map((step) => [step.id, step.predecessorId]),
  )
  let cursor: string | undefined = newPredecessorId
  const visited = new Set<string>()

  while (cursor) {
    if (cursor === stepId) return true
    if (visited.has(cursor)) return false
    visited.add(cursor)
    cursor = predecessorById.get(cursor)
  }

  return false
}

/** 按步号取前置步骤的步号；无前置或前置缺失时返回 undefined。 */
export function predecessorSeqOf(
  steps: DisassemblyStep[],
  step: DisassemblyStep,
): number | undefined {
  if (!step.predecessorId) return undefined
  return steps.find((item) => item.id === step.predecessorId)?.seq
}
