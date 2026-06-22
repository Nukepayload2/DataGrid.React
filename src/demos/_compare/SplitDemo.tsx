/**
 * 决策 9：demo 左右对比框架外壳组件（SplitDemo）。
 *
 * 用途：把 data-grid Table 与 antd Table 并排（50/50）呈现，方便对照修 bug
 * （视觉/行为差异一目了然）。每个 demo 的"数据/列/交互配置"由调用方各自准备，
 * SplitDemo 只负责左右并排布局 + 标题栏 + 独立滚动 + 窄容器堆叠。
 *
 * === 全局深色/浅色切换（任务 M，dark mode 对齐验证基础设施）===
 *
 * 顶部主题控制条带一个 antd `<Switch>`（checked=Dark / unChecked=Light），驱动一个
 * 包裹**两侧 pane + 说明区 + 控制条本身**的 `<ConfigProvider theme={{ algorithm }}>`：
 *
 *   - **Light（默认 false）**：`theme.defaultAlgorithm`，行为/外观与改造前**完全一致**（零回归）。
 *   - **Dark（true）**：`theme.darkAlgorithm`，两侧同时切 dark：
 *     - **右栏 antd Table**：ConfigProvider 天然驱动，自动 dark。
 *     - **左栏 data-grid Table**：Table.tsx 用 antd 内部 `useToken`（`antd/es/theme/internal`）
 *       读 realToken 并 `useMemo` 依赖之；algorithm 切换 → realToken 新引用 → useMemo 重算
 *       → `.dg-wrapper` 全套 `--ant-*` 刷新为 dark 值（与 `.ant-table-wrapper` 同名同值）。
 *       所以**只要把 data-grid Table 放进 dark ConfigProvider，左栏自动变 dark**。
 *   - **外壳 chrome（pane/title/note/控制条）**：compare.css 原硬编码浅色（#fff/#fafafa/#f0f0f0），
 *     dark 下会变成"深色表格坐在刺眼白底卡片里"。用**显式颜色 + `.dg-compare--dark` 修饰类**
 *     （由同一个 isDark state 驱动，拼到 `.dg-compare` 容器 className）覆盖：pane→#141414、
 *     title/note/控制条→#1d1d1d、border→#303030、文字→rgba(255,255,255,0.85/0.65)。
 *     选显式颜色而非 token：antd v6 cssinjs 的 `--ant-*` 只挂在 antd 组件子树（cssVar
 *     root 作用域），SplitDemo chrome 在 ConfigProvider 外层 div 上无 `--ant-*` 可消费，
 *     显式颜色最稳、可预测、不依赖 token 作用域细节（任务规格推荐方案）。
 *
 * 切换是全局的（一个 Switch 驱动两侧），所有 49 个 compare demo 都能验证 dark mode 对齐。
 *
 * === 自适应横竖（纯 CSS flex-wrap，无 JS 测量）===
 *
 * 与「固定视口媒体查询」和「ResizeObserver JS 测量」都不同，本组件用 **纯 CSS
 * flex-wrap + 每 pane min-width** 实现按容器实际宽度自适应横竖，零 JS：
 *
 *   - 容器 `.dg-compare`：`display:flex; flex-wrap:wrap; gap:16px`。
 *   - 每个 pane：`flex:1 1 0; min-width: var(--pane-min, 480px)`，其中
 *     `--pane-min` 由调用方通过 `minPaneWidth` prop 写到 `.dg-compare` 的
 *     inline style（作为 CSS 变量）。
 *
 * 机制（flex-wrap 天然语义）：
 *
 *   - 当容器宽度 ≥ `minPaneWidth × 2 + gap`（gap≈16）→ 两个 pane 同一行放得下，
 *     flex-wrap 不换行，flex-grow 各 50% → **横排**。
 *   - 否则（容器 < `minPaneWidth × 2 + 16`）→ 第一个 pane 已经达到 min-width，
 *     放不下第二个 → flex-wrap 自动换行，每个 pane 各占一行全宽 → **竖排**。
 *
 * **每 demo 阈值不同**：调用方通过 `minPaneWidth` 传入「单栏能舒适显示内容的最小宽度」，
 * 横排阈值 = `minPaneWidth × 2 + 16`。约定：
 *
 *   - **窄表 demo**（列少、无 scroll.x，如 fixed-columns-header / summary）：传小值
 *     （默认 480 → 阈值 976），常规笔记本视口（≥1024）即可横排。
 *   - **宽表 demo**（scroll.x 大，如 virtual-list scroll.x:2000）：传大值（~1000 →
 *     阈值 2016），常规笔记本视口（1440–1920）下竖排（每栏全宽更友好）、超宽屏
 *     （≥2560）才横排。
 *
 * 优势：无 JS、无 ResizeObserver、无 useLayoutEffect、无首帧闪烁、无媒体查询断点，
 * 阈值由 `minPaneWidth` 纯 CSS 表达。
 *
 * 通用、可复用、opt-in：不影响未迁移的 demo（它们不 import 本组件）。
 *
 * === stickyMode（页面级 sticky demo 专用，默认 false）===
 *
 * CSS sticky 经典陷阱：**非 visible overflow 祖先会拦截 sticky 上下文**。默认 `.dg-compare__pane`
 * `overflow:hidden`（圆角裁剪）+ `.dg-compare__body` `overflow:auto`（独立滚动）使 pane/body 成为
 * sticky 的滚动祖先，导致子组件 `position:sticky; top:Npx` 相对 pane/body 而非 viewport 固定 →
 * 表头被 pane/body 滚动容器吃掉、不跟随**页面**滚动。
 *
 * `stickyMode=true` 时给容器加修饰类 `.dg-compare--sticky`，pane/body 均设 `overflow:visible`
 * （放开 sticky 滚动祖先，不裁剪、不自滚），让**页面**滚动驱动 sticky。表格自身 `scroll.x` 横向
 * 滚动是 Table 内部容器，不受 pane overflow 影响（仍正常）。
 *
 * 仅页面级 sticky demo（如 sticky.tsx 的 S34 `sticky.offsetHeader`）需要传 true；其余 demo
 * 默认 false，行为完全不变（pane 圆角裁剪 + body 独立滚动）。
 */

import { useState, type CSSProperties, type ReactNode } from 'react'
import { ConfigProvider, Switch, theme } from 'antd'
import './compare.css'

export interface SplitDemoProps {
  /** 左栏内容（通常是 data-grid Table）。 */
  left: ReactNode
  /** 右栏内容（通常是 antd Table）。 */
  right: ReactNode
  /** 左栏标题，默认 'data-grid'。 */
  leftTitle?: ReactNode
  /** 右栏标题，默认 'antd 6.4.4'。 */
  rightTitle?: ReactNode
  /**
   * 单栏能舒适显示内容的最小宽度（px），作为 CSS 变量 `--pane-min` 写到容器，
   * 驱动纯 CSS flex-wrap 自适应横竖。
   *
   * 横排阈值 = minPaneWidth × 2 + 16（gap）。
   * - 默认 480（窄表友好，阈值 976）：常规笔记本视口（≥1024）即横排。
   * - 宽表（scroll.x 大，如 2000）应传更大值（如 1000，阈值 2016），使常规视口竖排。
   */
  minPaneWidth?: number
  /**
   * 可选：全宽说明区，渲染在两栏下方（`.dg-compare` 容器之外，横竖排恒居底部）。
   */
  children?: ReactNode
  /**
   * 页面级 sticky 模式（默认 false）。
   *
   * - **false（默认）**：pane `overflow:hidden`（圆角裁剪）+ body `overflow:auto`（独立滚动），
   *   pane/body 是子组件 sticky 的滚动祖先 → 子组件 `position:sticky` 相对 pane/body 固定。
   *   适用于绝大多数 demo（容器内滚动）。
   * - **true**：pane + body 均 `overflow:visible`（不裁剪、不自滚），放开 sticky 上下文，
   *   让**页面**滚动驱动子组件 sticky（表头钉视口顶 `offsetHeader`）。仅页面级 sticky demo
   *   （如 sticky.tsx 的 S34 `sticky.offsetHeader:64`）需要传 true。
   *
   * 表格自身 `scroll.x` 横向滚动是 Table 内部容器，不受 pane overflow 影响（两种模式都正常）。
   * 实现机制：true 时给 `.dg-compare` 容器加修饰类 `.dg-compare--sticky`，compare.css 内该类
   * 设 pane/body overflow:visible（不修改默认规则，只新增修饰类）。
   */
  stickyMode?: boolean
}

export function SplitDemo({
  left,
  right,
  leftTitle = 'data-grid',
  rightTitle = 'antd 6.4.4',
  minPaneWidth = 480,
  stickyMode = false,
  children,
}: SplitDemoProps) {
  // ★ 任务 M：全局 dark/light 切换。默认 false（light），行为/外观与改造前完全一致。
  //   一个 state 同时驱动：ConfigProvider algorithm（两侧表格主题）+ .dg-compare--dark
  //   修饰类（chrome 显式 dark 颜色）。
  const [isDark, setIsDark] = useState(false)

  // 把 minPaneWidth 作为 CSS 变量 --pane-min 写到容器，驱动纯 CSS flex-wrap 自适应。
  // React inline style 设 CSS 自定义属性需 cast（CSSProperties 不含任意自定义属性）。
  const containerStyle = {
    '--pane-min': `${minPaneWidth}px`,
  } as CSSProperties

  // 容器 className：基础 .dg-compare + 条件修饰类。
  //   - .dg-compare--sticky（stickyMode=true）：放开 sticky 上下文（pane/body overflow:visible）。
  //   - .dg-compare--dark（isDark=true）：chrome 显式 dark 颜色覆盖（pane/title/note/控制条）。
  //   两个修饰类正交独立，可同时存在（sticky + dark demo 也能 dark）。
  const containerClassName = [
    'dg-compare',
    stickyMode ? 'dg-compare--sticky' : '',
    isDark ? 'dg-compare--dark' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <ConfigProvider theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
      {/*
        主题控制条（任务 M）：放在 ConfigProvider 内，使 Switch 本身在 dark 下也变 dark
        （视觉一致）。一个 Switch 驱动 isDark → 同时切两侧表格主题 + chrome 修饰类。
        控制条是 .dg-compare 容器的兄弟节点（不在 .dg-compare--dark 后代作用域内），
        故 dark 时单独加 .dg-compare__theme-bar--dark 修饰类。
      */}
      <div className={isDark ? 'dg-compare__theme-bar dg-compare__theme-bar--dark' : 'dg-compare__theme-bar'}>
        <span className="dg-compare__theme-label">主题</span>
        <Switch
          checked={isDark}
          onChange={setIsDark}
          checkedChildren="Dark"
          unCheckedChildren="Light"
        />
        <span className="dg-compare__theme-hint">
          切换两侧（data-grid + antd）共享主题，验证 dark mode 对齐
        </span>
      </div>

      <div className={containerClassName} style={containerStyle}>
        <section className="dg-compare__pane">
          <div className="dg-compare__title">{leftTitle}</div>
          <div className="dg-compare__body">{left}</div>
        </section>
        <section className="dg-compare__pane">
          <div className="dg-compare__title">{rightTitle}</div>
          <div className="dg-compare__body">{right}</div>
        </section>
      </div>
      {/*
        note 同为 .dg-compare 容器的兄弟节点，dark 时单独加 .dg-compare__note--dark 修饰类
        （compare.css 该类覆盖背景/边框/文字为 antd dark 默认值）。
      */}
      {children ? (
        <div className={isDark ? 'dg-compare__note dg-compare__note--dark' : 'dg-compare__note'}>
          {children}
        </div>
      ) : null}
    </ConfigProvider>
  )
}

export default SplitDemo
