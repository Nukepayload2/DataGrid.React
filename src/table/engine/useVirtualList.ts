/**
 * 虚拟滚动算法（M4）。
 *
 * 算法移植自 lun `packages/core/src/composable/virtual/useVirtual.ts`
 * （inspired by tanstack/virtual），**用纯 React + TS 重写**，不引 Vue / Web Component、
 * 不抄 lun 代码。核心思路（与 lun / @rc-component/virtual-list / tanstack/virtual 一致）：
 *
 *   1. 行高走"约定值"（rowHeight 数字或函数），**不做动态测量**（决策 1）。
 *   2. 预先为每个数据行算出 `offsetStart` / `offsetEnd`（行顶部/底部到数据区顶的距离），
 *      以及总高 `totalSize`。这是 O(N) 计算；万行规模一次即可（万行级 < 1ms）。
 *   3. 监听**纵向滚动容器**的 `scrollTop` 与 `clientHeight`（用 ResizeObserver 监听容器高度），
 *      二分/线性查找当前 scrollTop 落在哪一行附近，按 overscan 向两侧扩展得到渲染范围
 *      `[start, end)`（半开）。
 *   4. 调用方据此只渲染 `[start, end)` 的数据行；可视区**上方**与**下方**用占位高度撑起总高
 *      （`paddingTop = offsetStart[start]`，`paddingBottom = totalSize - offsetEnd[end-1]`），
 *      保证浏览器滚动条正确（与 antd virtual-list / rc-virtual-list 行为一致）。
 *
 * === ★ 决策 2：虚拟窗口范围按"收起状态"行高计算（预留 M9 展开）===
 *
 * 行高只取"收起态"约定值。**M9 展开内容将来会直接渲染，但不参与虚拟窗口大小**：
 *   - 即：展开某行会让该行真实 DOM 更高，但虚拟列表仍按约定行高定位/算可视范围，
 *     展开内容溢出渲染（牺牲性能换稳定——见 docs/task-plan.md §1.2 决策 2）。
 *   - 因此本 hook 在算 offsetStart / offsetEnd / totalSize 时**只用 `getRowHeight`**，
 *     完全不关心展开态。展开相关状态（M9）将来在调用方维护，不进本 hook。
 *
 * 这是当前阶段的明确约定；M9 实现展开时无需改动本 hook，只需让 BodyRow 渲染展开内容即可
 * （BodyRow 容器高度可能大于约定行高，但 grid 行 track 仍是约定高，展开内容会溢出到下一行
 * 的可视区域——视觉上类似 antd expand 行，但布局机制不同；可接受）。
 *
 * === scroll 同步 ===
 *
 * - 容器滚动事件 → 更新 scrollTop state → 重算 [start, end) → 重渲染。
 * - scrollTo API（index/key/scrollTop）→ 设置容器 scrollTop → 触发滚动事件 → 同上。
 *   （直接 set scrollTop 会触发原生 scroll 事件，避免双重路径。）
 *
 * === 性能注意 ===
 *
 * - 滚动期间 scrollTop state 更新频繁（每帧 1+ 次）。React 19 自动 batch，配合 useMemo
 *   计算 [start, end) 与占位高度，性能足够万行级（实测 antd virtual-list 也是这套思路）。
 * - M3 合并格（rowSpan）在虚拟下：合并可能跨越可视区边界（如 end 行被某 rowSpan>1 格覆盖到
 *   可视区外）。GridTable 渲染层会按 cellMergePlan 处理（被覆盖格不渲染）；本 hook 不感知合并，
 *   只算"逻辑行"范围。参见 GridTable 虚拟渲染部分注释。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/** 单行的纵向测量信息（offsetStart/offsetEnd 相对数据区顶部，不含表头）。 */
export interface VirtualRowMeasurement {
  /** 0-based 行索引。 */
  index: number
  /** 行顶部到数据区顶的距离（px）。 */
  offsetStart: number
  /** 行底部到数据区顶的距离（px）= offsetStart + size。 */
  offsetEnd: number
  /** 行高（px，来自 getRowHeight）。 */
  size: number
}

export interface UseVirtualListOptions {
  /** 数据行总数。 */
  itemCount: number
  /**
   * 行高约定取值器：`(index) => number(px)`。
   *
   * **决策 2**：此处始终按"收起状态"行高算（不感知展开）。调用方传入的函数应只依赖
   * `(record, index)` 的"收起态"行高（即 `TableProps.rowHeight`）。
   */
  getRowHeight: (index: number) => number
  /**
   * 纵向滚动容器 ref（clientHeight / scrollTop 来源）。
   */
  containerRef: React.RefObject<HTMLElement | null>
  /**
   * 上下两侧额外渲染的行数（overscan）。默认 8。
   * 与 tanstack/virtual / lun 一致：可视区上下各多渲染 `overscan` 行，避免快速滚动出现空白。
   */
  overscan?: number
  /** 是否启用（false 时禁用虚拟，返回全集范围）。默认 true。 */
  enabled?: boolean
  /**
   * 数据区在滚动容器内容中的"起始偏移"（px），用于精确算可视范围。
   *
   * 典型场景：表头格在容器顶部（高 H = maxDepth × headerHeight）+ sticky top:0。
   * 此时：
   *   - 表头视觉上始终占用容器顶部 H 高度（sticky）；
   *   - 真正显示数据的高度 = clientHeight - H；
   *   - 真正的"数据 scrollTop" = el.scrollTop - H（数据区相对内容顶的偏移）。
   * 把 H 传入这里，本 hook 会把 scrollTop/viewportSize 调整后再算 [start, end)。
   *
   * 缺省 0（数据区紧贴容器顶部，无表头）。
   */
  contentOffset?: number
}

export interface UseVirtualListResult {
  /** 渲染范围（半开区间，0-based 数据行 index）。 */
  start: number
  end: number
  /** 当前可视数据行数（end - start）。 */
  visibleCount: number
  /** 数据区总高（px）。 */
  totalSize: number
  /** 可视区上方占位高度（px）= measurements[start].offsetStart。 */
  paddingTop: number
  /** 可视区下方占位高度（px）= totalSize - measurements[end-1].offsetEnd。 */
  paddingBottom: number
  /** 行测量信息数组（长度 === itemCount）；O(N) 计算，memoize。 */
  measurements: Array<VirtualRowMeasurement>
  /** 当前 scrollTop（受控同步用）。 */
  scrollTop: number
  /** 容器可视高度（clientHeight）。 */
  viewportSize: number
  /**
   * 滚动到指定位置/行/记录 key（scrollTo API 入口）。
   *
   * 与 antd `Table ref.scrollTo` 接口对齐（见 antd `index.zh-CN.md` Table ref）：
   *   - `{ index }`：滚到第 index 行顶部对齐。
   *   - `{ key }`：滚到 rowKey === key 的行顶部对齐（调用方需先把 key → index 再传 index）。
   *     本 hook 只处理 index/scrollTop；key→index 解析由 Table 层完成（调用 scrollTo 时传 index）。
   *   - `{ scrollTop }`：直接滚到指定 scrollTop（兼容任务要求；antd 同名为 `top`）。
   *   - `{ offset }`：在目标行顶部对齐后额外偏移（正向下、负向上）。
   *   - `{ align }`：'start' | 'center' | 'end' | 'nearest'（默认 'start'）。
   */
  scrollTo: (config: {
    index?: number
    scrollTop?: number
    offset?: number
    align?: 'start' | 'center' | 'end' | 'nearest'
  }) => void
}

/**
 * 二分查找：返回 `offset >= target` 的首个行 index（即"包含 target 偏移的行的下一个"）。
 * 用于在 offsetStart 升序数组中定位 scrollTop 对应的起始行。
 *
 * 约定：返回值在 `[0, itemCount]` 区间；`itemCount` 表示 target 超出末尾。
 */
function findNearestIndex(
  measurements: Array<VirtualRowMeasurement>,
  target: number,
): number {
  const n = measurements.length
  if (n === 0) return 0
  let lo = 0
  let hi = n - 1
  // target 落在第 0 行之前（含第 0 行顶部）→ 返回 0
  if (target <= measurements[0].offsetStart) return 0
  // target 落在最后一行之后 → 返回 n
  if (target >= measurements[n - 1].offsetEnd) return n
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const m = measurements[mid]
    if (target < m.offsetStart) {
      hi = mid - 1
    } else if (target >= m.offsetEnd) {
      lo = mid + 1
    } else {
      // target 落在 mid 行内（offsetStart <= target < offsetEnd）
      return mid
    }
  }
  // 兜底（理论上上面分支必命中）
  return Math.max(0, Math.min(lo, n))
}

/**
 * 虚拟滚动主 hook。
 *
 * 不依赖 lun / @rc-component/virtual-list 任何代码；纯 React 实现。
 */
export function useVirtualList(options: UseVirtualListOptions): UseVirtualListResult {
  const {
    itemCount,
    getRowHeight,
    containerRef,
    overscan = 8,
    enabled = true,
    contentOffset = 0,
  } = options

  // 行测量（O(N)）。getRowHeight 引用变化时重算。
  const measurements = useMemo<Array<VirtualRowMeasurement>>(() => {
    const out: Array<VirtualRowMeasurement> = Array.from({ length: itemCount })
    let acc = 0
    for (let i = 0; i < itemCount; i += 1) {
      const size = getRowHeight(i)
      const safeSize = size > 0 ? size : 0
      out[i] = { index: i, offsetStart: acc, offsetEnd: acc + safeSize, size: safeSize }
      acc += safeSize
    }
    return out
  }, [itemCount, getRowHeight])

  const totalSize = measurements.length > 0 ? measurements[measurements.length - 1].offsetEnd : 0

  // === scroll / viewport 状态 ===
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportSize, setViewportSize] = useState(0)

  // 用 ref 持有最新的 scrollTop/viewportSize 供 scrollTo 计算使用（避免闭包陈旧）。
  const scrollTopRef = useRef(0)
  const viewportSizeRef = useRef(0)
  scrollTopRef.current = scrollTop
  viewportSizeRef.current = viewportSize

  // === 监听滚动 & 容器尺寸 ===
  useEffect(() => {
    const el = containerRef.current
    if (!el || !enabled) return

    const sync = () => {
      // scrollTop 可能因惯性/bounce 出现负值或越界，做 clamp。
      const st = Math.max(0, el.scrollTop)
      const ch = el.clientHeight
      if (st !== scrollTopRef.current) {
        scrollTopRef.current = st
        setScrollTop(st)
      }
      if (ch !== viewportSizeRef.current) {
        viewportSizeRef.current = ch
        setViewportSize(ch)
      }
    }

    // 初始同步一次（容器挂载后立即测）。
    sync()

    // 滚动事件（passive，不阻塞滚动）。
    el.addEventListener('scroll', sync, { passive: true })

    // ResizeObserver：容器尺寸变化时重算（如窗口缩放）。
    const ro = new ResizeObserver(() => sync())
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', sync)
      ro.disconnect()
    }
  }, [containerRef, enabled])

  // === 渲染范围计算 ===
  // contentOffset 调整：把 scrollTop/viewportSize 换算到"数据区坐标系"。
  //   effectiveScrollTop = el.scrollTop - contentOffset（数据区相对内容顶的滚动偏移）
  //   effectiveViewport  = clientHeight - contentOffset（表头 sticky 占去顶部 contentOffset 高）
  // 当 contentOffset=0 时退化为原始逻辑（无表头偏移）。
  const { start, end } = useMemo(() => {
    if (!enabled || itemCount === 0) {
      return { start: 0, end: itemCount }
    }
    const vs = viewportSizeRef.current
    const st = scrollTopRef.current
    // 未测出容器高度（首次/隐藏元素）→ 退化为渲染较小窗口（前 overscan*2 行），避免一次渲染全集。
    if (vs <= 0) {
      const initialCount = Math.min(itemCount, overscan * 2 + 1)
      return { start: 0, end: initialCount }
    }
    const effectiveScrollTop = st - contentOffset
    const effectiveViewport = Math.max(0, vs - contentOffset)
    // 起始行：包含 effectiveScrollTop 的行（向上多留 overscan 行）。
    const rawStart = findNearestIndex(measurements, effectiveScrollTop)
    const startIdx = Math.max(0, rawStart - overscan)
    // 结束行：effectiveScrollTop + effectiveViewport 对应行（向下多留 overscan 行）。
    const rawEnd = findNearestIndex(measurements, effectiveScrollTop + effectiveViewport)
    // rawEnd 可能等于 itemCount（target 超出末尾）；取 max 至少含 rawStart。
    const endIdx = Math.min(itemCount, Math.max(rawStart + 1, rawEnd) + overscan)
    return { start: startIdx, end: endIdx }
  }, [enabled, itemCount, measurements, overscan, scrollTop, viewportSize, contentOffset])

  // === 占位高度（撑总高）===
  const paddingTop = measurements.length > 0 && start < measurements.length
    ? measurements[start].offsetStart
    : 0
  const paddingBottom = measurements.length > 0 && end > 0
    ? Math.max(0, totalSize - measurements[Math.min(end, measurements.length) - 1].offsetEnd)
    : 0

  // === scrollTo API ===
  const scrollTo = useCallback(
    (config: {
      index?: number
      scrollTop?: number
      offset?: number
      align?: 'start' | 'center' | 'end' | 'nearest'
    }) => {
      const el = containerRef.current
      if (!el) return
      const { index, scrollTop: top, offset = 0, align = 'start' } = config

      // 容器最大可滚动 scrollTop（含表头 contentOffset 占高）。
      //   scrollHeight = contentOffset（表头）+ totalSize（数据区）；clientHeight 为可视高。
      //   maxScrollTop 至少 0（数据总高不足一屏时无可滚动空间，任何 scrollTo 都应停在 0）。
      const clientHeight = el.clientHeight
      const maxScrollTop = Math.max(0, el.scrollHeight - clientHeight)

      let targetTop: number
      if (typeof top === 'number') {
        // scrollTop/top 分支：直接作为容器 scrollTop；负值 clamp 到 0（到顶）。
        targetTop = Math.max(0, top)
      } else if (typeof index === 'number') {
        // 边界加固：负值 index → 当作 0（到顶）；超大 index（≥ itemCount）→ 当作最后一行（到底方向）。
        const clampedIndex = index < 0
          ? 0
          : index >= measurements.length
            ? measurements.length - 1
            : index
        if (measurements.length === 0) return
        const rowTop = measurements[clampedIndex].offsetStart
        const rowSize = measurements[clampedIndex].size
        // ★ targetTop 直接用"数据区坐标系"的 rowTop，不加 contentOffset。
        //   表头是 position:sticky; top:0，不占数据区滚动空间——它脱离了数据内容流，
        //   数据区用独立的 paddingTop track 撑偏移。故目标行的容器绝对滚动偏移 = rowTop 本身。
        //   证：scrollTop=0 时，sticky 表头盖住 [0, contentOffset)，第一行（数据 y=0 = 容器 y=contentOffset）
        //   正好落在表头下沿——这恰是 align='start' 的目标；而 maxScrollTop = contentOffset+totalSize-clientHeight，
        //   末行底部到表头下沿对应 rowTop=totalSize-effectiveViewport，同样不含 contentOffset。
        //   故 index 路径的容器 scrollTop = rowTop（数据坐标），无需 + contentOffset 再回转。
        //
        //   viewport 用 effectiveViewport（vs=clientHeight-contentOffset，已减表头），保证目标行显示在
        //   表头下方的可视数据区内、不被 sticky 表头遮挡。st 同样换算到数据坐标系（scrollTop-contentOffset）。
        const vs = (viewportSizeRef.current || clientHeight) - contentOffset
        switch (align) {
          case 'center':
            // 行中心对齐到可视数据区中心。
            targetTop = rowTop + rowSize / 2 - vs / 2
            break
          case 'end':
            // 行底对齐到可视数据区底（表头下沿往下 vs 处）。
            targetTop = rowTop + rowSize - vs
            break
          case 'nearest': {
            const st = scrollTopRef.current - contentOffset
            // 已在可视区则不动；否则取 start/end 之一使其进入。
            if (rowTop < st) targetTop = rowTop
            else if (rowTop + rowSize > st + vs) targetTop = rowTop + rowSize - vs
            else targetTop = st
            break
          }
          case 'start':
          default:
            // 行顶对齐到可视数据区顶（即表头下沿）。
            targetTop = rowTop
            break
        }
        // index=0 + align='start'/nearest(上滚) → targetTop=0（到顶，第一行贴表头下沿）。
        // center/end 在数据不足一屏时 targetTop 可能为负 → clamp 到 0 表示到顶。
        // 不在此加 +contentOffset；下方统一 clamp 处理到底（≤maxScrollTop）。
        targetTop = Math.max(0, targetTop)
      } else {
        return
      }
      // 叠加用户 offset，先 clamp ≥0（到顶），再 clamp ≤ maxScrollTop（到底）。
      const finalTop = Math.max(0, Math.min(maxScrollTop, targetTop + offset))
      // 直接 set scrollTop；原生 scroll 事件会触发上面的 sync → 更新 start/end。
      el.scrollTop = finalTop
      // 部分浏览器在 set scrollTop 后不立刻派发 scroll 事件（或被合并），手动同步一次兜底。
      scrollTopRef.current = el.scrollTop
      setScrollTop(el.scrollTop)
    },
    [containerRef, measurements, contentOffset],
  )

  return {
    start,
    end,
    visibleCount: Math.max(0, end - start),
    totalSize,
    paddingTop,
    paddingBottom,
    measurements,
    scrollTop,
    viewportSize,
    scrollTo,
  }
}
