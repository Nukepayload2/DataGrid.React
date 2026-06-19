/**
 * 表头排序指示器（S1 + S2，自研——lun 无此能力）。
 *
 * 三态视觉对齐 antd 6.4.4（`components/table/style/sorter.ts`）：
 *   - 升序（sortOrder='ascend'）：caret-up 高亮（主色），caret-down 灰。
 *   - 降序（sortOrder='descend'）：caret-down 高亮（主色），caret-up 灰。
 *   - 无（sortOrder=null）：两 caret 均灰。
 *
 * 实现用纯 CSS 画 caret（无外部图标依赖）：
 *   - caret-up / caret-down 用 border 三角形（width:0; height:0; border:solid transparent）。
 *   - 两 caret 垂直堆叠（flex column），up 在上、down 在下（与 antd `column-sorter-inner` 一致）。
 *   - 高亮（active）= 主色；灰 = `--dg-header-icon-color`（对齐 antd headerIconColor）。
 *
 * hover 表头格时整体变 `--dg-header-icon-hover-color`（对齐 antd `column-sorters:hover`）。
 * 颜色变量在 table.css 中定义。
 *
 * === S2 多列优先级序号 ===
 *
 * `priority`（1-based，可选）非空时，在 caret 右侧显示一个数字徽标（如 1/2/3…），表示该列在
 * 多列排序中的优先级（1 = 最高优先级 = `sorter.multiple` 最小）。对齐 antd multiple-sorter demo：
 * 激活的排序列表头 caret 旁显示优先级数字。仅当该列处于激活态（sortOrder 非 null）且多列模式下
 * 由适配层传入 priority；其它情况不渲染数字（视觉与 S1 一致，零回归）。
 */

import type { SortOrder } from '../types'

export interface SortIndicatorProps {
  /** 当前排序方向。 */
  sortOrder: SortOrder
  /**
   * 多列排序优先级序号（S2，1-based，可选）。
   * 仅当该列激活（sortOrder 非 null）且适配层判定需显示序号时传入；undefined/0 时不渲染。
   */
  priority?: number
}

/**
 * 渲染排序三态指示器（caret-up + caret-down 垂直堆叠）。
 * 多列模式下可附加优先级数字徽标（S2）。
 */
export function SortIndicator({ sortOrder, priority }: SortIndicatorProps) {
  const ascendActive = sortOrder === 'ascend'
  const descendActive = sortOrder === 'descend'
  // 仅当激活（非 null）且 priority 为有效正整数时显示序号。
  const showPriority =
    sortOrder !== null && typeof priority === 'number' && priority > 0
  return (
    <span
      className="dg-column-sorter"
      // 阻止点击冒泡到表头格本身（避免与 header click 双触发）—— 实际引擎把点击绑在表头格，
      // 这里 sort indicator 不再独立绑 click（点击图标 = 点击表头格），无需 stopPropagation。
      // 但仍阻止 mousedown 选中文字（保持点击体验干净）。
      onMouseDown={(e) => e.preventDefault()}
      aria-hidden="true"
    >
      <span className="dg-column-sorter-inner">
        <span className={`dg-column-sorter-up${ascendActive ? ' dg-column-sorter-active' : ''}`} />
        <span className={`dg-column-sorter-down${descendActive ? ' dg-column-sorter-active' : ''}`} />
      </span>
      {showPriority ? (
        <span className="dg-column-sorter-priority">{priority}</span>
      ) : null}
    </span>
  )
}
