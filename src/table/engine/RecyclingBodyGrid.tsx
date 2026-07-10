import { useLayoutEffect, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { resolveBodyCellInjectedProps } from './bodyCellUtils'
import {
  fixedClass,
  resolveBodyCellEllipsisTitle,
  shadowClass,
} from './cellRenderUtils'
import { isRowSpanHovered, resolveHoverClass } from './hoverController'
import { getValueByDataIndex } from './recordAccess'
import {
  stickyCellStyle,
  type LeafStickyInfo,
} from './useStickyColumns'
import {
  defaultRenderCellElement,
} from './useCellElementPool'
import type {
  DisposeCellElementReason,
  GridCellElementRenderParams,
  GridColumnOptions,
} from './recyclingCellTypes'
import type {
  EngineLeafColumn,
  EngineSemantic,
  EngineTableProps,
} from './types'

type Identity = string | number | object | undefined
type ListenerEntry = [type: string, listener: EventListener]
type CellRenderKind = 'element' | 'react'

interface ReactSlot<RecordType> {
  key: string
  root: Root
  columnIdentity: Identity
  renderer: GridColumnOptions<RecordType>['renderCellReact']
}

interface ActiveCell<RecordType> {
  outer: HTMLDivElement
  inner: HTMLDivElement
  content: HTMLElement | undefined
  column: EngineLeafColumn<RecordType>
  columnIdentity: Identity
  rowIdentity: Identity
  params: GridCellElementRenderParams<RecordType>
  renderKind: CellRenderKind
  renderer: GridColumnOptions<RecordType>['renderCellElement']
  reactRenderer: GridColumnOptions<RecordType>['renderCellReact']
  disposer: GridColumnOptions<RecordType>['disposeCellElement']
  listeners: Array<ListenerEntry>
}

interface PoolBucket<RecordType> {
  outer: Array<HTMLDivElement>
  inner: Array<HTMLElement>
  options: GridColumnOptions<RecordType> | undefined
}

interface RecyclingStore<RecordType> {
  active: Map<Identity, Map<Identity, ActiveCell<RecordType>>>
  pools: Map<Identity, PoolBucket<RecordType>>
  reactSlots: WeakMap<HTMLDivElement, ReactSlot<RecordType>>
  nextReactSlotId: number
}

function resolveColumnIdentity<RecordType>(
  column: EngineLeafColumn<RecordType>,
): Identity {
  return column.key || column
}

function resolveRowIdentity<RecordType>(
  record: RecordType,
  rowKey: string | ((record: RecordType) => string | number),
): Identity {
  if (typeof rowKey === 'function') return rowKey(record)
  const value = (record as Record<string, unknown> | null | undefined)?.[rowKey]
  return typeof value === 'string' || typeof value === 'number'
    ? value
    : (record as object)
}

function resolveDisplayRowKey<RecordType>(
  record: RecordType,
  rowKey: string | ((record: RecordType) => string | number),
): string | number | undefined {
  const identity = resolveRowIdentity(record, rowKey)
  return typeof identity === 'string' || typeof identity === 'number'
    ? identity
    : undefined
}

function sameOptions<RecordType>(
  a: GridColumnOptions<RecordType> | undefined,
  b: GridColumnOptions<RecordType> | undefined,
): boolean {
  return (
    a?.renderCellElement === b?.renderCellElement &&
    a?.renderCellReact === b?.renderCellReact &&
    a?.disposeCellElement === b?.disposeCellElement
  )
}

function cssValue(value: unknown): string {
  if (typeof value === 'number') return `${value}px`
  return String(value)
}

function applyStyle(
  element: HTMLElement,
  style: Record<string, unknown>,
): void {
  element.removeAttribute('style')
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null) continue
    if (key.startsWith('--')) {
      element.style.setProperty(key, cssValue(value))
    } else {
      const target = element.style as unknown as Record<string, string>
      target[key] = key === 'zIndex' ? String(value) : cssValue(value)
    }
  }
}

function clearListeners<RecordType>(cell: ActiveCell<RecordType>): void {
  for (const [type, listener] of cell.listeners) {
    cell.outer.removeEventListener(type, listener)
  }
  cell.listeners = []
}

function addListener<RecordType>(
  cell: ActiveCell<RecordType>,
  type: string,
  listener: EventListener,
): void {
  cell.outer.addEventListener(type, listener)
  cell.listeners.push([type, listener])
}

function reactEventToDomEvent(name: string): string | undefined {
  const map: Record<string, string> = {
    onClick: 'click',
    onDoubleClick: 'dblclick',
    onContextMenu: 'contextmenu',
    onMouseDown: 'mousedown',
    onMouseUp: 'mouseup',
    onMouseMove: 'mousemove',
    onPointerDown: 'pointerdown',
    onPointerUp: 'pointerup',
    onPointerMove: 'pointermove',
    onKeyDown: 'keydown',
    onKeyUp: 'keyup',
    onFocus: 'focus',
    onBlur: 'blur',
  }
  return map[name]
}

function detach(element: HTMLElement): void {
  if (element.parentNode) element.parentNode.removeChild(element)
}

function clearReactSlot<RecordType>(
  store: RecyclingStore<RecordType>,
  outer: HTMLDivElement,
): void {
  const slot = store.reactSlots.get(outer)
  if (!slot) return
  slot.root.unmount()
  store.reactSlots.delete(outer)
}

function makeOuterCell(): HTMLDivElement {
  const outer = document.createElement('div')
  const inner = document.createElement('div')
  inner.className = 'dg-cell-inner'
  outer.appendChild(inner)
  return outer
}

function getBucket<RecordType>(
  store: RecyclingStore<RecordType>,
  column: EngineLeafColumn<RecordType>,
): PoolBucket<RecordType> {
  const identity = resolveColumnIdentity(column)
  const options = column.gridColumnOptions
  const existing = store.pools.get(identity)
  if (existing) {
    if (!sameOptions(existing.options, options)) {
      clearBucket(store, existing, 'unmount')
      existing.options = options
    }
    return existing
  }
  const bucket: PoolBucket<RecordType> = {
    outer: [],
    inner: [],
    options,
  }
  store.pools.set(identity, bucket)
  return bucket
}

function clearBucket<RecordType>(
  store: RecyclingStore<RecordType>,
  bucket: PoolBucket<RecordType>,
  reason: DisposeCellElementReason,
): void {
  for (const inner of bucket.inner.splice(0)) {
    bucket.options?.disposeCellElement?.(inner, reason, undefined)
    detach(inner)
  }
  for (const outer of bucket.outer.splice(0)) {
    clearReactSlot(store, outer)
    detach(outer)
  }
}

function acquireOuter<RecordType>(
  store: RecyclingStore<RecordType>,
  column: EngineLeafColumn<RecordType>,
): HTMLDivElement {
  return getBucket(store, column).outer.pop() ?? makeOuterCell()
}

function acquireInner<RecordType>(
  store: RecyclingStore<RecordType>,
  column: EngineLeafColumn<RecordType>,
): HTMLElement | undefined {
  return getBucket(store, column).inner.pop()
}

function releaseCell<RecordType>(
  store: RecyclingStore<RecordType>,
  cell: ActiveCell<RecordType>,
  maxPoolSize: number,
): void {
  clearListeners(cell)
  detach(cell.outer)
  const bucket = getBucket(store, cell.column)
  if (cell.renderKind === 'react') {
    if (bucket.outer.length >= maxPoolSize) {
      clearReactSlot(store, cell.outer)
      detach(cell.outer)
    } else {
      bucket.outer.push(cell.outer)
    }
    return
  }
  if (cell.content) {
    cell.disposer?.(cell.content, 'recycle', cell.params)
    detach(cell.content)
    if (bucket.inner.length >= maxPoolSize) {
      cell.disposer?.(cell.content, 'discard', cell.params)
    } else {
      bucket.inner.push(cell.content)
    }
  }
  cell.content = undefined
  if (bucket.outer.length >= maxPoolSize) {
    detach(cell.outer)
  } else {
    bucket.outer.push(cell.outer)
  }
}

function unmountCell<RecordType>(
  store: RecyclingStore<RecordType>,
  cell: ActiveCell<RecordType>,
): void {
  clearListeners(cell)
  clearReactSlot(store, cell.outer)
  if (cell.content) {
    cell.disposer?.(cell.content, 'unmount', cell.params)
    detach(cell.content)
  }
  detach(cell.outer)
}

function removeActiveCell<RecordType>(
  store: RecyclingStore<RecordType>,
  cell: ActiveCell<RecordType>,
): void {
  const row = store.active.get(cell.rowIdentity)
  row?.delete(cell.columnIdentity)
  if (row && row.size === 0) store.active.delete(cell.rowIdentity)
}

function setActiveCell<RecordType>(
  store: RecyclingStore<RecordType>,
  cell: ActiveCell<RecordType>,
): void {
  let row = store.active.get(cell.rowIdentity)
  if (!row) {
    row = new Map()
    store.active.set(cell.rowIdentity, row)
  }
  row.set(cell.columnIdentity, cell)
}

function getActiveCell<RecordType>(
  store: RecyclingStore<RecordType>,
  rowIdentity: Identity,
  columnIdentity: Identity,
): ActiveCell<RecordType> | undefined {
  return store.active.get(rowIdentity)?.get(columnIdentity)
}

function paramsChanged<RecordType>(
  previous: ActiveCell<RecordType>,
  next: GridCellElementRenderParams<RecordType>,
  renderKind: CellRenderKind,
  renderer: GridColumnOptions<RecordType>['renderCellElement'],
  reactRenderer: GridColumnOptions<RecordType>['renderCellReact'],
  disposer: GridColumnOptions<RecordType>['disposeCellElement'],
): boolean {
  return (
    previous.renderKind !== renderKind ||
    previous.renderer !== renderer ||
    previous.reactRenderer !== reactRenderer ||
    previous.disposer !== disposer ||
    previous.params.value !== next.value ||
    previous.params.record !== next.record ||
    previous.params.rowIndex !== next.rowIndex ||
    previous.params.columnIndex !== next.columnIndex ||
    previous.params.columnKey !== next.columnKey ||
    previous.params.rowKey !== next.rowKey
  )
}

function patchOuter<RecordType>({
  cell,
  column,
  colIdx,
  record,
  index,
  rowLine,
  sticky,
  isHovered,
  isSortedColumn,
  rowKey,
  rowHoverable,
  onRow,
  rowClassName,
  isRowSelected,
  effectiveRowHeight,
  semanticBody,
  setHoveredRowIndex,
}: {
  cell: ActiveCell<RecordType>
  column: EngineLeafColumn<RecordType>
  colIdx: number
  record: RecordType
  index: number
  rowLine: number
  sticky: LeafStickyInfo | undefined
  isHovered: boolean
  isSortedColumn: boolean
  rowKey: string | ((record: RecordType) => string | number)
  rowHoverable: boolean
  onRow?: (record: RecordType, index: number) => React.HTMLAttributes<HTMLElement> | undefined
  rowClassName?: EngineTableProps<RecordType>['rowClassName']
  isRowSelected?: (record: RecordType) => boolean
  effectiveRowHeight?: (index: number) => number
  semanticBody?: EngineSemantic['body']
  setHoveredRowIndex: (index: number | null) => void
}): void {
  const bodyCellInjectedProps = resolveBodyCellInjectedProps({
    column,
    record,
    index,
    components: undefined,
    onRow,
    rowClassName,
    isRowSelected,
  })
  const hoverClass = resolveHoverClass(rowHoverable, isHovered)
  cell.outer.className = [
    'dg-cell',
    'dg-cell-body',
    column.rowScope === 'row' ? 'dg-cell-rowscope' : undefined,
    fixedClass(column.fixed),
    shadowClass(sticky),
    column.hidden ? 'dg-cell-hidden' : undefined,
    column.ellipsis === true ? 'dg-cell-ellipsis' : undefined,
    isSortedColumn ? 'dg-column-sort' : undefined,
    hoverClass,
    bodyCellInjectedProps.selectedClass,
    semanticBody?.className?.row,
    semanticBody?.className?.cell,
    bodyCellInjectedProps.mergedClassName,
  ]
    .filter(Boolean)
    .join(' ')
  cell.outer.dataset.align = column.align ?? ''
  cell.outer.dataset.rowIndex = String(index)
  cell.outer.dataset.columnKey = column.key
  if (colIdx === 0 && effectiveRowHeight) {
    cell.outer.dataset.knownSize = String(effectiveRowHeight(index))
  } else {
    delete cell.outer.dataset.knownSize
  }
  cell.outer.removeAttribute('aria-colspan')
  cell.outer.removeAttribute('aria-rowspan')

  applyStyle(cell.outer, {
    gridColumn: String(colIdx + 1),
    gridRow: String(rowLine),
    ...(column.align ? { textAlign: column.align } : null),
    ...stickyCellStyle(sticky),
    ...(semanticBody?.style?.row ?? null),
    ...(semanticBody?.style?.cell ?? null),
    ...bodyCellInjectedProps.mergedStyle,
  })

  cell.inner.className = 'dg-cell-inner'
  const title = resolveBodyCellEllipsisTitle(
    column.ellipsis,
    column.showTitle,
    getValueByDataIndex(record, column.dataIndex),
  )
  if (title === undefined) cell.inner.removeAttribute('title')
  else cell.inner.title = title

  clearListeners(cell)
  const rowEventProps = bodyCellInjectedProps.restRowProps
  addListener(cell, 'mouseenter', (event) => {
    if (rowHoverable) setHoveredRowIndex(index)
    const handler = rowEventProps.onMouseEnter
    if (typeof handler === 'function') handler(event)
  })
  addListener(cell, 'mouseleave', (event) => {
    if (rowHoverable) setHoveredRowIndex(null)
    const handler = rowEventProps.onMouseLeave
    if (typeof handler === 'function') handler(event)
  })
  for (const [name, handler] of Object.entries(rowEventProps)) {
    if (name === 'onMouseEnter' || name === 'onMouseLeave') continue
    if (typeof handler !== 'function') continue
    const eventName = reactEventToDomEvent(name)
    if (!eventName) continue
    addListener(cell, eventName, handler as EventListener)
  }

  void rowKey
}

function renderInner<RecordType>(
  store: RecyclingStore<RecordType>,
  cell: ActiveCell<RecordType>,
  nextParams: GridCellElementRenderParams<RecordType>,
): void {
  if (cell.renderKind === 'react') {
    renderReactSlot(store, cell, nextParams)
    return
  }
  clearReactSlot(store, cell.outer)
  const renderer = cell.renderer ?? defaultRenderCellElement
  const oldElement = cell.content ?? acquireInner(store, cell.column)
  const nextElement = renderer(nextParams, oldElement)

  if (cell.content && cell.content !== oldElement && cell.content !== nextElement) {
    cell.disposer?.(cell.content, 'replace', nextParams)
    detach(cell.content)
  }
  if (oldElement && oldElement !== nextElement) {
    cell.disposer?.(oldElement, 'replace', nextParams)
    detach(oldElement)
  }

  for (const child of Array.from(cell.inner.childNodes)) {
    if (child !== nextElement) cell.inner.removeChild(child)
  }
  if (nextElement.parentNode !== cell.inner) {
    if (nextElement.parentNode) nextElement.parentNode.removeChild(nextElement)
    cell.inner.appendChild(nextElement)
  }

  cell.content = nextElement
  cell.params = nextParams
}

function renderReactSlot<RecordType>(
  store: RecyclingStore<RecordType>,
  cell: ActiveCell<RecordType>,
  nextParams: GridCellElementRenderParams<RecordType>,
): void {
  if (!cell.reactRenderer) return
  if (cell.content) {
    cell.disposer?.(cell.content, 'replace', nextParams)
    detach(cell.content)
    cell.content = undefined
  }
  let slot = store.reactSlots.get(cell.outer)
  if (
    !slot ||
    slot.renderer !== cell.reactRenderer ||
    slot.columnIdentity !== cell.columnIdentity
  ) {
    clearReactSlot(store, cell.outer)
    slot = {
      key: `dg-react-slot-${store.nextReactSlotId}`,
      root: createRoot(cell.inner),
      columnIdentity: cell.columnIdentity,
      renderer: cell.reactRenderer,
    }
    store.nextReactSlotId += 1
    store.reactSlots.set(cell.outer, slot)
  }
  const element = cell.reactRenderer(nextParams, {
    key: slot.key,
    props: { className: 'dg-recycling-react-slot' },
  })
  slot.root.render(element)
  cell.params = nextParams
}

export function RecyclingBodyGrid<RecordType>({
  gridRef,
  leafColumns,
  dataSource,
  virtualState,
  rowLineBase,
  leafSticky,
  rowKey,
  hoveredRowIndex,
  setHoveredRowIndex,
  rowHoverable = true,
  onRow,
  rowClassName,
  isRowSelected,
  effectiveRowHeight,
  semanticBody,
}: {
  gridRef: React.RefObject<HTMLDivElement | null>
  leafColumns: Array<EngineLeafColumn<RecordType>>
  dataSource: Array<RecordType>
  virtualState: { start: number; end: number }
  rowLineBase: (index: number) => number
  leafSticky: Array<LeafStickyInfo | undefined>
  rowKey: string | ((record: RecordType) => string | number)
  hoveredRowIndex: number | null
  setHoveredRowIndex: (index: number | null) => void
  rowHoverable?: boolean
  onRow?: (record: RecordType, index: number) => React.HTMLAttributes<HTMLElement> | undefined
  rowClassName?: EngineTableProps<RecordType>['rowClassName']
  isRowSelected?: (record: RecordType) => boolean
  effectiveRowHeight?: (index: number) => number
  semanticBody?: EngineSemantic['body']
}) {
  const storeRef = useRef<RecyclingStore<RecordType>>({
    active: new Map(),
    pools: new Map(),
    reactSlots: new WeakMap(),
    nextReactSlotId: 0,
  })

  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const store = storeRef.current
    const maxPoolSize = Math.max(1, virtualState.end - virtualState.start + 16)
    const targets = new Map<Identity, Set<Identity>>()

    const liveColumns = new Map<Identity, GridColumnOptions<RecordType> | undefined>()
    for (const column of leafColumns) {
      liveColumns.set(resolveColumnIdentity(column), column.gridColumnOptions)
    }
    for (const [identity, bucket] of Array.from(store.pools)) {
      const options = liveColumns.get(identity)
      if (!liveColumns.has(identity) || !sameOptions(bucket.options, options)) {
        clearBucket(store, bucket, 'unmount')
        store.pools.delete(identity)
      }
    }

    for (const column of leafColumns) {
      const columnIdentity = resolveColumnIdentity(column)
      for (let index = virtualState.start; index < virtualState.end; index += 1) {
        const record = dataSource[index]
        if (record === undefined) continue
        const rowIdentity = resolveRowIdentity(record, rowKey)
        let row = targets.get(rowIdentity)
        if (!row) {
          row = new Set()
          targets.set(rowIdentity, row)
        }
        row.add(columnIdentity)
      }
    }

    for (const row of Array.from(store.active.values())) {
      for (const cell of Array.from(row.values())) {
        if (targets.get(cell.rowIdentity)?.has(cell.columnIdentity)) continue
        removeActiveCell(store, cell)
        releaseCell(store, cell, maxPoolSize)
      }
    }

    for (let colIdx = 0; colIdx < leafColumns.length; colIdx += 1) {
      const column = leafColumns[colIdx]
      const columnIdentity = resolveColumnIdentity(column)
      const renderer = column.gridColumnOptions?.renderCellElement
      const reactRenderer = column.gridColumnOptions?.renderCellReact
      const disposer = column.gridColumnOptions?.disposeCellElement
      const renderKind: CellRenderKind =
        renderer || !reactRenderer ? 'element' : 'react'
      const isSortedColumn =
        !!column.sorter && column.sortOrder !== null && column.sortOrder !== undefined

      for (let index = virtualState.start; index < virtualState.end; index += 1) {
        const record = dataSource[index]
        if (record === undefined) continue
        const rowIdentity = resolveRowIdentity(record, rowKey)
        const value = getValueByDataIndex(record, column.dataIndex)
        const params: GridCellElementRenderParams<RecordType> = {
          value,
          record,
          rowIndex: index,
          columnIndex: colIdx,
          columnKey: column.key,
          dataIndex: column.dataIndex,
          rowKey: resolveDisplayRowKey(record, rowKey),
        }
        let cell = getActiveCell(store, rowIdentity, columnIdentity)
        if (
          cell &&
          (
            cell.renderKind !== renderKind ||
            cell.renderer !== renderer ||
            cell.reactRenderer !== reactRenderer ||
            cell.disposer !== disposer
          )
        ) {
          removeActiveCell(store, cell)
          unmountCell(store, cell)
          cell = undefined
        }
        if (!cell) {
          const outer = acquireOuter(store, column)
          const inner = outer.firstElementChild instanceof HTMLDivElement
            ? outer.firstElementChild
            : document.createElement('div')
          if (inner.parentNode !== outer) outer.appendChild(inner)
          cell = {
            outer,
            inner,
            content: undefined,
            column,
            columnIdentity,
            rowIdentity,
            params,
            renderKind,
            renderer,
            reactRenderer,
            disposer,
            listeners: [],
          }
          setActiveCell(store, cell)
          grid.appendChild(outer)
          renderInner(store, cell, params)
        } else if (paramsChanged(cell, params, renderKind, renderer, reactRenderer, disposer)) {
          cell.column = column
          cell.params = params
          cell.renderKind = renderKind
          cell.renderer = renderer
          cell.reactRenderer = reactRenderer
          cell.disposer = disposer
          renderInner(store, cell, params)
        } else {
          cell.column = column
        }

        patchOuter({
          cell,
          column,
          colIdx,
          record,
          index,
          rowLine: rowLineBase(index),
          sticky: leafSticky[colIdx],
          isHovered: isRowSpanHovered(index, 1, hoveredRowIndex),
          isSortedColumn,
          rowKey,
          rowHoverable,
          onRow,
          rowClassName,
          isRowSelected,
          effectiveRowHeight,
          semanticBody,
          setHoveredRowIndex,
        })
        if (cell.outer.parentNode !== grid) grid.appendChild(cell.outer)
      }
    }
  }, [
    dataSource,
    effectiveRowHeight,
    gridRef,
    hoveredRowIndex,
    isRowSelected,
    leafColumns,
    leafSticky,
    onRow,
    rowClassName,
    rowHoverable,
    rowKey,
    rowLineBase,
    semanticBody,
    setHoveredRowIndex,
    virtualState,
  ])

  useLayoutEffect(() => () => {
    const store = storeRef.current
    for (const row of Array.from(store.active.values())) {
      for (const cell of Array.from(row.values())) unmountCell(store, cell)
    }
    store.active.clear()
    for (const bucket of store.pools.values()) clearBucket(store, bucket, 'unmount')
    store.pools.clear()
  }, [])

  return null
}
