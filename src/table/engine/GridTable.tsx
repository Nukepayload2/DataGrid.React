/**
 * data-grid CSS Grid 渲染引擎（F1 + M1 多级表头 + M2 固定列 + M3 合并 + M4 虚拟滚动）。
 *
 * 思路移植自 lun 的 `Table.tsx:198-206`（display:grid + grid-template-rows/columns
 * + grid-auto-flow:column），但**用纯 React 重写**，不引 Web Component、不抄 lun 代码。
 *
 * === 两条渲染路径（M1 起）===
 *
 * 1) **快速路径**：单层表头（无 children / maxDepth === 1）。
 *    使用 `grid-auto-flow:column`：每列 DOM 连续（表头格 + 每数据行格）。
 *    与 M0 行为完全一致，保证 basic demo 零回归。
 *
 * 2) **多级表头路径**（M1）：`columnTree` 提供且 maxDepth > 1。
 *    - `grid-template-rows`：表头部分 = `maxDepth` 行（统一 headerHeight），
 *      数据行跟在其后（每行一条 track）。
 *    - 表头格**显式** `grid-column` / `grid-row` 定位（来自 columnTree.flattenHeaderCells），
 *      不依赖 auto-flow，避免父表头跨列放置错乱。
 *    - 数据单元格也用**显式** `grid-column: <叶子列序号+1>`、`grid-row: <maxDepth + rowIndex + 1>`。
 *    - 关闭 `grid-auto-flow:column`（用默认 row 流，配显式定位最稳）。
 *
 * === 行高约定 ===
 * 行高走"行高约定"（rowHeight 数字或函数），不做动态测量（决策 1）。
 *
 * === 整行 hover ===
 * grid-auto-flow:column / 显式定位下"同行"DOM 都不连续，纯 CSS 无法关联整行；
 * 用 JS 方案：根组件持有 hoveredRowIndex state，命中行所有 body cell 加 `dg-row-hover` 类。
 *
 * 后续任务预留：fixed（M2 已落地）、virtual（M4 已落地）、colSpan/rowSpan（M3 已落地）、
 * 固定表头（M8 已落地）、rowExpand（M9）。
 *
 * === M2 固定列 fixed columns（左/右 + 间隙）===
 *
 * 1. **scroll 容器**：`scroll.x` 存在时，grid 外包一层 `.dg-scroll`（`overflow-x:auto`），
 *    其内部 `.dg-grid` 设 `min-width: <scroll.x>`（number→px，string→原样）。
 *    未传 `scroll` 时**不**包滚动容器（M0/M1 行为零回归）。
 *
 * 2. **sticky 偏移**：`useStickyColumns` 按 left（'start'）/right（'end'）分组累加叶子列宽算
 *    `position:sticky; left/right`，ResizeObserver 监听叶子表头格宽度变化重算（详见该 hook）。
 *
 * 3. **两路径统一**：sticky 偏移按叶子列算；flat 路径（auto-flow）和 multi 路径（显式定位）
 *    均通过同一套 `leafSticky` 数组取值。表头格（M1 分组格）的 sticky 信息由 hook 计算
 *    （`headerSticky`）：分组格仅当其叶子区间全部同侧固定时才 sticky。
 *
 * 4. **z-index / 边缘阴影**：固定列表头格 z-index=3，表体固定格 z-index=2，普通格默认 auto。
 *    固定侧"靠内"边界格（start 最右 / end 最左）加 `dg-sticky-shadow-start/end` 类，
 *    画淡阴影提示用户其后还有内容（参考 antd fixed 列 box-shadow）。
 *
 * === M4 虚拟滚动 virtual ===
 *
 * 触发条件：`virtual === true && typeof scroll.y === 'number'`（与 antd virtual-list 一致）。
 *
 * 实现：
 * 1. **强制 multi 路径**：虚拟滚动下表头表体行号必须精确可控，flat 路径（grid-auto-flow:column）
 *    的 DOM 顺序布局无法插入"占位 track"，故一律走 multi 路径（显式 grid-row 定位）。
 *    （若已无合并/多级，用 maxDepth=1 的 multi，与原 flat 路径视觉等价。）
 *
 * 2. **占位 track 撑总高**：`grid-template-rows` 由 4 段组成——
 *      headerTracks(maxDepth) + paddingTopTrack(高度=可视区上方行累加) +
 *      可视区数据行 tracks（[start, end) 各一行，约定行高）+
 *      paddingBottomTrack（高度=可视区下方剩余总高）。
 *    数据格的 grid-row 计算 = `headerRows + 1(paddingTop) + (i - start) + 1`。
 *    这样 grid 整体高度 ≈ 表头高 + totalSize（与全集行高一致），浏览器滚动条正确（与 antd
 *    virtual-list / rc-virtual-list / lun 一致思路）。
 *
 * 3. **滚动容器**：`.dg-scroll` 同时承载横向与纵向滚动（`overflow: auto`），高度 = `scroll.y`。
 *    `scroll.x` 时 `.dg-grid` 设 min-width（与 M2 一致）。
 *
 * 4. **表头纵向固定**（虚拟下表头不随滚动消失）：表头格 `position: sticky; top: 0`（z-index 4，
 *    高于表体）。与 M2 横向 sticky 共存——一个元素可同时 sticky left 和 top（浏览器原生支持，
 *    antd rc-table 的 corner cell 同款）。**该机制与 M8 共用**（见下方 `headerStickyTop`）。
 *
 * 5. **★ 决策 2 预留**：`useVirtualList` 的 getRowHeight 只取"收起态"约定行高（详见该 hook 注释）。
 *    M9 展开内容将来直接渲染，不参与虚拟窗口大小。
 *
 * 6. **M3 合并 × 虚拟**：合并格（rowSpan）可能跨越可视区边界。本引擎只渲染 [start, end) 行，
 *    故若某 rowSpan>1 格的"左上角"在 start 之前、但延伸到 [start, end) 内，当前实现下该左上角
 *    不在渲染集中——其延伸部分（覆盖 [start, end) 中某些格）也不会渲染（被覆盖格本就不渲染），
 *    导致视觉上"缺一块"。这是已知简化（详见 demo 注释）。完整实现需如 rc-table BodyGrid 的
 *    extraRender 机制补画跨边界的合并格——留作 M4 增强项。
 *
 * === M8 固定表头（容器内纵向滚动，非 virtual）===
 *
 * 触发条件：`!virtual && scroll.y` 存在（number 或字符串）。区别于 M4：表体**全量渲染**（不做虚拟
 * 窗口裁剪），只把整体放进一个**限高纵向滚动容器**，表头 `position: sticky; top: 0` 钉在该容器顶部。
 * 适用 antd `fixed-header` / `fixed-columns-header` demo（百行级、表头固定）。
 *
 * 实现（与 M4 表头 sticky 统一）：
 * 1. **表头 sticky 复用**：派生标志 `headerStickyTop = virtualEnabled || scrollYNonVirtual`，
 *    传入 HeaderCell / ColumnCells 的 `headerStickyTop` prop。该 prop 控制表头格额外
 *    `position: sticky; top: 0; zIndex: 4` + `.dg-cell-header-vsticky` 类（背景不透明，防止表体
 *    透过）。**M4 与 M8 走同一套机制**，行为一致。
 *    （历史 prop 名 `virtualStickyTop` 已泛化为 `headerStickyTop`，含义=表头纵向 sticky 启用。）
 *
 * 2. **滚动容器**：M8 下 `.dg-scroll` 同时承载横向（scroll.x / fixed）与纵向（scroll.y）滚动：
 *      - `max-height: scrollY`（number→px，string→原样）——表体超过该高度时纵向滚动。
 *        用 max-height 而非 height：表体不足该高度时不强制撑满（与 antd `.ant-table-body`
 *        `max-height` 一致；antd fixed-header demo 视觉同款）。
 *      - `overflow-y: auto`（启用纵向滚动）。
 *      - `overflow-x`：由 scroll.x / fixed 决定（与 M2 一致）。
 *    `.dg-grid` 仍由 grid-template-rows 自适应表头 + 全量数据行总高，浏览器原生滚动条正确。
 *
 * 3. **corner cell（双 sticky）**：M8 × M2 组合（表头 sticky top + 列 sticky left/right）时，
 *    左上/右上角的表头格**同时** sticky left（M2）+ sticky top（M8）。本引擎天然支持——
 *    HeaderCell 内 `horizontalSticky`（来自 headerSticky，left/right + zIndex 3）与
 *    `verticalSticky`（top + zIndex 4）合并到同一元素的 style；浏览器对单元素 sticky left+top
 *    原生支持（与 antd rc-table corner cell 同款）。zIndex 取纵向（4）> 横向（3），保证角单元格
 *    在双向滚动时都盖住下层（表体固定列 zIndex 2、表头固定列 zIndex 3、表头角 zIndex 4）。
 *
 * === M6 隐藏列 hidden columns（grid track `0fr` 占位 + 过渡）===
 *
 * 思路移植自 lun `hidden` 属性 + grid track `0fr↔1fr` 过渡，**用纯 React 重写**。
 *
 * 1. **track 不删除**：隐藏列（`column.hidden === true`）在 `grid-template-columns` 中仍占一条
 *    track，但其大小置为 `0fr`（而非原 `max-content`/数字宽）。**列线号因此保持稳定**——隐藏/
 *    显示切换不会引起其它列 grid 线号跳变，从而：
 *      * M1 多级表头：父分组表头格的 `grid-column` 范围不变；隐藏某子叶子时父格因其中一条子
 *        track 为 0fr 而自动横向收缩（视觉上"跨列范围相应收缩"），表头线号不跳变。
 *      * M2 固定列：sticky 偏移按叶子列宽累加（useStickyColumns），隐藏列宽度为 0
 *        （ResizeObserver 实测），自动从累加中"消失"，固定列偏移仍正确。
 *      * M3 合并：合并格 `grid-column: span N` 仍跨原叶子区间，区间内隐藏列 track 为 0，
 *        合并格视觉宽度相应收缩（不崩）。
 *      * M4 虚拟：列 track 与行 track 正交，虚拟不受影响。
 *      * M5 选择列：作为普通叶子列参与，同样可被 hidden（业务上罕见）。
 *
 * 2. **单元格仍渲染**：隐藏列的表头格/数据格**仍渲染 DOM**（维持 grid item 占位以保持线号），
 *    但加 `dg-cell-hidden` 类：`visibility:hidden + overflow:hidden + min-width:0 + max-width:0
 *    + padding:0 + border:0`，使内容不可见且不撑大 0fr track。
 *
 * 3. **0fr↔原宽 过渡**：`.dg-grid` 上 `transition: grid-template-columns 0.3s ease`（lun 同款）。
 *    `grid-template-columns` 是可动画化的 grid 属性，track size 列表逐项插值——隐藏列从 `0fr`
 *    过渡到原宽即得到展开/收起的平滑动画。**注意 CSS 限制**：若原宽为 `max-content`（非可动画
 *    尺寸），该 track 不参与插值，过渡表现为瞬切——视觉正确但缺动画（不阻塞功能）。
 *
 * 4. **flat 路径兼容**：单层快速路径（grid-auto-flow:column）下隐藏列同样生效——列 track 由
 *    `grid-template-columns` 定义并定位，0fr track 在原位置收缩。**不强制 multi 路径**，
 *    保证 M0 行为零回归（隐藏列在 flat 路径下与 M0 视觉/布局机制完全一致）。
 *
 * === M7 列宽拖拽调整 resizable ===
 *
 * 思路**借鉴** lun `Table.ColumnResizer.tsx` 的 pointer 拖拽算法，**用纯 React + TS 重写**
 * （lun 用全局浮动 resizer + Vue ref 操作 DOM 样式；本引擎不操作 DOM 样式，只维护
 * "用户拖拽后的列宽映射" `resizedWidths: Map<key, px>`，详见 `useColumnResize.ts`）。
 *
 * 1. **resizer 手柄**：叶子表头格右侧渲染 `.dg-resizer` div（pointer-events 默认 none，hover 表头
 *    显形）。pointerdown 由 `useColumnResize.onPointerDown(key)` 处理——内部 setPointerCapture +
 *    原生 pointermove/up 监听，保证指针移出手柄/窗口也不丢事件（无抖动/不丢失）。
 *
 * 2. **width 更新 + grid-template-columns 重算**：拖拽中每次 move 更新 `resizedWidths[key]`，
 *    GridTable 在算 colTracks 时优先取此映射（覆盖 column.width），重算 `grid-template-columns`
 *    → 列宽实时变化。首次拖拽 max-content 列时，第一次 move 即把该列从 max-content 转为受控 px。
 *
 * 3. **min/max 约束**：默认 min=30（防拖到 0），max=Infinity（不限制过宽），可由
 *    `resizableMinWidth`/`resizableMaxWidth` prop 配置（number 或按 key 函数）。
 *
 * 4. **拖拽中禁用过渡**：拖拽进行中 `.dg-grid` 加 `dg-grid-resizing` 类，禁用 M6 的
 *    `grid-template-columns` 过渡（否则 0.3s 过渡与实时更新叠加抖动）。
 *
 * 5. **组合**：
 *    - M1 多级表头：只有叶子表头格有 resizer（分组格无手柄）；父格 grid-column 范围不变，
 *      子叶子宽变 → 父格自动跟随收缩/展开（线号稳定）。
 *    - M2 固定列：列宽变 → useStickyColumns 的 ResizeObserver 实测新宽 → 重算 sticky 偏移。
 *    - M3 合并：合并格跨原叶子区间，区间内某叶子宽变 → 合并格视觉宽随之变（线号不变）。
 *    - M4 虚拟：列 track 与行 track 正交，拖拽不影响虚拟行窗口。
 *    - M6 隐藏：0fr track 的列不渲染 resizer（无可调宽度）。
 *
 * 6. **默认行为**：`resizable` 由适配层 Table.tsx 决定默认值（本任务默认 false，零回归；
 *    demo 中显式传 `resizable` 开启）。引擎层 `resizable === true` 才启用。
 *
 * === M9 行展开（grid track `0fr↔1fr` 过渡 + 展开图标列）===
 *
 * 思路移植自 lun `Table.RowExpand.tsx`（Web Component + Vue），**用纯 React 重写**——
 * 只借鉴 grid `0fr↔1fr` 行 track 过渡思路，不抄 lun 的 useValueModel/useExpandMethods 代码。
 * 展开图标列 lun 没有，**自研**（ExpandIcon 组件）。
 *
 * 1. **展开图标列**：适配层把展开列封装为普通 `EngineColumnNode`（与 M5 选择列同机制），
 *    引擎无需感知"展开"语义——展开列就是一条普通叶子列 track，每行 render 出展开图标。
 *    `expandable.columnWidth` 缺省 48（对齐 antd tableExpandColumnWidth）。
 *
 * 2. **★ grid `0fr↔1fr` 行 track 过渡**（lun 思路核心）：
 *    每个可展开数据行（`expandableKeySet.has(key)`）在其数据行 track **之后**紧跟一条"展开内容
 *    track"：
 *      - 收起：track size = `0fr`（track 仍存在，行线号稳定）。
 *      - 展开：track size = `1fr`（grid 1fr 默认 min=auto，按展开内容自然高撑开；lun 同款）。
 *    `.dg-grid` 上 `transition: grid-template-rows 0.3s ease`（与 M6 列过渡同套机制，行版）——
 *    `grid-template-rows` 是可动画属性，fr 单位逐项插值 → 0fr↔1fr 平滑展开/收起动画。
 *
 *    展开内容作为 grid item 渲染在该展开 track：`grid-row: <展开 track 线号>`，
 *    `grid-column: 1 / -1`（跨整行）；容器 `overflow:hidden; min-height:0`——0fr 时被裁剪不可见、
 *    1fr 时按内容自然展开。
 *
 * 3. **行线号计算**：因每个可展开行多占一条展开 track，数据行的 grid-row 线号需相应偏移。
 *    引擎维护一个累加器：遍历数据行时，若上一行（含当前行之前所有可见行）可展开 → 该行 grid-row
 *    线号 +（已遇到的展开 track 数）。展开 track 线号 = 该数据行 grid-row **下一条线**。
 *
 * 4. **★ 决策 2（虚拟 × 展开）**：
 *    虚拟模式下（M4），`useVirtualList` 仍只按"收起态"约定行高算 [start, end) / paddingTop/Bottom。
 *    展开内容 track 在可视区内插入（不参与虚拟窗口大小计算）——展开会让该行真实 DOM 更高，
 *    但虚拟窗口范围不变；展开内容溢出渲染（牺牲性能换稳定）。
 *    具体实现：可见数据行 track 之间穿插展开 track；paddingTop/paddingBottom 仍按收起态 totalSize
 *    计算（不受展开 track 影响）——这会导致展开时实际内容总高 > totalSize，浏览器原生滚动条
 *    位置可能轻微偏移，但窗口稳定不崩（与 antd virtual-list × 展开行为对齐：展开不重定位窗口）。
 *
 * 5. **与各能力组合**：
 *    - M2 固定列：展开内容跨整行（grid-column:1/-1），不受固定列影响（展开区不 sticky）。
 *    - M3 合并：合并格仍按原数据行 track 放置；展开 track 在数据行后独立插入，不影响合并线号。
 *    - M5 选择列：展开列与选择列均为普通叶子列，可在 columns 中通过 EXPAND_COLUMN/
 *      SELECTION_COLUMN 哨兵任意排序（对齐 antd order-column）。
 *    - M6 隐藏列：行 track 与列 track 正交；隐藏列不影响展开 track。
 *    - M4 虚拟：见上方决策 2。
 */

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  resolveColumnTree,
} from './columnTree'
import {
  computeCellMergePlan,
  type CellMergeInfo,
  type CellMergePlan,
} from './cellMerge'
import {
  stickyCellStyle,
  stickyHeaderCellStyle,
  useStickyColumns,
  type LeafStickyInfo,
} from './useStickyColumns'
import {
  useVirtualList,
} from './useVirtualList'
import { useColumnResize } from './useColumnResize'
import { SortIndicator } from './SortIndicator'
import { FilterDropdown } from './FilterDropdown'
import type {
  Align,
  EngineColumnNode,
  EngineExpandState,
  EngineHeaderCell,
  EngineLeafColumn,
  EngineTableProps,
  FixedSide,
} from './types'

/** 数字 → px 字符串；字符串原样返回；null/undefined → undefined。 */
function toTrack(value: number | string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'number') return `${value}px`
  return value
}

/**
 * 把 `rowHeight`（number 或函数）解析为某行的数值高度（px）。
 * - number：直接返回。
 * - 函数：调用取值；返回 number→原值，返回 string→按 px 数字解析（"40px"→40）；非法→0。
 * - 缺省：返回 0（虚拟滚动要求 rowHeight 必须给数值约定；未给时退化为 0，调用方应避免）。
 *
 * 仅 M4 虚拟滚动需要数值化（计算 offset/totalSize 用）；非虚拟路径仍走 `toTrack` 生成 track 字符串。
 */
function resolveNumericRowHeight<RecordType>(
  rowHeight: EngineTableProps<RecordType>['rowHeight'],
  record: RecordType,
  index: number,
): number {
  if (typeof rowHeight === 'function') {
    const v = rowHeight(record, index)
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
      // 支持 "40px" / "40" 形式；非纯数字+px 视为 0（约定：虚拟行高必须可数值化）。
      const m = /^([\d.]+)px$/.exec(v.trim())
      if (m) return Number.parseFloat(m[1])
      const asNum = Number.parseFloat(v)
      return Number.isFinite(asNum) ? asNum : 0
    }
    return 0
  }
  if (typeof rowHeight === 'number') return rowHeight
  return 0
}

/** 取 record 的字段值（支持 dataIndex 为 string/number/string[]）。 */
export function getValueByDataIndex(
  record: any,
  dataIndex: string | number | Array<string | number> | undefined,
): any {
  if (record === null || record === undefined) return undefined
  if (dataIndex === undefined || dataIndex === null) return undefined
  if (Array.isArray(dataIndex)) {
    return dataIndex.reduce((acc, key) => {
      if (acc === null || acc === undefined) return undefined
      return acc[key]
    }, record)
  }
  return record[dataIndex]
}

/** 解析 rowKey 为 key 字符串/数字。 */
export function getRowKey<RecordType>(
  record: RecordType,
  rowKey: string | ((record: RecordType) => string | number),
): string | number {
  if (typeof rowKey === 'function') return rowKey(record)
  const v = (record as any)?.[rowKey]
  return v === undefined ? '' : v
}

export interface GridTableProps<RecordType = any> extends EngineTableProps<RecordType> {
  /** 额外 className（来自适配层，如 size/bordered）。 */
  className?: string
}

/** 引擎对外暴露的句柄（仅 M4 scrollTo）。对外请走 Table.tsx 的 TableRef。 */
export interface GridTableHandle {
  scrollTo: (config: {
    index?: number
    scrollTop?: number
    offset?: number
    align?: 'start' | 'center' | 'end' | 'nearest'
  }) => void
}

/**
 * 渲染引擎根组件。
 * 不对外暴露；对外统一走 `src/table/Table.tsx`。
 */
export const GridTable = forwardRef(GridTableInner) as <RecordType = any>(
  props: GridTableProps<RecordType> & { ref?: React.Ref<GridTableHandle> },
) => React.ReactElement

function GridTableInner<RecordType = any>(
  props: GridTableProps<RecordType>,
  ref: React.Ref<GridTableHandle>,
) {
  const {
    columns,
    columnTree,
    dataSource,
    rowKey,
    rowHeight,
    headerHeight,
    showHeader = true,
    scroll,
    virtual,
    resizable,
    resizableMinWidth,
    resizableMaxWidth,
    expandState,
    onSorterClick,
    onFilterApply,
    className,
  } = props

  const gridRef = useRef<HTMLDivElement | null>(null)

  // === 虚拟滚动判定（M4）===
  // virtual=true 且 scroll.y 为 number 时启用纵向虚拟滚动（与 antd virtual-list 一致）。
  const scrollY = scroll?.y
  const virtualEnabled =
    virtual === true && typeof scrollY === 'number' && scrollY > 0

  // === M8 固定表头（非 virtual）判定 ===
  // 非 virtual 且 scroll.y 存在（number>0 或非空 string）时启用：表体限高纵向滚动、表头 sticky top。
  // 与 M4 互斥（M4 优先；virtual=true 时走虚拟路径，scroll.y 用于虚拟窗口高度，不再做 M8）。
  const scrollYNonVirtual =
    !virtualEnabled && scrollY !== undefined && scrollY !== null && scrollY !== ''

  // === 表头纵向 sticky 统一标志（M4 + M8 共用）===
  // 无论虚拟（M4）还是非虚拟 scroll.y（M8），表头都需要 `position: sticky; top: 0` 钉在滚动容器顶部。
  // 该标志传入 HeaderCell / ColumnCells 的 `headerStickyTop` prop，统一驱动表头 sticky 行为，
  // 避免两套不一致的实现（任务要求：M4 与 M8 表头 sticky 行为一致）。
  const headerStickyTop = virtualEnabled || scrollYNonVirtual

  // M9：是否启用展开（expandState.expandEnabled）。展开启用时强制 multi 路径——
  //     展开内容 track 需要精确 grid-row 定位，flat 路径（grid-auto-flow:column）无法插入。
  const expandEnabled = !!expandState?.expandEnabled

  // 解析列：优先 columnTree（多级表头），否则退化到 columns（单层）。
  // M3：若任一叶子列声明了 onCell（单元格合并）或 colSpan 字段（表头横向合并），
  //     强制走 multi 路径（显式 grid-column/grid-row 定位）——grid-auto-flow:column 下
  //     跨列 span 会打乱列顺序，必须显式定位才能稳定放置合并格。
  // M4：虚拟滚动下也强制 multi 路径（占位 track 机制需要精确 grid-row 控制，
  //     flat 路径无法插入 paddingTop/paddingBottom 占位 track）。
  // M9：展开启用也强制 multi（同上理由：需精确 grid-row 插入展开 track）。
  const resolved = useMemo(() => {
    if (columnTree && columnTree.length > 0) {
      const r = resolveColumnTree(columnTree)
      // M3：检测单元格合并（onCell）或表头合并（colSpan≠1 或存在 covered 表头格）。
      const hasOnCell = r.leafColumns.some((c) => typeof c.onCell === 'function')
      const hasHeaderMerge = r.headerCells.some(
        (h) => (h.headerColSpan ?? 1) !== 1 || h.covered === true,
      )
      const forceMulti = hasOnCell || hasHeaderMerge
      // maxDepth === 1 且无合并 → 走 flat 快速路径（M0/M1 行为，零回归）。
      const multi = r.maxDepth > 1 || forceMulti
      return {
        mode: (multi || virtualEnabled || expandEnabled ? ('multi' as const) : ('flat' as const)),
        maxDepth: r.maxDepth,
        leafColumns: r.leafColumns,
        headerCells: r.headerCells,
      }
    }
    // 单层路径：columns 即叶子列。
    // M3：同样检测合并需求；若有 onCell 或 colSpan 字段，把 columns 包装成单层 columnTree
    //     走 resolveColumnTree（得到 headerCells 供 covered 处理），再强制 multi。
    // M4/M9：虚拟滚动 / 展开启用下也包装成 multi（理由同上）。
    const flatLeavesRaw: Array<EngineLeafColumn<RecordType>> = columns ?? []
    const hasOnCellFlat = flatLeavesRaw.some((c) => typeof c.onCell === 'function')
    const hasHeaderColSpanFlat = flatLeavesRaw.some(
      (c) => c.colSpan !== undefined && c.colSpan !== 1,
    )
    if (hasOnCellFlat || hasHeaderColSpanFlat || virtualEnabled || expandEnabled) {
      // 包装成单层 columnTree（每个叶子列作为根节点）。
      const pseudoTree = flatLeavesRaw.map((c) => ({ ...c, children: undefined }))
      const r = resolveColumnTree(pseudoTree)
      return {
        mode: 'multi' as const,
        maxDepth: 1,
        leafColumns: r.leafColumns,
        headerCells: r.headerCells,
      }
    }
    // 无合并的单层 → flat 快速路径（M0 行为，零回归）。
    return {
      mode: 'flat' as const,
      maxDepth: 1,
      leafColumns: flatLeavesRaw,
      headerCells: [] as Array<EngineHeaderCell<RecordType>>,
    }
  }, [columnTree, columns, virtualEnabled, expandEnabled])

  const { mode, maxDepth, leafColumns, headerCells } = resolved

  // === M7 列宽拖拽调整 ===
  // enabled = resizable === true（默认由适配层决定；引擎层 undefined/false 不启用）。
  // resizedWidths 在算 colTracks 时优先覆盖 column.width；onPointerDown 绑定到 resizer 手柄。
  const resizeEnabled = resizable === true
  const { resizedWidths, resizingKey, onPointerDown: onResizerPointerDown } =
    useColumnResize({
      enabled: resizeEnabled,
      minWidth: resizableMinWidth,
      maxWidth: resizableMaxWidth,
    })

  // === M2 固定列 sticky 偏移（ResizeObserver 监听叶子表头格宽度）===
  const { leafSticky, headerSticky, hasFixed } = useStickyColumns(
    leafColumns,
    headerCells,
    gridRef,
  )

  // === M3 单元格合并计划 ===
  // computeCellMergePlan 内部已检测 onCell 是否存在；无 onCell 返回 null（无合并，跳过开销）。
  const cellMergePlan: CellMergePlan | null = useMemo(
    () => computeCellMergePlan(leafColumns, dataSource),
    [leafColumns, dataSource],
  )

  // === M4 虚拟滚动：约定行高（数字/函数 → 每行数值 px）===
  // getRowHeight 是 useVirtualList 算 offset/totalSize 的唯一行高来源。
  // ★ 决策 2：此处只用"收起态"约定行高，不感知（M9）展开态。详见 useVirtualList 注释。
  // 兜底默认 40px：用户未传 rowHeight 时给一个合理约定（避免行高 0 导致虚拟窗口退化）。
  // 与 antd `listItemHeight`（默认 24）类似思路；data-grid 取 40（接近 large 行高）。
  const resolvedRowHeight = rowHeight ?? (virtualEnabled ? 40 : undefined)
  const getRowHeight = useCallback(
    (index: number) => resolveNumericRowHeight(resolvedRowHeight, dataSource[index], index),
    [resolvedRowHeight, dataSource],
  )

  // 滚动容器 ref（虚拟下承载纵向滚动；非虚拟时不使用）。
  const virtualScrollRef = useRef<HTMLDivElement | null>(null)

  // 表头占高（用于虚拟滚动 contentOffset 校正）：showHeader 时 = maxDepth × headerHeight(数值)，
  // 缺省 headerHeight 走 CSS 'auto'——虚拟下需要数值，给一个近似值 40（与默认行高一致）。
  // 这里只是给 useVirtualList 校正 scrollTop/viewportSize 用，对最终视觉无影响（表头实际高度由
  // grid-template-rows 的 headerTracks 决定，paddingTop/Bottom 是数据区独立计算）。
  const headerHeightNum = showHeader
    ? maxDepth * (typeof headerHeight === 'number'
      ? headerHeight
      : typeof headerHeight === 'string' && /^[\d.]+px$/.test(headerHeight.trim())
        ? Number.parseFloat(headerHeight)
        : 40)
    : 0

  const virtualState = useVirtualList({
    itemCount: dataSource.length,
    getRowHeight,
    containerRef: virtualScrollRef,
    enabled: virtualEnabled,
    contentOffset: headerHeightNum,
  })

  // 暴露 scrollTo（仅在虚拟模式下有效；非虚拟调用为 no-op）。
  useImperativeHandle(
    ref,
    (): GridTableHandle => ({
      scrollTo: (config) => {
        if (!virtualEnabled) return
        virtualState.scrollTo(config)
      },
    }),
    [virtualEnabled, virtualState],
  )

  // === M9 行展开布局信息 ===
  // 为每个可见数据行计算其在 grid 中的 row line（含展开 track 偏移）+ 该行展开 track 的 row line。
  // expandLayout: Map<rowIndex, { rowLine, expandTrackLine? }>。
  //   - rowLine：该数据行 track 的起始线（1-based grid row line）。
  //   - expandTrackLine：该行下方展开内容 track 的起始线（仅可展开行有；= rowLine + 1）。
  // expandTrackSizes: Map<rowIndex, '0fr' | '1fr'>（可展开行的展开 track 大小）。
  // 在 gridTemplateRows 构建时与 bodyTracks 拼接；在渲染数据格 / 展开内容时取定位。
  const expandLayout = useMemo(() => {
    const layout = new Map<number, { rowLine: number; expandTrackLine?: number }>()
    if (!expandEnabled || !expandState) return { layout }
    const { isExpandable } = expandState
    const headerRowsUsed = showHeader ? maxDepth : 0
    // 虚拟下数据行起始线 = headerRows + 1(paddingTop track) + 1（首行）；
    // 非虚拟 = headerRows + 1。
    let lineCursor = headerRowsUsed + (virtualEnabled ? 1 : 0)
    const lo = virtualEnabled ? virtualState.start : 0
    const hi = virtualEnabled ? virtualState.end : dataSource.length
    for (let i = lo; i < hi; i += 1) {
      // lineCursor 后 +1 = 该数据行的起始线（track N 占用 [lineCursor+1, lineCursor+2]）。
      const rowLine = lineCursor + 1
      const record = dataSource[i]
      let expandTrackLine: number | undefined
      if (record !== undefined) {
        const key = getRowKey(record, rowKey)
        if (isExpandable(key)) {
          expandTrackLine = rowLine + 1
          lineCursor += 2 // 数据行 track + 展开内容 track 各占 1
        } else {
          lineCursor += 1
        }
      } else {
        lineCursor += 1
      }
      layout.set(i, { rowLine, expandTrackLine })
    }
    return { layout }
  }, [expandEnabled, expandState, showHeader, maxDepth, virtualEnabled, virtualState, dataSource, rowKey])

  // === grid 模板 ===
  // 虚拟模式：headerTracks + paddingTopTrack + [start,end) 数据行 tracks（含展开 track）+ paddingBottomTrack。
  // 非虚拟：headerTracks + 全部数据行 tracks（含展开 track）（M0/M1 行为，无展开时退化为原逻辑）。
  const { gridTemplateRows, gridTemplateColumns, gridAutoFlow } = useMemo(() => {
    const headerRows = showHeader ? maxDepth : 0
    const headerTrackUnit = toTrack(headerHeight) ?? 'auto'
    const headerTracks: string[] = []
    for (let i = 0; i < headerRows; i += 1) headerTracks.push(headerTrackUnit)

    let bodyTracks: string[]
    if (virtualEnabled) {
      // M4：只列可视区数据行 tracks（约定行高数值化）。前后各加一条占位 track 撑总高。
      // M9：可视区数据行间穿插展开内容 track（可展开行后插一条 0fr/1fr）。
      //   ★ 决策 2：展开 track 不参与虚拟窗口大小（paddingTop/Bottom 仍按收起态 totalSize 算），
      //   展开会让实际 DOM 总高 > totalSize，浏览器滚动条位置可能轻微偏移，但窗口稳定不崩。
      const visibleTracks: string[] = []
      for (let i = virtualState.start; i < virtualState.end; i += 1) {
        visibleTracks.push(`${getRowHeight(i)}px`)
        // M9 展开内容 track（可展开行后紧跟一条）。
        if (expandEnabled && expandState) {
          const record = dataSource[i]
          if (record !== undefined) {
            const key = getRowKey(record, rowKey)
            if (expandState.isExpandable(key)) {
              visibleTracks.push(expandState.isExpanded(key) ? '1fr' : '0fr')
            }
          }
        }
      }
      bodyTracks = [
        `${virtualState.paddingTop}px`,
        ...visibleTracks,
        `${virtualState.paddingBottom}px`,
      ]
    } else {
      // M9：非虚拟下数据行间穿插展开内容 track（可展开行后插一条 0fr/1fr）。
      //   无展开时退化为 dataSource.map（M0/M1 行为）。
      if (expandEnabled && expandState) {
        const tracks: string[] = []
        dataSource.forEach((record, index) => {
          const baseTrack =
            typeof rowHeight === 'function'
              ? (toTrack(rowHeight(record, index)) ?? 'auto')
              : rowHeight !== undefined
                ? `${rowHeight}px`
                : 'auto'
          tracks.push(baseTrack)
          const key = getRowKey(record, rowKey)
          if (expandState.isExpandable(key)) {
            tracks.push(expandState.isExpanded(key) ? '1fr' : '0fr')
          }
        })
        bodyTracks = tracks
      } else {
        bodyTracks = dataSource.map((record, index) => {
          if (typeof rowHeight === 'function') {
            const v = rowHeight(record, index)
            return toTrack(v) ?? 'auto'
          }
          return rowHeight !== undefined ? `${rowHeight}px` : 'auto'
        })
      }
    }

    const colTracks = leafColumns.map((col) => {
      // M6 隐藏列：该 track 置为 `0fr`（track 仍存在，列线号不变）；与 antd/lun 一致：
      // 通过 CSS transition 在 `.dg-grid` 上实现 0fr↔原宽 的平滑过渡（lun 思路）。
      // 注意：不删除 track（保持线号稳定 → M1/M2/M3 线号均不受隐藏影响）。
      if (col.hidden) return '0fr'
      // M7 列宽拖拽：用户拖拽过的列优先用 resizedWidths（具体 px），覆盖 column.width。
      // 未拖拽过的列保持原逻辑（column.width → max-content）。
      // 这样首次拖拽 max-content 列时，第一次 move 即把该列从 max-content 转为受控 px。
      const resized = resizedWidths.get(col.key)
      if (resized !== undefined) return `${resized}px`
      const w = toTrack(col.width)
      return w ?? 'max-content'
    })

    // 多级表头路径：关闭 auto-flow（用显式 grid-column/grid-row 定位）。
    // 单层路径：保持 grid-auto-flow:column（M0 行为）。
    return {
      gridTemplateRows: [...headerTracks, ...bodyTracks].join(' ') || 'none',
      gridTemplateColumns: colTracks.join(' ') || 'none',
      gridAutoFlow: mode === 'multi' ? undefined : ('column' as const),
    }
  }, [
    mode,
    maxDepth,
    leafColumns,
    dataSource,
    rowHeight,
    headerHeight,
    showHeader,
    virtualEnabled,
    virtualState,
    getRowHeight,
    resizedWidths,
    expandEnabled,
    expandState,
    rowKey,
  ])

  // 整行 hover：记录当前 hover 的数据行 index（null 表示未 hover）。
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null)

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateRows,
    gridTemplateColumns,
    ...(gridAutoFlow ? { gridAutoFlow } : null),
  }

  // === M2 滚动容器 ===
  // `scroll.x` 存在时，grid 包一层 .dg-scroll（overflow-x:auto），grid 自身 min-width=x。
  // 未传 scroll 时不包（M0/M1 零回归）。
  // M4 虚拟：也包一层 .dg-scroll（高度=scroll.y，overflow:auto 双向）。
  const scrollX = scroll?.x
  const scrollMinWidth = scrollX !== undefined ? (typeof scrollX === 'number' ? `${scrollX}px` : scrollX) : undefined
  const useScrollWrapper = scrollX !== undefined
  const gridFinalStyle: CSSProperties = scrollMinWidth
    ? { ...gridStyle, minWidth: scrollMinWidth }
    : gridStyle

  const gridClassName = [
    'dg-grid',
    // M7：拖拽进行中加 dg-grid-resizing 类，禁用 grid-template-columns 过渡
    // （否则拖拽时 0.3s 过渡会与实时更新叠加产生抖动/延迟）。
    resizingKey !== null ? 'dg-grid-resizing' : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  // 渲染表格 grid 内容（multi 与 flat 两路径）；外层滚动包装在 useScrollWrapper 时启用。
  const renderGrid = () => {
    if (mode === 'multi') {
      // 1-based 数据行起始线号。
      // - 非虚拟：headerRowsUsed + index + 1（与 M0/M1/M3 一致）。
      // - 虚拟：headerRowsUsed + 1(paddingTop track) + (index - virtualState.start) + 1
      //   （占位 track 多占一行，数据行向后偏移 1）。
      // - M9 展开启用：数据行间穿插展开内容 track，行线号偏移由 expandLayout 给出。
      const headerRowsUsed = showHeader ? maxDepth : 0
      const rowLineBase = (index: number) => {
        // M9：展开 track 偏移由 expandLayout 预计算（含可展开行多占的展开 track）。
        const fromExpand = expandLayout.layout.get(index)
        if (fromExpand) return fromExpand.rowLine
        // 无展开 / 兜底：退化为原计算（与 M0/M1/M3 一致）。
        return virtualEnabled
          ? headerRowsUsed + 1 + (index - virtualState.start) + 1
          : headerRowsUsed + index + 1
      }
      return (
        <div className={gridClassName} style={gridFinalStyle} ref={gridRef}>
          {/* 表头区：显式定位的表头格（sticky 信息来自 headerSticky）。
              M3：跳过 covered 表头格（被前面的 colSpan>1 表头覆盖，不渲染 DOM）。
              M4 虚拟 / M8 非 virtual scroll.y：表头格额外 position:sticky; top:0（z-index 4），
              相对滚动容器顶部固定（由 headerStickyTop 标志统一驱动）。 */}
          {showHeader
            ? headerCells.map((cell) =>
                cell.covered ? null : (
                  <HeaderCell
                    key={`h-${cell.key}`}
                    cell={cell}
                    sticky={headerSticky.get(cell.key)}
                    headerStickyTop={headerStickyTop}
                    resizeEnabled={resizeEnabled}
                    onResizerPointerDown={onResizerPointerDown}
                    resizingKey={resizingKey}
                    onSorterClick={onSorterClick}
                    onFilterApply={onFilterApply}
                  />
                ),
              )
            : null}
          {/* 数据区：按叶子列 × 数据行显式定位（sticky 来自 leafSticky[colIdx]）。
              M3：cellMergePlan 驱动——
                - hidden 格**不渲染 DOM**（避免 grid 空洞/重叠）。
                - 非隐藏格设 grid-column/grid-row 的 span（左上角格跨多列/多行）。
                - 合并格若落在固定列区域，sticky 偏移取左上角列（colIdx）的 leafSticky，
                  自然正确（被覆盖格不渲染，仅左上角格渲染并整体固定）。
              M4 虚拟：只遍历 [virtualState.start, virtualState.end) 的数据行；其余由占位 track 撑总高。
                ★ 已知简化：若某 rowSpan>1 的左上角在可视区**外**（start 之前），其延伸到
                可视区内的覆盖格本就不渲染（hidden），故可视区会出现"缺一块"。详见文件头 M4 注释。 */}
          {leafColumns.map((column, colIdx) => {
            // 虚拟模式下只遍历可视区行；非虚拟遍历全集。
            const lo = virtualEnabled ? virtualState.start : 0
            const hi = virtualEnabled ? virtualState.end : dataSource.length
            const cells: Array<ReactNode> = []
            for (let index = lo; index < hi; index += 1) {
              const record = dataSource[index]
              if (record === undefined) continue
              const merge: CellMergeInfo | undefined =
                cellMergePlan?.[colIdx]?.[index]
              // M3：被覆盖格跳过渲染。
              if (merge?.hidden) continue
              const colSpan = merge?.colSpan ?? 1
              // M3 + M9：合并格纵向 span 需考虑合并范围内每行是否带展开内容 track。
              //   合并格原本 rowSpan=N（跨 N 个数据行）；M9 展开启用时，合并范围内每行若可展开
              //   会多占一条展开内容 track（0fr/1fr），合并格需相应延长 span 以正确覆盖整个矩形
              //   （否则展开 track 会把下半部分数据行挤出合并区，合并格视觉只盖住上半部分）。
              //   实现：rowSpanTracks = rowSpan(数据行) + 合并范围内可展开行数（每行 +1 展开 track）。
              //   注：展开 track 始终存在（不论展开/收起），故此计算与展开态无关——span 稳定。
              let rowSpanTracks = merge?.rowSpan ?? 1
              if (rowSpanTracks > 1 && expandEnabled && expandState) {
                let extraTracks = 0
                for (let r = index; r < index + rowSpanTracks && r < dataSource.length; r += 1) {
                  const rec = dataSource[r]
                  if (rec === undefined) continue
                  if (expandState.isExpandable(getRowKey(rec, rowKey))) extraTracks += 1
                }
                rowSpanTracks += extraTracks
              }
              const text = getValueByDataIndex(record, column.dataIndex)
              const rendered: ReactNode = column.render
                ? column.render(text, record, index)
                : text
              const isHovered = hoveredRowIndex === index
              const rowLine = rowLineBase(index)
              const info = leafSticky[colIdx]
              // S1：当前排序列的单元格加 dg-column-sort（淡灰背景，对齐 antd tableBodySortBg）。
              const isSortedColumn =
                !!column.sorter && column.sortOrder !== null && column.sortOrder !== undefined
              cells.push(
                <div
                  key={`b-${colIdx}-${getRowKey(record, rowKey) ?? index}`}
                  className={[
                    'dg-cell',
                    'dg-cell-body',
                    column.rowScope === 'row' ? 'dg-cell-rowscope' : undefined,
                    fixedClass(column.fixed),
                    shadowClass(info),
                    // M6：隐藏列的单元格仍渲染（维持 grid track 占位以保持线号稳定），
                    // 但内容 visibility:hidden + overflow:hidden，track 0fr 使其不可见。
                    column.hidden ? 'dg-cell-hidden' : undefined,
                    // S1：当前排序列的表体格加 dg-column-sort（淡灰底，对齐 antd tableBodySortBg）。
                    isSortedColumn ? 'dg-column-sort' : undefined,
                    isHovered ? 'dg-row-hover' : undefined,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  data-align={column.align ?? undefined}
                  data-row-index={index}
                  style={{
                    gridColumn:
                      colSpan > 1 ? `${colIdx + 1} / span ${colSpan}` : `${colIdx + 1}`,
                    gridRow:
                      rowSpanTracks > 1
                        ? `${rowLine} / span ${rowSpanTracks}`
                        : `${rowLine}`,
                    ...(column.align ? { textAlign: column.align } : null),
                    ...stickyCellStyle(info),
                  }}
                  onMouseEnter={() => setHoveredRowIndex(index)}
                  onMouseLeave={() => setHoveredRowIndex(null)}
                >
                  <div className="dg-cell-inner">{rendered}</div>
                </div>,
              )
            }
            return cells
          })}
          {/* M9 行展开内容：每个可展开 + 展开中的数据行渲染一条展开内容 grid item，
              grid-column: 1 / -1 跨整行，grid-row 指向该行下方的展开内容 track。
              track size 已由 grid-template-rows 设为 1fr（展开）/0fr（收起），这里只渲染内容容器。
              容器 overflow:hidden + min-height:0——0fr track 下被裁剪不可见，1fr track 下自然展开。
              ★ 决策 2（虚拟 × 展开）：展开内容只在可视区数据行范围内渲染（与数据行同窗口），
              虚拟窗口大小仍按收起态算（不受展开影响）。 */}
          {expandEnabled && expandState
            ? renderExpandedContents({
                dataSource,
                virtualEnabled,
                virtualState,
                expandState,
                expandLayout: expandLayout.layout,
                rowKey,
              })
            : null}
        </div>
      )
    }

    // 单层快速路径（M0 行为）：grid-auto-flow:column，每列 DOM 连续。
    // 注意：M4 虚拟模式下不会走到这里（虚拟强制 multi）。
    return (
      <div className={gridClassName} style={gridFinalStyle} ref={gridRef}>
        {leafColumns.map((column, colIdx) => (
          <ColumnCells<RecordType>
            key={column.key}
            column={column}
            colIdx={colIdx}
            dataSource={dataSource}
            rowKey={rowKey}
            showHeader={showHeader}
            hoveredRowIndex={hoveredRowIndex}
            onHoverRow={setHoveredRowIndex}
            sticky={leafSticky[colIdx]}
            headerStickyTop={headerStickyTop}
            resizeEnabled={resizeEnabled}
            onResizerPointerDown={onResizerPointerDown}
            resizingKey={resizingKey}
            onSorterClick={onSorterClick}
            onFilterApply={onFilterApply}
          />
        ))}
      </div>
    )
  }

  // M4 虚拟滚动：必须包滚动容器（高度=scroll.y，overflow-y:auto；overflow-x 视 scroll.x）。
  if (virtualEnabled) {
    return (
      <div
        className="dg-scroll dg-virtual-scroll"
        ref={virtualScrollRef}
        style={{
          height: typeof scrollY === 'number' ? `${scrollY}px` : undefined,
          overflowY: 'auto',
          overflowX: scrollMinWidth ? 'auto' : 'hidden',
        }}
      >
        {renderGrid()}
      </div>
    )
  }

  // === M8 固定表头（非 virtual）：表体限高纵向滚动 + 表头 sticky top ===
  // 包一层 .dg-scroll，max-height = scroll.y（number→px，string→原样），overflow-y:auto。
  // overflow-x 由 scroll.x / hasFixed 决定（与 M2 一致）。
  // 表头 sticky 由 headerStickyTop 标志驱动（见上方派生），与本容器配合实现"表头钉顶"。
  if (scrollYNonVirtual) {
    const maxHeight =
      typeof scrollY === 'number' ? `${scrollY}px` : (scrollY as string)
    return (
      <div
        className="dg-scroll dg-fixed-header-scroll"
        style={{
          maxHeight,
          overflowY: 'auto',
          overflowX: scrollMinWidth || hasFixed ? 'auto' : 'hidden',
        }}
      >
        {renderGrid()}
      </div>
    )
  }

  // 没有固定列且未要求滚动 → 直接渲染（与 M0/M1 完全等价，无多余包装）。
  if (!useScrollWrapper && !hasFixed) {
    return renderGrid()
  }

  // 否则包一层滚动容器（scrollX 决定是否横向滚动；hasFixed 时也包一层便于 sticky 生效——
  // sticky 需要一个可滚动祖先；当未给 scroll.x 但有 fixed 列时，给一个 overflow-x:auto 兜底，
  // 与 antd "未指定 scroll.x 时 fixed 列不生效"行为略有差异（antd 在无 scroll.x 时 fixed 列
  // 会被渲染为普通列）。这里选择更宽容的行为：有 fixed 列即允许横向滚动。）
  return (
    <div className="dg-scroll" style={useScrollWrapper ? undefined : { overflowX: 'auto' }}>
      {renderGrid()}
    </div>
  )
}

/**
 * M9 行展开内容渲染（multi 路径专用；flat 路径不启用展开——展开强制 multi）。
 *
 * 遍历可视区（虚拟）或全集（非虚拟）数据行，对"可展开 + 展开中"的行渲染一个展开内容 grid item：
 *   - grid-row：该行展开内容 track 的起始线（来自 expandLayout）。
 *   - grid-column: 1 / -1：跨整行（与 antd expandedRowRender 视觉一致）。
 *   - 容器 `overflow:hidden + min-height:0`：配合 track 0fr/1fr 过渡——0fr 时被裁剪、1fr 时自然展开。
 *
 * 收起的可展开行不渲染内容（节省 DOM）——track 仍存在（0fr）但无 grid item 占位，
 * 因为 0fr track 高度为 0，没有 grid item 也不影响布局。
 *
 * 注意：展开 track 在 grid-template-rows 中已定义为 1fr/0fr；这里只渲染内容容器 grid item。
 * 即便某行收起（track 0fr），渲染内容容器也无妨（会被 overflow:hidden 裁剪到 0），但为省 DOM，
 * 仅展开的行才渲染（与 antd rc-table 行为一致：展开才 mount 内容）。
 */
function renderExpandedContents<RecordType>({
  dataSource,
  virtualEnabled,
  virtualState,
  expandState,
  expandLayout,
  rowKey,
}: {
  dataSource: Array<RecordType>
  virtualEnabled: boolean
  virtualState: { start: number; end: number }
  expandState: EngineExpandState
  expandLayout: Map<number, { rowLine: number; expandTrackLine?: number }>
  rowKey: string | ((record: RecordType) => string | number)
}): Array<ReactNode> {
  const out: Array<ReactNode> = []
  const lo = virtualEnabled ? virtualState.start : 0
  const hi = virtualEnabled ? virtualState.end : dataSource.length
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
          gridColumn: '1 / -1',
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

/** 多级表头路径的表头格：显式 grid-column / grid-row。
 *
 * 对齐与占位（M1 视觉修复）：
 * - 格子始终 stretch 占满跨列 grid-area（不设 justifySelf），使 .dg-cell-header-group 的
 *   背景/底线/hover 覆盖整个 colspan 区域（与 antd <th> table-cell 占满 colspan 一致）。
 * - 文字/内容居中仅靠 flex `justify-content`（.dg-cell[data-align] / .dg-cell-header-group）
 *   + 内联 textAlign，不再用 justifySelf（后者会让 grid item 收缩到内容宽度）。
 *
 * M2：叶子表头格携带 `data-leaf-index`（供 ResizeObserver 测量列宽）；
 *     sticky 信息（offset/side）来自 headerSticky；边缘阴影由 shadowClass 加。 */
function HeaderCell<RecordType>({
  cell,
  sticky,
  headerStickyTop,
  resizeEnabled,
  onResizerPointerDown,
  resizingKey,
  onSorterClick,
  onFilterApply,
}: {
  cell: EngineHeaderCell<RecordType>
  sticky?: { side: FixedSide; offset: number; isEdge: boolean }
  /**
   * 表头纵向 sticky（M4 虚拟 + M8 非虚拟 scroll.y 共用）。
   *
   * `true` 时表头格额外 `position: sticky; top: 0`（相对滚动容器顶部固定，使表头不随纵向
   * 滚动消失）。z-index 提高到 4，高于表体（2）与表头横向固定（3）。
   *
   * 触发场景：
   *   - M4 虚拟滚动（virtual=true && scroll.y 为 number）：`.dg-virtual-scroll` 承载纵向滚动。
   *   - M8 固定表头（非 virtual && scroll.y 存在）：`.dg-scroll` 承载纵向滚动（max-height=scroll.y）。
   *
   * 与 M2 横向 sticky 共存（corner cell）：单个元素可同时 sticky left + top（浏览器原生支持；
   * antd rc-table corner cell 同款实现）。zIndex 取纵向（4）> 横向（3）。
   */
  headerStickyTop?: boolean
  /** M7：是否启用列宽拖拽（仅在叶子表头格渲染 resizer）。 */
  resizeEnabled?: boolean
  /** M7：resizer pointerdown 回调（参数为列 key）。 */
  onResizerPointerDown?: (key: string) => (event: React.PointerEvent<HTMLDivElement>) => void
  /** M7：当前正在拖拽的列 key（视觉反馈）。 */
  resizingKey?: string | null
  /** S1：排序点击回调（参数为列 key）。仅可排序叶子表头格响应。 */
  onSorterClick?: (columnKey: string) => void
  /** S3：筛选应用回调（参数：列 key + 新筛选值数组）。仅可筛选叶子表头格触发。 */
  onFilterApply?: (filterKey: string, nextFilteredValue: Array<string | number>) => void
}) {
  // 分组表头格默认居中（与 antd 多级表头一致）；叶子表头格保留列对齐。
  // M3：表头横向合并格（headerColSpan>1）也居中（跨多列的表头，与 antd <th colspan> 一致）。
  const headerSpan = cell.headerColSpan ?? 1
  const selfAlign: Align | undefined = cell.isLeaf
    ? headerSpan > 1
      ? 'center'
      : cell.align
    : 'center'
  // 合并 sticky 样式：M2 横向（左/右）+ 纵向 top:0（M4/M8）。
  const horizontalSticky = stickyHeaderCellStyle(sticky)
  const verticalSticky: CSSProperties = headerStickyTop
    ? { position: 'sticky', top: 0, zIndex: 4 }
    : {}
  // 同元素同时有横向 sticky 与纵向 sticky 时，position/left/zIndex 由横向样式给出，
  // 这里再 merge 纵向 top/zIndex（纵向 z-index 优先级更高，覆盖横向 z-index）。
  const mergedSticky: CSSProperties = { ...horizontalSticky, ...verticalSticky }
  // S1：该表头格是否可排序（仅叶子表头格；分组格无排序）。
  const sortable = cell.isLeaf && cell.sortable === true && !cell.hidden
  // S1：当前排序态（null/ascend/descend）；仅可排序格有意义。
  const sortOrder = sortable ? (cell.sortOrder ?? null) : null
  // S1：是否为当前激活排序列（order 非 null）→ 加 dg-column-sort 类（表头/表体背景变淡灰）。
  const isSorted = sortable && sortOrder !== null
  // S3：该表头格是否可筛选（仅叶子表头格；分组格无筛选）。
  const filterable = cell.isLeaf && cell.filterable === true && !cell.hidden
  // 表头格内部是否需要"右侧操作区"（sorter caret / filter 漏斗）。
  // sortable 或 filterable 任一为 true → 用 dg-column-sorters flex 容器（title + 右侧图标）。
  const hasActions = sortable || filterable
  return (
    <div
      className={[
        'dg-cell',
        'dg-cell-header',
        cell.isLeaf ? undefined : 'dg-cell-header-group',
        fixedClass(cell.fixed),
        shadowClass(sticky),
        // M6：隐藏叶子列的表头格加 dg-cell-hidden（内容不可见；track 0fr 占位保持线号稳定）。
        cell.hidden ? 'dg-cell-hidden' : undefined,
        // M4/M8 表头纵向 sticky：补不透明背景（防止表体透过）+ 配合 inline position/top/zIndex。
        headerStickyTop ? 'dg-cell-header-vsticky' : undefined,
        // S1：可排序列表头格加 dg-column-has-sorters（cursor:pointer + hover 背景）。
        sortable ? 'dg-column-has-sorters' : undefined,
        // S3：可筛选列表头格加 dg-column-has-filter（hover 背景 + 漏斗区域视觉提示）。
        filterable ? 'dg-column-has-filter' : undefined,
        // S1：当前排序列表头格加 dg-column-sort（淡灰背景，对齐 antd tableHeaderSortBg）。
        isSorted ? 'dg-column-sort' : undefined,
      ]
        .filter(Boolean)
        .join(' ')}
      data-align={selfAlign ?? undefined}
      data-leaf={cell.isLeaf ? '1' : '0'}
      data-leaf-index={cell.isLeaf && cell.leafIndex !== undefined ? String(cell.leafIndex) : undefined}
      data-column-key={cell.isLeaf ? cell.key : undefined}
      data-sorter-order={isSorted ? (sortOrder ?? undefined) : undefined}
      // S1：showSorterTooltip（非 false）→ hover 提示。简单实现为原生 title（对齐 antd 默认 locale：
      //   ascend → "Click to sort descending"，descend → "Cancel sorting"，null → "Click to sort ascending"）。
      //   完整 Tooltip + target 区分（full-header / sorter-icon）留后续视觉打磨。
      title={
        sortable && cell.showSorterTooltip !== false
          ? sortOrder === 'ascend'
            ? 'Click to sort descending'
            : sortOrder === 'descend'
              ? 'Cancel sorting'
              : 'Click to sort ascending'
          : undefined
      }
      style={{
        gridColumn: `${cell.gridColumnStart} / ${cell.gridColumnEnd}`,
        gridRow: `${cell.gridRowStart} / ${cell.gridRowEnd}`,
        ...(selfAlign ? { textAlign: selfAlign } : null),
        ...mergedSticky,
      }}
      // S1：可排序列表头格点击触发排序循环。
      // 注意：filter trigger（FilterDropdown）内部已 stopPropagation，点击漏斗不会触发排序。
      onClick={
        sortable && onSorterClick
          ? (e) => {
              // 避免 resizer 手柄点击（M7）/ 链接冒泡误触发排序。
              // resizer 自身有 onClick stopPropagation，这里无需额外处理；
              // 但表头格内若有 <a> 等可点击元素，仍会冒泡——antd 行为：点击表头任意位置都触发排序，
              // 这里与 antd 一致（整表头格都是排序点击区）。
              //
              // ★ Bug-B 防御：仅当点击事件 target 真正落在本表头格内部时才触发排序。
              //   antd Dropdown 弹出层 portaled 到 body，正常情况下点击 OK/Checkbox 不会冒泡到表头格；
              //   但 React 17+ 根委托 + 弹出层在 click 分发途中卸载的边界下，残余 click 可能落到表头格
              //   坐标处（target 仍是弹出层内的元素）。用 currentTarget.contains(target) 判定可彻底
              //   切断这种"幽灵点击"误触发排序（Bug-B 现象 3 的根因）。
              if (!e.currentTarget.contains(e.target as Node)) return
              e.stopPropagation()
              onSorterClick(cell.key)
            }
          : undefined
      }
    >
      {hasActions ? (
        // S1/S3：可排序或可筛选列用 dg-column-sorters 容器（flex space-between：title + 右侧操作区）。
        // 右侧操作区含 sorter caret（S1/S2）+ filter 漏斗（S3），对齐 antd 同时有 sorter+filter 的列表头布局。
        <div className="dg-column-sorters">
          <div className="dg-column-title">{cell.title ?? null}</div>
          <div className="dg-column-actions">
            {sortable ? (
              <SortIndicator sortOrder={sortOrder} priority={cell.sortPriority} />
            ) : null}
            {filterable && cell.filters && onFilterApply ? (
              <FilterDropdown
                filters={cell.filters}
                filterMultiple={cell.filterMultiple ?? true}
                filteredValue={cell.filteredValue ?? null}
                filterOnClose={cell.filterOnClose ?? true}
                onApply={(next) => onFilterApply(cell.key, next)}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="dg-cell-inner">{cell.title ?? null}</div>
      )}
      {/* M7 列宽拖拽 resizer：仅在叶子表头格 + 非隐藏列 + resizeEnabled 时渲染。
          分组表头格（isLeaf=false）无 resizer；隐藏列（cell.hidden）0fr track 无可调宽度。 */}
      {resizeEnabled && cell.isLeaf && !cell.hidden && onResizerPointerDown ? (
        <ColumnResizer
          columnKey={cell.key}
          active={resizingKey === cell.key}
          onPointerDown={onResizerPointerDown(cell.key)}
        />
      ) : null}
    </div>
  )
}

interface ColumnCellsProps<RecordType> {
  column: EngineLeafColumn<RecordType>
  /** 叶子列索引（用于 ResizeObserver 测量标记与 sticky 取值）。 */
  colIdx: number
  dataSource: Array<RecordType>
  rowKey: string | ((record: RecordType) => string | number)
  showHeader: boolean
  hoveredRowIndex: number | null
  onHoverRow: (index: number | null) => void
  /** M2 sticky 信息（来自 useStickyColumns.leafSticky[colIdx]）。 */
  sticky?: LeafStickyInfo
  /**
   * 表头纵向 sticky（M4 虚拟 + M8 非虚拟 scroll.y 共用）。详见 HeaderCell 同名 prop。
   * flat 路径下表头格由本组件渲染，此处同样需要应用 sticky top（M8 非 virtual 时
   * flat 路径会启用——无合并/多级 + scroll.y 仍走 flat，表头仍要固定）。
   */
  headerStickyTop?: boolean
  /** M7：是否启用列宽拖拽。 */
  resizeEnabled?: boolean
  /** M7：resizer pointerdown 回调（参数为列 key）。 */
  onResizerPointerDown?: (key: string) => (event: React.PointerEvent<HTMLDivElement>) => void
  /** M7：当前正在拖拽的列 key（视觉反馈）。 */
  resizingKey?: string | null
  /** S1：排序点击回调（参数为列 key）。仅可排序列响应。 */
  onSorterClick?: (columnKey: string) => void
  /** S3：筛选应用回调（参数：列 key + 新筛选值数组）。仅可筛选列触发。 */
  onFilterApply?: (filterKey: string, nextFilteredValue: Array<string | number>) => void
}

/** 单层路径（grid-auto-flow:column）的列渲染：表头格 + 每数据行格。
 *
 * 对齐：格子始终 stretch 占满列宽（不设 justifySelf），文字/内容对齐仅靠
 * .dg-cell[data-align] 的 flex justify-content + 内联 textAlign（与 antd 一致：
 * align 只控制文字，格子占满）。
 *
 * M2：表头格带 `data-leaf-index` 供 ResizeObserver 测量；sticky 来自 prop。
 * M8：表头格同样支持纵向 sticky top（与 multi 路径 HeaderCell 同款机制）。 */
function ColumnCells<RecordType>(props: ColumnCellsProps<RecordType>) {
  const {
    column,
    colIdx,
    dataSource,
    rowKey,
    showHeader,
    hoveredRowIndex,
    onHoverRow,
    sticky,
    headerStickyTop,
    resizeEnabled,
    onResizerPointerDown,
    resizingKey,
    onSorterClick,
    onFilterApply,
  } = props

  // 合并 sticky 样式：M2 横向（左/右）+ M8/M4 纵向 top:0（与 HeaderCell 同款合并逻辑）。
  const horizontalSticky = stickyHeaderCellStyle(sticky)
  const verticalSticky: CSSProperties = headerStickyTop
    ? { position: 'sticky', top: 0, zIndex: 4 }
    : {}
  const mergedHeaderSticky: CSSProperties = { ...horizontalSticky, ...verticalSticky }

  // S1：该列是否可排序 + 当前排序态（与 HeaderCell 同款逻辑）。
  const sortable =
    !!column.sorter && !column.hidden &&
    (column.sorter === true || typeof column.sorter === 'function' || (typeof column.sorter === 'object' && column.sorter !== null))
  const sortOrder = sortable ? (column.sortOrder ?? null) : null
  const isSorted = sortable && sortOrder !== null
  // S3：该列是否可筛选（filters 非空 + onFilter；与 HeaderCell 同款逻辑）。
  const filterable =
    !column.hidden &&
    !!column.filters &&
    column.filters.length > 0 &&
    typeof column.onFilter === 'function'
  // 表头格内部是否需要"右侧操作区"（sorter / filter）。
  const hasActions = sortable || filterable

  return (
    <>
      {showHeader ? (
        <div
          className={[
            'dg-cell',
            'dg-cell-header',
            fixedClass(column.fixed),
            shadowClass(sticky),
            column.hidden ? 'dg-cell-hidden' : undefined,
            headerStickyTop ? 'dg-cell-header-vsticky' : undefined,
            sortable ? 'dg-column-has-sorters' : undefined,
            filterable ? 'dg-column-has-filter' : undefined,
            isSorted ? 'dg-column-sort' : undefined,
          ]
            .filter(Boolean)
            .join(' ')}
          data-align={column.align ?? undefined}
          data-leaf-index={String(colIdx)}
          data-column-key={column.key}
          data-sorter-order={isSorted ? (sortOrder ?? undefined) : undefined}
          // S1：showSorterTooltip hover 提示（简单 title，详见 HeaderCell 同款注释）。
          title={
            sortable && column.showSorterTooltip !== false
              ? sortOrder === 'ascend'
                ? 'Click to sort descending'
                : sortOrder === 'descend'
                  ? 'Cancel sorting'
                  : 'Click to sort ascending'
              : undefined
          }
          style={{
            ...(column.align ? { textAlign: column.align } : null),
            ...mergedHeaderSticky,
          }}
          onClick={
            sortable && onSorterClick
              ? (e) => {
                  // ★ Bug-B 防御：仅当点击 target 真正落在本表头格内部时才触发排序（同非虚拟分支）。
                  if (!e.currentTarget.contains(e.target as Node)) return
                  e.stopPropagation()
                  onSorterClick(column.key)
                }
              : undefined
          }
        >
          {hasActions ? (
            <div className="dg-column-sorters">
              <div className="dg-column-title">{column.title ?? null}</div>
              <div className="dg-column-actions">
                {sortable ? (
                  <SortIndicator sortOrder={sortOrder} priority={column.sortPriority} />
                ) : null}
                {filterable && column.filters && onFilterApply ? (
                  <FilterDropdown
                    filters={column.filters}
                    filterMultiple={column.filterMultiple ?? true}
                    filteredValue={column.filteredValue ?? null}
                    filterOnClose={column.filterOnClose ?? true}
                    onApply={(next) => onFilterApply(column.key, next)}
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <div className="dg-cell-inner">{column.title ?? null}</div>
          )}
          {/* M7 列宽拖拽 resizer：非隐藏列 + resizeEnabled 时渲染。 */}
          {resizeEnabled && !column.hidden && onResizerPointerDown ? (
            <ColumnResizer
              columnKey={column.key}
              active={resizingKey === column.key}
              onPointerDown={onResizerPointerDown(column.key)}
            />
          ) : null}
        </div>
      ) : null}

      {dataSource.map((record, index) => {
        const text = getValueByDataIndex(record, column.dataIndex)
        const rendered: ReactNode = column.render
          ? column.render(text, record, index)
          : text
        const isHovered = hoveredRowIndex === index
        return (
          <div
            key={getRowKey(record, rowKey) ?? index}
            className={[
              'dg-cell',
              'dg-cell-body',
              fixedClass(column.fixed),
              shadowClass(sticky),
              column.hidden ? 'dg-cell-hidden' : undefined,
              // S1：当前排序列的表体格加 dg-column-sort（淡灰底，对齐 antd tableBodySortBg）。
              isSorted ? 'dg-column-sort' : undefined,
              isHovered ? 'dg-row-hover' : undefined,
            ]
              .filter(Boolean)
              .join(' ')}
            data-align={column.align ?? undefined}
            data-row-index={index}
            style={{
              ...(column.align ? { textAlign: column.align } : null),
              ...stickyCellStyle(sticky),
            }}
            onMouseEnter={() => onHoverRow(index)}
            onMouseLeave={() => onHoverRow(null)}
          >
            <div className="dg-cell-inner">{rendered}</div>
          </div>
        )
      })}
    </>
  )
}

/**
 * M7 列宽拖拽 resizer 手柄。
 *
 * 渲染在叶子表头格**右侧边缘**（绝对定位 `inset-inline-end:0`），默认透明且 pointer-events:none，
 * 表头 hover 时显形并接收事件。pointerdown 由 `useColumnResize.onPointerDown(key)` 处理
 * （setPointerCapture + 原生 move/up 监听 → 实时改 resizedWidths → 重算 grid-template-columns）。
 *
 * 详见 `useColumnResize.ts` 文件头注释。
 *
 * 仅在 `resizeEnabled === true` 且**非隐藏列**时渲染（隐藏列 0fr track 无可调宽度）。
 * 分组表头格（M1）不渲染 resizer（无对应单一叶子列）。
 */
function ColumnResizer({
  columnKey,
  active,
  onPointerDown,
}: {
  columnKey: string
  /** 是否正在拖拽该列（视觉反馈：加 dg-resizer-active 类）。 */
  active: boolean
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      className={['dg-resizer', active ? 'dg-resizer-active' : undefined]
        .filter(Boolean)
        .join(' ')}
      // pointerdown 触发拖拽（useColumnResize 内部 setPointerCapture + 注册 move/up）。
      onPointerDown={onPointerDown}
      // 阻止 click 冒泡到表头格（避免触发后续排序等 header click 交互）。
      onClick={(e) => e.stopPropagation()}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
      data-column-key={columnKey}
    />
  )
}

function fixedClass(fixed: FixedSide | undefined): string | undefined {
  if (fixed === 'start') return 'dg-cell-fixed-start'
  if (fixed === 'end') return 'dg-cell-fixed-end'
  return undefined
}

/**
 * M2 固定列边缘阴影 class：
 * - 'start' 侧且 isEdge（start 侧最右一列，与普通列交界）→ 'dg-sticky-shadow-start'
 *   （右侧画淡阴影，提示其右还有可滚动内容）。
 * - 'end' 侧且 isEdge（end 侧最左一列）→ 'dg-sticky-shadow-end'
 *   （左侧画淡阴影）。
 *
 * 参数同时兼容 LeafStickyInfo（leafSticky 项）与 headerSticky 的简化对象（{side,isEdge}）。
 */
function shadowClass(
  info: { side?: FixedSide; isEdge?: boolean } | undefined,
): string | undefined {
  if (!info || !info.side || !info.isEdge) return undefined
  return info.side === 'start' ? 'dg-sticky-shadow-start' : 'dg-sticky-shadow-end'
}

// 仅为兼容潜在的外部导入（columnTree 类型）；引擎外部应通过 Table.tsx 适配层使用。
export type { EngineColumnNode }
