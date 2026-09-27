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
  /** 本步之前必须先完成的步骤 id；留空表示没有前置。旧数据没有该字段，一律按无前置处理。 */
  prerequisiteStepId?: string
  schemaRev?: number
}
