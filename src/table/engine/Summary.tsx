/**
 * data-grid 汇总栏组件（S22 自研任务）。
 *
 * 对齐 antd v6 `Table.Summary` / `Table.Summary.Row` / `Table.Summary.Cell`：
 *   - `Summary`：容器（`fixed?: boolean` 控制 sticky bottom）。
 *   - `Summary.Row`：行容器。
 *   - `Summary.Cell`：`index`（列索引，0-based）+ `colSpan` + `children`。
 *
 * === 设计：声明式 + 引擎驱动定位（适配 data-grid 的 CSS Grid）===
 *
 * data-grid 用 div + CSS Grid 渲染，单元格是 grid item（非 td）。summary 的 Cell 也需要
 * 作为 grid item 放到 grid 末尾的 summary 区，并按 `index` + `colSpan` 定位到正确的列轨道。
 *
 * 三个组件本身都是**透明/轻量**的（不重度参与布局计算）：
 *   - `Summary`：返回 children（与 rc-table 一致，纯语法糖）。fixed 标志由适配层解析后
 *     通过 Context 透传给下游 Cell。
 *   - `Row`：返回 children，但用 Context.Provider 包裹，把"当前行的 grid-row 线号"+ fixed
 *     标志传给其 Cell 子节点。rowLine 由**引擎渲染时 cloneElement 注入**（引擎遍历 Summary
 *     的 children 逐个 Row 注入 `__rowLine`，详见 GridTable.renderSummary）。
 *   - `Cell`：渲染为 `div.dg-cell.dg-cell-summary`（真实 DOM，作为 grid item），inline style
 *     设 `gridColumn: <index+1> / span <colSpan>`、`gridRow: <rowLine>`、fixed 时加 sticky bottom。
 *
 * === 行号注入流程 ===
 *
 * summary 可能有多行（antd demo 示例1：Total 行 + Balance 行）。流程：
 *   1. 适配层 Table.tsx 解析 `summary` prop：
 *        - 函数 → 用 pagedDataSource 调用得到 ReactNode。
 *        - ReactNode → 原样。
 *      把 ReactNode 传给 GridTable。
 *   2. GridTable 在 grid-template-rows 末尾为 summary 分配 N 条 track（N = 解析得到的行数），
 *      算出 summary 区起始线（startLine = headerRows + bodyRows + 1）。
 *   3. GridTable 渲染 summary 区时遍历 Summary 容器的 children（各 Row），用 cloneElement
 *      给每个 Row 注入 `__rowLine = startLine + rowIndex` + `__fixed`。
 *   4. Row 通过 Context 把 rowLine + fixed 传给其 Cell 子节点。
 *   5. Cell 消费 Context，inline 设 gridRow + gridColumn；fixed 时加 sticky bottom。
 *
 * === fixed（sticky bottom）===
 *
 * `Table.Summary fixed` → summary 区整体 sticky 到滚动容器底部（配合 scroll.y）。
 * 实现：每个 summary Cell 加 `position: sticky; bottom: 0`（钉底，不透明背景由 CSS 保证，
 * 不需 z-index）。固定列 summary 格另由横向 sticky 补 `z-index: 2`（与表体固定列同 z 级，
 * 任务 T），横滚时盖住同栈 summary 普通格（z-auto）。
 * fixed 标志经 Summary（适配层解析）→ 引擎 cloneElement → Row Context → Cell。
 *
 * sticky bottom 需要 summary 与表体在**同一滚动容器**内（即 .dg-scroll / .dg-grid 同容器）。
 * 引擎把 summary 渲染到 grid 内（grid 末尾），与表体共享滚动容器，故 sticky bottom 生效。
 *
 * === 与 antd 的差异 ===
 *
 * - antd summary 是真实 `<tfoot><tr><td>` DOM；data-grid 是 div + CSS Grid（无 tfoot）。
 * - antd summary 的 colSpan 用 `<td colspan>`；data-grid 用 `gridColumn: span N`。
 * - 功能等价：summary 行在表体底部，Cell 按 index+colSpan 定位，fixed sticky bottom。
 */

import {
  createContext,
  Fragment,
  useContext,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react'
import { stickyCellStyle, type LeafStickyInfo } from './useStickyColumns'

/**
 * Row → Cell 的上下文：传递当前行的 grid-row 线号 + fixed 标志 + 叶子列 sticky 信息。
 */
export interface SummaryRowContextValue {
  /** 该行的 grid-row 起始线号（1-based grid line）。 */
  rowLine: number
  /** 是否 sticky bottom（来自 Summary.fixed，经引擎注入）。 */
  fixed: boolean
  /**
   * 叶子列横向 sticky 信息（任务 J）：长度 === 叶子列数，每项含 side/offset/width/isEdge。
   * 来自引擎 cloneElement 注入（与表体固定列同源 useStickyColumns.leafSticky）。
   * Cell 按 `index` 取对应项，叠加横向 sticky left/right，使 summary 固定列横滚时贴边。
   */
  leafSticky?: Array<LeafStickyInfo | undefined>
}

export const SummaryRowContext = createContext<SummaryRowContextValue | null>(null)

/**
 * Summary 容器（对齐 antd `Table.Summary`）。
 *
 * - 透明容器（返回 children）：与 rc-table Summary 一致（`return children`）。
 * - `fixed?: boolean`：声明式标记。适配层解析 summary 节点时读取此属性，决定是否启用 sticky bottom；
 *   引擎渲染时通过 cloneElement 把 fixed 透传到 Row → Cell。
 *
 * 注意：本组件本身不读 fixed 做任何事（仅作为语法糖容器）。fixed 的实际效果由引擎层驱动。
 */
export interface SummaryProps {
  fixed?: boolean
  children?: ReactNode
}

/**
 * Summary 组件类型：函数组件 + 静态属性 Row/Cell（对齐 antd `Table.Summary`）。
 *
 * 用 `SummaryComponent` 别名导出，Table.tsx 挂载到 `Table.Summary` 静态属性；
 * 调用方通过 `<Table.Summary>` / `<Table.Summary.Row>` / `<Table.Summary.Cell>` 使用。
 */
export type SummaryType = ((props: SummaryProps) => ReactNode) & {
  Row: typeof SummaryRow
  Cell: typeof SummaryCell
}

const SummaryBase = (props: SummaryProps): ReactNode => {
  const { children } = props
  return children
}

/**
 * Summary 组件（含静态属性 Row/Cell）。
 *
 * 静态属性挂载后：`Summary.Row = SummaryRow`、`Summary.Cell = SummaryCell`，
 * 对齐 antd `Table.Summary.Row` / `Table.Summary.Cell`。
 */
export const Summary = SummaryBase as SummaryType
Summary.Row = SummaryRow
Summary.Cell = SummaryCell

/**
 * Summary.Row（对齐 antd `Table.Summary.Row`）。
 *
 * - 包裹层：用 SummaryRowContext.Provider 包裹 children，把 rowLine + fixed 传给 Cell。
 * - `__rowLine` / `__fixed`：引擎渲染时 cloneElement 注入（调用方不传）。
 *   未注入时（如脱离引擎直接渲染）退化为透明 Fragment（不设 grid-row，Cell 由 auto-flow 放置）。
 */
export interface SummaryRowProps {
  children?: ReactNode
  /** 引擎内部注入：该行的 grid-row 起始线号（1-based）。调用方不传。 */
  __rowLine?: number
  /** 引擎内部注入：是否 sticky bottom。调用方不传。 */
  __fixed?: boolean
  /**
   * 引擎内部注入：叶子列横向 sticky 信息（任务 J）。调用方不传。
   * 与表体固定列同源（useStickyColumns.leafSticky），透传给 Cell 实现横向 sticky。
   */
  __leafSticky?: Array<LeafStickyInfo | undefined>
}

export function SummaryRow(props: SummaryRowProps): ReactNode {
  const { children, __rowLine, __fixed, __leafSticky } = props
  if (__rowLine === undefined) return children
  return (
    <SummaryRowContext.Provider
      value={{ rowLine: __rowLine, fixed: !!__fixed, leafSticky: __leafSticky }}
    >
      {children}
    </SummaryRowContext.Provider>
  )
}

/**
 * Summary.Cell（对齐 antd `Table.Summary.Cell`）。
 *
 * 渲染为 `div.dg-cell.dg-cell-summary`（真实 DOM，grid item）。
 *
 * - `index`（0-based 列索引）：`gridColumn` 起始线 = `index + 1`。
 * - `colSpan`（默认 1）：`gridColumn: <index+1> / span <colSpan>`。
 * - `gridRow`：来自 SummaryRowContext（Row 注入）。脱离 Row 时缺失，退化为不设（auto-flow 放置）。
 * - fixed（来自 Context）：`position: sticky; bottom: 0`（钉底，不设 z-index，普通格保持 z-auto）。
 * - `align`：对齐方式（inline textAlign + data-align 供 CSS）。
 */
export interface SummaryCellProps {
  /** 列索引（0-based，对应叶子列序号）。决定 gridColumn 起始线 = index + 1。 */
  index?: number
  /** 跨列数（默认 1）。gridColumn: <index+1> / span <colSpan>。 */
  colSpan?: number
  /** 单元格对齐方式（与 column.align 同语义）。 */
  align?: 'start' | 'center' | 'end'
  children?: ReactNode
}

export function SummaryCell(props: SummaryCellProps): ReactNode {
  const { index = 0, colSpan = 1, align, children } = props
  const rowCtx = useContext(SummaryRowContext)
  const cellStyle: CSSProperties = {
    gridColumn: `${index + 1} / span ${colSpan}`,
  }
  if (rowCtx) {
    cellStyle.gridRow = `${rowCtx.rowLine}`
    if (rowCtx.fixed) {
      cellStyle.position = 'sticky'
      cellStyle.bottom = '0'
      // ★ 任务 T：不再统一设 zIndex=2。普通 summary 格保持 z-auto（同表体普通格），
      //   仅 sticky bottom 钉底（不透明背景由 CSS 保证）。固定列 summary 格由改动 A 拿 z2 盖普通格。
    }
    // 任务 J + 任务 X：固定列横向 sticky —— summary 固定列 cell 横滚时贴左/右边缘，与表体固定列一致。
    // info 取自 Context 的 leafSticky[index]（与表体固定列同源 useStickyColumns.leafSticky）。
    //
    // ★ 任务 X 修正：原 J 实现用 `colSpan === 1` 守卫一刀切跳过所有 colSpan>1 合并格，但 antd 对
    //   覆盖同侧固定列的合并格照样 sticky（实测 antd sticky demo summary idx0 colSpan=2 覆盖 Full Name+Age
    //   两个 fixed-start → sticky left:0）。读 antd rc-table 源码确认：
    //     - Footer/Cell.js:25 `getCellFixedInfo(index, index+mergedColSpan-1, ...)` 传 [colStart, colEnd] 区间。
    //     - utils/fixUtil.js:6-10 `startColumn.fixed==='left'` → fixLeft=offsets[colStart]（起始 leaf offset）；
    //       `endColumn.fixed==='right'` → fixRight=offsets[colEnd]（末 leaf offset）。
    //   即合并格只要起始列 fixed-start 或末列 fixed-end 就 sticky（offset 取边界 leaf）。
    //
    //   本实现采用「区间全同侧」判定（比 antd 边界判定更严格，避免合并格跨固定/非固定边界时 sticky
    //   错位的边缘情况），与 useStickyColumns 多级表头分组格判定（177-225 行）一致——summary 合并格
    //   与表头分组格行为对称。对 antd 官方所有 demo（sticky idx0 全 fixed-start / summary 示例2 Balance
    //   全非固定）结果与 antd 完全一致；仅「合并格跨固定/非固定边界」的合成场景本实现更保守（不 sticky）。
    //
    //   判定：扫描 [index, index+colSpan) 区间 leafSticky，全存在且全同 side（全 start 或全 end）→ sticky。
    const info = rowCtx.leafSticky?.[index]
    if (info?.side) {
      let allSameSide = true
      for (let i = index; i < index + colSpan; i++) {
        const ci = rowCtx.leafSticky?.[i]
        if (!ci || ci.side !== info.side) {
          allSameSide = false
          break
        }
      }
      if (allSameSide) {
        // offset 取边界 leaf（对齐 antd fixUtil）：
        //   - start 侧：起始 leaf offset（`stickyOffsets.left[colStart]`）—— info 即 leafSticky[index]。
        //   - end 侧：末 leaf offset（`stickyOffsets.right[colEnd]`）—— 取 leafSticky[index+colSpan-1]。
        // start 侧直接用 info；end 侧末 leaf = 区间最后一项（全同侧已保证 side 一致，仅 offset 不同）。
        const edgeInfo =
          info.side === 'end' ? rowCtx.leafSticky?.[index + colSpan - 1] ?? info : info
        const stickyH = stickyCellStyle(edgeInfo)
        if (stickyH.position) {
          // 与纵向 sticky bottom 合并：position 一次（同为 'sticky'），left/right + bottom 共存。
          cellStyle.position = 'sticky'
          if ('left' in stickyH) cellStyle.left = stickyH.left
          if ('right' in stickyH) cellStyle.right = stickyH.right
          // ★ 任务 T：固定列横向 sticky 显式赋 z-index（=2，stickyCellStyle 给的），
          //   与表体固定列（z2）对齐，横滚时盖住同栈 summary 普通格（z-auto）。
          cellStyle.zIndex = stickyH.zIndex
        }
      }
    }
  }
  return (
    <div
      className={['dg-cell', 'dg-cell-summary', align ? `dg-cell-summary-${align}` : undefined]
        .filter(Boolean)
        .join(' ')}
      data-align={align ?? undefined}
      style={cellStyle}
    >
      <div className="dg-cell-inner">{children}</div>
    </div>
  )
}

// === 引擎渲染辅助：识别 summary 节点结构 ===

/**
 * 判断一个 ReactNode 是否为 `Summary` 容器元素。
 *
 * 适配层 / 引擎用此识别 summary prop 的根节点，读取其 `fixed` 属性。
 */
export function isSummaryElement(node: ReactNode): node is ReactElement<SummaryProps> {
  return isValidElement(node) && node.type === Summary
}

/**
 * 判断一个 ReactNode 是否为 `Summary.Row` 元素。
 */
export function isSummaryRowElement(node: ReactNode): node is ReactElement<SummaryRowProps> {
  return isValidElement(node) && node.type === SummaryRow
}

/**
 * 解析 summary prop 节点，提取 fixed 标志 + Row 元素列表。
 *
 * 支持的形态（与 antd demo 用法一致）：
 *   - `<Summary fixed?>...rows...</Summary>`：根为 Summary 容器，读 fixed，遍历 children 找 Row。
 *   - `<>...rows...</>`（Fragment）/ 数组 / 单个 Row：根非 Summary，fixed 默认 false，
 *     直接遍历根 children 找 Row（容忍 summary 函数返回裸 Row 列表的写法）。
 *   - 裸 Row：视为单行。
 *
 * 返回 `{ fixed, rows }`。rows 中仅保留 Row 元素（跳过非 Row 节点如字符串/布尔/其它元素）。
 * 调用方（引擎）据此决定 summary 区行数 + cloneElement 注入 rowLine。
 *
 * 未找到任何 Row → rows 为空数组（引擎不渲染 summary 区，或渲染空 summary 区——由调用方决定）。
 */
export function parseSummaryNode(node: ReactNode): {
  fixed: boolean
  rows: Array<ReactElement<SummaryRowProps>>
} {
  let fixed = false
  let rowContainer: ReactNode = node

  if (isSummaryElement(node)) {
    fixed = node.props.fixed === true
    rowContainer = node.props.children
  }

  const rows: Array<ReactElement<SummaryRowProps>> = []
  const collect = (child: ReactNode) => {
    if (isSummaryRowElement(child)) {
      rows.push(child)
      return
    }
    // 容忍数组 / Fragment 嵌套：递归找 Row。
    if (Array.isArray(child)) {
      child.forEach(collect)
      return
    }
    if (isValidElement(child) && child.type === Fragment) {
      collect((child.props as { children?: ReactNode }).children)
    }
  }
  collect(rowContainer)
  return { fixed, rows }
}
