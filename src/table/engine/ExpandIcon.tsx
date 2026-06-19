/**
 * 行展开图标（M9 默认实现，自研——lun 无展开图标列）。
 *
 * 默认绘制 antd 6.4.4 同款展开图标：一个带边框的方块，内部一个"▶/▼"三角（旋转过渡）。
 * 用户可通过 `expandable.expandIcon` 自定义替换。
 *
 * 视觉对齐 antd：14×14 边框方块（与 selection-input 视觉系列一致），内部三角用 CSS border 画。
 * - 收起态：三角朝右（▶）。
 * - 展开态：三角朝下（▼）——通过 `transform: rotate(90deg)` 平滑过渡（0.3s）。
 *
 * 与展开 track 的 0fr↔1fr 过渡同步：图标旋转 + track 展开 同时发生，视觉一致。
 */

import type { CSSProperties, MouseEvent } from 'react'

export interface ExpandIconProps {
  /** 当前是否展开（决定三角朝向）。 */
  expanded: boolean
  /** 是否禁用（rowExpandable=false 行：图标灰、不响应点击）。 */
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
        expanded ? 'dg-expand-icon-expanded' : undefined,
        disabled ? 'dg-expand-icon-disabled' : undefined,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-expanded={expanded}
      onClick={onExpand}
      style={style}
    >
      <span className="dg-expand-icon-arrow" aria-hidden="true" />
    </button>
  )
}
