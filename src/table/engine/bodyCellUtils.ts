import type { CSSProperties, HTMLAttributes } from 'react'
import type { EngineLeafColumn, EngineTableProps } from './types'

type ElementProps = HTMLAttributes<HTMLElement> | undefined

export function resolveRowClassName<RecordType>(
  rowClassName: EngineTableProps<RecordType>['rowClassName'],
  record: RecordType,
  index: number,
): string | undefined {
  if (rowClassName === undefined) return undefined
  if (typeof rowClassName === 'string') return rowClassName

  try {
    return rowClassName(record, index)
  } catch {
    return undefined
  }
}

/**
 * 表体行级 props（`onRow` 返回值；表头的 `onHeaderRow` 走 headerCellUtils.ts 的另一条通道）里
 * **除 className/style 之外**的其余字段——本仓 grid 布局无 `<tr>`，这个袋会被 spread 到该行
 * **每一个**格子 div 上（BodyGrid.tsx / FlatColumnCells.tsx / RecyclingBodyGrid.tsx 三个消费者共用）。
 *
 * 剔除集 = `className` / `style`（另有专用合并通道）+ **`key`**：
 *   - `key` 不是 HTML 属性而是 **React 元素身份**，格子身份由引擎独占
 *     （multi 见 BodyGrid.tsx 的 `standardCellKey`，flat 见 FlatColumnCells.tsx 的行键 `key`）。
 *     用户 `onRow` 返回的 `key` 若进袋，会在 JSX「后置属性赢」的规则下**覆写**引擎写在
 *     spread 之前的 `key` ⇒ 同行所有格子身份塌成同一个串。
 *   - 参照侧不存在这条通路：`@rc-component/table` 的 BodyRow 只把 onRow 返回值 spread 到该行
 *     **唯一一个** `<tr>`，格子 key 走它自己的 `getCellProps().key`，行级 key 碰不到格子。
 *     本仓没有「每行唯一一个 React 元素」可托管这个 `key`（`components.body.row` 那一层的 key
 *     由引擎显式写死、不吃 spread），所以行级 `key` 在袋里没有任何合法落点——只能不进袋。
 *   - 只剔元素身份字段，其余字段（onClick、onMouseEnter、tabIndex、data-x 这类自定义属性等）照旧逐格透传，
 *     不是「整包丢弃」（钉子见 tests/table/features/Table.test.tsx 的
 *     「keeps the engine cell key when onRow returns a key」两条用例）。
 */
export function extractRestElementProps(
  props: ElementProps,
): Record<string, unknown> {
  if (!props) return {}

  const rest: Record<string, unknown> = {}
  for (const key of Object.keys(props)) {
    if (key === 'className' || key === 'style' || key === 'key') continue
    rest[key] = (props as Record<string, unknown>)[key]
  }
  return rest
}

export function splitElementProps(props: ElementProps): {
  className: string | undefined
  style: CSSProperties | undefined
  restProps: Record<string, unknown>
} {
  return {
    className: props?.className,
    style: props?.style,
    restProps: extractRestElementProps(props),
  }
}

export function resolveBodyCellInjectedProps<RecordType>({
  column,
  record,
  index,
  components,
  onRow,
  rowClassName,
  isRowSelected,
}: {
  column: EngineLeafColumn<RecordType>
  record: RecordType
  index: number
  components: EngineTableProps<RecordType>['components']
  onRow?: (record: RecordType, index: number) => ElementProps
  rowClassName?: EngineTableProps<RecordType>['rowClassName']
  isRowSelected?: (record: RecordType) => boolean
}): {
  onCellProps: Record<string, any> | undefined
  onRowProps: ElementProps
  rowClassName: string | undefined
  selectedClass: string | undefined
  mergedClassName: string | undefined
  mergedStyle: CSSProperties
  restRowProps: Record<string, unknown>
} {
  let onCellProps: Record<string, any> | undefined
  if (column.onCell && components?.body?.cell) {
    try {
      onCellProps = column.onCell(record, index)
    } catch {
      onCellProps = undefined
    }
  }

  let onRowProps: ElementProps
  if (onRow) {
    try {
      onRowProps = onRow(record, index)
    } catch {
      onRowProps = undefined
    }
  }

  const resolvedRowClassName = resolveRowClassName(rowClassName, record, index)
  const rowProps = splitElementProps(onRowProps)
  const selectedClass =
    isRowSelected && isRowSelected(record) ? 'dg-row-selected' : undefined
  const mergedClassName = [
    column.className,
    resolvedRowClassName,
    rowProps.className,
  ]
    .filter(Boolean)
    .join(' ') || undefined
  const mergedStyle: CSSProperties = {
    ...(column.style ?? null),
    ...(rowProps.style ?? null),
  }

  return {
    onCellProps,
    onRowProps,
    rowClassName: resolvedRowClassName,
    selectedClass,
    mergedClassName,
    mergedStyle,
    restRowProps: {
      ...rowProps.restProps,
    },
  }
}
