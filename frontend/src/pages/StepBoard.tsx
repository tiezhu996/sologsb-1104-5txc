import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BlankPanel } from '../components/common/BlankPanel'
import { OrderConflictNotice } from '../components/common/OrderConflictNotice'
import { StepRail } from '../components/common/StepRail'
import { SvgCanvas } from '../components/common/SvgCanvas'
import { useStepOrder } from '../hooks/useStepOrder'
import { useDiagramStore } from '../stores/diagramStore'
import { useJointStore } from '../stores/jointStore'
import type { PrereqUpdateOutcome } from '../types/step'
import { predecessorSeqOf } from '../utils/prereq'

export default function StepBoard() {
  const { id: idParam } = useParams()
  const id = idParam ?? ''
  const joints = useJointStore((state) => state.joints)
  const loadAll = useJointStore((state) => state.loadAll)
  const diagrams = useDiagramStore((state) => state.diagrams)
  const selectedMemberId = useDiagramStore((state) => state.selectedMemberId)
  const loadDiagrams = useDiagramStore((state) => state.loadDiagrams)
  const setSelectedMember = useDiagramStore((state) => state.setSelectedMember)
  const {
    steps, totalDurationSec, currentStepIndex, violations, violationCount,
    move, setPrerequisite, setCurrentStep,
  } = useStepOrder(id)

  const [rejection, setRejection] = useState<{ message: string; stepIds: ReadonlySet<string> } | null>(null)
  const [prereqFeedback, setPrereqFeedback] = useState<string | null>(null)
  const rejectionTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    void loadAll()
    if (id) void loadDiagrams(id)
  }, [id, loadAll, loadDiagrams])

  useEffect(() => () => window.clearTimeout(rejectionTimer.current), [])

  const joint = joints.find((item) => item.id === id)
  const currentStep = steps[currentStepIndex]
  const currentDiagram = diagrams.find((diagram) => diagram.stepId === currentStep?.id) ?? diagrams[0]

  const handleMove = async (from: number, to: number) => {
    const outcome = await move(from, to)
    if (outcome.ok) {
      setRejection(null)
      return
    }
    if (outcome.reason === 'violation') {
      const { violation } = outcome
      setRejection({
        message: `第 ${violation.stepSeq} 步之前必须先做完第 ${violation.predecessorSeq} 步，不能把第 ${violation.stepSeq} 步拖到第 ${violation.predecessorSeq} 步前面。`,
        stepIds: new Set([violation.stepId, violation.predecessorId]),
      })
      window.clearTimeout(rejectionTimer.current)
      rejectionTimer.current = window.setTimeout(() => setRejection(null), 4000)
    }
  }

  const handlePrereqChange = async (value: string) => {
    if (!currentStep) return
    const predecessorId = value === '' ? undefined : value
    const outcome: PrereqUpdateOutcome = await setPrerequisite(currentStep.id, predecessorId)
    if (outcome.ok) {
      setPrereqFeedback(null)
    } else if (outcome.reason === 'cycle') {
      setPrereqFeedback('不能设置：会与已有的前置关系形成循环。')
    } else {
      setPrereqFeedback('前置步骤选择无效，请重新选择。')
    }
  }

  return (
    <div className="space-y-7">
      <div>
        <Link to={`/joints/${id}`} className="inline-flex items-center gap-1.5 text-sm text-wood-700 hover:underline">
          <span aria-hidden="true">←</span> 返回类型详情
        </Link>
      </div>

      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.24em] text-wood-500">STEP SEQUENCE</p>
          <h1 className="text-3xl font-bold tracking-tight text-wood-900 sm:text-4xl">{joint?.name ?? '榫卯'} · 拆装步序编排</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
            拖动左侧步骤调整真实顺序，右侧同步查看每一步的示意图和风险提醒。每一步可登记一条前置步骤，拖过前置会被退回。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`rounded-xl border px-4 py-3 text-sm shadow-sm ${
            violationCount > 0 ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-wood-100 bg-white text-stone-600'
          }`} data-testid="sequence-summary">
            {steps.length} 步 · 总停留 <strong className={violationCount > 0 ? 'text-rose-700' : 'text-wood-700'}>{totalDurationSec}</strong> 秒
            {violationCount > 0 && (
              <span className="ml-2 font-semibold">· {violationCount} 处顺序对不上</span>
            )}
          </div>
        </div>
      </section>

      {steps.length === 0 ? (
        <BlankPanel title="当前类型尚无步骤" description="没有可编排的拆装动作，请先补充步骤数据。" />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="panel max-h-[720px] overflow-y-auto p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-wood-900">步骤轨道</h2>
                <p className="mt-1 text-xs text-stone-500">拖动任意步骤到目标位置</p>
              </div>
              <span className="rounded-full bg-wood-50 px-3 py-1 text-xs text-wood-700">自动保存</span>
            </div>
            <div className="mb-4">
              <OrderConflictNotice violations={violations} rejection={rejection ? { message: rejection.message } : null} />
            </div>
            <StepRail
              steps={steps}
              currentIndex={currentStepIndex}
              violations={violations}
              highlightedStepIds={rejection?.stepIds}
              onSelect={setCurrentStep}
              onMove={(from, to) => void handleMove(from, to)}
            />
          </section>

          <section className="space-y-5">
            <div className="panel p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-wood-700 text-lg font-bold text-white">
                  {currentStep?.seq ?? 0}
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-wood-900">{currentStep?.action ?? '步骤'} · {currentStep?.direction ?? '方向'}</h2>
                  <p className="mt-1 text-xs text-stone-500">使用工具：{currentStep?.tool ?? '待补充'} · 停留 {currentStep?.holdSec ?? 0} 秒</p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-wood-100 bg-wood-50/50 px-4 py-4">
                <label htmlFor="predecessor-select" className="block text-sm font-semibold text-wood-900">
                  前置步骤
                </label>
                <p className="mt-1 text-xs leading-5 text-stone-500">
                  选择本步之前必须先做完的一步，只能挂一条；不需要则留空。
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <select
                    id="predecessor-select"
                    data-testid="predecessor-select"
                    className="input-field max-w-xs"
                    value={currentStep?.predecessorId ?? ''}
                    onChange={(event) => void handlePrereqChange(event.target.value)}
                    disabled={!currentStep}
                  >
                    <option value="">无前置（留空）</option>
                    {steps
                      .filter((step) => step.id !== currentStep?.id)
                      .map((step) => (
                        <option key={step.id} value={step.id}>
                          第 {step.seq} 步 · {step.action}{step.direction}
                        </option>
                      ))}
                  </select>
                  {currentStep && predecessorSeqOf(steps, currentStep) !== undefined && (
                    <span className="rounded-full bg-wood-100 px-3 py-1 text-xs font-medium text-wood-700" data-testid="current-predecessor">
                      先做第 {predecessorSeqOf(steps, currentStep)} 步
                    </span>
                  )}
                </div>
                {prereqFeedback && (
                  <p className="mt-2 text-xs font-medium text-rose-700" role="alert" data-testid="predecessor-feedback">
                    {prereqFeedback}
                  </p>
                )}
              </div>

              <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                <p className="text-xs font-semibold text-amber-900">易损部位提醒</p>
                <p className="mt-1 text-sm leading-6 text-amber-900/80">{currentStep?.riskNote ?? '暂无提醒'}</p>
              </div>
            </div>

            <SvgCanvas
              svgMarkup={currentDiagram?.svgMarkup ?? ''}
              title={currentDiagram?.title ?? '步骤预览'}
              hitAreas={currentDiagram?.hitAreas ?? []}
              selectedMemberId={selectedMemberId}
              onSelectMember={setSelectedMember}
              emptyMessage="该步骤暂未绑定示意图"
            />
          </section>
        </div>
      )}
    </div>
  )
}
