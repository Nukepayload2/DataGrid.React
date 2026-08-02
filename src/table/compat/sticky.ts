/**
 * 粘性表头配置。
 *
 * 对齐 antd v6 `TableProps.sticky`。
 */
// 按业务域从 compatTypes.ts 拆出；实现参考 antd `react-component/table/src/hooks/useSticky.ts`
// + `components/table/style/sticky.ts`。

/**
 * 粘性表头 + 页面级滚动条（对齐 antd v6 `TableProps.sticky`）。
 *
 * **语义（区别容器内固定）**：
 *   - **容器内固定**：`scroll.y` → 表头相对**表格滚动容器**固定（sticky 钉顶）。
 *     表格在容器内纵向滚动，表头钉在容器顶部。
 *   - **页面级固定**（sticky prop）：表头相对**页面 viewport**固定（sticky top 偏移 `offsetHeader`，
 *     `getContainer` 默认 `window`）。表格**不在容器内滚动**，而是页面（document）滚动时表头钉在
 *     视口顶部 `offsetHeader` 处（典型：站点 header 高度偏移）。
 *
 * **取值**：
 *   - `undefined` / `false`：不启用页面级 sticky（所有现有 demo 行为不变，零回归）。
 *   - `true`：启用，`offsetHeader=0`、`offsetSummary=0`、`offsetScroll=0`、`getContainer=window`。
 *   - 对象 `{ offsetHeader?, offsetSummary?, offsetScroll?, getContainer? }`：自定义偏移与滚动容器。
 *
 * **与各能力组合**：
 *   - 固定列：表头固定列格同时有横向 sticky（left/right）与纵向 sticky（top: offsetHeader）——
 *     单元素双 sticky 浏览器原生支持（与 corner cell 同款机制）。
 *   - summary fixed：页面级 sticky 且非数据区域滚动时，`offsetSummary` 作为 fixed summary 的
 *     bottom 偏移；横向滚动条仍保持在 summary 上方。
 *   - 虚拟 / 容器内固定：与 sticky 互斥（sticky 是页面级，容器内是页面级优先；同时传时 sticky 优先，
 *     因为 sticky 不包 overflow 容器，容器内滚动不生效）。
 *
 * **getContainer 说明**：对齐 antd，允许自定义"判定 sticky 生效的滚动容器"。默认 `() => window`。
 *
 * 详见 `docs/features/layout/sticky.md`。
 *
 * @internal 实现要点（data-grid CSS Grid 一体化渲染下的折中）：
 *   - antd 把表头拆为独立元素（FixedHolder）放在页面流中 `position: sticky; top: offsetHeader`；
 *     data-grid 用 CSS Grid 一体渲染（表头行 + 数据行同属 `.dg-grid`），无法拆分表头为独立元素。
 *   - data-grid 方案：`sticky` 启用时，`.dg-grid` 外只包一层 `overflow: clip` 视口。clip 会裁剪宽表，
 *     但不创建滚动容器，避免普通 `overflow-x:auto` 拦截 sticky 上下文。表头 grid item
 *     `position: sticky; top: offsetHeader` 相对 viewport 固定（页面纵向滚动时钉在视口顶部）。
 *   - 横向滚动：不让宽表撑宽页面；`StickyScrollBar`（`position: sticky; bottom: offsetScroll`）
 *     维护虚拟 scrollLeft，并用 transform 驱动 grid 横向位移（视觉对齐 antd fake scrollbar）。
 *     data-grid 中 `getContainer` 主要用于 StickyScrollBar 的纵向滚动/resize 同步监听；表头 sticky
 *     本身靠 CSS（无 overflow 祖先 → 相对 viewport），不直接消费 getContainer。
 *   - 容器内固定对应的滚动容器 DOM 类为 `.dg-fixed-header-scroll`。
 */
export interface StickyConfig {
  /**
   * 表头相对视口顶部的偏移（px）。典型用于站点 header 遮挡场景（如 antd site header 高 64）。
   * 默认 0。
   */
  offsetHeader?: number
  /**
   * 底部悬浮滚动条相对视口底部的偏移（px）。
   * 默认 0。
   */
  offsetScroll?: number
  /**
   * 固定 summary 相对视口底部的偏移（px）。
   *
   * 仅在页面级 sticky、存在 summary、`Table.Summary fixed` 且未启用 `scroll.y` 数据区域模式时生效。
   * 默认 0。
   */
  offsetSummary?: number
  /**
   * 自定义滚动容器（用于悬浮滚动条同步监听）。默认 `() => window`。
   * 返回 `undefined`/`null` 时回退到 `window`。
   */
  getContainer?: () => HTMLElement | Window | undefined
}
