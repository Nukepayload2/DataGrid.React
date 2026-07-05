import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react'
import type { EngineColumnNode, EngineFilterItem, FixedSide } from './engine/types'
import {
  EXPAND_COLUMN,
  SELECTION_COLUMN,
  type ColumnOrSentinel,
  type ColumnType,
  type FilterValue,
} from './types'

export function normalizeFixed(fixed: ColumnType['fixed']): FixedSide | undefined {
  // antd v6 `fixed: true` 等价 `'left'`（固定到左侧）；data-grid 归一化为 'start'。
  if (fixed === true) return 'start'
  if (fixed === 'left' || fixed === 'start') return 'start'
  if (fixed === 'right' || fixed === 'end') return 'end'
  return undefined
}

/**
 * 把外部 `column.ellipsis`（antd v6 联合类型 `boolean | { showTitle?: boolean }`）normalize 为
 * 引擎层双字段 `{ ellipsis, showTitle }`。
 *
 * - `true` → ellipsis=true, showTitle=undefined（=默认显示 title，渲染层 `showTitle !== false` 命中）。
 * - `false` / undefined → ellipsis=undefined/false，showTitle=undefined（非 ellipsis 列，无 title）。
 * - `{ showTitle: false }` → ellipsis=true, showTitle=false（加 ellipsis 类 + **不加** native title，
 *   让 render 内 antd Tooltip 接管；antd ellipsis-custom-tooltip demo 用法）。
 * - `{ showTitle: true }` / `{}` → ellipsis=true, showTitle=undefined（=true，加类 + 加默认 title）。
 *
 * 返回 `showTitle` 仅在显式 false 时落 `false`，其余落 `undefined`（让渲染层 `!== false` 判定更简洁，
 * 避免 `showTitle: true` 与 `undefined` 在语义上分叉——两者都表示"显示默认 title"）。
 *
 * 详见 `docs/design-notes/ellipsis.md`。
 */
function normalizeEllipsis(ellipsis: ColumnType['ellipsis']): {
  ellipsis: boolean | undefined
  showTitle: boolean | undefined
} {
  if (ellipsis === true) return { ellipsis: true, showTitle: undefined }
  if (ellipsis && typeof ellipsis === 'object') {
    return {
      ellipsis: true,
      showTitle: ellipsis.showTitle === false ? false : undefined,
    }
  }
  return { ellipsis: undefined, showTitle: undefined }
}

/**
 * 路径分隔符（用于分组列 key 的层级拼接）。
 *
 * 用 `.`（点号）而非 `/`——`/` 会出现在生成的 React key 里（`h-/col-0`），与表头/单元格其它
 * key 拼写易冲突，且 antd 自身列 path 也未规定分隔符。点号是更安全的层级分隔，避免与 key 内
 * 允许出现的字符冲突，也避免 React key 含斜杠的视觉混乱。
 */
const COLUMN_PATH_SEP = '.'

/**
 * 生成稳定的列 key（叶子列：column.key / dataIndex；分组列：派生自路径，避免重名）。
 * `parentPath` 为父分组 key 路径（根为空串）。
 *
 * 当列既无 `key` 也无 `dataIndex` 时，回退 key 用**全局递增序号** `col-${globalSeq}`
 * （由 `toEngineColumns` 传入的计数器对象维护），保证每个匿名列都获得**唯一**回退 key。
 * 用 `col-${index}` 会在适配层为每个顶层列独立调 `toEngineColumns([col])`（单元素数组）时让
 * index 恒为 0 → 多个匿名列都得到 `col-0` → 表头格 React key `h-col-0` 重复。引入全局计数器后，
 * 第 N 个匿名列得到 `col-N`，全表唯一。
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
 *   - `fixed` 透传给每个节点（真正消费 sticky 的是引擎；此处仅归一化字段）。
 *
 * 返回 `EngineColumnNode[]`，前序遍历即 antd 列顺序。
 *
 * `counter` 是**跨调用共享**的匿名列计数器（`{ seq }`）。适配层 columnTree 构建时为整棵列树
 * 建一个 counter，逐个顶层列传入，保证全表匿名列序号唯一（详见 `columnKey` 注释）。
 *
 * `tableShowSorterTooltip` 为 Table 级 showSorterTooltip（默认 true）；列级未指定时用 Table 级。
 */
export function toEngineColumns<RecordType>(
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
      // normalize ellipsis（boolean | { showTitle }) → { ellipsis, showTitle } 双字段。
      const ellipsisNorm = normalizeEllipsis(col.ellipsis)
      const node: EngineColumnNode<RecordType> = {
        // 所有节点（叶子 + 分组）统一用完整 path 作为 key（消除歧义又与分组节点一致）。
        // 消费方（useStickyColumns.headerSticky Map / useColumnResize.resizedWidths Map /
        // GridTable 表头 React key）均以 cell.key/col.key 为键，内部一致，改名安全。
        key: path,
        title: col.title,
        align: col.align,
        fixed: normalizeFixed(col.fixed),
        // column.className / column.style 透传（叶子 + 分组都带；分组节点的 className/style 仅
        // 作用于分组表头格，叶子节点的作用于数据格 + 叶子表头格）。
        className: col.className,
        style: col.style,
        ellipsis: ellipsisNorm.ellipsis,
        showTitle: ellipsisNorm.showTitle,
        raw: col,
      }
      if (hasChildren) {
        node.children = build(col.children!, path)
      } else {
        node.dataIndex = col.dataIndex
        node.width = col.width
        node.render = col.render
        // 单元格合并 / 表头跨列 / 行标题语义透传（仅叶子列消费）。
        node.onCell = col.onCell
        node.colSpan = col.colSpan
        node.rowScope = col.rowScope
        // column.onHeaderCell 透传（仅叶子列消费；分组表头格无 onHeaderCell——antd 同款语义）。
        // 引擎渲染层把返回值合并到表头格 div props（className/style/onClick/...）。
        node.onHeaderCell = col.onHeaderCell
        // 隐藏列透传（仅叶子列消费；分组列的 hidden 无意义）。
        node.hidden = col.hidden
        // 排序相关透传（仅叶子列消费；分组列无 sorter）。sortOrder 由适配层 useSorter 派生后回填
        // （buildColumnTree 阶段），这里先透传 sorter/sortDirections/showSorterTooltip（配置类字段）。
        node.sorter = col.sorter
        node.sortDirections = col.sortDirections
        // showSorterTooltip 列级优先，未指定时用 Table 级（默认 true 由引擎渲染层兜底）。
        node.showSorterTooltip = col.showSorterTooltip ?? tableShowSorterTooltip
        // 筛选相关透传（仅叶子列消费；分组列无筛选）。filters/onFilter/filterMultiple/filterOnClose
        // 是配置类字段直接透传；filteredValue 由适配层 useFilter 派生后回填（applyFilterToNode 阶段）。
        node.filters = col.filters as unknown as Array<EngineFilterItem> | undefined
        node.onFilter = col.onFilter as unknown as ((value: FilterValue, record: RecordType) => boolean) | undefined
        node.filterMultiple = col.filterMultiple
        node.filterOnClose = col.filterOnClose
        // 自定义筛选面板相关字段透传（filterDropdown/filterIcon/filterDropdownProps）。
        // filterDropdown 存在时渲染层（FilterDropdown）切换为自定义面板；filterIcon 覆盖漏斗图标；
        // filterDropdownProps 透传到 antd Dropdown（open 受控 / onOpenChange / triggerClassName 等）。
        node.filterDropdown = col.filterDropdown as unknown as EngineColumnNode<RecordType>['filterDropdown']
        node.filterIcon = col.filterIcon as unknown as EngineColumnNode<RecordType>['filterIcon']
        node.filterDropdownProps = col.filterDropdownProps
        // 筛选项搜索透传（true → 默认 contains；函数 → 自定义匹配）。
        node.filterSearch = col.filterSearch as unknown as EngineColumnNode<RecordType>['filterSearch']
        // 筛选下拉展示模式透传（'tree' → 树形；'menu'/undefined → Checkbox/Radio）。
        node.filterMode = col.filterMode
        // 单元格重渲染优化透传（仅叶子列消费；components.body.cell 提供时生效）。
        node.shouldCellUpdate = col.shouldCellUpdate as EngineColumnNode<RecordType>['shouldCellUpdate']
      }
      return node
    })
  return build(columns, '')
}

/**
 * JSX children → columns 转换（对齐 antd rc-table `convertChildrenToColumns`）。
 *
 * 用 React.Children 遍历 `<Table>` 的 JSX 子元素，识别 `<Table.Column>`（→ ColumnType）与
 * `<Table.ColumnGroup>`（→ `{ title, ...rest, children: 递归转换 }`，复用多级表头），生成
 * `ColumnType[]`（等价于传 `columns` prop 的产物，下游 columnTree 构建透明消费）。
 *
 * 识别机制：
 *   - 跳过非 ReactElement 子节点（文本/null/boolean 等，与 antd `toArray().filter(isValidElement)` 一致）。
 *   - Column（叶子列）：取 props（除 children）+ React key（key !== undefined 时写入 ColumnType.key
 *     作为稳定 key，对齐 antd `convertChildrenToColumns` 把 node.key 并入 column）。
 *   - ColumnGroup（分组列）：同上取 props，并把其 JSX children **递归**转换（任意深度），写入
 *     ColumnType.children（复用多级表头渲染）。
 *   - 既非 Column 也非 ColumnGroup 的元素：按 antd 行为兼容处理（当普通列对象取 props）——
 *     data-grid 仅官方支持 Column/ColumnGroup，此处保守地透传 props（与 antd rc-table 通用
 *     `convertChildrenToColumns` 不区分 type 的行为一致）。
 *
 * React key 并入：与 antd 一致，把元素的 React key（`node.key`）作为 column.key 回填
 * （仅当 props 未显式传 key 且 node.key 存在时），保证列有稳定 key（多级表头/排序/筛选/拖拽依赖）。
 *
 * 与 antd rc-table `convertChildrenToColumns`
 * （`react-component/table/src/hooks/useColumns/index.tsx:18-37`）逐行对齐。
 *
 * 详见 `docs/design-notes/jsx-api.md`。
 */
export function convertChildrenToColumns<RecordType>(
  children: ReactNode,
): Array<ColumnType<RecordType>> {
  const nodes = Children.toArray(children).filter((node): node is ReactElement => isValidElement(node))
  return nodes.map((node) => {
    const element = node as ReactElement<Record<string, any>>
    const reactKey = element.key
    // 解构出 children（ColumnGroup 递归用），其余 props 作为列字段。
    const { children: nodeChildren, ...restProps } = element.props ?? {}
    const column: ColumnType<RecordType> = { ...restProps } as ColumnType<RecordType>
    // React key 并入（与 antd 一致：node.key 作为 column.key 回填）。
    if (column.key === undefined && reactKey !== null && reactKey !== undefined) {
      column.key = reactKey
    }
    // ColumnGroup：递归转换 JSX children → ColumnType.children（复用多级表头）。
    // 普通元素（非 Column/ColumnGroup）若有 children 也按 antd 通用路径递归（保守兼容）。
    if (nodeChildren !== undefined && nodeChildren !== null) {
      column.children = convertChildrenToColumns<RecordType>(nodeChildren)
    }
    return column
  })
}

/**
 * 列默认值合并：把 Table 级 `column` prop（列默认属性）浅合并到每个列。
 *
 * 对齐 antd `useFilledColumns`（`components/table/hooks/useFilledColumns.ts`）+
 * `@rc-component/util` 的 `mergeProps` 语义（后者覆盖前者，但 `undefined` 不覆盖已定义值）。
 *
 * 合并规则（**列自身优先**）：
 *   - 对每个普通列，浅合并 `{ ...stripUndefined(columnDefault), ...stripUndefined(col) }`，
 *     其中 `stripUndefined` 剔除值为 `undefined` 的字段。等价于 antd `mergeProps(default, col)`：
 *     col 已定义字段覆盖 default，col 未定义（undefined）字段保留 default。
 *   - **哨兵豁免**：`Table.EXPAND_COLUMN` / `Table.SELECTION_COLUMN` 哨兵对象**原样返回**（保持引用不变），
 *     因为适配层后续用 `===` 识别哨兵，合并会破坏引用相等（对齐 antd `useFilledColumns` 哨兵分支）。
 *   - **多级表头递归**：含 `children` 的分组列，对**该列自身**先做合并（剔除 `column.children`，
 *     避免错误注入分组结构——对齐 antd：`omit(column, ['children'])`），再**递归**合并其 children
 *     每一层（`column` 默认逐层下传）。
 *
 * **零回归**：`columnDefault` 为 undefined 时直接返回原 `columns` 引用（不遍历、不新建数组），
 *   保证无 column prop 的所有现有 demo 列引用不变（下游 useMemo 不重算）。
 */
export function applyColumnDefaults<RecordType>(
  columns: Array<ColumnOrSentinel<RecordType>>,
  columnDefault: Partial<ColumnType<RecordType>> | undefined,
): Array<ColumnOrSentinel<RecordType>> {
  if (!columnDefault) return columns
  // 预剔除 column 默认里的 undefined 字段 + children（避免污染分组结构）。
  const base: Partial<ColumnType<RecordType>> = {}
  for (const k of Object.keys(columnDefault) as Array<keyof ColumnType<RecordType>>) {
    if (k === 'children') continue
    const v = columnDefault[k]
    if (v !== undefined) (base as Record<string, unknown>)[k as string] = v
  }

  const merge = (col: ColumnType<RecordType>): ColumnType<RecordType> => {
    // col 自身已定义字段覆盖 base（undefined 字段不覆盖）。
    const merged: Record<string, unknown> = { ...base }
    for (const k of Object.keys(col) as Array<keyof ColumnType<RecordType>>) {
      const v = col[k]
      if (v !== undefined) merged[k as string] = v
    }
    const result = merged as unknown as ColumnType<RecordType>
    // 多级表头：递归合并 children（column 默认逐层下传）。
    if (Array.isArray(col.children) && col.children.length > 0) {
      result.children = col.children.map((child) => merge(child))
    }
    return result
  }

  return columns.map((c) => {
    if (c === SELECTION_COLUMN || c === EXPAND_COLUMN) return c
    return merge(c as ColumnType<RecordType>)
  })
}

/**
 * 把原始 antd `ColumnType[]`（可能含 children 嵌套分组）递归展开为**扁平叶子列**。
 *
 * 用途：useSorter / useFilter 的 `columns` 入参必须是扁平叶子列——内部
 * `columns.find(c => resolveColumnSortKey(c) === key)` 只扫一层，传嵌套列会让多级表头的嵌套叶子
 * （如 Other.Age）找不到 → onSorterClick/setFilterValue 静默失效。对齐 antd：antd InternalTable
 * 也是先 flattenColumns 再喂给 useSorter/useFilter。
 *
 * 哨兵列（SELECTION_COLUMN/EXPAND_COLUMN）由调用方在传入前已过滤；本函数只处理普通 ColumnType。
 * 空子节点（children 为空数组或仅含哨兵）的列视为叶子（与 isLeafColumn 语义一致）。
 */
export function flattenLeafColumns<RecordType>(
  columns: Array<ColumnType<RecordType>>,
): Array<ColumnType<RecordType>> {
  const out: Array<ColumnType<RecordType>> = []
  const walk = (list: Array<ColumnType<RecordType>>): void => {
    for (const col of list) {
      if (col.children && col.children.length > 0) {
        walk(col.children)
      } else {
        out.push(col)
      }
    }
  }
  walk(columns)
  return out
}
