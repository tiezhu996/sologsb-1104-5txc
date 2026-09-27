import { create } from 'zustand'
import type { DisassemblyStep, MoveOutcome, PrereqUpdateOutcome } from '../types/step'
import { db } from '../utils/db'
import { listPrereqViolations, violationForStep, wouldCreateCycle } from '../utils/prereq'

interface StepState {
  steps: DisassemblyStep[]
  currentStepIndex: number
  loading: boolean
  loadSteps: (jointTypeId: string) => Promise<void>
  moveStep: (from: number, to: number) => Promise<MoveOutcome>
  setPrerequisite: (stepId: string, predecessorId: string | undefined) => Promise<PrereqUpdateOutcome>
  setCurrentStep: (index: number) => void
}

export const useStepStore = create<StepState>((set, get) => ({
  steps: [],
  currentStepIndex: 0,
  loading: false,

  loadSteps: async (jointTypeId) => {
    set({ loading: true })
    try {
      const steps = await db.steps.where('jointTypeId').equals(jointTypeId).sortBy('seq')
      set((state) => ({
        steps,
        currentStepIndex: Math.min(state.currentStepIndex, Math.max(0, steps.length - 1)),
      }))
    } finally {
      set({ loading: false })
    }
  },

  moveStep: async (from, to) => {
    const ordered = [...get().steps].sort((a, b) => a.seq - b.seq)
    if (from < 0 || to < 0 || from >= ordered.length || to >= ordered.length || from === to) {
      return { ok: false, reason: 'ignored' }
    }

    // 先在内存里模拟拖动后的顺序；前置对不上就不写入、不改变当前编排。
    const tentative = ordered.map((step) => ({ ...step }))
    const [moved] = tentative.splice(from, 1)
    if (!moved) return { ok: false, reason: 'ignored' }
    tentative.splice(to, 0, moved)
    const resequenced = tentative.map((step, index) => ({ ...step, seq: index + 1 }))

    const blocking = violationForStep(listPrereqViolations(resequenced), moved.id)
    if (blocking) {
      // 冲突提示按退回后的当前步号（原步号）点名，用户才能对上轨道上看到的两步。
      const seqById = new Map(ordered.map((step) => [step.id, step.seq]))
      return {
        ok: false,
        reason: 'violation',
        violation: {
          ...blocking,
          stepSeq: seqById.get(moved.id) ?? blocking.stepSeq,
          predecessorSeq: seqById.get(blocking.predecessorId) ?? blocking.predecessorSeq,
        },
      }
    }

    set({ steps: resequenced, currentStepIndex: to })
    await db.steps.bulkPut(resequenced)
    return { ok: true }
  },

  setPrerequisite: async (stepId, predecessorId) => {
    const steps = get().steps
    const target = steps.find((step) => step.id === stepId)
    if (!target) return { ok: false, reason: 'missing' }
    if (predecessorId === stepId) return { ok: false, reason: 'self' }
    if (predecessorId && !steps.some((step) => step.id === predecessorId)) {
      return { ok: false, reason: 'missing' }
    }
    if (predecessorId && wouldCreateCycle(steps, stepId, predecessorId)) {
      return { ok: false, reason: 'cycle' }
    }

    const updated: DisassemblyStep = {
      ...target,
      predecessorId: predecessorId || undefined,
    }
    set({ steps: steps.map((step) => (step.id === stepId ? updated : step)) })
    await db.steps.put(updated)
    return { ok: true }
  },

  setCurrentStep: (index) => set({
    currentStepIndex: Math.max(0, index),
  }),
}))
