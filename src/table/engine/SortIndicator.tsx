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
 * ⚠️ **箭头跟随 `sortDirections`**（BAT-23 23-A）：参照 antd 6.4.4
 * `es/table/hooks/useSorter.js:89` 与 `:94` 是**节点级条件渲染**——
 * `upNode = sortDirections.includes(ASCEND) && <CaretUpOutlined/>`、
 * `downNode = sortDirections.includes(DESCEND) && <CaretDownOutlined/>`，
 * 且 `:98-107` 只在**两枚都在**时给外层加 `${prefixCls}-column-sorter-full`。
 * 故传入 `sortDirections` 时本组件照该分支渲染（单方向配置 ⇒ 只画一枚 caret、不带 `-full`）。
 * 双侧计数读数见 `tmp/vortex-logs/fix-real-bugs/58-implementer-bat23-23a-23b.md` §4。
 *
 * **`sortDirections` 缺省时的兼容口径**（不是遗漏，是有意的零 delta 门）：
 * 保持本仓历史渲染＝两枚 caret 都画、不加 `-full`。这样在两条表头路径
 * （`HeaderCell.tsx` 多级 / `FlatColumnCells.tsx` 单层）还没把生效方向传下来之前，
 * 存量 DOM/快照逐字节不变。两调用点各自补一个 prop 后即全量生效（本棒禁写那两文件，已交回 main）。
 * 注意 `style/table.css:810` 的 `.dg-column-sorter-up + .dg-column-sorter-down`
 * 相邻兄弟规则本来就要求"两枚都在"，单方向下只画一枚才是与样式自洽的形态。
 *
 * 多列优先级序号：`priority`（1-based，可选）非空时，在 caret 右侧显示一个数字徽标（如 1/2/3…），
 * 表示该列在多列排序中的优先级。编号语义：1 = 最高优先级 = `sorter.multiple` 最大（对齐 antd
 * `getSortData` 的 `b.multiplePriority - a.multiplePriority` 比较顺序——multiple 大者先比较 = 主排序键）。
 *
 * 这是 data-grid 增强，非 antd 对齐项：antd 官方 multiple-sorter demo 与 sorter.ts 样式均无此徽标。
 * 仅当该列激活（sortOrder 非 null）且多列模式下由适配层传入 priority；其它情况不渲染数字。
 *
 * 详见 [docs/features/interaction/filter-sorter.md](../../../docs/features/interaction/filter-sorter.md)。
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
  /**
   * 该列**生效**的排序方向集合（对齐参照取值式 `column.sortDirections || defaultSortDirections`，
   * antd 6.4.4 `useSorter.js:75`；本仓回退链见 `engine/useSorter.ts:255`）。
   *
   * 传了才启用「按方向裁剪箭头 + 双方向才加 `-full`」的参照分支；
   * 不传则维持历史渲染（两枚都在、无 `-full`），见文件头的兼容口径。
   */
  sortDirections?: Array<'ascend' | 'descend'>
}

/**
 * 渲染排序三态指示器（CaretUpOutlined + CaretDownOutlined 垂直堆叠）。
 * 多列模式下可附加优先级数字徽标。
 */
export function SortIndicator({ sortOrder, priority, sortDirections }: SortIndicatorProps) {
  const ascendActive = sortOrder === 'ascend'
  const descendActive = sortOrder === 'descend'
  // 参照分支：给了方向集合就按 `includes` 决定这枚 caret **存不存在**；没给则两枚都画（历史口径）。
  const showUp = sortDirections ? sortDirections.includes('ascend') : true
  const showDown = sortDirections ? sortDirections.includes('descend') : true
  // 参照 `:98` 的 `!!(upNode && downNode)`：两枚都在才 `-full`。
  const full = showUp && showDown && sortDirections !== undefined
  // 仅当激活（非 null）且 priority 为有效正整数时显示序号。
  const showPriority =
    sortOrder !== null && typeof priority === 'number' && priority > 0
  return (
    <span
      className={`dg-column-sorter ant-table-column-sorter${full ? ' dg-column-sorter-full ant-table-column-sorter-full' : ''}`}
      // 阻止点击冒泡到表头格本身（避免与 header click 双触发）—— 实际引擎把点击绑在表头格，
      // 这里 sort indicator 不再独立绑 click（点击图标 = 点击表头格），无需 stopPropagation。
      // 但仍阻止 mousedown 选中文字（保持点击体验干净）。
      onMouseDown={(e) => e.preventDefault()}
      aria-hidden="true"
    >
      <span className="dg-column-sorter-inner ant-table-column-sorter-inner">
        {showUp ? (
          <CaretUpOutlined
            className={`dg-column-sorter-up ant-table-column-sorter-up${ascendActive ? ' dg-column-sorter-active active' : ''}`}
            // active caret 通过 CSS color 控制（对齐 antd `.active { color: colorPrimary }`）。
          />
        ) : null}
        {showDown ? (
          <CaretDownOutlined
            className={`dg-column-sorter-down ant-table-column-sorter-down${descendActive ? ' dg-column-sorter-active active' : ''}`}
          />
        ) : null}
      </span>
      {showPriority ? (
        <span className="dg-column-sorter-priority">{priority}</span>
      ) : null}
    </span>
  )
}
