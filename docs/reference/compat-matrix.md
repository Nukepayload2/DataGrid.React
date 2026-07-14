# antd v6 Table × data-grid 兼容矩阵

> **说明**：data-grid 是用 CSS Grid 重做的 antd Table，目标是兼容 antd v6。
> 本矩阵逐项判定 data-grid 对 antd Table **全量 API** 的支持度，给出证据（`file:line`）。
>
> 真相源：
> - antd：`G:\Projects\ant-design\components\table\interface.ts`（API 真相）、`InternalTable.tsx`、`node_modules\@rc-component\table\lib\*.d.ts`（rc-table 底层类型）。
> - data-grid：`G:\Projects\trash-antd-table\data-grid\src\table\types.ts`、`engine\*.tsx`、`Table.tsx`。

## 判定档位

| 档位 | 含义 |
|------|------|
| **完全兼容** | 同名同义，行为一致，可直接替换。 |
| **部分兼容** | 同名同义主体一致，但存在明确差异（写差异说明）。 |
| **未实现** | antd 有、data-grid 尚未实现（无对应字段 / 字段缺省）。 |
| **名兼义异** | 字段名相同但语义/作用域有歧义（注意区分）。 |

每行格式：`API | 归类 | 支持度 | 差异/说明 | 证据（antd file:line + dg file:line）`。

---

## 一、未实现（antd 有，data-grid 缺）

| API | 归类 | 支持度 | 差异/说明 | 证据 |
|-----|------|--------|-----------|------|
| `scroll.y = number\|string`（max-height 语义） | TableProps.scroll | 未实现 | dg 的 `scroll.y` 仅接受 `true`（启用容器内纵向滚动 + sticky 表头），不把 number 当作 max-height。antd/rc-table 把 number 当作表体 `max-height`。决策 7。 | antd `InternalTable.tsx:177`；rc-table `Table.d.ts:55` (`y?: number \| string`)；dg `types.ts:990, 1313`（`y?: true`）|
| `direction: 'rtl'`（RTL 布局） | ConfigProvider | 未实现 | dg 无 RTL 支持；`direction` 通过 ConfigProvider 注入，dg 未消费。 | antd `ConfigProvider` direction；dg 全仓无 `direction`/`RTL` 字段（types.ts 无命中）|
| `expandable.columnTitle` | expandable | 未实现 | 展开列列表头自定义内容。dg 未实现。 | antd rc-table `ExpandableConfig.columnTitle`；dg `types.ts:1084` |
| `expandable.fixed` | expandable | 未实现 | 展开列固定方向（'left'\|'right'）。dg 未实现。 | antd `ExpandableConfig.fixed`；dg `types.ts:1107-1158`（无 `fixed`）|
| `components.table` | components | 未实现 | 整个 `<table>` 替换。dg 无 table 元素。 | antd rc-table components；dg `types.ts:742-769`（TableComponents 仅 header/body，无 table）|
| `components.header.table` | components | 未实现 | 表头 `<table>` 替换。 | dg `types.ts:747-749`（header 只有 `cell`）|
| `components.header.wrapper` | components | 未实现 | 表头 `<thead>` 替换。 | dg `types.ts:747-749`（仅 `cell`）|
| `components.header.row` | components | 未实现 | 表头 `<tr>` 替换。 | dg `types.ts:747-749`（仅 `cell`）|
| `components.body.wrapper` | components | 未实现 | 表体 `<tbody>` 替换。 | dg `types.ts:769`（body 仅 `row`/`cell`，无 wrapper）|
| `components.body`（函数形态） | components | 未实现 | antd 的 `components.body` 支持 `(node, ...) => ReactNode` 函数形态（custom-render-body demo）。dg 仅支持对象 `{ cell?, row? }`。 | antd rc-table `body?: CustomizeScrollBody \| {…}`（`interface.d.ts:130`）；dg `types.ts:769`（仅对象）|
| `column.rowSpan`（独立字段） | ColumnType | 未实现 | antd column 上的 `rowSpan` 独立字段（非 onCell 返回）。dg 仅支持 `onCell` 返回 `{ rowSpan }` 或 `render` 返回 `{ props: { rowSpan } }`。 | antd `interface.ts` ColumnType（继承 rc-table `ColumnSharedType.rowSpan`）；dg `types.ts:373-476`（无独立 `rowSpan`，仅 onCell/render 路径）|
| `column.filtered`（受控筛选态） | ColumnType | 未实现 | 列级受控筛选指示。dg 用 `filteredValue` 控制态，未单独暴露 `filtered`。 | antd `interface.ts:163`；dg `types.ts:373-548`（无 `filtered`）|
| `column.sortIcon` | ColumnType | 未实现 | 自定义排序图标。 dg 未实现。 | antd `interface.ts:159`；dg `types.ts`（无 `sortIcon`）|
| `column.filterResetToDefaultFilteredValue` | ColumnType | 未实现 | 重置时回到默认筛选。dg 未实现。 | antd `interface.ts:179`；dg `types.ts`（无此字段）|
| `dataIndex = DeepNamePath`（深层路径类型） | ColumnType | 未实现 | antd `dataIndex` 支持 `DeepNamePath`（嵌套路径强类型）。dg 仅 `string \| number \| Array<string\|number>`（运行时已支持路径数组，但类型不深）。 | antd rc-table `DataIndex`/`DeepNamePath`；dg `types.ts:376` |
| `sticky.offsetSummary` | TableProps.sticky | 未实现 | summary 跟随 sticky 表头时的偏移。dg 的 `sticky` 仅 `offsetHeader`/`offsetScroll`/`getContainer`，缺 `offsetSummary`。 | antd rc-table `interface.d.ts:199`（`offsetSummary`）；dg `types.ts:1658`（`sticky?: boolean \| StickyConfig`，StickyConfig 无 offsetSummary）|
| `transformCellText` | ColumnType | 未实现（无回归） | antd 6 已删除此字段，dg 也无。**无兼容负担**。 | antd v6 `interface.ts` 已无；dg 无 |
| `onRowClick`/`onRowDoubleClick`/…（rc-table 行级事件系列） | event | 未实现（无回归） | rc-table 已删除这些独立事件，统一并入 `onRow`。dg 仅支持 `onRow`。**无兼容负担**。 | rc-table `interface.d.ts`（无该系列）；dg `types.ts:1693`（`onRow`）|

---

## 二、名兼义异（字段同名，但语义/作用域需注意）

| API | 归类 | 支持度 | 差异/说明 | 证据 |
|-----|------|--------|-----------|------|
| `locale.emptyText` | locale | 名兼义异 | antd `emptyText` = **表体**空数据/筛选无结果的占位（数据网格区）。**注意区分** `filterEmptyText`（FilterDropdown 下拉内空筛选项占位，走 Table locale / ConfigProvider locale 链路）。dg 的 `emptyText` 已正确对齐 antd 表体语义。 | antd `interface.ts:52`；dg `types.ts:1561-1586`（注释详述 emptyText 语义边界）|
| `components.body.cell` | components | 名兼义异 | antd 替换**整个 `<td>`**；dg 替换的是 `.dg-cell-inner` 处的**内容**（grid item div 由引擎维持）。返回值是 ReactNode（单元格内容），而非整个 td。 | antd rc-table body.cell；dg `types.ts:759-764` |
| `components.body.row` | components | 名兼义异 | antd 替换 `<tr>`；dg 因 grid 布局无单一 `<tr>`，实现为**包裹层组件**（每行一个 wrapper，内部仍按 grid 定位渲染单元格）。提供时启用包裹层，未提供时维持现有布局（cell 直接 grid item）。 | dg `types.ts:753-757` |
| `column.className` / `column.style` | ColumnType | 名兼义异 | antd 作用于 `<td>`/`<th>`；dg 直接合并到 dg-cell div 的 `className`/`style`（grid item）。视觉等价，DOM 形态不同。 | dg `types.ts:381-400` |
| `column.colSpan`（表头） | ColumnType（子结构） | 名兼义异 | 在 dg 中**仅用于表头格**横向跨列（叶子列表头合并），数据单元格合并走 `onCell` 返回 `colSpan`。antd 的 column-level colSpan 语义在 dg 拆成了两套路径。 | dg `types.ts:481-490`（表头 colSpan）+ `504-507`（onCell 数据格 colSpan）|
| `render` 返回 `{ props: { colSpan, rowSpan } }` 对象形态 | ColumnType.render | 名兼义异 | antd `render` 可返回 `RenderedCell{ props:{colSpan,rowSpan,…}, children }` 对象形态（整个 td props）。dg 的 `render` 返回值仅消费 `children`/ReactNode；合并语义必须通过 `onCell` 返回 `{ colSpan, rowSpan }`（决策：合并统一走 onCell）。 | antd rc-table `RenderedCell`；dg `types.ts:470`（render 签名仅 ReactNode）+ `501-514`（onCell 承载合并）|

---

## 三、部分兼容（同名同义主体一致，但有差异）

| API | 归类 | 支持度 | 差异/说明 | 证据 |
|-----|------|--------|-----------|------|
| `scroll`（整体） | TableProps | 部分兼容 | `x` 接受 `true\|number\|string`；`y` 仅 `true`（不接受 number=max-height）。`scrollToFirstRowOnChange` 已支持，默认开启，可设 `false` 关闭。 | rc-table `Table.d.ts:53-56`；dg `publicTypes.ts` / `Table.tsx` / `usePaginationAdapter.ts` |
| `rowSelection`（整体） | rowSelection | 部分兼容 | 覆盖：`type/selectedRowKeys/defaultSelectedRowKeys/onChange/onSelect/onSelectMultiple/onSelectAll/onSelectInvert/onSelectNone/getCheckboxProps/getTitleCheckboxProps/columnTitle/onCell/columnWidth/fixed/hideSelectAll/align/selections/preserveSelectedRowKeys/checkStrictly/renderCell`。仍有 DOM 形态适配差异。 | antd `interface.ts:222-256`；dg `compat/selection.ts` / `selectionAdapter.tsx` / `useSelectionAdapter.ts` |
| `expandable`（整体） | expandable | 部分兼容 | 覆盖：`expandedRowRender/expandedRowOffset/rowExpandable/expandedRowKeys/defaultExpandedRowKeys/onExpand/onExpandedRowsChange/columnWidth/expandIcon/defaultExpandAllRows/showExpandColumn/childrenColumnName/indentSize/expandRowByClick/expandedRowClassName`。缺：`columnTitle/fixed`。 | antd `ExpandableConfig`；dg `types.ts:1078-1158` |
| `components`（整体） | components | 部分兼容 | 覆盖：`header.cell`/`body.cell`/`body.row`。缺：`table/header.table/header.wrapper/header.row/body.wrapper/body 函数形态`。语义有适配（cell/row 见「名兼义异」）。 | antd rc-table components；dg `types.ts:742-769` |
| `sticky`（整体） | TableProps | 部分兼容 | 覆盖：`boolean \| { offsetHeader?, offsetScroll?, getContainer? }`，页面级 sticky 表头 + 底部 fake scrollbar。缺：`offsetSummary`。 | antd rc-table `interface.d.ts:199`；dg `types.ts:1017-1054, 1658` |
| `locale`（整体） | locale | 部分兼容 | 已接入 `useLocale('Table')`，优先级为 `TableProps.locale > ConfigProvider locale.Table > 默认英文`。已消费：`emptyText`、FilterDropdown 的 `filterConfirm/filterReset/filterEmptyText/filterSearchPlaceholder/filterCheckAll`、selection 内置菜单、排序 hover title、展开按钮 aria。未完整消费：`filterTitle/selectAll/sortTitle` 等边缘字段。 | antd `interface.ts:41-63`；dg `types.ts` / `Table.tsx` / `engine\FilterDropdown.tsx` / `engine\GridTable.tsx` |
| `filterDropdownProps` | ColumnType | 部分兼容 | dg 仅透传子集（`open`/`onOpenChange` 等被消费），antd 完整 `CoverableDropdownProps`（Omit DropdownProps 一组字段）。 | antd `interface.ts:138-149, 178`；dg `engine\FilterDropdown.tsx:452-471`（仅消费 onOpenChange 等）|
| `dataIndex` | ColumnType | 部分兼容 | 运行时支持路径数组；类型不深（`string \| number \| Array<string\|number>`，非 `DeepNamePath`）。 | antd rc-table `DeepNamePath`；dg `types.ts:376` |
| `ref`（Reference） | ref | 部分兼容 | antd/rc-table `Reference` 仅 `nativeElement + scrollTo`（**antd 也没有 `getColumns`**，澄清无回归）。dg 在此基础上**扩展** `scrollTo` 支持 `index/key/scrollTop/align/behavior`（超集）。 | antd rc-table `interface.d.ts:41-44`；dg `types.ts:1778-1823` |

---

## 四、完全兼容（同名同义，行为一致）

### 基础与容器

| API | 归类 | 证据 |
|-----|------|------|
| `dataSource` | TableProps | dg `types.ts`（dataSource 字段）|
| `columns` / `ColumnGroupType.children` | TableProps / 子结构 | dg `types.ts:476`（children）|
| `rowKey`（string \| keyof \| (record)=>Key） | TableProps | dg types.ts（GetRowKey 对齐）|
| `bordered` | TableProps | dg types.ts |
| `size`（'small'\|'middle'\|'large'） | TableProps | dg types.ts（SizeType）|
| `loading`（SpinProps） | TableProps | dg types.ts |
| `title` / `footer`（PanelRender） | TableProps | dg types.ts |
| `tableLayout`（'auto'\|'fixed'） | TableProps | dg `types.ts:1325` |
| `showHeader` | TableProps | dg types.ts |
| `getPopupContainer` | TableProps | dg types.ts（对齐 GetPopupContainer）|
| `virtual` | TableProps | dg `types.ts:1323, 989`（与 antd 同名，启用虚拟化）|

### 交互与样式钩子

| API | 归类 | 证据 |
|-----|------|------|
| `onRow` / `onHeaderRow` | event | dg `types.ts:1693, 1668` |
| `rowClassName` | TableProps | dg `types.ts:1733-1739` |
| `customRow`/`customHeaderRow`（rc-table 别名） | event | dg 走 onRow/onHeaderRow 同语义 |
| `classNames`（TableSemanticType：header/body/cell/row/wrapper） | styles | dg `types.ts:908-917, 933+` |
| `styles`（同上语义槽） | styles | dg `types.ts:913-917` |
| `showSorterTooltip`（含 SorterTooltipProps.target） | TableProps | antd `interface.ts:67-71, 160`；dg types.ts |

### 列（ColumnType 大部分）

| API | 归类 | 证据 |
|-----|------|------|
| `key/title/width/align/fixed/className/style/onHeaderCell/ellipsis(含 showTitle)/hidden/render/children` | ColumnType | dg `types.ts:373-476` |
| `sorter`（bool/CompareFn/ColumnSorter）/ `sortOrder` / `defaultSortOrder` / `sortDirections` | ColumnType | dg `types.ts:339-353, 522+` |
| `filters` / `filterDropdown` / `filterMultiple` / `filteredValue` / `defaultFilteredValue` / `filterIcon` / `filterMode` / `filterSearch` / `onFilter` / `filterOnClose` / `filterDropdownOpen`(deprecated) / `onFilterDropdownOpenChange`(deprecated) | ColumnType | antd `interface.ts:162-194`；dg `types.ts` + `engine\FilterDropdown.tsx` |
| `responsive`（Breakpoint[]） | ColumnType | dg `types.ts:16-18`（导入 antd Breakpoint）+ ColumnType |

### 行选择（已覆盖部分）

| API | 归类 | 证据 |
|-----|------|------|
| `type/selectedRowKeys/defaultSelectedRowKeys/onChange/getCheckboxProps/getTitleCheckboxProps/columnTitle/onCell/columnWidth/fixed/hideSelectAll/align/selections/preserveSelectedRowKeys/checkStrictly/renderCell/onSelect/onSelectMultiple/onSelectAll/onSelectInvert/onSelectNone` | rowSelection | dg `compat/selection.ts` / `selectionAdapter.tsx` / `useSelectionAdapter.ts` |
| `Table.SELECTION_ALL/NONE/INVERT` 哨兵 | special | dg 引擎（useRowSelection）|

### 展开与哨兵

| API | 归类 | 证据 |
|-----|------|------|
| `Table.EXPAND_COLUMN` / `Table.SELECTION_COLUMN` 哨兵 | special | dg types.ts（哨兵列支持）|
| `Table.Column` / `Table.ColumnGroup` | 子结构 | dg `types.ts:1199-1232` |
| `Table.Summary`（含 `fixed`/`Cell`/`Row`） | 子结构 | dg `types.ts:1600-1615` |

### 分页与排序结果

| API | 归类 | 证据 |
|-----|------|------|
| `pagination`（含 `false \| TablePaginationConfig`，含 `placement`） | TableProps | dg types.ts（受控 server/async 场景兼容）|
| `onChange`（pagination/filters/sorter/extra） | TableProps | dg types.ts（远程场景兼容）|
| `onHeaderRow` / 多列排序 `sorter.multiple` | event/Column | dg `types.ts:346`（multiple）|

---

## 关键差异 TOP

> 迁移 antd → data-grid 时最易踩坑的 10 项（务必逐项核对）。

1. **`scroll.y` 仅 `true\|undefined`**（antd 接受 `number=max-height`）。dg 不把 number 当 max-height，需要表体限高请用容器约束。`scroll.scrollToFirstRowOnChange` 已支持，默认开启，可设 `false` 关闭。

2. **`locale` 为部分兼容**（antd 18 字段）。已接入：`emptyText`、FilterDropdown 的 `filterConfirm/filterReset/filterEmptyText/filterSearchPlaceholder/filterCheckAll`、selection 内置菜单 `selectionAll/selectInvert/selectNone`、排序 hover title `triggerDesc/triggerAsc/cancelSort`、展开按钮 aria `expand/collapse`。未消费字段仍有 `filterTitle/selectAll/sortTitle` 等。证据：dg `Table.tsx`、`engine\FilterDropdown.tsx`、`engine\GridTable.tsx`、`types.ts:1027-1058`；antd `interface.ts:41-63`。

3. **`rowSelection` 仍为部分兼容**。常用字段已覆盖，包括 `columnTitle/onCell/getTitleCheckboxProps/onSelectMultiple`；剩余风险主要来自 data-grid 无原生 `<td>/<th>` DOM，选择列 cell/header props 的实际挂载点与 antd 有 div-grid 适配差异。

4. **`expandable` 缺 `columnTitle/fixed`**。证据：antd `ExpandableConfig`；dg `types.ts:1084-1085, 1107-1158`。

5. **`components` 缺 `table/header.table/header.wrapper/header.row/body(wrapper)/body 函数形态`**。`body.cell`/`body.row` 已通，但语义有适配（见「名兼义异」）。证据：dg `types.ts:742-769`。

6. **RTL（`direction`）未支持**。通过 ConfigProvider 注入，dg 未消费。证据：dg types.ts 全仓无 `direction`/`RTL`。

7. **`render` 返回 `RenderedCell{ props:{colSpan,rowSpan} }` 对象形态未支持**。合并语义在 dg 统一走 `onCell` 返回 `{ colSpan, rowSpan }`（决策：合并路径单一化）。证据：antd rc-table `RenderedCell`；dg `types.ts:470`（render 仅 ReactNode）+ `501-514`（onCell 承载合并）。

8. **`sticky.offsetSummary` 缺**；**`dataIndex` 不支持 `DeepNamePath`**（运行时支持路径数组，类型不深）。证据：antd rc-table `interface.d.ts:199`；dg `types.ts:1658, 376`。

9. **`ColumnType` 缺 `rowSpan`(独立字段,仅 onCell)/`filtered`/`sortIcon`/`filterResetToDefaultFilteredValue`**；**`filterDropdownProps` 仅透传子集**。证据：antd `interface.ts:159, 163, 178, 179`；dg `types.ts:373-548`。

---

## 建议优先对齐项

按「迁移影响面 × 实现成本」排序：

1. **P1：`expandable.columnTitle/fixed`**（TOP #4）—— API 适配面清楚，和现有展开列构造逻辑直接相关。
2. **P1：`components` 缺槽位补齐**（TOP #5）—— 至少 `header.row`/`body.wrapper` 可以提供 data-grid 语义下的适配；完整 table DOM 替换仍受架构限制。
3. **P2：`column.sortIcon/filtered/filterResetToDefaultFilteredValue` 与 `filterDropdownProps` 全透传**（TOP #9）。
4. **P2：`sticky.offsetSummary`、`dataIndex` 深类型、RTL**（TOP #6/#8）—— 长尾，按需。

明确不作为迁移优先项：

- `scroll.y` 支持 `number|string` max-height 语义。data-grid 维持 `true | undefined`，避免回到 antd Table 需要调用方计算高度、数字/字符串后果不可控的痛点。

已不再作为优先缺口：

- FilterDropdown i18n 已接入 `locale.filterConfirm/filterReset/filterEmptyText/filterSearchPlaceholder/filterCheckAll`。
- `pagination` 默认开启已对齐 antd，`pagination={false}` 才关闭。
- `scroll.scrollToFirstRowOnChange` 已实现，默认开启，可设 `false` 关闭。
- `rowSelection.onSelect/onSelectMultiple/onSelectAll/onSelectInvert/onSelectNone/columnTitle/onCell/getTitleCheckboxProps` 已实现。
- `gridOptions.autoScrollOnDrag`、`gridOptions.columnReorder`、`gridColumnOptions.dragColumnLock`、`gridOptions.multiRowReorder` 已作为 data-grid 原生能力采用。

---

## data-grid 专属 → gridOptions / gridColumnOptions

> 下列字段在 antd Table **不存在**，是 data-grid 因 CSS Grid 架构或增强能力引入的。
> 按命名空间策略（见 [grid-options-namespace.md](grid-options-namespace.md)），它们应收入 `gridOptions`（表级）/ `gridColumnOptions`（列级），**不污染**顶层 `TableProps`/`ColumnType` 的 antd 兼容 API。

| 字段 | 归属 | 说明 | antd 有无 |
|------|------|------|-----------|
| `gridOptions.rowHeight` / `minRowHeight` / `maxRowHeight` | 表级 | 行高约定：非虚拟路径作 grid track（不测）；虚拟路径作 RO 测量的未测兜底/初值（measured-first，antd 行高随内容）。 | 无 |
| `gridOptions.virtualizationMode` | 表级 | 虚拟渲染模式：`standard` / `recycling`。仅在 `virtual` + `scroll.y=true` 时生效。 | 无 |
| `gridOptions.headerHeight` | 表级 | 表头高度约定。 | 无 |
| `gridOptions.resizable` / `columnResizeMode` / `resizableMinWidth` / `resizableMaxWidth` | 表级 | 列宽拖拽调整（antd v6 核查无 resizable）。 | 无 |
| `gridOptions.scrollBarFoldMode` | 表级 | data-grid 悬浮滚动条显示/折叠策略。 | 无 |
| `gridOptions.selection` | 表级 | data-grid 原生选择行为：`selectionMode/showSelectionColumn/selectedValues/getSelectionValue` 等；优先级高于 antd 兼容层 `rowSelection`，但不污染兼容 API。 | 无 |
| `gridOptions.columnReorder` | 表级 | 列重排总开关。 | 无 |
| `gridOptions.autoScrollOnDrag` / `multiRowReorder` | 表级 | 当前采用命名的拖拽增强项。 | 无 |
| `gridColumnOptions.dragColumnLock` | 列级 | 列级拖拽锁定选项。 | 无 |
| `gridColumnOptions.renderCellElement` / `renderCellReact` / `disposeCellElement` | 列级 | recycling 虚拟化的低层 cell 渲染/清理 hook。普通业务优先使用 `render`、`onCell` 和 `components.body.cell`。 | 无 |

> 注：`dragToPinColumn` / `hideColumnOnDragAway` / `rowDropTargets` / `dragPreview` / `cellDragSource` 等名称仍属于候选扩展，放在 [ag-grid-drag-candidates.md](ag-grid-drag-candidates.md) 作为外部能力参考，不计入当前兼容矩阵。
