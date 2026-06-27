/**
 * 行拖拽排序 hook（S17 行拖拽排序）。
 *
 * === ★ 方案选择：自研 pointer 行拖拽（方案 B）===
 *
 * task-plan §4.7 S17 原指定依赖 `@dnd-kit/*`（方案 A：行容器 div + DndContext + useSortable）。
 * 但 data-grid 用 **CSS Grid 渲染**，"行"不是 DOM 元素——单元格直接是 grid item，
 * `grid-column`/`grid-row` 显式定位（multi 路径）或 `grid-auto-flow:column`（flat 路径）。
 *
 * 方案 A（dnd-kit + 行容器 div）会严重破坏现有布局：
 *   - dnd-kit 的 `useSortable` 需要"行 DOM"挂 `setNodeRef`/`transform`/`listeners`。
 *   - 引入"行容器 div"（`grid-column:1/-1` + 内部 subgrid）会切断 M2 固定列（单元格自身 sticky，
 *     行容器会阻断 sticky 祖先链）、M3 合并（grid-row span 在行容器内失效）、M4 虚拟（行 track 按行算，
 *     行容器破坏 track 布局）、M9 展开（展开 track grid-column:1/-1 与行容器冲突）。
 *   - S15 已踩过"行容器破坏 grid 定位"的坑（故 EditableRow 用 `Form component={false}` +
 *     Context.Provider **不产生 DOM**，让单元格穿透为 grid 直接子元素）。
 *   - CSS `subgrid` 浏览器支持有限（Chrome 117+/Safari 16+），且与上述能力组合仍冲突。
 *
 * 决策 6 允许：dnd-kit 属表格核心交互，可自研。M7 `useColumnResize` 已验证 data-grid 风格的
 * pointer 拖拽自研模式成熟（setPointerCapture + 原生 move/up + state 驱动重渲染）。
 *
 * 故 S17 采用**方案 B（自研 pointer 行拖拽）**，不引入 @dnd-kit/*。
 *
 * === 核心机制（方案 B）===
 *
 * 采用**事件委托**：调用方在外层容器上挂 `containerProps.onPointerDown`，hook 内部判定
 * `target.closest('[data-row-index]')` 是否命中 body 单元格（data-grid 引擎给每个 body 单元格
 * 打 `data-row-index="<行号>"`，见 GridTable BodyCell / ColumnCells）。命中则启动拖拽。
 * 这样**无需修改引擎渲染层**、**无需 components 机制**、**无需 onCell 透传**——
 * body 单元格的 `data-row-index` 属性已足够定位行。
 *
 * 1. **拖拽手势**（事件委托）：
 *    - pointerdown 落在 `[data-row-index]` body 单元格内 → 解析 row-index → 启动拖拽。
 *    - 仅左键（button===0）启动。
 *    - preventDefault + stopPropagation（避免触发文本选区/单元格其它交互）。
 *    - `target.setPointerCapture(pointerId)`：锁定后续 pointermove/up 到该单元格元素，即使指针
 *      移出单元格/窗口也不丢事件（无抖动/不丢失，与 M7 同款）。
 *    - 记录起始态：dragging index、起始 clientY、pointerId。
 *
 * 2. **行 hit-test（实时算 over index）**：
 *    行高在 data-grid 下是 `auto`（按内容撑开，非固定值），故不能假设固定行高。
 *    hit-test 实时读 DOM：容器内所有 `[data-row-index]` body 单元格按 row-index 分组，
 *    取每行的 `getBoundingClientRect()`（top/bottom），pointermove 时找 pointer Y 落在哪两行之间
 *    （或在首行之上/末行之下）→ 算出 over index（插入位置）。
 *    每帧只读一次 DOM（O(rows)，对典型表格 <1ms）。
 *
 * 3. **拖拽指示线**：返回 `indicator`（绝对定位 div 的 top/left/right/height），调用方在
 *    **外层相对定位容器**内渲染一条蓝色横线，指示"松手后该行会插入的位置"。
 *    指示线是外层容器的子元素，**不是 grid item**，不影响 grid-template-rows 计算（零回归）。
 *
 * 4. **pointerup**：释放 pointer capture，清拖拽态。若 over index 与 dragging index 不同 →
 *    调用 `onSort(arrayMove(dataSource, from, to))`，调用方据此 setState 重排 dataSource。
 *    arrayMove 算法对齐 @dnd-kit/sortable（from → to：先删 from 再插 to）。
 *
 * === S18 拖拽手柄排序（drag-sorting-handler）===
 *
 * S18 复用本 hook，新增 `handleSelector` option 限定**仅手柄列触发**拖拽（区别 S17 任意 body
 * 单元格触发）。pointerdown 命中判定：
 *   - 有 `handleSelector` → 仅当 `target.closest(handleSelector)` 命中手柄元素（且仍在某行
 *     `[data-row-index]` body 单元格内）才启动拖拽；点 Name/Age/Address 等非手柄列不启动。
 *   - 无 `handleSelector`（S17）→ 任意 body 单元格触发（S17 零回归）。
 * 其余拖拽逻辑（setPointerCapture + hit-test + 指示线 + arrayMove）完全复用。
 *
 * === 与 antd drag-sorting demo 的差异 ===
 *
 * - antd 用 `<tr>` + dnd-kit `useSortable`（transform 跟随指针平移整行）。
 * - data-grid 不平移整行（行是 grid item 集，平移会破坏布局），改为**指示线**提示插入位置 +
 *   松手后重排 dataSource（行瞬间到新位置）。视觉与 antd 略异（antd 拖拽中行跟随指针；
 *   data-grid 拖拽中显示指示线），但功能等价（行重排），且不破坏 CSS Grid 布局。
 * - antd Row 挂 listeners 在整 `<tr>`（drag-sorting）或手柄 setActivatorNodeRef
 *   （drag-sorting-handler）；data-grid 拖拽手势通过事件委托——S17 命中任意 body 单元格
 *   （整行均可拖），S18 通过 `handleSelector` 限定命中手柄列（DragHandle 加 `.dg-drag-handle`
 *   class，pointerdown 命中该 class 才启动）。
 *
 * === 回归保证 ===
 *
 * - 本 hook **不修改引擎渲染层**（GridTable/columnTree/types 零改动）。
 * - 非拖拽 demo（basic/head/virtual-list/树形/编辑等）不调用本 hook → 完全不受影响。
 * - 仅依赖引擎给 body 单元格打的 `data-row-index` 属性（M0 起就有，所有路径稳定存在）。
 *
 * === 与各能力的组合 ===
 *
 * - M2 固定列：拖拽手势命中固定列或普通列 body 单元格均可（单元格仍是 grid item，pointer 事件正常）；
 *   指示线跨整行（left:0/right:0 相对外层容器，固定列 sticky 不影响指示线层）。
 * - M3 合并：合并行 hit-test 仍按 row-index 单元格算（合并格覆盖的行无独立单元格，跳过）。
 * - M4 虚拟：虚拟下只渲染可视区行，hit-test 仅遍历可视区单元格；拖拽出可视区需滚动配合（本任务不实现，
 *   antd drag-sorting demo 也无虚拟场景）。
 * - M9 展开 / S13 树形：展开/树形行重排语义复杂（子树跟随？），本任务不覆盖；demo 用普通扁平数据。
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutoScrollOnDrag } from './useAutoScrollOnDrag'

/** arrayMove：把数组 from 位置的元素移到 to 位置（对齐 @dnd-kit/sortable）。 */
export function arrayMove<T>(arr: Array<T>, from: number, to: number): Array<T> {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) {
    return arr
  }
  const next = arr.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/**
 * ★ T11：把一组（连续的）选中行作为一块移到目标位置（multi-row block move）。
 *
 * 参数：
 *   - `arr`：原数组。
 *   - `blockIdxs`：成块移动的行在原数组中的 index 列表（**已按升序排序**，且这些 index 在原数组中
 *     对应的行就是选中行；保持它们之间的相对顺序——切片后整块平移）。
 *   - `toIndex`：目标插入位置（**在原数组坐标系中**，0..arr.length）。
 *
 * 算法：先把 block 行按原顺序抽出来（剩余行自动收拢），再把整块插到目标位置（位置以"剔除 block 后
 * 的剩余数组"坐标修正：to 减去其左侧已被抽走的 block 行数）。
 *
 * 边界：
 *   - 目标落在 block 内部（toIndex 介于 block 首末 index 之间）→ 返回原数组（no-op）。
 *   - blockIdxs 为空 / 单元素 → 调用方应已退化为单行 arrayMove，这里防御性返回原数组。
 */
export function arrayMoveBlock<T>(
  arr: Array<T>,
  blockIdxs: number[],
  toIndex: number,
): Array<T> {
  if (blockIdxs.length === 0) return arr
  if (blockIdxs.length === 1) {
    // 单行退化为 arrayMove（保持 from→to 语义一致）。
    return arrayMove(arr, blockIdxs[0], toIndex)
  }
  // block 首末 index（已升序）。
  const blockFirst = blockIdxs[0]
  const blockLast = blockIdxs[blockIdxs.length - 1]
  // 目标落在 block 内部 → no-op（含 toIndex 恰好等于 blockFirst / blockLast+1 的边界，
  // 这些等价于"原地不动"或"贴着 block 边缘"——保守判 no-op 避免无意义重排）。
  if (toIndex >= blockFirst && toIndex <= blockLast + 1) return arr

  // 抽出 block 行（保持相对顺序）。
  const blockRows = blockIdxs.map((i) => arr[i])
  // 剩余行（剔除 block）。
  const restRows = arr.filter((_, i) => !blockIdxs.includes(i))
  // 把 toIndex 修正到 restRows 坐标系：减去其左侧的 block 行数。
  let toInRest = toIndex
  for (let i = 0; i < blockIdxs.length; i += 1) {
    if (blockIdxs[i] < toIndex) toInRest -= 1
  }
  // 钳制到 [0, restRows.length]（防御性）。
  if (toInRest < 0) toInRest = 0
  if (toInRest > restRows.length) toInRest = restRows.length
  // 把整块插入 restRows 的 toInRest 位置。
  const next = restRows.slice()
  next.splice(toInRest, 0, ...blockRows)
  return next
}

/**
 * ★ T11：解析单条 record 的 rowKey（支持 string 属性名 / 函数两种形式）。
 *
 * 返回 undefined 表示无法解析（防御性，调用方按"未选中"处理）。
 * 对齐 Table.tsx 内部 getRowKey 的语义（rowKey 为字符串时按属性路径取值，函数时直接调用）。
 */
function resolveRowKey<RecordType>(
  rowKey: string | ((record: RecordType) => string | number),
  record: RecordType,
  index: number,
): React.Key | undefined {
  try {
    if (typeof rowKey === 'function') {
      const k = rowKey(record)
      return k as React.Key
    }
    // 字符串属性名：直接取该字段（与 antd rowKey='key' 同款）。
    const v = (record as unknown as Record<string, unknown>)[rowKey]
    if (v === undefined || v === null) return index as React.Key // 兜底用 index（防 record 无 key 字段）
    return v as React.Key
  } catch {
    return undefined
  }
}

/**
 * ★ T11：判断两个 rowKey 是否相等（兼容 string / number 混用，按 String() 归一比较）。
 *
 * antd selectedRowKeys 可能是 (string|number)[]，record.key 也可能 string/number，
 * 用 String() 归一避免 `'1' === 1` 误判为不等。
 */
function sameRowKey(a: React.Key, b: React.Key): boolean {
  return String(a) === String(b)
}

/** 指示线样式（调用方在外层相对定位容器内渲染一条绝对定位横线）。 */
export interface DragIndicatorStyle {
  /** 是否显示指示线（拖拽中为 true）。 */
  visible: boolean
  /** 指示线 top（px，相对外层容器）。 */
  top: number
  /** 指示线 left（px，相对外层容器；默认 0 跨整行）。 */
  left: number
  /** 指示线 right（px，相对外层容器；默认 0 跨整行）。 */
  right: number
}

/** useRowDragSort 配置。 */
export interface UseRowDragSortOptions<RecordType> {
  /** 数据源（用于 arrayMove 重排 + 行数判定）。 */
  dataSource: Array<RecordType>
  /** rowKey 取值器（字符串属性名或函数）。保留接口位（当前实现仅按 row-index 算，未直接消费）。 */
  rowKey: string | ((record: RecordType) => string | number)
  /**
   * 行重排回调（松手且 over≠dragging 时触发）。
   * 参数：重排后的新 dataSource 数组（调用方据此 setState）。
   */
  onSort: (nextDataSource: Array<RecordType>) => void
  /**
   * 外层容器 ref（相对定位，包 Table；指示线作为其子元素绝对定位）。
   * hit-test 时遍历容器内 `[data-row-index]` 单元格算行边界。
   * 调用方需把此 ref 挂到 Table 外层的相对定位 div。
   */
  containerRef: React.RefObject<HTMLElement | null>
  /**
   * **S18 手柄列限定**：CSS 选择器（如 `.dg-drag-handle`）。
   *
   * - 传入 → pointerdown 仅当 `target.closest(handleSelector)` 命中手柄元素（且在 body 单元格内）
   *   才启动拖拽（仅手柄列触发，Name/Age/Address 等非手柄列不启动）。
   * - 不传（S17）→ 任意 body 单元格触发拖拽（整行均可拖，零回归）。
   *
   * demo 用法（S18 拖拽手柄）：
   * ```tsx
   * useRowDragSort({ dataSource, rowKey:'key', onSort, containerRef, handleSelector: '.dg-drag-handle' })
   * ```
   * 手柄列 render 的 DragHandle 元素需带匹配 class（如 `<Button className="dg-drag-handle">`）。
   */
  handleSelector?: string
  /**
   * ★ T9：拖拽到容器边缘时是否自动滚动容器（虚拟列表下尤其关键）。
   *
   * - `true`（默认）：拖拽近边缘触发纵向自动滚动（滚动容器 `.dg-scroll`，渐进加速）。
   *   配合虚拟引擎：scrollBy → scroll 事件 → useVirtualList 重算已渲染行 → hit-test 自动跟随。
   * - `false`：禁用（拖出可视区不滚动，保持拖拽 demo 改造前行为）。
   *
   * 通常由 demo 从 `gridOptions.autoScrollOnDrag`（默认 true）透传进来。
   * 实现见 `useAutoScrollOnDrag`（边缘检测 RAF + scrollBy）。
   */
  autoScroll?: boolean
  /**
   * ★ T11：多行成块重排开关（对齐 `gridOptions.multiRowReorder`，默认 true）。
   *
   * - `true` / undefined：当被拖行属于多选 selection（`selectedRowKeys` 含 ≥2 个且包含被拖行）时，
   *   把所有选中行作为**一块**移到目标位置（保持选中行间相对顺序），而非只移被拖行。
   * - `false`：始终只移被拖行（单行重排，与 S17/S18 行为一致）。
   *
   * 边界：被拖行未选中 → 只移它（现状）；selection 含被拖行+其它 → 成块移；
   * 目标落在选中块内部 → no-op。单选 / 无 selection 时零回归（selection 数 ≤1 退化为单行重排）。
   */
  multiRowReorder?: boolean
  /**
   * ★ T11：当前选中行的 rowKey 列表（来自 `rowSelection.selectedRowKeys`）。
   *
   * 成块重排（`multiRowReorder=true`）时用于判定"被拖行是否属于多选 selection"以及
   * "成块移动哪些行"。未传 / 空数组 → 始终走单行重排路径（零回归）。
   */
  selectedRowKeys?: Array<React.Key>
}

export interface UseRowDragSortResult {
  /** 当前拖拽中状态（null = 未拖拽）。overIndex 为"目标行 index"（松手后 arrayMove 的 to）。 */
  dragState: { fromIndex: number; overIndex: number } | null
  /** 指示线样式（调用方渲染绝对定位横线）。 */
  indicator: DragIndicatorStyle
  /**
   * 外层容器事件 props（事件委托）。调用方挂到包 Table 的外层 div：
   * `<div ref={containerRef} {...containerProps}>`。
   * 内部 onPointerDown 判定 target 是否命中 `[data-row-index]` body 单元格，命中则启动拖拽。
   */
  containerProps: {
    onPointerDown: (e: React.PointerEvent) => void
  }
}

/**
 * 行拖拽排序 hook（方案 B 自研 pointer，事件委托）。
 *
 * 用法（demo）：
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null)
 * const { dragState, indicator, containerProps } = useRowDragSort({
 *   dataSource, rowKey: 'key', onSort: setDataSource, containerRef,
 * })
 * <div ref={containerRef} style={{ position: 'relative' }} {...containerProps}>
 *   <Table ... />
 *   {indicator.visible && <div style={{ position:'absolute', top:indicator.top, left:0, right:0, height:2, background:'#1677ff' }} />}
 * </div>
 * ```
 */
export function useRowDragSort<RecordType>(
  options: UseRowDragSortOptions<RecordType>,
): UseRowDragSortResult {
  const { dataSource, onSort, containerRef, handleSelector, rowKey } = options
  // ★ T9：autoScrollOnDrag 默认 true（对齐 gridOptions.autoScrollOnDrag 默认 + ag-grid 默认行为）。
  const autoScrollEnabled = options.autoScroll ?? true
  // ★ T11：multiRowReorder 默认 true（对齐 gridOptions.multiRowReorder 默认）。
  const multiRowReorderEnabled = options.multiRowReorder ?? true
  // ★ T11：当前选中行 rowKeys（来自 rowSelection.selectedRowKeys；未传=无 selection → 退化为单行重排）。
  const selectedRowKeys = options.selectedRowKeys

  // T9：拖拽中自动滚动容器（边缘检测 RAF + scrollBy）。
  const { pointerRef: autoScrollPointerRef, start: startAutoScroll, stop: stopAutoScroll } =
    useAutoScrollOnDrag({ containerRef, vertical: true, autoScroll: autoScrollEnabled })

  const [dragState, setDragState] = useState<{
    fromIndex: number
    overIndex: number
  } | null>(null)
  const [indicator, setIndicator] = useState<DragIndicatorStyle>({
    visible: false,
    top: 0,
    left: 0,
    right: 0,
  })

  // 拖拽过程中跨事件保留的临时状态（不直接驱动渲染，放 ref；驱动渲染用 dragState/indicator state）。
  const dragRef = useRef<{
    fromIndex: number
    startClientY: number
    pointerId: number
    el: HTMLElement
  } | null>(null)

  /**
   * hit-test：根据 pointer Y 算出"插入位置"（over index）。
   *
   * 遍历容器内所有 `[data-row-index]` body 单元格，按 row-index 分组取每行的 top/bottom
   * （用首列单元格的 getBoundingClientRect）。pointer Y 落在某行的"上半部分" → over = 该行 index
   * （插入到该行之前）；"下半部分" → over = 该行 index + 1（插入到该行之后）。
   *
   * 返回 { overIndex, indicatorTop }：overIndex 为插入位置（0..dataSource.length）；
   * indicatorTop 为指示线 top（相对容器，px）。
   */
  const hitTest = useCallback(
    (clientY: number): {
      overIndex: number
      indicatorTop: number
    } | null => {
      const container = containerRef.current
      if (!container) return null
      const containerRect = container.getBoundingClientRect()
      // 收集所有 body 单元格，按 row-index 分组（同一行的多个单元格共享一个 row-index）。
      const cells = container.querySelectorAll<HTMLElement>('[data-row-index]')
      if (cells.length === 0) return null
      // row-index → 该行任意一个单元格的 top/bottom（取首个遇到的即可，同行单元格 top 一致）。
      const rowBounds = new Map<number, { top: number; bottom: number }>()
      cells.forEach((cell) => {
        const idxAttr = cell.getAttribute('data-row-index')
        if (idxAttr === null) return
        const idx = Number.parseInt(idxAttr, 10)
        if (!Number.isFinite(idx)) return
        if (rowBounds.has(idx)) return
        const r = cell.getBoundingClientRect()
        rowBounds.set(idx, { top: r.top, bottom: r.bottom })
      })
      if (rowBounds.size === 0) return null
      // 排序后的行 index 列表（升序）。
      const sortedIndices = Array.from(rowBounds.keys()).sort((a, b) => a - b)
      for (let i = 0; i < sortedIndices.length; i += 1) {
        const rowIdx = sortedIndices[i]
        const bound = rowBounds.get(rowIdx)!
        const mid = (bound.top + bound.bottom) / 2
        if (clientY < mid) {
          // 落在该行上半 → 插入到该行之前（over = rowIdx）。
          // 指示线 top = 该行 top（相对容器）。
          return {
            overIndex: rowIdx,
            indicatorTop: bound.top - containerRect.top,
          }
        }
      }
      // 落在所有行之下 → 插入到末尾之后。
      const lastIdx = sortedIndices[sortedIndices.length - 1]
      const lastBound = rowBounds.get(lastIdx)!
      return {
        overIndex: lastIdx + 1,
        indicatorTop: lastBound.bottom - containerRect.top,
      }
    },
    [containerRef],
  )

  /** 外层容器 pointerdown（事件委托）：命中 body 单元格则启动拖拽。 */
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // 仅主键（左键）启动拖拽。
      if (e.button !== 0) return
      const target = e.target as HTMLElement | null
      // S18 手柄列限定：传 handleSelector 时，仅当 target 命中手柄元素才启动（否则继续走 S17 任意单元格路径）。
      if (handleSelector && !target?.closest?.(handleSelector)) return
      // 命中判定：target 最近祖先含 [data-row-index] 的 body 单元格。
      const cell = target?.closest<HTMLElement>('[data-row-index]') ?? null
      if (!cell) return
      const idxAttr = cell.getAttribute('data-row-index')
      if (idxAttr === null) return
      const index = Number.parseInt(idxAttr, 10)
      if (!Number.isFinite(index)) return

      const el = cell
      const pointerId = e.pointerId
      e.preventDefault()
      e.stopPropagation()
      try {
        el.setPointerCapture(pointerId)
      } catch {
        // 极少数 setPointerCapture 失败（pointer 已 cancel）；忽略。
      }
      dragRef.current = {
        fromIndex: index,
        startClientY: e.clientY,
        pointerId,
        el,
      }
      // 初始 overIndex = fromIndex（未移动时松手不重排）。
      const initial = hitTest(e.clientY)
      setDragState({
        fromIndex: index,
        overIndex: initial ? initial.overIndex : index,
      })
      if (initial) {
        setIndicator({
          visible: true,
          top: initial.indicatorTop,
          left: 0,
          right: 0,
        })
      }

      // ★ T9：初始化 auto-scroll 指针坐标 + 启动 RAF 边缘检测循环。
      autoScrollPointerRef.current = { clientX: e.clientX, clientY: e.clientY }
      startAutoScroll()

      // 原生监听 move/up（挂到捕获单元格元素，pointer capture 保证事件路由到它）。
      const nativeMove = (ev: PointerEvent) => {
        const drag = dragRef.current
        if (!drag || ev.pointerId !== drag.pointerId) return
        // ★ T9：实时更新指针坐标供 auto-scroll RAF 循环读取。
        autoScrollPointerRef.current = { clientX: ev.clientX, clientY: ev.clientY }
        const result = hitTest(ev.clientY)
        if (!result) return
        // 调整 over index：当向下拖动时，@dnd-kit 语义是 over = 目标行 index（松手后 arrayMove
        // 把 from 移到 to）。hitTest 已返回插入位置（0..len）；转成"目标行 index"：
        //   - 插入位置 <= from：over = 插入位置（移到该位置）。
        //   - 插入位置 > from：over = 插入位置 - 1（因为 arrayMove 先删 from 再插，实际目标行 index = 插入位置 - 1）。
        let overIndex = result.overIndex
        if (overIndex > drag.fromIndex) overIndex = overIndex - 1
        setDragState({ fromIndex: drag.fromIndex, overIndex })
        setIndicator({
          visible: true,
          top: result.indicatorTop,
          left: 0,
          right: 0,
        })
      }
      const nativeUp = (ev: PointerEvent) => {
        const drag = dragRef.current
        if (!drag || ev.pointerId !== drag.pointerId) return
        try {
          drag.el.releasePointerCapture(drag.pointerId)
        } catch {
          // ignore
        }
        drag.el.removeEventListener('pointermove', nativeMove)
        drag.el.removeEventListener('pointerup', nativeUp)
        drag.el.removeEventListener('pointercancel', nativeUp)
        dragRef.current = null
        // ★ T9：拖拽结束，停止 auto-scroll RAF 循环。
        stopAutoScroll()
        // 最终 overIndex（state 中已是最新）。from===over 不重排。
        setDragState((cur) => {
          if (cur && cur.fromIndex !== cur.overIndex) {
            // ★ T11：多行成块重排判定。
            //
            // 仅当 multiRowReorder=true 且被拖行属于多选 selection（selectedRowKeys 含 ≥2 个
            // 且包含被拖行的 key）时，把所有选中行作为一块移到目标位置（保持相对顺序）；
            // 否则退化为单行 arrayMove（S17/S18 行为零回归路径）。
            //
            // 成块移动的目标位置语义：单行 arrayMove 的 overIndex 是"目标行 index"（先删 from 再插）；
            // 成块移动时用 arrayMoveBlock——其 toIndex 语义是"插入位置"（0..len），需把 overIndex
            // 还原成插入位置：over <= from 时插入位置=over；over > from 时插入位置=over+1（因为
            // 此时 over 指的是"from 删除后"的目标行 index）。
            const fromRecord = dataSource[cur.fromIndex]
            const fromKey = resolveRowKey(rowKey, fromRecord, cur.fromIndex)
            const selKeys = selectedRowKeys ?? []
            const isFromSelected =
              fromKey !== undefined && selKeys.some((k) => sameRowKey(k, fromKey))
            const shouldBlockMove =
              multiRowReorderEnabled && isFromSelected && selKeys.length > 1

            if (shouldBlockMove) {
              // 找出所有选中行在 dataSource 中的 index（升序），保持原相对顺序。
              const blockIdxs: number[] = []
              for (let i = 0; i < dataSource.length; i += 1) {
                const k = resolveRowKey(rowKey, dataSource[i], i)
                if (k !== undefined && selKeys.some((sk) => sameRowKey(sk, k))) {
                  blockIdxs.push(i)
                }
              }
              // 还原插入位置（见上注释）。
              const insertPos =
                cur.overIndex <= cur.fromIndex ? cur.overIndex : cur.overIndex + 1
              const next = arrayMoveBlock(dataSource, blockIdxs, insertPos)
              if (next !== dataSource) onSort(next)
            } else {
              const next = arrayMove(dataSource, cur.fromIndex, cur.overIndex)
              onSort(next)
            }
          }
          return null
        })
        setIndicator({ visible: false, top: 0, left: 0, right: 0 })
      }
      el.addEventListener('pointermove', nativeMove)
      el.addEventListener('pointerup', nativeUp)
      el.addEventListener('pointercancel', nativeUp)
    },
    [
      hitTest,
      dataSource,
      onSort,
      handleSelector,
      rowKey,
      multiRowReorderEnabled,
      selectedRowKeys,
      autoScrollPointerRef,
      startAutoScroll,
      stopAutoScroll,
    ],
  )

  // 卸载时清理（防御性：避免组件卸载后残留监听 + 残留 auto-scroll RAF）。
  useEffect(() => {
    return () => {
      const drag = dragRef.current
      if (drag) {
        try {
          drag.el.releasePointerCapture(drag.pointerId)
        } catch {
          // ignore
        }
        dragRef.current = null
      }
      // ★ T9：卸载时确保 auto-scroll RAF 已停（防止组件卸载后 RAF 继续跑）。
      stopAutoScroll()
    }
  }, [stopAutoScroll])

  return { dragState, indicator, containerProps: { onPointerDown } }
}
