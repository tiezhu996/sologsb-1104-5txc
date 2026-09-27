export type StepAction = '拆卸' | '装配'
export type StepDirection = '轴向' | '侧向' | '斜向'
export type StepTool = '木槌' | '鱼线' | '撬板'

export interface DisassemblyStep {
  id: string
  jointTypeId: string
  seq: number
  action: StepAction
  direction: StepDirection
  tool: StepTool
  riskNote: string
  holdSec: number
  /** 前置步骤 id：本步之前必须先完成的那一步；留空表示无前置。历史数据无此字段，按无前置处理。 */
  predecessorId?: string
  schemaRev?: number
}

/** 一对顺序对不上的步骤：本步的前置步骤在当前编排里排在了本步之后（或同一位置）。 */
export interface PrereqViolation {
  stepId: string
  predecessorId: string
  stepSeq: number
  predecessorSeq: number
}

export type MoveOutcome =
  | { ok: true }
  | { ok: false; reason: 'violation'; violation: PrereqViolation }
  | { ok: false; reason: 'ignored' }

export type PrereqUpdateOutcome =
  | { ok: true }
  | { ok: false; reason: 'self' | 'cycle' | 'missing' }
