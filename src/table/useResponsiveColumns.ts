/**
 * 响应式 responsive 列过滤 hook（对齐 antd `InternalTable.tsx:235-246`）。
 *
 * 在所有列派生（排序/筛选/选择/展开/列树构建）之前按当前视口断点过滤 `columns`，
 * 保证被移除的列不参与任何下游机制（与 antd 一致：antd 在 InternalTable 派生
 * `mergedColumns` 时过滤，下游消费 `mergedColumns`）。
 *
 * ★ 性能优化（对齐 antd `needResponsive` 思路）：先算 `needResponsive`（任一普通列设了 responsive）。
 *   - `needResponsive=false`（所有现有 demo 默认）：返回原 `columns` 引用（短路），
 *     即使 screens 在视口变化时更新，返回值引用不变 → 下游 useMemo 不重算 → 零回归、
 *     零多余重渲染。
 *   - `needResponsive=true`：按 screens 过滤。
 *   哨兵（`EXPAND_COLUMN` / `SELECTION_COLUMN`）不是 ColumnType，不带 responsive，跳过判定。
 *
 * 注：antd 公开类型 `Grid.useBreakpoint` 声明为无参（`() => ScreenMap`），底层 hook 实际支持
 *   `refreshOnChange` 参数但公开类型未暴露。这里用无参形式（refreshOnChange 默认 true，订阅
 *   responsiveObserver）；needResponsive 短路保证无 responsive 的 demo 不触发重渲染（返回值
 *   引用稳定），订阅本身是轻量 ResizeObserver，无性能问题。
 */

import { useMemo } from 'react'
// 响应式断点检测：antd Grid.useBreakpoint 返回 ScreenMap（{ xs?, sm?, md?, lg?, xl?, xxl?, xxxl? }），
// screens[bp]===true 表示当前视口 >= bp（antd responsiveObserver 语义）。
import Grid from 'antd/es/grid'
import {
  EXPAND_COLUMN,
  SELECTION_COLUMN,
  type ColumnOrSentinel,
  type ColumnType,
} from './types'

/**
 * 按当前视口断点过滤响应式列。
 *
 * @param columns 已应用 `column` 默认值后的列数组（可含哨兵 `SELECTION_COLUMN` / `EXPAND_COLUMN`）。
 * @returns 过滤后的可见列数组（无 responsive 列场景下返回原 `columns` 引用，保证下游 useMemo 不重算）。
 */
export function useResponsiveColumns<RecordType>(
  columns: Array<ColumnOrSentinel<RecordType>>,
): Array<ColumnOrSentinel<RecordType>> {
  const needResponsive = useMemo(() => {
    for (const c of columns as Array<ColumnOrSentinel<RecordType>>) {
      if (c === SELECTION_COLUMN || c === EXPAND_COLUMN) continue
      if ((c as ColumnType<RecordType>).responsive) return true
    }
    return false
  }, [columns])

  // useBreakpoint 订阅 antd responsiveObserver，视口变化时返回新 ScreenMap 触发重渲染。
  // 仅在 needResponsive=true 的场景下被下游 visibleColumns 消费；needResponsive=false 时短路。
  const screens = Grid.useBreakpoint()

  // 过滤 columns：无 responsive 的列（含哨兵）保留；有 responsive 的列按 antd 语义匹配
  // （列出的任一断点在当前视口激活即保留）。逐字对齐 antd InternalTable.tsx:242-246：
  //   matched = Object.keys(screens).filter(bp => screens[bp])
  //   显示 <=> !responsive || responsive.some(r => matched.has(r))
  const visibleColumns = useMemo(() => {
    if (!needResponsive) return columns
    const screensMap = screens ?? {}
    const matched = new Set<string>()
    for (const bp in screensMap) {
      if (screensMap[bp as keyof typeof screensMap]) matched.add(bp)
    }
    return (columns as Array<ColumnOrSentinel<RecordType>>).filter((c) => {
      // 哨兵不带 responsive，始终保留（对齐 antd：哨兵在 useFilledColumns 阶段展开，已不是
      // responsive 过滤的对象）。
      if (c === SELECTION_COLUMN || c === EXPAND_COLUMN) return true
      const col = c as ColumnType<RecordType>
      if (!col.responsive) return true
      return col.responsive.some((r) => matched.has(r as string))
    })
  }, [columns, needResponsive, screens])

  return visibleColumns
}
