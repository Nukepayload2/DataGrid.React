/**
 * 表头排序指示器。
 *
 * 三态视觉对齐 antd 6.4.4：
 *   - 升序（sortOrder='ascend'）：CaretUpOutlined 高亮（主色），CaretDownOutlined 灰。
 *   - 降序（sortOrder='descend'）：CaretDownOutlined 高亮（主色），CaretUpOutlined 灰。
 *   - 无（sortOrder=null）：两 caret 均灰（headerIconColor）。
 *
 * caret 用 `@ant-design/icons` 的 `CaretUpOutlined`/`CaretDownOutlined`（与 antd Table 内部 sort icon 一致）。
 * 结构对齐 antd `.ant-table-column-sorter-inner`（两 caret 垂直堆叠，inline-flex column），
 * active caret 有 `margin-top: -3.6px` 上提（对齐 antd `&-up + &-down { marginTop: -0.3em }`）。
 *
 * 多列优先级序号：`priority`（1-based，可选）非空时，在 caret 右侧显示一个数字徽标（如 1/2/3…），
 * 表示该列在多列排序中的优先级。编号语义：1 = 最高优先级 = `sorter.multiple` 最大（对齐 antd
 * `getSortData` 的 `b.multiplePriority - a.multiplePriority` 比较顺序——multiple 大者先比较 = 主排序键）。
 *
 * 这是 data-grid 增强，非 antd 对齐项：antd 官方 multiple-sorter demo 与 sorter.ts 样式均无此徽标。
 * 仅当该列激活（sortOrder 非 null）且多列模式下由适配层传入 priority；其它情况不渲染数字。
 *
 * 详见 [docs/design-notes/filter-sorter.md](../../../docs/design-notes/filter-sorter.md)。
 */

import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons'
import type { SortOrder } from '../types'

export interface SortIndicatorProps {
  /** 当前排序方向。 */
  sortOrder: SortOrder
  /**
   * 多列排序优先级序号（1-based，可选）。
   * 仅当该列激活（sortOrder 非 null）且适配层判定需显示序号时传入；undefined/0 时不渲染。
   */
  priority?: number
}

/**
 * 渲染排序三态指示器（CaretUpOutlined + CaretDownOutlined 垂直堆叠）。
 * 多列模式下可附加优先级数字徽标。
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
        <CaretUpOutlined
          className={`dg-column-sorter-up${ascendActive ? ' dg-column-sorter-active' : ''}`}
          // active caret 通过 CSS color 控制（对齐 antd `.active { color: colorPrimary }`）。
        />
        <CaretDownOutlined
          className={`dg-column-sorter-down${descendActive ? ' dg-column-sorter-active' : ''}`}
        />
      </span>
      {showPriority ? (
        <span className="dg-column-sorter-priority">{priority}</span>
      ) : null}
    </span>
  )
}
