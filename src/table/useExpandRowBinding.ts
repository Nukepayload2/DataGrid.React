/**
 * 行展开 + 行点击绑定 hook（从 Table.tsx 抽出，机械搬运）。
 *
 * 把 `Table.tsx` 原 L986–1091 的 expandRowByClick 派生 + `onRowWithExpand`（行点击选择
 * single/multiple/extended-shift + expandRowByClick 叠加 + 用户 onRow.onClick 保留）+
 * `rowClassNameWithExpand`（展开行追加 expandedRowClassName）整体搬进 hook。
 *
 * **依赖数组逐字搬运**：`onRowWithExpand`/`rowClassNameWithExpand` 的 deps 数组（行点击
 *   选择/shift 范围/ctrl-meta 累加正确性）禁止改动。
 *
 * 详见 `docs/engineering-refactor-table-hooks.md` §3.2⑥。
 */
import { useMemo } from 'react'
import { getRowKey } from './engine/GridTable'
import type { UseRowExpandResult } from './engine/useRowExpand'
import type { UseRowSelectionResult } from './engine/useRowSelection'
import type { UseSelectionAdapterResult } from './useSelectionAdapter'
import {
  getRangeKeys,
  shouldSkipRowSelectionClick,
} from './selectionAdapter'
import type {
  Expandable,
  GridSelectionMode,
  RowSelectMethod,
  TableProps,
} from './types'

export interface UseExpandRowBindingOptions<RecordType> {
  expandEnabled: boolean
  expandable: Expandable<RecordType> | undefined
  expand: UseRowExpandResult<RecordType>
  onRow: TableProps<RecordType>['onRow']
  rowClassName: TableProps<RecordType>['rowClassName']
  rowKey: string | ((record: RecordType) => string | number)
  // selection 耦合入参
  nativeSelectionConfigured: boolean
  resolvedSelectionMode: GridSelectionMode
  selection: UseRowSelectionResult<RecordType>
  selectionAnchorKey: React.Key | null
  setSelectionAnchorKey: (k: React.Key | null) => void
  effectiveSelectedKeys: Array<React.Key>
  fireSelectionChange: UseSelectionAdapterResult<RecordType>['fireSelectionChange']
}

export interface UseExpandRowBindingResult<RecordType> {
  onRowWithExpand: TableProps<RecordType>['onRow']
  rowClassNameWithExpand: TableProps<RecordType>['rowClassName']
}

export function useExpandRowBinding<RecordType>(
  options: UseExpandRowBindingOptions<RecordType>,
): UseExpandRowBindingResult<RecordType> {
  const {
    expandEnabled,
    expandable,
    expand,
    onRow,
    rowClassName,
    rowKey: rowKeyResolved,
    nativeSelectionConfigured,
    resolvedSelectionMode,
    selection,
    selectionAnchorKey,
    setSelectionAnchorKey,
    effectiveSelectedKeys,
    fireSelectionChange,
  } = options

  // === expandRowByClick + expandedRowClassName 派生 ===
  const expandRowByClick = expandEnabled ? expandable?.expandRowByClick === true : false
  const expandedRowClassNameFn = expandEnabled ? expandable?.expandedRowClassName : undefined

  // === onRowWithExpand（行点击选择 + expandRowByClick 叠加 + 用户 onClick 保留）===
  // ★★★ deps 数组逐字保留——行点击选择/shift 范围/ctrl-meta 累加正确性的命脉。★★★
  const onRowWithExpand = useMemo<typeof onRow>(() => {
    const rowClickSelectionEnabled =
      nativeSelectionConfigured && resolvedSelectionMode !== 'disabled'
    if (!expandRowByClick && !rowClickSelectionEnabled) return onRow
    return (record, index) => {
      const userProps = onRow?.(record, index) ?? {}
      const key = getRowKey(record, rowKeyResolved)
      const userOnClick = userProps.onClick
      const expandableRecord = expand.expandableKeySet.has(key)
      return {
        ...userProps,
        onClick: (e: React.MouseEvent<HTMLElement>) => {
          const skipInteraction = shouldSkipRowSelectionClick(e.target)
          if (
            rowClickSelectionEnabled &&
            !skipInteraction &&
            !selection.isDisabled(record)
          ) {
            let nextKeys: Array<React.Key> | null = null
            let method: RowSelectMethod = 'single'
            if (resolvedSelectionMode === 'single') {
              nextKeys = selection.selectRow(key)
              setSelectionAnchorKey(key)
            } else if (resolvedSelectionMode === 'multiple') {
              nextKeys = selection.toggleRow(key)
              method = 'multiple'
              setSelectionAnchorKey(key)
            } else if (resolvedSelectionMode === 'extended') {
              const additive = e.ctrlKey || e.metaKey
              if (e.shiftKey && selectionAnchorKey !== null) {
                const rangeKeys = getRangeKeys(selection.selectableKeys, selectionAnchorKey, key)
                if (additive) {
                  nextKeys = Array.from(new Set<React.Key>([...effectiveSelectedKeys, ...rangeKeys]))
                } else {
                  nextKeys = rangeKeys
                }
                method = rangeKeys.length > 1 || additive ? 'multiple' : 'single'
              } else if (additive) {
                nextKeys = selection.toggleRow(key)
                method = 'multiple'
              } else {
                nextKeys = [key]
              }
              setSelectionAnchorKey(key)
            }
            if (nextKeys) {
              fireSelectionChange(nextKeys, method, {
                record,
                nativeEvent: e.nativeEvent ?? e,
              })
            }
          }
          if (expandRowByClick && expandableRecord && !skipInteraction) {
            expand.toggleExpand(key, record)
          }
          userOnClick?.(e)
        },
      }
    }
  }, [
    expandRowByClick,
    onRow,
    expand,
    rowKeyResolved,
    nativeSelectionConfigured,
    resolvedSelectionMode,
    selection,
    selectionAnchorKey,
    effectiveSelectedKeys,
    fireSelectionChange,
  ])

  // === rowClassNameWithExpand（展开行追加 expandedRowClassName）===
  // ★ deps 数组逐字保留。★
  const rowClassNameWithExpand = useMemo(() => {
    if (!expandedRowClassNameFn) return rowClassName
    // 归一化为函数形式（string → 常量函数），便于追加 expandedRowClassName。
    const baseFn: ((record: RecordType, index: number) => string) | undefined =
      rowClassName === undefined
        ? undefined
        : typeof rowClassName === 'string'
          ? () => rowClassName
          : rowClassName
    return (record: RecordType, index: number) => {
      const base = baseFn?.(record, index) ?? ''
      const key = getRowKey(record, rowKeyResolved)
      // 仅该行展开时追加（收起时不加，对齐 antd）。
      const extra = expand.isExpanded(key) ? expandedRowClassNameFn(record, index) : ''
      return [base, extra].filter(Boolean).join(' ')
    }
  }, [expandedRowClassNameFn, rowClassName, expand, rowKeyResolved])

  return {
    onRowWithExpand,
    rowClassNameWithExpand,
  }
}
