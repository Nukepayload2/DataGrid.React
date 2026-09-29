/**
 * 行测量 hook（动态行高）— 详见 docs/features/layout/row-height.md（「动态行高测量」节）。
 *
 * 用单个 ResizeObserver 观察 body 内容容器，遍历行级子元素实测高度，与
 * `data-known-size` 对比去重 + 相邻同高段合并，回填 SizeRange 给上层。
 * 仅负责行高测量（scroll/gap 由 useVirtualList 负责）。
 */

import { useEffect, useRef, type RefObject } from 'react'

// SizeRange 由 rowSizeSystem 统一定义（避免重复定义导致类型不一致）。
// applySizeRanges 由上层（useVirtualList）回调里调用；本 hook 只产 ranges，不直接调用。
export type { SizeRange } from './rowSizeSystem'
import type { SizeRange } from './rowSizeSystem'

/**
 * 容器内一行的高度修正值。
 *
 * 用 `Math.round(el.offsetHeight)`：grid track 实际高可能是小数（如 42.4px），
 * 取整避免 sizeTree 频繁写入浮点抖动；同时与 `data-known-size` 写入端（GridTable 也取整）
 * 保持一致，确保去重生效。
 *
 * 用 `offsetHeight`（整数布局高度）替代 `getBoundingClientRect().height`（浮点 rect）：
 *   - `offsetHeight` 已是整数（CSS 像素），`Math.round` 是无副作用的恒等；与之前取整后结果一致。
 *   - 少一次 rect 对象分配（getBoundingClientRect 构造一个 DOMRect）。
 *   - 循环内零写：连续纯读 offsetHeight，modern Chrome 会把多次读合并到一次 layout flush。
 */
function correctRowSize(el: HTMLElement): number {
  // offsetHeight 已取整；Math.round 保留以兼容（万一未来切回 getBoundingClientRect）。
  return Math.round(el.offsetHeight)
}

/**
 * 遍历容器子元素，返回「与已知尺寸不同」的行段（相邻同高合并）。
 *
 * - 跳过无 `data-row-index` 的子元素（FillerRow 占位 / 非行容器）；
 * - 跳过 `offsetParent === null` 的隐藏行（逐行守卫，见 row-height.md），避免把 0 / 旧值写回；
 * - `correctSize === knownSize` 跳过（去重）；
 * - 相邻同高段合并：当前行 size 与上一段 size 相同且 index 紧接 → `endIndex++`，否则 push 新段。
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

  // 无变化 → 返回 null（上层据此不触发回填）。
  return results.length > 0 ? results : null
}

/**
 * 容器子元素签名（数量 + 首尾数据行 index）。
 *
 * 用于 flush 短路：若签名与上次相同，说明虚拟窗口未进出、DOM 未增删 → 上次 flush 已把实测高度
 * 回填到 data-known-size，本次 flush 必然返回空（getChangedRowSizes 内 size===knownSize 去重），
 * 直接跳过省 N 次 offsetHeight 读。
 *
 * 仅做"零布局读"操作（dataset + length）—— 不触发 reflow；与 getChangedRowSizes 的遍历重叠，
 * 但读的属性不同（dataset vs offsetHeight），modern 浏览器会把 dataset 读 + 长度读合并到同一
 * style/layout flush。即便不能合并，dataset 读也是 O(1) per element 的廉价字符串读。
 *
 * 首尾 index 取「首个 / 末个有 data-row-index 的子元素」，无数据行时返回 null（视作无签名）。
 */
function computeChildrenSignature(container: HTMLElement): {
  childCount: number
  firstIdx: number | null
  lastIdx: number | null
} {
  const children = container.children
  const length = children.length
  let firstIdx: number | null = null
  let lastIdx: number | null = null
  // 首个有 data-row-index 的子元素 → firstIdx；末个 → lastIdx。
  // 多数虚拟列表里，padding/数据行交错排列，但只有数据行带 data-row-index。
  for (let i = 0; i < length; i++) {
    const idxAttr = (children.item(i) as HTMLElement).dataset.rowIndex
    if (idxAttr === undefined) continue
    const idx = parseInt(idxAttr, 10)
    if (firstIdx === null) firstIdx = idx
    lastIdx = idx
  }
  return { childCount: length, firstIdx, lastIdx }
}

/**
 * 测量 body 行高度并向上回填 SizeRange。
 *
 * @param containerRef body 内容容器 ref（行级子元素的直接父；GridTable 传入）。
 * @param enabled     是否启用测量（虚拟关闭 / 受控行高场景可 false → 不 observe）。
 * @param onRanges    变化段回调（上层用 applySizeRanges 增量更新 sizeTree）。
 */
export function useRowMeasurements(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  onRanges: (ranges: SizeRange[]) => void,
): void {
  // onRanges 用 ref 持有最新，避免 RO 回调闭包捕获陈旧 onRanges（caller 每渲染新函数也不会丢）。
  const onRangesRef = useRef(onRanges)
  onRangesRef.current = onRanges

  // RAF 句柄；-1 表示未调度。RAF 合并：RO 多次触发只排一次 flush。
  const rafRef = useRef<number>(-1)

  // 上次 flush 时容器子元素签名（数量 + 首尾数据行 index）。
  // 短路依据：若子元素列表完全相同（虚拟窗口未进出 / 无 DOM 增删）→ 上次 flush 已把所有行
  //   实测高度回填到 data-known-size，getChangedRowSizes 内部 size===knownSize 必然命中去重 →
  //   返回 null。此时跳过整个 flush（省去 N 次 offsetHeight 读）。
  // 注意：虚拟窗口进出（children count / 首尾 index 变）时本就要 flush，签名必变 → 不跳过。
  const lastSignatureRef = useRef<{
    childCount: number
    firstIdx: number | null
    lastIdx: number | null
  }>({ childCount: 0, firstIdx: null, lastIdx: null })

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
      // 短路：签名未变 → 跳过本次 flush（详见 lastSignatureRef 注释）。
      const signature = computeChildrenSignature(el)
      const prev = lastSignatureRef.current
      if (
        prev.childCount === signature.childCount &&
        prev.firstIdx === signature.firstIdx &&
        prev.lastIdx === signature.lastIdx
      ) {
        return
      }
      lastSignatureRef.current = signature
      const ranges = getChangedRowSizes(el)
      if (ranges !== null) {
        // 通过 ref 调最新 onRanges，避免闭包陈旧。
        onRangesRef.current(ranges)
      }
    }

    const scheduleFlush = () => {
      // 已调度则跳过（RAF 合并，防 layout thrash）。
      if (rafRef.current !== -1) {
        return
      }
      rafRef.current = requestAnimationFrame(flush)
    }

    // 首次挂载 flush 一次：首屏即写入实测行高，避免空 sizeTree 回退约定高的一帧闪烁。
    scheduleFlush()

    // 单 ResizeObserver 观察容器。
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
