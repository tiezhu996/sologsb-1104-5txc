import type { DragEvent } from 'react'
import type { DisassemblyStep } from '../../types/step'

interface StepRailProps {
  steps: DisassemblyStep[]
  currentIndex: number
  onSelect: (index: number) => void
  onMove: (from: number, to: number) => void
}

export function StepRail({ steps, currentIndex, onSelect, onMove }: StepRailProps) {
  const seqById = new Map(steps.map((step) => [step.id, step.seq]))

  const handleDrop = (event: DragEvent<HTMLElement>, to: number) => {
    event.preventDefault()
    const from = Number(event.dataTransfer.getData('text/plain'))
    if (Number.isInteger(from)) onMove(from, to)
  }

  const prerequisiteLabel = (step: DisassemblyStep): { text: string; violated: boolean } => {
    if (!step.prerequisiteStepId) return { text: '前置：无', violated: false }
    const prerequisiteSeq = seqById.get(step.prerequisiteStepId)
    if (prerequisiteSeq === undefined) return { text: '前置：已失效，按无前置处理', violated: false }
    const violated = prerequisiteSeq > step.seq
    return {
      text: violated ? `前置：先完成第 ${prerequisiteSeq} 步 · 顺序对不上` : `前置：先完成第 ${prerequisiteSeq} 步`,
      violated,
    }
  }

  return (
    <div className="space-y-3" aria-label="拆装步骤轨道">
      {steps.map((step, index) => {
        const prerequisite = prerequisiteLabel(step)
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
            className={`group rounded-xl border p-3 transition ${
              currentIndex === index
                ? 'border-wood-500 bg-wood-50 shadow-sm'
                : 'border-stone-200 bg-white hover:border-wood-100'
            }`}
            data-testid="step-row"
          >
            <button
              type="button"
              onClick={() => onSelect(index)}
              className="flex w-full items-start gap-3 text-left"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                currentIndex === index ? 'bg-wood-700 text-white' : 'bg-stone-100 text-stone-600'
              }`}>
                {step.seq}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm text-stone-900">{step.action}</strong>
                  <span className="text-xs text-stone-500">{step.direction} · {step.tool}</span>
                </span>
                <span className="mt-1 block text-xs leading-5 text-stone-500">{step.riskNote}</span>
                <span className="mt-1 block text-[11px] text-wood-700">停留 {step.holdSec} 秒</span>
                <span className={`mt-0.5 block text-[11px] ${prerequisite.violated ? 'font-semibold text-rose-700' : 'text-stone-400'}`}>
                  {prerequisite.text}
                </span>
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
