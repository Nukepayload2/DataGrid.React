/**
 * 决策 9：demo 左右对比框架外壳组件（SplitDemo）。
 *
 * 用途：把 data-grid Table 与 antd Table 并排（50/50）呈现，方便对照修 bug
 * （视觉/行为差异一目了然）。每个 demo 的"数据/列/交互配置"由调用方各自准备，
 * SplitDemo 只负责左右并排布局 + 标题栏 + 独立滚动 + 窄容器堆叠。
 *
 * === 全局深色/浅色切换（任务 T16：改由 App 顶栏全局驱动）===
 *
 * **重构前**（任务 M）：本组件自管一个 antd `<Switch>` + 内层 `<ConfigProvider theme={{ algorithm }}>`。
 * **重构后**（任务 T16）：dark/light 切换移到 App 顶栏全局 Segmented（ThemeProvider 单一真理源），
 * 本组件删除本地 isDark state + Switch + 内层 ConfigProvider。所有用 SplitDemo 的对比 demo
 * 改由顶栏统一切 dark（单一真理源，避免每个 demo 各自维护切换）。
 *
 *   - **algorithm 切换**：ThemeProvider 顶层 ConfigProvider（src/main.tsx 包 ThemeProvider）完成，
 *     两侧表格（data-grid + antd）都在此作用域内，algorithm 变 → realToken 重算 → 自动 dark。
 *     - 右栏 antd Table：ConfigProvider 天然驱动。
 *     - 左栏 data-grid Table：Table.tsx useToken realToken 重算 → .dg-wrapper --ant-* 刷新。
 *   - **外壳 chrome（pane/title/note）**：compare.css 原硬编码浅色（#fff/#fafafa/#f0f0f0），
 *     dark 下会变成"深色表格坐在刺眼白底卡片里"。本组件仍从 useTheme 读 themeMode → 拼
 *     `.dg-compare--dark` 修饰类（覆盖 pane→#141414、title/note→#1d1d1d、border→#303030、
 *     文字→rgba(255,255,255,0.85/0.65)）。显式颜色最稳（chrome 在 ConfigProvider 外层 div
 *     上无 --ant-* 可消费）。
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

import { type CSSProperties, type ReactNode } from 'react'
import './compare.css'
// ★ 任务 T16：dark/light 切换改由 App 顶栏全局驱动（ThemeProvider 单一真理源）。
//   删除本地 isDark state + Switch + 内层 ConfigProvider theme={{algorithm}}。
//   useTheme 读全局 themeMode → 拼 .dg-compare--dark 修饰类（chrome 显式 dark 颜色）。
import { useTheme } from '../../theme/ThemeContext'

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
  // ★ 任务 T16：dark/light 改由 App 顶栏全局驱动（ThemeProvider 单一真理源）。
  //   本组件不再持有 isDark state、不再渲染 Switch、不再包内层 ConfigProvider。
  //   只从 useTheme 读 themeMode → 拼 .dg-compare--dark 修饰类（chrome 显式 dark 颜色）。
  //   algorithm 切换由 ThemeProvider 顶层 ConfigProvider 完成（两侧表格自动响应）。
  const { themeMode } = useTheme()
  const isDark = themeMode === 'dark'

  // 把 minPaneWidth 作为 CSS 变量 --pane-min 写到容器，驱动纯 CSS flex-wrap 自适应。
  // React inline style 设 CSS 自定义属性需 cast（CSSProperties 不含任意自定义属性）。
  const containerStyle = {
    '--pane-min': `${minPaneWidth}px`,
  } as CSSProperties

  // 容器 className：基础 .dg-compare + 条件修饰类。
  //   - .dg-compare--sticky（stickyMode=true）：放开 sticky 上下文（pane/body overflow:visible）。
  //   - .dg-compare--dark（isDark=true）：chrome 显式 dark 颜色覆盖（pane/title/note）。
  //   两个修饰类正交独立，可同时存在（sticky + dark demo 也能 dark）。
  const containerClassName = [
    'dg-compare',
    stickyMode ? 'dg-compare--sticky' : '',
    isDark ? 'dg-compare--dark' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      {/*
        ★ 任务 T16：本地主题控制条已删除——dark/light 切换移到 App 顶栏全局 Segmented。
          chrome（pane/title/note）显式 dark 颜色仍由 .dg-compare--dark /
          .dg-compare__note--dark 修饰类提供（由全局 themeMode 驱动）。
      */}
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
    </>
  )
}

export default SplitDemo
