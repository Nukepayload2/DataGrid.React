/**
 * 决策 9：demo 左右对比框架外壳组件（SplitDemo）。
 *
 * 用途：把 data-grid Table 与 antd Table 并排（50/50）呈现，方便对照修 bug
 * （视觉/行为差异一目了然）。每个 demo 的"数据/列/交互配置"由调用方各自准备，
 * SplitDemo 只负责左右并排布局 + 标题栏 + 独立滚动 + 窄容器堆叠。
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
 */

import type { CSSProperties, ReactNode } from 'react'
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
  /** 可选：全宽说明区，渲染在两栏下方（`.dg-compare` 容器之外，横竖排恒居底部）。 */
  children?: ReactNode
}

export function SplitDemo({
  left,
  right,
  leftTitle = 'data-grid',
  rightTitle = 'antd 6.4.4',
  minPaneWidth = 480,
  children,
}: SplitDemoProps) {
  // 把 minPaneWidth 作为 CSS 变量 --pane-min 写到容器，驱动纯 CSS flex-wrap 自适应。
  // React inline style 设 CSS 自定义属性需 cast（CSSProperties 不含任意自定义属性）。
  const containerStyle = {
    '--pane-min': `${minPaneWidth}px`,
  } as CSSProperties

  return (
    <>
      <div className="dg-compare" style={containerStyle}>
        <section className="dg-compare__pane">
          <div className="dg-compare__title">{leftTitle}</div>
          <div className="dg-compare__body">{left}</div>
        </section>
        <section className="dg-compare__pane">
          <div className="dg-compare__title">{rightTitle}</div>
          <div className="dg-compare__body">{right}</div>
        </section>
      </div>
      {children ? <div className="dg-compare__note">{children}</div> : null}
    </>
  )
}

export default SplitDemo
