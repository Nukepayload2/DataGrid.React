/**
 * data-grid 对外 Table 组件（F2 适配层）。
 *
 * 把 antd 兼容 props（`TableProps`）映射到内部引擎（`GridTable`）。
 * 第一步覆盖 demo 子集（见 types.ts 注释）。
 *
 * === M4 虚拟滚动 ref 适配 ===
 *
 * - 用 `forwardRef` 暴露 `TableRef`（含 `scrollTo` 与 `nativeElement`）。
 * - `scrollTo({ key })`：在适配层根据 `rowKey` 把 key → index，再转给引擎 `scrollTo({ index })`。
 *   引擎层只处理 index/scrollTop（虚拟窗口内逻辑），与解耦保持一致。
 * - 非 virtual 模式下 `scrollTo` 为 no-op（不报错；与 antd 在非虚拟下 ref.scrollTo 不可用一致）。
 *
 * === M5 行选择（rowSelection）适配 ===
 *
 * - `rowSelection` 传入时，适配层在最前插入一个"选择列"叶子节点（`buildSelectionColumnNode`），
 *   该节点对引擎透明（普通 `EngineColumnNode`，无 children → 叶子），与 M1 多级表头 / M2 固定列 /
 *   M3 合并 / M4 虚拟滚动无缝组合。
 * - 状态机由 `useRowSelection`（移植自 lun `select/index.ts`，纯 React 重写）派生：
 *     * checkbox：全选(allSelected)/半选(intermediate) + toggleRow/toggleAll。
 *     * radio：单选互斥 + selectRow。
 * - 受控语义：`selectedRowKeys` 传入即受控；未传则用 `defaultSelectedRowKeys`（非受控）。
 *   勾选触发 `onChange(keys, rows, { type })`（type 为 'single'/'all'/'none'，对齐 antd RowSelectMethod）。
 * - `getCheckboxProps(record).disabled` 的行不参与全选/半选、不可手动勾选。
 */

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { GridTable, getRowKey } from './engine/GridTable'
import { SelectionInput } from './engine/SelectionInput'
import { ExpandIcon } from './engine/ExpandIcon'
import { useRowSelection, type UseRowSelectionResult } from './engine/useRowSelection'
import { useRowExpand } from './engine/useRowExpand'
import { useSorter } from './engine/useSorter'
import { resolveColumnSortKey } from './engine/useSorter'
import { useFilter, resolveFilterKey } from './engine/useFilter'
import type { EngineColumnNode, EngineExpandState, FixedSide } from './engine/types'
import {
  EXPAND_COLUMN,
  SELECTION_COLUMN,
  type ColumnOrSentinel,
  type ColumnType,
  type Expandable,
  type RowSelectMethod,
  type SizeType,
  type TableProps,
  type TableRef,
  type TableRowSelection,
} from './types'
import './style/tokens.css'
import './style/table.css'

function normalizeFixed(fixed: ColumnType['fixed']): FixedSide | undefined {
  if (fixed === 'left' || fixed === 'start') return 'start'
  if (fixed === 'right' || fixed === 'end') return 'end'
  return undefined
}

/**
 * 路径分隔符（用于分组列 key 的层级拼接）。
 *
 * 历史上用 `/`（与 antd/lun 的 column path 概念一致），但 `/` 会出现在生成的 React key
 * 里（`h-/col-0`），与表头/单元格其它 key 拼写易冲突，且 antd 自身列 path 也未规定分隔符。
 * M9 验证者发现 grouping-columns demo 报 `h-/col-0` 重复 warning：根因是表头分组列 key
 * 拼接含 `/`，与其它表头格 key 冲突。改用 `.`（点号）——更安全的层级分隔，避免与 key 内
 * 允许出现的字符冲突，也避免 React key 含斜杠的视觉混乱。
 */
const COLUMN_PATH_SEP = '.'

/**
 * 生成稳定的列 key（叶子列：column.key / dataIndex；分组列：派生自路径，避免重名）。
 * `parentPath` 为父分组 key 路径（根为空串）。
 *
 * ★ M9 key 去重修复：当列既无 `key` 也无 `dataIndex` 时，回退 key 用**全局递增序号**
 * `col-${globalSeq}`（由 `toEngineColumns` 传入的计数器对象维护），保证每个匿名列
 * （无论是否跨 `toEngineColumns` 调用、是否嵌套于不同分组）都获得**唯一**回退 key。
 *
 * 之前的 bug：回退 key 用 `col-${index}`，而适配层 `Table.tsx` 的 `columnTree` 构建对每个
 * 顶层列都**独立**调 `toEngineColumns([col])`（单元素数组），导致每个匿名列的 `index` 恒为 0
 * → 多个匿名列（如 virtual-list demo 的 `Group` 列与 `Action` 列）都得到 `col-0`，
 * 表头格 React key `h-col-0` 重复。引入全局计数器后，第 N 个匿名列得到 `col-N`，全表唯一。
 */
function columnKey<RecordType>(
  col: ColumnType<RecordType>,
  parentPath: string,
  counter: { seq: number },
): string {
  const own =
    col.key !== undefined
      ? String(col.key)
      : Array.isArray(col.dataIndex)
        ? col.dataIndex.join('.')
        : col.dataIndex !== undefined
          ? String(col.dataIndex)
          : `col-${counter.seq++}`
  return parentPath ? `${parentPath}${COLUMN_PATH_SEP}${own}` : own
}

/**
 * 把 antd column 数组（**支持 children 嵌套，任意深度**）构建为引擎列树。
 *
 * 规约：
 *   - 有 children 一律视为分组列；分组列仅取 key/title/align/fixed。
 *   - 无 children 的节点视为叶子列，取 dataIndex/title/width/align/fixed/ellipsis/render。
 *   - `fixed` 透传给每个节点（M2 才真正消费 sticky；此处仅归一化字段）。
 *
 * 返回 `EngineColumnNode[]`，前序遍历即 antd 列顺序。
 *
 * ★ M9 key 去重：`counter` 是**跨调用共享**的匿名列计数器（`{ seq }`）。适配层
 * `columnTree` 构建时为整棵列树建一个 counter，逐个顶层列传入，保证全表匿名列序号唯一。
 *
 * ★ S1：`tableShowSorterTooltip` 为 Table 级 showSorterTooltip（默认 true）；列级未指定时用 Table 级。
 */
function toEngineColumns<RecordType>(
  columns: Array<ColumnType<RecordType>>,
  counter: { seq: number } = { seq: 0 },
  tableShowSorterTooltip: boolean | { target?: 'full-header' | 'sorter-icon' } | undefined = undefined,
): Array<EngineColumnNode<RecordType>> {
  const build = (
    cols: Array<ColumnType<RecordType>>,
    parentPath: string,
  ): Array<EngineColumnNode<RecordType>> =>
    cols.map((col) => {
      const path = columnKey(col, parentPath, counter)
      const hasChildren = !!col.children && col.children.length > 0
      const node: EngineColumnNode<RecordType> = {
        // ★ M9 key 去重：所有节点（叶子 + 分组）统一用完整 path 作为 key。
        //   历史上叶子节点用 `path.split(sep).pop()`（取末段），但这会让不同父分组下同名叶子
        //   退化到相同 key（如顶层 `name` 与 `Profile.name` 都变 `name`），存在潜在冲突；
        //   也让匿名回退列的 key 丢失父路径信息。统一用完整 path 既消除歧义又与分组节点一致。
        //   消费方（useStickyColumns.headerSticky Map / useColumnResize.resizedWidths Map /
        //   GridTable 表头 React key）均以 cell.key/col.key 为键，内部一致，改名安全。
        key: path,
        title: col.title,
        align: col.align,
        fixed: normalizeFixed(col.fixed),
        ellipsis: col.ellipsis,
        raw: col,
      }
      if (hasChildren) {
        node.children = build(col.children!, path)
      } else {
        node.dataIndex = col.dataIndex
        node.width = col.width
        node.render = col.render
        // M3：单元格合并 / 表头跨列 / 行标题语义透传（仅叶子列消费）。
        // onCell 的 record 类型从 ColumnType<RecordType> 传入即 RecordType，与引擎签名兼容。
        node.onCell = col.onCell
        node.colSpan = col.colSpan
        node.rowScope = col.rowScope
        // M6：隐藏列透传（仅叶子列消费；分组列的 hidden 无意义）。
        node.hidden = col.hidden
        // S1：排序相关透传（仅叶子列消费；分组列无 sorter）。
        // sortOrder 由适配层 useSorter 派生后回填（buildColumnTree 阶段），这里先透传 sorter/
        // sortDirections/showSorterTooltip（配置类字段）；sortOrder 在 columnTree useMemo 中回填。
        node.sorter = col.sorter
        node.sortDirections = col.sortDirections
        // S1：showSorterTooltip 列级优先，未指定时用 Table 级（默认 true 由引擎渲染层兜底）。
        node.showSorterTooltip = col.showSorterTooltip ?? tableShowSorterTooltip
        // S3：筛选相关透传（仅叶子列消费；分组列无筛选）。
        //   filters/onFilter/filterMultiple/filterOnClose 是配置类字段，直接透传。
        //   filteredValue 由适配层 useFilter 派生后回填（applyFilterToNode 阶段）。
        node.filters = col.filters as unknown as Array<import('./engine/types').EngineFilterItem> | undefined
        node.onFilter = col.onFilter as unknown as ((value: string | number, record: RecordType) => boolean) | undefined
        node.filterMultiple = col.filterMultiple
        node.filterOnClose = col.filterOnClose
      }
      return node
    })
  return build(columns, '')
}

function sizeToClass(size: SizeType | undefined): string | undefined {
  switch (size) {
    case 'small':
      return 'dg-size-small'
    case 'middle':
      return 'dg-size-middle'
    case 'large':
      return 'dg-size-large'
    default:
      return undefined
  }
}

/**
 * 节点是否有子列（M1 多级表头；S1 排序仅作用于叶子列）。
 */
function hasChildren<RecordType>(
  node: EngineColumnNode<RecordType>,
): boolean {
  return !!node.children && node.children.length > 0
}

/**
 * 把 useSorter 派生的 sortOrderMap + sortPriorityMap 回填到列树节点（S1 + S2）。
 *
 * 规则：
 *   - 叶子节点（无 children）：从其 raw（原始 antd column）算出 sortKey（column.key ?? dataIndex），
 *     查 sortOrderMap；命中 → 设 sortOrder；未命中但该列可排序（node.sorter 为 truthy）→ 设 null
 *     （确保引擎渲染"无序"图标态）；不可排序列保持 undefined。
 *     S2：再查 sortPriorityMap；命中（order 非 null 且多列模式下有序号）→ 设 sortPriority；
 *     否则 undefined（引擎不渲染优先级数字）。
 *   - 分组节点：递归处理 children（分组节点本身无 sortOrder）。
 *
 * 返回**浅拷贝**的节点（不改原引用），避免原 columnTree 被污染（每次 sortOrder 变化都应产生新树）。
 */
function applySortOrderToNode<RecordType>(
  node: EngineColumnNode<RecordType>,
  sortOrderMap: Map<string, import('./types').SortOrder>,
  sortPriorityMap: Map<string, number>,
): EngineColumnNode<RecordType> {
  if (hasChildren(node)) {
    // 分组节点：递归处理子节点。
    const newChildren = node.children!.map(
      (child) => applySortOrderToNode(child, sortOrderMap, sortPriorityMap),
    )
    return { ...node, children: newChildren }
  }
  // 叶子节点：回填 sortOrder。
  // 不可排序列（sorter 为 falsy）：sortOrder 保持 undefined（引擎不渲染图标）。
  if (!node.sorter) return node
  const raw = node.raw as ColumnType<RecordType> | undefined
  const sortKey = raw ? resolveColumnSortKey(raw) : undefined
  const key = sortKey !== undefined ? String(sortKey) : undefined
  const order = key !== undefined ? sortOrderMap.get(key) : undefined
  // S2：仅当该列激活（order 非 null）时查优先级序号；未激活或单列模式 → undefined。
  const priority =
    order !== null && key !== undefined ? sortPriorityMap.get(key) : undefined
  return { ...node, sortOrder: order ?? null, sortPriority: priority }
}

/**
 * 把 useFilter 派生的 filteredValueMap 回填到列树节点（S3）。
 *
 * 规则：
 *   - 叶子节点（无 children）：从其 raw（原始 antd column）算出 filterKey（与 sortKey 同算法：
 *     column.key ?? dataIndex），查 filteredValueMap；命中 → 设 filteredValue；
 *     未命中但该列可筛选（node.filters 非空 + node.onFilter）→ 设 null（确保漏斗为 Outlined 灰态）；
 *     不可筛选列保持 undefined。
 *   - 分组节点：递归处理 children。
 *
 * 返回**浅拷贝**的节点（不改原引用）。
 */
function applyFilterToNode<RecordType>(
  node: EngineColumnNode<RecordType>,
  filteredValueMap: Map<string, Array<string | number>>,
): EngineColumnNode<RecordType> {
  if (hasChildren(node)) {
    const newChildren = node.children!.map(
      (child) => applyFilterToNode(child, filteredValueMap),
    )
    return { ...node, children: newChildren }
  }
  // 不可筛选列（无 filters/onFilter）：filteredValue 保持 undefined。
  if (!node.filters || !node.onFilter) return node
  const raw = node.raw as ColumnType<RecordType> | undefined
  const filterKey = raw ? resolveFilterKey(raw) : undefined
  const key = filterKey !== undefined ? String(filterKey) : undefined
  const value = key !== undefined ? filteredValueMap.get(key) : undefined
  return { ...node, filteredValue: value ?? null }
}

/** 选择列稳定 key（用作引擎列 key 与 React key）。 */
const SELECTION_COLUMN_KEY = '__dg_selection__'

/** 展开列稳定 key（用作引擎列 key 与 React key；M9）。 */
const EXPAND_COLUMN_KEY = '__dg_expand__'

/**
 * 构造选择列叶子节点（M5）。
 *
 * 把选择列封装为一个普通 `EngineColumnNode`（无 children → 叶子），引擎无需感知"选择"语义，
 * 与 M1 多级表头 / M2 固定列 / M3 合并 / M4 虚拟滚动透明组合：
 *   - 列宽走 `rowSelection.columnWidth`（缺省 32px，对齐 antd 默认 `tableSelectionColumnWidth`）。
 *   - `fixed` 由 rowSelection.fixed 指定（与 M2 sticky 完全一致；常用于 'start'）。
 *   - `align` 默认 'center'（与 antd 一致：勾选格居中）。
 *   - `title`：表头格内容。
 *       * checkbox：渲染全选 SelectionInput（indeterminate = selection.intermediate）。
 *         hideSelectAll=true 或 radio 模式 → 空。
 *       * radio：空（antd 行为：radio 表头无全选）。
 *   - `render(text, record, index)`：表体格内容——每行 SelectionInput。
 *       * checked = selection.isSelected(key)；disabled = getCheckboxProps().disabled。
 *       * onChange：调 selection.toggleRow(key) → fireSelectionChange(nextKeys, method)。
 *
 * 因为节点无 children 且 align/width/fixed 仅依赖 rowSel 配置，每次切换勾选时虽然 selection
 * 引用变化导致 useMemo 重建 columnTree，但列布局（宽/位置/固定）不变——引擎 resolveColumnTree
 * 重算 O(cols)，sticky/cellMerge 重算，对典型表格可接受（与 antd rc-table 重渲染量级一致）。
 */
function buildSelectionColumnNode<RecordType>(
  rowSel: TableRowSelection<RecordType>,
  selection: UseRowSelectionResult<RecordType>,
  fireSelectionChange: (nextKeys: Array<React.Key>, method: RowSelectMethod) => void,
  rowKeyResolved: string | ((record: RecordType) => string | number),
): EngineColumnNode<RecordType> {
  const { columnWidth, fixed, hideSelectAll = false, align = 'center' } = rowSel
  const isRadio = selection.isRadio
  const type: 'checkbox' | 'radio' = isRadio ? 'radio' : 'checkbox'
  // 列宽默认：antd 选择列默认宽度 32px（token tableSelectionColumnWidth）。
  // 用户传 columnWidth 时覆盖；未传则用 32px（对齐 antd 默认视觉）。
  const width = columnWidth ?? 32

  // 表头格内容。
  const headerContent: ReactNode = (() => {
    if (isRadio) return null // radio 无全选
    if (hideSelectAll) return null
    return (
      <SelectionInput
        type="checkbox"
        checked={selection.allSelected}
        indeterminate={selection.intermediate}
        aria-label="Select all"
        onChange={() => {
          const next = selection.toggleAll()
          const method: RowSelectMethod = selection.allSelected ? 'none' : 'all'
          fireSelectionChange(next, method)
        }}
      />
    )
  })()

  return {
    key: SELECTION_COLUMN_KEY,
    title: headerContent,
    align,
    fixed: normalizeFixed(fixed),
    // 叶子列属性：width/render。dataIndex 不设（选择列不取数据字段）。
    width,
    render: (_text: any, record: RecordType, _index: number) => {
      const key = getRowKey(record, rowKeyResolved)
      const disabled = selection.isDisabled(record)
      const checked = selection.isSelected(key)
      const name = rowSel.getCheckboxProps?.(record)?.name
      return (
        <SelectionInput
          type={type}
          checked={checked}
          disabled={disabled}
          name={name}
          aria-label={typeof name === 'string' && name ? name : undefined}
          onChange={() => {
            if (disabled) return
            const next = selection.toggleRow(key)
            fireSelectionChange(next, 'single')
          }}
        />
      )
    },
  }
}

/**
 * 构造展开列叶子节点（M9，自研——lun 无展开图标列）。
 *
 * 把展开列封装为普通 `EngineColumnNode`（无 children → 叶子），引擎无需感知"展开"语义，
 * 与 M1 多级表头 / M2 固定列 / M3 合并 / M4 虚拟滚动 / M5 选择列透明组合：
 *   - 列宽走 `expandable.columnWidth`（缺省 48px，对齐 antd tableExpandColumnWidth 默认）。
 *   - `align` 默认 'center'（与选择列一致：展开图标居中）。
 *   - `title`：表头格空（展开列表头无内容，与 antd 一致）。
 *   - `render(text, record, index)`：表体格内容——展开/收起图标。
 *       * 可展开行（rowExpandable!==false 且 render 非 null）：渲染展开图标；点击 toggleExpand。
 *       * 不可展开行：渲染禁用态图标（antd 行为：图标灰、不响应），或不渲染（这里选禁用态，
 *         保持列宽对齐——与 antd expand demo "Not Expandable" 行视觉一致：图标可见但禁用）。
 *       * expandable.expandIcon 自定义图标优先。
 *
 * 展开图标点击 → expand.toggleExpand(key, record) → useRowExpand 更新展开态 + 触发 onExpand/onExpandedRowsChange。
 */
function buildExpandColumnNode<RecordType>(
  expandable: Expandable<RecordType>,
  expand: {
    isExpanded: (key: React.Key) => boolean
    expandableKeySet: Set<React.Key>
    toggleExpand: (key: React.Key, record: RecordType) => void
  },
  rowKeyResolved: string | ((record: RecordType) => string | number),
): EngineColumnNode<RecordType> {
  const { columnWidth, expandIcon } = expandable
  // 列宽默认：antd 展开列默认宽度 48px（token tableExpandColumnWidth）。用户传 columnWidth 覆盖。
  const width = columnWidth ?? 48
  // 展开列固定居中（与 antd 一致：展开图标居中；antd expandable 无 align 字段）。
  const align = 'center' as const
  const customIcon = typeof expandIcon === 'function' ? expandIcon : undefined

  return {
    key: EXPAND_COLUMN_KEY,
    title: null, // 展开列表头无内容（与 antd 一致）
    align,
    fixed: undefined,
    // 叶子列属性：width/render。dataIndex 不设（展开列不取数据字段）。
    width,
    render: (_text: any, record: RecordType, _index: number) => {
      const key = getRowKey(record, rowKeyResolved)
      const expandable_ = expand.expandableKeySet.has(key)
      const expanded = expand.isExpanded(key)
      // 不可展开行：渲染禁用图标（视觉占位，与 antd expand demo "Not Expandable" 行一致）。
      // 可展开行：渲染可点击展开图标。
      if (customIcon) {
        return customIcon({
          expanded,
          record,
          onExpand: (_rec, _e) => {
            if (!expandable_) return
            expand.toggleExpand(key, record)
          },
        })
      }
      return (
        <ExpandIcon
          expanded={expanded}
          disabled={!expandable_}
          onExpand={() => {
            if (!expandable_) return
            expand.toggleExpand(key, record)
          }}
        />
      )
    },
  }
}

/**
 * `Table` 对外组件（含 M9 静态属性 `Table.EXPAND_COLUMN` / `Table.SELECTION_COLUMN`，
 * 对齐 antd——在 `columns` 数组中插入哨兵对象可控制展开列 / 选择列位置）。
 *
 * 静态属性挂载在运行时 forwardRef 组件上（与 antd `ForwardTable.EXPAND_COLUMN = ...` 同款实现）。
 */
const TableComponent = forwardRef(TableInner) as <RecordType = any>(
  props: TableProps<RecordType> & { ref?: React.Ref<TableRef> },
) => React.ReactElement

// 运行时挂载静态属性（forwardRef 组件是函数对象，可挂属性；与 antd 同款实现）。
Object.assign(TableComponent, {
  EXPAND_COLUMN,
  SELECTION_COLUMN,
})

export const Table = TableComponent as typeof TableComponent & {
  EXPAND_COLUMN: typeof EXPAND_COLUMN
  SELECTION_COLUMN: typeof SELECTION_COLUMN
}

function TableInner<RecordType = any>(
  props: TableProps<RecordType>,
  ref: React.Ref<TableRef>,
) {
  const {
    columns = [],
    dataSource = [],
    rowKey = 'key',
    bordered = false,
    size,
    showHeader = true,
    title,
    footer,
    rowHeight,
    headerHeight,
    scroll,
    virtual,
    resizable = false,
    resizableMinWidth,
    resizableMaxWidth,
    rowSelection,
    expandable,
    className,
    style,
    onChange,
    showSorterTooltip,
  } = props

  const rowKeyResolved = rowKey as string | ((record: RecordType) => string | number)

  // === S1 单列 + S2 多列排序（须在 M5 选择 / M9 展开之前派生 sortedDataSource，供下游 hooks 消费）===
  // useSorter 从原始 antd columns 派生排序状态（受控/非受控、sortDirections 循环、defaultSortOrder、
  // S2 多列 multiple 优先级）。
  // - sortOrderMap：每列 sortOrder（键 = resolveColumnSortKey(column) = column.key ?? dataIndex，
  //   与 antd sorter.columnKey 取值一致）。单列模式下仅一列非 null；多列模式下可多列非 null。
  // - sortPriorityMap（S2）：多列模式下激活列的优先级序号（1-based，按 multiple 降序，
  //   multiple 最大=编号 1=最高优先级，对齐 antd getSortData 实际比较顺序）；单列模式空。
  // - sortedDataSource：非受控时为排序后的 dataSource 副本（单列直接排；多列按 multiple 链式叠加）；
  //   受控时为原 dataSource。
  // - onSorterClick：引擎表头格点击时触发（该列自身 sortDirections 循环 + 单列/多列状态切换 + onChange 分发）。
  // 注意：传入的 columns 是**已过滤哨兵**的原始 antd 列（哨兵不是可排序列）。
  const sortableColumns = useMemo(
    () =>
      (columns as Array<ColumnOrSentinel<RecordType>>).filter(
        (c): c is ColumnType<RecordType> =>
          c !== SELECTION_COLUMN && c !== EXPAND_COLUMN,
      ),
    [columns],
  )
  const { sortOrderMap, sortPriorityMap, sortedDataSource, onSorterClick, currentSorterResult } = useSorter<RecordType>({
    columns: sortableColumns,
    dataSource,
    onChange,
  })

  // === S3 基础列筛选（须在 M5 选择 / M9 展开之前派生 filteredDataSource，供下游 hooks 消费）===
  // useFilter 从原始 antd columns + sortedDataSource 派生筛选状态（受控/非受控、filteredValue、
  // defaultFilteredValue、filterMultiple）。
  // - filteredValueMap：每列激活筛选值（键 = resolveFilterKey(column) = column.key ?? dataIndex，
  //   与 sortKey 一致）。
  // - filteredDataSource：非受控时为"排序后 → 筛选后"的数据源（叠加顺序：raw → sort → filter，
  //   对齐 antd）；受控时为 sortedDataSource（外部控制）。
  // - setFilterValue：FilterDropdown 应用/重置时触发（引擎层 onFilterApply 转发到此）。
  // 注意：传入 sortedDataSource（排序后），实现 raw → sort → filter 叠加（与 antd 一致）。
  // 排序结果（sortOrderMap/sortedDataSource）变化时，useFilter 的输入随之变化，filteredDataSource
  // 重算（筛选条件基于新排序结果——虽然筛选是数据集合层面操作、与顺序无关，但叠加链顺序对齐 antd）。
  const { filteredValueMap, filteredDataSource, setFilterValue } = useFilter<RecordType>({
    columns: sortableColumns,
    dataSource: sortedDataSource,
    onFilterChange: (filters, currentDataSource) => {
      // 适配层注入最新 sorter（useSorter.currentSorterResult），组装完整 onChange。
      // sorter 取当前排序状态（非"本次筛选前的"也非"点击排序触发的 nextStates"——
      // 筛选不改变排序，sorter 应反映当前已应用的排序）。
      if (!onChange) return
      onChange({}, filters, currentSorterResult, { currentDataSource, action: 'filter' })
    },
  })

  // === M5 行选择 ===
  // 非受控默认值：仅当 rowSelection.selectedRowKeys 未传时使用 defaultSelectedRowKeys。
  // 内部用 useState 持有"非受控当前值"，受控模式（selectedRowKeys 传入）下此 state 不参与。
  const rowSel = rowSelection as TableRowSelection<RecordType> | undefined
  const isControlledSelection = rowSel ? rowSel.selectedRowKeys !== undefined : false
  const [uncontrolledKeys, setUncontrolledKeys] = useState<Array<React.Key>>(
    () => rowSel?.defaultSelectedRowKeys ?? [],
  )
  // 受控：用 rowSel.selectedRowKeys；非受控：用 uncontrolledKeys。
  const effectiveSelectedKeys: Array<React.Key> = rowSel
    ? isControlledSelection
      ? (rowSel.selectedRowKeys as Array<React.Key>)
      : uncontrolledKeys
    : []

  // 状态机：从 effectiveSelectedKeys + filteredDataSource + rowKey + getCheckboxProps 派生。
  // ★ S1：用排序后的顺序；★ S3：用筛选后的数据源（与引擎实际渲染顺序一致）。
  //   使 selectedRows 与引擎渲染顺序一致（与 antd "onChange 返回渲染后顺序的 selectedRows"语义一致）。
  // 返回 isSelected/allSelected/intermediate/isDisabled 与 toggle* 操作。
  const selection = useRowSelection<RecordType>({
    type: rowSel?.type,
    selectedRowKeys: effectiveSelectedKeys,
    dataSource: filteredDataSource,
    rowKey: rowKeyResolved,
    getCheckboxProps: rowSel?.getCheckboxProps,
  })

  // 统一 onChange 分发：更新非受控 state + 调用 rowSel.onChange。
  // selectedRows 按 selectableKeys 顺序返回（即排除 disabled 行；与 antd 一致）。
  const fireSelectionChange = useCallback(
    (nextKeys: Array<React.Key>, method: RowSelectMethod) => {
      if (!rowSel) return
      if (!isControlledSelection) {
        setUncontrolledKeys(nextKeys)
      }
      // 按 selectableKeys 顺序构造 selectedRows（disabled 行不会出现在 nextKeys 的 selectable 子集里，
      // 但 nextKeys 可能含 selectableKeys 之外的 key——antd preserveSelectedRowKeys 语义；
      // selectedRows 只回填 dataSource 中能匹配到的 record）。
      // ★ S1/S3：遍历 filteredDataSource（排序+筛选后顺序），与 antd "onChange 返回渲染后顺序的 selectedRows" 一致。
      const keySet = new Set<React.Key>(nextKeys)
      const rows: Array<RecordType> = []
      for (const rec of filteredDataSource) {
        const k = getRowKey(rec, rowKeyResolved)
        if (keySet.has(k)) rows.push(rec)
      }
      rowSel.onChange?.(nextKeys, rows, { type: method })
    },
    [rowSel, isControlledSelection, filteredDataSource, rowKeyResolved],
  )

  // === M9 行展开状态（useRowExpand hook 派生；引擎 + 展开列 render 闭包共同消费）===
  // ★ S1：用排序后的顺序；★ S3：用筛选后的数据源（与引擎实际渲染顺序一致）。
  const expand = useRowExpand<RecordType>({
    expandable: expandable as Expandable<RecordType> | undefined,
    dataSource: filteredDataSource,
    rowKey: rowKeyResolved,
  })
  const expandEnabled = expand.expandEnabled
  const showExpandColumn =
    expandEnabled && (expandable?.showExpandColumn !== false)

  // === 构建引擎列树（支持任意深度 children）。引擎内部按需退化为单层快速路径（maxDepth===1）。===
  // M5：若 rowSelection 传入，在最前插入一个"选择列"叶子节点（参与 grid 布局）。
  //   选择列的 render/title 是闭包（捕获当前 selection state），每次切换勾选都会重建 columnTree。
  //   引擎 resolveColumnTree 随之重算（O(cols)），可接受（antd rc-table 同样每次切换重渲染）。
  // M9：若 expandable 传入且至少有一行可展开，在最前插入一个"展开列"叶子节点（在选择列之后）。
  //   展开列的 render 是闭包（捕获当前 expand state），每次展开/收起都会重建 columnTree。
  //
  // === Table.EXPAND_COLUMN / Table.SELECTION_COLUMN 哨兵（M9 / order-column demo）===
  // 若 columns 数组含哨兵对象，选择列 / 展开列插在哨兵位置（而非默认最前）。
  // 不含哨兵时按默认位置：选择列最前，展开列在选择列之后。
  const selectionNode = rowSel
    ? buildSelectionColumnNode<RecordType>(
        rowSel,
        selection,
        fireSelectionChange,
        rowKeyResolved,
      )
    : null
  const expandNode =
    expandEnabled && showExpandColumn
      ? buildExpandColumnNode<RecordType>(expandable as Expandable<RecordType>, expand, rowKeyResolved)
      : null

  const columnTree = useMemo(() => {
    // 遍历 columns（含哨兵）：哨兵位置插入对应列节点；普通列走 toEngineColumns 单元素构建。
    // 收集哨兵命中信息——若未命中，按默认位置在最前插入。
    let seenSelectionSentinel = false
    let seenExpandSentinel = false
    const result: Array<EngineColumnNode<RecordType>> = []
    // ★ M9 key 去重：整棵列树共享一个匿名列计数器。每个匿名列（无 key/dataIndex）按遍历顺序
    //   得到唯一的 `col-N`，避免之前每个顶层列独立调 `toEngineColumns([col])` 导致 `index` 恒 0
    //   → 多个匿名列都回退到 `col-0` → 表头格 React key 重复（virtual-list demo 的 `Group` 与
    //   `Action` 列均无 key/dataIndex，都得到 `col-0`）。
    const anonCounter = { seq: 0 }
    for (const item of columns as Array<ColumnOrSentinel<RecordType>>) {
      if (item === SELECTION_COLUMN) {
        seenSelectionSentinel = true
        if (selectionNode) result.push(selectionNode)
        continue
      }
      if (item === EXPAND_COLUMN) {
        seenExpandSentinel = true
        if (expandNode) result.push(expandNode)
        continue
      }
      // 普通列：单元素构建（与 toEngineColumns 内部一致）；共享 anonCounter 保证全局唯一。
      const col = item as ColumnType<RecordType>
      const node = toEngineColumns<RecordType>([col], anonCounter, showSorterTooltip)[0]
      if (node) result.push(node)
    }
    // 默认位置：未命中哨兵的列插在最前（选择列在前，展开列随后）。
    if (!seenSelectionSentinel && selectionNode) result.unshift(selectionNode)
    if (!seenExpandSentinel && expandNode) {
      // 展开列在选择列之后；若选择列已 unshift 在 0，展开列插在 1，否则插在 0。
      if (!seenSelectionSentinel && selectionNode) result.splice(1, 0, expandNode)
      else result.unshift(expandNode)
    }
    return result
    // selection / expand state 变化时重建（捕获最新勾选/展开态）；columns 变化时重建。
  }, [columns, selectionNode, expandNode, showSorterTooltip])

  // 把 useSorter 派生的 sortOrderMap 回填到 columnTree 的叶子节点（引擎据此渲染排序图标 +
  // dg-column-sort 类）。回填按"原始 antd column"匹配：每个叶子引擎节点的 raw 字段保留原始列引用，
  // 从中算出 sortKey（column.key ?? dataIndex），查 sortOrderMap 得 sortOrder。
  // 未匹配的叶子节点 sortOrder 保持 undefined（引擎视为 null）。
  // S3：同时把 useFilter 派生的 filteredValueMap 回填到可筛选叶子节点（引擎据此渲染漏斗激活态 +
  //   下拉默认勾选）。
  const columnTreeWithSortAndFilter = useMemo(() => {
    // 第一步：排序回填（S1/S2）。
    let tree = columnTree
    if (sortOrderMap.size === 0) {
      // 无任何排序列 → 给所有可排序叶子节点显式设 null（确保图标渲染为"无序"态而非 undefined）。
      // 优化：仅当存在至少一个可排序列时才做回填，避免对无排序表格做无谓遍历（零回归）。
      let hasAnySorter = false
      for (const node of columnTree) {
        if (!hasChildren(node) && node.sorter) {
          hasAnySorter = true
          break
        }
      }
      if (hasAnySorter) {
        tree = columnTree.map(
          (node) => applySortOrderToNode(node, sortOrderMap, sortPriorityMap),
        )
      }
    } else {
      tree = columnTree.map(
        (node) => applySortOrderToNode(node, sortOrderMap, sortPriorityMap),
      )
    }
    // 第二步：筛选回填（S3）。仅当存在至少一个可筛选列时才做回填（零回归优化）。
    let hasAnyFilter = false
    for (const node of tree) {
      if (!hasChildren(node) && node.filters && node.onFilter) {
        hasAnyFilter = true
        break
      }
    }
    if (hasAnyFilter) {
      tree = tree.map((node) => applyFilterToNode(node, filteredValueMap))
    }
    return tree
  }, [columnTree, sortOrderMap, sortPriorityMap, filteredValueMap])

  const wrapperClass = [
    'dg-wrapper',
    sizeToClass(size),
    bordered ? 'dg-bordered' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  // 引擎层 ref（暴露 scrollTo 等）。本组件的 forwardRef ref 桥接到它。
  const engineRef = useRef<TableEngineHandle | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useImperativeHandle(
    ref,
    (): TableRef => ({
      scrollTo: (config) => {
        const engine = engineRef.current
        if (!engine) return
        // key → index：在适配层根据 rowKey 解析（引擎不感知 key 语义）。
        // ★ S1/S3：用 filteredDataSource（引擎实际渲染的数据源顺序——排序+筛选后），否则排序/筛选后
        //   scrollTo(key) 会滚到错误行。
        if (config.key !== undefined) {
          const key = config.key
          const idx = filteredDataSource.findIndex(
            (rec) => getRowKey(rec, rowKeyResolved) === key,
          )
          if (idx < 0) return
          engine.scrollTo({
            index: idx,
            offset: config.offset,
            align: config.align,
          })
          return
        }
        // antd 同名 top：合并到 scrollTop。
        if (config.scrollTop === undefined && config.top !== undefined) {
          engine.scrollTo({
            scrollTop: config.top,
            offset: config.offset,
            align: config.align,
          })
          return
        }
        engine.scrollTo({
          index: config.index,
          scrollTop: config.scrollTop,
          offset: config.offset,
          align: config.align,
        })
      },
      nativeElement: rootRef.current,
    }),
    [filteredDataSource, rowKeyResolved],
  )

  // === M9 引擎展开状态对象 ===
  // 把 useRowExpand 的派生结果封装为 EngineExpandState，传给引擎。
  // 引擎据此插展开内容 track（0fr/1fr）+ 渲染展开内容；展开列 render 闭包直接用 expand（hook 结果）。
  const engineExpandState: EngineExpandState | undefined = useMemo(() => {
    if (!expandEnabled || !expandable?.expandedRowRender) return undefined
    return {
      expandEnabled,
      isExpanded: expand.isExpanded,
      expandableKeySet: expand.expandableKeySet,
      isExpandable: (key) => expand.expandableKeySet.has(key),
      expandedRowRender: (record, index, expanded) =>
        expandable.expandedRowRender!(record, index, 0, expanded),
      toggleExpand: expand.toggleExpand,
      showExpandColumn,
      expandIcon: expandable.expandIcon,
    }
  }, [expandEnabled, expandable, expand, showExpandColumn])

  return (
    <div className={wrapperClass} style={style} ref={rootRef}>
      {title ? <div className="dg-title">{title(filteredDataSource)}</div> : null}
      <GridTable<RecordType>
        ref={engineRef as unknown as React.Ref<TableEngineHandle>}
        columnTree={columnTreeWithSortAndFilter}
        dataSource={filteredDataSource}
        rowKey={rowKeyResolved}
        rowHeight={rowHeight}
        headerHeight={headerHeight}
        showHeader={showHeader}
        scroll={scroll}
        virtual={virtual}
        resizable={resizable}
        resizableMinWidth={resizableMinWidth}
        resizableMaxWidth={resizableMaxWidth}
        expandState={engineExpandState}
        onSorterClick={onSorterClick}
        onFilterApply={setFilterValue}
      />
      {footer ? <div className="dg-footer">{footer(filteredDataSource)}</div> : null}
    </div>
  )
}

/**
 * 引擎对外暴露的句柄（仅 M4 scrollTo）。与 `engine/GridTable.tsx` 的 `GridTableHandle`
 * 结构一致（这里独立定义避免引擎类型外泄到对外 API 文档）。
 */
interface TableEngineHandle {
  scrollTo: (config: {
    index?: number
    scrollTop?: number
    offset?: number
    align?: 'start' | 'center' | 'end' | 'nearest'
  }) => void
}

export { getRowKey }
export type { TableProps, ColumnType, SizeType, TableRef } from './types'
