/**
 * data-grid 对外公开 API 类型（TableProps / TableRef / RowKeyType）。
 *
 * 聚合 nativeOptions（原子层）+ compatTypes（antd 桥接类型）而成的 Table 顶层 props 类型；
 * 是 demo / 调用方消费的主入口。
 */

import type { ReactNode } from 'react'
import type { SpinProps } from 'antd'
import type {
  ColumnOrSentinel,
  ColumnType,
  Expandable,
  FilterValue,
  SizeType,
  SorterResult,
  StickyConfig,
  TableClassNames,
  TableCurrentDataSource,
  TableLocale,
  TablePaginationConfig,
  TablePaginationState,
  TableStyles,
} from './compatTypes'
import type {
  GridSelectionOptions,
  ScrollBarFoldMode,
  TableComponents,
} from './nativeOptions'
import type { VirtualizationMode } from './engine/recyclingCellTypes'

export type RowKeyType = string | ((record: any) => string | number)

export interface TableProps<RecordType = any> {
  /**
   * 列默认值（对齐 antd v6 `TableProps.column`，见 `InternalTable.tsx:159`）。
   *
   * **语义**：Table 级列默认属性，作为**所有列**（含 `columns` 与 JSX children 声明的列）
   * 的公共默认值。单列可通过自身同名字段覆盖。
   *
   * **合并方向（列自身优先）**：对每列做浅合并——`column` prop 提供默认值，列自身同名字段覆盖之；
   * 列自身未设置（`undefined`）的字段回退到 `column` 默认。对齐 antd `useFilledColumns`
   * （`components/table/hooks/useFilledColumns.ts`）+ `@rc-component/util` 的 `mergeProps` 语义
   * （后者覆盖前者，但 `undefined` 不覆盖已定义值）。
   *
   * **递归**：多级表头（`column.children`）的每个层级都应用 `column` 默认；`column` 自身的
   * `children` 字段不参与合并（被剔除，避免错误注入分组结构——与 antd 一致）。
   *
   * **哨兵豁免**：`Table.EXPAND_COLUMN` / `Table.SELECTION_COLUMN` 哨兵对象不参与合并（保持引用不变，
   * 适配层后续识别用 `===`，合并会破坏引用相等——对齐 antd `useFilledColumns` 的哨兵豁免分支）。
   *
   * **典型用例**（antd `column-defaults` demo）：`column={{ align: 'center', ellipsis: true }}`
   * 让所有列默认居中 + 省略；单列 `align: 'left'` 覆盖为左对齐。
   *
   * 未提供（undefined）时不做任何合并，所有列保持原样（零回归：现有 demo 无 column prop）。
   */
  column?: Partial<ColumnType<RecordType>>
  /**
   * 列定义数组。可混入 `Table.EXPAND_COLUMN` / `Table.SELECTION_COLUMN` 哨兵
   * （对齐 antd）——哨兵位置即展开列 / 选择列的渲染位置。
   * 不含哨兵时，`rowSelection` 选择列默认插最前，`expandable` 展开列默认插最前（在选择列之后）。
   *
   * **JSX 风格 API 关系**：`columns` 与 JSX children（`<Table.Column>` / `<Table.ColumnGroup>`）
   * 二选一——传 `columns` 走 columns 路径，传 JSX children 走解析路径；两者都传时 `columns` 优先
   * （与 antd `columns || convertChildrenToColumns(children)` 一致）。详见 `ColumnProps`/`ColumnGroupProps`。
   *
   * **列默认值关系**：`column` prop（Table 级默认）会浅合并到本数组的每个列（含哨兵豁免、
   * 多级表头递归合并）；详见 `TableProps.column`。
   */
  columns?: Array<ColumnOrSentinel<RecordType>>
  dataSource?: Array<RecordType>
  rowKey?: RowKeyType
  bordered?: boolean
  size?: SizeType
  showHeader?: boolean
  title?: (currentPageData: Array<RecordType>) => ReactNode
  footer?: (currentPageData: Array<RecordType>) => ReactNode
  /**
   * 滚动配置。
   *
   * - `x`：横向滚动配置。`true` 仅开启横向滚动；number→px、string→原样作 min-width。
   *   启用横向滚动时额外渲染**横向悬浮滚动条**
   *   （`HorizontalFloatingScrollBar`：细线 2px + hit 上下各 8px + hover 变粗 8px + 拖动/同步），
   *   定位在数据区域底部（summary 上方）。隐藏原生横向滚动条。
   *   详见 `docs/design-notes/scrollbar.md`。
   * - `y`：纵向滚动语义（**仅 `true | undefined`，不支持数字**）。
   *     - `true`：**数据区域模式**——表头固定 + 表体滚动 + 纵向悬浮滚动条（FloatingScrollBar），
   *       **高度 CSS 自动适应**（flex/grid 让表体填满表格可用高度，**不用 JS 算数字**）：
   *         * `.dg-wrapper` 加 `dg-data-area` 类 → `display:flex; flex-direction:column; height:100%`
   *           （父容器需有明确 height，文档说明）。
   *         * 内部 `.dg-scroll-wrap`（FloatingScrollBar 包装）`flex:1; min-height:0` 填满剩余空间，
   *           `.dg-scroll` `flex:1; min-height:0; overflow-y:auto` 表体限高滚动；表头 sticky top 钉顶。
   *     - `undefined`（缺省）：表格整体（无固定表头，内容全展开，无表体滚动区，零回归）。
   *     - **不支持数字**：旧 demo 用 `scroll={{ y: <number> }}` 的语义（max-height=number）已废弃，
   *       迁移到 `true`（CSS 自动适应高度）。
   *
   * ★ 核心点：纯 CSS（flex/grid）让表体填满父容器可用高度，**不用 JS 算数字高度**。
   *   调用方需确保 `.dg-wrapper` 的父容器有明确高度（固定 height / flex / 100vh 等），
   *   否则表体高度退化为内容自然高（视觉等价 undefined，但表头仍按 sticky 定位）。
   *   详见 `docs/design-notes/layout.md`（数据区域模式节）。
   */
  scroll?: { x?: true | number | string; y?: true }
  /**
   * 虚拟滚动开关。
   * 与 `scroll={{ y: true }}` 组合启用纵向虚拟滚动：只渲染可视区 + overscan 的行，
   * 其余用占位撑总高（保证滚动条正确）。横向滚动（scroll.x）仍走横向 scroll 容器，
   * 与纵向虚拟正交。
   *
   * 行高两条路径：**非虚拟**走约定 `rowHeight` → CSS grid track，不测量（缺省 `'auto'`）；
   * **虚拟**采用 virtuoso 式 ResizeObserver 动态测量（measured-first + 约定 `rowHeight` 兜底，
   * `gridOptions.rowHeight` 默认 56）。data-grid **不实现 antd `measureRowRender` 糟粕兼容 API**
   * （隐藏测量行重渲染），与虚拟路径采用的 RO 测量是两回事。
   * 虚拟窗口按"收起状态"行高算 offset/padding；展开内容直接渲染但不参与窗口大小。
   *
   * 详见 `docs/design-notes/virtualization.md`。
   */
  virtual?: boolean
  /** 预留：透传到底层布局，本引擎仅接收不强制。 */
  tableLayout?: 'auto' | 'fixed'
  /**
   * data-grid 专属 grid 布局选项（有界行高模型 + 列宽拖拽 + 表头行高 + 列/行拖拽配置）。
   *
   * **与 antd 不兼容**：antd `Table` 没有 `rowHeight` / `minRowHeight` / `maxRowHeight` /
   * `headerHeight` / `resizable` 等概念（antd 行高随内容、无原生列宽拖拽），此命名空间仅
   * data-grid 消费。原顶层 `rowHeight`/`headerHeight`/`resizable`/`resizableMinWidth`/
   * `resizableMaxWidth` 全部迁入 `gridOptions`（删顶层、无 alias、无向后兼容）。
   *
   * - `rowHeight`：行高约定（数字 → 固定 px；函数 → 按行返回 px）。默认 56（虚拟）。
   * - `minRowHeight` / `maxRowHeight`：**同时设置**时启用「有界行高模型」——行高随内容
   *   在 [min, max] 区间自适应（body track 用 auto + 行容器 min/max-height 约束），RO 实测
   *   真实高度驱动虚拟窗口 offset/padding。**关键**：固定列/合并单元格/多级表头因仍由统一
   *   grid track 定位，跨可变高行保持像素级对齐（与 auto-track 脱节无关，grid 显式定位）。
   *   仅设其一（缺 min 或 max）→ 退化为固定行高（等同不设）。
   *   详见 `docs/design-notes/row-height.md`。
   * - `headerHeight`：表头行高约定（数字 px 或字符串 CSS track）。多级表头下所有表头行统一高度。
   * - `resizable`：列宽拖拽调整兼容开关。`true` 且未配置 `columnResizeMode` 时等同
   *   `columnResizeMode: 'ResizeLeft'`。默认 `false`（零回归）。
   * - `columnResizeMode`：列宽拖拽模式。`Disabled` 禁用；`ResizeLeft` 只改变分隔线左侧列宽，
   *   表格宽度总和随之变化；`ResizeSibling` 同时改变左右相邻列宽，保持总宽不变。
   *   最后一个可见叶子列右侧不渲染 resizer。
   *   详见 `docs/design-notes/column-width.md`。
   * - `resizableMinWidth` / `resizableMaxWidth`：列宽拖拽 min/max 约束（px）。number → 统一；
   *   函数 → 按列 key 逐列定制。默认 min 30 / max Infinity。
   */
  gridOptions?: {
    rowHeight?: number | ((record: RecordType, index: number) => number)
    virtualizationMode?: VirtualizationMode
    minRowHeight?: number
    maxRowHeight?: number
    headerHeight?: number | string
    resizable?: boolean
    columnResizeMode?: 'Disabled' | 'ResizeLeft' | 'ResizeSibling'
    resizableMinWidth?: number | ((key: string) => number)
    resizableMaxWidth?: number | ((key: string) => number)
    /**
     * 悬浮滚动条折叠/显示策略。
     *
     * 默认保持滚动条指示器可见，并在 hover hit 区时展开；打开 `showOnTableHover` 后，
     * 仅 hover 表格、hover 滚动条 hit 区或触摸表格后显示滚动条/指示器。
     */
    scrollBarFoldMode?: ScrollBarFoldMode
    /**
     * data-grid 原生行选择配置。
     *
     * 与 antd `rowSelection` 的关系：
     * - `gridOptions.selection` 是 data-grid 原生能力命名空间，优先级高于兼容层。
     * - `rowSelection` 仍保留 antd 兼容 API（renderCell/getCheckboxProps/selections/onChange...）。
     * - 选中真理源优先级：`selectedValues` > `defaultSelectedValues` >
     *   `rowSelection.selectedRowKeys` > `rowSelection.defaultSelectedRowKeys`。
     * - 同时传 `selectedValues` 与 `selectedRowKeys`：UI 以 `selectedValues` 为准；触发时仍尽量同时
     *   调 `onSelectedValuesChange` 与 `rowSelection.onChange`。
     */
    selection?: GridSelectionOptions<RecordType>
    /**
     * 拖拽行/列到容器边缘时自动滚动容器（虚拟列表下尤其关键）。
     *
     * **语义**：拖拽中（行拖 / 列拖）指针接近**滚动容器**（`.dg-scroll`）的边缘时，按距边缘
     * 距离**渐进加速**滚动容器——让用户能持续把行/列拖出可视区到达远处位置（虚拟行拖尤其关键：
     * 现有 hit-test 仅遍历已渲染 cell，拖出可视区不滚动会"卡住"，无法 drop 到远处行）。
     *
     * - `true`（默认，对齐 ag-grid community 默认行为）：拖拽近边缘触发自动滚动。
     * - `false`：禁用，拖拽出可视区不滚动。
     *
     * **实现**（见 `useAutoScrollOnDrag` hook）：
     *   - 边缘阈值 ~100px（参考 ag-grid `SCROLL_MOVE_WIDTH=100`）；阈值内按
     *     `(1 - dist/threshold) * maxSpeed` 渐进加速（`maxSpeed ≈ 15 px/帧`，对齐 ag-grid
     *     `SCROLL_ACCELERATION_RATE=5` × interval 的量级）。
     *   - 行拖 → 纵向滚动；列拖 → 横向滚动（同向滚动，与拖拽方向一致）。
     *   - 用 `requestAnimationFrame` 循环驱动 `scrollContainer.scrollBy(dx, dy)`：
     *     `scroll` 事件会被虚拟引擎（useVirtualList）+ FloatingScrollBar 监听 → 自动重算
     *     已渲染行 + drop 目标 / 指示线位置（拖拽 hook 的 hit-test 每帧重新读 DOM 边界，
     *     滚动后行/列 DOM 位置变化 → hit-test 自动跟随）。
     *
     * **滚动容器定位**：拖拽 hook 的 `containerRef`（外层相对定位 div）不是真正的滚动容器，
     *   实际滚动容器是它内部的 `.dg-scroll`（GridTable 在 scroll.x / scroll.y / virtual / hasFixed
     *   时自包一层）。auto-scroll hook 运行时用 `containerRef.current.querySelector('.dg-scroll')`
     *   定位；找不到（无 scroll 配置的纯表格）则回退到最近的可滚动祖先（offsetParent 链找 overflow:auto/scroll）。
     *
     * **零回归**：仅近边缘（阈值内）触发，中间拖拽不受影响；`false` 完全关闭；默认 true 不破坏
     *   现有拖拽 demo 的常规重排（demo 用例均在可视区内重排，不触及边缘 → 不触发滚动）。
     */
    autoScrollOnDrag?: boolean
    /**
     * 列拖拽换位（列重排）全局开关。
     *
     * **语义（对齐 ag-grid `suppressMovableColumns`，取反；默认 true）**：
     *   - `true` / undefined：允许列拖拽换位（默认行为——所有列头可拖）。
     *   - `false`：**全局禁用列拖拽**（任何列头 pointerdown 都不启动拖；与
     *     `gridColumnOptions.dragColumnLock` 无关——全局关等于总闸）。
     *
     * 单列粒度由 `gridColumnOptions.dragColumnLock` 控制：
     * 某列可发起拖 ⟺ `columnReorder !== false && dragColumnLock === undefined`。
     *
     * **透传**：drag-column-sorting demo 从此 option 透传到 `useColumnDragSort({ reorder: ... })`。
     * 默认 true 保证非该 demo 的其它列拖场景零回归。
     */
    columnReorder?: boolean
    /**
     * 多行成块重排（multi-row reorder）开关。
     *
     * **语义（对齐 ag-grid `rowDragMultiRow`；默认 true）**：
     *   - `true` / undefined：当被拖行属于多选 selection（selection 含 ≥2 行且包含被拖行）时，
     *     把所有选中行作为**一块**移到目标位置（保持选中行之间的相对顺序），而非只移被拖行。
     *   - `false`：始终只移被拖行（即使 selection 含多行，行为与单行重排一致）。
     *
     * **边界**：被拖行未选中 → 只移它（现状）；selection 含被拖行+其它 → 成块移；
     * 目标落在选中块内部 → no-op。单选 / 无 selection 时**零回归**（selection 数 ≤1 时退化为单行重排）。
     *
     * **透传**：drag-multi-row-reorder demo 从此 option 透传到 `useRowDragSort({ multiRowReorder,
     * selectedRowKeys, rowKey })`。
     */
    multiRowReorder?: boolean
  }
  /**
   * 行选择配置。
   *
   * 传入即自动在叶子列最前插入一个选择列（checkbox 或 radio），参与 grid 布局。
   * - 与多级表头 / 固定列 / 虚拟滚动组合：选择列作为首列叶子节点，由引擎统一处理（无需调用方感知）。
   * - `selectedRowKeys` 受控；勾选/全选/单选触发 `onChange(keys, rows, info)`。
   * - `getCheckboxProps(record)` 返回 `{ disabled: true }` 的行不可勾选、不参与全选/半选。
   * - 若 `columns` 中含 `Table.SELECTION_COLUMN` 哨兵，选择列插在该哨兵位置而非默认最前
   *   （对齐 antd order-column demo）。
   *
   * 不传则不渲染选择列（零回归：basic/grouping/fixed/colspan/virtual 行为不变）。
   *
   * 详见 `docs/design-notes/selection.md`。
   */
  rowSelection?: import('./compatTypes').TableRowSelection
  /**
   * 行展开配置。
   *
   * 传入即自动插入一个展开图标列（默认最前；若 `columns` 含 `Table.EXPAND_COLUMN`
   * 哨兵则插在该位置），并在可展开数据行下方插入一条展开内容 track（0fr↔1fr 过渡，
   * 详见 Expandable 注释）。
   *
   * - `expandedRowRender(record, index, indent, expanded)`：展开内容；返回 null/undefined 的行
   *   视为不可展开（不渲染展开图标）。
   * - `rowExpandable(record)` 返回 false 的行图标禁用、不展开。
   * - `expandedRowKeys` 受控 / `defaultExpandedRowKeys` 非受控。
   * - `onExpand` / `onExpandedRowsChange` 回调。
   *
   * 与固定列 / 选择列 / 虚拟滚动组合：展开列作为普通叶子列参与布局，
   * 展开内容 track 不影响虚拟窗口。
   *
   * 不传则不渲染展开列、不插入展开 track（零回归）。
   *
   * 详见 `docs/design-notes/expand.md`。
   */
  expandable?: Expandable<RecordType>
  /**
   * 分页配置。
   *
   * **默认分页对齐 antd**：
   *   - `undefined`：等价 `{}`，默认 `defaultCurrent=1`、`defaultPageSize=10`、
   *     `placement=['bottomEnd']`。
   *   - `false`：关闭分页器，数据全显。
   *   - `TablePaginationConfig` 对象：启用分页（受控/非受控 current/pageSize，total 派生）。
   *
   * 启用后：
   *   - 排序+筛选后的数据源按 `current`/`pageSize` 切片传给引擎渲染（`slice((current-1)*pageSize, current*pageSize)`）。
   *   - 按 `placement`（v6 数组，默认 `['bottomEnd']`）在表格上下渲染 antd `<Pagination>`。
   *   - 翻页/改 pageSize 触发 `onChange(pagination, filters, sorter, { action: 'paginate', currentDataSource })`。
   *
   * 分页器用 antd `<Pagination>`。
   *
   * 详见 `docs/features/interaction/pagination-and-data.md`。
   */
  pagination?: false | TablePaginationConfig
  /**
   * 加载态（对齐 antd `TableProps.loading`）。
   *
   * **语义**：传入即用 antd `<Spin>` 包裹整个表格内容（含 topPagination / title / 表体 / footer /
   * bottomPagination），显示加载转圈遮罩。典型用于 ajax 远程数据请求中。
   *   - `boolean`：`true` 转圈、`false`（默认）不转。等价 `SpinProps={{ spinning: <bool> }}`。
   *   - `SpinProps` 对象：透传给 antd `<Spin>`（如 `{ spinning: true, delay: 200, tip: 'Loading...' }`）。
   *     此时 `spinning` 字段优先（与 antd 一致：`<Spin spinning={false} {...spinProps}>`）。
   *
   * Spin 用 antd（loading/spin 非表格核心，用 antd）。
   *
   * 不传（默认）→ 不包 Spin，保持现有 demo 行为不变（零回归）。
   *
   * 详见 `docs/design-notes/layout.md`（loading × data-area flex 链修复节）。
   */
  loading?: boolean | SpinProps
  /** 自定义根 className。 */
  className?: string
  /** 自定义根 style。 */
  style?: import('react').CSSProperties
  /**
   * 语义化 classNames（对齐 antd v6 `TableProps.classNames`）。
   *
   * **支持对象（静态）与函数 `(info) => 对象`（动态）两种**：
   *   - 对象：直接作为各部位 className 注入。
   *   - 函数：按 `info.props`（含 size/bordered/virtual/scroll/pagination）求值返回对象，
   *     便于按当前 props 子集动态返回不同样式（如 size='medium' 时返回特定 root/title/header.cell）。
   *
   * 嵌套部位（对齐 antd v6 `_semantic`）：`root` / `section` / `content` / `title` / `footer` /
   * `header.{wrapper,row,cell}` / `body.{wrapper,row,cell}` / `pagination.{root,item}`。
   *
   * 注入点（data-grid DOM）：
   *   - `root` → `.dg-wrapper`（与 `className` 合并）。
   *   - `title` → `.dg-title`。
   *   - `footer` → `.dg-footer`。
   *   - `section` → `.dg-section`（content 外的包装容器，承载滚动/分页等）。
   *   - `content` → `.dg-content`（标题/脚注之间的表格内容区）。
   *   - `header.cell` → `.dg-cell-header`；`header.row` → 表头行；`header.wrapper` → 表头容器。
   *   - `body.cell` → `.dg-cell-body`；`body.row` → 表体行；`body.wrapper` → 表体容器。
   *   - `pagination.root` → `.dg-pagination`；`pagination.item` → 分页单项（透传到 antd Pagination）。
   *
   * 未提供（undefined）时所有部位走默认 className，零回归。
   */
  classNames?: TableClassNames<RecordType>
  /**
   * 语义化 styles（对齐 antd v6 `TableProps.styles`）。结构与 `classNames` 同构，
   * 值为 `CSSProperties`；同样支持对象（静态）与函数 `(info) => 对象`（动态）。
   *
   * 注入点同 `classNames`（合并到对应部位的 inline style）。
   *
   * 未提供（undefined）时所有部位走默认 style，零回归。
   */
  styles?: TableStyles<RecordType>
  /**
   * 排序/筛选/分页变化的统一回调。
   *
   * 对齐 antd `TableProps.onChange(pagination, filters, sorter, extra)`：
   *   - `pagination`：当前实际分页状态 `{ current, pageSize, total }`（注入实际值；
   *     对齐 antd：onChange 的 pagination 始终反映当前分页，无论触发源是 sort/filter/paginate）。
   *     未启用分页（`pagination={false}`）时传 `{ current: 1, pageSize: <全量>, total: <长度> }`。
   *   - `filters`：筛选状态。形态 `{ [columnKey/dataIndex]: filteredValue[] | null }`：
   *     * **可筛选列**（有 `filters` + `onFilter`）出现为 key；值为当前激活的筛选值数组（命中任一保留）。
   *     * 无激活筛选的列值为 `null`（对齐 antd：未筛选列在 filters 对象里值为 null）。
   *     * 不可筛选列不出现为 key。
   *   - `sorter`：排序结果。对齐 antd 的"对象/数组"二分语义：
   *     - **0 个激活排序列**：单个对象 `{ column, order: null, field, columnKey }`
   *       （调用方可判 `order == null` 视为"无排序"）。
   *     - **1 个激活排序列**：单个 `SorterResult` 对象 `{ column, order, field, columnKey }`。
   *     - **>=2 个激活排序列（多列排序）**：`SorterResult[]` 数组，按 `sorter.multiple` 升序
   *       （multiple 最小 = 最高优先级在前）。仅含 `order != null` 的列。
   *   - `extra`：`{ currentDataSource, action }`。`action` 取值 `'sort'`（排序）/`'filter'`/
   *     `'paginate'`。`currentDataSource`：
   *     * sort：排序后（受控为传入）数据源。
   *     * filter：**排序+筛选后**数据源（raw → sort → filter；受控为传入）。
   *     * paginate：分页**前**的当前页数据源（即排序+筛选后的全量，不含分页切片——与 antd 一致：
   *       antd onChange 的 currentDataSource 是分页前的全量渲染数据）。
   *
   * 点击排序列表头 / 应用筛选 / 翻页/改 pageSize 时触发。
   */
  onChange?: (
    pagination: TablePaginationState,
    filters: Record<string, Array<FilterValue> | null>,
    sorter: SorterResult<RecordType> | Array<SorterResult<RecordType>>,
    extra: TableCurrentDataSource<RecordType>,
  ) => void
  /**
   * 是否全局显示排序提示 tooltip（对齐 antd `TableProps.showSorterTooltip`）。
   * 单列可由 `column.showSorterTooltip` 覆盖。默认 `true`。
   */
  showSorterTooltip?: boolean | { target?: 'full-header' | 'sorter-icon' }
  /**
   * 树形数据子字段名（对齐 antd `TableProps.childrenColumnName`，默认 `'children'`）。
   *
   * **语义**：dataSource 中每个 record 的 `record[childrenColumnName]` 若为非空数组，
   * 视为该 record 的子行（递归支持任意深度）。
   *   - 检测到任一 record 含此字段（且 `expandable.expandedRowRender` 未提供——树形与展开渲染
   *     自定义内容互斥，antd 中树形优先）→ 进入**树形模式**：
   *       * 数据源被**扁平化**（DFS 遍历 children，按展开状态过滤未展开父行的子孙行）。
   *       * 第一列数据单元格内按 `level × indentSize` 左缩进 + `hasChildren` 行渲染展开/收起图标。
   *       * `rowSelection.checkStrictly=false` 时父子勾选联动。
   *   - 无任何 record 含此字段 → 退化为普通扁平表格（零回归）。
   *
   * 与 `expandable.childrenColumnName` / `expandable.indentSize` 同名字段优先级：
   * `expandable.*` 字段优先（与 antd `getExpandableProps` 一致）；未设时用 Table 级本字段。
   *
   * 默认 `'children'`。
   */
  childrenColumnName?: string
  /**
   * 自定义组件（对齐 antd `TableProps.components`，v6 `TableComponents` 子集）。
   *
   * 替换表格内部默认渲染的元素。详见 `TableComponents` 类型注释。
   *
   * **data-grid div 渲染适配**（关键，与 antd `<table>` 实现不同）：
   *   - `body.cell`：替换 dg-cell div **内部内容**（非整个 td）；返回 ReactNode。
   *   - `body.row`：每行渲染一个包裹层组件（用于 Form/Context 等）；未提供时维持现有 grid 布局。
   *   - `header.cell`：表头格（列拖拽会用；当前占位）。
   *
   * 典型用例：单元格编辑（edit-cell）——传入 `{ body: { row: EditableRow, cell: EditableCell } }，
   * 配合 column.onCell 返回编辑 props（record/editable/dataIndex/handleSave）。
   *
   * 未提供（undefined）时所有渲染走默认路径，保证现有 demo 零回归。
   */
  components?: TableComponents
  /**
   * 本地化文案（对齐 antd `TableProps.locale` 子集）。
   *
   * data-grid 自研文案统一接入 antd `useLocale('Table')`：
   * - `TableProps.locale` 覆盖 `ConfigProvider locale`。
   * - `ConfigProvider locale` 覆盖默认英文。
   * - 已消费：表体 empty、FilterDropdown、自研选择菜单、自研排序 hover title、自研展开按钮 aria。
   *
   * === emptyText 语义（data-grid 当前兼容语义）===
   *
   * - 当 `pagedDataSource` 为空（dataSource 空 或 筛选/分页后无数据）时，表格在表体区域
   *   渲染一个跨所有列（`grid-column: 1 / -1`）的 empty 占位区，内容取 `emptyText`。
   * - `emptyText` 优先级：
   *     1. `TableProps.locale.emptyText`（Table 级，最高优先级）。
   *     2. `ConfigProvider locale.Table.emptyText`（全局 Table locale，由 merged Table locale 提供）。
   *     3. `ConfigProvider.renderEmpty('Table')`（全局表体空状态）。
   *     4. 默认 antd `<Empty>`（无描述）。
   * - **表体 empty 不区分"空数据 vs 筛选无结果"**：data-grid 当前兼容语义下，两种场景
   *   共用同一表体 emptyText，并按上述优先级解析。
   *
   *   ★ `'Table.filter'` 是**另一个**独立语义（对齐 antd FilterDropdown.tsx:395,410）：仅用于
   *   **filter 下拉面板内部**当 `column.filters` 为空数组时的占位（默认 Empty SIMPLE +
   *   locale.filterEmptyText），**不是**表体筛选无结果。data-grid 由 FilterDropdown 消费此语义。
   *
   * === antd custom-empty demo 要素 ===
   *
   * - `locale={{ emptyText: <Empty description="No Data">{toggleButton}</Empty> }}`：Table 级
   *   空状态文案（含 toggle 按钮子节点；空数据与筛选无结果共用）。
   * - `<ConfigProvider renderEmpty={renderEmpty}>`：renderEmpty 仅处理 'Table.filter' →
   *   `<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No Filter(Custom)" />`
   *   （filter 下拉内 filters 空时占位）。
   *
   * 不传（默认）→ 用 `ConfigProvider locale.Table.emptyText`、ConfigProvider.renderEmpty 或默认 antd Empty
   * （零回归：现有 demo 无 locale）。
   */
  locale?: TableLocale
  /**
   * 汇总栏 summary（对齐 antd `TableProps.summary`）。
   *
   * **语义**：渲染在表体底部的总结栏（一行或多行）。典型用法：计算列总计、显示汇总信息。
   *
   * 取值：
   *   - **函数** `(currentPageData) => ReactNode`：接收当前页数据（pagedDataSource——排序+筛选+
   *     分页切片后的数据），返回 summary 内容（通常用 `Table.Summary` / `Table.Summary.Row` /
   *     `Table.Summary.Cell` 组合声明）。
   *   - **ReactNode**：直接作为 summary 内容（不依赖 pageData 计算）。
   *
   * === `Table.Summary` 组件族（对齐 antd v6）===
   *
   * - `Table.Summary`（容器）：`fixed?: boolean`。`fixed: true` 时 summary 区 sticky bottom
   *   （配合 `scroll.y`，表体滚动时 summary 固定在底部）。
   * - `Table.Summary.Row`（行）：分组语法糖，可含多个 Cell。
   * - `Table.Summary.Cell`（单元格）：
   *     * `index?: number`：列索引（0-based，对应叶子列序号）。决定该 cell 在 grid 中的横向位置。
   *     * `colSpan?: number`：跨列数（默认 1）。
   *     * `align?: 'start' | 'center' | 'end'`：对齐方式。
   *     * `children`：单元格内容（任意 ReactNode，如 `<Text type="danger">{total}</Text>`）。
   *
   * === data-grid 实现（与 antd 差异）===
   *
   * - antd summary 是 `<tfoot><tr><td colspan>`；data-grid 是 div + CSS Grid（无 tfoot）。
   * - summary Cell 作为 grid item 渲染在 grid 末尾的 summary 区，按 `index` + `colSpan` 定位
   *   （`gridColumn: <index+1> / span <colSpan>`，`gridRow` 由引擎按行序号注入）。
   * - `fixed` sticky bottom：summary cell 加 `position: sticky; bottom: 0`，与表体共享滚动容器。
   * - 功能等价：summary 在表体底部，Cell 按 index+colSpan 定位，fixed sticky bottom。
   *
   * **pageData 入参差异**（与 antd）：
   *   - data-grid：函数收到 **pagedDataSource**（当前页数据——排序+筛选+分页切片后），
   *     与 title/footer 收到 filteredDataSource（全量）不同。对齐 antd `summary` 实际行为
   *     （antd summary 的 pageData 也是当前页数据）。
   *   - 若未启用分页，pagedDataSource = filteredDataSource（全量），与 antd 不分页时一致。
   *
   * 未提供（undefined）时不渲染 summary 区（零回归：现有 demo 无 summary 行）。
   */
  summary?: ((currentPageData: Array<RecordType>) => ReactNode) | ReactNode
  /**
   * JSX 风格 API：`<Table>` 的 JSX 子元素声明列（对齐 antd `<Table><Column/></Table>`）。
   *
   * **语义**：当**未传 `columns` prop** 时，Table 适配层用 React.Children 遍历 JSX 子元素，
   * 识别 `<Table.Column>`（→ ColumnType）与 `<Table.ColumnGroup>`（→ `{ title, children: [...] }`
   * 嵌套，复用多级表头），生成 columns 数组（等价于传 `columns` prop）。
   *
   * **columns 或 children 二选一**（与 antd `columns || convertChildrenToColumns(children)` 一致）：
   *   - 传 `columns` prop：走 columns 路径（所有现有 demo，零回归），JSX children 被忽略。
   *   - 不传 `columns` prop 但传 JSX children：走解析路径。
   *   - 两者都未传：空表（无列）。
   *
   * 详见 `ColumnProps` / `ColumnGroupProps`。
   */
  children?: ReactNode
  /**
   * 粘性表头 + 页面级滚动条（对齐 antd v6 `TableProps.sticky`）。
   *
   * **语义（区别容器内固定）**：表头跟随**页面**滚动固定（`position: sticky; top: offsetHeader`
   * 相对 `getContainer` 默认 `window`），而非容器内固定（`scroll.y` 表体限高滚动）。
   * 详见 `StickyConfig` 注释。
   *
   * **取值**：
   *   - `undefined` / `false`：不启用（所有现有 demo 行为不变，零回归）。
   *   - `true`：启用（默认偏移 0）。
   *   - 对象 `{ offsetHeader?, offsetScroll?, getContainer? }`：自定义。
   *
   * **与容器内固定互斥语义**：同时传 `sticky` 与 `scroll.y` 时，`sticky` 优先（页面级固定），
   * `scroll.y` 的容器内固定表头不生效（data-grid 简化：不为同表同时支持两种固定模式）。
   *
   * 未提供（undefined）时不启用，零回归。
   *
   * 详见 `docs/design-notes/sticky.md`。
   */
  sticky?: boolean | StickyConfig
  /**
   * 表头**行** props 注入（对齐 antd v6 `TableProps.onHeaderRow`）。
   *
   * 表头**行** props 注入。签名 `(columns, index) => React.HTMLAttributes`：
   *   - `columns`：该表头行涉及的列（单层表头 = 全部 columns；多级表头 = 该层的分组列集合）。
   *   - `index`：表头行号（单层表头恒 0；多级表头 0=顶层分组, maxDepth-1=叶子层）。
   *   - 返回值整体作为该表头**行**的 HTML 属性（onClick/onDoubleClick/.../className/style）。
   *
   * ★ data-grid grid 布局适配：grid 渲染下表头**无独立 `<tr>`**——表头格直接是 grid item。
   *   故 onHeaderRow 返回值透传到该表头行**所有表头格**（与 header.row 语义化 class 同款行级透传）：
   *     * 事件类（onClick/onMouseEnter/...）：挂到每个表头格 div（点击任一表头格即触发，行为等价"点击表头行"）。
   *     * className：合并到每个表头格的 className（行级 class 标记）。
   *     * style：合并到每个表头格的 inline style（行级 style 标记）。
   *
   * 典型用法（对齐 antd 文档 onRow 用法）：
   * ```tsx
   * <Table onHeaderRow={(columns, index) => ({ onClick: () => {...} })} />
   * ```
   *
   * 未提供（undefined）时不注入（零回归）。
   */
  onHeaderRow?: (
    columns: Array<ColumnType<RecordType>>,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
  /**
   * 表体**行** props 注入（对齐 antd v6 `TableProps.onRow`）。
   *
   * 表体**行** props 注入。签名 `(record, index) => React.HTMLAttributes`：
   *   - `record`：该行数据。
   *   - `index`：该行在 dataSource 中的索引。
   *   - 返回值整体作为该表体**行**的 HTML 属性（onClick/onDoubleClick/onContextMenu/onMouseEnter/onMouseLeave/...）。
   *
   * ★ data-grid grid 布局适配：grid 渲染下表体**无独立 `<tr>`**——单元格直接是 grid item。
   *   故 onRow 返回值透传到该行**所有数据单元格**（与 body.row 语义化 class 同款行级透传）：
   *     * 事件类（onClick/onMouseEnter/...）：挂到该行每个单元格 div（点击该行任一单元格即触发，行为等价"点击该行"）。
   *       * ★ 与内置 hover 区分：onRow.onMouseEnter/onMouseLeave 会**覆盖**引擎内置 hover
   *         （引擎用 onMouseEnter/onMouseLeave 驱动 dg-row-hover 行高亮）；用户在 onRow 里
   *         返回 onMouseEnter/onMouseLeave 时内置 hover 失效。若需同时保留 hover，请在自定义
   *         handler 内自行加 dg-row-hover 视觉（或用 rowHoverable=false 关闭内置 hover 避免冲突）。
   *     * className：合并到该行每个单元格的 className（行级 class 标记）。
   *     * style：合并到该行每个单元格的 inline style（行级 style 标记）。
   *
   * 典型用法（对齐 antd 文档 onRow 用法）：
   * ```tsx
   * <Table onRow={(record, rowIndex) => ({
   *   onClick: (event) => {},
   *   onDoubleClick: (event) => {},
   *   onContextMenu: (event) => {},
   *   onMouseEnter: (event) => {},
   *   onMouseLeave: (event) => {},
   * })} />
   * ```
   *
   * **与 components.body.row 关系**：两者正交——components.body.row 提供包裹层组件
   * （Form/Context），onRow 提供事件 props。可同时使用（onRow props 在无 body.row 时透传到单元格；
   * 有 body.row 时 onRow 不自动透传到 body.row 组件——body.row 是用户自定义组件，应由用户自行
   * 处理事件；data-grid 保持简单：onRow 仅透传到单元格 props）。
   *
   * 未提供（undefined）时不注入（零回归）。
   */
  onRow?: (
    record: RecordType,
    index: number,
  ) => import('react').HTMLAttributes<HTMLElement> | undefined
  /**
   * 表体行的 className（对齐 antd v6 `TableProps.rowClassName`）。
   *
   * 表体行的 className。取值：
   *   - 字符串：所有行加该 class（统一行样式）。
   *   - 函数 `(record, index) => string`：按行返回 class（典型用法：编辑态行 `editable-row`、
   *     奇偶行条纹、特殊行高亮等）。
   *
   * ★ data-grid grid 布局适配：grid 渲染下表体**无独立 `<tr>`**——单元格直接是 grid item。
   *   故 rowClassName 透传到该行**所有数据单元格**的 className（与 body.row 语义化 class 同款
   *   行级透传——同一行的每个单元格都带这个 class）。
   *
   * **典型用法**（antd edit-cell demo）：`rowClassName={() => 'editable-row'}`——编辑态行视觉。
   *
   * **与 antd 选中态 class 关系**：antd 在 `selectedRowKeys` 命中的行自动加 `ant-table-row-selected`
   *   class（InternalTable.tsx:584-591）。data-grid 的选中态视觉由 `dg-row-selected` 类驱动
   *   （详见 `docs/design-notes/selection.md`），rowClassName 是用户自定义层，与之正交。
   *
   * 未提供（undefined）时不注入（零回归）。
   */
  rowClassName?: string | ((record: RecordType, index: number) => string)
  /**
   * dropdown 挂载容器（对齐 antd v6 `TableProps.getPopupContainer`）。
   *
   * 表格内 dropdown（筛选下拉等）的挂载容器。签名 `(triggerNode) => HTMLElement`：
   *   - `triggerNode`：触发 dropdown 的 DOM 节点（如筛选漏斗 trigger span）。
   *   - 返回值：dropdown 弹出层的挂载父节点（默认 antd Dropdown 默认行为 = document.body）。
   *
   * **生效范围**：本字段作为**筛选下拉**（FilterDropdown 内 antd Dropdown）的默认 getPopupContainer。
   *   - 列级 `column.filterDropdownProps.getPopupContainer` 优先（覆盖 Table 级）。
   *   - Table 级 `getPopupContainer` 作为列级未指定时的默认值。
   *
   * 典型用法：在滚动容器 / modal / drawer 内嵌入表格时，让 dropdown 跟随滚动而非固定到 body：
   * ```tsx
   * <Table getPopupContainer={(trigger) => trigger.parentElement as HTMLElement} />
   * ```
   *
   * 未提供（undefined）时 antd Dropdown 走默认（document.body 挂载），与现有 demo 一致（零回归）。
   */
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement
  /**
   * 行是否可 hover 高亮（对齐 antd v6 `TableProps.rowHoverable`，since 5.16.0）。
   *
   * 行是否可 hover 高亮。默认 `true`。
   *   - `true`（默认）：鼠标 hover 某行时该行单元格加 `dg-row-hover` 类（行高亮视觉）。
   *   - `false`：关闭 hover 高亮（单元格不加 dg-row-hover；hover 视觉消失）。
   *
   * **与 onRow.onMouseEnter/Leave 关系**：rowHoverable=false 仅关闭内置 hover 视觉；
   *   若 onRow 返回了 onMouseEnter/Leave，用户自定义 handler 仍生效（事件本身不因 rowHoverable 关闭）。
   *
   * 未提供（undefined）时默认 true（保持现有所有 demo 的 hover 行为不变，零回归）。
   */
  rowHoverable?: boolean
  /**
   * ref 句柄（scrollTo API）。与 antd `Table ref.scrollTo` 接口对齐：
   *   - `scrollTo({ index })`：滚到第 index 行顶部对齐。
   *   - `scrollTo({ key })`：滚到 rowKey === key 的行（调用方传 React.Key）。
   *   - `scrollTo({ scrollTop })`：直接滚到指定 scrollTop（与 antd `top` 等价的扩展别名）。
   *   - `scrollTo({ offset, align })`：在目标行顶部对齐后额外偏移；align 控制对齐方式。
   *
   * 仅在 `virtual` 模式下生效；非虚拟模式调用为 no-op（不影响普通表格）。
   */
  ref?: React.Ref<TableRef>
}

/**
 * Table ref 句柄。
 *
 * 虚拟滚动相关 API + nativeElement。
 */
export interface TableRef {
  /**
   * 滚动到目标位置。与 antd `Table ref.scrollTo` 兼容，额外支持 `scrollTop` 别名。
   *
   * - `index` / `key` / `scrollTop`（或 antd 同名 `top`）三选一：
   *     - `index: number`：滚到第 index 行。
   *     - `key: React.Key`：滚到 rowKey === key 的行（自动解析为 index）。
   *     - `scrollTop: number` / `top: number`：直接滚到指定 scrollTop。
   * - `offset`：目标行顶部对齐后再额外偏移（向下为正）。
   * - `align`：'start'（默认）| 'center' | 'end' | 'nearest'。虚拟模式下不支持 'center' 时
   *   退化为 'start'（与 antd 行为一致）。'nearest'：目标行已完全在可视区时**不滚动**（不跳），
   *   仅当上方不可见→按 start、下方不可见→按 end（对齐 react-virtuoso scrollIntoViewSystem）。
   * - `behavior`：'auto'（默认，瞬时）| 'smooth'（原生平滑动画到位）。**data-grid 专属**
   *   （antd 无此字段）；smooth 下内部启用到达检测（scrollTop≈target/触边界/1000ms fallback）。
   *
   * 详见 `docs/design-notes/virtualization.md`。
   */
  scrollTo: (config: {
    index?: number
    key?: import('react').Key
    scrollTop?: number
    /** antd 同名字段（与 `scrollTop` 等价别名）。 */
    top?: number
    offset?: number
    align?: 'start' | 'center' | 'end' | 'nearest'
    /** data-grid 专属：平滑滚动行为。 */
    behavior?: 'auto' | 'smooth'
  }) => void
  /** 最外层根 DOM 节点。 */
  nativeElement?: HTMLDivElement | null
}
