import { useCallback, useEffect, useMemo } from 'react'
import { useStepStore, type MoveStepResult } from '../stores/stepStore'
import type { DisassemblyStep } from '../types/step'
import { findOrderConflicts, type OrderConflict } from '../utils/stepOrder'

interface StepOrderResult {
  steps: DisassemblyStep[]
  totalDurationSec: number
  currentStepIndex: number
  /** 当前顺序里排在自己前置步骤之前的步骤，用于“几处顺序对不上”的提示。 */
  orderConflicts: OrderConflict[]
  lastOrderConflict: OrderConflict | null
  move: (from: number, to: number) => Promise<MoveStepResult>
  setPrerequisite: (stepId: string, prerequisiteStepId: string | null) => Promise<void>
  clearOrderConflict: () => void
  setCurrentStep: (index: number) => void
}

export function useStepOrder(jointTypeId: string): StepOrderResult {
  const allSteps = useStepStore((state) => state.steps)
  const currentStepIndex = useStepStore((state) => state.currentStepIndex)
  const lastOrderConflict = useStepStore((state) => state.lastOrderConflict)
  const loadSteps = useStepStore((state) => state.loadSteps)
  const setPrerequisite = useStepStore((state) => state.setPrerequisite)
  const clearOrderConflict = useStepStore((state) => state.clearOrderConflict)
  const setCurrentStep = useStepStore((state) => state.setCurrentStep)

  useEffect(() => {
    if (!jointTypeId) return
    void loadSteps(jointTypeId)
  }, [jointTypeId, loadSteps])

  const steps = useMemo(
    () => allSteps
      .filter((step) => step.jointTypeId === jointTypeId)
      .sort((a, b) => a.seq - b.seq),
    [allSteps, jointTypeId],
  )

  const totalDurationSec = useMemo(
    () => steps.reduce((total, step) => total + step.holdSec, 0),
    [steps],
  )

  const orderConflicts = useMemo(() => findOrderConflicts(steps), [steps])

  const move = useCallback(async (from: number, to: number) => {
    return useStepStore.getState().moveStep(from, to)
  }, [])

  return {
    steps,
    totalDurationSec,
    currentStepIndex: Math.min(currentStepIndex, Math.max(0, steps.length - 1)),
    orderConflicts,
    lastOrderConflict,
    move,
    setPrerequisite,
    clearOrderConflict,
    setCurrentStep,
  }
}
