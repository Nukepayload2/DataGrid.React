/**
 * 行展开图标（默认实现）。
 *
 * 复刻 antd 6.4.4 `.ant-table-row-expand-icon` 的 CSS 画法（容器 + `::before`/`::after` 画 +/-，
 * 三态 collapsed/expanded/spaced），由 CSS 驱动；本组件只切类名 + 透传 disabled/expanded。
 * 详见 [docs/features/interaction/expand.md](../../../docs/features/interaction/expand.md)。
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
      // 图标点击**不冒泡到行**——无条件阻断，与参照同形（BAT-26）：
      //   参照 `node_modules/antd/es/table/ExpandIcon.js:17-20` 的默认图标 onClick 是
      //   `e => { onExpand(record, e); e.stopPropagation() }`，**不看** `expandRowByClick`；
      //   `expandRowByClick` 那层条件在参照里挂在**另一个位置**——`@rc-component/table/es/hooks/useColumns/index.js:144-147`
      //   只给展开列的图标产物外面再包一层条件 span（树形 nest 走 `Body/BodyRow.js:34-45`，连那层 span 都没有）。
      //   所以「图标层无条件 + 展开列层按 expandRowByClick 条件」两道才是参照的完整形状；
      //   实测反证见步骤 40 探针 A1/A3/A5/A6/T1/T2（`expandRowByClick:false` 时参照侧用户 `onRow.onClick` 也是 0 次）。
      //   注：参照的阻断是**整条冒泡链**——连 `document` 上的监听都收不到，不只是行上的 React onClick。
      onClick={(e) => {
        onExpand(e)
        e.stopPropagation()
      }}
      style={style}
    >
      {/* 内部标记由 CSS ::before/::after 画（与 antd 同款），无子 DOM。 */}
    </button>
  )
}
