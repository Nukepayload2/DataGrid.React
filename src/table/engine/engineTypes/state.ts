/**
 * 引擎层状态类型（树形 + 展开）。
 *
 * 从 engineTypes.ts 拆出（档二·纯类型）。适配层 useTreeData / useRowExpand 派生后传入；
 * 引擎只读不写。
 */

import type { ReactNode } from 'react'

/**
 * 引擎层树形数据状态。适配层 useTreeData 派生后传入；引擎只读不写。
 *
 * 适配层在树形模式下（dataSource record 含 `childrenColumnName` 子字段）调用 useTreeData：
 *   1. 把嵌套 children 扁平化（DFS）成普通 record 数组（按展开状态过滤未展开父行的子孙行），
 *      **替换原 dataSource 传给引擎**——引擎按普通扁平表格渲染。
 *   2. 同时构建 `rowInfoMap`（key → {level, parentKey, hasChildren}），引擎据此在**第一列数据列**
 *      单元格内按 `level × indentSize` 左缩进 + `hasChildren` 行渲染展开/收起图标。
 *
 * 引擎据此在渲染数据单元格时（仅 treeState 启用且该列为"首数据列"）插入缩进 + 展开图标。
 */
export interface EngineTreeState {
  /** 是否启用树形模式（treeState 启用）。 */
  treeEnabled: boolean
  /** 每层缩进宽度（px）。默认 15（对齐 antd 6.4.4 实测）。 */
  indentSize: number
  /**
   * key → 树形行信息。
   * 包含扁平化后**所有可见行**（已按展开状态过滤）的 level/parentKey/hasChildren。
   * 引擎在渲染某行数据格时按该行 key 查此 Map。
   */
  rowInfoMap: Map<React.Key, { level: number; parentKey: React.Key | null; hasChildren: boolean }>
  /** 某 key 是否展开。 */
  isExpanded: (key: React.Key) => boolean
  /** 切换某行展开态（点击展开图标触发）。参数：(key)。 */
  toggleExpand: (key: React.Key) => void
}

/**
 * 引擎层展开状态。适配层 useRowExpand 派生后传入；引擎只读不写。
 */
export interface EngineExpandState {
  /** 是否启用展开（决定渲染展开列 / 展开内容 track）。 */
  expandEnabled: boolean
  /** 某 key 是否展开。 */
  isExpanded: (key: React.Key) => boolean
  /** 所有可展开 key 集合（用于判定某行是否需要展开 track）。 */
  expandableKeySet: Set<React.Key>
  /** 展开内容渲染器（来自 expandable.expandedRowRender）。 */
  expandedRowRender: (record: any, index: number, expanded: boolean) => ReactNode
  /** 展开内容起始列偏移（antd deprecated expandedRowOffset 兼容）。 */
  expandedRowOffset?: number
  /**
   * 切换某行展开态（点击展开图标触发）。引擎在展开列单元格点击时调用。
   * 参数：(key, record)。返回的新展开 keys 由适配层 state 管理。
   */
  toggleExpand: (key: React.Key, record: any) => void
  /** 某 key 是否在 expandableKeySet 中（引擎为性能直接传函数）。 */
  isExpandable: (key: React.Key) => boolean
  /** 是否渲染展开图标列（expandable.showExpandColumn !== false 时为 true）。 */
  showExpandColumn: boolean
  /**
   * 自定义展开图标渲染器（来自 expandable.expandIcon）。
   * 当前由适配层（src/table/expandAdapter.tsx buildExpandColumnNode）在展开列 render 中消费；引擎透传不直接使用。
   * 保留在引擎类型中便于未来引擎直渲染展开列时复用。未提供时用默认 ExpandIcon 组件。
   * 参数对齐 antd ExpandIcon props：{ expanded, onExpand(record,e), record }。
   */
  expandIcon?: (props: {
    expanded: boolean
    onExpand: (record: any, e: import('react').MouseEvent) => void
    record: any
  }) => ReactNode
}
