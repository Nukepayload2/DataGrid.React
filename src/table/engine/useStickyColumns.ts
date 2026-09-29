/**
 * 固定列（fixed columns）sticky 偏移计算（M2）。
 *
 * 算法移植自外部库 lun（本仓未安装，给不出可核版本号）里 packages/core 下的 composable/table/useSticky.ts 的
 * `useStickyTable` / `useStickyColumn`（Vue 实现），**用纯 React + TS 重写**，
 * 不引 Web Component、不抄 lun 代码。
 *
 * === 核心思路（与 lun 一致）===
 *
 * 1. 把叶子列按 `fixed` 分两组：
 *      - `start`（左侧固定，对应 antd `'left'`/`'start'`）：按列顺序（左→右）累加。
 *      - `end`（右侧固定，对应 antd `'right'`/`'end'`）：按列顺序（左→右）反向累加，
 *        即最右侧的固定列 `right:0`，往左逐个加上前面右侧列的宽度。
 *
 * 2. 每个固定列的 sticky 偏移 = 它前面（同侧、更靠边）所有固定叶子列的宽度之和。
 *    例（start）：col0 fixed start → left=0；col1 fixed start → left=w0；
 *                 col5 fixed start → left=w0+w1（中间非固定列不参与）。
 *
 * 3. **宽度来源**：列宽可能是 `max-content`/`auto`（无法从 column.width 直接拿到 px），
 *    故用 `ResizeObserver` 监听**叶子列实际 DOM 宽度**，重算偏移。
 *    `ResizeObserver` 挂在 grid 容器上（监听每个 `.dg-cell[data-leaf-index]` 表头格
 *    ——表头格恒为 1 个/叶子列，宽度即列宽），单点观测。
 *
 * === 与 M1 多级表头的组合 ===
 *
 * 偏移**按叶子列算**（lun `isCollectedItemLeaf` 同理：非叶子节点不参与累加）。
 * 表头格（含分组格）的 sticky 偏移取其子树中最左/最右叶子列的偏移；具体规则见
 * `getHeaderCellStickyInfo` 注释。flat 路径同理（叶子即所有列）。
 *
 * === 局限 / M8 的事 ===
 *
 * 本 hook 只算**列固定**的横向 sticky 偏移；表头**纵向**固定（`scroll.y` + sticky top）
 * 留待 M8。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { EngineHeaderCell, EngineLeafColumn, FixedSide } from './types'

/** 某叶子列的 sticky 信息。 */
export interface LeafStickyInfo {
  /** fixed 方向；非固定列 undefined。 */
  side: FixedSide | undefined
  /** sticky 偏移（px）。 */
  offset: number
  /** 该列实际宽度（px，来自 ResizeObserver；首测前为 0）。 */
  width: number
  /** 该侧固定列里是否处于"最靠边"位置（start 侧最左 / end 侧最右）——用于画边缘阴影。 */
  isEdge: boolean
}

/**
 * 固定列 sticky hook。
 *
 * @param leafColumns 叶子列（已扁平化，按列顺序）。
 * @param headerCells 表头格平面表（M1 多级表头；flat 路径可传 []，仅按叶子列算）。
 * @param gridRef grid 容器 ref——用于挂 ResizeObserver 观测叶子列宽度。
 * @returns
 *   - `leafSticky`：长度 === leafColumns.length，每项含 side/offset/width/isEdge。
 *   - `headerSticky`：Map<headerCellKey, { side, offset, isEdge }>。
 *   - `hasFixed`：是否存在任何固定列（决定是否启用滚动容器/阴影等）。
 */
export function useStickyColumns<RecordType>(
  leafColumns: Array<EngineLeafColumn<RecordType>>,
  headerCells: Array<EngineHeaderCell<RecordType>>,
  gridRef: React.RefObject<HTMLElement | null>,
): {
  leafSticky: Array<LeafStickyInfo>
  headerSticky: Map<string, { side: FixedSide; offset: number; isEdge: boolean }>
  hasFixed: boolean
} {
  // === Stage 6 #7: widths 仍由 RO 测量维护（DOM 真值必需），但去掉"effect 同步
  // leafColumns 到 widths"的派生-state 反模式（react-doctor no-derived-state +
  // no-pass-data-to-parent 双 finding 在 L78）。原 effect 把 leafColumns.map(width)
  // 写回 state 触发额外 render，且与首帧 useState initializer + 测量 effect 重复。
  // 改为：useState initializer 给初值；leafColumns 变化时由测量 effect 的 measure()
  // 重读 DOM 自动同步（measure 内遍历 [data-leaf-index]，新列无 DOM 时回退 column.width）。
  const [widths, setWidths] = useState<number[]>(() =>
    leafColumns.map((c) => (typeof c.width === 'number' ? c.width : 0)),
  )

  // 观测叶子列宽度：监听 grid 容器内所有 [data-leaf-index] 节点（表头叶子格，每列 1 个）。
  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    const measure = () => {
      // 列定义长度变化（增删列）→ 用 column.width 兜底重置一份 baseline，再叠加 DOM 测量真值。
      // 这样删除原"effect 同步 leafColumns→widths"的派生 state 后，列定义变化仍能正确反映。
      const baseline = leafColumns.map((c) =>
        typeof c.width === 'number' ? c.width : 0,
      )
      const next = baseline.slice()
      let changed = false
      const els = grid.querySelectorAll<HTMLElement>('[data-leaf-index]')
      els.forEach((el) => {
        const idx = Number(el.getAttribute('data-leaf-index'))
        if (Number.isNaN(idx) || idx < 0 || idx >= leafColumns.length) return
        const w = el.getBoundingClientRect().width
        if (Math.abs(w - next[idx]) > 0.1) {
          next[idx] = w
          changed = true
        }
      })
      // 长度变化或任一格测量值更新 → 写 state。
      if (changed || next.length !== widths.length) setWidths(next)
    }

    measure()

    // ResizeObserver：监听 grid 容器及其子树大小变化（subtree:true 因为叶子格本身会被列内容撑大）。
    const ro = new ResizeObserver(() => measure())
    ro.observe(grid, { box: 'border-box' })
    // 同时直接观测叶子表头格（最稳，单列宽度变化能立刻捕捉）。
    grid.querySelectorAll<HTMLElement>('[data-leaf-index]').forEach((el) => {
      ro.observe(el, { box: 'border-box' })
    })

    return () => ro.disconnect()
    // widths 不进依赖：measure 内部比较 next/widths 决定是否 set，避免循环触发。
    // eslint-disable-next-line react-doctor/exhaustive-deps
  }, [gridRef, leafColumns])

  // === 计算 sticky 偏移 ===
  const { leafSticky, headerSticky, hasFixed } = useMemo(() => {
    const n = leafColumns.length
    const result: Array<LeafStickyInfo> = Array.from({ length: n })

    // 先标记每列的 side + 找出 start/end 各自的边界 index。
    let firstStartIdx = -1 // 最左的 start 列
    let lastStartIdx = -1 // 最右的 start 列（start 侧"靠内"的边界，画右阴影）
    let firstEndIdx = -1 // 最左的 end 列（end 侧"靠内"的边界，画左阴影）

    let hasAnyFixed = false

    for (let i = 0; i < n; i++) {
      const side = leafColumns[i].fixed
      if (side === 'start') {
        hasAnyFixed = true
        if (firstStartIdx === -1) firstStartIdx = i
        lastStartIdx = i
      } else if (side === 'end') {
        hasAnyFixed = true
        if (firstEndIdx === -1) firstEndIdx = i
      }
    }

    // start 侧累加：从左到右，offset = 前面所有 start 列宽度之和。
    let startAcc = 0
    for (let i = 0; i < n; i++) {
      const side = leafColumns[i].fixed
      if (side === 'start') {
        result[i] = {
          side,
          offset: startAcc,
          width: widths[i] ?? 0,
          isEdge: i === lastStartIdx, // start 侧最右一列 = 与普通列交界处，画右阴影
        }
        startAcc += widths[i] ?? 0
      }
    }

    // end 侧累加：从右到左，offset = 后面所有 end 列宽度之和。
    let endAcc = 0
    for (let i = n - 1; i >= 0; i--) {
      const side = leafColumns[i].fixed
      if (side === 'end') {
        result[i] = {
          side,
          offset: endAcc,
          width: widths[i] ?? 0,
          isEdge: i === firstEndIdx, // end 侧最左一列 = 与普通列交界处，画左阴影
        }
        endAcc += widths[i] ?? 0
      }
    }

    // 填充非固定列。
    for (let i = 0; i < n; i++) {
      if (!result[i]) {
        result[i] = { side: undefined, offset: 0, width: widths[i] ?? 0, isEdge: false }
      }
    }

    // === 表头格 sticky 信息（M1 多级表头）===
    // 分组表头格 sticky：取其覆盖叶子区间内最左/最右叶子的偏移；但仅当整段区间**全部**为
    // 同侧固定时才算该侧 sticky（否则跨固定/非固定边界，不该 sticky——antd 行为）。
    // 叶子表头格：直接复用对应 leafSticky。
    const hMap = new Map<string, { side: FixedSide; offset: number; isEdge: boolean }>()
    for (const cell of headerCells) {
      if (cell.isLeaf) {
        if (cell.leafIndex === undefined) continue
        const info = result[cell.leafIndex]
        if (info && info.side) {
          hMap.set(cell.key, { side: info.side, offset: info.offset, isEdge: info.isEdge })
        }
      } else {
        // 分组格：扫描其叶子区间（gridColumnStart..gridColumnEnd-1 转 0-based 叶子 index）。
        const lo = cell.gridColumnStart - 1
        const hi = cell.gridColumnEnd - 2 // inclusive
        if (lo < 0 || hi >= n || lo > hi) continue
        // 区间内所有叶子必须同 side 才 sticky。
        let commonSide: FixedSide | undefined
        let ok = true
        for (let i = lo; i <= hi; i++) {
          const s = leafColumns[i].fixed
          if (!s) {
            ok = false
            break
          }
          if (commonSide === undefined) commonSide = s
          else if (commonSide !== s) {
            ok = false
            break
          }
        }
        if (!ok || !commonSide) continue
        // start 侧分组：取区间最左叶子的 offset；isEdge = 区间最右叶子是否为 start 侧边界。
        // end 侧分组：取区间最右叶子的 offset；isEdge = 区间最左叶子是否为 end 侧边界。
        if (commonSide === 'start') {
          hMap.set(cell.key, {
            side: 'start',
            offset: result[lo].offset,
            isEdge: hi === lastStartIdx,
          })
        } else {
          hMap.set(cell.key, {
            side: 'end',
            offset: result[hi].offset,
            isEdge: lo === firstEndIdx,
          })
        }
      }
    }

    return { leafSticky: result, headerSticky: hMap, hasFixed: hasAnyFixed }
  }, [leafColumns, widths])

  return { leafSticky, headerSticky, hasFixed }
}

/**
 * 把 LeafStickyInfo 转成单元格内联 style（仅 fixed 列返回 position/left/right）。
 */
export function stickyCellStyle(info: LeafStickyInfo | undefined): import('react').CSSProperties {
  if (!info || !info.side) return {}
  if (info.side === 'start') {
    return { position: 'sticky', left: info.offset, zIndex: 2 }
  }
  return { position: 'sticky', right: info.offset, zIndex: 2 }
}

/** 表头格 sticky style（z-index 比表体高）。 */
export function stickyHeaderCellStyle(
  info: { side?: FixedSide; offset: number } | undefined,
): import('react').CSSProperties {
  if (!info || !info.side) return {}
  if (info.side === 'start') {
    return { position: 'sticky', left: info.offset, zIndex: 3 }
  }
  return { position: 'sticky', right: info.offset, zIndex: 3 }
}

/** 工具：用于 GridTable 内部把 columns 变化比较稳定化（避免每渲染都变引用）。 */
export function useLeafColumnsRef<RecordType>(
  leafColumns: Array<EngineLeafColumn<RecordType>>,
) {
  const ref = useRef(leafColumns)
  useEffect(() => {
    ref.current = leafColumns
  })
  const get = useCallback(() => ref.current, [])
  return get
}
