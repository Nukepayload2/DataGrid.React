/**
 * 筛选算法纯函数簇 — 详见 docs/features/interaction/filter-sorter.md
 *
 * 从 useFilter.ts 抽出的模块级纯函数：判定可筛选、filters 扁平化、filteredValue 规范化、
 * 数据源过滤（列间 AND、列内 OR）、onChange filters 参数构造。
 *
 * 全部为纯函数（不依赖 hook state/setter），可独立单测。useFilter 仅做 import 替换。
 */

import type { ColumnType, ColumnFilterItem, FilterValue } from '../types'
import { resolveFilterKey } from './columnKeys'

/**
 * 判断某列是否可筛选 — 详见 docs/features/interaction/filter-sorter.md
 *
 * 对齐 antd `useFilter/index.tsx:38`：`filters || filterDropdownIsDefined || 'onFilter' in column`
 * ——filters/filterDropdown/onFilter 任一存在即 filterable（渲染漏斗）。**onFilter 非必需**：
 * 服务端模式列声明 filters 但不传 onFilter，漏斗仍渲染，onChange 仍回传 filters，前端不过滤。
 */
export function isFilterable<RecordType>(
  column: ColumnType<RecordType> | undefined,
): boolean {
  if (!column) return false
  // 自定义面板优先——有 filterDropdown 即可筛选（即使无 filters/onFilter）。
  if (column.filterDropdown !== undefined && column.filterDropdown !== null) return true
  // filters 已定义即 filterable（含空数组，对齐 antd truthy 判定：`filters: []`
  //   也渲染漏斗，点开空面板走 renderEmpty）。onFilter 非必需——服务端筛选时前端不过滤。
  if (column.filters) return true
  // 仅 onFilter（filters 空、filterDropdown 空）也视为可筛选（兜底）。
  return typeof column.onFilter === 'function'
}

/**
 * 把 ColumnFilterItem[]（含 children）扁平化为 value 列表 — 详见 docs/features/interaction/filter-sorter.md（filters 扁平化）
 *
 * 树形筛选本阶段扁平化为顶层项参与勾选（不做二级菜单 UI）。返回扁平 value 列表仅用于
 * "判定某 value 是否在 filters 配置中"等辅助；实际渲染下拉 UI 用原始 ColumnFilterItem[]（保留 text）。
 */
export function flattenFilterValues(items: Array<ColumnFilterItem>): Array<FilterValue> {
  const out: Array<FilterValue> = []
  const walk = (list: Array<ColumnFilterItem>) => {
    for (const it of list) {
      out.push(it.value)
      if (it.children && it.children.length > 0) walk(it.children)
    }
  }
  walk(items)
  return out
}

/**
 * 规范化单列的"当前 filteredValue"：null/undefined → 空（无激活）；数组去重保序。
 *
 * 去重用 `Set`（SameValueZero 语义）：原始值按值去重，**对象值按引用去重**。
 * 不能把 item 先 `String()` 再比较——任意对象都会字符串化成 `'[object Object]'`，
 * 于是 `{k:1}` 与 `{k:2}` 被判成重复项、只保留第一项（labelInValue / Select 对象值场景直接丢数据）。
 * 对齐 antd：antd 侧 `String(k)` 只当**查表键**用（`useFilter/index.js` 的 keyMap 把真值还原回来），
 * 从不因字符串化而丢弃项。
 */
export function normalizeFilteredValue(
  v: Array<FilterValue> | null | undefined,
): Array<FilterValue> {
  if (!v || v.length === 0) return []
  // 去重保序（避免重复勾选导致 onChange 数组重复）。Set 保持首次出现顺序。
  return Array.from(new Set(v))
}

/**
 * 单个筛选值的等值判定 —— **与 normalizeFilteredValue 的 Set 去重同一把尺**（SameValueZero）：
 * 原始值按值比较（含 NaN 等于 NaN、+0 等于 -0），对象值按引用比较。
 */
function isSameFilteredValue(a: FilterValue, b: FilterValue): boolean {
  if (a === b) return true
  // SameValueZero 与 === 的唯一差别：NaN 与 NaN 相等（+0/-0 在 === 下已相等）。
  return typeof a === 'number' && typeof b === 'number' && a !== a && b !== b
}

/**
 * 判定两列筛选值是否等值（长度 + 逐项按序比较）。
 *
 * 供 useFilter 的「值未变则不派发 onChange」等值守卫使用（对齐 antd
 * `useFilter/FilterDropdown.js` 的 `internalTriggerFilter`：`isEqual(mergedKeys, filteredKeys)`
 * 时直接 return null，不触发 filter 回调）。
 */
export function isSameFilteredValueList(
  a: Array<FilterValue> | null | undefined,
  b: Array<FilterValue> | null | undefined,
): boolean {
  const left = a ?? []
  const right = b ?? []
  if (left.length !== right.length) return false
  for (let i = 0; i < left.length; i += 1) {
    if (!isSameFilteredValue(left[i]!, right[i]!)) return false
  }
  return true
}

/**
 * 给定 dataSource + filterableColumns + filteredValueMap，计算过滤后的数据源。
 * activeFilters 非空时按 AND（每列 OR）过滤；否则返回原 dataSource。
 * 抽出供 filteredDataSource useMemo 与 setFilterValue 即时计算共用。
 *
 * 对齐 antd：受控与否都过滤（受控仅表示状态来源，不跳过 getFilterData）。
 *
 * **树形数据（childrenColumnName）：自底向上求值，与 antd `getFilterData` 语义等价**
 * （参照 `node_modules/antd/es/table/hooks/useFilter/index.js:133-145`，逐句如下）：
 *
 * ```js
 * const internalFilter = subset => subset.reduce((acc, record) => {
 *   const clonedRecord = { ...record };
 *   if (clonedRecord[childrenColumnName]) {            // ① 先递归滤子层
 *     clonedRecord[childrenColumnName] =
 *       getFilterData(clonedRecord[childrenColumnName], filterStates, childrenColumnName);
 *   }
 *   if (realKeys.some(realKey => onFilter(realKey, clonedRecord))) {  // ② 再拿「子已替换」的行判定
 *     acc.push(clonedRecord);                          // ③ 只有本列判定通过才留该行
 *   }
 *   return acc;
 * }, []);
 * ```
 *
 * 由此得到三条必须遵守的语义：
 * 1. **顺序自底向上**：`onFilter` 拿到的是 children **已过滤**的行。所以会读
 *    `record[childrenColumnName]` 的判定（antd 自家 `Table.filter` L610 用例就是这形状）在子行全灭时
 *    对父行也判 false —— 不会留下「父行还在、子行全空」的行。
 * 2. **保留判据只有该行自身**：子行命中**不能**救回不命中的父行；父行落选时其已过滤的子树整体消失。
 * 3. **列间 AND** 与 antd 的 `filterStates.reduce`（逐列全表重跑、每列内部又递归重跑整条流水线）等价：
 *    过滤结果是「再滤一次」的不动点，故每列判定都作用在**最终** children 上。
 *
 * 拷贝范围（与 antd 的差别只在身份、不在值）：仅「判定通过且带非空 children」的行被浅拷贝，
 * 其余行（叶子 / children 为空数组）保持**原引用**；外部 dataSource 一律不被改写。
 * 判定不通过的父行会产出一个仅用于判定的临时克隆，不入结果、也不可见。
 */
export function computeFilteredDataSource<RecordType>(
  dataSource: Array<RecordType>,
  filterableColumns: Array<ColumnType<RecordType>>,
  filteredValueMap: Map<string, Array<FilterValue>>,
  childrenColumnName: string = 'children',
): Array<RecordType> {
  if (filterableColumns.length === 0) return dataSource
  const activeFilters: Array<{
    onFilter: (value: FilterValue, record: RecordType) => boolean
    values: Array<FilterValue>
  }> = []
  for (const c of filterableColumns) {
    const key = resolveFilterKey(c)
    if (key === undefined) continue
    const values = filteredValueMap.get(key)
    if (!values || values.length === 0) continue
    // 守卫：filterable 放宽后，server 模式列可能无 onFilter（filters 非空但 onFilter 缺省）。
    // 对齐 antd：无 onFilter 的列渲染漏斗但前端不过滤（数据由服务端处理），跳过该列。
    if (typeof c.onFilter !== 'function') continue
    activeFilters.push({ onFilter: c.onFilter, values })
  }
  if (activeFilters.length === 0) return dataSource

  // AND：每列都必须通过（该列 values 中任一命中即可）。
  const matches = (record: RecordType): boolean =>
    activeFilters.every((af) => af.values.some((v) => af.onFilter(v, record)))

  const filterLevel = (list: Array<RecordType>): Array<RecordType> => {
    const out: Array<RecordType> = []
    for (const record of list) {
      const children = (record as Record<string, unknown>)[childrenColumnName]
      if (Array.isArray(children) && children.length > 0) {
        // 自底向上（对齐 antd ①②）：先递归滤完子层，再拿「children 已被替换」的候选行去过判定。
        const candidate = {
          ...record,
          [childrenColumnName]: filterLevel(children as Array<RecordType>),
        }
        // 判定不通过就整行丢弃（连同其已过滤的子树），与 antd ③ 同款；此行是新对象，不外泄。
        if (matches(candidate as RecordType)) out.push(candidate as RecordType)
      } else if (matches(record)) {
        // 叶子 / children 为空数组：antd 的克隆体与 record 逐值相同，故直接沿用原引用。
        out.push(record)
      }
    }
    return out
  }

  return filterLevel(dataSource)
}

/**
 * 构造 onChange 的 filters 参数：所有可筛选列均出现为 key；无激活的列值为 null。
 */
export function buildFiltersArg<RecordType>(
  filterableColumns: Array<ColumnType<RecordType>>,
  filteredValueMap: Map<string, Array<FilterValue>>,
): Record<string, Array<FilterValue> | null> {
  const arg: Record<string, Array<FilterValue> | null> = {}
  for (const c of filterableColumns) {
    const key = resolveFilterKey(c)
    if (key === undefined) continue
    const v = filteredValueMap.get(key)
    arg[key] = v && v.length > 0 ? v : null
  }
  return arg
}
