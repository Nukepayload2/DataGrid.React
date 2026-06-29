/**
 * 行展开状态管理 hook — 详见 docs/design-notes/expand.md（引擎状态机 useRowExpand）
 *
 * 受控/非受控 expandedRowKeys 管理；可展开行判定（rowExpandable + expandedRowRender）；
 * 展开 toggle 生成新数组 + 触发回调。本 hook 不感知虚拟滚动（展开内容 track 在渲染层插入）。
 */

import { useCallback, useMemo, useState } from 'react'
import type { Expandable } from '../types'
import { getRowKey } from './GridTable'

export interface UseRowExpandOptions<RecordType> {
  /** antd `expandable` 配置（可能为 undefined → 无展开）。 */
  expandable?: Expandable<RecordType>
  /** 数据源（用于 defaultExpandAllRows 推导 + rowExpandable 判定）。 */
  dataSource: Array<RecordType>
  /** rowKey 取值器（字符串属性名或函数）。 */
  rowKey: string | ((record: RecordType) => string | number)
}

export interface UseRowExpandResult<RecordType> {
  /** 是否启用展开（expandable 存在且至少有一行可展开）。 */
  expandEnabled: boolean
  /** 所有"可展开"行 key 的集合（rowExpandable!==false 且 expandedRowRender 非 null）。 */
  expandableKeySet: Set<React.Key>
  /** 某 key 是否展开。 */
  isExpanded: (key: React.Key) => boolean
  /** 当前展开 keys 数组（受控源 or 非受控 state）。 */
  expandedRowKeys: Array<React.Key>
  /** 切换某行展开态（生成新数组 + 触发 onExpand/onExpandedRowsChange）。 */
  toggleExpand: (key: React.Key, record: RecordType) => void
}

/**
 * 计算"某行是否真正可展开"（对齐 antd 语义，不重复调用 expandedRowRender）— 详见 docs/design-notes/expand.md
 *
 * 必须提供 expandedRowRender（否则整表无展开）；rowExpandable 若提供返回 false 的行不可展开。
 * 不调用 expandedRowRender 来探测可展开性（避免重复渲染 + 副作用）——与 antd 一致：
 * antd 只在展开时才 mount 调用 expandedRowRender。
 */
function computeExpandable<RecordType>(
  expandable: Expandable<RecordType> | undefined,
  dataSource: Array<RecordType>,
  rowKey: string | ((record: RecordType) => string | number),
): Set<React.Key> {
  const out = new Set<React.Key>()
  if (!expandable || typeof expandable.expandedRowRender !== 'function') return out
  const { rowExpandable } = expandable
  dataSource.forEach((record) => {
    if (rowExpandable && !rowExpandable(record)) return
    out.add(getRowKey(record, rowKey))
  })
  return out
}

export function useRowExpand<RecordType>(
  options: UseRowExpandOptions<RecordType>,
): UseRowExpandResult<RecordType> {
  const { expandable, dataSource, rowKey } = options

  // 可展开 key 集合（基于 expandable 配置 + dataSource 派生）。
  const expandableKeySet = useMemo(
    () => computeExpandable(expandable, dataSource, rowKey),
    [expandable, dataSource, rowKey],
  )

  const expandEnabled = expandableKeySet.size > 0

  // === 受控 / 非受控展开 keys ===
  const isControlled = !!expandable && expandable.expandedRowKeys !== undefined

  // 非受控初始 keys：defaultExpandAllRows 优先 → 推导所有可展开 key；
  // 否则 defaultExpandedRowKeys（过滤掉不可展开的 key）。
  const [uncontrolledKeys, setUncontrolledKeys] = useState<Array<React.Key>>(() => {
    if (!expandable) return []
    if (expandable.defaultExpandAllRows) return Array.from(expandableKeySet)
    const defaults = expandable.defaultExpandedRowKeys ?? []
    // 过滤：仅保留仍可展开的 key（避免初始就指向不可展开的行）。
    return defaults.filter((k) => expandableKeySet.has(k))
  })

  // 受控：用 expandable.expandedRowKeys；非受控：用 state。
  // 注：受控源可能含不可展开 key（保留语义，与 antd preserve 类似）；isExpanded 仍按该数组判定。
  const effectiveExpandedKeys: Array<React.Key> = expandable
    ? isControlled
      ? (expandable.expandedRowKeys as Array<React.Key>)
      : uncontrolledKeys
    : []

  // 当前展开 key 的 Set（受控源派生）。
  const expandedKeySet = useMemo(
    () => new Set<React.Key>(effectiveExpandedKeys),
    [effectiveExpandedKeys],
  )

  const isExpanded = useCallback(
    (key: React.Key) => expandedKeySet.has(key),
    [expandedKeySet],
  )

  const toggleExpand = useCallback(
    (key: React.Key, record: RecordType) => {
      if (!expandable) return
      const willExpand = !expandedKeySet.has(key)
      const next: Array<React.Key> = willExpand
        ? [...effectiveExpandedKeys, key]
        : effectiveExpandedKeys.filter((k) => k !== key)
      if (!isControlled) {
        setUncontrolledKeys(next)
      }
      // 回调（对齐 antd：先 onExpandedRowsChange，再 onExpand）。
      expandable.onExpandedRowsChange?.(next)
      expandable.onExpand?.(willExpand, record)
    },
    [expandable, expandedKeySet, effectiveExpandedKeys, isControlled],
  )

  return {
    expandEnabled,
    expandableKeySet,
    isExpanded,
    expandedRowKeys: effectiveExpandedKeys,
    toggleExpand,
  }
}
