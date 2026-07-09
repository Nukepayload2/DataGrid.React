export type VirtualizationMode = 'standard' | 'recycling'

export interface GridCellElementRenderParams<RecordType> {
  value: unknown
  record: RecordType
  rowIndex: number
  columnIndex: number
  columnKey: string
  dataIndex?: string | number | Array<string | number>
  rowKey: string | number | undefined
}

export type DisposeCellElementReason =
  | 'recycle'
  | 'replace'
  | 'discard'
  | 'unmount'

export interface GridColumnOptions<RecordType> {
  dragColumnLock?: 'lockDrag' | 'lockPosition'
  renderCellElement?: (
    params: GridCellElementRenderParams<RecordType>,
    oldElement: HTMLElement | undefined,
  ) => HTMLElement
  disposeCellElement?: (
    element: HTMLElement,
    reason: DisposeCellElementReason,
    params: GridCellElementRenderParams<RecordType> | undefined,
  ) => void
}

export type RecyclingCellElementMode = 'reuse' | 'no-reuse'
