/**
 * 行展开 + 哨兵列。
 *
 * 包含 antd `expandable` 接口 + EXPAND_COLUMN / SELECTION_COLUMN 占位哨兵常量 +
 * ColumnOrSentinel 联合类型。
 */
// 按业务域从 compatTypes.ts 拆出；哨兵常量随展开域就近放置（runtime 值，barrel re-export 透传）。

import type { ReactNode } from 'react'
import type { ColumnType } from './column'

/**
 * antd `expandable` 接口。
 *
 * **覆盖**：`expandedRowRender`、`expandedRowOffset`、`rowExpandable`、`defaultExpandedRowKeys`、
 *   `expandedRowKeys`（受控）、`onExpand`、`onExpandedRowsChange`、`columnWidth`、
 *   `expandIcon`、`defaultExpandAllRows`、`showExpandColumn`。
 *
 * 与 antd 同名字段同语义，便于直接替换。
 *
 * === 展开/收起动画 ===
 *
 * 展开内容随展开状态平滑过渡（高度动画）；收起时内容被裁剪、不占可视高度。
 *
 * === 虚拟 × 展开约定 ===
 *
 * 虚拟模式下，展开内容**不参与虚拟窗口计算**——展开某行会让该行实际 DOM 更高，
 * 但虚拟窗口范围不变；展开内容溢出渲染（牺牲性能换稳定）。
 * 详见 `docs/features/scrolling/virtualization.md` 的「虚拟 × 展开」节。
 *
 * 详见 `docs/features/interaction/expand.md`。
 *
 * @internal 动画采用 CSS grid `0fr↔1fr` 过渡：每个可展开数据行（rowExpandable !== false）在其
 *   数据行 track 之后插入一条"展开内容 track"——收起=`0fr`（track 仍存在、行线号稳定），
 *   展开=`1fr`（按内容自然高撑开）；`.dg-grid` 上 `transition: grid-template-rows 0.3s ease`
 *   实现 0fr↔1fr 平滑动画（grid-template-rows 可动画、fr 单位可逐项插值）。展开内容作为 grid item
 *   放在该展开 track（grid-row 指向展开 track，默认 grid-column: 1 / -1 跨整行；传 expandedRowOffset
 *   时从第 N+1 个叶子列开始）；展开内容容器 `overflow: hidden; min-height: 0`，0fr 下裁剪、1fr 下展开。
 *   虚拟下 `useVirtualList` 仍按"收起态"行高算窗口（start/end + paddingTop/paddingBottom）。
 */
export interface Expandable<RecordType = any> {
  /**
   * 展开行内容渲染器。
   * 返回 null/undefined 的行视为不可展开（不渲染展开图标、不插入展开内容区）。
   * 签名对齐 antd：`(record, index, indent, expanded) => ReactNode`。
   * （indent/expanded 固定 0/当前态；树形模式下 indent 才有意义。）
   */
  expandedRowRender?: (
    record: RecordType,
    index: number,
    indent: number,
    expanded: boolean,
  ) => ReactNode
  /**
   * 展开内容起始列偏移（对齐 antd deprecated `expandedRowOffset`）。
   *
   * 传入 N 时，展开内容跳过前 N 个叶子列，从第 N+1 列开始并跨到表尾。
   * antd 已建议改用 `Table.EXPAND_COLUMN` 控制展开列位置；保留该字段用于兼容旧 demo/API。
   */
  expandedRowOffset?: number
  /**
   * 某行是否可展开。返回 false 的行不渲染展开图标（也不插入展开内容区）。
   * 缺省视所有行可展开（前提是有 expandedRowRender）。
   */
  rowExpandable?: (record: RecordType) => boolean
  /** 非受控初始展开 keys（仅当 expandedRowKeys 未传时生效）。 */
  defaultExpandedRowKeys?: Array<React.Key>
  /** 受控展开 keys（真理源；调用方在 onExpandedRowsChange 后更新它）。 */
  expandedRowKeys?: Array<React.Key>
  /** 单行展开/收起回调（对齐 antd onExpand）。 */
  onExpand?: (expanded: boolean, record: RecordType) => void
  /** 展开 keys 变化回调（对齐 antd onExpandedRowsChange）。 */
  onExpandedRowsChange?: (expandedKeys: Array<React.Key>) => void
  /** 展开列宽度（缺省 48，对齐 antd tableExpandColumnWidth 默认）。 */
  columnWidth?: number | string
  /** 自定义展开图标（antd ExpandIcon props 子集：expanded + onExpand）。 */
  expandIcon?: (props: { expanded: boolean; onExpand: (record: RecordType, e: React.MouseEvent) => void; record: RecordType }) => ReactNode
  /** 非受控：是否默认展开所有可展开行。与 defaultExpandedRowKeys 互斥（前者优先）。 */
  defaultExpandAllRows?: boolean
  /**
   * 是否显示展开列（默认 true）。
   * false 时不渲染展开图标列——但仍允许通过其它方式（如外部按钮）控制 expandedRowKeys 展开/收起。
   * （对齐 antd showExpandColumn。）
   */
  showExpandColumn?: boolean
  /**
   * 树形数据子字段名（对齐 antd `expandable.childrenColumnName`，默认 `'children'`）。
   * 优先级高于 Table 级 `childrenColumnName`（与 antd `getExpandableProps` 一致）。
   * 详见 `TableProps.childrenColumnName`。
   */
  childrenColumnName?: string
  /**
   * 树形缩进宽度（对齐 antd `expandable.indentSize`，默认 `15`）。
   *
   * 树形模式下，第一列数据单元格按 `level × indentSize` 左缩进（px）。
   *
   * @internal 默认值以 antd 6.4.4 实测为准（见 `InternalTable.tsx:611`）。
   */
  indentSize?: number
  /**
   * 行展开：点击行体切换（对齐 antd `expandable.expandRowByClick`）。
   *
   * true 时点击**行体**（任意非展开图标的单元格）切换该行展开/收起。
   *
   * 与 `onRow.onClick` **共存**（不互斥）：antd 行为是 expandRowByClick 触发切换的**同时**
   * onRow.onClick 也照常触发——本实现遵循同款语义（在 onRow.onClick 之外叠加切换，不阻止 onRow.onClick）。
   *
   * 仅对该行 `rowExpandable !== false` 的可展开行生效（不可展开行点击无反应，与 antd 一致）。
   *
   * 默认 false（仅展开图标点击切换，行体点击不触发展开——零回归）。
   *
   * @internal 字段定义对齐 rc-table interface.d.ts:179。
   */
  expandRowByClick?: boolean
  /**
   * 行展开：展开后追加行 className（对齐 antd `expandable.expandedRowClassName`）。
   *
   * 行**展开后**额外附加到该行所有单元格的 class（与 `rowClassName` 同款行级 class 注入路径）。
   * 仅在该行 `expanded=true` 时生效（收起时不加）。
   *
   * 签名 `(record, index) => string`，返回值合并到该行 body 单元格 className。
   * 与 `TableProps.rowClassName` 叠加（两者都生效，互不覆盖）。
   *
   * @internal 字段定义对齐 rc-table interface.d.ts:188。
   */
  expandedRowClassName?: (record: RecordType, index: number) => string
}

/**
 * 展开列占位哨兵（对齐 antd `Table.EXPAND_COLUMN`）。
 *
 * 在 `columns` 数组中插入此哨兵可**控制展开列位置**（不一定首列）。
 * 与 `SELECTION_COLUMN` 类似：哨兵被识别后，data-grid 把展开列插在该位置而非默认首列。
 *
 * 详见 demo `order-column`。
 */
export const EXPAND_COLUMN = {} as const

/**
 * 选择列占位哨兵（对齐 antd `Table.SELECTION_COLUMN`）。
 *
 * 在 `columns` 数组中插入此哨兵可**控制选择列位置**。
 * 未插入时，若 `rowSelection` 传入，选择列默认插在最前（零回归）。
 * 与 `EXPAND_COLUMN` 类似机制。
 */
export const SELECTION_COLUMN = {} as const

/**
 * 列定义或哨兵（columns 数组可混入 EXPAND_COLUMN / SELECTION_COLUMN 占位对象，
 * 用于控制展开列 / 选择列的位置；对齐 antd `Table.EXPAND_COLUMN` 用法）。
 */
export type ColumnOrSentinel<RecordType = any> = ColumnType<RecordType> | typeof EXPAND_COLUMN | typeof SELECTION_COLUMN
