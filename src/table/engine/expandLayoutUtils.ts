import type { Key } from 'react'
import { getRowKey } from './recordAccess'

export interface ExpandLayoutItem {
  rowLine: number
  expandTrackLine?: number
}

export interface ComputeExpandLayoutOptions<RecordType> {
  expandEnabled: boolean
  isExpandable?: (key: Key) => boolean
  showHeader: boolean
  maxDepth: number
  virtualEnabled: boolean
  virtualState: { start: number; end: number }
  dataSource: Array<RecordType>
  rowKey: string | ((record: RecordType) => string | number)
}

export function computeExpandLayout<RecordType>({
  expandEnabled,
  isExpandable,
  showHeader,
  maxDepth,
  virtualEnabled,
  virtualState,
  dataSource,
  rowKey,
}: ComputeExpandLayoutOptions<RecordType>): { layout: Map<number, ExpandLayoutItem> } {
  const layout = new Map<number, ExpandLayoutItem>()
  if (!expandEnabled || !isExpandable) return { layout }

  const headerRowsUsed = showHeader ? maxDepth : 0
  let lineCursor = headerRowsUsed + (virtualEnabled ? 1 : 0)
  const lo = virtualEnabled ? virtualState.start : 0
  const hi = virtualEnabled ? virtualState.end : dataSource.length

  for (let i = lo; i < hi; i += 1) {
    const rowLine = lineCursor + 1
    const record = dataSource[i]
    let expandTrackLine: number | undefined

    if (record !== undefined) {
      const key = getRowKey(record, rowKey)
      if (isExpandable(key)) {
        expandTrackLine = rowLine + 1
        lineCursor += 2
      } else {
        lineCursor += 1
      }
    } else {
      lineCursor += 1
    }

    layout.set(i, { rowLine, expandTrackLine })
  }

  return { layout }
}
