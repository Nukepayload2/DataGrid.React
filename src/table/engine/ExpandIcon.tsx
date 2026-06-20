/**
 * 行展开图标（M9 默认实现，决策 6 统一化）。
 *
 * **决策 6 统一化**：复刻 antd 6.4.4 `.ant-table-row-expand-icon` 的**实际 CSS 画法**
 * （实测 `#/demos/expand` 右栏 antd 栏 computed style，非 icon 组件——antd 也是用 CSS 画）：
 *   - 容器：17×17px，border 0.8px solid #f0f0f0，border-radius 6px，transform: scale(0.9412)
 *     （17→视觉 16px 微缩，对齐 antd `expandIconScale = controlInteractiveSize / expandIconSize`）。
 *   - `::before`（横线）：position absolute，top 7px，inset-inline 3px，height 1px，
 *     background currentColor。
 *   - `::after`（竖线）：position absolute，top/bottom 3px，inset-inline-start 7px，width 1px，
 *     background currentColor，默认 rotate(90deg)。
 *   - 三态（对齐 antd 6.4.4 `&-collapsed` / `&-expanded` / `&-spaced`）：
 *     * collapsed：`::before { transform: rotate(-180deg) }`，`::after { transform: rotate(0) }`
 *       → 横线翻转 + 竖线归位 → 视觉 "+"
 *       （注：antd collapsed 默认就是 `+`；展开态才把竖线旋走变 "−"）。
 *     * expanded：`::before { transform: none }`，`::after { transform: rotate(90deg) }`
 *       → 竖线旋成与横线重叠 → 视觉 "−"。
 *     * spaced（disabled/不可展开）：`::before/::after { display:none; content:none }`，
 *       background transparent，border 0，visibility:hidden → 空 cell。
 *   - hover/active：border-color: currentcolor（与 antd `&:focus,&:hover,&:active` 一致）。
 *
 * 用户可通过 `expandable.expandIcon` 自定义替换。
 *
 * 与展开 track 的 0fr↔1fr 过渡同步：图标 +/- 切换的 transform 过渡 + track 展开同时发生，视觉一致。
 */

import type { CSSProperties, MouseEvent } from 'react'

export interface ExpandIconProps {
  /** 当前是否展开（决定 +/− 形态）。 */
  expanded: boolean
  /** 是否禁用（rowExpandable=false 行：图标变 spaced 态——空、不可见、不响应点击）。 */
  disabled?: boolean
  /** 点击展开/收起回调。 */
  onExpand: (e: MouseEvent<HTMLButtonElement>) => void
  /** 自定义 aria-label（缺省 'Expand row' / 'Collapse row'）。 */
  'aria-label'?: string
  style?: CSSProperties
}

export function ExpandIcon(props: ExpandIconProps) {
  const { expanded, disabled = false, onExpand, style } = props
  const ariaLabel = props['aria-label'] ?? (expanded ? 'Collapse row' : 'Expand row')
  return (
    <button
      type="button"
      className={[
        'dg-expand-icon',
        // disabled（不可展开行）→ spaced 态（空、不可见）；否则按 expanded 选 collapsed/expanded。
        disabled
          ? 'dg-expand-icon-spaced'
          : expanded
            ? 'dg-expand-icon-expanded'
            : 'dg-expand-icon-collapsed',
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-expanded={expanded}
      onClick={onExpand}
      style={style}
    >
      {/* 内部标记由 CSS ::before/::after 画（与 antd 同款），无子 DOM。 */}
    </button>
  )
}
