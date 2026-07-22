import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  inner: HTMLDivElement
  params: GridCellElementRenderParams<RecordType>
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
  /**
   * 监听器稳定化：监听器在 cell 创建时一次性绑定（setupListeners），handler 闭包稳定捕获 cell，
   * 触发时读 cell 的最新可变字段——避免每帧 clearListeners + addEventListener 重新创建上千个闭包。
   * patchOuter 每帧只做这三个字段的引用赋值。
   */
  rowHoverable: boolean
  setHoveredRowIndex: (index: number | null) => void
  rowEventProps: React.HTMLAttributes<HTMLElement> | undefined
  /**
   * 上一帧实际写入 DOM 的 inline style 快照（rendered 值，已过 cssValue/zIndex 规则）。
   * 用于增量 diff：仅当 desired[key] !== appliedStyle[key] 才写，
   * 仅当上一帧有但本帧 desired 没有的键才清除。undefined 表示尚未应用过（首帧全量写）。
   */
  appliedStyle: Record<string, string> | undefined
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
  reactSlotList: Map<string, ReactSlot<RecordType>>
  nextReactSlotId: number
  portalDirty: boolean
  lastOrderKey: string
}

const ReactSlotPortal = memo(function ReactSlotPortal({
  slot,
}: {
  slot: ReactSlot<any>
}) {
  const element = slot.renderer?.(slot.params, { key: slot.key }) ?? null
  return createPortal(element, slot.inner, slot.key)
})

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

/**
 * 增量 diff 应用 inline style：仅写与上一帧快照不同的键，仅清上一帧有但本帧 desired 没有的键。
 * 不再 removeAttribute('style') 全量重写——滚动期 ~510 cell × 每帧全量重算 inline style 是主线程热点。
 *
 * rendered 规则与原实现逐字节等价：
 *   - null/undefined 跳过（不入 next；若 previous 有该键则会被清除分支清掉）
 *   - zIndex 用 String(value)（不加 px）
 *   - 其余（含 `--` 开头 custom property）用 cssValue(value)（number→px，else String）
 * 写入分派：camelCase → style[key]=rendered；`--` 开头 → setProperty(key, rendered)。
 * 清除分派：camelCase → =''；`--` 开头 → removeProperty(key)。
 */
function applyStyle<RecordType>(
  cell: ActiveCell<RecordType>,
  style: Record<string, unknown>,
): void {
  const element = cell.outer
  const previous = cell.appliedStyle
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null) continue
    const rendered = key === 'zIndex' ? String(value) : cssValue(value)
    next[key] = rendered
    if (rendered !== previous?.[key]) {
      if (key.startsWith('--')) {
        element.style.setProperty(key, rendered)
      } else {
        const target = element.style as unknown as Record<string, string>
        target[key] = rendered
      }
    }
  }
  if (previous) {
    for (const key of Object.keys(previous)) {
      if (!(key in next)) {
        if (key.startsWith('--')) {
          element.style.removeProperty(key)
        } else {
          const target = element.style as unknown as Record<string, string>
          target[key] = ''
        }
      }
    }
  }
  cell.appliedStyle = next
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

const REACT_TO_DOM_EVENTS: Record<string, string> = {
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

/**
 * 在 cell 创建时一次性绑定全部监听器。handler 闭包稳定捕获 cell 对象本身，
 * 触发时读 cell 的可变字段（rowHoverable / setHoveredRowIndex / rowEventProps）+ dataset.rowIndex，
 * 因此跨帧无需 clear/add——消除每帧上千次 add/removeEventListener + 上千个新闭包（GC 主因）。
 *
 * cell 对象在 active 期间跨帧稳定（getActiveCell 复用同一对象），patchOuter 每帧只更新引用字段。
 * releaseCell / unmountCell 仍调 clearListeners 清理，无泄漏。
 *
 * 行号从 cell.outer.dataset.rowIndex 现读（patchOuter 每帧 `cell.outer.dataset.rowIndex = String(index)` 写入），
 * 保证 rowHoverable 切换目标总是当前行。
 *
 * handler.call(cell.outer, event) 显式保持原 `addListener(..., handler as EventListener)` 的 this 绑定
 * （addEventListener 默认 this = 当前元素）。
 *
 * 注意：mouseenter / mouseleave 在原 patchOuter 里是无条件绑定（不走 rowEventProps 是否存在的检查），
 * 这里保持同样语义——hoverable 逻辑恒走，handler 在 rowEventProps 有对应字段时才透传。
 */
function setupListeners<RecordType>(cell: ActiveCell<RecordType>): void {
  addListener(cell, 'mouseenter', (event) => {
    if (cell.rowHoverable) {
      const raw = cell.outer.dataset.rowIndex
      const idx = raw === undefined ? NaN : Number(raw)
      cell.setHoveredRowIndex(Number.isNaN(idx) ? null : idx)
    }
    const handler = cell.rowEventProps?.onMouseEnter
    if (typeof handler === 'function') (handler as unknown as EventListener).call(cell.outer, event)
  })
  addListener(cell, 'mouseleave', (event) => {
    if (cell.rowHoverable) {
      cell.setHoveredRowIndex(null)
    }
    const handler = cell.rowEventProps?.onMouseLeave
    if (typeof handler === 'function') (handler as unknown as EventListener).call(cell.outer, event)
  })
  for (const [name, domName] of Object.entries(REACT_TO_DOM_EVENTS)) {
    addListener(cell, domName, (event) => {
      const handler = cell.rowEventProps?.[name as keyof React.HTMLAttributes<HTMLElement>]
      if (typeof handler === 'function') {
        (handler as EventListener).call(cell.outer, event)
      }
    })
  }
}

function detach(element: HTMLElement): void {
  if (element.parentNode) element.parentNode.removeChild(element)
}

function clearReactSlot<RecordType>(
  store: RecyclingStore<RecordType>,
  outer: HTMLDivElement,
  replaceContainer = false,
): HTMLDivElement | undefined {
  const slot = store.reactSlots.get(outer)
  if (!slot) return undefined
  let nextInner: HTMLDivElement | undefined
  if (replaceContainer) {
    nextInner = document.createElement('div')
    nextInner.className = 'dg-cell-inner'
    if (slot.inner.parentNode === outer) {
      outer.replaceChild(nextInner, slot.inner)
    } else {
      outer.appendChild(nextInner)
    }
  }
  store.reactSlotList.delete(slot.key)
  store.reactSlots.delete(outer)
  store.portalDirty = true
  return nextInner
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
  cell.inner = clearReactSlot(store, cell.outer, true) ?? cell.inner
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

function syncBodyDomOrder(
  grid: HTMLDivElement,
  desiredOrder: Array<HTMLDivElement>,
): void {
  if (desiredOrder.length <= 1) return
  const desiredSet = new Set<Node>(desiredOrder)
  let cursor: Node | null = null
  for (const child of Array.from(grid.childNodes)) {
    if (desiredSet.has(child)) {
      cursor = child
      break
    }
  }
  for (const node of desiredOrder) {
    if (node !== cursor) {
      grid.insertBefore(node, cursor)
    }
    cursor = node.nextSibling
  }
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
    'ant-table-cell',
    'dg-cell-body',
    column.rowScope === 'row' ? 'dg-cell-rowscope' : undefined,
    fixedClass(column.fixed),
    shadowClass(sticky),
    column.hidden ? 'dg-cell-hidden' : undefined,
    column.ellipsis === true ? 'dg-cell-ellipsis' : undefined,
    isSortedColumn ? 'dg-column-sort ant-table-column-sort' : undefined,
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

  applyStyle(cell, {
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

  // 监听器稳定化：不再每帧 clearListeners + addListener 重绑。
  // 监听器在 cell 创建时（setupListeners）一次性绑定，handler 闭包捕获 cell 本身，
  // 触发时读 cell 上的可变字段——这里每帧只做引用赋值。
  // 行号在 handler 触发时从 cell.outer.dataset.rowIndex 现读（上面 `cell.outer.dataset.rowIndex = String(index)` 处已写入）。
  cell.rowHoverable = rowHoverable
  cell.setHoveredRowIndex = setHoveredRowIndex
  cell.rowEventProps = bodyCellInjectedProps.restRowProps

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
    if (slot) clearReactSlot(store, cell.outer)
    slot = {
      key: `dg-react-slot-${store.nextReactSlotId}`,
      inner: cell.inner,
      params: nextParams,
      columnIdentity: cell.columnIdentity,
      renderer: cell.reactRenderer,
    }
    store.nextReactSlotId += 1
    store.reactSlots.set(cell.outer, slot)
    store.reactSlotList.set(slot.key, slot)
    store.portalDirty = true
  }
  if (slot.params !== nextParams || slot.inner !== cell.inner) {
    slot = {
      ...slot,
      params: nextParams,
      inner: cell.inner,
    }
    store.reactSlots.set(cell.outer, slot)
    store.reactSlotList.set(slot.key, slot)
    store.portalDirty = true
  }
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
    reactSlotList: new Map(),
    nextReactSlotId: 0,
    portalDirty: false,
    lastOrderKey: '',
  })
  const [portalVersion, setPortalVersion] = useState(0)

  useLayoutEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const store = storeRef.current
    const maxPoolSize = Math.max(1, virtualState.end - virtualState.start + 16)
    const targets = new Map<Identity, Set<Identity>>()
    const desiredOrder: Array<HTMLDivElement> = []
    const orderParts: Array<string> = [
      String(virtualState.start),
      String(virtualState.end),
      leafColumns.map((column) => String(resolveColumnIdentity(column))).join(','),
    ]
    let orderDirty = false

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

    for (let index = virtualState.start; index < virtualState.end; index += 1) {
      const record = dataSource[index]
      orderParts.push(`${index}:${String(record === undefined ? '' : resolveRowIdentity(record, rowKey))}`)
      for (const column of leafColumns) {
        const columnIdentity = resolveColumnIdentity(column)
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

    for (let index = virtualState.start; index < virtualState.end; index += 1) {
      const record = dataSource[index]
      if (record === undefined) continue
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
          orderDirty = true
        }
        if (!cell) {
          const outer = acquireOuter(store, column)
          // 池化 outer 可能带上一辈子遗留的 stale inline style；增量 diff 不会清"desired 里没有
          // 但 DOM 上有"的键，所以 acquire 后一次性清空 style，配合 appliedStyle=undefined 让首帧
          // 从干净态全量写入。对 makeOuterCell() 全新元素无害（本来就没有 inline style）。
          outer.removeAttribute('style')
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
            appliedStyle: undefined,
            // 监听器稳定化：handler 闭包捕获 cell，触发时读这些字段。
            // 这里初始化为安全默认值，紧随其后的 patchOuter 会写入真实值；
            // setupListeners 一次性绑定全部监听器（监听器触发前 patchOuter 必已执行过首帧）。
            rowHoverable: false,
            setHoveredRowIndex: () => {},
            rowEventProps: undefined,
          }
          setActiveCell(store, cell)
          setupListeners(cell)
          grid.appendChild(outer)
          renderInner(store, cell, params)
          orderDirty = true
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
        if (cell.outer.parentNode !== grid) {
          grid.appendChild(cell.outer)
          orderDirty = true
        }
        desiredOrder.push(cell.outer)
      }
    }
    const orderKey = orderParts.join('|')
    if (orderDirty || store.lastOrderKey !== orderKey) {
      syncBodyDomOrder(grid, desiredOrder)
      store.lastOrderKey = orderKey
    }
    if (store.portalDirty) {
      store.portalDirty = false
      setPortalVersion((current) => current + 1)
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
    store.reactSlotList.clear()
  }, [])

  const portals = useMemo(() => {
    const store = storeRef.current
    return Array.from(store.reactSlotList.values()).map((slot) => (
      <ReactSlotPortal key={slot.key} slot={slot} />
    ))
  }, [portalVersion])

  return <>{portals}</>
}
