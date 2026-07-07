/**
 * 筛选下拉**内置面板**子组件——从 FilterDropdown.tsx 抽出（执行单元 #65）。
 *
 * 内置面板（filterMode='menu' 或 'tree'）的整段 JSX：搜索框 + Checkbox.Group/Radio.Group/Tree
 * + filters 空 / 搜索无匹配占位 + 底部 Reset/OK 按钮。所有状态/派生值/回调由父 FilterDropdown
 * 通过 props 传入；本组件为**纯展示组件**（不持有 state、不派生值），便于独立单测。
 *
 * 行为与原 builtinPanel 内联 JSX byte-for-byte 一致（含 onClick/onMouseDown stopPropagation
 * 防御冒泡、空占位 renderEmpty('Table.filter') 语义、tree 全选 Checkbox、menu 搜索无匹配分支）。
 *
 * 详见父组件 [FilterDropdown.tsx](./FilterDropdown.tsx) + [docs/design-notes/filter-sorter.md](../../../docs/design-notes/filter-sorter.md)。
 */

import type { ReactNode } from 'react'
import { Button, Checkbox, Input, Radio, Tree } from 'antd'
// 放大镜图标抽到 FilterSearchIcon（无状态 SVG 组件）。
import { FilterSearchIcon as SearchOutlined } from './FilterSearchIcon'
import type { EngineFilterItem } from './types'
import type { FilterValue } from '../types'
import type { FilterTreeNode } from './filterDropdownUtils'

/**
 * antd Tree onCheck 回调的归一化签名（FilterDropdown 把 keys/info 透传到本组件）。
 * 类型与 FilterDropdown 内 handleTreeCheck 一致（unknown + info 对象）。
 */
type TreeCheckHandler = (
  keys: unknown,
  info: { node?: { key?: React.Key }; checked?: boolean },
) => void

/** antd Tree filterTreeNode 的归一化签名（FilterDropdown 派生后透传）。 */
type FilterTreeNodePredicate = (node: {
  title?: ReactNode
  key?: React.Key
}) => boolean

export interface FilterBuiltinPanelProps {
  // === 列模式标志 ===
  /** 是否多选（true=Checkbox.Group/Tree 多选；false=Radio.Group/Tree 单选）。 */
  filterMultiple: boolean
  /** 是否树形面板（filterMode='tree'；非自定义面板时由 filterMode==='tree' 派生）。 */
  isTree: boolean
  /** filters 列表本身为空（无筛选项可勾选）→ 显示占位（对齐 antd `(column.filters||[]).length===0`）。 */
  filtersEmpty: boolean
  /** filters 空占位节点（antd ConfigContext renderEmpty('Table.filter') 回退到 antd Empty SIMPLE）。 */
  filterEmptyNode: ReactNode

  // === 搜索框 ===
  /** 是否渲染搜索框（filterSearch 非 falsy 且非自定义面板）。 */
  hasSearch: boolean
  /** 搜索框 placeholder（locale.filterSearchPlaceholder 回退到 antd enUS 默认）。 */
  localeFilterSearchPlaceholder: string
  /** 搜索框当前值（受控）。 */
  searchValue: string
  /** 搜索框 onChange 回调（接收新值）。 */
  onSearchChange: (value: string) => void

  // === Tree 模式 ===
  /** Tree treeData（filters 转 antd Tree 节点：key=value, title=text, children 递归）。 */
  treeData: Array<FilterTreeNode>
  /** Tree 全选 Checkbox 是否勾上（filterMultiple=true 且所有叶子值都在 localSelected 中）。 */
  allChecked: boolean
  /** Tree 全选 Checkbox 是否半选（filterMultiple=true 且部分叶子勾选）。 */
  allIndeterminate: boolean
  /** Tree 全选 Checkbox onChange 回调（e.target.checked → 全选/清空）。 */
  onCheckAll: (e: { target: { checked: boolean } }) => void
  /** Tree onCheck 回调（filterMultiple 单/多选归一化）。 */
  onTreeCheck: TreeCheckHandler
  /** Tree filterTreeNode 谓词（hasSearch + 有输入时过滤树节点）。undefined 不过滤。 */
  filterTreeNode: FilterTreeNodePredicate | undefined
  /** 全选 Checkbox 文案（locale.filterCheckAll 回退到 antd enUS 默认）。 */
  localeFilterCheckAll: ReactNode

  // === menu 模式 ===
  /** menu 模式可见筛选项（flatItems 经 filterSearch 过滤后）。 */
  visibleItems: Array<EngineFilterItem>

  // === 共享：勾选草稿 ===
  /** 当前草稿勾选值（受控；Checkbox.Group value / Radio.Group value=localSelected[0]）。 */
  localSelected: Array<FilterValue>
  /** 草稿勾选变更回调（Checkbox.Group onChange / Radio.Group onChange / Tree onCheck 归一化后）。 */
  onLocalSelectedChange: (next: Array<FilterValue>) => void

  // === 底部按钮 ===
  /** Reset 按钮文案（locale.filterReset 回退到 antd enUS 默认）。 */
  localeFilterReset: ReactNode
  /** OK 按钮文案（locale.filterConfirm 回退到 antd enUS 默认）。 */
  localeFilterConfirm: ReactNode
  /** Reset 按钮回调（清空草稿；不立即应用）。 */
  onReset: () => void
  /** OK 按钮回调（应用草稿 + 关闭下拉）。 */
  onApply: () => void
}

/**
 * 筛选下拉内置面板（menu / tree 两种模式 + 搜索 + 占位 + 底部按钮）。
 *
 * 纯展示组件——所有 state/派生值/回调均由父 FilterDropdown 透传。
 * 不持有 state；行为与原 builtinPanel 内联 JSX byte-for-byte 一致。
 */
export function FilterBuiltinPanel({
  filterMultiple,
  isTree,
  filtersEmpty,
  filterEmptyNode,
  hasSearch,
  localeFilterSearchPlaceholder,
  searchValue,
  onSearchChange,
  treeData,
  allChecked,
  allIndeterminate,
  onCheckAll,
  onTreeCheck,
  filterTreeNode,
  localeFilterCheckAll,
  visibleItems,
  localSelected,
  onLocalSelectedChange,
  localeFilterReset,
  localeFilterConfirm,
  onReset,
  onApply,
}: FilterBuiltinPanelProps) {
  return (
    <div
      className="dg-filter-dropdown"
      data-multiple={filterMultiple ? '1' : '0'}
      data-filter-mode={isTree ? 'tree' : 'menu'}
      // 阻止面板内点击（勾选 / OK / Reset）冒泡到 body——避免任何 document 级
      // 监听器或坐标误派发触发表头格 onClick。
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="dg-filter-dropdown-menu">
        {/* filters 为空（无筛选项可勾选）时显示占位（对齐 antd FilterDropdown.tsx:410）。
            替代搜索框+列表/树区；底部 Reset/OK 按钮仍保留（antd 同款）。 */}
        {filtersEmpty ? (
          <div className="dg-filter-dropdown-empty">{filterEmptyNode}</div>
        ) : (
          <>
            {/* 筛选项搜索框（仅当 filterSearch 非 falsy 时渲染）。位于列表/树顶部。
                onKeyDown stopPropagation 避免按键冒泡触发表头 onClick（与面板整体 onClick stopPropagation 一致）。
                menu 模式过滤 flatItems；tree 模式过滤树节点（filterTreeNode）。 */}
            {hasSearch ? (
              <div
                className="dg-filter-dropdown-search"
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Input
                  prefix={<SearchOutlined />}
                  // antd enUS locale filterSearchPlaceholder = 'Search in filters'（locale/en_US.ts:29）。
                  // 未传 Table locale 时回退到 antd enUS 默认值。
                  placeholder={localeFilterSearchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  // htmlSize=1 对齐 antd：绕开 input 默认 min-width（让 popup 宽度由外层约束）。
                  htmlSize={1}
                  className="dg-filter-dropdown-search-input"
                  // antd FilterSearch（FilterSearch.tsx:25-33）无 allowClear——filter 搜索框不带清除（×）按钮。
                  // 用户用关闭下拉或手动删除清空（antd 同款行为）。
                />
              </div>
            ) : null}
            {isTree ? (
              // === 树形面板（filterMode='tree'）===
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
                    {/* antd enUS locale filterCheckAll = 'Select all items'
                        （locale/en_US.ts:28；消费处 antd FilterDropdown.tsx:434 `{locale?.filterCheckall ?? locale?.filterCheckAll}`）。
                        未传 Table locale 时回退到 antd enUS 默认值。 */}
                    {localeFilterCheckAll}
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
                  onCheck={onTreeCheck as unknown as React.ComponentProps<typeof Tree>['onCheck']}
                  showIcon={false}
                  treeData={treeData}
                  autoExpandParent
                  defaultExpandAll
                  filterTreeNode={
                    filterTreeNode as unknown as React.ComponentProps<typeof Tree>['filterTreeNode']
                  }
                />
              </div>
            ) : visibleItems.length === 0 ? (
              // === menu 模式搜索过滤后无匹配项（对齐 antd FilterDropdown.tsx:477,488-490 isEmpty 分支）===
              // antd：`const isEmpty = items.every(item => item === null)` → 搜索无匹配时所有 item 为 null →
              // 显示 empty 占位（与 filters 列表本身为空时同一个 renderEmpty('Table.filter')）。
              // data-grid：visibleItems（经 filterSearch 过滤）为空等价 antd 的 isEmpty → 显示同一占位。
              <div className="dg-filter-dropdown-empty">{filterEmptyNode}</div>
            ) : filterMultiple ? (
              // === menu 多选（Checkbox.Group）===
              <Checkbox.Group
                value={localSelected}
                onChange={(values) => onLocalSelectedChange(values as Array<string | number>)}
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
              // === menu 单选（Radio.Group）===
              <Radio.Group
                value={localSelected[0] ?? null}
                onChange={(e) =>
                  onLocalSelectedChange(e.target.value == null ? [] : [e.target.value])
                }
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
        <Button size="small" onClick={onReset}>
          {localeFilterReset}
        </Button>
        <Button type="primary" size="small" onClick={onApply}>
          {localeFilterConfirm}
        </Button>
      </div>
    </div>
  )
}
