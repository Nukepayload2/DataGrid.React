/**
 * 引擎层筛选项类型。
 *
 * 从 engineTypes.ts 拆出（档二·纯类型）。与对外 `ColumnFilterItem` 同语义；
 * 引擎只消费 `text`/`value`（渲染下拉项 + 勾选比对），`children`（树形）引擎不消费。
 */

import type { ReactNode } from 'react'

/**
 * 筛选项（引擎层独立类型；与对外 `ColumnFilterItem` 同语义）。
 * 引擎只消费 `text`/`value`（渲染下拉项 + 勾选比对）；`children`（树形）引擎不消费。
 */
export interface EngineFilterItem {
  text: ReactNode
  value: import('../../types').FilterValue
  children?: Array<EngineFilterItem>
}
