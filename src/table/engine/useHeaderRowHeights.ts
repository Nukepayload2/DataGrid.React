/**
 * 多级表头逐行高度测量（任务 A · grouping-columns 列头重叠修复）。
 *
 * === 问题背景 ===
 *
 * `headerStickyTop` 启用（M4 虚拟 / M8 非虚拟 scroll.y / S34 页面级 sticky）时，表头格被设
 * `position:sticky; top:0`。单行表头 OK；但**多行表头**（grouping-columns，maxDepth>1）所有表头行
 * 都 sticky 到容器顶 0 → 多行表头格全部堆叠在同一 y，后渲染盖住先渲染 → 重叠。
 *
 * === 修复思路（对齐 antd 表头整体固定语义）===
 *
 * 表头格按其 `grid-row-start`（即表头行号 1..maxDepth）**逐行分层 sticky**：
 *   - grid-row-start=1 → sticky top: 0
 *   - grid-row-start=2 → sticky top: h1（row1 高度）
 *   - grid-row-start=3 → sticky top: h1+h2
 *   - grid-row-start=N → sticky top: Σ h[0..N-2]（该行上方所有表头行的累计高度）
 *
 * 本 hook 返回**按表头行号升序的逐行累计偏移数组** `cumulativeOffsets`：
 *   - index 0（= grid-row-start 1 的偏移）= 0
 *   - index k（= grid-row-start k+1 的偏移）= Σ h[0..k-1]
 *
 * GridTable 渲染表头格时按 `cell.gridRowStart` 取 `cumulativeOffsets[gridRowStart - 1]` 传入。
 *
 * === 测量法（grid-template-rows track 累计）===
 *
 * 读 `getComputedStyle(grid).gridTemplateRows`（形如 `'42.4px 42.4px 42.4px 43.2px 0px ...'`，
 * 前 maxDepth 个 track = 表头逐行，其后为表体行），取**前 len（=maxDepth）个** track 高度累计。
 *
 * 为何用此法而非"按 grid-row-start 分组取 max(bottom)-min(top)"：后者会把跨行表头格（grouping
 * 的 Name/Gender，`grid-row: 1/5`，高 170.4）的 bottom 计入其**起始行 row1** 组的 maxBottom，
 * 把 row1 算成 170.4（应 42.4），进而 row3/row4 的累计偏移被推到 298.4/384，超过容器可视高
 * 238.4 → 滚到中段时 Street/Block/Building/Door No. 表头被推到容器外不可见。
 *
 * `grid-template-rows` 是 CSS Grid 布局引擎按内容自动求解的**每行真实 track 高度**，跨行格只
 * 占用其覆盖的各 track 的实际高度、不会把自身整体 bottom 塞进某一个 track——因此**天然避开
 * 跨行格 bottom 污染**，逐行 track 高度即真实表头行高。row N sticky top = 前 N-1 个 track 累计。
 *
 * === 零回归 ===
 *
 * - 单行表头（maxDepth=1）：只有一组 row1 → cumulativeOffsets=[0] → 所有格 top=0，行为与改造前一致。
 * - showHeader=false：无表头格 → cumulativeOffsets=[] → 无影响。
 * - 首测前各行为 0（同 useStickyColumns 首测为 0 的惯例），ResizeObserver 首帧后修正。
 */

import { useEffect, useState } from 'react'

/**
 * 测量 grid 容器内多级表头的逐行累计 sticky 偏移。
 *
 * @param gridRef grid 容器 ref（与 useStickyColumns 同一个 grid）。
 * @param maxDepth 表头最大行数（resolved.maxDepth）；showHeader=false 时传 0。
 * @returns cumulativeOffsets：长度 = maxDepth，index k = grid-row-start k+1 的 sticky top 偏移。
 *          首测前全为 0。
 */
export function useHeaderRowHeights(
  gridRef: React.RefObject<HTMLElement | null>,
  maxDepth: number,
): number[] {
  const [offsets, setOffsets] = useState<number[]>(() =>
    Array.from<number>({ length: Math.max(0, maxDepth) }).fill(0),
  )

  useEffect(() => {
    // 同步 maxDepth 变化（列定义改了要重置数组长度）。
    const len = Math.max(0, maxDepth)
    setOffsets(Array.from<number>({ length: len }).fill(0))
  }, [maxDepth])

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const len = Math.max(0, maxDepth)
    if (len === 0) return

    const measure = () => {
      // 读 grid-template-rows（CSS Grid 布局引擎求解的逐行 track 高度），取前 len 个累计。
      // 避开旧法"按 grid-row-start 分组取 max(bottom)-min(top)"——后者会被跨行表头格
      // （grid-row: 1/5 的 Name/Gender）的 bottom 污染其起始行组的高度。
      const gtr = getComputedStyle(grid).gridTemplateRows || ''
      const trackHeights = gtr
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, len)
        .map((s) => parseFloat(s) || 0)

      // 累计：cumulativeOffsets[k] = Σ trackHeights[0..k-1]（= grid-row-start k+1 的 sticky top）。
      const next: number[] = Array.from({ length: len }).fill(0) as number[]
      let acc = 0
      let changed = false
      for (let i = 0; i < len; i++) {
        next[i] = acc
        if (Math.abs(next[i] - offsets[i]) > 0.1) changed = true
        acc += trackHeights[i] || 0
      }
      if (changed) setOffsets(next)
    }

    measure()

    // ResizeObserver：监听 grid 容器及其子树大小变化（subtree:true 因表头内容/列宽变化会改行高）。
    const ro = new ResizeObserver(() => measure())
    ro.observe(grid, { box: 'border-box' })
    // 直接观测表头格（单格高变化立刻捕捉）。
    grid.querySelectorAll<HTMLElement>('.dg-cell-header').forEach((el) => {
      ro.observe(el, { box: 'border-box' })
    })

    return () => ro.disconnect()
    // offsets 不进依赖（measure 内部用闭包比较，避免循环触发）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridRef, maxDepth])

  return offsets
}
