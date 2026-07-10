import type { ReactElement } from 'react'

export type VirtualizationMode = 'standard' | 'recycling'

export interface GridCellRenderParams<RecordType> {
  value: unknown
  record: RecordType
  rowIndex: number
  columnIndex: number
  columnKey: string
  dataIndex?: string | number | Array<string | number>
  rowKey: string | number | undefined
}

export interface GridCellElementRenderParams<RecordType> extends GridCellRenderParams<RecordType> {}

export interface GridCellReactSlotProps {
  key: string
  props: {
    className: string
  }
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
  renderCellReact?: (
    params: GridCellRenderParams<RecordType>,
    slot: GridCellReactSlotProps,
  ) => ReactElement | null
  disposeCellElement?: (
    element: HTMLElement,
    reason: DisposeCellElementReason,
    params: GridCellElementRenderParams<RecordType> | undefined,
  ) => void
}

export type RecyclingCellElementMode = 'reuse' | 'no-reuse'
