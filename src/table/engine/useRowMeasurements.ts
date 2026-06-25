/**
 * 行测量 hook（Phase 2 · 动态行高）。
 *
 * === 作用 ===
 *
 * 用**单个 ResizeObserver** 观察 body 内容容器，当容器尺寸变化时（行高变化 / 行增删 /
 * 滚动后新行进入 DOM），遍历容器的**行级子元素**实测高度，与每个元素上记录的
 * `data-known-size`（上一次实测值，由 GridTable 渲染层回填）对比：
 *   - 相同 → 跳过（去重，避免每帧重算 sizeTree / 重渲染，对应 react-virtuoso
 *     `useChangedChildSizes.ts` L117-119 的 knownSize 短路）；
 *   - 不同 → 记入 `SizeRange`；**相邻同高段合并**成一个 `{startIndex, endIndex, size}`
 *     （同 `getChangedChildSizes` L121-126 合并逻辑）。
 *
 * 合并后的 ranges 经 `onRanges` 回填给上层（Phase 3 起：`applySizeRanges(state, ranges, gap)`
 * 增量更新 sizeTree / offsetTree）。
 *
 * === 与 react-virtuoso 对照 ===
 *
 * | 点 | react-virtuoso | 本 hook |
 * |----|----------------|---------|
 * | 单 RO 观察容器 | `useSizeWithElRef` 一个 observer，observe 内层 list 容器 | 同：单 RO observe(containerRef) |
 * | RAF 合并 | `useSize.ts` L28 `requestAnimationFrame(code)` | 同：RAF 包裹 flush，已调度则跳过，cleanup cancel |
 * | 隐藏守卫 | L21 `element.offsetParent !== null`（容器级，整体跳过） | **逐行** `el.offsetParent === null` 跳过该行（更细粒度，符合计划要求） |
 * | 去重 | L110 读 `dataset.knownSize`，L117 `size === knownSize` continue | 同 |
 * | 合并相邻同高段 | L121-126 | 同 |
 * | 实测取整 | `correctItemSize` → `Math.round(getBoundingClientRect().height)` | 同 |
 *
 * 差异说明：
 *   - react-virtuoso 用 `dataset.index`（行索引）+ `offsetHeight`；本表用 `data-row-index`
 *     + `getBoundingClientRect().height`（与 `correctItemSize` 一致，Grid 表格行高更稳定用 rect）。
 *   - react-virtuoso 的 `useChangedListContentsSizes` 还顺带读 scrollHeight/scrollTop/gap；
 *     本表 scroll 由 `useVirtualList` 独立路径负责，gap 由参数传入，**本 hook 只管行高测量**，
 *     职责单一（计划 Phase 2 明确「只新建 useRowMeasurements，不碰 useVirtualList」）。
 *
 * === 首次挂载 flush ===
 *
 * 挂载即调用一次 flush（不等首个 RO 事件）：首屏首次写入实测行高，避免「空 sizeTree → 回退
 * 约定行高撑 track → 一帧后 RO 触发修正」的一次性闪烁。
 *
 * === data-known-size 闭环（防死循环）===
 *
 * GridTable 渲染每行时需把 `sizeOf(i)` 写到该行 DOM 的 `data-known-size`（Phase 4 工作）。
 * 这样：测量得到 size → 写入 sizeTree → 下次渲染回填到 data-known-size → 下次 RO 事件
 * 读到 `size === knownSize` → 跳过。否则每次 RO 都报变化 → 死循环重渲染（计划「风险」已标注）。
 *
 * === FillerRow 占位 ===
 *
 * Phase 4 会用 FillerRow（`grid-column:1/-1` 的空 div）替代 grid padding 撑总高。FillerRow
 * **不打 `data-row-index`** → 本 hook 遍历子元素时跳过它（`getChangedRowSizes` 中
 * `if (idxAttr === null) continue`），不影响测量。
 */

import { useEffect, useRef, type RefObject } from 'react'

// === Phase 1 类型/函数（来自 ./rowSizeSystem）===
// SizeRange 由 rowSizeSystem 统一定义（避免重复定义导致类型不一致）。
// applySizeRanges 由上层（useVirtualList）回调里调用；本 hook 只产 ranges，不直接调用。
export type { SizeRange } from './rowSizeSystem'
import type { SizeRange } from './rowSizeSystem'

/**
 * 容器内一行的高度修正值（对齐 react-virtuoso `utils/correctItemSize.ts`）。
 *
 * 用 `Math.round(getBoundingClientRect().height)`：grid track 实际高可能是小数（如 42.4px），
 * 取整避免 sizeTree 频繁写入 42.4→42.3999... 这类浮点抖动；同时与 `data-known-size`
 * 写入端（GridTable 也取整）保持一致，确保去重生效。
 */
function correctRowSize(el: HTMLElement): number {
  return Math.round(el.getBoundingClientRect().height)
}

/**
 * 遍历容器子元素，返回「与已知尺寸不同」的行段（相邻同高合并）。
 *
 * - 跳过无 `data-row-index` 的子元素（FillerRow 占位 / 非行容器）；
 * - 跳过 `offsetParent === null` 的隐藏行（`display:none` 或祖先隐藏），避免把 0 / 旧值写回；
 * - `correctSize === knownSize` 跳过（去重）；
 * - 相邻同高段合并：当前行 size 与上一段 size 相同且 index 紧接 → `endIndex++`，
 *   否则 push 新段（同 react-virtuoso `getChangedChildSizes` L121-126）。
 *
 * @returns 无变化或无有效行时返回 `null`（上层据此跳过 setState）。
 */
function getChangedRowSizes(container: HTMLElement): SizeRange[] | null {
  const children = container.children
  const length = children.length
  if (length === 0) {
    return null
  }

  const results: SizeRange[] = []

  for (let i = 0; i < length; i++) {
    const child = children.item(i) as HTMLElement
    const idxAttr = child.dataset.rowIndex
    // 无 data-row-index → 非数据行（FillerRow 占位等），跳过。
    if (idxAttr === undefined) {
      continue
    }

    // 隐藏行（display:none 或被祖先隐藏）→ offsetParent===null，跳过避免写入错误尺寸。
    if (child.offsetParent === null) {
      continue
    }

    const index = parseInt(idxAttr, 10)
    // data-known-size 缺失时按 NaN 处理 → 与任何 finite size 都不等 → 视为「需测量」。
    const knownSize = parseFloat(child.dataset.knownSize ?? '')
    const size = correctRowSize(child)

    // 尺寸为 0（行未布局完成 / 空行）→ 不写入（避免污染 sizeTree）。
    if (size === 0) {
      continue
    }

    // 去重：与上次实测相同 → 跳过（核心防死循环 + 防无谓 setState）。
    if (size === knownSize) {
      continue
    }

    // 相邻同高段合并：当前段 size 与新行 size 相同，且 index 紧接当前段 endIndex → 扩展段。
    const last = results[results.length - 1]
    if (results.length === 0 || last.size !== size || last.endIndex !== index - 1) {
      results.push({ startIndex: index, endIndex: index, size })
    } else {
      last.endIndex = index
    }
  }

  // 无变化 → 返回 null（与 react-virtuoso 一致，上层据此不触发回填）。
  return results.length > 0 ? results : null
}

/**
 * 测量 body 行高度并向上回填 SizeRange。
 *
 * @param containerRef body 内容容器 ref（行级子元素的直接父；GridTable 传入）。
 * @param enabled     是否启用测量（虚拟关闭 / 受控行高场景可 false → 不 observe）。
 * @param onRanges    变化段回调（上层用 applySizeRanges 增量更新 sizeTree）。
 * @param gap         行间距（px，传给 applySizeRanges 算 offsetTree；本 hook 不直接用）。
 */
export function useRowMeasurements(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  onRanges: (ranges: SizeRange[]) => void,
  /**
   * 行间距（px）。本 hook 不直接使用——保留参数位以对齐计划签名，
   * 上层（useVirtualList）在 onRanges 回调里把 gap 传给 applySizeRanges 算 offsetTree。
   */
  gap: number,
): void {
  // onRanges 用 ref 持有最新，避免 RO 回调闭包捕获陈旧 onRanges（caller 每渲染新函数也不会丢）。
  const onRangesRef = useRef(onRanges)
  onRangesRef.current = onRanges

  // RAF 句柄；-1 表示未调度。RAF 合并：RO 多次触发只排一次 flush。
  const rafRef = useRef<number>(-1)

  useEffect(() => {
    const container = containerRef.current
    // 未启用 / 容器未挂载 → 什么都不做。
    if (!enabled || !container) {
      return
    }

    const flush = () => {
      rafRef.current = -1
      const el = containerRef.current
      if (!el) {
        return
      }
      const ranges = getChangedRowSizes(el)
      if (ranges !== null) {
        // 通过 ref 调最新 onRanges，避免闭包陈旧。
        onRangesRef.current(ranges)
      }
    }

    const scheduleFlush = () => {
      // 已调度则跳过（RAF 合并，防 layout thrash；同 useSize.ts L28 单次 rAF）。
      if (rafRef.current !== -1) {
        return
      }
      rafRef.current = requestAnimationFrame(flush)
    }

    // 首次挂载 flush 一次：首屏即写入实测行高，避免空 sizeTree 回退约定高的一帧闪烁。
    scheduleFlush()

    // 单 ResizeObserver 观察容器（react-virtuoso 同款：useSize.ts L16-31 一个 observer）。
    // RO 只负责「触发测量」，测量逻辑全部在 flush → getChangedRowSizes 里做去重/合并。
    const observer = new ResizeObserver(() => {
      scheduleFlush()
    })
    observer.observe(container)

    return () => {
      // cleanup：取消已调度 RAF + 断开 RO，防内存泄漏与卸载后 setState。
      if (rafRef.current !== -1) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = -1
      }
      observer.disconnect()
    }
    // 仅 enabled 与 containerRef.current 变化时重建 observer。
    // onRanges 经 ref 持有，故不在依赖里（避免 caller 每渲染新函数导致 observer 反复重建）。
  }, [enabled, containerRef])
}
