/**
 * 树形数据扁平化 + 展开状态 hook（S13）。
 *
 * 纯 React 实现，参考 rc-table 的 `useFlattenRecords` + `useExpand` 语义，**不抄 rc-table 代码**。
 *
 * === 核心职责 ===
 *
 * 1. **树形数据检测**（`detectTreeData`）：dataSource 中任一 record 的 `record[childrenColumnName]`
 *    是非空数组 → 树形模式。
 *
 * 2. **扁平化**（DFS）：把嵌套 children 按展开状态扁平化为普通 record 数组——
 *    与 rc-table `useFlattenRecords.fillRecords` 同语义：
 *      - 仅当某 record 的 key 在 `expandedKeySet` 中时，才递归扁平化其 children；
 *        否则只 push 自身（子孙行不渲染）。
 *      - 每行附带 `{ level, parentKey, hasChildren }`（level 从 0 起算顶层）。
 *
 * 3. **展开状态机**（`useTreeExpand`）：受控 `expandedRowKeys` / 非受控
 *    `defaultExpandAllRows` / `defaultExpandedRowKeys`；点展开图标 toggle。
 *
 * === 与 M9 expandedRowRender 互斥 ===
 *
 * antd 行为：tree-data（record.children 嵌套）与 expandable.expandedRowRender 不可同时启用
 * （antd 会 warning）。data-grid 中：**树形模式优先**——树形检测命中时，expandState 不启用
 * （由 Table.tsx 适配层控制：树形模式下不构造 engineExpandState）。
 *
 * === ★ 决策 2（行高口径）===
 *
 * 树形展开行视为普通表格行——扁平化后的每行都是引擎的一个数据行。非虚拟路径走约定 `rowHeight`（track），
 * 虚拟路径同样被 RO 实测（measured-first + 约定 `rowHeight` 兜底），不再"只走约定"。
 * （详见 task-plan §1.2 决策 2 + GridTable.tsx 文件头注释）。
 */

import { useCallback, useMemo, useState } from 'react'
import type { Expandable } from '../types'
import { getRowKey } from './GridTable'

export interface UseTreeDataOptions<RecordType> {
  /** 原始 dataSource（可能含嵌套 children）。 */
  dataSource: Array<RecordType>
  /** 树形子字段名（默认 'children'）。 */
  childrenColumnName: string
  /** rowKey 取值器（字符串属性名或函数）。 */
  rowKey: string | ((record: RecordType) => string | number)
  /**
   * 展开配置（来自 TableProps.expandable）。提供以下字段：
   *   - `expandedRowKeys`：受控展开 keys。
   *   - `defaultExpandedRowKeys`：非受控初始展开 keys。
   *   - `defaultExpandAllRows`：非受控初始全展。
   *   - `onExpand` / `onExpandedRowsChange`：回调（与 antd 一致）。
   * 可能 undefined（无 expandable prop）——仍可树形（仅默认不展开任何父行，仅顶层可见）。
   */
  expandable?: Expandable<RecordType>
}

/** 单行扁平化信息（key → 树形层级/父/是否含子）。 */
export interface TreeRowInfo {
  /** 层级（顶层 = 0；每深入一层 +1）。 */
  level: number
  /** 父行 key；顶层为 null。 */
  parentKey: React.Key | null
  /** 是否含非空 children 数组（决定渲染展开图标）。 */
  hasChildren: boolean
}

export interface UseTreeDataResult<RecordType> {
  /** 是否检测到树形数据（任一 record 含 childrenColumnName 非空数组）。 */
  treeEnabled: boolean
  /**
   * 扁平化后的 record 数组（按展开状态过滤未展开父行的子孙行）。
   * 非树形模式 → 原样返回 dataSource（零回归）。
   */
  flattenedData: Array<RecordType>
  /**
   * key → 树形行信息（仅 flattenedData 中可见行的 key 在 Map 中）。
   */
  rowInfoMap: Map<React.Key, TreeRowInfo>
  /**
   * key → 该父行的直接子行 keys（含所有层级，**不论是否展开**）。
   * 用于 checkStrictly=false 父子联动（useRowSelection 消费）。
   * 非树形模式 → 空 Map。
   */
  parentChildrenMap: Map<React.Key, Array<React.Key>>
  /** 所有"含 children"的 key 集合（不论是否展开）。用于展开状态机判定可展开性。 */
  expandableKeySet: Set<React.Key>
  /** 当前展开 key 的 Set。 */
  expandedKeySet: Set<React.Key>
  /** 某 key 是否展开。 */
  isExpanded: (key: React.Key) => boolean
  /** 切换展开态。 */
  toggleExpand: (key: React.Key) => void
}

/**
 * 判定 dataSource 是否含树形数据：任一 record 的 `record[childrenColumnName]` 是非空数组。
 *
 * 与 rc-table `useExpand.expandableType === 'nest'` 判定同语义（mergedData.some(record =>
 * record[mergedChildrenColumnName]））。
 */
export function detectTreeData<RecordType>(
  dataSource: Array<RecordType>,
  childrenColumnName: string,
): boolean {
  for (const record of dataSource) {
    if (record && typeof record === 'object') {
      const children = (record as any)[childrenColumnName]
      if (Array.isArray(children) && children.length > 0) return true
      // 顶层 record 无 children 但下层可能有——antd 仅看顶层？实测 antd：
      //   useExpand 的判定是 `mergedData.some(...)`（仅顶层）。但 useSelection 用
      //   `flattenData`（全树扁平）。tree-data demo 顶层 John Brown sr. 含 children 即命中。
      //   这里也仅看顶层（与 antd useExpand 一致），避免遍历整棵树开销。
      //   若顶层无 children 但深层有 → 视为非树形（与 antd 一致）。
    }
  }
  return false
}

/**
 * 递归扁平化：DFS 遍历，仅展开的父行的 children 才被递归扁平化（其余只 push 自身）。
 *
 * 返回扁平化后的 record 数组 + 同序的 rowInfo 数组（一一对应）。
 *
 * 与 rc-table `useFlattenRecords.fillRecords` 同语义：
 *   - 先 push 自身（无论是否展开）。
 *   - 若该 record 含非空 children 且 key 在 expandedKeySet 中 → 递归扁平化每个 child（level+1）。
 */
function flattenTree<RecordType>(
  records: Array<RecordType>,
  childrenColumnName: string,
  expandedKeySet: Set<React.Key>,
  rowKey: string | ((record: RecordType) => string | number),
  level: number,
  parentKey: React.Key | null,
  outRecords: Array<RecordType>,
  outInfos: Array<TreeRowInfo>,
): void {
  for (const record of records) {
    const key = getRowKey(record, rowKey)
    const children = record && typeof record === 'object'
      ? (record as any)[childrenColumnName]
      : undefined
    const hasChildren = Array.isArray(children) && children.length > 0
    outRecords.push(record)
    outInfos.push({ level, parentKey, hasChildren })
    if (hasChildren && expandedKeySet.has(key)) {
      flattenTree(
        children,
        childrenColumnName,
        expandedKeySet,
        rowKey,
        level + 1,
        key,
        outRecords,
        outInfos,
      )
    }
  }
}

/**
 * 递归收集所有 key（不论展开）+ parent→children 映射 + 所有含 children 的 key 集合。
 *
 * 用于 checkStrictly=false 父子联动：需要全树结构（不受展开状态影响）。
 * 与 antd `convertDataToEntities`（rc-tree）同语义——构建全树 keyEntities 结构。
 */
function collectAllKeys<RecordType>(
  records: Array<RecordType>,
  childrenColumnName: string,
  rowKey: string | ((record: RecordType) => string | number),
  parentChildrenMap: Map<React.Key, Array<React.Key>>,
  expandableKeySet: Set<React.Key>,
  allKeySet: Set<React.Key>,
): void {
  for (const record of records) {
    const key = getRowKey(record, rowKey)
    allKeySet.add(key)
    const children = record && typeof record === 'object'
      ? (record as any)[childrenColumnName]
      : undefined
    if (Array.isArray(children) && children.length > 0) {
      expandableKeySet.add(key)
      const childKeys: Array<React.Key> = []
      for (const child of children) {
        childKeys.push(getRowKey(child, rowKey))
      }
      parentChildrenMap.set(key, childKeys)
      collectAllKeys(children, childrenColumnName, rowKey, parentChildrenMap, expandableKeySet, allKeySet)
    }
  }
}

export function useTreeData<RecordType>(
  options: UseTreeDataOptions<RecordType>,
): UseTreeDataResult<RecordType> {
  const { dataSource, childrenColumnName, rowKey, expandable } = options

  // === 树形检测 ===
  const treeEnabled = useMemo(
    () => detectTreeData(dataSource, childrenColumnName),
    [dataSource, childrenColumnName],
  )

  // === 全树结构（不受展开状态影响）：parentChildrenMap + expandableKeySet ===
  // 仅树形模式下计算（非树形 → 空 Map/Set，零回归）。
  const { parentChildrenMap, expandableKeySet } = useMemo(() => {
    const pcm = new Map<React.Key, Array<React.Key>>()
    const eks = new Set<React.Key>()
    if (!treeEnabled) return { parentChildrenMap: pcm, expandableKeySet: eks }
    // allKeySet 仅内部 collectAllKeys 维护，未对外暴露（当前 useRowSelection 不需要全集）。
    const aks = new Set<React.Key>()
    collectAllKeys(dataSource, childrenColumnName, rowKey, pcm, eks, aks)
    return { parentChildrenMap: pcm, expandableKeySet: eks }
  }, [treeEnabled, dataSource, childrenColumnName, rowKey])

  // === 展开状态机 ===
  // 受控（expandable.expandedRowKeys 传入）or 非受控。
  // 非受控初始：defaultExpandAllRows → 全部可展开 key（含根 + 所有后代，对齐 antd findAllChildrenKeys）；
  //             defaultExpandedRowKeys → 过滤掉不可展开 key（避免指向叶子）。
  const isControlled = !!expandable && expandable.expandedRowKeys !== undefined
  const [uncontrolledKeys, setUncontrolledKeys] = useState<Array<React.Key>>(() => {
    if (!expandable) return []
    if (expandable.defaultExpandAllRows) return Array.from(expandableKeySet)
    const defaults = expandable.defaultExpandedRowKeys ?? []
    return defaults.filter((k) => expandableKeySet.has(k))
  })

  // 树形模式（treeEnabled）下展开状态机始终生效，不依赖 expandable prop 存在。
  // expandable 仅作可选受控源（expandedRowKeys）+ 默认配置；其缺失不应禁用展开
  // （非受控展开：初始全收起，点击 toggle 展开，对齐 antd tree-data demo 语义）。
  const effectiveExpandedKeys: Array<React.Key> = isControlled
    ? (expandable!.expandedRowKeys as Array<React.Key>)
    : uncontrolledKeys

  const expandedKeySet = useMemo(
    () => new Set<React.Key>(effectiveExpandedKeys),
    [effectiveExpandedKeys],
  )

  const isExpanded = useCallback(
    (key: React.Key) => expandedKeySet.has(key),
    [expandedKeySet],
  )

  const toggleExpand = useCallback(
    (key: React.Key) => {
      // 仅含 children 的 key 可切换（叶子无展开图标，不会触发）。
      if (!expandableKeySet.has(key)) return
      const willExpand = !expandedKeySet.has(key)
      const next: Array<React.Key> = willExpand
        ? [...effectiveExpandedKeys, key]
        : effectiveExpandedKeys.filter((k) => k !== key)
      if (!isControlled) {
        setUncontrolledKeys(next)
      }
      expandable?.onExpandedRowsChange?.(next)
      // onExpand 第二参 record：toggleExpand 在引擎层只传 key（无 record 引用）——这里改用 key 查
      // dataSource 取 record。对齐 antd `onExpand(expanded, record)`。
      // 实测 antd tree-data demo 不消费 onExpand（仅 onChange/onSelect），故 record 缺失不影响 demo。
      // 这里仍尽力回填（从 dataSource 递归查找）。
      if (expandable?.onExpand) {
        const rec = findRecordByKey(dataSource, childrenColumnName, rowKey, key)
        expandable.onExpand(willExpand, rec as RecordType)
      }
    },
    [expandableKeySet, expandedKeySet, effectiveExpandedKeys, isControlled, expandable, dataSource, childrenColumnName, rowKey],
  )

  // === 扁平化（按展开状态过滤）===
  // 非树形 → 原样 dataSource + 空 rowInfoMap（零回归）。
  // 树形 → DFS 扁平化 + rowInfoMap。
  const { flattenedData, rowInfoMap } = useMemo(() => {
    if (!treeEnabled) {
      // 非树形：扁平化退化为原 dataSource（零回归）；rowInfoMap 空。
      return { flattenedData: dataSource, rowInfoMap: new Map<React.Key, TreeRowInfo>() }
    }
    const outRecords: Array<RecordType> = []
    const outInfos: Array<TreeRowInfo> = []
    flattenTree(
      dataSource,
      childrenColumnName,
      expandedKeySet,
      rowKey,
      0,
      null,
      outRecords,
      outInfos,
    )
    const m = new Map<React.Key, TreeRowInfo>()
    for (let i = 0; i < outRecords.length; i += 1) {
      const k = getRowKey(outRecords[i], rowKey)
      m.set(k, outInfos[i])
    }
    return { flattenedData: outRecords, rowInfoMap: m }
  }, [treeEnabled, dataSource, childrenColumnName, expandedKeySet, rowKey])

  return {
    treeEnabled,
    flattenedData,
    rowInfoMap,
    parentChildrenMap,
    expandableKeySet,
    expandedKeySet,
    isExpanded,
    toggleExpand,
  }
}

/**
 * 递归查找 dataSource（含子树）中 rowKey === key 的 record。
 * 用于 toggleExpand 的 onExpand 回调回填 record。
 */
function findRecordByKey<RecordType>(
  records: Array<RecordType>,
  childrenColumnName: string,
  rowKey: string | ((record: RecordType) => string | number),
  targetKey: React.Key,
): RecordType | undefined {
  for (const record of records) {
    if (getRowKey(record, rowKey) === targetKey) return record
    const children = record && typeof record === 'object'
      ? (record as any)[childrenColumnName]
      : undefined
    if (Array.isArray(children) && children.length > 0) {
      const found = findRecordByKey(children, childrenColumnName, rowKey, targetKey)
      if (found !== undefined) return found
    }
  }
  return undefined
}
