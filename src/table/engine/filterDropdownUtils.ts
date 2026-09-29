/**
 * 筛选下拉纯函数簇 — 详见 docs/features/interaction/filter-sorter.md。
 *
 * 从 FilterDropdown.tsx 抽出的模块级纯函数：
 *   - flattenFilterItems（扁平化筛选项含 children）
 *   - toReactKey（boolean→string 归一，兼容 antd Tree Key 类型）
 *   - toTreeData（EngineFilterItem[] → antd Tree treeData）
 *   - collectLeafValues（递归收集叶子 value，对齐 antd flattenKeys）
 *   - resolveCheckedKeys（antd Tree onCheck 两种形态归一：Key[] 或 {checked, halfChecked}）
 *
 * 全部为纯函数（不依赖 hook state/setter），可独立单测。FilterDropdown 仅做 import 替换。
 */

import type { EngineFilterItem } from './types'
import type { FilterValue } from '../types'

/**
 * 扁平化筛选项（含 children）为顶层项参与勾选列表。
 * 不渲染二级菜单 UI；children 出现时扁平化展示（与 useFilter.flattenFilterValues 配套）。
 */
export function flattenFilterItems(items: Array<EngineFilterItem>): Array<EngineFilterItem> {
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
 * antd Tree 的 treeData 节点类型（对齐 antd `DataNode` 子集：key/title/children）。
 */
export interface FilterTreeNode {
  key: React.Key
  title: React.ReactNode
  children?: Array<FilterTreeNode>
}

export function toReactKey(value: FilterValue): React.Key {
  return typeof value === 'boolean' ? String(value) : value
}

/**
 * 把 EngineFilterItem[]（含 children）转为 antd Tree 的 treeData（对齐 antd getTreeData）。
 *   - key = value（与 onFilter/onCompare 的 value 同源）。
 *   - title = text（任意 ReactNode）。
 *   - children 递归。
 */
export function toTreeData(filters: Array<EngineFilterItem>): Array<FilterTreeNode> {
  return filters.map((filter) => {
    const item: FilterTreeNode = {
      title: filter.text,
      key: toReactKey(filter.value),
    }
    if (filter.children && filter.children.length > 0) {
      item.children = toTreeData(filter.children)
    }
    return item
  })
}

/**
 * 递归收集所有叶子 value（对齐 antd flattenKeys）。
 * 用于"全选" Checkbox 的 checked/indeterminate 判定——只看叶子，因为父节点勾选是联动的（非独立）。
 */
export function collectLeafValues(filters: Array<EngineFilterItem>): Array<FilterValue> {
  const out: Array<FilterValue> = []
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
 * 归一化 antd Tree onCheck 的 keys 参数为 string[]/number[] 数组。
 * antd Tree 在 `checkStrictly=false` 时 onCheck 第一参为 `{ checked: Key[], halfChecked: Key[] }`，
 * `checkStrictly=true` 时为 `Key[]`；统一处理。
 *
 * 数值 key 保留为 number；其它（string/bigint/Symbol 等）归一化为 String。
 */
export function resolveCheckedKeys(keys: unknown): Array<FilterValue> {
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
