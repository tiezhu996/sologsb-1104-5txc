import type { PrereqViolation } from '../../types/step'

interface OrderConflictNoticeProps {
  violations: PrereqViolation[]
  /** 拖动被退回时的提示文案，优先于常驻的冲突列表展示。 */
  rejection?: { message: string } | null
}

/**
 * 前置顺序提示条：
 * - 拖动被退回时点名是哪两步对不上；
 * - 平时常驻列出该类型当前所有顺序对不上的步骤对，计数一眼可见。
 */
export function OrderConflictNotice({ violations, rejection }: OrderConflictNoticeProps) {
  if (rejection) {
    return (
      <div
        role="alert"
        data-testid="move-rejected"
        className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800"
      >
        <strong className="font-semibold">已退回原位：</strong>{rejection.message}
      </div>
    )
  }

  if (violations.length === 0) return null

  return (
    <div
      role="status"
      data-testid="order-conflicts"
      className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3"
    >
      <p className="text-sm font-semibold text-rose-800">
        {violations.length} 处顺序对不上
      </p>
      <ul className="mt-1 space-y-1 text-xs leading-5 text-rose-700">
        {violations.map((item) => (
          <li key={item.stepId} data-testid="conflict-pair">
            第 {item.stepSeq} 步要求先做完第 {item.predecessorSeq} 步，但第 {item.predecessorSeq} 步现在排在它后面
          </li>
        ))}
      </ul>
    </div>
  )
}
