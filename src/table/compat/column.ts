/**
 * antd column 兼容类型。
 *
 * `ColumnType` 接口：antd `TableProps['columns'][number]` 的 data-grid 实现，覆盖 demo 用到的字段集。
 */
// 按业务域从 compatTypes.ts 拆出；filter/sort 域类型由各自子模块 `import type` 纯类型引入。

import type { ReactNode } from 'react'
import type { Breakpoint } from 'antd/es/_util/responsiveObserver'
import type { Align, FixedInput } from '../nativeOptions'
import type {
  ColumnFilterDropdownProps,
  ColumnFilterItem,
  FilterDropdownProps,
  FilterValue,
} from './filter'
import type { ColumnSorter, SortDirections, SortOrder } from './sort'
import type { GridColumnOptions } from '../engine/recyclingCellTypes'

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
 * antd column 子集（demo 用到的）。
 * `dataIndex` 支持字符串/数字/路径数组（与 antd 一致）。
 */
export interface ColumnType<RecordType = any> {
  key?: React.Key
  title?: ReactNode
  dataIndex?: string | number | Array<string | number>
  /**
   * data-grid 列级专属选项命名空间。
   *
   * **与 antd 不兼容**：antd `ColumnType` 没有 dragColumnLock / cell 渲染钩子 等概念，
   * 故 dg 列级专属字段一律归入此命名空间（顶层 `ColumnType` 只保留与 antd 同名同义字段）。
   *
   *   - `dragColumnLock`：列拖拽锁定模式（列拖拽排序）。
   */
  gridColumnOptions?: GridColumnOptions<RecordType>
  width?: number | string
  align?: Align
  fixed?: FixedInput
  /**
   * 该列单元格的额外 className（对齐 antd v6 `column.className`）。
   *
   * 注入到本列所有数据单元格 + 表头格。
   *
   * ★ 与 antd 差异：antd 把 className 作用于 `<td>`/`<th>`；data-grid 用 div 渲染，
   *   className 合并到单元格 div（与语义化 `body.cell`/`header.cell` 同款注入路径）。
   *
   * 未提供（undefined）时不注入（零回归）。
   *
   * @internal 数据格对应 `.dg-cell-body`、表头格对应 `.dg-cell-header`；grid 渲染下直接合并到
   *   单元格 div 的 className 列表。
   */
  className?: string
  /**
   * 该列单元格的额外 inline style（对齐 antd v6 `column.style`，对齐 antd 列类型）。
   *
   * 注入到本列所有数据单元格 + 表头格，与 `className` 同款注入（合并到单元格 style，覆盖同名字段）。
   *
   * 未提供（undefined）时不注入（零回归）。
   *
   * @internal 与 className 同款注入路径：grid 渲染下合并到单元格 div 的 style。
   */
  style?: import('react').CSSProperties
  /**
   * 表头格 props 注入（对齐 antd v6 `column.onHeaderCell`）。
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
   */
  onHeaderCell?: (
    column: ColumnType<RecordType>,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
  /**
   * 省略号（对齐 antd v6 `column.ellipsis`）。
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
   * 详见 `docs/features/display/ellipsis.md`；列宽与省略号视觉的关系见
   * `docs/features/columns/column-width.md`。
   *
   * @internal 适配层 normalize：`true` / `{showTitle:true}` / `{}` → ellipsis=true & showTitle=true；
   *   `{showTitle:false}` → ellipsis=true & showTitle=false；`false`/undefined → ellipsis=false。
   *   title 属性挂在单元格 `.dg-cell-inner` 上。已知视觉 gap：列宽默认 max-content 使 ellipsis 列
   *   track=content 宽，cell-inner 不溢出 → 视觉无 `...`（CSS 契约正确，缺列宽约束）；核心验证
   *   showTitle 开关 + Tooltip hover，不依赖省略号视觉生效。
   */
  ellipsis?: boolean | { showTitle?: boolean }
  /**
   * 隐藏该列（对齐 antd `column.hidden`）。
   *
   *   - `true`：该叶子列的可视内容不渲染（表头格 + 数据单元格均隐藏）。
   *   - `false` / undefined：正常渲染。
   *
   * **多级表头**：分组列（有 `children`）的 `hidden` 字段**无效**——只有叶子列的 `hidden` 生效
   *   （与 antd 一致：隐藏分组列请隐藏其全部子叶子；父分组格随子叶子收缩自动横向收起）。
   *
   * **与各能力组合**：隐藏列宽度计为 0，固定列 sticky 偏移按可见叶子列累加；合并单元格仍跨原叶子区间；
   * 多级表头父分组格随子叶子收缩；选择列作为普通叶子列参与，同样可被 hidden。
   *
   * 详见 `docs/features/columns/hidden-column.md`。
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
   * 有 children 时该列视为分组列（仅取 key/title/align/fixed）；
   * 叶子列属性（dataIndex/width/render）仅取自无 children 的节点。
   *
   * 详见 `docs/features/layout/header-and-span.md`。
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
   *
   * 详见 `docs/features/layout/header-and-span.md`。
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
   *
   * 详见 `docs/features/interaction/filter-sorter.md`。
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
   * 筛选项列表（对齐 antd `column.filters`）。
   *
   * **语义**：数组非空 + 配 `onFilter` 时该列表头渲染筛选漏斗图标，点击弹出筛选下拉。
   *   - 顶层项作为勾选项参与筛选（`text` 显示，`value` 作为 onFilter 第一参 + onChange filters 数组元素）。
   *   - `children`（树形筛选）保留字段但**不做二级菜单 UI**——出现时内部扁平化为顶层项参与勾选
   *     （行为与 antd 默认 menu 模式下的扁平化相近，但不渲染二级菜单 UI；属 tree 模式消费）。
   *
   * 与 `onFilter` 配合：onFilter(value, record) 决定该 value 是否"命中" record；
   * 多选时命中任一即保留该 record（OR 语义）；单选时只保留命中该 value 的 record。
   *
   * 详见 `docs/features/interaction/filter-sorter.md`。
   */
  filters?: Array<ColumnFilterItem>
  /**
   * 筛选判定函数（对齐 antd `column.onFilter`）。
   *
   * 签名 `(value, record) => boolean`：返回 true 表示该 value 命中该 record。
   * 与 `filters` 配合：当前选中值集合中**任一**命中即保留该 record（OR 语义，对齐 antd）。
   *
   * **前端筛选**（非受控）：data-grid 按 `filters` + `onFilter` 对 dataSource 过滤后渲染
   * （与排序叠加：antd 顺序 raw → sort → filter，即先排序后过滤）。
   * **受控筛选**（外部传 `filteredValue`）：data-grid 不主动过滤，调用方在 onChange 后自行更新 dataSource；
   *   data-grid 仍按 `filteredValue` 显示漏斗激活态、触发 onChange。
   *
   * 详见 `docs/features/interaction/filter-sorter.md`。
   */
  onFilter?: (value: FilterValue, record: RecordType) => boolean
  /**
   * 是否多选（对齐 antd `column.filterMultiple`，默认 true）。
   * - `true`（默认）：Checkbox.Group 多选，命中任一保留（OR）。
   * - `false`：Radio 单选，仅保留命中该 value 的 record。
   */
  filterMultiple?: boolean
  /**
   * 非受控初始筛选值。仅当 `filteredValue` 未传时生效（初始态）。
   */
  defaultFilteredValue?: Array<FilterValue>
  /**
   * 受控筛选值。传入即受控（data-grid 不主动过滤，调用方负责 dataSource）。
   * 与 `defaultFilteredValue` 互斥：`filteredValue` 优先。
   *
   * 传 `[]`（空数组）表示"无激活筛选"（受控显式空）；传非空数组表示激活筛选。
   * （注意与 undefined 区分：undefined 表示该列非受控，由内部 state / defaultFilteredValue 驱动。）
   */
  filteredValue?: Array<FilterValue> | null
  /**
   * 关闭下拉即应用筛选（对齐 antd `column.filterOnClose`，默认 true）。
   *
   * - `true`（默认）：用户关闭下拉（点击外部/ESC/确定按钮）即把当前勾选应用为 filteredValue。
   * - `false`：必须点"确定"按钮才应用；关闭下拉（点外部/ESC）丢弃未确认的勾选（恢复到上次应用值）。
   *
   * 对齐 antd v6 默认行为（filterOnClose=true）。
   */
  filterOnClose?: boolean
  /**
   * 自定义筛选下拉面板（对齐 antd `column.filterDropdown`）。
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
   *
   * 详见 `docs/features/interaction/filter-sorter.md`。
   *
   * @internal 过滤管线由 `useFilter` 实现：filterDropdown 的 selectedKeys 经 confirm 应用为
   *   filteredValue，再由 useFilter 过滤。
   */
  filterDropdown?:
    | React.ReactNode
    | ((props: FilterDropdownProps) => React.ReactNode)
  /**
   * 自定义漏斗图标（对齐 antd `column.filterIcon`）。
   *
   * 函数签名 `(filtered: boolean) => ReactNode`：filtered=true 表示该列有激活筛选（图标激活态）。
   * 也可直接传 ReactNode（恒定图标，不随激活态变化）。
   *
   * 缺省：未提供时由 data-grid 默认渲染漏斗图标（未激活态/激活态）。
   *
   * @internal 缺省图标为 FilterOutlined（未激活）/ FilterFilled（激活）。
   */
  filterIcon?: React.ReactNode | ((filtered: boolean) => React.ReactNode)
  /**
   * 透传给筛选下拉 antd Dropdown 的 props（对齐 antd `column.filterDropdownProps`，since 5.22）。
   *
   * 用于受控打开（`open`）、`onOpenChange` 订阅、`triggerClassName`/`overlayClassName` 等。
   * 与内置 Dropdown 集成：data-grid 把这些 props 合并到 antd Dropdown（open 受控优先于内部 state）。
   */
  filterDropdownProps?: ColumnFilterDropdownProps
  /**
   * 筛选下拉展示模式（对齐 antd `column.filterMode`，默认 `'menu'`）。
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
   *
   * 详见 `docs/features/interaction/filter-sorter.md`。
   */
  filterMode?: 'menu' | 'tree'
  /**
   * 筛选项搜索（对齐 antd `column.filterSearch`）。
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
   *
   * 详见 `docs/features/interaction/filter-sorter.md`。
   *
   * @internal data-grid 引擎层筛选项内部类型为 `EngineFilterItem`，与 `ColumnFilterItem` 同构。
   */
  filterSearch?:
    | true
    | ((input: string, record: ColumnFilterItem) => boolean)
  /**
   * 单元格重渲染优化（对齐 antd `column.shouldCellUpdate`）。
   *
   * 签名 `(prevRecord, nextRecord) => boolean`：返回 `false` 时该单元格在 record 变化时**不重渲染**
   * （沿用上一次渲染结果）；返回 `true` 或不提供时正常重渲染。用于编辑/复杂单元格场景的性能优化
   * （避免无关 record 字段变化触发昂贵重渲染）。
   *
   * 注意：仅当 `components.body.cell` 提供时本字段才被消费（默认渲染路径不消费，零回归）。
   */
  shouldCellUpdate?: (prevRecord: RecordType, nextRecord: RecordType) => boolean
  /**
   * 响应式列显隐（对齐 antd `column.responsive`，since 4.x）。
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
   *
   * 详见 `docs/features/columns/responsive-columns.md`。
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
 * antd 风格列数组别名。
 *
 * data-grid 的分组列通过 `ColumnType.children` 表达，因此这里直接对齐
 * antd `ColumnsType<T>` 的数组入口形状。
 */
export type ColumnsType<RecordType = any> = Array<ColumnType<RecordType>>
