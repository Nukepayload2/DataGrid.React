/**
 * data-grid 列定义类型。
 *
 * `ColumnType` 接口是 data-grid 列定义的主入口，覆盖真实业务常用的字段集
 * （key/title/dataIndex/width/align/fixed + render/onCell/sorter/filter/ellipsis/hidden/responsive 等）。
 * 字段集与 antd `TableProps['columns'][number]` 同名同义，便于直接迁移。
 */
// 按业务域从 compatTypes.ts 拆出；filter/sort 域类型由各自子模块 `import type` 纯类型引入。

import type { ReactNode } from 'react'
import type { Breakpoint } from 'antd'
import type { Align, FixedInput } from '../nativeOptions'
import type {
  ColumnFilterDropdownProps,
  ColumnFilterItem,
  FilterDropdownProps,
  FilterValue,
} from './filter'
import type { ColumnSorter, SortDirections, SortOrder } from './sort'
import type { GridColumnOptions } from '../engine/recyclingCellTypes'

type PrimitiveValue =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined
  | Date
  | ((...args: Array<any>) => any)

export type DeepNamePath<RecordType> =
  DeepNamePathDepth<RecordType, 4>

type PreviousDepth = [never, 0, 1, 2, 3, 4]

type DeepNamePathDepth<RecordType, Depth extends number> =
  [Depth] extends [never]
    ? never
    : RecordType extends PrimitiveValue
      ? never
      : RecordType extends ReadonlyArray<infer Item>
        ? readonly [number] | readonly [number, ...DeepNamePathDepth<Item, PreviousDepth[Depth]>]
        : {
            [Key in keyof RecordType & (string | number)]:
              RecordType[Key] extends PrimitiveValue
                ? readonly [Key]
                : readonly [Key] | readonly [Key, ...DeepNamePathDepth<RecordType[Key], PreviousDepth[Depth]>]
          }[keyof RecordType & (string | number)]

export type DataIndex<RecordType = any> =
  | string
  | number
  | readonly (string | number)[]
  | DeepNamePath<RecordType>

/**
 * @deprecated data-grid only consumes `children` from this legacy object form.
 * Use `onCell` for colSpan/rowSpan and custom body-cell props.
 */
export interface RenderedCell {
  /** @deprecated data-grid only consumes `children`; use `onCell` for colSpan/rowSpan and custom body-cell props. */
  props?: Record<string, any>
  children?: ReactNode
}

/**
 * 列定义（data-grid 列类型，覆盖真实业务常用的 antd column 子集）。
 * `dataIndex` 支持字符串/数字/路径数组。
 */
export interface ColumnType<RecordType = any> {
  /**
   * 列唯一 key。
   *
   * **用途**：列拖拽排序（`columnDragSort.onSort` 回调里的列标识）、React key 复用、
   * 筛选状态对象 `{ [columnKey]: filteredValue[] }` 的 key 来源、受控排序 `{ columnKey }` 标识。
   *
   * **缺省兜底**：未提供时按 `dataIndex` 兜底；`dataIndex` 也未提供时按列在数组中的索引兜底。
   * 多级表头 / 筛选 / 排序 / 拖拽场景**建议显式提供稳定 key**，避免因列顺序变化导致标识漂移。
   *
   * 与 antd `column.key` 同义。
   */
  key?: React.Key
  /**
   * 列标题内容：**只收 ReactNode**（字符串最常见，也可 JSX）。分组列（有 `children`）的 `title` 作分组标题、叶子列的作表头格内容。
   *
   * **与 antd `column.title` 的一处不同**：参照类型是 `ReactNode | ((props) => React.ReactNode)`（`antd 6.4.4
   * es/table/interface.d.ts:72`，遇函数即调用：`es/table/util.js:14-19`）；本包不收函数（属功能移植、未提供）。
   * JS 侧传函数的实测形状（两条表头路径 × 各档同形）：表头**渲染为空且不抛错**（框架只写一条按父组件名
   * 去重的 console 错误），开 `ellipsis` 时原生 `title` 悬浮提示同档丢失。
   * 开发态有一条 `[data-grid]` 告警按 `key`/`dataIndex`/列序号点名该列（判据在归一层
   * `columnAdapter.warnFunctionTitleOnce`，**前缀拼接、按 key 去重与"仅非 `production` 才发"的环境门都在出口
   * `src/table/devWarn.ts`**；TS 侧由类型面拦住）。
   */
  title?: ReactNode
  /**
   * 取值字段路径。
   *
   * **取值**：
   *   - 字符串：取 `record[dataIndex]`（如 `'name'`）。
   *   - 数字：按数组下标取值（用于 record 字段是数组的场景）。
   *   - 路径数组：嵌套 record 取值（如 `['user', 'address', 'city']` 取 `record.user.address.city`）。
   *
   * **用途**：默认单元格渲染（无 `render` 时直接显示 `record[dataIndex]`）、
   * 排序默认比较字段（`sorter: true` 时按本字段值比较）、筛选 onChange 的 filters 对象 key 兜底
   * （当 `column.key` 未提供时以 `dataIndex` 作 key）。
   *
   * 与 antd `column.dataIndex` 同义（data-grid 同样支持路径数组形态）。
   */
  dataIndex?: DataIndex<RecordType>
  /**
   * data-grid 列级专属选项命名空间。
   *
   * **与 antd 不兼容**：antd `ColumnType` 没有 min/max 列宽约束、dragColumnLock / cell 渲染钩子 等概念，
   * 故 dg 列级专属字段一律归入此命名空间（顶层 `ColumnType` 只保留与 antd 同名同义字段）。
   *
   *   - `minWidth` / `maxWidth`：列宽约束，布局与列宽拖拽共同遵循。
   *   - `dragColumnLock`：列拖拽锁定模式（列拖拽排序）。
   */
  gridColumnOptions?: GridColumnOptions<RecordType>
  /**
   * 列宽。
   *
   * **取值**：
   *   - number：px（如 `100` → `100px`）。
   *   - string：原样作为 CSS 长度（如 `'30%'`、`'10em'`、`'100px'`）。
   *
   * **缺省语义**：未提供（undefined）时该列按内容和可用空间自适应，不强加固定下限。
   *
   * 与列宽拖拽（`gridOptions.resizable`）组合：拖拽结果会覆盖本字段的运行时宽度。
   */
  width?: number | string
  /**
   * 单元格内容对齐方式。
   *
   * **取值**：`'start'`（默认，视觉左对齐）/ `'center'`（居中）/ `'end'`（视觉右对齐）。
   *
   * **生效范围**：本列**所有数据单元格 + 表头格**的对齐都由本字段决定（与 antd 一致）。
   *
   * **与 antd 差异**：antd 取 `'left' | 'center' | 'right'`；data-grid 用 CSS Logical Properties
   * 风格的 `'start' | 'center' | 'end'`（在 LTR 上下文下视觉等价 antd 取值）。
   */
  align?: Align
  /**
   * 固定列（sticky）。
   *
   * **取值**：
   *   - `true` / `'left'` / `'start'`：固定在表格左侧（多列固定按声明顺序从左到右叠放，
   *     sticky left 偏移按其左侧已固定列宽累加）。
   *   - `'right'` / `'end'`：固定在表格右侧（sticky right 偏移按其右侧已固定列宽累加）。
   *   - `false` / undefined：普通列（随横向滚动）。
   *
   * **生效条件**：固定列视觉仅在启用横向滚动（`scroll.x`）时显现（否则无横向位移，sticky 无视觉差异）。
   * 多级表头下分组列的 `fixed` 透传到全部子叶子；合并单元格（`onCell` colSpan / rowSpan）跨固定列
   * 边界的行为与 antd 一致。
   *
   * 与 antd `column.fixed` 同义（data-grid 额外接受 `'start'` / `'end'` 别名）。
   */
  fixed?: FixedInput
  /**
   * 该列单元格的额外 className。
   *
   * 注入到本列所有数据单元格 + 表头格。
   *
   * ★ 与 antd 差异：antd 把 className 作用于 `<td>`/`<th>`；data-grid 用 div 渲染，
   *   className 合并到单元格 div（与语义化 `body.cell`/`header.cell` 同款注入路径）。
   *
   * 未提供（undefined）时不注入（零回归）。
   *
   * 同名同义于 antd v6 `column.className`。
   *
   * @internal 数据格对应 `.dg-cell-body`、表头格对应 `.dg-cell-header`；grid 渲染下直接合并到
   *   单元格 div 的 className 列表。
   */
  className?: string
  /**
   * 该列单元格的额外 inline style。
   *
   * 注入到本列所有数据单元格 + 表头格，与 `className` 同款注入（合并到单元格 style，覆盖同名字段）。
   *
   * 未提供（undefined）时不注入（零回归）。
   *
   * 同名同义于 antd v6 `column.style`。
   *
   * @internal 与 className 同款注入路径：grid 渲染下合并到单元格 div 的 style。
   */
  style?: import('react').CSSProperties
  /**
   * 表头格 props 注入。
   *
   * 签名 `(column, index) => React.HTMLAttributes`：
   *   - `column`：该列表头格对应的原始 antd 列定义（调用方一般不读，直接返回固定 props）。
   *   - `index`：表头行号（单层表头恒 0；多级表头按行号）。
   *   - 返回值整体合并到表头格 div 的 props（className/style/onClick/... 与 onCell 同款透传）。
   *
   * **与 antd 一致**：返回值合并到 `<th>`（data-grid 是表头格 div）；典型用法为列拖拽（drag-column-sorting demo
   *   `onHeaderCell: () => ({ id: ... })` 注入 dnd 标识）、表头点击交互等。
   *
   * **与 onCell 对称**：onCell 注入数据格，onHeaderCell 注入表头格。
   *
   * 未提供（undefined）时不注入（零回归）。
   *
   * 同名同义于 antd v6 `column.onHeaderCell`。
   */
  onHeaderCell?: (
    column: ColumnType<RecordType>,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
  /**
   * 单元格内容省略号（text-overflow:ellipsis）。
   *
   * 取值：
   *   - `true`：单元格/表头加 ellipsis CSS 类（`text-overflow:ellipsis` +
   *     `white-space:nowrap` + `overflow:hidden`）+ **默认 native `title`** 悬浮提示
   *     （hover 显示完整文本；对齐 antd 默认 `showTitle: true`）。
   *   - `false` / undefined：不省略、无 title（零回归）。
   *   - 对象 `{ showTitle?: boolean }`（对齐 antd v6）：
   *       * `showTitle: false` → 加 ellipsis CSS 类（仍省略），但**关闭默认 native title**，
   *         让用户在 `render` 内自行包 antd `<Tooltip>` 接管 hover 提示
   *         （antd ellipsis-custom-tooltip demo 用法）。
   *       * `showTitle: true` / 缺省 → 等价 `ellipsis: true`（加类 + 加默认 title）。
   *
   * 取值形态同名同义于 antd v6 `column.ellipsis`（含 `{ showTitle?: boolean }` 对象形态）。
   *
   * @internal 适配层 normalize：`true` / `{showTitle:true}` / `{}` → ellipsis=true & showTitle=true；
   *   `{showTitle:false}` → ellipsis=true & showTitle=false；`false`/undefined → ellipsis=false。
   *   title 属性挂在单元格 `.dg-cell-inner` 上。已知视觉 gap：列宽默认 max-content 使 ellipsis 列
   *   track=content 宽，cell-inner 不溢出 → 视觉无 `...`（CSS 契约正确，缺列宽约束）；核心验证
   *   showTitle 开关 + Tooltip hover，不依赖省略号视觉生效。
   */
  ellipsis?: boolean | { showTitle?: boolean }
  /**
   * 隐藏该列。
   *
   *   - `true`：该列的可视内容不渲染（表头格 + 数据单元格均隐藏）。
   *   - `false` / undefined：正常渲染。
   *
   * **多级表头**：分组列（有 `children`）的 `hidden: true` 连同其整棵子树一起移除——
   *   对齐 antd@6.4.4 `@rc-component/table` `useColumns/index.js:26-37` `filterHiddenColumns`：
   *   `hidden` 的列从列树剔除，分组列被剔除时其子叶子一并消失（29-D 修复，BAT-35 35-A）；
   *   叶子列的 `hidden` 走本仓 0fr track 方案（保留 DOM + `.dg-cell-hidden`，见下方 @internal）。
   *
   * **与各能力组合**：隐藏列宽度计为 0，固定列 sticky 偏移按可见叶子列累加；合并单元格仍跨原叶子区间；
   * 多级表头父分组格随子叶子收缩；选择列作为普通叶子列参与，同样可被 hidden。
   *
   * 同名同义于 antd `column.hidden`。
   *
   * @internal 实现采用 **grid track `0fr`** 方案：把该叶子列对应的 `grid-template-columns`
   *   一条 track 置为 `0fr`（track 仍存在、列线号不变），单元格内容用 `visibility:hidden` +
   *   `overflow:hidden` 隐藏；`.dg-grid` 上 `transition: grid-template-columns` 实现 `0fr↔1fr`
   *   平滑过渡。track 数保持不变是关键设计——多级表头父格 `grid-column` 范围、合并格
   *   `grid-column: span N`、固定列 sticky 偏移、虚拟窗口都因此透明。
   */
  hidden?: boolean
  /**
   * antd render：(text, record, index) => ReactNode | RenderedCell。
   *
   * data-grid only consumes `children` from the legacy RenderedCell object form.
   * `props` is obsolete because antd also warns this shape has perf issues.
   * Use `onCell` for colSpan/rowSpan and custom body-cell props.
   */
  render?: (text: any, record: RecordType, index: number) => ReactNode | RenderedCell
  /**
   * 子列（多级表头，任意深度）。
   *
   * 有 children 时该列视为**分组列**。分组列被消费的字段：
   *   - 布局/外观：`key`/`title`/`align`/`fixed`/`className`/`style`/`ellipsis`/`showTitle`；
   *   - **筛选整族**（BAT-19 19-A 起）：`filters`/`onFilter`/`filteredValue`/`defaultFilteredValue`/
   *     `filterMultiple`/`filterOnClose`/`filterResetToDefaultFilteredValue`/`filtered`/
   *     `filterDropdown`/`filterIcon`/`filterDropdownProps`/`filterSearch`/`filterMode`。
   *     ⇒ 分组列自己就是一个可筛选列：它的配置参与数据过滤，它的**分组表头格**就是漏斗宿主
   *     （与 antd 6.4.4 同形：`es/table/hooks/useFilter/index.js` 的
   *     `getMergedColumns:151-156` 保留分组节点本身 + `collectFilterStates:8-41` 逐层收集 +
   *     `injectFilter:42-85` 把漏斗挂在该列自己的 title 宿主上）。
   *     修复前的行为是**静默丢弃**（写了不报错、也不生效，行数与表头都和 antd 分叉），
   *     读码链路与探针读数见 `tmp/vortex-logs/fix-real-bugs/49-implementer-bat19-group-filter.md`。
   *
   * 分组列**不**消费的字段（仍只作用于叶子列）：
   *   - `dataIndex`/`width`/`render`/`onCell`/`colSpan`/`rowScope`/`onHeaderCell`/`hidden`/
   *     `shouldCellUpdate`/`gridColumnOptions`：数据格只按叶子渲染，这些"落到某一格数据/布局"
   *     的字段在分组列上没有对应宿主（`hidden` 见上方该字段的说明）。
   *   - `sorter`/`sortOrder`/`defaultSortOrder`/`sortDirections`/`sortIcon`/`showSorterTooltip`：
   *     **本批刻意未改**。antd 6.4.4 对分组列的 `sorter` 只认「画箭头 + 点击生效 + 受控 `sortOrder`」，
   *     不认 `defaultSortOrder`（`es/table/hooks/useSorter.js:34-68` 的 children 分支 vs `:70` 的
   *     injectSorter 门），与我方排序入参形状不同构——要对齐需另开一批（结论与读数同上日志 §2.1）。
   */
  children?: Array<ColumnType<RecordType>>
  /**
   * 表头格横向跨列数。
   *
   * **语义（与 antd 一致，与 children 多级表头是不同机制）**：
   *   - `colSpan: N`（N>=2）：该表头格横向跨 N 个叶子列。
   *     后续 `N-1` 个**叶子列**的表头格必须显式声明 `colSpan: 0`（被覆盖，不渲染表头）。
   *     这是**单层表头里某列横向跨多列**，与 `children` 多级表头（多层结构）互斥/不同。
   *   - `colSpan: 0`：该表头格被前面的 colSpan>1 表头覆盖，**不渲染表头格**（叶子列的数据单元格正常渲染）。
   *   - 不设/`colSpan: 1`：普通单列表头格。
   *
   * 注意：data-grid 内部仅支持 `colSpan`（表头跨列）；多级表头请用 `children`。
   * 两者**不要在同一列上混用**（与 antd 行为一致）。
   */
  colSpan?: number
  /**
   * 行语义（仅影响 a11y/视觉占位，不影响布局）。
   * antd `rowScope: 'row'` 表示该列是"行标题列"（first column 常用，视觉上加粗）。
   * data-grid 将其渲染为 `<th scope="row">` 语义；非 rowScope 列保持普通单元格。
   * 本字段不影响合并算法。
   */
  rowScope?: 'row'
  /**
   * 单元格事件 + 合并入口。
   *
   * antd column.onCell 签名：`(record, index) => { colSpan?, rowSpan?, className?, onClick?, ... }`。
   * 返回值**整体**透传给 `components.body.cell` 作为 props（与 antd v6 一致：返回值合并到
   * td/cell 组件的 props）。data-grid 消费其中的 `colSpan` / `rowSpan`：
   *   - `colSpan: N`（N>=2）：当前数据行该格向右合并 N 个叶子列（含自身）。
   *     紧随其后的 `N-1` 个叶子列在该行的单元格必须由它们各自的 onCell 返回 `colSpan: 0`（被覆盖，不渲染）。
   *   - `rowSpan: N`（N>=2）：当前格向下合并 N 行（含自身）。被覆盖行的同列格由其 onCell 返回 `rowSpan: 0`。
   *   - `colSpan: 0` 或 `rowSpan: 0`：该格被覆盖，**不渲染**（避免占位错乱）。
   *   - 不设/1：普通单格。
   *
   * 单元格编辑 edit-cell：onCell 返回值的**其余字段**（除 colSpan/rowSpan）会透传给
   * `components.body.cell` 组件作为 props（典型用法：返回 `{ record, editable, dataIndex,
   * title, handleSave }` 给自定义 EditableCell）。与 antd demo edit-cell 的 onCell 写法一致。
   *
   * colSpan/rowSpan 与其余字段正交——合并格仍可携带编辑 props，编辑 props 不影响合并。
   *
   * @internal 合并由 cellMerge 模块消费，其余字段由 GridTable 渲染层透传。
   */
  onCell?: (record: RecordType, index: number) => Record<string, any> | undefined
  /**
   * 排序器。
   *
   * **语义（对齐 antd `column.sorter`）**：
   *   - `true`：该列可排序，用默认比较（按 `dataIndex` 字段值升序，数值/字符串通用）。
   *   - 函数 `(a, b, sortOrder?) => number`：自定义比较；返回值同 `Array.prototype.sort`。
   *   - `false` / undefined：该列不可排序（表头无排序图标、不响应排序点击）。
   *   - 对象 `{ compare, multiple }`：多列排序（multiple 为优先级数字）。
   *
   * **前端排序**（非受控）：data-grid 按当前 `sortOrder` + `sorter` 对 dataSource 排序后渲染；
   * **受控排序**（外部传 `sortOrder`）：data-grid 不主动排序，调用方在 onChange 后自行更新 dataSource；
   *   data-grid 仍按 `sortOrder` 显示排序图标、触发 onChange。
   *
   * 与各能力组合：排序只改变数据行顺序，不改变列结构（多级表头/固定列/合并/虚拟/选择/展开均不受影响）。
   */
  sorter?: ColumnSorter<RecordType>
  /**
   * 受控排序方向。传入即受控（data-grid 不主动排序，调用方负责 dataSource）。
   * 与 `defaultSortOrder` 互斥：`sortOrder` 优先。
   */
  sortOrder?: SortOrder
  /** 非受控初始排序方向。仅当 `sortOrder` 未传时生效（初始态）。 */
  defaultSortOrder?: SortOrder
  /**
   * 点击表头切换排序的循环顺序。
   * 默认 `['ascend', 'descend']`；循环到末尾后隐式回退到 `null`（取消排序）。
   * 对齐 antd：值数组不含 `null`，`null` 是循环到末尾的隐式回退。
   * 例：`['descend']` → 初次点击 descend → 再点 null（取消）。
   */
  sortDirections?: SortDirections
  /** 自定义排序图标。函数收到当前排序方向（未排序为 null）。 */
  sortIcon?: (props: { sortOrder: SortOrder }) => ReactNode
  /**
   * 是否显示排序提示 tooltip（非阻塞）。
   * hover 排序列表头时显示"点击排序"提示。
   * - `true`（默认）：显示。
   * - `false`：不显示。
   * - 对象 `{ target: 'full-header' | 'sorter-icon' }`：控制 tooltip 绑定目标
   *   （`full-header` 整表头格，`sorter-icon` 仅图标）。简化为始终绑定到图标区域。
   */
  showSorterTooltip?: boolean | { target?: 'full-header' | 'sorter-icon' }
  /**
   * 筛选项列表。
   *
   * **语义**：数组非空 + 配 `onFilter` 时该列表头渲染筛选漏斗图标，点击弹出筛选下拉。
   *   - 顶层项作为勾选项参与筛选（`text` 显示，`value` 作为 onFilter 第一参 + onChange filters 数组元素）。
   *   - `children`（树形筛选）保留字段但**不做二级菜单 UI**——出现时内部扁平化为顶层项参与勾选
   *     （行为与 antd 默认 menu 模式下的扁平化相近，但不渲染二级菜单 UI；属 tree 模式消费）。
   *
   * 与 `onFilter` 配合：onFilter(value, record) 决定该 value 是否"命中" record；
   * 多选时命中任一即保留该 record（OR 语义）；单选时只保留命中该 value 的 record。
   * 同名同义于 antd `column.filters`。
   */
  filters?: Array<ColumnFilterItem>
  /**
   * 筛选判定函数。
   *
   * 签名 `(value, record) => boolean`：返回 true 表示该 value 命中该 record。
   * 与 `filters` 配合：当前选中值集合中**任一**命中即保留该 record（OR 语义，对齐 antd）。
   *
   * **前端筛选**（非受控）：data-grid 按 `filters` + `onFilter` 对 dataSource 过滤后渲染
   * （与排序叠加：antd 顺序 raw → sort → filter，即先排序后过滤）。
   * **受控筛选**（外部传 `filteredValue`）：data-grid 不主动过滤，调用方在 onChange 后自行更新 dataSource；
   *   data-grid 仍按 `filteredValue` 显示漏斗激活态、触发 onChange。
   * 同名同义于 antd `column.onFilter`。
   */
  onFilter?: (value: FilterValue, record: RecordType) => boolean
  /** 强制筛选图标显示激活态。用于服务端筛选等场景，数据处理仍由调用方负责。 */
  filtered?: boolean
  /**
   * 是否多选（默认 true）。
   * - `true`（默认）：Checkbox.Group 多选，命中任一保留（OR）。
   * - `false`：Radio 单选，仅保留命中该 value 的 record。
   *
   * 同名同义于 antd `column.filterMultiple`。
   */
  filterMultiple?: boolean
  /**
   * 非受控初始筛选值。仅当 `filteredValue` 未传时生效（初始态）。
   */
  defaultFilteredValue?: Array<FilterValue> | null
  /**
   * 受控筛选值。传入即受控（data-grid 不主动过滤，调用方负责 dataSource）。
   * 与 `defaultFilteredValue` 互斥：`filteredValue` 优先。
   *
   * 传 `[]`（空数组）表示"无激活筛选"（受控显式空）；传非空数组表示激活筛选。
   * （注意与 undefined 区分：undefined 表示该列非受控，由 defaultFilteredValue 初始化。）
   */
  filteredValue?: Array<FilterValue> | null
  /**
   * 点击重置时是否恢复到 defaultFilteredValue。
   * false / undefined 时重置为空筛选。
   */
  filterResetToDefaultFilteredValue?: boolean
  /**
   * 关闭下拉即应用筛选（默认 true）。
   *
   * - `true`（默认）：**内置面板**关闭（点触发器/点面板外/ESC/确定按钮）即把当前勾选应用为 filteredValue。
   * - `false`：必须点"确定"按钮才应用；关闭下拉（点外部/ESC）丢弃未确认的勾选（恢复到上次应用值）。
   * - **传了 `filterDropdown`（自定义面板）时本字段不起作用：关闭从不应用**。
   *   面板内的值是调用方自己的草稿，只有他自己调 `confirm()` / `clearFilters({ confirm: true })` 才算应用
   *   （否则用户在面板里"随手改的草稿"会静默生效、甚至把他**已生效的筛选顶掉/清空**）。
   *
   * 参照条款（antd **6.4.4** `es/table/hooks/useFilter/FilterDropdown.js:240-251`）有**两道门**：
   *   - 门 ①（`:241`）`info.source === 'trigger'`——`onOpenChange` 第 2 参的 `source`，
   *     实测取值只有 `'trigger'`（点触发器/点面板外/ESC）与 `'menu'`（弹层内 antd `<Menu>` 点项）；
   *   - 门 ②（`:247`）`!newVisible && !column.filterDropdown && filterOnClose`——**自定义面板从不因关闭而应用**。
   *
   * ⇒ 本包**两道门都接**（`src/table/engine/FilterDropdown.tsx` 的 `handleOpenChange`）：
   *   - 门 ②（`filterOnClose && !isCustom`）：**自定义面板从不因关闭而应用**，默认值（true）与门 ② 语义都与 antd 6.4.4 同形；
   *   - 门 ①（`info.source === 'trigger'`，**BAT-35 35-E 接**）：弹层内 antd `<Menu>` 点项（`source==='menu'`）
   *     不算关闭 ⇒ 面板保持打开、不透传 `onOpenChange(false)`（与参照一致；改前我方关、参照不关）。
   *   同名同义于 antd `column.filterOnClose`（antd 6.4.4 `es/table/interface.d.ts:117`，同为列级字段）。
   */
  filterOnClose?: boolean
  /**
   * 自定义筛选下拉面板。
   *
   * **语义**：传入即**取代**内置 Checkbox/Radio 下拉。data-grid 把它渲染进 antd Dropdown 的
   * popupRender，并按 antd 兼容签名注入 props（`selectedKeys`/`setSelectedKeys`/`confirm`/
   * `clearFilters`/`visible`/`close`/`prefixCls`/`filters`）。调用方在面板内自绘搜索框、
   * 自定义勾选 UI 等，通过 `confirm`/`clearFilters` 与 data-grid 交互（onFilter 仍按选中 keys 过滤）。
   *
   * 也可传 ReactNode（非函数）——此时直接渲染为下拉内容，无法获得 confirm 等 props（与 antd 一致）。
   * 一般用法是函数。
   *
   * 与 `onFilter` 关系：自定义面板只是替换**下拉 UI**；实际过滤仍由 `onFilter` 完成
   * （filterDropdown 的 selectedKeys 经 confirm 应用为 filteredValue）。
   * 故即使使用 filterDropdown，仍须提供 `onFilter`。
   *
   * 与内置 `filters` 关系：filterDropdown 存在时不渲染内置 Checkbox/Radio（即使同时配置了
   * `filters` 也忽略其 UI——但 filters 仍可用于 onChange 的 filters 形态来源等）。
   * 同名同义于 antd `column.filterDropdown`。
   *
   * @internal 过滤管线由 `useFilter` 实现：filterDropdown 的 selectedKeys 经 confirm 应用为
   *   filteredValue，再由 useFilter 过滤。
   */
  filterDropdown?:
    | React.ReactNode
    | ((props: FilterDropdownProps) => React.ReactNode)
  /**
   * 自定义漏斗图标。
   *
   * 函数签名 `(filtered: boolean) => ReactNode`：filtered=true 表示该列有激活筛选（图标激活态）。
   * 也可直接传 ReactNode（恒定图标，不随激活态变化）。
   *
   * 缺省：未提供时由 data-grid 默认渲染漏斗图标（未激活态/激活态）。
   *
   * 同名同义于 antd `column.filterIcon`。
   *
   * @internal 缺省图标为 FilterOutlined（未激活）/ FilterFilled（激活）。
   */
  filterIcon?: React.ReactNode | ((filtered: boolean) => React.ReactNode)
  /**
   * 透传给筛选下拉的 props。
   *
   * 用于受控打开（`open`）、`onOpenChange` 订阅、`triggerClassName`/`overlayClassName` 等。
   * 与内置 Dropdown 集成：open 受控配置优先。
   *
   * 同名同义于 antd `column.filterDropdownProps`（since 5.22）。
   */
  filterDropdownProps?: ColumnFilterDropdownProps
  /**
   * 筛选下拉展示模式（默认 `'menu'`）。
   *
   * 取值：
   *   - `'menu'`（默认）：内置扁平下拉（Checkbox.Group 多选 / Radio.Group 单选）。
   *     顶层 `filters` 项作为勾选项参与筛选；`children` 扁平化展示（不渲染二级菜单 UI）。
   *   - `'tree'`：内置**树形**下拉（antd `<Tree checkable>`）。`filters` 含 `children` 时渲染为树形结构
   *     （父子缩进 + 展开图标），勾选父子联动（`checkStrictly=false`，即勾父自动勾全部子、勾全部子自动勾父）。
   *     选中值（含各级 value，含半选父级若用户主动勾选）作为 filteredValue，`onFilter` 对每个勾选 value
   *     逐一判定（OR 语义，与 menu 一致）。
   *
   * 与 `filterSearch` 组合：tree 模式下 filterSearch 过滤**树节点**（命中节点 + 保留祖先链维持结构，
   * 对齐 antd `Tree.filterTreeNode`）；输入为空显全树。
   *
   * 与 `filterDropdown`（自定义面板）关系：filterDropdown 存在时**取代**内置下拉（含 tree）——
   * filterMode 仅对内置 Checkbox/Radio vs Tree 切换生效。
   *
   * 默认 `'menu'`：现有 head/filter-search/custom-filter-panel 等不设 filterMode 的列仍走 menu 分支（零回归）。
   * 同名同义于 antd `column.filterMode`。
   */
  filterMode?: 'menu' | 'tree'
  /**
   * 筛选项搜索。
   *
   * 对**内置下拉面板**生效（menu 模式：Checkbox.Group/Radio.Group 顶部渲染搜索框过滤扁平项；
   * tree 模式：antd `<Tree filterTreeNode>` 过滤树节点）；自定义面板（`filterDropdown`）不消费此字段。
   *
   * 取值：
   *   - `true`：默认匹配。item.text 转字符串后 **trim + toLowerCase**，**包含**输入（trim+toLowerCase）即命中
   *     （对齐 antd FilterSearch 默认 `searchValueMatched`）。
   *   - `(input, record) => boolean`：自定义匹配。`input` 为已 normalize 的输入（trim+toLowerCase，
   *     与 antd 一致——antd 在 menu 模式传 `normalizedSearchValue`），`record` 为筛选项
   *     `{ text, value, children? }`（与 `ColumnFilterItem` 同构）。返回 true 表示该项保留显示。
   *   - `false` / undefined：不渲染搜索框（默认）。
   *
   * 输入为空时显示全部筛选项（不过滤）。
   * 关闭下拉时清空搜索值（对齐 antd `useEffect[visible]` 清空；下次打开为空）。
   *
   * menu 模式（默认）与 tree 模式（`filterMode='tree'`）均消费 filterSearch：
   *   - menu：过滤扁平筛选项列表（命中保留）。
   *   - tree：过滤树节点（命中保留 + 保留祖先链维持结构，对齐 antd `Tree.filterTreeNode`）。
   * 同名同义于 antd `column.filterSearch`。
   *
   * @internal data-grid 引擎层筛选项内部类型为 `EngineFilterItem`，与 `ColumnFilterItem` 同构。
   */
  filterSearch?:
    | true
    | ((input: string, record: ColumnFilterItem) => boolean)
  /**
   * 单元格重渲染优化。
   *
   * 签名 `(prevRecord, nextRecord) => boolean`：返回 `false` 时该单元格在 record 变化时**不重渲染**
   * （沿用上一次渲染结果）；返回 `true` 或不提供时正常重渲染。用于编辑/复杂单元格场景的性能优化
   * （避免无关 record 字段变化触发昂贵重渲染）。
   *
   * 注意：仅当 `components.body.cell` 提供时本字段才被消费（默认渲染路径不消费，零回归）。
   *
   * 同名同义于 antd `column.shouldCellUpdate`。
   */
  shouldCellUpdate?: (prevRecord: RecordType, nextRecord: RecordType) => boolean
  /**
   * 响应式列显隐：按视口断点决定该列是否渲染。
   *
   * **语义**：
   *   - `undefined` / 空数组：该列**始终显示**（所有现有 demo 的默认行为，零回归）。
   *   - 非空 `Breakpoint[]`：仅当**任一**列出的断点在当前视口下激活时，该列才显示；否则该列
   *     从渲染中**整体移除**（表头格 + 表体单元格均不渲染，列号不占位）。
   *
   * 断点激活判定对齐 antd `Grid.useBreakpoint`——返回
   * `{ xs, sm, md, lg, xl, xxl, xxxl }` 各断点布尔。`screens[bp] === true` 表示
   * 当前视口 **>= bp**（即该断点及其以上都激活）。故 `responsive: ['md']` 实际语义是
   * **md 及以上视口显示**（与 antd responsive demo 注释 "medium screen or bigger" 一致）。
   *
   * 取值（antd `Breakpoint`，7 个）：`'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl'`
   * （来自 antd responsiveArray）。
   *
   * 与各能力组合：被移除的列不参与排序/筛选/选择/固定/合并/虚拟——所有现有机制透明（列号自然收缩）。
   * 树形/编辑等以列位置为基础的机制也正确（过滤发生在列结构构建前）。
   * 同名同义于 antd `column.responsive`（since 4.x）；断点激活判定对齐 antd `Grid.useBreakpoint`。
   *
   * @internal 匹配算法与实现位置对齐 antd InternalTable（mergedColumns 派生时过滤）：
   *   Table 适配层在构建列树前用 `Grid.useBreakpoint` 过滤 columns——responsive 不匹配的列
   *   直接从 columns 数组移除（不进入 `toEngineColumns` / 引擎列树），引擎层无需感知 responsive。
   *   匹配式：`matched = Object.keys(screens).filter(bp => screens[bp])`，
   *   显示该列 ⇔ `!responsive || responsive.some(r => matched.includes(r))`。
   */
  responsive?: Array<Breakpoint>
}

/**
 * 列数组别名（`Array<ColumnType<RecordType>>`）。
 *
 * data-grid 的分组列通过 `ColumnType.children` 表达，因此该入口形状与
 * antd `ColumnsType<T>` 同构，便于直接迁移。
 */
export type ColumnsType<RecordType = any> = Array<ColumnType<RecordType>>
