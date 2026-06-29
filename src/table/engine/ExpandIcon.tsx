/**
 * 行展开图标（默认实现）。
 *
 * 复刻 antd 6.4.4 `.ant-table-row-expand-icon` 的 CSS 画法（容器 + `::before`/`::after` 画 +/-，
 * 三态 collapsed/expanded/spaced），由 CSS 驱动；本组件只切类名 + 透传 disabled/expanded。
 * 详见 [docs/design-notes/expand.md](../../../docs/design-notes/expand.md)。
 *
 * 用户可通过 `expandable.expandIcon` 自定义替换。
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
