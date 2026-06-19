/**
 * 单元格合并计算（M3）。
 *
 * 算法移植自 lun `TableColumn.tsx:70-114` 的 `updateMergeInfo` 思路
 * （合并区域左上角格设 span，被覆盖格自动隐藏），**用纯 TS 重写**，不引 Vue / Web Component。
 *
 * === 输入输出 ===
 *
 * - 输入：`leafColumns`（按列顺序的叶子列）+ `dataSource`（按行顺序的数据）。
 * - 输出：`CellMergePlan` —— 一个 `colCount × rowCount` 矩阵，每格给出：
 *     - `hidden`：该格是否被覆盖（不渲染 DOM）。
 *     - `colSpan`：横向跨列数（>=1；被覆盖格无意义）。
 *     - `rowSpan`：纵向跨行数（>=1；被覆盖格无意义）。
 *
 * === 算法 ===
 *
 * 1. **声明阶段**：对每个 (colIdx, rowIdx)，调 `column.onCell(record, rowIdx)` 取
 *    `{ colSpan, rowSpan }`；缺省 1/1；负数/NaN 视为 1。
 *    - `colSpan === 0` 或 `rowSpan === 0`：用户主动声明该格被覆盖 → 标 `hidden=true`（且不作为
 *      合并左上角；其 colSpan/rowSpan 当 0 处理，不向下/右扩展覆盖）。
 *
 * 2. **覆盖传播阶段**（与 lun `updateMergeInfo` 一致）：扫描每个**非隐藏**格，
 *    若其声明 `colSpan >= 2` 或 `rowSpan >= 1` 组成的矩形覆盖区域（不含自身），把区域内
 *    所有格标 `hidden=true`。被覆盖格的 colSpan/rowSpan 不参与后续扩展（即只允许"第一层"
 *    合并传播，与 antd / lun 行为一致——合并区域内不会再嵌套合并）。
 *
 *    边界裁剪：覆盖区域若超出列数/行数，自动截断（与 antd 行为一致：合并区域不能越过末列/末行）。
 *
 * 3. **键约定**：`colSpan === 0` 或 `rowSpan === 0` 表示"被覆盖格不渲染"，等价 `hidden=true`。
 *    `hidden` 字段是渲染层的主判断；colSpan/rowSpan 仅对非隐藏格有意义。
 *
 * === 与 multi 路径（显式定位）的协调 ===
 *
 * 本模块只产出"逻辑合并元数据"（每格 hidden + colSpan/rowSpan），**不**触碰 grid 线号。
 * 渲染层（GridTable）据此：
 *   - `hidden === true`：**跳过该格的 DOM 渲染**（不占 grid 位置）。
 *   - 否则：在 multi 路径下用 `grid-column: <startCol> / span <colSpan>` +
 *     `grid-row: <startRow> / span <rowSpan>` 放置（显式定位，与 M1 表头格共享同一套线号）。
 *
 * 关键：被覆盖格**完全不渲染 DOM**（而非渲染一个 0 大小的占位 div），这是 grid 布局下避免
 * 空洞/重叠的最稳做法——grid 显式定位下，不存在的 grid item 不影响其它 item 的放置。
 *
 * === 不支持 / 约束 ===
 *
 * - 仅支持"矩形合并"（colSpan×rowSpan 是一个完整矩形），不支持 L 形/嵌套合并。
 * - 合并区域内禁止再声明合并（行为未定义；antd 同样不支持）。
 * - 跨越末列/末行的部分会被自动裁剪（不报错）。
 */

import type { EngineLeafColumn } from './types'

export interface CellMergeInfo {
  /** 该格是否被覆盖（true → 不渲染 DOM）。 */
  hidden: boolean
  /** 横向跨列数（>=1；仅对非隐藏格有意义）。 */
  colSpan: number
  /** 纵向跨行数（>=1；仅对非隐藏格有意义）。 */
  rowSpan: number
}

/**
 * 单元格合并计划：`merge[colIdx][rowIdx]` 给出该格的合并信息。
 *
 * 维度：`colCount × rowCount`（colIdx 外层，rowIdx 内层），方便按列访问。
 */
export type CellMergePlan = CellMergeInfo[][]

/** 规整单个 span 值：非正整数（含 0/NaN/负数）→ 0；正整数 → 原值。 */
function normalizeSpan(v: number | undefined): number {
  if (v === undefined) return 1
  if (typeof v !== 'number' || !Number.isFinite(v)) return 1
  const n = Math.floor(v)
  if (n < 0) return 0
  return n
}

/**
 * 计算单元格合并计划。
 *
 * @param leafColumns 叶子列（按列顺序）；每列的 `onCell` 用于取合并信息。
 * @param dataSource 数据源（按行顺序）。
 * @returns CellMergePlan；若无任何列声明 onCell，返回 null（调用方可走快速路径，无合并）。
 */
export function computeCellMergePlan<RecordType>(
  leafColumns: Array<EngineLeafColumn<RecordType>>,
  dataSource: Array<RecordType>,
): CellMergePlan | null {
  const colCount = leafColumns.length
  const rowCount = dataSource.length
  if (colCount === 0 || rowCount === 0) return null

  // 是否存在任何 onCell（决定是否需要走合并路径）。
  const hasOnCell = leafColumns.some((c) => typeof c.onCell === 'function')
  if (!hasOnCell) return null

  // 初始化：每格默认 colSpan=1 / rowSpan=1 / hidden=false。
  const plan: CellMergePlan = []
  for (let c = 0; c < colCount; c++) {
    const col: CellMergeInfo[] = []
    for (let r = 0; r < rowCount; r++) {
      col.push({ hidden: false, colSpan: 1, rowSpan: 1 })
    }
    plan.push(col)
  }

  // 阶段 1：声明。对每格调 onCell 取 colSpan/rowSpan；0 → 标 hidden 并把 span 当 1（不扩展）。
  for (let c = 0; c < colCount; c++) {
    const colDef = leafColumns[c]
    const onCell = colDef.onCell
    if (!onCell) continue
    for (let r = 0; r < rowCount; r++) {
      const record = dataSource[r]
      let result: { colSpan?: number; rowSpan?: number } | undefined
      try {
        result = onCell(record, r)
      } catch {
        result = undefined
      }
      const cs = normalizeSpan(result?.colSpan)
      const rs = normalizeSpan(result?.rowSpan)
      const info = plan[c][r]
      if (cs === 0 || rs === 0) {
        // 用户主动声明被覆盖。
        info.hidden = true
        // span 当 1（不作为左上角向下/右扩展）。
        info.colSpan = 1
        info.rowSpan = 1
      } else {
        info.colSpan = cs < 1 ? 1 : cs
        info.rowSpan = rs < 1 ? 1 : rs
      }
    }
  }

  // 阶段 2：覆盖传播。对每个**非隐藏**且 (colSpan>1 或 rowSpan>1) 的格，
  // 把其覆盖矩形（不含自身）内的所有格标 hidden=true。
  // 注意：被标 hidden 的格其 colSpan/rowSpan 不再参与传播（避免嵌套合并）。
  for (let c = 0; c < colCount; c++) {
    for (let r = 0; r < rowCount; r++) {
      const info = plan[c][r]
      if (info.hidden) continue
      const cs = info.colSpan
      const rs = info.rowSpan
      if (cs <= 1 && rs <= 1) continue
      // 覆盖矩形：列 [c, c+cs)、行 [r, r+rs)；自身 (c,r) 不动，其余标 hidden。
      // 边界裁剪：不超过 colCount/rowCount。
      const cEnd = Math.min(c + cs, colCount)
      const rEnd = Math.min(r + rs, rowCount)
      for (let cc = c; cc < cEnd; cc++) {
        for (let rr = r; rr < rEnd; rr++) {
          if (cc === c && rr === r) continue
          plan[cc][rr].hidden = true
        }
      }
      // 把左上角格的 span 裁剪到实际有效范围（避免渲染层 grid-column/grid-row 超界）。
      info.colSpan = cEnd - c
      info.rowSpan = rEnd - r
    }
  }

  return plan
}
