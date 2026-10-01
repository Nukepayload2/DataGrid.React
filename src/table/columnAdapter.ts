import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react'
import type {
  EngineAlign,
  EngineColumnNode,
  EngineFilterItem,
  FixedSide,
} from './engine/types'
import type { Align } from './nativeOptions'
import {
  EXPAND_COLUMN,
  SELECTION_COLUMN,
  type ColumnOrSentinel,
  type ColumnType,
  type FilterValue,
} from './types'
import { devWarnOnce } from './devWarn'

export function normalizeFixed(fixed: ColumnType['fixed']): FixedSide | undefined {
  // antd v6 `fixed: true` 等价 `'left'`（固定到左侧）；data-grid 归一化为 'start'。
  if (fixed === true) return 'start'
  if (fixed === 'left' || fixed === 'start') return 'start'
  if (fixed === 'right' || fixed === 'end') return 'end'
  return undefined
}

/**
 * 归一对齐取值（缺口 #13）：antd 用物理值 `left|center|right`，本库的落点是逻辑值
 * `start|center|end`（`data-align` + `table.css` 的 `[data-align='center'|'end']` 两条规则）。
 *
 * 与同仓库 `normalizeFixed` 同款「双取值输入 + 内部归一」姿态：**只放宽输入，不给 CSS 补
 * `[data-align='right']` 规则**——落点保持单一真源，`'right'` 与 `'end'` 渲染结果全等。
 * 未识别的取值（含 undefined）返回 undefined，与旧实现一致（不写 data-align）。
 */
export function normalizeAlign(align: Align | undefined): EngineAlign | undefined {
  if (align === 'left' || align === 'start') return 'start'
  if (align === 'right' || align === 'end') return 'end'
  if (align === 'center') return 'center'
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
 * 详见 `docs/features/display/ellipsis.md` 的「hover 提示」一节。
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
 * 规约（19-A 之后按实现事实）：
 *   - 有 children 一律视为**分组列**。分组列携带：`key/title/align/fixed/className/style/
 *     ellipsis/showTitle/raw` + **整族筛选字段**（`filters/onFilter/filtered/filterMultiple/
 *     filterOnClose/defaultFilteredValue/filterResetToDefaultFilteredValue/filterDropdown/
 *     filterIcon/filterDropdownProps/filterSearch/filterMode`）——参照 antd@6.4.4
 *     `es/table/hooks/useFilter/index.js` 的 `getMergedColumns/collectFilterStates/injectFilter`
 *     三环都把分组节点本身算进筛选收集面与漏斗宿主（详见下方赋值处注释）。
 *   - 分组列**不**携带的字段（仍仅叶子消费）：`dataIndex/width/render/onCell/colSpan/rowScope/
 *     onHeaderCell/hidden/sorter 家族/shouldCellUpdate/gridColumnOptions`。
 *     数据格只按叶子渲染，故这些"落到某一格数据/布局"的字段在分组列上无意义；
 *     `sorter` 刻意保持不扩展，理由见下方 sorter 分支注释与步骤 49 日志 §7。
 *   - 无 children 的节点视为叶子列，取上述全部字段。
 *   - `fixed` 透传给每个节点（真正消费 sticky 的是引擎；此处仅归一化字段）。
 *
 * 返回 `EngineColumnNode[]`，前序遍历即 antd 列顺序。
 *
 * `counter` 是**跨调用共享**的匿名列计数器（`{ seq }`）。适配层 columnTree 构建时为整棵列树
 * 建一个 counter，逐个顶层列传入，保证全表匿名列序号唯一（详见 `columnKey` 注释）。
 *
 * `tableShowSorterTooltip` 为 Table 级 showSorterTooltip（默认 true）；列级未指定时用 Table 级。
 *
 * `tableSortDirections` 为 Table 级 `sortDirections`（antd `TableProps.sortDirections`）；
 * **本文件是「列级 → 表级」这条回退判据在本仓的唯一实现点**（23-A，步骤 59）。参照侧的合并是**两级两处**：
 *   - `node_modules/antd/es/table/InternalTable.js:223`（6.4.4）`sortDirections || ['ascend','descend']`
 *     ⇒ 表级值先与内置默认序列合并，作为 `useSorter` 的 `defaultSortDirections`；
 *   - `node_modules/antd/es/table/hooks/useSorter.js:75` `newColumn.sortDirections || defaultSortDirections`
 *     ⇒ 列级优先，结果同时喂渲染（`:89`/`:94` 的 `includes` 决定 caret **节点存在性**、`:98` 的
 *     `!!(upNode && downNode)` 决定 `-full`）与点击循环（`:82`）。
 * 参照把它放在列变换阶段 ⇒ 等价落点就是本函数（`showSorterTooltip` 的同形先例见上一个参数）。
 *
 * ⚠ **刻意不在此烘 `DEFAULT_SORT_DIRECTIONS`**（`['ascend','descend']` 那一段）：两级都不配时本字段保持
 * `undefined`，`SortIndicator` 走既有缺省分支（两枚 caret 都在、不带 `-full`）——**节点计数与参照一致**，
 * 差的是参照会给外层加的语义标记类 `-column-sorter-full`（参照该侧类**无任何 CSS 规则**，
 * `grep -rn "sorter-full" node_modules/antd/es/` 只命中 `useSorter.js:101`；本仓 compat 矩阵
 * `tests/table/features/Table.sorter.test.tsx:56` 已把它登记为「无对应类」）。烘默认值会把
 * `Table.filter.test.tsx.snap` 4 条 + `Table.sorter.test.tsx.snap` 2 条基线一起改写（实测
 * `grep -l column-sorter tests/table/features/__snapshots__/*.snap`）⇒ 留作交回项，理由与读数见
 * `tmp/vortex-logs/fix-real-bugs/59-implementer-23a-wiring.md` §3.1 K4。
 * 参照用 `||`（falsy）而此处用 `??`：数组域两者只在 `null/undefined` 上取值相同（`[]` 是 truthy ⇒
 * 两级都**不**回落默认，参照实测 `sortDirections: []` 画 0 枚 caret）⇒ 与参照等价。
 */
export function toEngineColumns<RecordType>(
  columns: Array<ColumnType<RecordType>>,
  counter: { seq: number } = { seq: 0 },
  tableShowSorterTooltip: boolean | { target?: 'full-header' | 'sorter-icon' } | undefined = undefined,
  tableSortDirections: Array<'ascend' | 'descend'> | undefined = undefined,
): Array<EngineColumnNode<RecordType>> {
  const build = (
    cols: Array<ColumnType<RecordType>>,
    parentPath: string,
  ): Array<EngineColumnNode<RecordType>> =>
    cols
      // 分组列 hidden（29-D 修复，BAT-35 35-A）：对齐 antd@6.4.4 `@rc-component/table`
      // `useColumns/index.js:26-37` `filterHiddenColumns`——`hidden: true` 的**分组列**连同整棵
      // 子树从列树移除（不进引擎、不占 track）。叶子列 `hidden` 仍走本仓 0fr track 方案（保留 DOM
      // + `.dg-cell-hidden`，`gridTemplateColumnsUtils.ts:86`），二者判据分离。与 responsive 过滤同形
      // （`compat/column.ts:573`：responsive 列进本函数前已从 columns 数组移除）。
      .filter((col) => !(col.hidden === true && !!col.children && col.children.length > 0))
      .map((col) => {
      const path = columnKey(col, parentPath, counter)
      warnFunctionTitleOnce(col, path) // 函数式 title 告警（判据与去重只此一份，见文件末尾）
      const hasChildren = !!col.children && col.children.length > 0
      // normalize ellipsis（boolean | { showTitle }) → { ellipsis, showTitle } 双字段。
      const ellipsisNorm = normalizeEllipsis(col.ellipsis)
      const node: EngineColumnNode<RecordType> = {
        // 所有节点（叶子 + 分组）统一用完整 path 作为 key（消除歧义又与分组节点一致）。
        // 消费方（useStickyColumns.headerSticky Map / useColumnResize.resizedWidths Map /
        // GridTable 表头 React key）均以 cell.key/col.key 为键，内部一致，改名安全。
        key: path,
        title: col.title,
        // align 归一（缺口 #13）：antd 物理值 left/right → 引擎逻辑值 start/end。
        align: normalizeAlign(col.align),
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
        // 隐藏列透传（仅叶子列消费；分组列的 `hidden: true` 在上方 `build` 的 filter 里连同子树
        // 移除，不会走到这里——见 29-D 修复注释）。
        node.hidden = col.hidden
        // 排序相关透传（仅叶子列消费；分组列无 sorter）。sortOrder 由适配层 useSorter 派生后回填
        // （buildColumnTree 阶段），这里先透传 sorter/sortDirections/showSorterTooltip（配置类字段）。
        //   ⚠ 本批（BAT-19 19-A）**刻意没有**把 sorter 家族扩到分组列：参照对分组列的 `sorter`
        //   只认「画箭头 + 点击生效 + 受控 sortOrder」、不认 `defaultSortOrder`（antd@6.4.4
        //   `es/table/hooks/useSorter.js:34-68` 的 children 分支 vs `:70` 的 injectSorter 门），
        //   而我方 useSorter 的入参是**单一扁平 columns 数组**、collectSortStates 对两类列一视同仁
        //   ⇒ 照搬会新增一条「分组列 defaultSortOrder 生效」的分叉。要对齐得动 `engine/sorterUtils.ts`
        //   （本批禁改）。探针 A4/A5 读数与判据见步骤 49 日志 §2.1、缺项见 §7。
        node.sorter = col.sorter
        // 生效排序方向（23-A 端到端收尾）：**列级优先，未配时用表级**——判据与参照落点见函数头注释
        // （`InternalTable.js:223` 表级∥默认、`useSorter.js:75` 列级∥表级）。两级都不配时留 `undefined`
        // （不烘默认序列，理由＝§函数头 K4）⇒ 渲染层走缺省分支、点击循环由 `engine/useSorter.ts:255` 收尾。
        node.sortDirections = col.sortDirections ?? tableSortDirections
        node.sortIcon = col.sortIcon
        // showSorterTooltip 列级优先，未指定时用 Table 级（默认 true 由引擎渲染层兜底）。
        node.showSorterTooltip = col.showSorterTooltip ?? tableShowSorterTooltip
        // 单元格重渲染优化透传（仅叶子列消费；components.body.cell 提供时生效）。
        node.shouldCellUpdate = col.shouldCellUpdate as EngineColumnNode<RecordType>['shouldCellUpdate']
        // data-grid 列级专属选项透传给引擎层（recycling renderer、列拖拽锁定等）。
        node.gridColumnOptions = col.gridColumnOptions
      }
      // === 筛选字段族：分组列与叶子列**同等**抄载（BAT-19 19-A）===
      // 参照 antd@6.4.4 `es/table/hooks/useFilter/index.js`：
      //   · `getMergedColumns:151-156` 对 `'children' in column` 返回 `[column, ...子层扁平]`
      //     ⇒ **分组节点自身就在筛选收集面内**（不是"只取叶子"）；
      //   · `collectFilterStates:8-41` 逐层收集（`:36-38` 再递归 children）；
      //   · `injectFilter:42-85` 把漏斗挂在该列的 title 宿主上 ⇒ 分组表头格同样是漏斗宿主。
      // 此前这批字段只在叶子分支抄载 ⇒ 用户在分组列上写的 filters/onFilter/defaultFilteredValue/
      // filteredValue 整族在列树构建这一环就被静默丢弃（探针读数：dg 4 行 vs antd 2 行、
      // dg 0 漏斗 vs antd 1 漏斗，步骤 49 日志 §2.1 A1/A2/A3）。
      // filters/onFilter/filterMultiple/filterOnClose/filterSearch/filterMode 是配置类字段直接透传；
      // filteredValue **不在此处**——由适配层 useFilter 派生后回填（`sortFilterAdapter.applyFilterToNode`）。
      // 自定义筛选面板三字段（filterDropdown/filterIcon/filterDropdownProps）一并透传：
      //   FilterDropdown 渲染层据此切换内置 Checkbox/Radio 与自定义面板、覆盖漏斗图标、
      //   并把 filterDropdownProps 透传给 antd Dropdown（open 受控 / onOpenChange / triggerClassName 等）。
      node.filters = col.filters as unknown as Array<EngineFilterItem> | undefined
      node.onFilter = col.onFilter as unknown as ((value: FilterValue, record: RecordType) => boolean) | undefined
      node.filtered = col.filtered
      node.filterMultiple = col.filterMultiple
      node.filterOnClose = col.filterOnClose
      node.defaultFilteredValue = col.defaultFilteredValue
      node.filterResetToDefaultFilteredValue = col.filterResetToDefaultFilteredValue
      node.filterDropdown = col.filterDropdown as unknown as EngineColumnNode<RecordType>['filterDropdown']
      node.filterIcon = col.filterIcon as unknown as EngineColumnNode<RecordType>['filterIcon']
      node.filterDropdownProps = col.filterDropdownProps
      // 筛选项搜索透传（true → 默认 contains；函数 → 自定义匹配）。
      node.filterSearch = col.filterSearch as unknown as EngineColumnNode<RecordType>['filterSearch']
      // 筛选下拉展示模式透传（'tree' → 树形；'menu'/undefined → Checkbox/Radio）。
      node.filterMode = col.filterMode
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
 * （本仓实装的 `@rc-component/table` 1.10.2 `es/hooks/useColumns/index.js:6-25`）逐行对齐。
 *
 * 详见 `docs/features/api/jsx-api.md` 的「children → columns 转换」一节。
 */
export function convertChildrenToColumns<RecordType>(
  children: ReactNode,
): Array<ColumnType<RecordType>> {
  const columns: Array<ColumnType<RecordType>> = []
  Children.forEach(children, (node) => {
    if (!isValidElement(node)) return
    const element = node as ReactElement<Record<string, any>>
    if (element.type === Fragment) {
      columns.push(...convertChildrenToColumns<RecordType>(element.props.children))
      return
    }
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
    columns.push(column)
  })
  return columns
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
 * 把原始 antd `ColumnType[]`（可能含 children 嵌套分组）递归展开为**扁平叶子列**（分组列本身不进结果）。
 *
 * 现在的唯一消费者是**排序侧**（`Table.tsx` 的 `sortableColumns` → `useSorter`）。
 * 参照形状（实读 antd@6.4.4）：`InternalTable.js:219-221` 与 `:238-242` 把**未扁平的** `mergedColumns`
 * 同时喂给 `useSorter` 和 `useFilter`，展平发生在各自 hook 内部——
 *   · `useSorter.js:34-68` 的 `collectSortStates` 自己递归 `children`（分组列**仅在
 *     `'sortOrder' in column` 时**入态，`defaultSortOrder` 只走叶子分支）；
 *   · `useFilter/index.js:151-156` 的 `getMergedColumns` 展平但**保留分组节点本身**。
 * 我方两个 hook 的 `columns` 入参都是**扁平**列表（内部按一层 `find`），故由适配层展平后传入：
 * 排序侧取叶子集（等价于参照 `collectSortStates` 对叶子的收集），筛选侧取含分组集
 * （见本文件 `flattenAllColumns`）。
 *
 * 历史：筛选侧在 BAT-19 之前与本函数共用入参，导致分组列上写的筛选配置整族被丢
 * （探针读数 dg 4 行 vs antd 2 行；步骤 49 日志 §2.1）。缺这层展平本身会让多级表头的嵌套叶子
 * （如 Other.Age）在 `columns.find(c => resolveColumnSortKey(c) === key)` 里找不到 →
 * onSorterClick 静默失效。
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

/**
 * 前序展开为**含分组列自身**的扁平列数组——逐字对齐 antd 6.4.4
 * `es/table/hooks/useFilter/index.js:151-156` 的 `getMergedColumns`：
 *
 * ```js
 * const getMergedColumns = rawMergedColumns => rawMergedColumns.flatMap(column => {
 *   if ('children' in column) {
 *     return [column].concat(_toConsumableArray(getMergedColumns(column.children || [])));
 *   }
 *   return [column];
 * });
 * ```
 *
 * 即：分组列**自己**也进结果（后跟其全部后代），叶子列只出现一次。
 * 这是筛选侧（`useFilter` 的 `columns` 入参）的正确形状——参照的
 * `collectFilterStates` 在这样一份列表上逐条判 `filters || filterDropdown || 'onFilter' in column`，
 * 所以写在分组列上的筛选配置会参与过滤，其表头格也是漏斗宿主。
 *
 * 与参照的一处**刻意差异**：参照在无 `key`/`dataIndex` 时用位置串（`getColumnPos`）兜底当键，
 * 而我方 `resolveFilterKey`（`engine/columnKeys.ts`）对这类匿名列返回 `undefined` ⇒ 直接**跳过**。
 * 该形状在叶子侧早已存在（不是本批新造的口径），且位置串键会把用户没写的字段暴露进
 * `onChange.filters`，故保持现状、仅在此登记（步骤 49 日志 §7）。
 *
 * 排序侧不吃本函数（见 `flattenLeafColumns` 头注释与本文件 sorter 分支注释）。
 */
export function flattenAllColumns<RecordType>(
  columns: Array<ColumnType<RecordType>>,
): Array<ColumnType<RecordType>> {
  const out: Array<ColumnType<RecordType>> = []
  const walk = (list: Array<ColumnType<RecordType>>): void => {
    for (const col of list) {
      out.push(col)
      if (col.children && col.children.length > 0) walk(col.children)
    }
  }
  walk(columns)
  return out
}

/* ------------------------------------------------------------------ *
 * 函数式 `column.title` 的开发态告警（BAT-23 23-E）
 * —— 本块**刻意放在文件末尾**：往前插会让别的文件引用的 `columnAdapter.ts:行号` 锚点整段位移。
 * ------------------------------------------------------------------ */

/**
 * 「函数式 `column.title`」告警的**唯一**判据 + 去重点。
 *
 * 背景（实测形状见 `docs/reference/known-limitations.md` 的「列与表头」一节）：参照把函数当
 * `column.title` 的公开能力（`antd 6.4.4 es/table/interface.d.ts:72` ＋ `es/table/util.js:14-19`
 * 的 `renderColumnTitle` 直接 `title(props)`），本包只收 `ReactNode` ⇒ 传函数时**渲染面静默失效**：
 * 标题渲染为空、不抛错（框架对"函数当 React child"只写一条 console 错误、按父组件名去重、永不抛），
 * 开 `ellipsis` 时连原生 `title` 悬浮提示属性也一起丢。本批**不移植能力**（属功能移植），
 * 只把静默变显式 ⇒ 下面的告警是**纯观测面**，不改任何渲染结果。
 *
 * 为什么发在**归一层**而不是两条渲染路径各发一遍：`toEngineColumns` 是全仓唯一的引擎列树生产者
 * （唯一调用点 `useColumnTreeBuilder.ts:130`），flat 路径（`engine/FlatColumnCells.tsx`）与 multi
 * 路径（`engine/HeaderCell.tsx`）读的都是它产出的同一份 `columnTree`（`engine/GridTable.tsx:305-322`）
 * ⇒ 这里发一次＝两条路径都覆盖，分组列（`children`）的函数标题也顺带覆盖，判据不必写两份。
 * 实测反证：改到渲染层会因 StrictMode 双渲染每路径各发两遍（`tmp/71-evidence-falsify-dedupe-off.log`）。
 *
 * 通道：走 `[data-grid]` 唯一出口 `devWarnOnce`（`./devWarn.ts`）——环境门、前缀、去重表都在那一份里
 * 判一次，本文件不写第二份；参照侧同样是"带环境门＋带去重"的封装（`antd 6.4.4 es/_util/warning.js:13-19`）。
 *
 * 去重键＝该列在列树里的**路径键**（`key` / `dataIndex` / 匿名序号 `col-N` 三选一的同源结果，见
 * `columnKey`），作为 `devWarnOnce` 的 `onceKey` 传入（语义级"每列只说一次"，测试态也不复位）：
 * 同一列因 `columnTree` 重建（选列/展开节点变化、`columns` 字面量变化）被反复构建时只发一次；
 * 不同列各发一次（消息里带的就是这个键，用户据此定位）。代价＝同一个列键在第二个 Table
 * 实例上不再重发（去重表在 `devWarn.ts` 里是模块级）——开发诊断取"宁可少说也不刷屏"，
 * 登记在 known-limitations 的「告警与开发期提示」一节。
 */

/**
 * 把列身份写成"有什么就说什么"的一段（供告警定位到具体列）。
 * 优先 `key`，其次 `dataIndex`（数组按 `.` 连接，与 `columnKey` 同形），两者都没有时用列树路径
 * （`col-N`，即匿名列序号）。
 */
function describeColumnIdentity<RecordType>(
  col: ColumnType<RecordType>,
  path: string,
): string {
  if (col.key !== undefined) return `key=\`${String(col.key)}\``
  if (col.dataIndex !== undefined) {
    const flat = Array.isArray(col.dataIndex) ? col.dataIndex.join('.') : String(col.dataIndex)
    return `dataIndex=\`${flat}\``
  }
  return `column #\`${path}\` (no \`key\`/\`dataIndex\`)`
}

/** 函数式 title ⇒ 开发态发一条能定位到该列的告警（每列至多一次，去重表在 `devWarn.ts`）。 */
function warnFunctionTitleOnce<RecordType>(col: ColumnType<RecordType>, path: string): void {
  if (typeof col.title !== 'function') return
  devWarnOnce(
    `\`column.title\` of the column with ${describeColumnIdentity(col, path)} is a function, ` +
      'which this package does not support: the header cell renders **empty** (nothing is thrown), ' +
      'and with `ellipsis` the native `title` tooltip attribute is dropped as well. ' +
      'Pass a ReactNode instead (functional titles are antd-only).',
    `column-title-function:${path}`,
  )
}
