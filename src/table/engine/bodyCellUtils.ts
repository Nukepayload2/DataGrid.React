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

export function extractRestElementProps(
  props: ElementProps,
): Record<string, unknown> {
  if (!props) return {}

  const rest: Record<string, unknown> = {}
  for (const key of Object.keys(props)) {
    if (key === 'className' || key === 'style') continue
    rest[key] = (props as Record<string, unknown>)[key]
  }
  return rest
}

function extractRestCellProps(
  props: Record<string, any> | undefined,
): Record<string, unknown> {
  if (!props) return {}

  const rest: Record<string, unknown> = {}
  for (const key of Object.keys(props)) {
    if (key === 'className' || key === 'style' || key === 'colSpan' || key === 'rowSpan') continue
    rest[key] = props[key]
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
  renderedCellProps,
  onRow,
  rowClassName,
  isRowSelected,
}: {
  column: EngineLeafColumn<RecordType>
  record: RecordType
  index: number
  components: EngineTableProps<RecordType>['components']
  renderedCellProps?: Record<string, any>
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
  const mergedOnCellProps = renderedCellProps || onCellProps
    ? {
        ...(renderedCellProps ?? null),
        ...(onCellProps ?? null),
      }
    : undefined

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
  const renderedCellClassName = typeof renderedCellProps?.className === 'string'
    ? renderedCellProps.className
    : undefined
  const renderedCellStyle = renderedCellProps?.style && typeof renderedCellProps.style === 'object'
    ? renderedCellProps.style as CSSProperties
    : undefined
  const selectedClass =
    isRowSelected && isRowSelected(record) ? 'dg-row-selected' : undefined
  const mergedClassName = [
    column.className,
    resolvedRowClassName,
    rowProps.className,
    renderedCellClassName,
  ]
    .filter(Boolean)
    .join(' ') || undefined
  const mergedStyle: CSSProperties = {
    ...(column.style ?? null),
    ...(rowProps.style ?? null),
    ...(renderedCellStyle ?? null),
  }

  return {
    onCellProps: mergedOnCellProps,
    onRowProps,
    rowClassName: resolvedRowClassName,
    selectedClass,
    mergedClassName,
    mergedStyle,
    restRowProps: {
      ...extractRestCellProps(renderedCellProps),
      ...rowProps.restProps,
    },
  }
}
