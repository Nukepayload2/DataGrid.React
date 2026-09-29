/**
 * 滚动模式互斥判定 hook — 详见 docs/features/scrolling/scrollbar.md 与 docs/features/scrolling/virtualization.md。
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
  /** sticky.offsetSummary（数值，缺省 0）。实际生效条件由 summary 渲染层判断。 */
  stickyOffsetSummary: number
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
        offsetSummary?: number
        getContainer?: () => HTMLElement | Window | undefined
      }
    | null
  scroll?: ScrollModeScrollInput
  virtual?: boolean
}): UseScrollModeResult {
  const { sticky, scroll, virtual } = options

  // === 页面级粘性表头（区别于容器内固定）— 详见 docs/features/layout/sticky.md ===
  // sticky prop 启用时：表头相对**页面 viewport** 固定（position:sticky; top:offsetHeader），
  // 而非相对表格滚动容器固定。
  //
  // 与虚拟 / 容器内固定表头互斥：sticky 启用时走"页面级"路径（grid 包在 `overflow: clip` 视口里——
  // clip 裁剪但不建滚动容器，故不拦截 sticky 上下文），virtual / scrollYNonVirtual 的容器内固定表头不生效（headerStickyTop 仍为 false，
  // 由 stickyHeaderOffset 驱动）。
  const stickyEnabled = sticky !== undefined && sticky !== null
  const stickyOffsetHeader =
    (sticky && typeof sticky === 'object' ? sticky.offsetHeader : undefined) ?? 0
  const stickyOffsetScroll =
    (sticky && typeof sticky === 'object' ? sticky.offsetScroll : undefined) ?? 0
  const stickyOffsetSummary =
    (sticky && typeof sticky === 'object' ? sticky.offsetSummary : undefined) ?? 0
  const stickyGetContainer =
    sticky && typeof sticky === 'object' && sticky.getContainer ? sticky.getContainer : undefined

  // === 虚拟滚动判定 — 详见 docs/features/scrolling/virtualization.md ===
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
    stickyOffsetSummary,
    stickyGetContainer,
    scrollY,
    scrollYEnabled,
    virtualEnabled,
    scrollYNonVirtual,
    headerStickyTop,
    stickyHeaderOffset,
  }
}

/**
 * `scroll` 归一层的入参形状（＝顶层 antd 同名字段 `scroll`，不新增语义）。
 *
 * 抽成具名接口是为了让 `useScrollMode` 的入参与下方 `shouldScrollToFirstRowOnChange`
 * 共用一份定义，不在两处各写一遍对象字面量形状。
 * 声明放在文件末尾（interface/type 声明在模块内提升可用）＝不移动上方任何行号，
 * 避免把指向本文件中段行号的锚点弄偏。
 */
export interface ScrollModeScrollInput {
  x?: true | number | string
  y?: true
  scrollToFirstRowOnChange?: boolean
}

/**
 * 「表格变化（翻页 / 排序 / 筛选）后该不该把滚动位置复位到首行」——**全仓唯一判据**。
 *
 * 对齐裁判 antd@6.4.4 `es/table/InternalTable.js` triggerOnChange 内的三门
 * （`scroll && scroll.scrollToFirstRowOnChange !== false && internalRef.body.current`），
 * 取其两条**由配置决定**的门：
 *
 * 1. **`scroll` 对象必须存在**＝"对象存在性"而**不是"有没有 y"**。裁判把 body ref 同时挂在
 *    `@rc-component/table` non-fixHeader 分支的 `.ant-table-content` 上，故 `scroll={{ x: 100 }}`
 *    （无 y）时裁判**照样复位**（步骤 78 探针臂 V1b：裁判 16 次写入 vs 无 scroll 臂 V1 的 0 次）。
 *    ⇒ 判据若写成"有 y 才滚"会把 V1b 从"滚"改成"不滚"＝修出新缺陷。
 * 2. **`scrollToFirstRowOnChange !== false`**＝缺省滚，只有显式 `false` 才抑制（探针臂 V3：两侧均 0 次）。
 *
 * 裁判的第三门（body ref 已挂载）是"滚动容器存在性"；我方等价物由唯一调用点的
 * `querySelector('.dg-scroll')` 判空承担（sticky 分支不渲染 `.dg-scroll` ⇒ 自然不写；探针臂 V6）。
 *
 * 判据只管"该不该滚"，不管"滚到哪个元素"：两侧写入都限定在自家滚动容器，
 * 都不触碰 window／外层容器（九臂 `windowScrollTo` 恒 0）。
 * 唯一调用点＝Table.tsx 的 `scrollToFirstRowOnChange`；**别处不许再写一份"该不该滚"的 if**。
 */
export function shouldScrollToFirstRowOnChange(
  scroll: ScrollModeScrollInput | undefined,
): boolean {
  return !!scroll && scroll.scrollToFirstRowOnChange !== false
}
