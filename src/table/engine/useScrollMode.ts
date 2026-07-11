/**
 * 滚动模式互斥判定 hook — 详见 docs/design-notes/sticky.md 与 virtualization.md。
 *
 * 引擎三种滚动模式互斥：
 *
 * 1. **页面级 sticky**（`sticky` prop 启用）：表头相对**页面 viewport** 固定
 *    （`position: sticky; top: offsetHeader`），grid 外包 `overflow: clip` 视口。
 * 2. **虚拟滚动**（`virtual === true` 且 `scroll.y === true`）：纵向虚拟滚动，
 *    表头 sticky top:0 钉在虚拟滚动容器顶部。
 * 3. **容器内固定表头**（非虚拟，`scroll.y === true`）：表头 sticky top + 表体限高滚动。
 *
 * 优先级：**sticky（页面级）> 虚拟 > 容器内固定表头**。sticky 启用时禁用虚拟与容器内固定；
 * 虚拟启用时禁用容器内固定（虚拟优先）。
 *
 * 本 hook 仅消费纯 props（sticky / scroll / virtual），返回派生布尔/数值供 GridTable 编排层使用。
 * 不持有 ref/state（stickyScrollLeft 等动态状态属于 useGridScrollSync）。
 */
export interface UseScrollModeResult {
  /** sticky prop 启用（任何非 undefined/null 值，含空对象 `{}`）。 */
  stickyEnabled: boolean
  /** sticky.offsetHeader（数值，缺省 0）。仅 sticky 启用时有效。 */
  stickyOffsetHeader: number
  /** sticky.offsetScroll（数值，缺省 0）。仅 sticky 启用时有效。 */
  stickyOffsetScroll: number
  /** sticky.getContainer（函数 or undefined）。仅 sticky 启用且提供时为函数。 */
  stickyGetContainer: (() => HTMLElement | Window | undefined) | undefined
  /** scroll.y 原值（true / undefined；当前类型仅 true 启用纵向滚动）。 */
  scrollY: true | undefined
  /** scroll.y === true。数据区域模式开关（容器内固定表头 or 虚拟）。 */
  scrollYEnabled: boolean
  /** 虚拟启用：sticky 未启用 + virtual === true + scrollYEnabled。 */
  virtualEnabled: boolean
  /** 容器内固定表头启用：sticky 未启用 + 虚拟未启用 + scrollYEnabled。 */
  scrollYNonVirtual: boolean
  /** 表头纵向 sticky 统一标志（虚拟 + 容器内固定表头共用，sticky 不走此路）。 */
  headerStickyTop: boolean
  /** 表头页面级 sticky 偏移（仅 sticky 启用时为 stickyOffsetHeader，否则 undefined）。 */
  stickyHeaderOffset: number | undefined
}

/**
 * 计算 sticky / virtual / 容器内固定表头三种模式的派生值。
 *
 * 铁律：派生逻辑字节级对齐原 GridTable.tsx L195-233 内联块（先移动不重写）。
 */
export function useScrollMode(options: {
  sticky?:
    | {
        offsetHeader?: number
        offsetScroll?: number
        getContainer?: () => HTMLElement | Window | undefined
      }
    | null
  scroll?: { x?: true | number | string; y?: true; scrollToFirstRowOnChange?: boolean }
  virtual?: boolean
}): UseScrollModeResult {
  const { sticky, scroll, virtual } = options

  // === 页面级粘性表头（区别于容器内固定）— 详见 docs/design-notes/sticky.md ===
  // sticky prop 启用时：表头相对**页面 viewport** 固定（position:sticky; top:offsetHeader），
  // 而非相对表格滚动容器固定。
  //
  // 与虚拟 / 容器内固定表头互斥：sticky 启用时走"页面级"路径（grid 不包 overflow 容器，避免拦截
  // sticky 上下文），virtual / scrollYNonVirtual 的容器内固定表头不生效（headerStickyTop 仍为 false，
  // 由 stickyHeaderOffset 驱动）。
  const stickyEnabled = sticky !== undefined && sticky !== null
  const stickyOffsetHeader =
    (sticky && typeof sticky === 'object' ? sticky.offsetHeader : undefined) ?? 0
  const stickyOffsetScroll =
    (sticky && typeof sticky === 'object' ? sticky.offsetScroll : undefined) ?? 0
  const stickyGetContainer =
    sticky && typeof sticky === 'object' && sticky.getContainer ? sticky.getContainer : undefined

  // === 虚拟滚动判定 — 详见 docs/design-notes/virtualization.md ===
  // virtual=true 且 scroll.y === true 时启用纵向虚拟滚动（scroll.y 仅 true/undefined）。
  // 虚拟窗口高度由 CSS 自动适应（容器 clientHeight，ResizeObserver 实时测量——见 useVirtualList）。
  // sticky 启用时禁用虚拟（页面级与容器内虚拟互斥；sticky 下页面滚动，虚拟窗口失去意义）。
  const scrollY = scroll?.y
  const scrollYEnabled = scrollY === true
  const virtualEnabled = !stickyEnabled && virtual === true && scrollYEnabled

  // === 容器内固定表头（非 virtual）判定 ===
  // 非 virtual 且 scroll.y === true 时启用：表头 sticky top + 表体限高纵向滚动（CSS 自动适应高度）。
  // 与虚拟互斥（虚拟优先）。sticky 启用时禁用（页面级优先）。
  const scrollYNonVirtual = !stickyEnabled && !virtualEnabled && scrollYEnabled

  // === 表头纵向 sticky 统一标志（虚拟 + 容器内固定表头共用）===
  // 无论虚拟还是非虚拟 scroll.y，表头都需要 `position: sticky; top: 0` 钉在滚动容器顶部。
  // 该标志传入 HeaderCell / ColumnCells 的 `headerStickyTop` prop，统一驱动表头 sticky 行为，
  // 避免两套不一致的实现。
  // sticky 页面级固定**不**走此标志（该标志驱动的是"容器内 top:0"）；sticky 由 stickyHeaderOffset
  // 单独驱动（表头格 inline style 用 top: offsetHeader，相对 viewport），见下方 stickyHeaderOffset。
  const headerStickyTop = virtualEnabled || scrollYNonVirtual

  // === 表头页面级 sticky 偏移（仅 sticky 启用时有效）===
  // 传入 HeaderCell / ColumnCells 的 `stickyHeaderOffset` prop：sticky 启用时表头格 inline style
  // 加 `position: sticky; top: offsetHeader; zIndex`，相对 viewport 固定。与 headerStickyTop（容器内）
  // 互斥——同时为 true 时 sticky 优先（sticky 启用时 headerStickyTop 恒 false，见上）。
  const stickyHeaderOffset: number | undefined = stickyEnabled
    ? stickyOffsetHeader
    : undefined

  return {
    stickyEnabled,
    stickyOffsetHeader,
    stickyOffsetScroll,
    stickyGetContainer,
    scrollY,
    scrollYEnabled,
    virtualEnabled,
    scrollYNonVirtual,
    headerStickyTop,
    stickyHeaderOffset,
  }
}
