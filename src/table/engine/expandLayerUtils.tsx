import type { ReactNode } from 'react'
import { getRowKey } from './recordAccess'
import type { ExpandLayoutItem } from './expandLayoutUtils'
import type { EngineExpandState, EngineLeafColumn } from './types'

export interface RenderExpandedContentsOptions<RecordType> {
  dataSource: Array<RecordType>
  virtualEnabled: boolean
  virtualState: { start: number; end: number }
  expandState: EngineExpandState
  expandLayout: Map<number, ExpandLayoutItem>
  rowKey: string | ((record: RecordType) => string | number)
  leafColumns: Array<EngineLeafColumn<RecordType>>
}

export function renderExpandedContents<RecordType>({
  dataSource,
  virtualEnabled,
  virtualState,
  expandState,
  expandLayout,
  rowKey,
  leafColumns,
}: RenderExpandedContentsOptions<RecordType>): Array<ReactNode> {
  const out: Array<ReactNode> = []
  const lo = virtualEnabled ? virtualState.start : 0
  const hi = virtualEnabled ? virtualState.end : dataSource.length
  const rawOffset = expandState.expandedRowOffset
  const offset = typeof rawOffset === 'number' && Number.isFinite(rawOffset)
    ? Math.max(0, Math.floor(rawOffset))
    : 0
  const startLine = Math.min(offset, Math.max(leafColumns.length - 1, 0)) + 1
  const gridColumn = startLine <= 1 ? '1 / -1' : `${startLine} / -1`
  for (let i = lo; i < hi; i += 1) {
    const record = dataSource[i]
    if (record === undefined) continue
    const key = getRowKey(record, rowKey)
    if (!expandState.isExpandable(key)) continue
    if (!expandState.isExpanded(key)) continue
    const layout = expandLayout.get(i)
    if (!layout || layout.expandTrackLine === undefined) continue
    const content = expandState.expandedRowRender(record, i, true)
    if (content === null || content === undefined) continue
    out.push(
      <div
        key={`expand-${i}-${key}`}
        className="dg-row-expanded"
        style={{
          gridColumn,
          gridRow: layout.expandTrackLine,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {content}
      </div>,
    )
  }
  return out
}
