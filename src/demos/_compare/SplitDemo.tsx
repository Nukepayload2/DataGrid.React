import { type CSSProperties, type ReactNode } from 'react'
import { theme as antdTheme } from 'antd'
import './compare.css'
import { useVirtualization } from '../VirtualizationContext'

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
   * 对照说明区，渲染在两栏表格下方。
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
   *   （如 sticky.tsx 的 `sticky.offsetHeader:64`）需要传 true。
   *
   * 表格自身 `scroll.x` 横向滚动是 Table 内部容器，不受 pane overflow 影响（两种模式都正常）。
   * 实现机制：true 时给 `.dg-compare` 容器加修饰类 `.dg-compare--sticky`，compare.css 内该类
   * 设 pane/body overflow:visible（不修改默认规则，只新增修饰类）。
   */
  stickyMode?: boolean
  /**
   * 是否受全局虚拟化开关影响（默认 true）。
   *
   * - **true（默认）**：该 demo 受顶栏「Virtual」Switch 控制——开关 ON 时容器加
   *   `.dg-compare--virtual` 修饰类（compare.css 限高 pane body，让左 data-grid
   *   `.dg-data-area` height:100% flex 链 resolve 到固定高度，虚拟窗口才有可滚动区域；
   *   右 antd 由各 demo 传 `scroll.y` 数字自管表体高）。开关 OFF 时不限高、非虚拟。
   * - **false**：不受全局开关影响。两类 demo 用 false：
   *     1. **强制虚拟 demo**（如 virtual-list / drag-virtual-list）：自身永久 virtual=true、
   *        自管高度，不消费本开关。
   *     2. **冲突 demo**（如页面级 sticky sticky.tsx）：虚拟化与 sticky 滚动祖先冲突，排除。
   *
   * 与 `.dg-compare--sticky` / `.dg-compare--dark` 正交独立，可同时存在。
   */
  virtualizable?: boolean
  /** 面板最小高度（px），默认 460；设为 0 可让对照区按内容收缩。 */
  minPaneHeight?: number
}

export function SplitDemo({
  left,
  right,
  leftTitle = 'data-grid',
  rightTitle = 'antd 6.4.4',
  minPaneWidth = 480,
  children,
  stickyMode = false,
  virtualizable = true,
  minPaneHeight = 460,
}: SplitDemoProps) {
  const { token } = antdTheme.useToken()
  const { virtual } = useVirtualization()

  // CSS 变量不跨兄弟继承：说明块需各挂一份 --compare-*。
  const compareVars = {
    '--pane-min': `${minPaneWidth}px`,
    '--compare-bg': token.colorBgContainer,
    '--compare-fill': token.colorFillAlter,
    '--compare-border': token.colorBorderSecondary,
    '--compare-text-secondary': token.colorTextSecondary,
    '--compare-primary': token.colorPrimary,
    '--compare-primary-text': token.colorTextLightSolid,
    '--compare-pane-min-height': `${minPaneHeight}px`,
  } as CSSProperties

  const containerClassName = [
    'dg-compare',
    stickyMode ? 'dg-compare--sticky' : '',
    virtualizable !== false && virtual ? 'dg-compare--virtual' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <div className={containerClassName} style={compareVars}>
        <section className="dg-compare__pane">
          <div className="dg-compare__title">{leftTitle}</div>
          <div className="dg-compare__body">{left}</div>
        </section>
        <section className="dg-compare__pane">
          <div className="dg-compare__title">{rightTitle}</div>
          <div className="dg-compare__body">{right}</div>
        </section>
      </div>
      {children ? (
        <div className="dg-compare__note" style={compareVars}>
          {children}
        </div>
      ) : null}
    </>
  )
}

export default SplitDemo
