/**
 * 行选择状态机（M5）。
 *
 * 算法移植自 lun `packages/core/src/composable/select/index.ts` 的
 * `createUseSelect` / `useCheckboxMethods`（single/multiple + 全选/半选(intermediate)
 * + reverse/toggle 状态机），**用纯 React + TS 重写**，不引 Vue / Web Component、不抄 lun 代码。
 *
 * === lun 的核心思路（移植点）===
 *
 * 1. **多选（multiple / checkbox）**：
 *    - 用 Set 维护"当前选中的 key 集合"（lun 内部 current）。
 *    - **全选态**（allSelected）：`allValues ⊆ selected`（所有可勾选行都已选中）。
 *    - **半选态**（intermediate）：`0 < |selected ∩ allValues| < |allValues|`（lun 的
 *      `differenceOfSets(all, selected).size` 判定：有选中但没全选 → intermediate=true）。
 *    - 切换某 key：在 Set 中 add/delete（lun 的 `select`/`unselect`/`toggle`）。
 *    - 全选/全不选：select all → set = allValues；unselect all → set = ∅。
 *    - 反选（reverse）：遍历 allValues，在 Set 中的删、不在的加（lun 的 `reverse`）。
 *
 * 2. **单选（single / radio）**：
 *    - 用单个值（lun 内部 current 不是 Set 而是单值）。
 *    - 选中：直接替换当前值（lun 的 `select` 单值分支）。
 *    - 取消：清空（lun 的 `unselect` 单值分支）。
 *
 * === antd 适配（关键差异）===
 *
 * lun 的对外 API 是 `selected`/`selectionMode`/`selectColumn`（内部 Set）；
 * antd 是 `rowSelection.selectedRowKeys`（受控 React.Key[]）+ `onChange(keys, rows)`。
 * 这里把 antd 受控数组作为"真理源"，每次操作生成新数组并调用 `onChange`：
 *   - 多选：内部把 keys 数组当作 Set 的快照（去重 + 仅保留可勾选 key）。
 *   - 单选：keys 数组至多 1 个元素（取首个；切换即替换）。
 *
 * `onChange` 由调用方（适配层）传入，引擎内部不直接调 React setState——保持纯函数性，
 * 与 lun `onChange` 回调语义一致（lun 也是把变更通过 onChange 抛给宿主）。
 *
 * === getCheckboxProps（禁用）===
 *
 * antd `getCheckboxProps(record)` 返回 `{ disabled, ... }`。**禁用的行不参与"全选"**
 * （antd 行为：disabled 行不会被全选/全不选影响；它的勾选态保持不变）。
 * 这里计算 `selectableKeys` 时排除 disabled 行；半选/全选判定也基于 `selectableKeys`
 * 而非全集（与 antd / lun 处理 disabled 时的语义一致）。
 *
 * === 受控语义 ===
 *
 * `selectedRowKeys` 是受控的：调用方负责在 `onChange` 后更新它。本 hook 不缓存"内部
 * 选中态"——每次渲染都从 `selectedRowKeys` 重新派生（与 React 受控组件语义一致；lun
 * 的 reactive watch 也是从 current 派生 allSelected/intermediate）。
 * `defaultSelectedRowKeys` 仅在 `selectedRowKeys` 未传时作为初始值（适配层处理）。
 */

import { useCallback, useMemo } from 'react'

/** antd RowSelection.type：'checkbox'（多选）/ 'radio'（单选）。 */
export type SelectionType = 'checkbox' | 'radio'

/** 透传给底层 input 的"勾选相关 props"子集（antd getCheckboxProps 返回值子集）。 */
export interface RowCheckboxProps {
  disabled?: boolean
  /** antd getCheckboxProps 可返回 name；透传到底层 input。 */
  name?: string
}

export interface UseRowSelectionOptions<RecordType> {
  /** 'checkbox'（多选，默认）/ 'radio'（单选）。 */
  type?: SelectionType
  /** 受控选中 key 数组（真理源）。 */
  selectedRowKeys: Array<React.Key>
  /** 全集 dataSource（用于算 selectableKeys / 全选 / 半选）。 */
  dataSource: Array<RecordType>
  /** rowKey 取值器（字符串属性名或函数）。 */
  rowKey: string | ((record: RecordType) => string | number)
  /**
   * antd `getCheckboxProps(record)`：返回 `{ disabled?, name? }`。
   * 返回 `disabled: true` 的行不参与全选、不可手动勾选（点击被忽略）。
   */
  getCheckboxProps?: (record: RecordType) => RowCheckboxProps | undefined
}

export interface UseRowSelectionResult<RecordType> {
  /** 是否单选模式。 */
  isRadio: boolean
  /** 全集可勾选 key 数组（未 disabled）。 */
  selectableKeys: Array<React.Key>
  /** 全集可勾选 record 数组（与 selectableKeys 一一对应）。 */
  selectableRecords: Array<RecordType>
  /** 当前选中 key 集合（Set；去重）。 */
  selectedKeySet: Set<React.Key>
  /** 全选态（仅多选有意义；单选恒 false）。 */
  allSelected: boolean
  /** 半选态（仅多选有意义；单选恒 false）。 */
  intermediate: boolean
  /** 某 key 是否选中。 */
  isSelected: (key: React.Key) => boolean
  /** 某 record 是否 disabled（不可勾选）。 */
  isDisabled: (record: RecordType) => boolean
  /**
   * 切换某行的勾选态（checkbox 与 radio 共用入口）。
   * - checkbox：在 Set 中 add/delete。
   * - radio：选中即替换为该 key；已选中再点不变（antd radio 行为：再次点击不取消）。
   * 返回新的 `selectedRowKeys` 数组（不直接调 onChange；由调用方决定如何分发）。
   */
  toggleRow: (key: React.Key) => Array<React.Key>
  /**
   * 全选/全不选（仅 checkbox；radio 下 no-op）。
   * 当前已全选 → 清空；否则 → 选中所有 selectableKeys。
   */
  toggleAll: () => Array<React.Key>
  /**
   * 单选指定 key（radio 主用；checkbox 等价于 toggleRow 的"选中"分支）。
   */
  selectRow: (key: React.Key) => Array<React.Key>
}

/**
 * 把 record 解析为 React.Key（字符串/数字）。
 * 与 GridTable.getRowKey 同语义；这里独立实现避免引擎耦合。
 */
function resolveKey<RecordType>(
  record: RecordType,
  rowKey: string | ((record: RecordType) => string | number),
): React.Key {
  if (typeof rowKey === 'function') return rowKey(record)
  const v = (record as any)?.[rowKey]
  return v === undefined ? '' : v
}

/**
 * 行选择状态机 hook。
 *
 * 输入受控 `selectedRowKeys`，派生 isSelected/allSelected/intermediate 与 toggle* 操作。
 * 操作返回新数组（不可变）；调用方负责调 `onChange`。
 */
export function useRowSelection<RecordType>(
  options: UseRowSelectionOptions<RecordType>,
): UseRowSelectionResult<RecordType> {
  const {
    type = 'checkbox',
    selectedRowKeys,
    dataSource,
    rowKey,
    getCheckboxProps,
  } = options
  const isRadio = type === 'radio'

  // === 全集可勾选 key/record（排除 disabled）===
  const { selectableKeys, selectableRecords } = useMemo(() => {
    const keys: Array<React.Key> = []
    const records: Array<RecordType> = []
    for (const record of dataSource) {
      const disabled = getCheckboxProps?.(record)?.disabled === true
      if (disabled) continue
      keys.push(resolveKey(record, rowKey))
      records.push(record)
    }
    return { selectableKeys: keys, selectableRecords: records }
  }, [dataSource, rowKey, getCheckboxProps])

  // === 当前选中 Set（去重；受控源 selectedRowKeys）===
  // 注意：selectedRowKeys 可能含 selectableKeys 之外的 key（如 disabled 行之前被选中、
  // 或 record 已不存在）。antd `preserveSelectedRowKeys` 控制是否保留这些；本 hook 不删除
  // 它们（保留语义），但 allSelected/intermediate 判定只看 selectableKeys 子集。
  const selectedKeySet = useMemo(() => new Set<React.Key>(selectedRowKeys), [selectedRowKeys])

  // === 全选 / 半选（仅 checkbox）===
  // 移植 lun：allValues=allKeys，selected=selectedKeySet；用 differenceOfSets 判定。
  //   - allSelected：selectableKeys 全部在 selectedKeySet 中。
  //   - intermediate：selectableKeys 中至少 1 个在 selectedKeySet 中、且未全选。
  // 单选（radio）下恒为 false（无全选概念）。
  const { allSelected, intermediate } = useMemo(() => {
    if (isRadio || selectableKeys.length === 0) return { allSelected: false, intermediate: false }
    let inCount = 0
    for (const k of selectableKeys) {
      if (selectedKeySet.has(k)) inCount += 1
    }
    const all = inCount === selectableKeys.length && inCount > 0
    // lun：difference.size > 0 且 selected 非空 → intermediate。
    const inter = !all && inCount > 0
    return { allSelected: all, intermediate: inter }
  }, [isRadio, selectableKeys, selectedKeySet])

  const isSelected = useCallback(
    (key: React.Key) => selectedKeySet.has(key),
    [selectedKeySet],
  )

  const isDisabled = useCallback(
    (record: RecordType) => getCheckboxProps?.(record)?.disabled === true,
    [getCheckboxProps],
  )

  // === 操作（不可变；返回新数组）===

  /** 不可变地从数组中 add/delete 一个 key，返回新数组。保留原顺序，新增追加末尾。 */
  const toggleKey = useCallback(
    (key: React.Key, select: boolean): Array<React.Key> => {
      if (select) {
        if (selectedKeySet.has(key)) return selectedRowKeys.slice()
        return [...selectedRowKeys, key]
      }
      if (!selectedKeySet.has(key)) return selectedRowKeys.slice()
      return selectedRowKeys.filter((k) => k !== key)
    },
    [selectedKeySet, selectedRowKeys],
  )

  const toggleRow = useCallback(
    (key: React.Key): Array<React.Key> => {
      if (isRadio) {
        // radio：选中即替换；已选中再点保持（antd radio 行为）。
        if (selectedKeySet.has(key)) return selectedRowKeys.slice()
        return [key]
      }
      return toggleKey(key, !selectedKeySet.has(key))
    },
    [isRadio, selectedKeySet, selectedRowKeys, toggleKey],
  )

  const toggleAll = useCallback((): Array<React.Key> => {
    if (isRadio) return selectedRowKeys.slice()
    if (allSelected) {
      // 当前已全选 → 清空所有 selectableKeys（保留 selectableKeys 之外的 key，如 disabled 行
      // 之前被选中——antd preserveSelectedRowKeys 语义）。
      const next = selectedRowKeys.filter((k) => !selectableKeys.includes(k))
      return next
    }
    // 未全选 → 选中所有 selectableKeys（去重合并，保留原顺序优先）。
    const seen = new Set<React.Key>()
    const next: Array<React.Key> = []
    for (const k of selectedRowKeys) {
      if (!seen.has(k)) {
        seen.add(k)
        next.push(k)
      }
    }
    for (const k of selectableKeys) {
      if (!seen.has(k)) {
        seen.add(k)
        next.push(k)
      }
    }
    return next
  }, [isRadio, allSelected, selectedRowKeys, selectableKeys])

  const selectRow = useCallback(
    (key: React.Key): Array<React.Key> => {
      if (isRadio) return [key]
      return toggleKey(key, true)
    },
    [isRadio, toggleKey],
  )

  return {
    isRadio,
    selectableKeys,
    selectableRecords,
    selectedKeySet,
    allSelected,
    intermediate,
    isSelected,
    isDisabled,
    toggleRow,
    toggleAll,
    selectRow,
  }
}
