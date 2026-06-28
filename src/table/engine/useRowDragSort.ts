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
 * === ★ 离散让位（dnd-kit 风格）===
 *
 * 拖拽中**不**整行 transform 平移到指针位置（会破坏 grid track），而是离散让位：
 *   - **被拖行**（rowIndex === fromIndex）：`transform = translateY(delta)` 跟手抬起
 *     （delta = clientY - startClientY，实时更新，无 transition）+ `dg-drag-row-active` 类
 *     （z-index 抬高 + box-shadow + 不透明背景防透视）。实现见 `applyYieldTransforms`。
 *   - **让位行**（from→over 中间行）：`transform = translateY(±draggedHeight)`（向上拖负、向下拖正）
 *     + `dg-drag-row-yield` 类（`transition: transform 150ms ease`，平滑让位动画）。
 *   - **其余行**：清 inline transform + 清两个让位类（复位）。
 *   - from === over：无让位行（仅被拖行抬起，其余行复位）。
 *   - 配套样式见 `table.css`（`.dg-drag-row-active` / `.dg-drag-row-yield`）。
 *   - 松手（nativeUp）前调 `clearYieldTransforms()` 清场（移除全部 cell 的 transform + 让位类），
 *     再 `arrayMove/arrayMoveBlock` 重排 dataSource（grid 重新计算 track，cell 复用但无残留位移）。
 *   - **auto-scroll 期间**：本 hook 不挂 scroll 监听；onPointerDown 启动拖拽时若发现 scrollEl，
 *     挂 `scroll` 监听 → RAF 去重 → `recomputeFromPointer` 重跑 hit-test（指针停在边缘不动时
 *     无 pointermove，靠 scroll 事件驱动 over/yield/指示线更新）。
 *   - **虚拟模式**：pointer 监听（pointermove/up/cancel）挂 `window`（不挂 el，el 被虚拟引擎卸载
 *     会丢事件），用 `AbortController` 批量管理，nativeUp/卸载 cleanup/重入守卫三处统一 abort()。
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
 * - data-grid **被拖行视觉跟手抬起**（`translateY(delta)`，非整行 transform 平移到指针位置，
 *   避免破坏 grid track），**中间行离散让位**（±draggedHeight + transition），另**保留指示线**
 *   作插入位置提示（蓝色横线）。松手后 `clearYieldTransforms()` 清场 + 重排 dataSource（行瞬间
 *   到新位置）。视觉与 antd 略异（antd 整行跟手指针；data-grid 被拖行抬起 + 中间行让位 + 指示线），
 *   但功能等价（行重排），且不破坏 CSS Grid 布局。
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
import { findScrollContainer, useAutoScrollOnDrag } from './useAutoScrollOnDrag'

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
    // ★ 离散让位（dnd-kit 风格）：拖拽开始时一次性快照被拖行高度（用于让位行的 translateY 位移量）。
    //   不用 ResizeObserver——单次快照够用，过程中行高不再变（行 track 由 grid 决定，拖拽中 dataSource
    //   未变，row track 不重排，被拖行高恒定）。让位行位移 ±此高度即让出/补回原被拖行所占的 track 高度。
    draggedHeight: number
    /**
     * ★ T9 修复：最后已知指针 clientY。
     *
     * pointerdown 初始化、pointermove 更新；当 auto-scroll（或用户滚轮）触发 scroll 事件时，
     * 指针可能静止（无 pointermove），此时用此值重跑 hit-test + 让位 transform，保证滚动过程中
     * from/over/indicator/yield 跟随滚动容器新进入视口的行同步更新（不再冻结）。
     */
    lastClientY: number
    /**
     * ★ T9 修复：拖拽期间监听的滚动容器引用（用于卸载/收尾时 removeEventListener）。
     * pointerdown 时由 findScrollContainer 定位（与 useAutoScrollOnDrag 滚的容器一致）。
     */
    scrollEl: HTMLElement | null
    /**
     * ★ T9 修复：scroll handler 排的 RAF id（去重 + 收尾 cancel 用）。
     * scroll 事件可能一帧触发多次，用 RAF 去重确保每帧只重算一次 hit-test。
     */
    scrollRafId: number | null
    /**
     * ★ 虚拟模式健壮性修复：拖拽期间 nativeMove/nativeUp 所在 window 监听的 AbortController。
     *
     * pointerdown 时创建并赋值；pointermove/pointerup/pointercancel 三个 window 监听挂
     * `{ signal: ac.signal }`，nativeUp 内 `ac.abort()` 一次性移除全部三个，卸载 cleanup
     * 也 `dragRef.current?.ac?.abort()`（拖拽中卸载场景）。
     *
     * **为什么改挂 window**：虚拟模式（drag-virtual-list，1万行）下，原实现把三个监听挂
     * 在被拖行首个 cell（el）上，并依赖 `el.setPointerCapture` 路由事件。当用户拖拽 +
     * auto-scroll 让 from cell（el）滚出可视区时，虚拟引擎 useVirtualList 会把它从 DOM
     * 卸载（detached）。Pointer Events 规范：capture target 被 detached 后 pointer capture
     * 自动丢失；此后事件 target 回到 hit-test 结果并冒泡到 window。但监听挂在已 detached
     * 的 el 上 → 收不到 → pointerup 不触发 → drop 卡死。改挂 window 永远存在、不受虚拟
     * 卸载影响，pointer 事件冒泡到 window（无论 capture 是否丢失）兜底。
     *
     * **setPointerCapture 保留**：el 仍在 DOM 时仍提供防选区/防触发其它元素副作用 +
     * 锁定事件路由；el 卸载后 capture 自动丢失，window 监听兜底，不影响正确性。
     */
    ac: AbortController | null
  } | null>(null)

  /**
   * ★ T9 修复：当前 scroll handler 的 ref（pointerdown 赋值、nativeUp 取）。
   *
   * nativeUp 需要 removeEventListener('scroll', ...)，而 onScrollDuringDrag 闭包内部需读 dragRef，
   * 不能用 useCallback（依赖会变）；放在 ref 上保证 pointerdown 时挂的 handler 与 nativeUp 时
   * 取的 handler 是同一个引用。
   */
  const scrollHandlerRef = useRef<(() => void) | null>(null)

  /**
   * ★ 离散让位辅助：对容器内所有 `[data-row-index]` body 单元格**命令式**施加 transform + 类。
   *
   * 分类（依据 cell.dataset.rowIndex 与 dragState.fromIndex/overIndex 的关系）：
   *   - **被拖行**（rowIndex === fromIndex）：`transform = translateY(delta)`（跟手抬起，无 transition），
   *     加 `dg-drag-row-active` 类（z-index 高 + box-shadow 抬起感 + 不透明背景防透视）。
   *   - **让位行**（from→over 之间的中间行）：
   *       · from < over：让位区间 (from, over] 各行 → 向上让位 translateY(-draggedHeight)。
   *       · from > over：让位区间 [over, from) 各行 → 向下让位 translateY(+draggedHeight)。
   *     加 `dg-drag-row-yield` 类（transition: transform 150ms ease，让位平滑）。
   *   - **其余行**：清 inline transform、移除两个类。
   *   - from === over：无让位行（仅被拖行抬起，其余行复位）。
   *
   * ★ 性能：每次 pointermove 一次 querySelectorAll + O(n) 遍历（非虚拟几行 / 虚拟仅可见集），可接受。
   * ★ 不动 grid 布局：cell 的 grid 槽位（grid-row）不变，纯视觉 transform（CSS transform 不影响
   *   grid item 的 grid-track 定位，仅视觉位移），松手 arrayMove 重排 dataSource 后 grid 重新计算 track。
   *
   * ★ 已知限制（虚拟模式）：`querySelectorAll('[data-row-index]')` 只命中**当前可见**的 cell。
   *   被拖行 / 让位行滚出视口被虚拟引擎卸载后，重新挂载的新 cell **不带** transform / 让位类
   *   （跟手抬起 / 让位视觉短暂丢失），但**指示线仍由 hitTest 正确算出**（hitTest 也读 DOM 但
   *   基于 overIndex 语义，指示线位置不依赖 transform）。单指针正常拖拽（被拖行始终在视口内）
   *   **不触发**此限制——仅在 auto-scroll 把被拖行/让位行推出视口边缘的极端情况下出现，且滚回时
   *   下一次 pointermove 会重新施加 transform（自愈）。
   */
  const applyYieldTransforms = useCallback(
    (fromIndex: number, overIndex: number, delta: number, draggedHeight: number) => {
      const container = containerRef.current
      if (!container) return
      // 让位区间边界（闭区间 [yieldLo, yieldHi]，fromIndex 本身排除——它是被拖行）。
      let yieldLo: number
      let yieldHi: number
      // 让位方向：from<over 中间行向上让位（-draggedHeight），from>over 中间行向下让位（+draggedHeight）。
      let yieldSign: 1 | -1
      if (fromIndex < overIndex) {
        // 中间行 (from, over]（不含 from，含 over）向上让位。
        yieldLo = fromIndex + 1
        yieldHi = overIndex
        yieldSign = -1
      } else if (fromIndex > overIndex) {
        // 中间行 [over, from)（含 over，不含 from）向下让位。
        yieldLo = overIndex
        yieldHi = fromIndex - 1
        yieldSign = 1
      } else {
        // from === over：无让位区间（yieldLo>yieldHi，下面区间判定恒 false）。
        yieldLo = 1
        yieldHi = 0
        yieldSign = 1
      }
      const cells = container.querySelectorAll<HTMLElement>('[data-row-index]')
      cells.forEach((cell) => {
        const idxAttr = cell.getAttribute('data-row-index')
        if (idxAttr === null) return
        const idx = Number.parseInt(idxAttr, 10)
        if (!Number.isFinite(idx)) return
        // 清类 + 清 transform 作为基线（下方按分类重新施加）。
        cell.classList.remove('dg-drag-row-active', 'dg-drag-row-yield')
        if (idx === fromIndex) {
          // 被拖行：跟手抬起（无 transition，transform 实时跟 pointer）。
          cell.classList.add('dg-drag-row-active')
          cell.style.transform = `translateY(${delta}px)`
        } else if (idx >= yieldLo && idx <= yieldHi) {
          // 让位行：±draggedHeight 让出原被拖行 track 高度（带 transition 平滑）。
          cell.classList.add('dg-drag-row-yield')
          cell.style.transform = `translateY(${yieldSign * draggedHeight}px)`
        } else {
          // 其余行：复位（清可能残留的 transform）。
          cell.style.transform = ''
        }
      })
    },
    [containerRef],
  )

  /**
   * ★ 离散让位清场：拖拽结束（pointerup）时遍历所有 `[data-row-index]` cell，清 inline transform +
   * 移除两个让位类，恢复 grid 原始视觉（然后 arrayMove 重排 dataSource，grid 重新计算 track）。
   */
  const clearYieldTransforms = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const cells = container.querySelectorAll<HTMLElement>('[data-row-index]')
    cells.forEach((cell) => {
      cell.classList.remove('dg-drag-row-active', 'dg-drag-row-yield')
      cell.style.transform = ''
    })
  }, [containerRef])

  /**
   * ★ 拖拽会话收尾辅助（三处复用：nativeUp / 卸载 cleanup / onPointerDown 重入守卫）。
   *
   * 统一处理：abort window pointer 监听（AbortController）+ cancel scroll RAF + 移除 scroll 监听
   * + 重置 scrollHandlerRef + clearYieldTransforms（清残留 transform/让位类）。
   *
   * 不含：releasePointerCapture（仅 nativeUp/卸载需，重入守卫不需——新的 pointerdown 会重新
   * setPointerCapture 到新 el）、stopAutoScroll（仅 nativeUp/卸载需，重入守卫在 startAutoScroll
   * 之前故无需停）、arrayMove（仅 nativeUp 需——重入守卫**不能**触发 onSort，否则误重排）。
   *
   * nativeUp 仍保留独立顺序（dragRef.current=null → clearYieldTransforms → arrayMove），故它**不**
   * 调本辅助，而是内联同样三步（顺序敏感：清场须在重排前）；本辅助主要服务于卸载 cleanup +
   * 重入守卫（这两处无 arrayMove，顺序不敏感）。
   */
  const cleanupDragSession = useCallback(() => {
    const drag = dragRef.current
    if (!drag) return
    // abort window pointer 监听（pointermove/up/cancel）。
    drag.ac?.abort()
    drag.ac = null
    // cancel 挂起的 scroll RAF。
    if (drag.scrollRafId !== null) {
      cancelAnimationFrame(drag.scrollRafId)
      drag.scrollRafId = null
    }
    // 移除 scroll 监听（auto-scroll 期间挂的 onScrollDuringDrag）。
    if (drag.scrollEl) {
      drag.scrollEl.removeEventListener('scroll', scrollHandlerRef.current as EventListener)
      drag.scrollEl = null
    }
    scrollHandlerRef.current = null
    dragRef.current = null
    // 清残留 transform + 两个让位类（恢复 grid 原始视觉）。
    clearYieldTransforms()
  }, [clearYieldTransforms])

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

  /**
   * ★ T9 修复：根据指针 clientY 重跑 hit-test + 算 over + 更新 dragState/indicator + 应用让位 transform。
   *
   * **抽取原因**：原 nativeMove 与新增 scroll handler 都要做同一件事（hit-test → over 换算 →
   * setDragState → setIndicator → applyYieldTransforms），抽成共享函数避免两份逻辑漂移。
   *
   * **overIndex 换算语义**（与原 nativeMove 完全一致）：
   *   - hitTest 返回插入位置（0..len）。
   *   - 插入位置 > from：over = 插入位置 - 1（因为 arrayMove 先删 from 再插，实际目标行 index = 插入位置 - 1）。
   *   - 插入位置 <= from：over = 插入位置（直接移到该位置）。
   *
   * **让位 delta**：delta = clientY - drag.startClientY（跟手位移量）。
   *
   * 调用方：pointermove（nativeMove）+ scroll handler（auto-scroll 滚动期间重算）。
   */
  const recomputeFromPointer = useCallback(
    (clientY: number) => {
      const drag = dragRef.current
      if (!drag) return
      const result = hitTest(clientY)
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
      // ★ 离散让位：命令式对所有可见 body cell 施加 transform + 类（被拖行跟手抬起、中间行让位）。
      //   delta = 当前 pointer Y - 起始 Y（跟手位移量）；draggedHeight 是 pointerdown 快照。
      const delta = clientY - drag.startClientY
      applyYieldTransforms(drag.fromIndex, overIndex, delta, drag.draggedHeight)
    },
    [hitTest, applyYieldTransforms],
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

      // ★ 重入防御：若上一次拖拽会话未正常结束（如 pointerup 因某种原因没触发、或外部代码异常），
      //   dragRef.current 仍残留——此时新 pointerdown 会覆盖它，导致旧会话的 window 监听 / scroll
      //   监听 / RAF 泄漏（ac 不再可达无法 abort）+ 旧让位 transform/类残留视觉。
      //   故启动新会话前先调 cleanupDragSession 清场（abort + cancel RAF + 移除 scroll 监听 +
      //   clearYieldTransforms），**不**触发 onSort（重入守卫不应误重排数据）。
      if (dragRef.current) {
        cleanupDragSession()
      }

      const el = cell
      const pointerId = e.pointerId
      e.preventDefault()
      e.stopPropagation()
      try {
        el.setPointerCapture(pointerId)
      } catch {
        // 极少数 setPointerCapture 失败（pointer 已 cancel）；忽略。
      }
      // ★ 离散让位：一次性快照被拖行高度（用该行首个 [data-row-index] cell 的 getBoundingClientRect
      //   高度）。后续 pointermove 用此高度算让位行的 translateY 位移量；过程中行高不变（grid track
      //   未重排），无需 ResizeObserver 跟踪。
      const draggedRect = el.getBoundingClientRect()
      const draggedHeight = draggedRect.height
      // ★ 虚拟模式健壮性修复：window 监听的 AbortController（pointermove/up/cancel 三监听挂其 signal）。
      //   nativeUp 内 ac.abort() 一次性移除全部三监听；卸载 cleanup 也 abort()。见 dragRef.ac 注释。
      const ac = new AbortController()
      dragRef.current = {
        fromIndex: index,
        startClientY: e.clientY,
        pointerId,
        el,
        draggedHeight,
        // ★ T9 修复：初始化 scroll 跟随相关字段。
        lastClientY: e.clientY,
        scrollEl: null,
        scrollRafId: null,
        ac,
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

      // ★ T9 修复：拖拽期间在滚动容器上挂 scroll 监听。
      //
      // **背景**：auto-scroll 的 RAF 循环对 .dg-scroll 调 scrollBy(0, dy) 滚动容器，但 hit-test /
      // applyYieldTransforms / setDragState / setIndicator **原本只在 pointermove 内调用**。
      // 指针静止停在容器边缘时没有 pointermove 事件 → 即使 auto-scroll 滚了容器、虚拟引擎重渲染了
      // 新行，hit-test 也不重跑 → from/over/indicator/yield 全冻结，drop 用过期 over。
      //
      // **修复**：scroll 事件触发时用最后已知 clientY（dragRef.current.lastClientY）重跑
      // recomputeFromPointer，让 from/over/indicator/yield 跟随滚动同步更新。
      //
      // **RAF 延迟一帧**：scrollBy 触发 scroll 事件时，虚拟引擎（useVirtualList 的 onScroll 用
      // flushSync 重渲染）可能还没把新行 flush 进 DOM；RAF 延迟一帧确保 [data-row-index] cell
      // 已是新可见行后再读 getBoundingClientRect，hit-test 才准确。
      //
      // **RAF 去重**：scroll 事件可能一帧触发多次，dragRef.current.scrollRafId !== null 时跳过，
      // 保证每帧只重算一次（避免抖动 + 节流）。
      //
      // **滚动容器**：复用 useAutoScrollOnDrag 的 findScrollContainer（保持与 auto-scroll 实际
      // 滚的容器是同一个）。非虚拟 demo（如 drag-sorting 3 行）下 findScrollContainer 可能返回
      // 外层可滚动祖先或 null；即使挂了监听，内容不超出 / 指针不在阈值内 → scroll 不触发 → 零回归。
      const scrollEl = findScrollContainer(containerRef.current)
      if (scrollEl) {
        const onScrollDuringDrag = () => {
          const drag = dragRef.current
          if (!drag) return
          // RAF 去重：同一帧多次 scroll 只排一次。
          if (drag.scrollRafId !== null) return
          drag.scrollRafId = requestAnimationFrame(() => {
            if (dragRef.current) dragRef.current.scrollRafId = null
            const d = dragRef.current
            if (!d) return
            // 用最后已知 clientY 重跑 hit-test + 让位 transform + 状态更新。
            recomputeFromPointer(d.lastClientY)
          })
        }
        scrollEl.addEventListener('scroll', onScrollDuringDrag, { passive: true })
        dragRef.current.scrollEl = scrollEl
        scrollHandlerRef.current = onScrollDuringDrag
      }

      // 原生监听 move/up（挂到捕获单元格元素，pointer capture 保证事件路由到它）。
      const nativeMove = (ev: PointerEvent) => {
        const drag = dragRef.current
        if (!drag || ev.pointerId !== drag.pointerId) return
        // ★ T9：实时更新指针坐标供 auto-scroll RAF 循环读取。
        autoScrollPointerRef.current = { clientX: ev.clientX, clientY: ev.clientY }
        // ★ T9 修复：更新最后已知 clientY（auto-scroll 滚动期间 scroll handler 用它重算 hit-test）。
        drag.lastClientY = ev.clientY
        // ★ T9 修复：抽取共享函数 recomputeFromPointer（hit-test → over 换算 → setDragState →
        //   setIndicator → applyYieldTransforms）。pointermove 与 scroll handler 共用同一份逻辑，
        //   保证语义一致（含 overIndex 换算、让位 delta 计算）。
        recomputeFromPointer(ev.clientY)
      }
      const nativeUp = (ev: PointerEvent) => {
        const drag = dragRef.current
        if (!drag || ev.pointerId !== drag.pointerId) return
        try {
          drag.el.releasePointerCapture(drag.pointerId)
        } catch {
          // ignore
        }
        // ★ 虚拟模式健壮性修复：改用 AbortController 一次性移除挂在 window 上的三个 pointer 监听
        //   （pointermove/up/cancel），替代原 removeEventListener 三连。abort() 后即使后续还有
        //   pointer 事件也不会再被 nativeMove/nativeUp 处理（监听已自动移除）。
        drag.ac?.abort()
        drag.ac = null
        // ★ T9 修复：先收尾 scroll 监听 + cancel RAF，再 clearYieldTransforms + arrayMove。
        //   顺序很关键——避免重排期间（clearYieldTransforms + arrayMove 触发 dataSource setState
        //   导致 grid 重渲染）scroll 再触发 recomputeFromPointer 读到中间态 DOM。
        if (drag.scrollRafId !== null) {
          cancelAnimationFrame(drag.scrollRafId)
          drag.scrollRafId = null
        }
        if (drag.scrollEl) {
          drag.scrollEl.removeEventListener('scroll', scrollHandlerRef.current as EventListener)
          drag.scrollEl = null
        }
        scrollHandlerRef.current = null
        dragRef.current = null
        // ★ 离散让位清场：移除所有 cell 的 transform + 两个让位类，恢复 grid 原始视觉。
        //   必须在 arrayMove（setDragState 内触发 onSort → 调用方 setState 重排 dataSource）之前清，
        //   否则重排后 cell DOM 复用 + 残留 transform/类会产生视觉错位（旧 cell 带着位移变成新行）。
        clearYieldTransforms()
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
      // ★ 虚拟模式健壮性修复：pointermove/up/cancel 监听改挂 window（原挂 el，el 被虚拟引擎卸载后
      //   监听失效导致拖拽卡死）。window 永远存在、不受虚拟卸载影响，且 pointer 事件冒泡到 window
      //   （无论 setPointerCapture 是否因 el detached 而丢失）。用 AbortController 批量管理三监听，
      //   nativeUp 内 ac.abort() 一次性移除全部；卸载 cleanup 也 abort()。
      //
      //   el.setPointerCapture(pointerId) 仍保留（el 在 DOM 时防选区 + 锁定事件路由）；
      //   nativeMove/nativeUp 开头仍用 `ev.pointerId !== drag.pointerId` 过滤（挂 window 后会收到
      //   所有 pointer 事件，必须靠 pointerId 只处理本拖拽会话）。
      window.addEventListener('pointermove', nativeMove, { signal: ac.signal })
      window.addEventListener('pointerup', nativeUp, { signal: ac.signal })
      window.addEventListener('pointercancel', nativeUp, { signal: ac.signal })
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
      applyYieldTransforms,
      clearYieldTransforms,
      cleanupDragSession,
      recomputeFromPointer,
    ],
  )

  // 卸载时清理（防御性：避免组件卸载后残留监听 + 残留 auto-scroll RAF + 残留 transform/让位类）。
  useEffect(() => {
    return () => {
      const drag = dragRef.current
      if (drag) {
        try {
          drag.el.releasePointerCapture(drag.pointerId)
        } catch {
          // ignore
        }
        // ★ 统一收尾：abort window 监听 + cancel scroll RAF + 移除 scroll 监听 + clearYieldTransforms
        //   （与 nativeUp 对称——卸载时也清残留 transform/让位类，防卸载瞬间残留视觉）。
        //   顺序：先 releasePointerCapture（需读 drag.el），再调 cleanupDragSession（内部会
        //   dragRef.current=null）。
        cleanupDragSession()
      }
      // ★ T9：卸载时确保 auto-scroll RAF 已停（防止组件卸载后 RAF 继续跑）。
      stopAutoScroll()
    }
  }, [stopAutoScroll, cleanupDragSession])

  return { dragState, indicator, containerProps: { onPointerDown } }
}
