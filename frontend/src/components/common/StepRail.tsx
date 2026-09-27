import type { DragEvent } from 'react'
import type { DisassemblyStep, PrereqViolation } from '../../types/step'
import { isPrereqMissing, predecessorSeqOf, violationForStep } from '../../utils/prereq'

interface StepRailProps {
  steps: DisassemblyStep[]
  currentIndex: number
  violations: PrereqViolation[]
  /** 拖动被退回时，需要高亮提示的步骤（被拖步骤及其前置步骤）。 */
  highlightedStepIds?: ReadonlySet<string>
  onSelect: (index: number) => void
  onMove: (from: number, to: number) => void
}

export function StepRail({ steps, currentIndex, violations, highlightedStepIds, onSelect, onMove }: StepRailProps) {
  const handleDrop = (event: DragEvent<HTMLElement>, to: number) => {
    event.preventDefault()
    const from = Number(event.dataTransfer.getData('text/plain'))
    if (Number.isInteger(from)) onMove(from, to)
  }

  return (
    <div className="space-y-3" aria-label="拆装步骤轨道">
      {steps.map((step, index) => {
        const violation = violationForStep(violations, step.id)
        const missing = isPrereqMissing(steps, step)
        const predecessorSeq = predecessorSeqOf(steps, step)
        const highlighted = highlightedStepIds?.has(step.id) ?? false

        const borderClass = violation || missing || highlighted
          ? 'border-rose-300 bg-rose-50/60 ring-1 ring-rose-200'
          : currentIndex === index
            ? 'border-wood-500 bg-wood-50 shadow-sm'
            : 'border-stone-200 bg-white hover:border-wood-100'

        return (
          <article
            key={step.id}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', String(index))
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(event) => handleDrop(event, index)}
            className={`group rounded-xl border p-3 transition ${borderClass} ${highlighted ? 'animate-step-shake' : ''}`}
            data-testid="step-row"
            data-step-id={step.id}
            data-violation={violation ? 'true' : undefined}
          >
            <button
              type="button"
              onClick={() => onSelect(index)}
              className="flex w-full items-start gap-3 text-left"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                violation || missing || highlighted ? 'bg-rose-600 text-white'
                  : currentIndex === index ? 'bg-wood-700 text-white' : 'bg-stone-100 text-stone-600'
              }`}>
                {step.seq}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm text-stone-900">{step.action}</strong>
                  <span className="text-xs text-stone-500">{step.direction} · {step.tool}</span>
                  {predecessorSeq !== undefined && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        violation ? 'bg-rose-100 text-rose-800' : 'bg-wood-100 text-wood-700'
                      }`}
                      data-testid="predecessor-badge"
                    >
                      前置：第 {predecessorSeq} 步
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-xs leading-5 text-stone-500">{step.riskNote}</span>
                {violation && (
                  <span className="mt-1 block text-[11px] font-medium leading-5 text-rose-700" data-testid="violation-note">
                    顺序对不上：第 {violation.predecessorSeq} 步排在了本步之后
                  </span>
                )}
                {missing && !violation && (
                  <span className="mt-1 block text-[11px] font-medium leading-5 text-rose-700">
                    前置步骤已不存在，请重新指定或清空
                  </span>
                )}
                <span className="mt-1 block text-[11px] text-wood-700">停留 {step.holdSec} 秒</span>
              </span>
            </button>
            <div className="mt-2 flex justify-end">
              <span className="cursor-grab select-none rounded px-2 py-1 text-[11px] text-stone-400 group-active:cursor-grabbing">
                拖动调序
              </span>
            </div>
          </article>
        )
      })}
    </div>
  )
}
