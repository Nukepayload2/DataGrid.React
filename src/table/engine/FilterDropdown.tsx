/**
 * 筛选下拉面板（S3）——**用 antd 组件组装**（决策 6：非表格核心部位用 antd）。
 *
 * === 组件构成（全部 antd）===
 *
 * - `Dropdown`（antd）：负责弹出层定位、点击外部关闭、ESC 关闭、触发器绑定。
 *   - `trigger={['click']}`：点漏斗打开。
 *   - `open` 受控：本组件持有 open state，配合 filterOnClose 控制"关闭即应用 vs 仅确定按钮应用"。
 *   - `onOpenChange`：下拉打开/关闭时回调（用于 filterOnClose=true 时关闭即应用）。
 * - `Checkbox.Group`（antd，filterMultiple=true 默认）：多选；命中任一保留（OR）。
 * - `Radio.Group`（antd，filterMultiple=false）：单选。
 * - `Button`（antd）：底部"确定"/"重置"按钮。
 *
 * === filterOnClose 语义 ===
 *
 * - `true`（默认，对齐 antd v6）：关闭下拉（点外部/ESC/确定）即把**当前面板勾选**应用为 filteredValue。
 *   实现：onOpenChange(open=false) 时调 onApply(localSelected)；确定按钮同时 setOpen(false) + onApply。
 * - `false`：只有点"确定"才应用；点外部/ESC 关闭**丢弃**未确认勾选（恢复到上次应用的 filteredValue）。
 *   实现：onOpenChange(open=false) 时若非确定触发 → 重置 localSelected 回 props.filteredValue（丢弃）；
 *   确定按钮 → onApply(localSelected) + setOpen(false)。
 *
 * === localSelected 本地草稿 ===
 *
 * 下拉打开时，面板内的勾选是"本地草稿"（localSelected state），与外部 filteredValue 解耦。
 * 这样：
 *   - filterOnClose=true：关闭时草稿 → 应用为 filteredValue（一次性 commit）。
 *   - filterOnClose=false：关闭时草稿丢弃，确定时才 commit。
 * 与 antd v6 filterDropdown 的 confirm/clearFilters 语义对齐（S5 自定义面板会用完整 confirm API）。
 *
 * === 重置按钮 ===
 *
 * "重置"把 localSelected 清空（仅清草稿，不立即应用）；下次关闭/确定时应用为空（清除筛选）。
 * 对齐 antd resetFilters（v6 默认 reset 后需 confirm/close 才生效）。
 *
 * === 不实现（后续任务）===
 *
 * - filterDropdown 自定义面板（S5）。
 * - filterSearch 项搜索（S6）。
 * - filterMode='tree' 树形（S7）。
 * - 自定义 filterIcon（S5；本阶段用固定 FilterOutlined/FilterFilled）。
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, Dropdown, Radio } from 'antd'
import type { EngineFilterItem } from './types'

/**
 * 漏斗图标（自绘 SVG，对齐 antd FilterOutlined/FilterFilled 视觉）。
 *
 * 决策 6 注：表格特有交互元素（勾选框、展开/排序图标）暂保留自绘，可选后续统一化。
 * 筛选漏斗属表格特有图标，故自绘（避免引入 @ant-design/icons 作为直接依赖；
 * 该包当前仅作为 antd 间接依赖存在于 node_modules，未在 package.json 声明）。
 *
 * - `activated`：是否激活（有筛选值）。激活时用实心填充（对应 antd FilterFilled）；
 *   非激活时用线条（对应 antd FilterOutlined）。
 * - color 由父级 `.dg-filter-trigger` 的 color 控制（currentColor）。
 */
function FilterIcon({ activated }: { activated: boolean }) {
  // antd FilterOutlined/FilterFilled 的 SVG path（取自 @ant-design/icons-svg asn）。
  // 漏斗形状：上宽下窄，下方一圆柱。
  return (
    <svg
      viewBox="64 64 896 896"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      style={{ fontSize: 12, display: 'block' }}
    >
      {activated ? (
        // FilterFilled：实心漏斗（antd path）。
        <path d="M349 838c0 17.7 14.2 32 31.8 32h262.4c17.6 0 31.8-14.3 31.8-32V642H349v196zm531.1-684H143.9c-24.5 0-39.8 26.7-27.5 48l221.3 376h348.8l221.3-376c12.1-21.3-3.2-48-27.7-48z" />
      ) : (
        // FilterOutlined：线条漏斗（antd path）。
        <path d="M880.1 154H143.9c-24.5 0-39.8 26.7-27.5 48L349 606.4V838c0 17.7 14.2 32 31.8 32h262.4c17.6 0 31.8-14.3 31.8-32V606.4L907.7 202c12.2-21.3-3.1-48-27.6-48zM602 592v196h-180V592L262 250h500L602 592z" />
      )}
    </svg>
  )
}

export interface FilterDropdownProps {
  /** 该列筛选项列表（来自列树 EngineHeaderCell.filters）。 */
  filters: Array<EngineFilterItem>
  /** 是否多选（默认 true）。true → Checkbox.Group；false → Radio.Group。 */
  filterMultiple?: boolean
  /** 当前应用的筛选值（来自列树 EngineHeaderCell.filteredValue；空数组/null = 无激活）。 */
  filteredValue?: Array<string | number> | null
  /** 关闭下拉即应用（默认 true）。 */
  filterOnClose?: boolean
  /**
   * 应用筛选回调（Dropdown 关闭/确定时调用）。
   * @param nextFilteredValue 新筛选值数组；空数组表示清除该列筛选。
   */
  onApply: (nextFilteredValue: Array<string | number>) => void
  /** 触发器渲染（漏斗图标）。可由外部覆盖；默认根据 activated 渲染 FilterOutlined/FilterFilled。 */
  triggerRender?: (activated: boolean) => React.ReactNode
}

/**
 * 扁平化筛选项（含 children，S7 树形保留）为顶层项参与勾选列表。
 * 本阶段不渲染二级菜单 UI；children 出现时扁平化展示（与 useFilter.flattenFilterValues 配套）。
 */
function flattenFilterItems(items: Array<EngineFilterItem>): Array<EngineFilterItem> {
  const out: Array<EngineFilterItem> = []
  const walk = (list: Array<EngineFilterItem>) => {
    for (const it of list) {
      out.push({ text: it.text, value: it.value })
      if (it.children && it.children.length > 0) walk(it.children)
    }
  }
  walk(items)
  return out
}

export function FilterDropdown({
  filters,
  filterMultiple = true,
  filteredValue,
  filterOnClose = true,
  onApply,
  triggerRender,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  // 本地草稿（面板内勾选），与外部 filteredValue 解耦。
  // 每次打开下拉时同步为当前 filteredValue（草稿初始化）。
  const [localSelected, setLocalSelected] = useState<Array<string | number>>(
    () => (filteredValue ?? []).slice(),
  )

  // 每次打开下拉时，把草稿重置为当前 filteredValue（确保打开看到的是已应用值）。
  useEffect(() => {
    if (open) {
      setLocalSelected((filteredValue ?? []).slice())
    }
  }, [open, filteredValue])

  // 扁平化筛选项（渲染 Checkbox/Radio 项用）。
  const flatItems = useMemo(() => flattenFilterItems(filters), [filters])

  // 漏斗激活态：当前应用的 filteredValue 非空 → FilterFilled（高亮）；否则 FilterOutlined（灰）。
  const activated = !!filteredValue && filteredValue.length > 0

  // 应用草稿：调 onApply + 关闭下拉。
  //
  // ★ 关闭动作延迟到下一个宏任务（setTimeout 0）——不在原生 click 分发期间卸载弹出层。
  //   原因：antd v6 rc-dropdown 的弹出层 portaled 到 body，与表头格不在同一 DOM 子树，
  //   但 React 17+ 根委托（root delegation）+ 同步卸载弹出层会出现"事件分发途中目标节点被
  //   移除"的边界——残余的 click 派发可能落到弹出层背后坐标处的元素（如表头格），从而误触
  //   发表头 onClick（onSorterClick）——表现为"点 OK 还冒出一个 sortOrder"（Bug-B 现象 3）。
  //   延迟关闭让原生 click 分发完整结束后再卸载弹出层，彻底切断误派发路径。
  //   onApply 仍同步调用（保证 onChange 在用户交互当下立刻 fire，对齐 antd confirm 语义）。
  const applyAndClose = useCallback(() => {
    onApply(localSelected.slice())
    setTimeout(() => setOpen(false), 0)
  }, [localSelected, onApply])

  // 重置草稿：清空 localSelected（仅草稿，不立即应用）。
  const resetDraft = useCallback(() => {
    setLocalSelected([])
  }, [])

  // Dropdown onOpenChange：关闭时处理 filterOnClose 语义。
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      if (!nextOpen) {
        // 关闭下拉。
        if (filterOnClose) {
          // 关闭即应用：把草稿应用为 filteredValue（空草稿 = 清除筛选）。
          onApply(localSelected.slice())
        } else {
          // 仅确定才应用：关闭丢弃草稿，恢复到当前 filteredValue（下次打开重新初始化）。
          // useEffect[open] 会在下次打开时重置草稿，这里无需额外处理；但为避免"关闭时草稿残留
          // 被误用"，显式重置一次。
          setLocalSelected((filteredValue ?? []).slice())
        }
      }
    },
    [filterOnClose, localSelected, onApply, filteredValue],
  )

  // 下拉面板内容（Checkbox.Group / Radio.Group + 按钮）。
  // 不用 antd Menu 包装（Menu.Item 内嵌 Checkbox/Radio 视觉不佳），改用 popupRender 直接渲染自定义面板。
  // antd Dropdown v6：popupRender 返回 ReactNode 作为弹出层内容。
  const panel = (
    <div
      className="dg-filter-dropdown"
      data-multiple={filterMultiple ? '1' : '0'}
      // 阻止面板内点击（勾选 / OK / Reset）冒泡到 body——双重保险，避免任何 document 级
      // 监听器或坐标误派发触发表头格 onClick（Bug-B 现象 3 的根因之一）。
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="dg-filter-dropdown-menu">
        {filterMultiple ? (
          <Checkbox.Group
            value={localSelected}
            onChange={(values) => setLocalSelected(values as Array<string | number>)}
            className="dg-filter-checkbox-group"
          >
            <div className="dg-filter-menu-list">
              {flatItems.map((item) => (
                <div key={String(item.value)} className="dg-filter-menu-item">
                  <Checkbox value={item.value}>{item.text}</Checkbox>
                </div>
              ))}
            </div>
          </Checkbox.Group>
        ) : (
          <Radio.Group
            value={localSelected[0] ?? null}
            onChange={(e) => setLocalSelected(e.target.value == null ? [] : [e.target.value])}
            className="dg-filter-radio-group"
          >
            <div className="dg-filter-menu-list">
              {flatItems.map((item) => (
                <div key={String(item.value)} className="dg-filter-menu-item">
                  <Radio value={item.value}>{item.text}</Radio>
                </div>
              ))}
            </div>
          </Radio.Group>
        )}
      </div>
      <div className="dg-filter-dropdown-btns">
        <Button size="small" onClick={resetDraft}>
          Reset
        </Button>
        <Button type="primary" size="small" onClick={applyAndClose}>
          OK
        </Button>
      </div>
    </div>
  )

  // 触发器：默认漏斗图标（FilterOutlined 灰 / FilterFilled 高亮）；可由 triggerRender 覆盖。
  const trigger = (
    <span
      className={[
        'dg-filter-trigger',
        activated ? 'dg-filter-trigger-active' : undefined,
      ]
        .filter(Boolean)
        .join(' ')}
      // 阻止点击冒泡到表头格（避免触发排序等表头点击行为）。
      onClick={(e) => e.stopPropagation()}
    >
      {triggerRender ? triggerRender(activated) : <FilterIcon activated={activated} />}
    </span>
  )

  // Dropdown 弹出层：antd v6 Dropdown 用 `popupRender` 渲染自定义面板（非 menu 模式）。
  //   - popupRender：`(originNode) => ReactNode`；无 menu 时 originNode 为 null，直接返回 panel。
  //   - classNames.root：v6 推荐方式（替代 deprecated overlayClassName）。
  //   - open 受控 + onOpenChange 驱动 filterOnClose 语义。
  return (
    <Dropdown
      trigger={['click']}
      open={open}
      onOpenChange={handleOpenChange}
      popupRender={() => panel}
      classNames={{ root: 'dg-filter-dropdown-overlay' }}
      // getPopupContainer 默认 body；与 antd Table filterDropdown 默认一致。
      // 后续可通过 column.getPopupContainer 定制（S5+）。
    >
      {trigger}
    </Dropdown>
  )
}
