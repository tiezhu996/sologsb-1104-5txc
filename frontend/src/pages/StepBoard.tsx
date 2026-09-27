import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BlankPanel } from '../components/common/BlankPanel'
import { StepRail } from '../components/common/StepRail'
import { SvgCanvas } from '../components/common/SvgCanvas'
import { useStepOrder } from '../hooks/useStepOrder'
import { useDiagramStore } from '../stores/diagramStore'
import { useJointStore } from '../stores/jointStore'

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
    steps,
    totalDurationSec,
    currentStepIndex,
    orderConflicts,
    lastOrderConflict,
    move,
    setPrerequisite,
    clearOrderConflict,
    setCurrentStep,
  } = useStepOrder(id)

  useEffect(() => {
    void loadAll()
    if (id) void loadDiagrams(id)
  }, [id, loadAll, loadDiagrams])

  const joint = joints.find((item) => item.id === id)
  const currentStep = steps[currentStepIndex]
  const currentDiagram = diagrams.find((diagram) => diagram.stepId === currentStep?.id) ?? diagrams[0]

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
            拖动左侧步骤调整真实顺序，右侧同步查看每一步的示意图和风险提醒。
          </p>
        </div>
        <div className="rounded-xl border border-wood-100 bg-white px-5 py-3 text-sm text-stone-600 shadow-sm">
          {steps.length} 步 · 总停留 <strong className="text-wood-700">{totalDurationSec}</strong> 秒
        </div>
      </section>

      {lastOrderConflict && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3" role="alert">
          <p className="text-sm leading-6 text-rose-800">
            已退回原位：第 {lastOrderConflict.stepSeq} 步需排在它的前置步骤（第 {lastOrderConflict.prerequisiteSeq} 步）之后，这两步顺序对不上。
          </p>
          <button type="button" onClick={clearOrderConflict} className="shrink-0 text-xs text-rose-700 hover:underline">
            知道了
          </button>
        </div>
      )}

      {steps.length === 0 ? (
        <BlankPanel title="当前类型尚无步骤" description="没有可编排的拆装动作，请先补充步骤数据。" />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="panel max-h-[720px] overflow-y-auto p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-wood-900">步骤轨道</h2>
                <p className="mt-1 text-xs text-stone-500">拖动任意步骤到目标位置，前置步骤被越过时会退回原位</p>
              </div>
              <div className="flex items-center gap-2">
                {orderConflicts.length > 0 && (
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                    顺序对不上 {orderConflicts.length} 处
                  </span>
                )}
                <span className="rounded-full bg-wood-50 px-3 py-1 text-xs text-wood-700">自动保存</span>
              </div>
            </div>
            <StepRail
              steps={steps}
              currentIndex={currentStepIndex}
              onSelect={setCurrentStep}
              onMove={(from, to) => void move(from, to)}
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
              <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                <p className="text-xs font-semibold text-amber-900">易损部位提醒</p>
                <p className="mt-1 text-sm leading-6 text-amber-900/80">{currentStep?.riskNote ?? '暂无提醒'}</p>
              </div>
              {currentStep && (
                <div className="mt-4">
                  <label htmlFor="prerequisite-select" className="text-xs font-semibold text-wood-700">
                    前置步骤（本步之前要先完成的一步，不需要可留空）
                  </label>
                  <select
                    id="prerequisite-select"
                    value={currentStep.prerequisiteStepId ?? ''}
                    onChange={(event) => void setPrerequisite(currentStep.id, event.target.value || null)}
                    className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:border-wood-500 focus:outline-none"
                  >
                    <option value="">无前置</option>
                    {steps
                      .filter((step) => step.id !== currentStep.id)
                      .map((step) => (
                        <option key={step.id} value={step.id}>
                          第 {step.seq} 步 · {step.action}（{step.direction}）
                        </option>
                      ))}
                  </select>
                </div>
              )}
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
