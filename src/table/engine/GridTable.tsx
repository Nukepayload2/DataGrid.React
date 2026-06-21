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
 * 触发条件：`virtual === true && scroll.y === true`（决策 7：scroll.y 仅 true/undefined）。
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
 * 触发条件：`!virtual && scroll.y === true`（决策 7）。区别于 M4：表体**全量渲染**（不做虚拟
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
 * 2. **滚动容器**（决策 7 CSS 自动适应高度）：M8 下 `.dg-scroll` 同时承载横向（scroll.x / fixed）
 *    与纵向（scroll.y===true）滚动：
 *      - `flex:1; min-height:0`（CSS 自动适应高度——填满 `.dg-wrapper.dg-data-area` 的剩余空间，
 *        父容器需有明确 height；**不用 JS 算数字**）。
 *      - `overflow-y: auto`（启用纵向滚动）。
 *      - `overflow-x`：由 scroll.x 决定（与 M2 一致）。
 *    `.dg-grid` 仍由 grid-template-rows 自适应表头 + 全量数据行总高，浏览器原生滚动条正确
 *    （视觉由 #35 FloatingScrollBar 替代）。
 *
 * 3. **corner cell（双 sticky + 最高 z-index）**：M8 × M2 组合（表头 sticky top + 列 sticky left/right）
 *    时，左上/右上角的表头格**同时** sticky left（M2）+ sticky top（M8）。本引擎天然支持——
 *    HeaderCell 内 `horizontalSticky`（来自 headerSticky，left/right + zIndex 3）与
 *    `verticalSticky`（top + zIndex 4）合并到同一元素的 style；浏览器对单元素 sticky left+top
 *    原生支持（与 antd rc-table corner cell 同款）。**角单元格 z-index 取最高（5）**——当横向+纵向
 *    sticky 同时存在时，覆盖纵向的 4 为 5，保证角单元格在双向滚动时都盖住下层：
 *    表体固定列 zIndex 2、表头固定列 zIndex 3、普通表头顶 zIndex 4、corner 双 sticky zIndex 5。
 *    修复 bug：仅取纵向（4）会与中间表头格（4）同级，横向滚动时中间表头格盖住 corner cell。
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
  cloneElement,
  forwardRef,
  useCallback,
  useEffect,
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
import { parseSummaryNode } from './Summary'
import type {
  Align,
  EngineColumnNode,
  EngineExpandState,
  EngineHeaderCell,
  EngineLeafColumn,
  EngineTableProps,
  EngineTreeState,
  FixedSide,
} from './types'
// ★ 接口全兼容（决策 3 第二步）：onHeaderCell 签名 `(column) => HTMLAttributes` 的 column 类型。
//   用 ColumnType 表达（与对外 types.ts 一致），仅 type-only。
import type { ColumnType } from '../types'
import { ExpandIcon } from './ExpandIcon'
import { FloatingScrollBar } from './FloatingScrollBar'

/**
 * === S15 自定义组件（components.body.cell / components.body.row）渲染辅助 ===
 *
 * data-grid 用 div 渲染单元格（`.dg-cell`，非 antd 的 `<td>`）。components 机制适配如下：
 *
 * 1. **components.body.cell**：当提供时，dg-cell div 的**内部内容**（即 `.dg-cell-inner` 位置）
 *    用 cell 组件渲染。cell 组件签名建议对齐 antd v6：接收 props
 *    `{ children, record, index, dataIndex, ...onCell返回值 }`，返回 **ReactNode（单元格内容）**
 *    （放进 dg-cell div 内，而非整个 td——因 data-grid 无 td）。
 *    - `children`：默认渲染内容（= column.render 的结果 或 dataIndex 取值）。
 *    - 其余字段透传：record / index / dataIndex + onCell 返回值的全部字段（除 colSpan/rowSpan）。
 *
 *    ★ 与 antd 差异：antd 的 EditableCell demo 返回 `<td>`；data-grid 复刻时 EditableCell 改为
 *      返回内容 ReactNode（去掉 td 外壳），其余逻辑（editing 态 / Form.Item / Input / save）照搬。
 *
 * 2. **components.body.row**：当提供时，每行渲染一个包裹层组件（包裹该行所有单元格）。
 *    - 典型用法：EditableRow（包 antd Form + Context.Provider 透传给 cell）。
 *    - ★ 与 antd 差异：data-grid 行不由单一 `<tr>` 元素包裹（单元格是 grid item）；
 *      实现：渲染一个透明包裹层组件（其内部渲染该行单元格）。包裹层本身不参与 grid 定位
 *      （用 React.Fragment 或无样式 div），单元格仍按 grid 定位渲染。
 *      注意：grid 布局下，grid item 必须是 grid 容器的**直接子元素**。若用 div 包裹会破坏
 *      grid 定位（单元格不再是 grid 直接子元素）。故 data-grid 的 body.row 实现：
 *      **不真正包裹 DOM**，而是把 row 组件作为"上下文提供者"——用 React.cloneElement 或
 *      Context 包裹该行的单元格内容渲染。最简方案：row 组件以 React.Fragment 形式存在，
 *      其内部 `<RowComponent>{children}</RowComponent>`，children 是该行所有单元格。
 *      但 Fragment 会让单元格成为 grid 直接子元素（Fragment 不产生 DOM），满足 grid 布局。
 *      实测：React.Fragment 作为 grid 容器子元素时，其 children 会被"穿透"为 grid 直接子元素——
 *      这是 React 的特性（Fragment 不渲染真实 DOM）。故 body.row 组件内部用 Fragment 即可。
 *
 * 3. **onCell 返回值透传**：onCell(record, index) 返回值除 colSpan/rowSpan（M3 已用）外，
 *    其余字段透传给 components.body.cell props（与 antd v6 一致：additionalProps 合并到 cell）。
 *
 * 4. **shouldCellUpdate**：column.shouldCellUpdate（(prev, next) => boolean）用于 cell 内容 memo。
 *    仅当 components.body.cell 提供时消费（默认渲染路径不消费，零回归）。实现：用 React.memo
 *    包裹 cell 内容渲染组件，比较函数用 shouldCellUpdate（比较 record 字段）。
 *
 * 5. **回归保证**：components 未提供时，所有渲染走默认路径（直接渲染 rendered 内容），
 *    与 S15 之前完全一致。onCell 仍可能存在（M3 合并用），但无 components 时 onCell 的其余
 *    字段被忽略（仅取 colSpan/rowSpan）——与 M3 行为一致。
 */

/**
 * 单元格内容渲染（应用 components.body.cell）。
 *
 * 若提供 components.body.cell：用它渲染，props 含 children + record + index + dataIndex +
 * onCell 返回值的其余字段 + shouldCellUpdate（透传，供 cell 组件按需 memo）。否则直接返回默认
 * 内容（rendered）。
 *
 * `onCellProps` 为 column.onCell(record, index) 的完整返回值（GridTable 渲染时单独调用取）；
 * 仅 colSpan/rowSpan 由 cellMerge 消费，这里把**完整返回值**透传给 cell 组件（含 colSpan/rowSpan，
 * 与 antd additionalProps 一致——cell 组件若需要也可读，但通常不用）。
 *
 * shouldCellUpdate 透传说明（API 支持）：本字段作为 prop 传给 cell 组件，cell 组件可自行用
 * React.memo + 该函数做重渲染优化（antd 的 useCellRender 在 rc-table 内部 memo，data-grid 简化为
 * 透传——cell 组件自行决定是否 memo，保持引擎层简单）。这是决策 1 下的"有正常用例 API"实现。
 */
function renderCellContent({
  components,
  column,
  record,
  index,
  rendered,
  onCellProps,
}: {
  components: import('./types').EngineTableProps['components']
  column: EngineLeafColumn<any>
  record: any
  index: number
  rendered: ReactNode
  onCellProps: Record<string, any> | undefined
}): ReactNode {
  const CustomCell = components?.body?.cell
  if (!CustomCell) {
    // 默认渲染路径：直接返回 rendered（零回归）。
    return rendered
  }
  // 透传 props：children + record + index + dataIndex + shouldCellUpdate + onCell 返回值的全部字段。
  // onCellProps 可能含 colSpan/rowSpan（cellMerge 已消费，这里仍透传，cell 组件一般不读）。
  const cellProps: Record<string, any> = {
    children: rendered,
    record,
    index,
    dataIndex: column.dataIndex,
    shouldCellUpdate: column.shouldCellUpdate,
    ...onCellProps,
  }
  return <CustomCell {...cellProps} />
}

/** 数字 → px 字符串；字符串原样返回；null/undefined → undefined。 */
function toTrack(value: number | string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'number') return `${value}px`
  return value
}

/**
 * S20 ellipsis 默认 title 提示：把单元格/表头内容文本化为 string 供 native `title` 用。
 *
 * 对齐 antd 默认行为：ellipsis 单元格 hover 显示完整文本（native title）。
 *   - string / number：直接转 string。
 *   - ReactNode（含 JSX / render 返回值）：尝试递归抽取文本（string/number 拼接）；
 *     若含非文本节点（元素/数组等无法可靠文本化）则返回 undefined（与 antd 行为一致：
 *     自定义 render 返回 JSX 时 antd 默认也不显示 title——此时用户应自行包 Tooltip，属 S21）。
 *   - null/undefined/boolean：返回 undefined（不设 title）。
 *
 * 仅 ellipsis 列调用；非 ellipsis 列不加 title（避免多余 tooltip）。
 */
function toEllipsisTitle(content: ReactNode): string | undefined {
  if (content === null || content === undefined) return undefined
  if (typeof content === 'string') return content
  if (typeof content === 'number') return String(content)
  if (typeof content === 'boolean') return undefined
  // ReactNode 其它形态（element / array / fragment / portal）：
  // 递归抽取 string/number 文本；遇到非文本（如 element with props 但无 string children 链）
  // 保守返回 undefined（避免给出残缺 title 误导用户）。
  const parts: Array<string> = []
  const walk = (node: ReactNode): boolean => {
    if (node === null || node === undefined || typeof node === 'boolean') return true
    if (typeof node === 'string') {
      parts.push(node)
      return true
    }
    if (typeof node === 'number') {
      parts.push(String(node))
      return true
    }
    // React element：抽 props.children 递归（不抽 element 自身的字符串表示）。
    if (typeof node === 'object' && 'props' in node) {
      const children = (node as { props?: { children?: ReactNode } }).props?.children
      return walk(children)
    }
    // 数组 / iterable：逐项 walk。
    if (Array.isArray(node)) {
      return node.every(walk)
    }
    // 其它形态（Portal / Suspense 等）：不文本化。
    return false
  }
  if (!walk(content)) return undefined
  const joined = parts.join('').trim()
  return joined.length > 0 ? joined : undefined
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
 * S34 页面级 sticky 的底部横向滚动条（对齐 antd `StickyScrollBar`，
 * 见 `react-component/table/src/stickyScrollBar.tsx` + `components/table/style/sticky.ts`）。
 *
 * **背景**：S34 下 `.dg-grid` 不包 overflow 容器（避免拦截表头 sticky 上下文），grid 的
 * `min-width: scrollX` 撑宽页面，**页面（document）作为横向滚动源**（原生横向滚动条）。
 * 本组件提供"底部固定的横向滚动条"增强体验：`position: sticky; bottom: offsetScroll`，
 * 页面纵向滚动时钉在视口底部；内部 thumb 反映页面当前横向滚动位置，拖动 thumb 驱动页面 scrollTo。
 *
 * **与 antd 差异**：antd 的 StickyScrollBar 是 fake scrollbar（表体滚动容器无原生横向滚动条，
 * 完全用 fake thumb 替代）；data-grid 简化为"页面原生横向滚动条 + 增强 sticky thumb"——
 * 页面本身已有原生横向滚动条，本组件额外提供一个钉在视口底部的同步 thumb（视觉对齐 antd
 * "底部固定滚动条"，功能等价：长表格滚动到底部视口时仍可横向滚动）。
 *
 * **实现**：
 * - 监听 `getContainer()`（默认 window）的 scroll 事件，按 `scrollLeft / (scrollWidth - clientWidth)`
 *   计算 thumb 在 bar 内的 left 比例 + thumb 宽度比例（clientWidth / scrollWidth）。
 * - 拖动 thumb（pointer 事件）：按 pointer 移动量换算 scrollLeft，调 `container.scrollTo`。
 * - bar 宽度 = grid 宽度（与 grid 对齐，sticky bottom 时横向随页面滚动）。
 *
 * **zero regression**：仅 S34 sticky 启用时渲染（GridTable 在 sticky 分支调用）；其余路径不渲染。
 */
function StickyScrollBar({
  offsetScroll,
  getContainer,
  gridRef,
}: {
  offsetScroll: number
  getContainer?: () => HTMLElement | Window | undefined
  gridRef: React.RefObject<HTMLDivElement | null>
}) {
  const barRef = useRef<HTMLDivElement | null>(null)
  const thumbRef = useRef<HTMLDivElement | null>(null)
  // 拖动状态 ref（避免重渲染；pointermove 直接操作 DOM）。
  const dragStateRef = useRef<{
    pointerId: number | null
    startPointerX: number
    startScrollLeft: number
  } | null>(null)

  // 解析 container（window 或 HTMLElement；undefined/null 回退 window）。
  const resolveContainer = useCallback((): Window | HTMLElement => {
    if (getContainer) {
      const c = getContainer()
      if (c instanceof Window) return c
      if (c && 'scrollTo' in c) return c as HTMLElement
    }
    return typeof window !== 'undefined' ? window : (null as unknown as Window)
  }, [getContainer])

  // 更新 thumb 位置 + 宽度（按当前 scrollLeft / scrollWidth 比例）。
  const updateThumb = useCallback(() => {
    const container = resolveContainer()
    const bar = barRef.current
    const thumb = thumbRef.current
    if (!bar || !thumb) return
    // 容器滚动几何：window 用 scrollX/innerWidth/document.scrollWidth；
    // HTMLElement 用 scrollLeft/clientWidth/scrollWidth。
    let scrollLeft: number
    let clientWidth: number
    let scrollWidth: number
    if (container instanceof Window) {
      scrollLeft = container.scrollX || 0
      clientWidth = container.innerWidth || 0
      scrollWidth = container.document?.documentElement?.scrollWidth || 0
    } else {
      scrollLeft = container.scrollLeft || 0
      clientWidth = container.clientWidth || 0
      scrollWidth = container.scrollWidth || 0
    }
    const maxScroll = scrollWidth - clientWidth
    const ratio = maxScroll > 0 ? scrollLeft / maxScroll : 0
    const thumbRatio = scrollWidth > 0 ? clientWidth / scrollWidth : 1
    // thumb 宽度 = bar 宽度 × (clientWidth / scrollWidth)（至少 20px，避免太窄）。
    const barWidth = bar.clientWidth || 0
    const thumbWidth = Math.max(20, barWidth * thumbRatio)
    const thumbMaxLeft = Math.max(0, barWidth - thumbWidth)
    thumb.style.width = `${thumbWidth}px`
    thumb.style.transform = `translateX(${ratio * thumbMaxLeft}px)`
  }, [resolveContainer])

  // 监听 container scroll + resize 更新 thumb。
  useEffect(() => {
    const container = resolveContainer()
    const target = container instanceof Window ? container : (container as HTMLElement)
    target.addEventListener('scroll', updateThumb, { passive: true })
    if (container instanceof Window) {
      container.addEventListener('resize', updateThumb)
    }
    // 初始更新。
    updateThumb()
    return () => {
      target.removeEventListener('scroll', updateThumb)
      if (container instanceof Window) {
        container.removeEventListener('resize', updateThumb)
      }
    }
  }, [resolveContainer, updateThumb])

  // thumb pointer 拖动：换算 pointer 移动量 → container scrollLeft。
  const onThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = resolveContainer()
    const thumb = thumbRef.current
    const bar = barRef.current
    if (!thumb || !bar) return
    e.preventDefault()
    e.stopPropagation()
    let clientWidth: number
    let scrollWidth: number
    let currentScrollLeft: number
    if (container instanceof Window) {
      clientWidth = container.innerWidth || 0
      scrollWidth = container.document?.documentElement?.scrollWidth || 0
      currentScrollLeft = container.scrollX || 0
    } else {
      clientWidth = container.clientWidth || 0
      scrollWidth = container.scrollWidth || 0
      currentScrollLeft = container.scrollLeft || 0
    }
    const barWidth = bar.clientWidth || 0
    const thumbRatio = scrollWidth > 0 ? clientWidth / scrollWidth : 1
    const thumbWidth = Math.max(20, barWidth * thumbRatio)
    const thumbMaxLeft = Math.max(0, barWidth - thumbWidth)
    const maxScroll = scrollWidth - clientWidth
    dragStateRef.current = {
      pointerId: e.pointerId,
      startPointerX: e.clientX,
      startScrollLeft: currentScrollLeft,
    }
    // 用闭包捕获拖动几何（拖动期间 DOM 不变，无需重读）。
    const geometry = { thumbMaxLeft, maxScroll }
    const onMove = (ev: PointerEvent) => {
      const ds = dragStateRef.current
      if (!ds || ds.pointerId !== ev.pointerId) return
      const dx = ev.clientX - ds.startPointerX
      const scrollDelta = geometry.thumbMaxLeft > 0 ? (dx / geometry.thumbMaxLeft) * geometry.maxScroll : 0
      const next = ds.startScrollLeft + scrollDelta
      if (container instanceof Window) {
        container.scrollTo(next, container.scrollY || 0)
      } else {
        ;(container as HTMLElement).scrollLeft = next
      }
    }
    const onUp = (ev: PointerEvent) => {
      const ds = dragStateRef.current
      if (!ds || ds.pointerId !== ev.pointerId) return
      dragStateRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  return (
    <div
      ref={barRef}
      className="dg-sticky-scroll-bar"
      style={{
        position: 'sticky',
        bottom: `${offsetScroll}px`,
        // antd sticky.ts:34,38 height = tableScrollThumbSize(8) + background = tableScrollBg(浅)。
        height: 'var(--ant-table-scroll-thumb-size, 8px)',
        zIndex: 5,
        background: 'var(--ant-table-scroll-bg, rgba(5, 5, 5, 0.06))',
        // antd sticky.ts:39 borderTop: tableBorder（1px solid tableBorderColor）。data-grid 同款，
        // 用 --ant-table-border-color（= #f0f0f0，与 antd tableBorderColor 一致）。
        borderTop: 'var(--ant-line-width, 1px) var(--ant-line-type, solid) var(--ant-table-border-color, #f0f0f0)',
        // bar 宽度与 grid 对齐：grid 多宽 bar 多宽（gridRef 提供 grid 宽度参考）。
        // sticky 元素横向随页面滚动（默认行为），故 bar 始终覆盖"当前视口横向可见区域"对齐 grid。
        minWidth: gridRef.current?.style.minWidth || undefined,
      }}
    >
      <div
        ref={thumbRef}
        onPointerDown={onThumbPointerDown}
        className="dg-sticky-scroll-bar-thumb"
        style={{
          height: 'var(--ant-table-scroll-thumb-size, 8px)',
          width: '20px',
          // antd sticky.ts:50 borderRadius = stickyScrollBarBorderRadius(100) + backgroundColor = tableScrollThumbBg。
          borderRadius: 'var(--ant-table-sticky-scroll-bar-border-radius, 100px)',
          background: 'var(--ant-table-scroll-thumb-bg, rgba(0, 0, 0, 0.25))',
          cursor: 'pointer',
          willChange: 'transform',
          transition: 'background-color 0.2s ease',
        }}
      />
    </div>
  )
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
    treeState,
    tableLayout,
    onSorterClick,
    onFilterApply,
    className,
    components,
    summary,
    emptyText,
    semantic,
    sticky,
    // ★ 接口全兼容（决策 3 第二步）：onHeaderRow / onRow / rowClassName / getPopupContainer / rowHoverable。
    onHeaderRow,
    onRow,
    rowClassName,
    getPopupContainer,
    rowHoverable,
    // ★ §11 C2 tree-data 种子 #3（共享改动）：行选中态判定 → 加 dg-row-selected 类。
    isRowSelected,
  } = props

  const gridRef = useRef<HTMLDivElement | null>(null)

  // === S34 页面级粘性表头（区别 M8 容器内固定）===
  // sticky prop 启用时：表头相对**页面 viewport** 固定（position:sticky; top:offsetHeader），
  // 而非 M8 的相对表格滚动容器固定。详见对外 types.ts StickyConfig 注释。
  //
  // ★ 与 M4/M8 互斥：sticky 启用时走"页面级"路径（grid 不包 overflow 容器，避免拦截 sticky 上下文），
  //   virtual / scrollYNonVirtual 的容器内固定表头不生效（headerStickyTop 仍为 false，由 stickyHeaderOffset 驱动）。
  const stickyEnabled = sticky !== undefined && sticky !== null
  const stickyOffsetHeader = (sticky && typeof sticky === 'object' ? sticky.offsetHeader : undefined) ?? 0
  const stickyOffsetScroll = (sticky && typeof sticky === 'object' ? sticky.offsetScroll : undefined) ?? 0
  const stickyGetContainer =
    sticky && typeof sticky === 'object' && sticky.getContainer ? sticky.getContainer : undefined

  // === 虚拟滚动判定（M4）===
  // virtual=true 且 scroll.y === true 时启用纵向虚拟滚动（决策 7：scroll.y 仅 true/undefined）。
  // 虚拟窗口高度由 CSS 自动适应（容器 clientHeight，ResizeObserver 实时测量——见 useVirtualList）。
  // ★ S34：sticky 启用时禁用虚拟（页面级与容器内虚拟互斥；sticky 下页面滚动，虚拟窗口失去意义）。
  const scrollY = scroll?.y
  const scrollYEnabled = scrollY === true
  const virtualEnabled = !stickyEnabled && virtual === true && scrollYEnabled

  // === M8 固定表头（非 virtual）判定 ===
  // 非 virtual 且 scroll.y === true 时启用：表头 sticky top + 表体限高纵向滚动（CSS 自动适应高度）。
  // 与 M4 互斥（M4 优先）。★ S34：sticky 启用时禁用 M8（页面级优先）。
  const scrollYNonVirtual = !stickyEnabled && !virtualEnabled && scrollYEnabled

  // === 表头纵向 sticky 统一标志（M4 + M8 共用）===
  // 无论虚拟（M4）还是非虚拟 scroll.y（M8），表头都需要 `position: sticky; top: 0` 钉在滚动容器顶部。
  // 该标志传入 HeaderCell / ColumnCells 的 `headerStickyTop` prop，统一驱动表头 sticky 行为，
  // 避免两套不一致的实现（任务要求：M4 与 M8 表头 sticky 行为一致）。
  // ★ S34：sticky 页面级固定**不**走此标志（该标志驱动的是"容器内 top:0"）；S34 由 stickyHeaderOffset
  //   单独驱动（表头格 inline style 用 top: offsetHeader，相对 viewport），见下方 stickyHeaderOffset。
  const headerStickyTop = virtualEnabled || scrollYNonVirtual

  // === S34 表头页面级 sticky 偏移（仅 sticky 启用时有效）===
  // 传入 HeaderCell / ColumnCells 的 `stickyHeaderOffset` prop：sticky 启用时表头格 inline style
  // 加 `position: sticky; top: offsetHeader; zIndex`，相对 viewport 固定。与 headerStickyTop（容器内）
  // 互斥——同时为 true 时 S34 优先（sticky 启用时 headerStickyTop 恒 false，见上）。
  const stickyHeaderOffset: number | undefined = stickyEnabled ? stickyOffsetHeader : undefined

  // M9：是否启用展开（expandState.expandEnabled）。展开启用时强制 multi 路径——
  //     展开内容 track 需要精确 grid-row 定位，flat 路径（grid-auto-flow:column）无法插入。
  const expandEnabled = !!expandState?.expandEnabled

  // S13：树形模式（treeState.treeEnabled）。非树形 → undefined（零回归）。
  // 树形模式下：第一列数据单元格内按 level × indentSize 左缩进 + hasChildren 行渲染展开图标。
  const treeEnabled = !!treeState?.treeEnabled

  // === S22 汇总 summary 解析（须在 resolved 之前——summary 启用会强制 multi 路径）===
  // 解析 summary prop：提取 fixed 标志 + Row 元素列表。
  // summary 由适配层（Table.tsx）解析自 TableProps.summary（函数→调用、ReactNode→原样）后传入。
  // 引擎只负责：① grid-template-rows 末尾追加 summary 行 track；② 渲染 summary 区（cloneElement
  //   给每个 Row 注入 __rowLine + __fixed）。
  const summaryParsed = useMemo(() => {
    if (!summary) return null
    const { fixed, rows } = parseSummaryNode(summary)
    if (rows.length === 0) return null
    return { fixed, rows, count: rows.length }
  }, [summary])
  const summaryEnabled = !!summaryParsed

  // 解析列：优先 columnTree（多级表头），否则退化到 columns（单层）。
  // M3：若任一叶子列声明了 onCell（单元格合并）或 colSpan 字段（表头横向合并），
  //     强制走 multi 路径（显式 grid-column/grid-row 定位）——grid-auto-flow:column 下
  //     跨列 span 会打乱列顺序，必须显式定位才能稳定放置合并格。
  // M4：虚拟滚动下也强制 multi 路径（占位 track 机制需要精确 grid-row 控制，
  //     flat 路径无法插入 paddingTop/paddingBottom 占位 track）。
  // M9：展开启用也强制 multi（同上理由：需精确 grid-row 插入展开 track）。
  // S22：summary 启用也强制 multi——summary Cell 用显式 gridColumn/gridRow 定位，
  //   auto-flow:column 会让表体格 DOM 按列连续填充与 summary 显式定位冲突；multi 路径下
  //   所有 cell（表头/表体/summary）都显式定位，互不冲突。
  const resolved = useMemo(() => {
    // S23：empty 区启用条件——emptyText 提供且 dataSource 空（无数据可显示）。
    //   启用时强制 multi 路径（显式 grid-row/grid-column 定位 empty 区），与 summary/expand 同款
    //   理由：flat 路径 grid-auto-flow:column 会让跨列 empty 区的显式定位与列连续填充冲突。
    const emptyEnabled = !!emptyText && dataSource.length === 0
    if (columnTree && columnTree.length > 0) {
      const r = resolveColumnTree(columnTree)
      // M3：检测单元格合并（onCell）或表头合并（colSpan≠1 或存在 covered 表头格）。
      const hasOnCell = r.leafColumns.some((c) => typeof c.onCell === 'function')
      const hasHeaderMerge = r.headerCells.some(
        (h) => (h.headerColSpan ?? 1) !== 1 || h.covered === true,
      )
      const forceMulti = hasOnCell || hasHeaderMerge
      // maxDepth === 1 且无合并 → 走 flat 快速路径（M0/M1 行为，零回归）。
      // S15：components.body.row 提供时强制 multi（行优先 DOM + Provider 包裹需要显式定位）。
      // S22：summary 启用强制 multi。
      // S23：empty 启用强制 multi（empty 区显式定位）。
      const multi = r.maxDepth > 1 || forceMulti
      return {
        mode: (multi || virtualEnabled || expandEnabled || treeEnabled || summaryEnabled || emptyEnabled || !!components?.body?.row ? ('multi' as const) : ('flat' as const)),
        maxDepth: r.maxDepth,
        leafColumns: r.leafColumns,
        headerCells: r.headerCells,
      }
    }
    // 单层路径：columns 即叶子列。
    // M3：同样检测合并需求；若有 onCell 或 colSpan 字段，把 columns 包装成单层 columnTree
    //     走 resolveColumnTree（得到 headerCells 供 covered 处理），再强制 multi。
    // M4/M9/S13：虚拟滚动 / 展开启用 / 树形模式下也包装成 multi（理由同上）。
    // S15：components.body.row 提供时也强制 multi（行优先 DOM + Provider 包裹需要显式定位）。
    // S22：summary 启用时也包装成 multi（理由同 columnTree 分支）。
    // S23：empty 启用时也包装成 multi（理由同 columnTree 分支）。
    const flatLeavesRaw: Array<EngineLeafColumn<RecordType>> = columns ?? []
    const hasOnCellFlat = flatLeavesRaw.some((c) => typeof c.onCell === 'function')
    const hasHeaderColSpanFlat = flatLeavesRaw.some(
      (c) => c.colSpan !== undefined && c.colSpan !== 1,
    )
    if (hasOnCellFlat || hasHeaderColSpanFlat || virtualEnabled || expandEnabled || treeEnabled || summaryEnabled || emptyEnabled || !!components?.body?.row) {
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
  }, [columnTree, columns, virtualEnabled, expandEnabled, treeEnabled, summaryEnabled, emptyText, dataSource, components])

  const { mode, maxDepth, leafColumns, headerCells } = resolved

  // ★ 接口全兼容（决策 3 第二步）：为 onHeaderRow(columns, index) 准备 columns 参数。
  // antd onHeaderRow 传入"当前表头行涉及的列"——单层表头即全部 columns；多级表头按层。
  // data-grid 简化：统一传**顶层列**（columnTree.raw 或 columns.raw）作为 columns 参数（调用方
  // 一般不读 columns 内容，仅按行返回固定 props；传顶层列已足够满足典型用例——onClick 行级交互等）。
  // 多级表头按层传不同列集较复杂，且 antd demo 无此用例，本阶段简化为顶层列。
  const headerColumns = useMemo(
    () =>
      (columnTree && columnTree.length > 0
        ? columnTree
        : (leafColumns as unknown as Array<{ raw?: unknown }>)
      ).map((n) => n.raw),
    [columnTree, leafColumns],
  )

  // S13：第一列数据列索引（树形模式下渲染缩进 + 展开图标的目标列）。
  // 对齐 antd `expandIconColumnIndex`（nest 模式默认：有 rowSelection → 1，否则 → 0；
  // 但数据列在哨兵之后）。data-grid 用"第一个含 dataIndex 的叶子列"判定（哨兵列 SELECTION/
  // EXPAND 无 dataIndex）。无树形模式 → -1（不渲染缩进）。
  const treeFirstDataColumnIdx = useMemo(() => {
    if (!treeEnabled) return -1
    for (let i = 0; i < leafColumns.length; i += 1) {
      if (leafColumns[i].dataIndex !== undefined) return i
    }
    // 全部列无 dataIndex（罕见）→ 退化为 0。
    return 0
  }, [treeEnabled, leafColumns])

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
  // S22：summary 启用时末尾追加 summaryTracks（每行一条 'auto'），并返回 summaryStartLine
  //   供渲染时给 summary Row 注入 grid-row 线号。
  const { gridTemplateRows, gridTemplateColumns, gridAutoFlow, summaryStartLine } = useMemo(() => {
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
      // 未拖拽过的列保持原逻辑（column.width → max-content / fixed 下 minmax(0,1fr)）。
      // 这样首次拖拽 max-content 列时，第一次 move 即把该列从 max-content 转为受控 px。
      // ★ 拖拽后的列固定为受控 px，不参与 1fr 比例分配（与现状/语义一致：用户已明确指定该列宽，
      //   不应再被比例伸缩；其余列按各自的 minmax/max-content 策略分剩余）。
      const resized = resizedWidths.get(col.key)
      if (resized !== undefined) return `${resized}px`
      // ★ C1 列宽策略（§11 第 0 步，对齐 antd `<table width:100%>` + table-layout 行为）。
      //
      // antd 源码 ground truth（已读，不猜）：
      //   - `.ant-table table` CSS 恒为 `width:100%`（`ant-design/components/table/style/index.ts:280-286`）。
      //   - horizonScroll（scroll.x 或 fixed 列）时 `<table>` inline `{ width: scrollX, minWidth:'100%' }`
      //     （`react-component/table/src/Table.tsx:438-441`）。
      //   - `<colgroup><col style={width, minWidth}>`：`minWidth` 仅 tableLayout==='auto' 时来自 column.minWidth
      //     （`react-component/table/src/ColGroup.tsx:33-35`）；`width` = column.width 原样。
      //   - mergedTableLayout：显式 > (fixColumn ? (scroll.x==='max-content' ? 'auto' : 'fixed'))
      //     > (fixHeader||sticky||ellipsis ? 'fixed' : 'auto')（`Table.tsx:612-627`）。
      //
      // grid-track 等效（min/max 双约束模拟 `<col width>` + `table-layout` 的「min-width=width，剩余按比例」语义）：
      //   - **绝对 width 列**（number / 非百分比字符串如 `'100px'`）：
      //     · fixed 模式 → `minmax(width, 1fr)`：min=width（保底，总 min>容器 出横滚 / <容器 撑满不留空），
      //       max=1fr 按比例分剩余。这正是 §11 需求「最小绝对宽度 + 比例宽」（等效 `flex:1 1 width`）。
      //     · auto 模式 → `minmax(width, max-content)`：min=width（保底），max=content（可随内容增长，
      //       与 antd `table-layout:auto` 下 `<col width>` 列宽=content 但至少 width 语义一致）。
      //   - **百分比 width 列**（如 `'20%'`）：**原样作为 track**（不包 minmax）——antd 不转换，
      //     `<col style="width:'20%'">` 相对表格宽 20%；grid `grid-template-columns: 20%` 相对容器 20%，
      //     语义一致。minmax 包装百分比在 grid 里 min/max 同为百分比无意义，故保留原样。
      //   - **无 width 列**：fixed → `minmax(0, 1fr)`（min:0 收缩触发 ellipsis，修 S20 gap）；
      //     auto → `max-content`（内容宽）。
      //   - 配合 `.dg-grid{width:100%}`（见 gridStyle）约束表格总宽=容器宽：总 min>容器 出滚动条，
      //     总 min<容器 minmax 的 1fr/max-content 撑满容器（修 basic Action 截断 + narrow 均分）。
      const w = toTrack(col.width)
      if (w !== undefined) {
        // 百分比 width（含 '%'）：原样 track（antd `<col style="width:xx%">` 等效）。
        if (typeof col.width === 'string' && col.width.includes('%')) return w
        // 绝对 width：minmax 策略（fixed=1fr 比例 / auto=max-content 可增长）。
        return tableLayout === 'fixed' ? `minmax(${w}, 1fr)` : `minmax(${w}, max-content)`
      }
      // 无 width：fixed → minmax(0,1fr) 收缩（ellipsis 视觉）；auto → max-content（零回归）。
      return tableLayout === 'fixed' ? 'minmax(0, 1fr)' : 'max-content'
    })

    // S22：summary 区 tracks（grid-template-rows 末尾追加，每行一条 'auto' track）。
    // summary 行高按内容自适应（'auto'），与表体行高约定无关——summary 通常是单行文本，
    // 不需要参与虚拟窗口/行高约定计算。
    const summaryTracks: string[] = summaryParsed
      ? Array.from({ length: summaryParsed.count }, () => 'auto')
      : []
    // summary 区起始线号 = headerTracks + bodyTracks + 1（1-based grid line）。
    // summary 第 0 行 track 占 [summaryStartLine, summaryStartLine+1]。
    const summaryStartLine = summaryParsed
      ? headerTracks.length + bodyTracks.length + 1
      : 0

    // 多级表头路径：关闭 auto-flow（用显式 grid-column/grid-row 定位）。
    // 单层路径：保持 grid-auto-flow:column（M0 行为）。
    // ★ S22：summary 启用时强制关闭 auto-flow（用显式定位）——summary Cell 用 gridColumn/gridRow
    //   显式定位，auto-flow:column 会导致表体格 DOM 按列连续填充时与 summary Cell 的显式定位冲突。
    //   故 summary 启用 → 走 multi 路径定位语义（即使单层表头也关闭 auto-flow，保证 summary 正确）。
    return {
      gridTemplateRows: [...headerTracks, ...bodyTracks, ...summaryTracks].join(' ') || 'none',
      gridTemplateColumns: colTracks.join(' ') || 'none',
      gridAutoFlow: mode === 'multi' || summaryEnabled ? undefined : ('column' as const),
      summaryStartLine,
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
    summaryParsed,
    summaryEnabled,
    tableLayout,
  ])

  // 整行 hover：记录当前 hover 的数据行 index（null 表示未 hover）。
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null)

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateRows,
    gridTemplateColumns,
    ...(gridAutoFlow ? { gridAutoFlow } : null),
    // ★ C1 列宽策略（§11 第 0 步）：`.dg-grid` 恒定 `width:100%`（对齐 antd `<table>` CSS
    //   `.ant-table table{width:100%}`，见 `ant-design/components/table/style/index.ts:280-286`）。
    //   这是修 basic Action 截断 + 该出的横滚条出现的核心——
    //   - auto 模式：列取 `max-content`/`minmax(width,max-content)`，width:100% 让 grid 总宽
    //     = max(100%, Σmax-content)：内容>容器时 grid 撑宽（溢出 → 外层 .dg-scroll/.dg-wrapper
    //     overflow 出滚动条，即 antd `<table>` 在 auto 下内容溢出容器的等效行为）；内容<容器时
    //     grid=容器宽（撑满，不留白）。配合 `max-content` track，列宽仍=内容宽（行为与 antd auto 一致）。
    //   - fixed 模式：列 `minmax(0,1fr)`/`minmax(width,1fr)`，width:100% 让 1fr 均分容器剩余，
    //     minmax(width,..) 的 Σmin>容器 时溢出滚动（修 S27 narrow 均分 + S20 ellipsis）。
    //   - 与 scrollMinWidth（scroll.x 下 min-width:scrollX）正交：min-width 仍生效（至少 scrollX 宽），
    //     width:100% 在容器更宽时撑满（fixed 列宽策略在容器约束下均分）。
    //   ★ S34 sticky 例外：sticky 模式下**不加** width:100%（保留 width:auto）——sticky 需页面级
    //     横向滚动，width:100% 会把 grid 约束在 .dg-wrapper（dg-sticky 下已 width:auto=视口宽），
    //     虽然 min-width:scrollX 仍能撑宽，但为保持 S34 既有测过的行为零回归，sticky 路径完全不动。
    ...(!stickyEnabled ? { width: '100%' } : null),
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
  // S29：语义化 content 部位 style（合并到 grid 根容器 style）。
  const semanticContentStyle = semantic?.content?.style
  // S29：semantic content style 合并到 grid 根 style（gridFinalStyle 之后覆盖）。
  const gridFinalStyleWithSemantic: CSSProperties = semanticContentStyle
    ? { ...gridFinalStyle, ...semanticContentStyle }
    : gridFinalStyle

  const gridClassName = [
    'dg-grid',
    // S29：语义化 content 部位 class（合并到 grid 根容器）。
    semantic?.content?.className,
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
        <div className={gridClassName} style={gridFinalStyleWithSemantic} ref={gridRef}>
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
                    stickyHeaderOffset={stickyHeaderOffset}
                    resizeEnabled={resizeEnabled}
                    onResizerPointerDown={onResizerPointerDown}
                    resizingKey={resizingKey}
                    semanticHeader={semantic?.header}
                    onSorterClick={onSorterClick}
                    onFilterApply={onFilterApply}
                    // ★ 接口全兼容（决策 3 第二步）：onHeaderRow 行级 props 透传到表头格
                    //   （grid 无 tr，行 props 分发到该行所有表头格）。
                    onHeaderRow={onHeaderRow}
                    getPopupContainer={getPopupContainer}
                    headerColumns={headerColumns}
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
          {/* 数据区：按数据行 × 叶子列显式定位（sticky 来自 leafSticky[colIdx]）。
              ★ S15：当 components.body.row 提供时，按**行**优先遍历，每行用 body.row 组件包裹
                该行所有单元格（body.row 不产生 DOM 或产生不影响 grid 的 DOM——典型 EditableRow
                用 antd Form + Context.Provider，Provider 不渲染真实 DOM，单元格仍是 grid 直接子元素，
                grid 显式定位保证布局正确）。无 body.row 时按列优先遍历（历史行为，性能略优）。
              M3：cellMergePlan 驱动——hidden 格不渲染 DOM；非隐藏格设 grid-column/grid-row span。
              M4 虚拟：只遍历 [start, end)；其余由占位 track 撑总高。 */}
          {renderBodyCells({
            leafColumns,
            dataSource,
            virtualEnabled,
            virtualState,
            cellMergePlan,
            expandEnabled,
            expandState,
            rowKey,
            hoveredRowIndex,
            setHoveredRowIndex,
            rowLineBase,
            leafSticky,
            treeEnabled,
            treeState,
            treeFirstDataColumnIdx,
            components,
            semanticBody: semantic?.body,
            // ★ 接口全兼容（决策 3 第二步）：onRow / rowClassName 透传到表体单元格
            //   （grid 无 tr，行 props / 行 class 分发到该行所有单元格）。
            onRow,
            rowClassName,
            rowHoverable,
            // ★ §11 C2 tree-data 种子 #3（共享）：行选中态判定 → 加 dg-row-selected 类。
            isRowSelected,
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
          {/* S23 自定义空状态：pagedDataSource 空时渲染跨所有列的 empty 占位区。
              empty grid item 显式定位到 headerTracks 之后的第一条 track（grid-row: headerRowsUsed+1），
              grid-column: 1 / -1 跨所有列；内容居中（.dg-empty 区 padding + flex center）。
              内容来自 emptyText（适配层已按 locale.emptyText > ConfigProvider.renderEmpty('Table') > 默认 Empty
              优先级解析；表体 empty 不区分空数据 vs 筛选无结果——对齐 antd InternalTable.tsx:714-717）。
              非空时不渲染（零回归）。 */}
          {emptyText && dataSource.length === 0 ? (
            <div
              className="dg-empty"
              style={{
                gridColumn: '1 / -1',
                gridRow: headerRowsUsed + 1,
                padding: '32px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {emptyText}
            </div>
          ) : null}
          {/* S22 汇总 summary 区：grid 末尾的 summary 行。
              summaryParsed.rows 为解析得到的 Summary.Row 元素列表；引擎对每个 Row cloneElement
              注入 __rowLine（grid-row 起始线号 = summaryStartLine + rowIndex）+ __fixed（sticky bottom）。
              Row 内部通过 Context 把 rowLine/fixed 传给其 Cell 子节点，Cell 据此设 grid-row +
              gridColumn + sticky bottom。 */}
          {summaryParsed && summaryStartLine > 0
            ? summaryParsed.rows.map((row, rowIndex) => {
                const rowLine = summaryStartLine + rowIndex
                return cloneElement(row, {
                  key: `dg-summary-row-${rowIndex}`,
                  __rowLine: rowLine,
                  __fixed: summaryParsed.fixed,
                } as Partial<typeof row.props>)
              })
            : null}
        </div>
      )
    }

    // 单层快速路径（M0 行为）：grid-auto-flow:column，每列 DOM 连续。
    // 注意：M4 虚拟模式下不会走到这里（虚拟强制 multi）。
    return (
      <div className={gridClassName} style={gridFinalStyleWithSemantic} ref={gridRef}>
        {leafColumns.map((column, colIdx) => (
          <ColumnCells<RecordType>
            key={column.key}
            column={column}
            colIdx={colIdx}
            // ★ 表头分隔线排除：单层末列标记（对齐 antd `thead th:not(:last-child)::before`）。
            //   单层无分组，仅需末列排除；多级路径由 columnTree.markLastLeaves 算 data-group-last。
            isLastLeaf={colIdx === leafColumns.length - 1}
            dataSource={dataSource}
            rowKey={rowKey}
            showHeader={showHeader}
            hoveredRowIndex={hoveredRowIndex}
            onHoverRow={setHoveredRowIndex}
            sticky={leafSticky[colIdx]}
            headerStickyTop={headerStickyTop}
            stickyHeaderOffset={stickyHeaderOffset}
            resizeEnabled={resizeEnabled}
            onResizerPointerDown={onResizerPointerDown}
            resizingKey={resizingKey}
            onSorterClick={onSorterClick}
            onFilterApply={onFilterApply}
            semanticHeader={semantic?.header}
            semanticBody={semantic?.body}
            components={components}
            // ★ 接口全兼容（决策 3 第二步）：onHeaderRow / onRow / rowClassName 透传到
            //   flat 路径的表头格 + 表体单元格（与 multi 路径同款接入）。
            onHeaderRow={onHeaderRow}
            onRow={onRow}
            rowClassName={rowClassName}
            rowHoverable={rowHoverable}
            getPopupContainer={getPopupContainer}
            headerColumns={headerColumns}
            // ★ §11 C2 tree-data 种子 #3（共享）：行选中态判定 → 加 dg-row-selected 类。
            isRowSelected={isRowSelected}
          />
        ))}
      </div>
    )
  }

  // S29：语义化 section 部位 class/style（注入到滚动容器；无 semantic 时 sectionClassName=undefined）。
  const sectionClassName = semantic?.section?.className
  const sectionStyle = semantic?.section?.style
  const mergeSectionClass = (...base: Array<string | undefined>) =>
    [...base, sectionClassName].filter(Boolean).join(' ') || undefined
  const mergeSectionStyle = (base: CSSProperties | undefined): CSSProperties | undefined => {
    if (!sectionStyle) return base
    return { ...(base ?? null), ...sectionStyle }
  }

  // === S34 页面级粘性表头（区别 M8 容器内固定）===
  // sticky 启用时：grid **不包** overflow 容器（避免 overflow 祖先拦截表头 sticky 上下文），
  // grid 直接渲染 + min-width: scrollX 撑宽页面；表头 grid item 用 stickyHeaderOffset 驱动
  // （position: sticky; top: offsetHeader，相对 viewport 固定，已在上游 HeaderCell/ColumnCells 应用）。
  // grid 之后渲染 StickyScrollBar（position: sticky; bottom: offsetScroll）作为底部固定横向滚动条。
  //
  // ★ 关键：grid 不包 overflow 容器 → grid 的最近可滚动祖先是 window（页面）→ 表头 sticky 相对
  //   viewport 固定（页面纵向滚动时表头钉在视口顶部 offsetHeader 处）。这是 S34 与 M8 的本质区别
  //   （M8 表头相对 .dg-fixed-header-scroll 容器固定，容器内滚动）。
  //
  // ★ 横向滚动：依赖页面原生滚动条（页面横向滚动）。StickyScrollBar 额外提供"底部固定"的同步 thumb
  //   （视觉对齐 antd fake scrollbar）。
  //
  // ★ 与 M2 固定列组合：固定列 grid item 的 position: sticky; left/right 与表头的 position: sticky; top
  //   在同一元素上叠加（corner cell 双 sticky，浏览器原生支持，与 M4/M8 同款）。
  if (stickyEnabled) {
    return (
      <>
        {renderGrid()}
        <StickyScrollBar
          offsetScroll={stickyOffsetScroll}
          getContainer={stickyGetContainer}
          gridRef={gridRef}
        />
      </>
    )
  }

  // === 决策 7 + 决策 8：scroll.y === true 数据区域模式 + scroll.x 横向悬浮滚动条 ===
  //
  // **数据区域模式**（scroll.y === true，virtual 或 M8）：
  //   - 高度 CSS 自动适应：`.dg-scroll-wrap`（FloatingScrollBar 包装）`flex:1; min-height:0`，
  //     `.dg-scroll`（滚动容器）`flex:1; min-height:0; overflow-y:auto`。
  //     外层 `.dg-wrapper.dg-data-area`（Table.tsx 注入）`display:flex; flex-direction:column; height:100%`，
  //     让 wrap 填满父容器剩余空间——**不用 JS 算数字**。
  //   - 表头 sticky top（HeaderCell 的 headerStickyTop 标志驱动）钉顶，表体限高滚动。
  //   - #35 纵向悬浮滚动条（FloatingScrollBar 组件）。
  //
  // **横向悬浮滚动条**（scroll.x 启用，决策 8）：
  //   - 隐藏原生横向滚动条（`.dg-scroll-floating` 修饰类已覆盖 width/height:0）。
  //   - HorizontalFloatingScrollBar 定位数据区域底部（summary 上方）：细线 2px + hit 上下各 8px
  //     + hover 变粗 8px + 拖动/同步（translateX）。
  //
  // **统一分支**：scroll.y===true 与 scroll.x 二者任一启用 → 都需要 FloatingScrollBar 包装。
  //   - 仅 scroll.x（无 scroll.y）：容器只 overflow-x:auto（无纵向悬浮条），仅横向悬浮条。
  //   - 仅 scroll.y（无 scroll.x）：容器 overflow-y:auto（纵向悬浮条），无横向悬浮条。
  //   - 两者：容器 overflow:auto 双向，纵向 + 横向悬浮条并存。
  //
  // ★ M4 虚拟滚动分支：scrollContainerRef 必须传入（virtualScrollRef）。

  // 横向滚动是否启用（scroll.x 或 hasFixed）。注意：scroll.x 触发横向悬浮条；hasFixed 不一定触发
  // 横向悬浮条（fixed 列在没有 scroll.x 时容器是 overflow-x:auto 兜底，原生条仍可见——为了简化，
  // 仅 scroll.x 启用时启用横向悬浮条；纯 hasFixed 无 scroll.x 走老路径，零回归）。
  const scrollXEnabled = scrollX !== undefined

  // 仅当 scroll.y===true 或 scroll.x 启用时进入"悬浮条"分支（其他路径零回归）。
  if (scrollYEnabled || scrollXEnabled) {
    // wrapStyle：数据区域模式下 wrap 填满（flex:1; min-height:0）；横向滚动模式下 wrap 默认布局。
    const wrapBaseStyle: CSSProperties = scrollYEnabled
      ? { flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column' }
      : {}
    // 滚动容器 style：纵向滚动 + 横向滚动开关。
    const containerStyle: CSSProperties = {
      // 数据区域模式：滚动容器 flex 填满 wrap；横向滚动模式：自适应内容高。
      ...(scrollYEnabled ? { flex: '1', minHeight: '0' } : null),
      overflowY: scrollYEnabled ? 'auto' : 'hidden',
      overflowX: scrollXEnabled ? 'auto' : 'hidden',
    }
    const containerClasses = [
      'dg-scroll',
      virtualEnabled ? 'dg-virtual-scroll' : null,
      scrollYNonVirtual ? 'dg-fixed-header-scroll' : null,
      scrollXEnabled && !scrollYEnabled ? 'dg-x-scroll' : null,
    ]
      .filter(Boolean)
      .join(' ')
    return (
      <FloatingScrollBar
        wrapClassName={mergeSectionClass('dg-scroll-wrap')}
        wrapStyle={mergeSectionStyle(wrapBaseStyle)}
        scrollContainerClassName={containerClasses}
        scrollContainerStyle={containerStyle}
        scrollContainerRef={virtualEnabled ? virtualScrollRef : undefined}
        // 决策 8：横向悬浮滚动条（scroll.x 启用）。
        horizontal={scrollXEnabled}
      >
        {renderGrid()}
      </FloatingScrollBar>
    )
  }

  // 没有固定列且未要求滚动 → 直接渲染（与 M0/M1 完全等价，无多余包装）。
  if (!useScrollWrapper && !hasFixed) {
    return renderGrid()
  }

  // 否则包一层滚动容器（hasFixed 但无 scroll.x：sticky 需要一个可滚动祖先；给 overflow-x:auto 兜底，
  // 与 antd "未指定 scroll.x 时 fixed 列不生效"行为略有差异（antd 在无 scroll.x 时 fixed 列
  // 会被渲染为普通列）。这里选择更宽容的行为：有 fixed 列即允许横向滚动。）
  return (
    <div
      className={mergeSectionClass('dg-scroll')}
      style={mergeSectionStyle(useScrollWrapper ? undefined : { overflowX: 'auto' })}
    >
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
/**
 * S13 树形缩进 + 展开/收起图标渲染（在第一列数据单元格内，内容前）。
 *
 * - 缩进：`paddingLeft = level × indentSize`（对齐 antd BodyRow `paddingLeft: ${indentSize * indent}px`）。
 * - 展开图标：仅 `hasChildren` 行渲染；无 children 行渲染等宽占位（保持图标列对齐）。
 *   - 展开：▼（ExpandIcon expanded=true）。
 *   - 收起：▶（ExpandIcon expanded=false）。
 *   - 点击：treeState.toggleExpand(key)。
 *
 * 返回 inline-flex 容器（缩进 + 图标），与原 rendered 内容横向并列。
 */
function renderTreeIndent<RecordType>({
  record,
  rowKey,
  treeState,
}: {
  record: RecordType
  rowKey: string | ((record: RecordType) => string | number)
  treeState: EngineTreeState
}): ReactNode {
  const key = getRowKey(record, rowKey)
  const info = treeState.rowInfoMap.get(key)
  // rowInfoMap 中应有该 key（扁平化时已写入）；兜底无信息则不渲染。
  if (!info) return null
  const indent = info.level * treeState.indentSize
  const expanded = treeState.isExpanded(key)
  return (
    <span
      className="dg-tree-indent"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        // 缩进：level × indentSize px（对齐 antd BodyRow paddingLeft）。
        paddingLeft: `${indent}px`,
        flexShrink: 0,
      }}
    >
      {info.hasChildren ? (
        <ExpandIcon
          expanded={expanded}
          onExpand={() => treeState.toggleExpand(key)}
        />
      ) : (
        // ★ §11 C2 tree-data 种子 #3 修复：无 children 行渲染 disabled ExpandIcon（spaced 态），
        // 对齐 antd `.ant-table-row-expand-icon-spaced`（antd BodyRow 对 rowExpandable=false /
        // 无 children 的行也渲染一个 disabled button，加 -spaced 类，visibility:hidden 占位）。
        // antd expand.ts 第 102-110 行：`&-spaced { &::before/::after { display:none; content:none },
        //   background:transparent, border:0, visibility:hidden }`。容器尺寸同展开图标（17×17 +
        //   scale(0.9412)），故占位宽度与 collapsed/expanded 态一致，缩进对齐。
        // 旧实现渲染裸 16×16 span：宽度差 1px（antd 视觉宽 17×0.9412≈16，但 grid item 的 track
        //   分配 + antd float 布局差异导致左栏比 antd 少 1px）+ DOM/a11y 不一致（antd 有 button 节点）。
        // 改为 disabled ExpandIcon 后，DOM 与 antd 同构（disabled button），尺寸/visibility 由
        //   .dg-expand-icon-spaced CSS 接管（table.css 第 714-720 行），与 antd spaced 态一致。
        <ExpandIcon
          expanded={false}
          disabled
          onExpand={() => treeState.toggleExpand(key)}
        />
      )}
      {/* 图标与内容之间的间隔（对齐 antd 默认间距）。 */}
      <span style={{ display: 'inline-block', width: 4, flexShrink: 0 }} aria-hidden="true" />
    </span>
  )
}

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

/**
 * S15 单个数据单元格渲染（multi 路径，显式 grid 定位）。
 *
 * 封装 dg-cell div（含 gridColumn/gridRow/sticky/hover/align）+ 内部内容渲染（含
 * components.body.cell + 树形缩进）。multi 路径的每个数据单元格都用此组件渲染，
 * 便于 renderBodyCells 按行/列遍历时复用。
 */
function BodyCell<RecordType>({
  column,
  colIdx,
  record,
  index,
  merge,
  rowSpanTracks,
  rowLine,
  info,
  isHovered,
  isSortedColumn,
  treeEnabled,
  treeState,
  treeFirstDataColumnIdx,
  rowKey,
  components,
  onHoverEnter,
  onHoverLeave,
  semanticBody,
  // ★ 接口全兼容（决策 3 第二步）：onRow / rowClassName / rowHoverable 透传到单元格。
  onRow,
  rowClassName,
  rowHoverable = true,
  // ★ §11 C2 tree-data 种子 #3（共享）：行选中态判定 → 加 dg-row-selected 类。
  isRowSelected,
}: {
  column: EngineLeafColumn<RecordType>
  colIdx: number
  record: RecordType
  index: number
  merge: CellMergeInfo | undefined
  rowSpanTracks: number
  rowLine: number
  info: LeafStickyInfo | undefined
  isHovered: boolean
  isSortedColumn: boolean
  treeEnabled: boolean
  treeState: EngineTreeState | undefined
  treeFirstDataColumnIdx: number
  rowKey: string | ((record: RecordType) => string | number)
  components: import('./types').EngineTableProps['components']
  onHoverEnter: () => void
  onHoverLeave: () => void
  /** S29：语义化 body 部位（cell/row/wrapper 的 className 与 style）。 */
  semanticBody?: import('./types').EngineSemantic['body']
  /** ★ 接口全兼容（决策 3 第二步）：onRow 行级 props 注入。 */
  onRow?: (record: any, index: number) => import('react').HTMLAttributes<HTMLElement> | undefined
  /** ★ 接口全兼容（决策 3 第二步）：rowClassName 行级 class。 */
  rowClassName?: string | ((record: any, index: number) => string)
  /** ★ 接口全兼容（决策 3 第二步）：rowHoverable 行 hover 开关，默认 true。 */
  rowHoverable?: boolean
  /** ★ §11 C2 tree-data 种子 #3（共享）：行选中态判定回调。未提供时不加 dg-row-selected 类（零回归）。 */
  isRowSelected?: (record: RecordType) => boolean
}) {
  const colSpan = merge?.colSpan ?? 1
  const text = getValueByDataIndex(record, column.dataIndex)
  const rendered: ReactNode = column.render
    ? column.render(text, record, index)
    : text
  // S20：ellipsis 列默认 title 悬浮提示（对齐 antd 默认行为）。
  //   - 仅 ellipsis 列加 title（非 ellipsis 列不加，避免多余 tooltip）。
  //   - 取原始 dataIndex 值文本化（string/number）——对齐 antd 默认 title 来源（cellValue 文本化）。
  //   - 自定义 render 返回 JSX 时 antd 默认行为不显示 title（用户应自行 Tooltip，属 S21）：
  //     这里用 text（dataIndex 原值）文本化，render 列仍能显示原值 title（比 antd 略宽松但不破坏
  //     Name render `<a>{text}</a>` 这种文本包裹的场景——hover Name 仍提示完整 name，符合直觉）。
  //   - text 非 string/number（如对象/数组）→ 不设 title。
  //   - 与 S21（ellipsis={ showTitle: false }）兼容：showTitle:false 时**不加** native title，
  //     让 render 内 antd Tooltip 接管 hover 提示（antd ellipsis-custom-tooltip demo 用法）。
  const ellipsisTitle =
    column.ellipsis === true && column.showTitle !== false
      ? typeof text === 'string'
        ? text
        : typeof text === 'number'
          ? String(text)
          : undefined
      : undefined
  // S15：调用 onCell 取完整返回值（透传给 components.body.cell）。colSpan/rowSpan 已由 cellMerge
  //   消费；这里取完整返回值透传。无 components.body.cell 时 onCellProps 不被使用（零回归）。
  //   注：onCell 在此与 cellMerge 内各调用一次（共两次）——antd demo 的 onCell 是纯函数，安全。
  let onCellProps: Record<string, any> | undefined
  if (column.onCell && components?.body?.cell) {
    try {
      onCellProps = column.onCell(record, index)
    } catch {
      onCellProps = undefined
    }
  }
  // ★ 接口全兼容（决策 3 第二步）：onRow 返回值（行级 props 注入）。
  let onRowProps: import('react').HTMLAttributes<HTMLElement> | undefined
  if (onRow) {
    try {
      onRowProps = onRow(record, index)
    } catch {
      onRowProps = undefined
    }
  }
  // ★ rowClassName（行级 class）：string 直接用；函数按行求值。
  const rowClassNameStr =
    rowClassName === undefined
      ? undefined
      : typeof rowClassName === 'string'
        ? rowClassName
        : (() => {
            try {
              return rowClassName(record, index)
            } catch {
              return undefined
            }
          })()
  // ★ rowHoverable=false 时不加 dg-row-hover（关闭内置 hover 视觉）。
  const hoverClass =
    rowHoverable === false ? undefined : isHovered ? 'dg-row-hover' : undefined
  // ★ §11 C2 tree-data 种子 #3（共享）：行选中态 → 加 dg-row-selected 类（CSS 消费 antd token）。
  //   镜像 flat 路径 ColumnCells（~2721）的算式，保证多级表头路径与 flat 路径行为一致。
  const selectedClass =
    isRowSelected && isRowSelected(record) ? 'dg-row-selected' : undefined
  // 合并 cell 级 + 行级 className（column.className + rowClassName + onRow.className）。
  const mergedBodyExtraClass = [
    column.className,
    rowClassNameStr,
    onRowProps?.className,
  ]
    .filter(Boolean)
    .join(' ') || undefined
  const mergedBodyExtraStyle: CSSProperties = {
    ...(column.style ?? null),
    ...(onRowProps?.style ?? null),
  }
  // 提取 onRow 事件 props（除 className/style）。
  const bodyEventProps: Record<string, unknown> = {}
  if (onRowProps) {
    for (const k of Object.keys(onRowProps)) {
      if (k === 'className' || k === 'style') continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bodyEventProps[k] = (onRowProps as any)[k]
    }
  }
  return (
    <div
      key={`b-${colIdx}-${getRowKey(record, rowKey) ?? index}`}
      className={[
        'dg-cell',
        'dg-cell-body',
        column.rowScope === 'row' ? 'dg-cell-rowscope' : undefined,
        fixedClass(column.fixed),
        shadowClass(info),
        column.hidden ? 'dg-cell-hidden' : undefined,
        // S20：ellipsis 列加 dg-cell-ellipsis 类（.dg-cell-inner 应用 ellipsis CSS）。
        //   S21：showTitle:false 仍加类（CSS 省略号照常），只是不加 native title。
        column.ellipsis === true ? 'dg-cell-ellipsis' : undefined,
        isSortedColumn ? 'dg-column-sort' : undefined,
        // ★ rowHoverable=false 时关闭内置 hover 视觉。
        hoverClass,
        // ★ §11 C2 tree-data 种子 #3（共享）：行选中态 → dg-row-selected 类。
        selectedClass,
        // S29：语义化 body.row 部位 className（行级 class 透传到该行所有单元格）。
        semanticBody?.className?.row,
        // S29：语义化 body.cell 部位 className（单元格级）。
        semanticBody?.className?.cell,
        // ★ 接口全兼容（决策 3 第二步）：column.className + rowClassName + onRow.className。
        mergedBodyExtraClass,
      ]
        .filter(Boolean)
        .join(' ')}
      data-align={column.align ?? undefined}
      data-row-index={index}
      // ★ §11 row-selection：表体格也标 data-column-key（与表头格 GridTable.tsx:2282/2604 对齐）。
      //   用于选择列（key='__dg_selection__'）专用样式定位——antd selection.ts:49-61 给选择列单元格
      //   单独设 paddingInlineStart/End = paddingXS(4px)（区别于普通列的 cellPaddingInline），CSS 需精确命中。
      //   之前仅表头格标 data-column-key，表体选择列 padding 沿用普通列（16/8px）→ 与 antd 不符。
      data-column-key={column.key}
      style={{
        gridColumn:
          colSpan > 1 ? `${colIdx + 1} / span ${colSpan}` : `${colIdx + 1}`,
        gridRow:
          rowSpanTracks > 1
            ? `${rowLine} / span ${rowSpanTracks}`
            : `${rowLine}`,
        ...(column.align ? { textAlign: column.align } : null),
        ...stickyCellStyle(info),
        // S29：语义化 body.row 部位 style（行级 style 透传到该行所有单元格）。
        ...(semanticBody?.style?.row ?? null),
        // S29：语义化 body.cell 部位 style（单元格级；后于 row 合并，覆盖 row 同名字段）。
        ...(semanticBody?.style?.cell ?? null),
        // ★ 接口全兼容（决策 3 第二步）：column.style + onRow.style 合并。
        ...mergedBodyExtraStyle,
      }}
      onMouseEnter={
        rowHoverable === false
          ? (bodyEventProps.onMouseEnter as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)
          : (e: React.MouseEvent<HTMLElement>) => {
              onHoverEnter()
              ;(bodyEventProps.onMouseEnter as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)?.(e)
            }
      }
      onMouseLeave={
        rowHoverable === false
          ? (bodyEventProps.onMouseLeave as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)
          : (e: React.MouseEvent<HTMLElement>) => {
              onHoverLeave()
              ;(bodyEventProps.onMouseLeave as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)?.(e)
            }
      }
      // ★ 接口全兼容（决策 3 第二步）：其余 onRow 事件 props 透传（onMouseEnter/Leave 已单独合并，跳过）。
      {...omitKey(omitKey(bodyEventProps, 'onMouseEnter'), 'onMouseLeave')}
    >
      <div
        className="dg-cell-inner"
        // S20：ellipsis 列默认 title 提示（hover 显示完整文本；非 ellipsis 列无 title）。
        //   S21：showTitle:false 时 ellipsisTitle 已为 undefined（不加 native title，让 antd Tooltip 接管）。
        title={ellipsisTitle}
      >
        {treeEnabled && treeState && colIdx === treeFirstDataColumnIdx
          ? renderTreeIndent({ record, rowKey, treeState })
          : null}
        {renderCellContent({
          components,
          column,
          record,
          index,
          rendered,
          onCellProps,
        })}
      </div>
    </div>
  )
}

/**
 * S15 数据区单元格批量渲染（multi 路径）。
 *
 * - 当 `components.body.row` 提供时：按**行**优先遍历，每行用 body.row 组件包裹该行所有
 *   BodyCell（body.row 不产生 grid DOM——典型 EditableRow 用 antd Form + Context.Provider，
 *   Provider 不渲染真实 DOM 节点，BodyCell 仍是 grid 直接子元素，grid 显式定位保证布局正确）。
 *   透传给 body.row 的 props：`{ index, children, record, rowKey }`（对齐 antd body.row 签名
 *   `{ index, ...props }`，data-grid 额外提供 record/rowKey 便于行级逻辑）。
 * - 否则：按**列**优先遍历（历史行为，单元格 DOM 列连续，性能略优）。
 *
 * 两种遍历顺序在 grid 显式定位下视觉等价（gridColumn/gridRow 决定位置，与 DOM 顺序无关）。
 */
function renderBodyCells<RecordType>({
  leafColumns,
  dataSource,
  virtualEnabled,
  virtualState,
  cellMergePlan,
  expandEnabled,
  expandState,
  rowKey,
  hoveredRowIndex,
  setHoveredRowIndex,
  rowLineBase,
  leafSticky,
  treeEnabled,
  treeState,
  treeFirstDataColumnIdx,
  components,
  semanticBody,
  // ★ 接口全兼容（决策 3 第二步）：onRow / rowClassName / rowHoverable 透传到表体单元格。
  onRow,
  rowClassName,
  rowHoverable = true,
  // ★ §11 C2 tree-data 种子 #3（共享）：行选中态判定 → 加 dg-row-selected 类。
  isRowSelected,
}: {
  leafColumns: Array<EngineLeafColumn<RecordType>>
  dataSource: Array<RecordType>
  virtualEnabled: boolean
  virtualState: { start: number; end: number }
  cellMergePlan: CellMergePlan | null
  expandEnabled: boolean
  expandState: EngineExpandState | undefined
  rowKey: string | ((record: RecordType) => string | number)
  hoveredRowIndex: number | null
  setHoveredRowIndex: (index: number | null) => void
  rowLineBase: (index: number) => number
  leafSticky: Array<LeafStickyInfo | undefined>
  treeEnabled: boolean
  treeState: EngineTreeState | undefined
  treeFirstDataColumnIdx: number
  components: import('./types').EngineTableProps['components']
  /** S29：语义化 body 部位（cell/row/wrapper）。 */
  semanticBody?: import('./types').EngineSemantic['body']
  /** ★ 接口全兼容（决策 3 第二步）：onRow 行级 props 注入。 */
  onRow?: (record: any, index: number) => import('react').HTMLAttributes<HTMLElement> | undefined
  /** ★ 接口全兼容（决策 3 第二步）：rowClassName 行级 class。 */
  rowClassName?: string | ((record: any, index: number) => string)
  /** ★ 接口全兼容（决策 3 第二步）：rowHoverable 行 hover 开关，默认 true。 */
  rowHoverable?: boolean
  /** ★ §11 C2 tree-data 种子 #3（共享）：行选中态判定回调。 */
  isRowSelected?: (record: RecordType) => boolean
}): Array<ReactNode> {
  // ★ 接口全兼容（决策 3 第二步）：按行预计算 onRow 返回值 + rowClassName（同行的每个单元格共享）。
  //   预计算避免在 BodyCell 内重复调用（onRow 是用户函数，重复调用既浪费也可能有副作用）。
  const lo = virtualEnabled ? virtualState.start : 0
  const hi = virtualEnabled ? virtualState.end : dataSource.length
  const BodyRow = components?.body?.row
  const out: Array<ReactNode> = []

  // 计算某 (colIdx, index) 的合并 span 信息（含 M9 展开 track 偏移）。
  const computeMerge = (colIdx: number, index: number) => {
    const merge: CellMergeInfo | undefined = cellMergePlan?.[colIdx]?.[index]
    if (merge?.hidden) return null // 被覆盖格跳过
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
    return { merge, rowSpanTracks }
  }

  // ★ §11 对齐 antd 6.4.4 / rc-table 7.51 的 column-aware hover：合并格（rowSpan>1）在
  //   其跨度内任一行被 hover 时，该合并格本身也加 dg-row-hover 高亮（视觉占跨度行空间就高亮）。
  //   antd 实现：rc-table Cell/index.js:92 useHoverState(index, mergedRowSpan) +
  //   useHoverState.js:4-7 inHoverRange(cellStartRow, cellRowSpan, hoverStart, hoverEnd) 用区间相交判定
  //   （onMouseEnter 调 onHover(index, index+rowSpan-1)，单行 hover 时 hoverStart===hoverEnd）。
  //   data-grid 的 hoveredRowIndex 等价于 hoverStart===hoverEnd===该行 index，故区间相交退化为：
  //   hoveredRowIndex 落在 [startRow, startRow+logicalRowSpan-1] 即高亮。
  //   ★ rowSpan=1（普通格，含 flat 路径全部 cell）退化为 hoveredRowIndex===startRow，与原逻辑
  //     完全一致——非合并 demo 零回归。logicalRowSpan 取 merge.rowSpan（不含 M9 展开 track 偏移），
  //     因 hoveredRowIndex 是逻辑行 index（与 antd 行号同语义）。
  const isRowSpanHovered = (startRow: number, logicalRowSpan: number) =>
    hoveredRowIndex !== null &&
    hoveredRowIndex >= startRow &&
    hoveredRowIndex <= startRow + logicalRowSpan - 1

  if (BodyRow) {
    // 行优先遍历：每行用 body.row 包裹。
    for (let index = lo; index < hi; index += 1) {
      const record = dataSource[index]
      if (record === undefined) continue
      const rowLine = rowLineBase(index)
      const rowCells: Array<ReactNode> = []
      for (let colIdx = 0; colIdx < leafColumns.length; colIdx += 1) {
        const column = leafColumns[colIdx]
        const m = computeMerge(colIdx, index)
        if (m === null) continue
        const isSortedColumn =
          !!column.sorter && column.sortOrder !== null && column.sortOrder !== undefined
        // ★ §11 rowSpan-aware hover：合并格按区间相交判定（见 isRowSpanHovered 注释）。
        //   rowSpan=1 退化为 hoveredRowIndex===index（零回归）。
        const isHovered = isRowSpanHovered(index, m.merge?.rowSpan ?? 1)
        rowCells.push(
          <BodyCell<RecordType>
            key={`b-${colIdx}-${getRowKey(record, rowKey) ?? index}`}
            column={column}
            colIdx={colIdx}
            record={record}
            index={index}
            merge={m.merge}
            rowSpanTracks={m.rowSpanTracks}
            rowLine={rowLine}
            info={leafSticky[colIdx]}
            isHovered={isHovered}
            isSortedColumn={isSortedColumn}
            treeEnabled={treeEnabled}
            treeState={treeState}
            treeFirstDataColumnIdx={treeFirstDataColumnIdx}
            rowKey={rowKey}
            components={components}
            semanticBody={semanticBody}
            onHoverEnter={() => setHoveredRowIndex(index)}
            onHoverLeave={() => setHoveredRowIndex(null)}
            // ★ 接口全兼容（决策 3 第二步）：onRow / rowClassName / rowHoverable 透传。
            onRow={onRow}
            rowClassName={rowClassName}
            rowHoverable={rowHoverable}
            // ★ §11 C2 tree-data 种子 #3（共享）：行选中态判定。
            isRowSelected={isRowSelected}
          />,
        )
      }
      // 用 body.row 组件包裹该行所有单元格。
      // body.row 组件应返回**不产生 grid DOM**的结构（如 antd Form + Context.Provider，
      // Provider 不渲染真实 DOM；或直接返回 children）。这样 BodyCell 仍是 grid 直接子元素，
      // grid 显式定位保证布局正确。
      // 透传 props：对齐 antd body.row 签名 { index, ...props } + data-grid 扩展 record/rowKey。
      out.push(
        <BodyRow
          key={`row-${getRowKey(record, rowKey) ?? index}`}
          index={index}
          record={record}
          rowKey={getRowKey(record, rowKey)}
        >
          {rowCells}
        </BodyRow>,
      )
    }
    return out
  }

  // 列优先遍历（历史行为，无 body.row 时）。
  for (let colIdx = 0; colIdx < leafColumns.length; colIdx += 1) {
    const column = leafColumns[colIdx]
    const isSortedColumn =
      !!column.sorter && column.sortOrder !== null && column.sortOrder !== undefined
    for (let index = lo; index < hi; index += 1) {
      const record = dataSource[index]
      if (record === undefined) continue
      const m = computeMerge(colIdx, index)
      if (m === null) continue
      // ★ §11 rowSpan-aware hover：合并格按区间相交判定（见 isRowSpanHovered 注释）。
      //   rowSpan=1 退化为 hoveredRowIndex===index（零回归）。
      const isHovered = isRowSpanHovered(index, m.merge?.rowSpan ?? 1)
      out.push(
        <BodyCell<RecordType>
          key={`b-${colIdx}-${getRowKey(record, rowKey) ?? index}`}
          column={column}
          colIdx={colIdx}
          record={record}
          index={index}
          merge={m.merge}
          rowSpanTracks={m.rowSpanTracks}
          rowLine={rowLineBase(index)}
          info={leafSticky[colIdx]}
          isHovered={isHovered}
          isSortedColumn={isSortedColumn}
          treeEnabled={treeEnabled}
          treeState={treeState}
          treeFirstDataColumnIdx={treeFirstDataColumnIdx}
          rowKey={rowKey}
          components={components}
          semanticBody={semanticBody}
          onHoverEnter={() => setHoveredRowIndex(index)}
          onHoverLeave={() => setHoveredRowIndex(null)}
          // ★ 接口全兼容（决策 3 第二步）：onRow / rowClassName / rowHoverable 透传。
          onRow={onRow}
          rowClassName={rowClassName}
          rowHoverable={rowHoverable}
          // ★ §11 C2 tree-data 种子 #3（共享）：行选中态判定。
          isRowSelected={isRowSelected}
        />,
      )
    }
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
  stickyHeaderOffset,
  resizeEnabled,
  onResizerPointerDown,
  resizingKey,
  onSorterClick,
  onFilterApply,
  semanticHeader,
  // ★ 接口全兼容（决策 3 第二步）：onHeaderRow / getPopupContainer / headerColumns。
  onHeaderRow,
  getPopupContainer,
  headerColumns,
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
   *   - M4 虚拟滚动（virtual=true && scroll.y===true）：`.dg-virtual-scroll` 承载纵向滚动。
   *   - M8 固定表头（非 virtual && scroll.y===true）：`.dg-scroll` 承载纵向滚动（CSS 自动适应高度）。
   *
   * 与 M2 横向 sticky 共存（corner cell）：单个元素可同时 sticky left + top（浏览器原生支持；
   * antd rc-table corner cell 同款实现）。双 sticky 同时存在时 zIndex 取最高（5）> 仅纵向（4）>
   * 仅横向（3）。
   *
   * ★ S34：sticky prop 启用时本字段恒为 false（页面级与容器内互斥）；改由 `stickyHeaderOffset`
   *   驱动表头相对 viewport 固定（top: offsetHeader）。
   */
  headerStickyTop?: boolean
  /**
   * S34 表头页面级 sticky 偏移（px）。仅 `sticky` prop 启用时传入（否则 undefined）。
   *
   * `undefined`：不启用页面级 sticky（走 M4/M8 容器内或默认无固定）。
   * `number`（含 0）：表头格 inline style 加 `position: sticky; top: <offset>px; zIndex: 4`
   * （或 corner 双 sticky 时 5），相对**页面 viewport** 固定（grid 不包 overflow 容器，无 overflow
   * 祖先拦截 sticky 上下文）。页面纵向滚动时表头钉在视口顶部 `<offset>px` 处。
   *
   * 与 `headerStickyTop` 互斥（同时启用时 sticky 优先，headerStickyTop 恒 false）。
   * 与 M2 横向 sticky 共存（corner cell 双 sticky，与 M4/M8 同款）。
   */
  stickyHeaderOffset?: number
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
  /** S29：语义化 header 部位（cell/row/wrapper 的 className 与 style）。 */
  semanticHeader?: import('./types').EngineSemantic['header']
  /**
   * ★ 接口全兼容（决策 3 第二步）：onHeaderRow 行级 props 注入（来自 TableProps.onHeaderRow）。
   * grid 无独立 `<tr>`，引擎把 onHeaderRow 返回值透传到该表头行**所有表头格**（事件 + class + style）。
   * 未提供（undefined）时不注入（零回归）。
   */
  onHeaderRow?: (
    columns: Array<unknown>,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
  /**
   * ★ 接口全兼容（决策 3 第二步）：getPopupContainer（来自 TableProps.getPopupContainer）。
   * 作为该表头格内 FilterDropdown 的默认挂载容器（列级 filterDropdownProps.getPopupContainer 优先）。
   */
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement
  /**
   * ★ 接口全兼容（决策 3 第二步）：onHeaderRow(columns, index) 的 columns 参数（顶层列 raw 数组）。
   * 由 GridTableInner 计算后传入（多级表头简化为顶层列）。
   */
  headerColumns?: Array<unknown>
}) {
  // ★ 接口全兼容（决策 3 第二步）：onHeaderCell 返回值（表头格 props 注入）。
  //   仅叶子表头格消费（cell.onHeaderCell 仅叶子格有值；分组格恒 undefined）。返回值整体合并到表头格 div
  //   的 props（className/style/onClick/...）。与 antd useSorter.tsx:217-219 同款合并逻辑
  //   （`column.onHeaderCell?.(col) || {}`）。
  //   try/catch 防御用户函数抛错（与 onCell 同款保护）。
  let onHeaderCellProps: import('react').HTMLAttributes<HTMLElement> | undefined
  if (cell.isLeaf && cell.onHeaderCell) {
    try {
      const raw = cell.raw as ColumnType | undefined
      onHeaderCellProps = cell.onHeaderCell(raw as unknown as ColumnType, cell.gridRowStart - 1)
    } catch {
      onHeaderCellProps = undefined
    }
  }
  // ★ onHeaderRow 返回值（行级 props 注入）。表头行号 = cell.gridRowStart - 1（0-based）。
  //   columns 参数用 headerColumns（顶层列 raw）；单层表头 = 全部 columns。
  let onHeaderRowProps: import('react').HTMLAttributes<HTMLElement> | undefined
  if (onHeaderRow) {
    try {
      onHeaderRowProps = onHeaderRow(headerColumns ?? [], cell.gridRowStart - 1)
    } catch {
      onHeaderRowProps = undefined
    }
  }
  // 合并 cell 级 + 行级 className（cell.onHeaderCell.className + cell.className + 行 onHeaderRow.className）。
  // 顺序：基础 dg 类 → semantic.cell → cell.className（列级）→ onHeaderCell.className（单元格级）
  //   → onHeaderRow.className（行级，最后合并保证行级最优先）。
  const mergedHeaderExtraClass = [
    cell.className,
    onHeaderCellProps?.className,
    onHeaderRowProps?.className,
  ]
    .filter(Boolean)
    .join(' ') || undefined
  // 合并 cell 级 + 行级 style（后者覆盖前者同名字段）。
  const mergedHeaderExtraStyle: CSSProperties = {
    ...(cell.style ?? null),
    ...(onHeaderCellProps?.style ?? null),
    ...(onHeaderRowProps?.style ?? null),
  }
  // 提取事件 props（onHeaderCell + onHeaderRow 合并；行级优先覆盖单元格级同名字段）。
  //   仅取 on* 开头的事件 handler（排除 className/style 已单独合并；其余 onXxx 透传到 div）。
  const headerEventProps: Record<string, unknown> = {}
  for (const src of [onHeaderCellProps, onHeaderRowProps]) {
    if (!src) continue
    for (const k of Object.keys(src)) {
      if (k === 'className' || k === 'style') continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      headerEventProps[k] = (src as any)[k]
    }
  }
  // 分组表头格默认居中（与 antd 多级表头一致）；叶子表头格保留列对齐。
  // M3：表头横向合并格（headerColSpan>1）也居中（跨多列的表头，与 antd <th colspan> 一致）。
  const headerSpan = cell.headerColSpan ?? 1
  const selfAlign: Align | undefined = cell.isLeaf
    ? headerSpan > 1
      ? 'center'
      : cell.align
    : 'center'
  // 合并 sticky 样式：M2 横向（左/右）+ 纵向 top:0（M4/M8）或 top:offsetHeader（S34 页面级）。
  const horizontalSticky = stickyHeaderCellStyle(sticky)
  const hasHorizontalSticky = !!sticky?.side // M2 固定列（左/右）
  // S34：stickyHeaderOffset（页面级，相对 viewport）优先于 headerStickyTop（容器内，top:0）。
  //   两者互斥（sticky 启用时 headerStickyTop 恒 false），这里防御性取优先级。
  const verticalSticky: CSSProperties = stickyHeaderOffset !== undefined
    ? { position: 'sticky', top: `${stickyHeaderOffset}px`, zIndex: 4 }
    : headerStickyTop
      ? { position: 'sticky', top: 0, zIndex: 4 }
      : {}
  const hasVerticalSticky = stickyHeaderOffset !== undefined || !!headerStickyTop
  // ★ corner cell（表头 × 固定列交叉格，双 sticky）：横向+纵向同时存在时，该格需要
  //   **最高 z-index**（5），保证横向滚动时始终盖住"只纵向 sticky 的中间表头格"（z-index 4）
  //   与"只横向 sticky 的固定列表头格"（z-index 3）。
  //   修复 bug：原实现 corner cell 取纵向 z-index（4），与中间表头格（4）相同，
  //   DOM 后渲染的中间表头格横向滚动时会盖住 corner cell。
  //   z-index 层级：普通(auto) < 表体固定列(2) < 表头固定列(3) < 表头顶部(4) < corner 双 sticky(5)。
  const cornerZIndex = 5
  const mergedSticky: CSSProperties = (() => {
    const merged: CSSProperties = { ...horizontalSticky, ...verticalSticky }
    if (hasHorizontalSticky && hasVerticalSticky) {
      merged.zIndex = cornerZIndex
    }
    return merged
  })()
  // S1：该表头格是否可排序（仅叶子表头格；分组格无排序）。
  const sortable = cell.isLeaf && cell.sortable === true && !cell.hidden
  // S1：当前排序态（null/ascend/descend）；仅可排序格有意义。
  const sortOrder = sortable ? (cell.sortOrder ?? null) : null
  // S1：是否为当前激活排序列（order 非 null）→ 加 dg-column-sort 类（表头/表体背景变淡灰）。
  const isSorted = sortable && sortOrder !== null
  // S3/S5/S12：该表头格是否可筛选（仅叶子表头格；分组格无筛选）。
  // filterable 标志由列树派生（useFilter.isFilterable）；但防御性兜底：即便 cell.filterable 未置位，
  // 只要 cell.filterDropdown 存在（S5）/ filters 非空（S3/S12）/ onFilter 存在也视为可筛选
  // （对齐 antd `useFilter/index.tsx:38`：filters || filterDropdown || onFilter 任一即 filterable）。
  const filterable =
    cell.isLeaf &&
    !cell.hidden &&
    (cell.filterable === true ||
      (cell.filterDropdown !== undefined && cell.filterDropdown !== null) ||
      (!!cell.filters && cell.filters.length > 0))
  // 表头格内部是否需要"右侧操作区"（sorter caret / filter 漏斗）。
  // sortable 或 filterable 任一为 true → 用 dg-column-sorters flex 容器（title + 右侧图标）。
  const hasActions = sortable || filterable
  // S20：表头 ellipsis（仅叶子表头格；对齐 antd：长 title 省略 + hover 显示完整标题）。
  //   - cell.ellipsis=true 且无右侧操作区（非 sortable/filterable）→ 单 .dg-cell-inner 容器，
  //     该容器加 ellipsis 类 + title。
  //   - 有右侧操作区（sortable/filterable）→ 用 .dg-column-sorters 容器（title 在 .dg-column-title
  //     子元素里）；ellipsis 作用于 .dg-column-title（CSS 选择器见 table.css）。title 仍文本化加到
  //     .dg-column-title 上（hover 标题文字提示完整文案）。
  //   注：分组表头格（cell.isLeaf=false）不消费 ellipsis（columnTree 已置 undefined）。
  //   S21：showTitle:false 时不加 native title（让 render/外部 Tooltip 接管）——与表体同款门。
  const headerEllipsis = cell.isLeaf && cell.ellipsis === true
  const headerTitle =
    headerEllipsis && cell.showTitle !== false ? toEllipsisTitle(cell.title) : undefined
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
        // S20：叶子表头格 ellipsis 加 dg-cell-ellipsis（作用于 .dg-cell-inner / .dg-column-title）。
        headerEllipsis ? 'dg-cell-ellipsis' : undefined,
        // M4/M8 表头纵向 sticky：补不透明背景（防止表体透过）+ 配合 inline position/top/zIndex。
        // S34：stickyHeaderOffset（页面级）同样需要不透明背景（grid 不包容器，表头悬浮于表体之上）。
        (headerStickyTop || stickyHeaderOffset !== undefined) ? 'dg-cell-header-vsticky' : undefined,
        // S1：可排序列表头格加 dg-column-has-sorters（cursor:pointer + hover 背景）。
        sortable ? 'dg-column-has-sorters' : undefined,
        // S3：可筛选列表头格加 dg-column-has-filter（hover 背景 + 漏斗区域视觉提示）。
        filterable ? 'dg-column-has-filter' : undefined,
        // S1：当前排序列表头格加 dg-column-sort（淡灰背景，对齐 antd tableHeaderSortBg）。
        isSorted ? 'dg-column-sort' : undefined,
        // S29：语义化 header.cell 部位 className（合并）。
        semanticHeader?.className?.cell,
        // ★ 接口全兼容（决策 3 第二步）：cell.className（列级）+ onHeaderCell.className（格级）
        //   + onHeaderRow.className（行级）合并（顺序见 mergedHeaderExtraClass 注释）。
        mergedHeaderExtraClass,
      ]
        .filter(Boolean)
        .join(' ')}
      data-align={selfAlign ?? undefined}
      data-leaf={cell.isLeaf ? '1' : '0'}
      data-leaf-index={cell.isLeaf && cell.leafIndex !== undefined ? String(cell.leafIndex) : undefined}
      data-column-key={cell.isLeaf ? cell.key : undefined}
      // ★ 表头分隔线排除标记（对齐 antd `thead th:not(:last-child)::before`）：
      //   data-leaf-last = 全局末列；data-group-last = 分组最右叶子（多级表头分组右边界）。
      //   由 columnTree.markLastLeaves 算出（见该函数注释）；CSS ::before 用 :not() 排除。
      //   详见 table.css `[data-leaf-index]::before` 注释。
      data-leaf-last={cell.isLeaf && cell.isLastLeaf ? '' : undefined}
      data-group-last={cell.isLeaf && cell.isGroupLastLeaf ? '' : undefined}
      // ★ §11 colspan-rowspan 对齐：叶子表头格跨列数（>=2 时标记）。用于 CSS ::before 分割竖线
      //   排除跨列表头格（对齐 antd `thead th:not([colspan])::before`——跨列表头格无内部分割线）。
      //   headerColSpan 由 columnTree.applyHeaderColSpan 设置（Home phone colSpan:2 → 2；普通列 1）。
      data-header-colspan={
        cell.isLeaf && cell.headerColSpan !== undefined && cell.headerColSpan >= 2
          ? String(cell.headerColSpan)
          : undefined
      }
      data-sorter-order={isSorted ? (sortOrder ?? undefined) : undefined}
      // S1：showSorterTooltip（非 false）→ hover 提示。简单实现为原生 title（对齐 antd 默认 locale：
      //   ascend → "Click to sort descending"，descend → "Cancel sorting"，null → "Click to sort ascending"）。
      //   完整 Tooltip + target 区分（full-header / sorter-icon）留后续视觉打磨。
      //   ★ S20 冲突处理：表头格 ellipsis 启用时，title 用于显示完整表头文案（对齐 antd：antd 用
      //   独立 Tooltip 显示排序提示、title 属性显示单元格内容，两者不冲突；data-grid 用原生 title
      //   只能取一，ellipsis 时优先 title=完整文案，排序提示让位——与 antd 视觉差异：少一个排序提示
      //   tooltip，但 ellipsis 的核心"hover 看完整文案"行为保留）。非 ellipsis 排序列保持原排序提示。
      title={
        headerEllipsis
          ? headerTitle
          : sortable && cell.showSorterTooltip !== false
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
        // S29：语义化 header.cell 部位 style（合并覆盖同名字段）。
        ...(semanticHeader?.style?.cell ?? null),
        // ★ 接口全兼容（决策 3 第二步）：cell.style + onHeaderCell.style + onHeaderRow.style 合并
        //   （后者覆盖前者同名字段；在 semantic 之后，保证用户注入最优先）。
        ...mergedHeaderExtraStyle,
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
              // ★ 接口全兼容（决策 3 第二步）：合并后的 onClick（onHeaderCell + onHeaderRow）在排序
              //   之后触发（与 antd 表头 onClick 行为一致：排序 + 用户自定义 click 都执行）。
              ;(headerEventProps.onClick as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)?.(e)
            }
          : (headerEventProps.onClick as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)
      }
      // ★ 接口全兼容（决策 3 第二步）：其余事件 props（onDoubleClick/onMouseEnter/...）透传到表头格 div。
      //   onClick 已单独合并到排序逻辑（上方），这里跳过 onClick 避免重复触发。
      {...omitKey(headerEventProps, 'onClick')}
    >
      {hasActions ? (
        // S1/S3：可排序或可筛选列用 dg-column-sorters 容器（flex space-between：title + 右侧操作区）。
        // 右侧操作区含 sorter caret（S1/S2）+ filter 漏斗（S3），对齐 antd 同时有 sorter+filter 的列表头布局。
        // S20：ellipsis 作用于 .dg-column-title（CSS `.dg-cell.dg-cell-ellipsis .dg-column-title`）。
        <div className="dg-column-sorters">
          <div
            className="dg-column-title"
            // S20：ellipsis 列 hover 表头文字提示完整标题（非 ellipsis 列无 title）。
            title={headerTitle}
          >
            {cell.title ?? null}
          </div>
          <div className="dg-column-actions">
            {sortable ? (
              <SortIndicator sortOrder={sortOrder} priority={cell.sortPriority} />
            ) : null}
            {filterable && onFilterApply ? (
              <FilterDropdown
                filters={cell.filters ?? []}
                filterMultiple={cell.filterMultiple ?? true}
                filteredValue={cell.filteredValue ?? null}
                filterOnClose={cell.filterOnClose ?? true}
                onApply={(next) => onFilterApply(cell.key, next)}
                customDropdown={cell.filterDropdown}
                customIcon={cell.filterIcon}
                dropdownProps={cell.filterDropdownProps}
                filterSearch={cell.filterSearch}
                filterMode={cell.filterMode}
                // ★ 接口全兼容（决策 3 第二步）：Table 级 getPopupContainer 作为筛选下拉默认挂载容器。
                getPopupContainer={getPopupContainer}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <div
          className="dg-cell-inner"
          // S20：ellipsis 列 hover 表头提示完整标题（非 ellipsis 列无 title）。
          title={headerTitle}
        >
          {cell.title ?? null}
        </div>
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
  /**
   * ★ 表头分隔线排除：该列是否为全局末列（单层路径）。
   * 多级路径不传（由 columnTree.markLastLeaves 算 cell.isLastLeaf → data-leaf-last）。
   * CSS 用 `:not([data-leaf-last])` 排除末列表头格的右侧分隔线。
   */
  isLastLeaf?: boolean
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
  /**
   * S34 表头页面级 sticky 偏移（px）。详见 HeaderCell 同名 prop。
   * sticky prop 启用时表头格相对 viewport 固定（top: offsetHeader）。
   */
  stickyHeaderOffset?: number
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
  /** S15：自定义组件（components.body.cell 替换单元格内容；body.row 暂不在此路径消费）。 */
  components?: import('./types').EngineTableProps['components']
  /** S29：语义化 header 部位（cell/row/wrapper）。 */
  semanticHeader?: import('./types').EngineSemantic['header']
  /** S29：语义化 body 部位（cell/row/wrapper）。 */
  semanticBody?: import('./types').EngineSemantic['body']
  /**
   * ★ 接口全兼容（决策 3 第二步）：onHeaderRow / onRow / rowClassName / getPopupContainer / rowHoverable。
   * 详见 EngineTableProps 同名字段 + GridTableInner 接入注释。flat 路径与 multi 路径同款接入。
   */
  onHeaderRow?: import('./types').EngineTableProps['onHeaderRow']
  onRow?: import('./types').EngineTableProps['onRow']
  rowClassName?: import('./types').EngineTableProps['rowClassName']
  getPopupContainer?: import('./types').EngineTableProps['getPopupContainer']
  rowHoverable?: boolean
  /** onHeaderRow(columns, index) 的 columns 参数（顶层列 raw 数组）。 */
  headerColumns?: Array<unknown>
  /**
   * ★ §11 C2 tree-data 种子 #3（共享）：行选中态判定回调。
   * 引擎在命中选中行的所有 body cell 上加 `dg-row-selected` 类（CSS 消费 antd token）。
   * 未提供（undefined）时不加类（零回归）。详见 EngineTableProps.isRowSelected。
   */
  isRowSelected?: (record: RecordType) => boolean
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
    isLastLeaf,
    dataSource,
    rowKey,
    showHeader,
    hoveredRowIndex,
    onHoverRow,
    sticky,
    headerStickyTop,
    stickyHeaderOffset,
    resizeEnabled,
    onResizerPointerDown,
    resizingKey,
    onSorterClick,
    onFilterApply,
    components,
    semanticHeader,
    semanticBody,
    onHeaderRow,
    onRow,
    rowClassName,
    getPopupContainer,
    rowHoverable = true,
    headerColumns,
    // ★ §11 C2 tree-data 种子 #3（共享）：行选中态判定 → 加 dg-row-selected 类。
    isRowSelected,
  } = props

  // ★ 接口全兼容（决策 3 第二步）：onHeaderCell 返回值（flat 路径表头格 props 注入）。
  //   column.onHeaderCell 来自叶子列；返回值整体合并到表头格 div props。与 multi 路径 HeaderCell 同款。
  let onHeaderCellProps: import('react').HTMLAttributes<HTMLElement> | undefined
  if (column.onHeaderCell) {
    try {
      onHeaderCellProps = column.onHeaderCell(column.raw as unknown as ColumnType, 0)
    } catch {
      onHeaderCellProps = undefined
    }
  }
  // ★ onHeaderRow 返回值（行级 props）。flat 路径单层表头，index 恒 0。
  let onHeaderRowProps: import('react').HTMLAttributes<HTMLElement> | undefined
  if (onHeaderRow) {
    try {
      onHeaderRowProps = onHeaderRow(headerColumns ?? [], 0)
    } catch {
      onHeaderRowProps = undefined
    }
  }
  const mergedHeaderExtraClassFlat = [
    column.className,
    onHeaderCellProps?.className,
    onHeaderRowProps?.className,
  ]
    .filter(Boolean)
    .join(' ') || undefined
  const mergedHeaderExtraStyleFlat: CSSProperties = {
    ...(column.style ?? null),
    ...(onHeaderCellProps?.style ?? null),
    ...(onHeaderRowProps?.style ?? null),
  }
  const headerEventPropsFlat: Record<string, unknown> = {}
  for (const src of [onHeaderCellProps, onHeaderRowProps]) {
    if (!src) continue
    for (const k of Object.keys(src)) {
      if (k === 'className' || k === 'style') continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      headerEventPropsFlat[k] = (src as any)[k]
    }
  }

  // 合并 sticky 样式：M2 横向（左/右）+ 纵向（M8/M4 top:0 或 S34 top:offsetHeader）。与 HeaderCell 同款。
  const horizontalSticky = stickyHeaderCellStyle(sticky)
  const hasHorizontalSticky = !!sticky?.side // M2 固定列（左/右）
  // S34：stickyHeaderOffset（页面级）优先于 headerStickyTop（容器内 top:0）。
  const verticalSticky: CSSProperties = stickyHeaderOffset !== undefined
    ? { position: 'sticky', top: `${stickyHeaderOffset}px`, zIndex: 4 }
    : headerStickyTop
      ? { position: 'sticky', top: 0, zIndex: 4 }
      : {}
  const hasVerticalSticky = stickyHeaderOffset !== undefined || !!headerStickyTop
  // ★ corner cell（表头 × 固定列交叉格，双 sticky）：与 HeaderCell 同款——
  //   横向+纵向同时存在时取最高 z-index（5），盖住中间表头格（4）与固定列表头格（3）。
  //   修复 corner cell 横向滚动被中间表头格盖住的 bug。
  const mergedHeaderSticky: CSSProperties = (() => {
    const merged: CSSProperties = { ...horizontalSticky, ...verticalSticky }
    if (hasHorizontalSticky && hasVerticalSticky) {
      merged.zIndex = 5
    }
    return merged
  })()

  // S1：该列是否可排序 + 当前排序态（与 HeaderCell 同款逻辑）。
  const sortable =
    !!column.sorter && !column.hidden &&
    (column.sorter === true || typeof column.sorter === 'function' || (typeof column.sorter === 'object' && column.sorter !== null))
  const sortOrder = sortable ? (column.sortOrder ?? null) : null
  const isSorted = sortable && sortOrder !== null
  // S3/S5/S12：该列是否可筛选（filters 非空 || filterDropdown 存在 || onFilter 是函数）。
  // 对齐 antd `useFilter/index.tsx:38`：onFilter 非必需——服务端筛选列有 filters 但无 onFilter 也渲染漏斗。
  const filterable =
    !column.hidden &&
    ((column.filterDropdown !== undefined && column.filterDropdown !== null) ||
      (!!column.filters && column.filters.length > 0) ||
      typeof column.onFilter === 'function')
  // 表头格内部是否需要"右侧操作区"（sorter / filter）。
  const hasActions = sortable || filterable
  // S20：表头 ellipsis（对齐 antd：长 title 省略 + hover 显示完整标题）。详见 HeaderCell 同款注释。
  //   S21：showTitle:false 时不加 native title（让 render/外部 Tooltip 接管）——与表体同款门。
  const headerEllipsis = column.ellipsis === true
  const headerTitle =
    headerEllipsis && column.showTitle !== false
      ? toEllipsisTitle(column.title)
      : undefined

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
            // M4/M8 表头纵向 sticky（容器内 top:0）或 S34 页面级 sticky（top:offsetHeader）：
            //   均需不透明背景（防止表体透过）+ 配合 inline position/top/zIndex。
            (headerStickyTop || stickyHeaderOffset !== undefined) ? 'dg-cell-header-vsticky' : undefined,
            sortable ? 'dg-column-has-sorters' : undefined,
            filterable ? 'dg-column-has-filter' : undefined,
            isSorted ? 'dg-column-sort' : undefined,
            // S20：叶子表头格 ellipsis 加 dg-cell-ellipsis（作用于 .dg-cell-inner / .dg-column-title）。
            headerEllipsis ? 'dg-cell-ellipsis' : undefined,
            // S29：语义化 header.cell 部位 className（合并）。
            semanticHeader?.className?.cell,
            // ★ 接口全兼容（决策 3 第二步）：column.className + onHeaderCell.className + onHeaderRow.className。
            mergedHeaderExtraClassFlat,
          ]
            .filter(Boolean)
            .join(' ')}
          data-align={column.align ?? undefined}
          data-leaf-index={String(colIdx)}
          data-column-key={column.key}
          // ★ 表头分隔线排除（单层末列，对齐 antd `thead th:not(:last-child)::before`）。
          //   单层无分组，仅设 data-leaf-last；多级路径在 HeaderCell 设 data-group-last。
          //   详见 table.css `[data-leaf-index]::before` 注释。
          data-leaf-last={isLastLeaf ? '' : undefined}
          data-sorter-order={isSorted ? (sortOrder ?? undefined) : undefined}
          // S1：showSorterTooltip hover 提示（简单 title，详见 HeaderCell 同款注释）。
          //   ★ S20 冲突处理：ellipsis 启用时 title=完整表头文案（优先），排序提示让位（详见 HeaderCell）。
          title={
            headerEllipsis
              ? headerTitle
              : sortable && column.showSorterTooltip !== false
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
            // S29：语义化 header.cell 部位 style（合并覆盖同名字段）。
            ...(semanticHeader?.style?.cell ?? null),
            // ★ 接口全兼容（决策 3 第二步）：column.style + onHeaderCell.style + onHeaderRow.style。
            ...mergedHeaderExtraStyleFlat,
          }}
          onClick={
            sortable && onSorterClick
              ? (e) => {
                  // ★ Bug-B 防御：仅当点击 target 真正落在本表头格内部时才触发排序（同非虚拟分支）。
                  if (!e.currentTarget.contains(e.target as Node)) return
                  e.stopPropagation()
                  onSorterClick(column.key)
                  // ★ 接口全兼容（决策 3 第二步）：合并后的 onClick 在排序之后触发。
                  ;(headerEventPropsFlat.onClick as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)?.(e)
                }
              : (headerEventPropsFlat.onClick as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)
          }
          // ★ 接口全兼容（决策 3 第二步）：其余事件 props 透传（onClick 已单独合并，跳过避免重复）。
          {...omitKey(headerEventPropsFlat, 'onClick')}
        >
          {hasActions ? (
            <div className="dg-column-sorters">
              <div
                className="dg-column-title"
                // S20：ellipsis 列 hover 表头文字提示完整标题（非 ellipsis 列无 title）。
                title={headerTitle}
              >
                {column.title ?? null}
              </div>
              <div className="dg-column-actions">
                {sortable ? (
                  <SortIndicator sortOrder={sortOrder} priority={column.sortPriority} />
                ) : null}
                {filterable && onFilterApply ? (
                  <FilterDropdown
                    filters={column.filters ?? []}
                    filterMultiple={column.filterMultiple ?? true}
                    filteredValue={column.filteredValue ?? null}
                    filterOnClose={column.filterOnClose ?? true}
                    onApply={(next) => onFilterApply(column.key, next)}
                    customDropdown={column.filterDropdown}
                    customIcon={column.filterIcon}
                    dropdownProps={column.filterDropdownProps}
                    filterSearch={column.filterSearch}
                    filterMode={column.filterMode}
                    // ★ 接口全兼容（决策 3 第二步）：Table 级 getPopupContainer 作为筛选下拉默认挂载容器。
                    getPopupContainer={getPopupContainer}
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <div
              className="dg-cell-inner"
              // S20：ellipsis 列 hover 表头提示完整标题（非 ellipsis 列无 title）。
              title={headerTitle}
            >
              {column.title ?? null}
            </div>
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
        // S20：ellipsis 列默认 title 提示（详见 BodyCell 同款注释）。取原始 dataIndex 值文本化。
        //   S21：showTitle:false 时不加 native title（详见 BodyCell 同款注释）。
        const ellipsisTitle =
          column.ellipsis === true && column.showTitle !== false
            ? typeof text === 'string'
              ? text
              : typeof text === 'number'
                ? String(text)
                : undefined
            : undefined
        // S15：调用 onCell 取完整返回值（透传给 components.body.cell）。详见 multi 路径同款注释。
        let onCellProps: Record<string, any> | undefined
        if (column.onCell && components?.body?.cell) {
          try {
            onCellProps = column.onCell(record, index)
          } catch {
            onCellProps = undefined
          }
        }
        const isHovered = hoveredRowIndex === index
        // ★ 接口全兼容（决策 3 第二步）：onRow 返回值（行级 props 注入到该单元格）。
        let onRowProps: import('react').HTMLAttributes<HTMLElement> | undefined
        if (onRow) {
          try {
            onRowProps = onRow(record, index)
          } catch {
            onRowProps = undefined
          }
        }
        // ★ rowClassName（行级 class）：string 直接用；函数按行求值。
        const rowClassNameStr =
          rowClassName === undefined
            ? undefined
            : typeof rowClassName === 'string'
              ? rowClassName
              : (() => {
                  try {
                    return rowClassName(record, index)
                  } catch {
                    return undefined
                  }
                })()
        // ★ rowHoverable=false 时不加 dg-row-hover（关闭内置 hover 视觉）。
        const hoverClass = rowHoverable === false ? undefined : isHovered ? 'dg-row-hover' : undefined
        // ★ §11 C2 tree-data 种子 #3（共享）：行选中态 → 加 dg-row-selected 类
        //   （CSS 消费 --ant-table-row-selected-bg / row-selected-hover-bg）。
        const selectedClass =
          isRowSelected && isRowSelected(record) ? 'dg-row-selected' : undefined
        // 合并 cell 级 + 行级 className（column.className + rowClassName + onRow.className）。
        const mergedBodyExtraClassFlat = [
          column.className,
          rowClassNameStr,
          onRowProps?.className,
        ]
          .filter(Boolean)
          .join(' ') || undefined
        const mergedBodyExtraStyleFlat: CSSProperties = {
          ...(column.style ?? null),
          ...(onRowProps?.style ?? null),
        }
        // 提取 onRow 事件 props（除 className/style）。
        const bodyEventPropsFlat: Record<string, unknown> = {}
        if (onRowProps) {
          for (const k of Object.keys(onRowProps)) {
            if (k === 'className' || k === 'style') continue
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            bodyEventPropsFlat[k] = (onRowProps as any)[k]
          }
        }
        return (
          <div
            key={getRowKey(record, rowKey) ?? index}
            className={[
              'dg-cell',
              'dg-cell-body',
              fixedClass(column.fixed),
              shadowClass(sticky),
              column.hidden ? 'dg-cell-hidden' : undefined,
              // S20：ellipsis 列加 dg-cell-ellipsis 类（.dg-cell-inner 应用 ellipsis CSS）。
              //   S21：showTitle:false 仍加类（CSS 省略号照常），只是不加 native title。
              column.ellipsis === true ? 'dg-cell-ellipsis' : undefined,
              // S1：当前排序列的表体格加 dg-column-sort（淡灰底，对齐 antd tableBodySortBg）。
              isSorted ? 'dg-column-sort' : undefined,
              // ★ rowHoverable=false 时关闭内置 hover 视觉。
              hoverClass,
              // ★ §11 C2 tree-data 种子 #3（共享）：行选中态 → dg-row-selected 类。
              selectedClass,
              // S29：语义化 body.row 部位 className（行级 class 透传到该行所有单元格）。
              semanticBody?.className?.row,
              // S29：语义化 body.cell 部位 className（单元格级）。
              semanticBody?.className?.cell,
              // ★ 接口全兼容（决策 3 第二步）：column.className + rowClassName + onRow.className。
              mergedBodyExtraClassFlat,
            ]
              .filter(Boolean)
              .join(' ')}
            data-align={column.align ?? undefined}
            data-row-index={index}
            // ★ §11 row-selection：表体格也标 data-column-key（与上方 BodyCell 多级表头路径 + 表头格一致）。
            //   选择列（key='__dg_selection__'）专用样式定位——antd selection.ts:49-61 选择列 padding
            //   = paddingXS(4px)，区别于普通列 cellPaddingInline。详见 BodyCell 同款注释。
            data-column-key={column.key}
            style={{
              ...(column.align ? { textAlign: column.align } : null),
              ...stickyCellStyle(sticky),
              // S29：语义化 body.row 部位 style（行级）。
              ...(semanticBody?.style?.row ?? null),
              // S29：语义化 body.cell 部位 style（单元格级；后于 row 合并）。
              ...(semanticBody?.style?.cell ?? null),
              // ★ 接口全兼容（决策 3 第二步）：column.style + onRow.style 合并。
              ...mergedBodyExtraStyleFlat,
            }}
            onMouseEnter={
              rowHoverable === false
                ? (bodyEventPropsFlat.onMouseEnter as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)
                : (e: React.MouseEvent<HTMLElement>) => {
                    onHoverRow(index)
                    ;(bodyEventPropsFlat.onMouseEnter as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)?.(e)
                  }
            }
            onMouseLeave={
              rowHoverable === false
                ? (bodyEventPropsFlat.onMouseLeave as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)
                : (e: React.MouseEvent<HTMLElement>) => {
                    onHoverRow(null)
                    ;(bodyEventPropsFlat.onMouseLeave as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)?.(e)
                  }
            }
            // ★ 接口全兼容（决策 3 第二步）：其余 onRow 事件 props 透传（onMouseEnter/Leave 已单独合并，跳过）。
            {...omitKey(omitKey(bodyEventPropsFlat, 'onMouseEnter'), 'onMouseLeave')}
          >
            <div
              className="dg-cell-inner"
              // S20：ellipsis 列默认 title 提示（hover 显示完整文本；非 ellipsis 列无 title）。
              title={ellipsisTitle}
            >
              {/* S15：若提供 components.body.cell，单元格内容用它渲染；否则直接渲染 rendered（零回归）。 */}
              {renderCellContent({
                components,
                column,
                record,
                index,
                rendered,
                onCellProps,
              })}
            </div>
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
 * ★ 接口全兼容（决策 3 第二步）：浅拷贝对象并剔除指定 key。
 *
 * 用于 HeaderCell / BodyCell 的事件 props 合并——onClick 等已单独处理（与排序/hover 逻辑合并），
 * 剩余 on* 事件透传到 div 时需剔除已处理的 key，避免重复触发。
 */
function omitKey<T extends Record<string, unknown>>(obj: T, key: string): Record<string, unknown> {
  if (!obj) return {}
  const { [key]: _omit, ...rest } = obj
  return rest
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
