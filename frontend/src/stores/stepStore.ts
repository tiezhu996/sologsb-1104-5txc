import { create } from 'zustand'
import type { DisassemblyStep } from '../types/step'
import { db } from '../utils/db'
import { findOrderConflicts, type OrderConflict } from '../utils/stepOrder'

export type MoveStepResult = { ok: true } | { ok: false; conflict: OrderConflict }

interface StepState {
  steps: DisassemblyStep[]
  currentStepIndex: number
  loading: boolean
  /** 最近一次被退回的拖拽所冲突的两步；成功移动或切换类型后清空。 */
  lastOrderConflict: OrderConflict | null
  loadSteps: (jointTypeId: string) => Promise<void>
  moveStep: (from: number, to: number) => Promise<MoveStepResult>
  setPrerequisite: (stepId: string, prerequisiteStepId: string | null) => Promise<void>
  clearOrderConflict: () => void
  setCurrentStep: (index: number) => void
}

export const useStepStore = create<StepState>((set, get) => ({
  steps: [],
  currentStepIndex: 0,
  loading: false,
  lastOrderConflict: null,

  loadSteps: async (jointTypeId) => {
    set({ loading: true })
    try {
      const steps = await db.steps.where('jointTypeId').equals(jointTypeId).sortBy('seq')
      set((state) => ({
        steps,
        currentStepIndex: Math.min(state.currentStepIndex, Math.max(0, steps.length - 1)),
        lastOrderConflict: null,
      }))
    } finally {
      set({ loading: false })
    }
  },

  moveStep: async (from, to) => {
    const ordered = [...get().steps].sort((a, b) => a.seq - b.seq)
    if (from < 0 || to < 0 || from >= ordered.length || to >= ordered.length || from === to) {
      return { ok: true }
    }
    const [moved] = ordered.splice(from, 1)
    if (!moved) return { ok: true }
    ordered.splice(to, 0, moved)
    const resequenced = ordered.map((step, index) => ({ ...step, seq: index + 1 }))

    // 只校验与被拖动步骤相关的前置约束，命中则退回原位并指出对不上的两步。
    const conflict = findOrderConflicts(resequenced).find(
      (item) => item.stepId === moved.id || item.prerequisiteId === moved.id,
    )
    if (conflict) {
      const currentSeqById = new Map(get().steps.map((step) => [step.id, step.seq]))
      const reverted: OrderConflict = {
        stepId: conflict.stepId,
        stepSeq: currentSeqById.get(conflict.stepId) ?? conflict.stepSeq,
        prerequisiteId: conflict.prerequisiteId,
        prerequisiteSeq: currentSeqById.get(conflict.prerequisiteId) ?? conflict.prerequisiteSeq,
      }
      set({ lastOrderConflict: reverted })
      return { ok: false, conflict: reverted }
    }

    set({ steps: resequenced, currentStepIndex: to, lastOrderConflict: null })
    await db.steps.bulkPut(resequenced)
    return { ok: true }
  },

  setPrerequisite: async (stepId, prerequisiteStepId) => {
    const target = get().steps.find((step) => step.id === stepId)
    if (!target) return
    const updated = { ...target }
    if (prerequisiteStepId && prerequisiteStepId !== stepId) {
      updated.prerequisiteStepId = prerequisiteStepId
    } else {
      delete updated.prerequisiteStepId
    }
    set((state) => ({
      steps: state.steps.map((step) => (step.id === stepId ? updated : step)),
    }))
    await db.steps.put(updated)
  },

  clearOrderConflict: () => set({ lastOrderConflict: null }),

  setCurrentStep: (index) => set({
    currentStepIndex: Math.max(0, index),
  }),
}))
