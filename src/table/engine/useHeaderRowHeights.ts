/**
 * 多级表头逐行高度测量 — 详见 docs/design-notes/row-height.md（「多级表头逐行 sticky 偏移」节）。
 *
 * `headerStickyTop` 启用（虚拟 / 非虚拟 scroll.y / 页面级 sticky）时，多行表头（maxDepth>1）
 * 所有表头行都 sticky 到容器顶 0 会堆叠重叠。本 hook 返回按表头行号升序的逐行累计偏移数组，
 * 让表头格按 grid-row-start 分层 sticky（row N 的 top = 前 N-1 行的累计高度）。
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
      // 用此法而非"按 grid-row-start 分组取 max(bottom)-min(top)"——后者会被跨行表头格 bottom
      // 污染其起始行组的高度（详见 row-height.md）。
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
