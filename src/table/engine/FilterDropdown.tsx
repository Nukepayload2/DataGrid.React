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
 * - filterDropdown 自定义面板（S5）：已实现（customDropdown 存在即取代内置面板）。
 * - 自定义 filterIcon（S5）：已实现（customIcon）。
 * - filterMode='tree'（S7）：已实现（见下 tree 面板分支）。
 *
 * === S7 树形面板（filterMode='tree'）===
 *
 * `filterMode='tree'`（默认 'menu'）时，内置下拉用 **antd `<Tree checkable>`** 渲染 filters（含 children）
 * 的树形结构。决策 6：非表格核心控件用 antd。
 *
 * - treeData 由 filters+children 转换：`{ key: value, title: text, children }`（getTreeData）。
 * - `checkedKeys={localSelected}`、`onCheck` → setLocalSelected；`selectable={false}`；`autoExpandParent` + `defaultExpandAll`。
 * - 父子联动：`checkStrictly={false}`（filterMultiple=true 默认时）→ 勾父自动勾全部子、勾全部子自动勾父
 *   （antd Tree 默认联动行为）。filterMultiple=false 时 `checkStrictly={true}`（仅勾选中节点）。
 * - filterSearch（tree 模式也渲染搜索框）：用 antd Tree `filterTreeNode` 过滤树节点
 *   （命中节点 + 保留祖先链维持结构，对齐 antd）；输入为空显全树。
 * - 顶部可选 "全选" Checkbox（filterMultiple=true 时）：checked = 全部叶子已勾；indeterminate = 部分勾。
 *   对齐 antd filter-in-tree 行为。
 * - 勾选值收集：localSelected 含所有勾选 value（叶子 + 直接勾选的父）。confirm/onApply 时原样传出，
 *   useFilter 对每个 value 调 onFilter（OR，S3 既有机制）。**不做"只取叶子"额外过滤**（对齐 antd
 *   ——antd onCheck 返回含半选逻辑的 checked keys，onFilter 对每个 checked key 判定）。
 * - 关闭清空（useEffect[open]）对 tree 同样生效（S6 既有）。
 */

import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, Dropdown, Empty, Input, Radio, Tree } from 'antd'
import type { DropdownProps } from 'antd'
// ★ 决策 6 统一化：filter 图标改用 `@ant-design/icons`（与 SortIndicator 的
// CaretUp/DownOutlined 一致；该包已是 package.json 直接依赖 ^6.2.5）。
// antd Table 默认 filterIcon = `<FilterFilled />`（见 antd
// components/table/hooks/useFilter/FilterDropdown.tsx:549），**默认/激活态都用同一个
// FilterFilled**——激活视觉差异纯由 `.dg-filter-trigger-active`（color: colorPrimary）驱动，
// **不切换图标**。旧实现自绘 FilterIcon（Outlined↔Filled 切换）与 antd 不符（默认态多画了线框）。
import { FilterFilled } from '@ant-design/icons'
// ConfigContext 从 antd 内部 es 路径导入（与 Table.tsx 一致；antd 主入口不导出 ConfigContext）。
// renderEmpty 签名：RenderEmptyHandler = (componentName: string) => ReactNode。
import { ConfigContext } from 'antd/es/config-provider/context'
import type { RenderEmptyHandler } from 'antd/es/config-provider/defaultRenderEmpty'
import type { EngineFilterItem } from './types'
import type {
  ColumnFilterDropdownProps,
  FilterDropdownProps as DgFilterDropdownProps,
} from '../types'

/**
 * 漏斗图标（默认渲染）。
 *
 * ★ §11 视觉统一化（对齐 antd 6.4.4）：直接渲染 `@ant-design/icons` 的 `FilterFilled`，
 * 与 antd Table 默认 filterIcon 完全一致（FilterDropdown.tsx:549）。
 *   - **默认态与激活态都用同一个 FilterFilled**——antd 不切换 Outlined/Filled。
 *   - 激活视觉差异由外层 `.dg-filter-trigger-active`（color: colorPrimary）驱动（filter.ts:71-73）。
 *   - color 由父级 `.dg-filter-trigger` 的 color 控制（currentColor，icon 设 fontSize 继承触发器）。
 *
 * 旧实现自绘 SVG 并在 activated 时切换 Filled/Outlined，默认态渲染了线框漏斗，与 antd
 * 右栏的实心漏斗不一致；已废弃。`activated` 参数保留仅用于自定义 `customIcon`/`triggerRender`
 * 回调签名兼容（antd filterIcon 也接收 `filtered: boolean`）。
 */

/**
 * 放大镜图标（自绘 SVG，对齐 antd SearchOutlined 视觉）。
 *
 * 用于 S6 筛选项搜索框前缀。自绘而非引入 @ant-design/icons 的 SearchOutlined：
 * 该图标仅在 filter 搜索框前缀这一处使用（非表格核心交互元素），且与 FilterFilled 不同，
 * antd FilterDropdown 内部也用 `<SearchOutlined />` 组件——但为保持本文件搜索前缀视觉与
 * antd filter 搜索框一致，自绘 path 取自 @ant-design/icons-svg asn（与 antd 渲染结果一致）。
 */
function SearchOutlined() {
  return (
    <svg
      viewBox="64 64 896 896"
      width="1em"
      height="1em"
      fill="currentColor"
      aria-hidden="true"
      style={{ fontSize: 12, display: 'block' }}
    >
      {/* antd SearchOutlined 的 SVG path（取自 @ant-design/icons-svg asn）。放大镜：圆 + 把手。 */}
      <path d="M909.6 854.5L649.9 594.8C690.2 542.7 712 479 712 412c0-80.2-31.3-155.4-87.9-212.1-56.6-56.7-132-87.9-212.1-87.9s-155.5 31.3-212.1 87.9C143.2 256.5 112 331.8 112 412c0 80.1 31.3 155.5 87.9 212.1C256.5 680.8 331.8 712 412 712c67 0 130.6-21.8 182.7-62l259.7 259.6a8.2 8.2 0 0011.6 0l43.6-43.5a8.2 8.2 0 000-11.6zM570.4 570.4C528 612.7 471.8 636 412 636s-116-23.3-158.4-65.6C211.3 528 188 471.8 188 412s23.3-116.1 65.6-158.4C296 211.3 352.2 188 412 188s116.1 23.2 158.4 65.6S636 352.2 636 412s-23.3 116.1-65.6 158.4z" />
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
  /**
   * S5 自定义筛选面板（透传 `column.filterDropdown`）。
   * 存在时**取代**内置 Checkbox/Radio 面板：引擎把它渲染进 antd Dropdown popupRender，
   * 并按 antd 兼容签名注入 props（selectedKeys/setSelectedKeys/confirm/clearFilters/visible/close）。
   */
  customDropdown?:
    | React.ReactNode
    | ((props: DgFilterDropdownProps) => React.ReactNode)
  /**
   * S5 自定义漏斗图标（透传 `column.filterIcon`）。
   * 覆盖默认 FilterOutlined/FilterFilled；triggerRender 仍可进一步覆盖（兼容 S3 内置 API）。
   */
  customIcon?: React.ReactNode | ((filtered: boolean) => React.ReactNode)
  /**
   * S5 透传给 antd Dropdown 的 props（`column.filterDropdownProps`）。
   * open 受控 / onOpenChange 订阅 / triggerClassName / overlayClassName 等。
   */
  dropdownProps?: ColumnFilterDropdownProps
  /**
   * S6 筛选项搜索（透传 `column.filterSearch`）。
   * - `true`：默认 contains 匹配（item.text 转字符串 trim+toLowerCase 后包含输入即命中）。
   * - `(input, record) => boolean`：自定义匹配；`input` 为已 normalize 输入，`record` 为筛选项。
   * - `false`/undefined：不渲染搜索框。
   *
   * menu 模式（默认）与 tree 模式（S7）均消费：menu 过滤 flatItems；tree 用 antd Tree `filterTreeNode`
   * 过滤树节点（保留祖先链）。自定义面板（`customDropdown` 存在）不消费此字段。
   */
  filterSearch?: true | ((input: string, record: EngineFilterItem) => boolean)
  /**
   * S7 筛选下拉展示模式（透传 `column.filterMode`，默认 'menu'）。
   * - `'tree'`：内置下拉用 antd `<Tree checkable>` 渲染 filters（含 children）的树形结构。
   * - `'menu'` / undefined：Checkbox.Group（多选）/ Radio.Group（单选）扁平列表（S3 既有）。
   *
   * 仅内置面板消费（customDropdown 存在时被取代，filterMode 无效）。
   */
  filterMode?: 'menu' | 'tree'
  /**
   * ★ 接口全兼容（决策 3 第二步）：Table 级 `getPopupContainer`（来自 TableProps.getPopupContainer）。
   *
   * 作为筛选下拉 antd Dropdown 的**默认** getPopupContainer：
   *   - 列级 `dropdownProps.getPopupContainer`（`column.filterDropdownProps.getPopupContainer`）优先。
   *   - 列级未指定时用本字段（Table 级默认）。
   *   - 两者都未指定时 antd Dropdown 走默认（document.body）。
   *
   * 未提供（undefined）时不影响现有行为（零回归）。
   */
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement
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

/**
 * S7：antd Tree 的 treeData 节点类型（对齐 antd `DataNode` 子集：key/title/children）。
 */
interface FilterTreeNode {
  key: React.Key
  title: React.ReactNode
  children?: Array<FilterTreeNode>
}

/**
 * S7：把 EngineFilterItem[]（含 children）转为 antd Tree 的 treeData（对齐 antd getTreeData）。
 *   - key = value（与 onFilter/onCompare 的 value 同源）。
 *   - title = text（任意 ReactNode）。
 *   - children 递归。
 */
function toTreeData(filters: Array<EngineFilterItem>): Array<FilterTreeNode> {
  return filters.map((filter) => {
    const item: FilterTreeNode = {
      title: filter.text,
      key: filter.value,
    }
    if (filter.children && filter.children.length > 0) {
      item.children = toTreeData(filter.children)
    }
    return item
  })
}

/**
 * S7：递归收集所有**叶子** value（对齐 antd flattenKeys）。
 * 用于"全选" Checkbox 的 checked/indeterminate 判定——只看叶子，因为父节点勾选是联动的（非独立）。
 */
function collectLeafValues(filters: Array<EngineFilterItem>): Array<string | number> {
  const out: Array<string | number> = []
  const walk = (list: Array<EngineFilterItem>) => {
    for (const it of list) {
      if (it.children && it.children.length > 0) {
        walk(it.children)
      } else {
        out.push(it.value)
      }
    }
  }
  walk(filters)
  return out
}

/**
 * S7：归一化 antd Tree onCheck 的 keys 参数为 string[]/number[] 数组。
 * antd Tree 在 `checkStrictly=false` 时 onCheck 第一参为 `{ checked: Key[], halfChecked: Key[] }`，
 * `checkStrictly=true` 时为 `Key[]`；统一处理。
 */
function resolveCheckedKeys(keys: unknown): Array<string | number> {
  if (Array.isArray(keys)) {
    return keys.map((k) => (typeof k === 'number' ? k : String(k)))
  }
  if (keys && typeof keys === 'object' && 'checked' in keys) {
    const checked = (keys as { checked?: Array<unknown> }).checked
    if (Array.isArray(checked)) {
      return checked.map((k) => (typeof k === 'number' ? k : String(k)))
    }
  }
  return []
}

export function FilterDropdown({
  filters,
  filterMultiple = true,
  filteredValue,
  filterOnClose = true,
  onApply,
  triggerRender,
  customDropdown,
  customIcon,
  dropdownProps,
  filterSearch,
  filterMode = 'menu',
  getPopupContainer,
}: FilterDropdownProps) {
  // S5：自定义面板模式（column.filterDropdown 存在且非 null）。
  const isCustom = customDropdown !== undefined && customDropdown !== null
  // S7：树形内置面板模式（仅非自定义面板时生效）。
  const isTree = !isCustom && filterMode === 'tree'
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

  // === S6 筛选项搜索 ===
  // 仅 menu 模式内置面板渲染搜索框（自定义面板 customDropdown 存在时不消费 filterSearch）。
  const hasSearch = !isCustom && (filterSearch === true || typeof filterSearch === 'function')
  const [searchValue, setSearchValue] = useState('')
  // 与 antd FilterSearch 一致：trim + toLowerCase 作为规范化输入。
  const normalizedSearchValue = useMemo(
    () => searchValue.trim().toLowerCase(),
    [searchValue],
  )
  // 关闭下拉时清空搜索值（对齐 antd `useEffect[visible]` 清空；下次打开为空）。
  useEffect(() => {
    if (!open) {
      setSearchValue('')
    }
  }, [open])

  // 过滤 flatItems 得到 visibleItems（仅当搜索框存在且有输入时过滤；否则显示全部）。
  const visibleItems = useMemo(() => {
    if (!hasSearch || !normalizedSearchValue) return flatItems
    if (typeof filterSearch === 'function') {
      // 自定义匹配：antd menu 模式传 normalizedSearchValue（trim+toLowerCase）。
      return flatItems.filter((item) => filterSearch(normalizedSearchValue, item))
    }
    // 默认匹配：item.text 转字符串 trim+toLowerCase 后包含 normalizedSearchValue（对齐 antd searchValueMatched）。
    return flatItems.filter((item) => {
      const text = item.text
      if (typeof text === 'string' || typeof text === 'number') {
        return text.toString().toLowerCase().includes(normalizedSearchValue)
      }
      return false
    })
  }, [hasSearch, normalizedSearchValue, flatItems, filterSearch])

  // === S7 树形筛选（filterMode='tree'）辅助 ===
  // 把 filters（含 children）转为 antd Tree 的 treeData：{ key: value, title: text, children }。
  // key 用 value（与 onFilter/onCompare 的 value 同源）；title 用 text。
  const treeData = useMemo(() => toTreeData(filters), [filters])
  // 收集所有叶子 value（用于"全选"Checkbox 的 checked/indeterminate 判定）。对齐 antd flattenKeys。
  const allLeafValues = useMemo(() => collectLeafValues(filters), [filters])
  // Tree onCheck（对齐 antd FilterDropdown.onCheck）：
  //   - filterMultiple=false（单选，checkStrictly=true）：只勾选中节点 → [node.key]。
  //   - filterMultiple=true（多选，checkStrictly=false）：返回所有勾选 key（含联动勾选的子/父）。
  // antd Tree onCheck 在 checkStrictly=false 时返回 { checked, halfChecked } 对象，
  // checkStrictly=true 时返回数组；这里统一处理两种形态取 checked 数组。
  const handleTreeCheck = useCallback(
    (keys: unknown, info: { node?: { key?: React.Key }; checked?: boolean }) => {
      const checkedArr = resolveCheckedKeys(keys)
      if (!filterMultiple) {
        // 单选：勾选该节点 → [node.key]；取消勾选 → []。
        // nodeKey 为 React.Key（含 bigint），归一化为 string|number（treeData 的 key 源自 value，本就是 string|number）。
        const nodeKey = info?.node?.key
        const checked = info?.checked
        const normalizedKey =
          nodeKey != null && nodeKey !== ''
            ? typeof nodeKey === 'number'
              ? nodeKey
              : String(nodeKey)
            : null
        setLocalSelected(checked && normalizedKey != null ? [normalizedKey] : [])
      } else {
        setLocalSelected(checkedArr)
      }
    },
    [filterMultiple],
  )
  // "全选" Checkbox（filterMultiple=true 时渲染）：勾上=全部叶子值；取消=空。
  const allChecked =
    filterMultiple &&
    allLeafValues.length > 0 &&
    allLeafValues.every((v) => localSelected.includes(v))
  const allIndeterminate =
    filterMultiple &&
    !allChecked &&
    allLeafValues.some((v) => localSelected.includes(v))
  const onCheckAll = useCallback(
    (e: { target: { checked: boolean } }) => {
      if (e.target.checked) {
        setLocalSelected(allLeafValues.slice())
      } else {
        setLocalSelected([])
      }
    },
    [allLeafValues],
  )
  // Tree filterTreeNode（hasSearch + 有输入时过滤树节点；对齐 antd Tree.filterTreeNode）：
  //   - 自定义函数：filterSearch(normalizedSearchValue, { text, value, children })。
  //   - 默认 contains：node.title（text）转字符串 toLowerCase 包含 normalizedSearchValue。
  const filterTreeNode = useMemo(() => {
    if (!hasSearch || !normalizedSearchValue) return undefined
    return (node: { title?: React.ReactNode; key?: React.Key }) => {
      // node 是 treeData 项（含 text→title, value→key）；转回 EngineFilterItem 形态给自定义函数。
      const record: EngineFilterItem = {
        text: node.title,
        value: node.key as string | number,
      }
      if (typeof filterSearch === 'function') {
        return filterSearch(normalizedSearchValue, record)
      }
      // 默认 contains（对齐 antd searchValueMatched）。
      const title = node.title
      if (typeof title === 'string' || typeof title === 'number') {
        return title.toString().toLowerCase().includes(normalizedSearchValue)
      }
      return false
    }
  }, [hasSearch, normalizedSearchValue, filterSearch])

  // === S23：filter 下拉内 filters 为空时的占位（对齐 antd FilterDropdown.tsx:395,410）===
  // antd 语义：当 `column.filters` 为空数组（`(column.filters||[]).length===0`）时，filter 下拉
  // 的菜单区渲染 `renderEmpty('Table.filter')` 占位（默认 antd Empty SIMPLE + locale.filterEmptyText）。
  //   ★ 注意：`'Table.filter'` 是 **filter 下拉内 filters 空时的占位**，**不是**表体筛选无结果。
  //   表体 empty（含筛选无结果）由 Table.tsx 的 mergedEmptyNode 统一处理（用 'Table'，不区分）。
  // data-grid 仅内置面板（menu/tree）消费此占位；自定义面板（customDropdown 存在）不消费。
  // 默认文案 "No filters"（antd en_US 默认 filterEmptyText；data-grid 暂未透传 Table locale 到此）。
  const { renderEmpty } = useContext(ConfigContext)
  const filterEmptyNode = useMemo<React.ReactNode>(() => {
    const custom = (renderEmpty as RenderEmptyHandler | undefined)?.('Table.filter')
    if (custom !== undefined && custom !== null && custom !== false) return custom
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No filters"
        styles={{ image: { height: 24 } }}
        style={{ margin: 0, padding: '16px 0' }}
      />
    )
  }, [renderEmpty])
  // 内置面板 filters 为空（无筛选项可勾选）→ 显示占位。对齐 antd `(column.filters||[]).length===0`。
  const filtersEmpty = !isCustom && filters.length === 0

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
      // S5：透传 onOpenChange 给调用方（column.filterDropdownProps.onOpenChange）。
      dropdownProps?.onOpenChange?.(nextOpen)
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
    [filterOnClose, localSelected, onApply, filteredValue, dropdownProps],
  )

  // === S5：自定义面板 antd 兼容 props ===
  // confirm/clearFilters/close 由引擎提供给 filterDropdown 回调。
  //   - confirm({ closeDropdown })：把当前草稿应用为 filteredValue。
  //     ★ closeDropdown 默认 true（对齐 antd doFilter 默认 { closeDropdown: true }）：
  //     confirm() 不带参数 → 应用并关闭；confirm({ closeDropdown: false }) → 应用但保持打开。
  //   - clearFilters({ closeDropdown, confirm })：清空草稿；confirm=true 时立即应用清空；closeDropdown=true 关闭。
  //   - close()：仅关闭下拉（不改变 filteredValue）。
  const confirmFn = useCallback(
    (param?: { closeDropdown?: boolean }) => {
      const shouldClose = param?.closeDropdown !== false
      onApply(localSelected.slice())
      if (shouldClose) {
        setTimeout(() => setOpen(false), 0)
      }
    },
    [localSelected, onApply],
  )
  const clearFiltersFn = useCallback(
    (param?: { closeDropdown?: boolean; confirm?: boolean }) => {
      // 清空草稿。
      setLocalSelected([])
      // confirm=true：立即应用清空（对齐 antd reset + confirm 语义）。
      if (param?.confirm) {
        onApply([])
      }
      if (param?.closeDropdown) {
        setTimeout(() => setOpen(false), 0)
      }
    },
    [onApply],
  )
  const closeFn = useCallback(() => {
    setTimeout(() => setOpen(false), 0)
  }, [])

  // 下拉面板内容（Checkbox.Group / Radio.Group / Tree + 按钮）。
  // 不用 antd Menu 包装（Menu.Item 内嵌 Checkbox/Radio 视觉不佳），改用 popupRender 直接渲染自定义面板。
  // antd Dropdown v6：popupRender 返回 ReactNode 作为弹出层内容。
  // S7：filterMode='tree' 时菜单区改用 antd `<Tree checkable>` 渲染树形结构（决策 6）。
  const builtinPanel = (
    <div
      className="dg-filter-dropdown"
      data-multiple={filterMultiple ? '1' : '0'}
      data-filter-mode={isTree ? 'tree' : 'menu'}
      // 阻止面板内点击（勾选 / OK / Reset）冒泡到 body——双重保险，避免任何 document 级
      // 监听器或坐标误派发触发表头格 onClick（Bug-B 现象 3 的根因之一）。
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="dg-filter-dropdown-menu">
        {/* S23：filters 为空（无筛选项可勾选）时显示占位（对齐 antd FilterDropdown.tsx:410）。
            替代搜索框+列表/树区；底部 Reset/OK 按钮仍保留（antd 同款）。 */}
        {filtersEmpty ? (
          <div className="dg-filter-dropdown-empty">{filterEmptyNode}</div>
        ) : (
          <>
        {/* S6/S7：筛选项搜索框（仅当 filterSearch 非 falsy 时渲染）。位于列表/树顶部。
            onKeyDown stopPropagation 避免按键冒泡触发表头 onClick（与面板整体 onClick stopPropagation 一致）。
            menu 模式过滤 flatItems；tree 模式过滤树节点（filterTreeNode）。 */}
        {hasSearch ? (
          <div className="dg-filter-dropdown-search" onKeyDown={(e) => e.stopPropagation()}>
            <Input
              prefix={<SearchOutlined />}
              // ★ §11 filter-search 对齐：antd enUS locale filterSearchPlaceholder = 'Search in filters'
              // （locale/en_US.ts:29）。原硬编码 'Search' 与 antd 不符，修正。
              // 注：data-grid 暂未透传 Table locale 到 FilterDropdown，故用 antd enUS 默认值硬编码。
              placeholder="Search in filters"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              // htmlSize=1 对齐 antd：绕开 input 默认 min-width（让 popup 宽度由外层约束）。
              htmlSize={1}
              className="dg-filter-dropdown-search-input"
              // ★ §11 filter-search 对齐：antd FilterSearch（FilterSearch.tsx:25-33）**无 allowClear**
              // —— filter 搜索框不带清除（×）按钮。原 data-grid 误加 allowClear（右栏 antd 无），
              // 去掉以对齐。用户用关闭下拉或手动删除清空（antd 同款行为）。
            />
          </div>
        ) : null}
        {isTree ? (
          // === S7 树形面板（filterMode='tree'）===
          // antd `<Tree checkable>`：父子联动（checkStrictly=!filterMultiple）。
          // 对齐 antd FilterDropdown.tsx filterMode==='tree' 分支。
          <div className="dg-filter-dropdown-tree">
            {/* 全选 Checkbox（仅 filterMultiple=true 多选时渲染；对齐 antd onCheckAll）。 */}
            {filterMultiple ? (
              <Checkbox
                checked={allChecked}
                indeterminate={allIndeterminate}
                className="dg-filter-dropdown-checkall"
                onChange={onCheckAll}
              >
                {/* ★ §11 filter-in-tree 对齐：antd enUS locale filterCheckAll = 'Select all items'
                    （locale/en_US.ts:28；消费处 antd FilterDropdown.tsx:434 `{locale?.filterCheckall ?? locale?.filterCheckAll}`）。
                    data-grid 暂未透传 Table locale 到 FilterDropdown，故用 antd enUS 默认值硬编码
                    （与上面 filterSearchPlaceholder='Search in filters' 同款处理）。原硬编码 'Select All' 与 antd 不符。 */}
                Select all items
              </Checkbox>
            ) : null}
            <Tree
              checkable
              selectable={false}
              blockNode
              // checkStrictly：多选=false（父子联动，对齐 antd checkStrictly={!filterMultiple}）；
              // 单选=true（仅勾选中节点）。注意 antd Tree 的 single 行为由 onCheck + filterMultiple 控制。
              checkStrictly={!filterMultiple}
              className="dg-filter-menu-tree"
              // localSelected 转 string key 数组给 antd Tree（checkedKeys 接受 Key[]）。
              checkedKeys={localSelected.map((v) => String(v))}
              selectedKeys={localSelected.map((v) => String(v))}
              onCheck={handleTreeCheck as unknown as React.ComponentProps<typeof Tree>['onCheck']}
              showIcon={false}
              treeData={treeData}
              autoExpandParent
              defaultExpandAll
              filterTreeNode={filterTreeNode as unknown as React.ComponentProps<typeof Tree>['filterTreeNode']}
            />
          </div>
        ) : visibleItems.length === 0 ? (
          // === menu 模式搜索过滤后无匹配项（对齐 antd FilterDropdown.tsx:477,488-490 isEmpty 分支）===
          // antd：`const isEmpty = items.every(item => item === null)` → 搜索无匹配时所有 item 为 null →
          // 显示 empty 占位（与 filters 列表本身为空时同一个 renderEmpty('Table.filter')）。
          // data-grid：visibleItems（经 filterSearch 过滤）为空等价 antd 的 isEmpty → 显示同一占位。
          // ★ §11 filter-search 修复：原实现渲染空 Checkbox/Radio.Group（空白），antd 显示 empty 占位。
          <div className="dg-filter-dropdown-empty">{filterEmptyNode}</div>
        ) : filterMultiple ? (
          // === menu 多选（Checkbox.Group，S3 既有）===
          <Checkbox.Group
            value={localSelected}
            onChange={(values) => setLocalSelected(values as Array<string | number>)}
            className="dg-filter-checkbox-group"
          >
            <div className="dg-filter-menu-list">
              {visibleItems.map((item) => (
                <div key={String(item.value)} className="dg-filter-menu-item">
                  <Checkbox value={item.value}>{item.text}</Checkbox>
                </div>
              ))}
            </div>
          </Checkbox.Group>
        ) : (
          // === menu 单选（Radio.Group，S3 既有）===
          <Radio.Group
            value={localSelected[0] ?? null}
            onChange={(e) => setLocalSelected(e.target.value == null ? [] : [e.target.value])}
            className="dg-filter-radio-group"
          >
            <div className="dg-filter-menu-list">
              {visibleItems.map((item) => (
                <div key={String(item.value)} className="dg-filter-menu-item">
                  <Radio value={item.value}>{item.text}</Radio>
                </div>
              ))}
            </div>
          </Radio.Group>
        )}
          </>
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

  // === S5 自定义面板 ===
  // 把 column.filterDropdown（函数或节点）渲染进弹出层。
  // 函数模式注入 antd 兼容 FilterDropdownProps（selectedKeys/setSelectedKeys/confirm/clearFilters/
  // visible/close/prefixCls/filters）。
  // 节点模式：直接渲染（不注入 props，与 antd 一致）。
  const customPanel = useMemo(() => {
    if (!isCustom) return null
    const antdCompatProps: DgFilterDropdownProps = {
      prefixCls: 'dg-filter',
      selectedKeys: localSelected,
      setSelectedKeys: (keys: Array<React.Key>) =>
        setLocalSelected(keys as Array<string | number>),
      confirm: confirmFn,
      clearFilters: clearFiltersFn,
      // 自定义面板不消费内置筛选项；保留为空数组兼容 antd demo 原样拷贝。
      filters: [],
      close: closeFn,
      visible: open,
    }
    if (typeof customDropdown === 'function') {
      return customDropdown(antdCompatProps)
    }
    return customDropdown as React.ReactNode
  }, [isCustom, customDropdown, localSelected, confirmFn, clearFiltersFn, closeFn, open])

  const panel = isCustom ? (
    <div
      className="dg-filter-dropdown dg-filter-dropdown-custom"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {customPanel}
    </div>
  ) : (
    builtinPanel
  )

  // 触发器图标优先级：triggerRender（S3 内置 API）> customIcon（S5 filterIcon）> 默认 FilterFilled。
  // 注：GridTable 不会同时传 triggerRender 与 customIcon；这里 triggerRender 优先仅为兼容。
  // ★ 默认图标对齐 antd：始终渲染 `<FilterFilled />`（antd FilterDropdown.tsx:549），
  //   不随 activated 切换 Outlined/Filled；激活高亮由外层 .dg-filter-trigger-active 的 color 驱动。
  const triggerIcon = triggerRender
    ? triggerRender(activated)
    : customIcon !== undefined && customIcon !== null
      ? typeof customIcon === 'function'
        ? customIcon(activated)
        : customIcon
      : <FilterFilled />

  // 触发器：默认漏斗图标（FilterOutlined 灰 / FilterFilled 高亮）；可由 triggerRender 覆盖。
  const trigger = (
    <span
      className={[
        'dg-filter-trigger',
        activated ? 'dg-filter-trigger-active' : undefined,
        dropdownProps?.triggerClassName,
      ]
        .filter(Boolean)
        .join(' ')}
      style={dropdownProps?.triggerStyle}
      // 阻止点击冒泡到表头格（避免触发排序等表头点击行为）。
      onClick={(e) => e.stopPropagation()}
    >
      {triggerIcon}
    </span>
  )

  // === S5 dropdownProps 合并 ===
  // - open 受控优先（filterDropdownProps.open 覆盖内部 state）。
  // - onOpenChange：handleOpenChange 内部已调用 dropdownProps.onOpenChange，这里只传 handleOpenChange。
  // - overlayClassName 合并到 classNames.root（v6 推荐方式）。
  // - getPopupContainer / align 透传。
  const controlledOpen = dropdownProps?.open
  const dropdownOverlayClass = [
    'dg-filter-dropdown-overlay',
    dropdownProps?.overlayClassName,
  ]
    .filter(Boolean)
    .join(' ')

  // antd Dropdown props 子集（只挑支持的；避免类型不兼容）。
  const dropdownRestProps: Partial<DropdownProps> = {}
  if (dropdownProps?.align) dropdownRestProps.align = dropdownProps.align as DropdownProps['align']
  // ★ 接口全兼容（决策 3 第二步）：getPopupContainer 优先级——列级 dropdownProps.getPopupContainer
  //   > Table 级 getPopupContainer（本组件 prop）> antd Dropdown 默认（document.body）。
  //   与 antd InternalTable.tsx:492 `getPopupContainer || getContextPopupContainer` 同款语义。
  const effectiveGetPopupContainer =
    dropdownProps?.getPopupContainer ?? getPopupContainer
  if (effectiveGetPopupContainer) {
    dropdownRestProps.getPopupContainer = effectiveGetPopupContainer
  }

  // Dropdown 弹出层：antd v6 Dropdown 用 `popupRender` 渲染自定义面板（非 menu 模式）。
  //   - popupRender：`(originNode) => ReactNode`；无 menu 时 originNode 为 null，直接返回 panel。
  //   - classNames.root：v6 推荐方式（替代 deprecated overlayClassName）。
  //   - open 受控 + onOpenChange 驱动 filterOnClose 语义。
  return (
    <Dropdown
      trigger={['click']}
      open={controlledOpen !== undefined ? controlledOpen : open}
      onOpenChange={handleOpenChange}
      popupRender={() => panel}
      classNames={{ root: dropdownOverlayClass }}
      {...dropdownRestProps}
    >
      {trigger}
    </Dropdown>
  )
}
