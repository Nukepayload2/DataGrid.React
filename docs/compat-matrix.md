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
| `scroll.scrollToFirstRowOnChange` | TableProps.scroll | 未实现 | antd 默认 `true`（分页/排序/筛选切换时滚回首行）。dg 无此字段。 | antd `InternalTable.tsx:178, 426-427`；dg `types.ts:990, 1313`（无此键）|
| `direction: 'rtl'`（RTL 布局） | ConfigProvider | 未实现 | dg 无 RTL 支持；`direction` 通过 ConfigProvider 注入，dg 未消费。 | antd `ConfigProvider` direction；dg 全仓无 `direction`/`RTL` 字段（types.ts 无命中）|
| `rowSelection.onSelect` | rowSelection | 未实现 | antd 非废弃字段，单行勾选回调。dg 用 `onChange` 的 `info.type` 表达操作粒度，未单独实现 `onSelect`。 | antd `interface.ts:230`；dg `types.ts:192-318`（无 `onSelect` 字段）|
| `rowSelection.columnTitle` | rowSelection | 未实现 | 自定义选择列表头格内容（ReactNode 或 `(checkboxNode) => ReactNode`）。dg 无此字段。 | antd `interface.ts:243`；dg `types.ts:192-318`（无 `columnTitle`）|
| `rowSelection.onCell` | rowSelection | 未实现 | 选择列单元格 props 注入。dg 无此字段。 | antd `interface.ts:253`；dg `types.ts:192-318`（无 `onCell`）|
| `rowSelection.getTitleCheckboxProps` | rowSelection | 未实现 | 表头勾选框的 props（v6 新增）。dg 无此字段。 | antd `interface.ts:254-255`；dg `types.ts:192-318`（无此字段）|
| `expandable.expandRowByClick` | expandable | 未实现 | 点击行触发展开。dg 仅图标触发。 | antd `interface.ts` ExpandableConfig:179；dg `types.ts:1084-1085`（明示未覆盖）|
| `expandable.expandedRowClassName` | expandable | 未实现 | 展开行的 className。dg 未实现。 | antd `interface.ts` ExpandableConfig；dg `types.ts:1084`（明示未覆盖）|
| `expandable.columnTitle` | expandable | 未实现 | 展开列列表头自定义内容。dg 未实现。 | antd rc-table `ExpandableConfig.columnTitle`；dg `types.ts:1084` |
| `expandable.fixed` | expandable | 未实现 | 展开列固定方向（'left'\|'right'）。dg 未实现。 | antd `ExpandableConfig.fixed`；dg `types.ts:1107-1158`（无 `fixed`）|
| `expandable.expandedRowOffset` | expandable | 未实现 | 展开行偏移（树形缩进微调）。dg 未实现。 | antd `ExpandableConfig.expandedRowOffset`；dg `types.ts:1107-1158` |
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
| `locale.filterTitle/filterConfirm/filterReset/filterEmptyText/filterSearchPlaceholder/filterCheckAll/selectAll/selectNone/selectInvert/selectionAll/sortTitle/expand/collapse/triggerDesc/triggerAsc/cancelSort` | locale | 未实现 | dg `locale` 仅暴露 `emptyText`（17 个字段缺失）。**FilterDropdown 内部硬编码英文**（OK/Reset/Select all items/Search in filters/No filters），导致 i18n 失效。 | antd `interface.ts:41-63`（18 字段）；dg `types.ts:1586`（仅 `emptyText`）；dg `engine\FilterDropdown.tsx:420("No filters"), 539("Search in filters"), 568("Select all items"), 633("Reset"), 636("OK")` |
| `transformCellText` | ColumnType | 未实现（无回归） | antd 6 已删除此字段，dg 也无。**无兼容负担**。 | antd v6 `interface.ts` 已无；dg 无 |
| `onRowClick`/`onRowDoubleClick`/…（rc-table 行级事件系列） | event | 未实现（无回归） | rc-table 已删除这些独立事件，统一并入 `onRow`。dg 仅支持 `onRow`。**无兼容负担**。 | rc-table `interface.d.ts`（无该系列）；dg `types.ts:1693`（`onRow`）|

---

## 二、名兼义异（字段同名，但语义/作用域需注意）

| API | 归类 | 支持度 | 差异/说明 | 证据 |
|-----|------|--------|-----------|------|
| `locale.emptyText` | locale | 名兼义异 | antd `emptyText` = **表体**空数据/筛选无结果的占位（数据网格区）。**注意区分** `filterEmptyText`（FilterDropdown 下拉内空筛选项占位，dg 硬编码 "No filters"）。dg 的 `emptyText` 已正确对齐 antd 表体语义。 | antd `interface.ts:52`；dg `types.ts:1561-1586`（注释详述 emptyText 语义边界）|
| `components.body.cell` | components | 名兼义异 | antd 替换**整个 `<td>`**；dg 替换的是 `.dg-cell-inner` 处的**内容**（grid item div 由引擎维持）。返回值是 ReactNode（单元格内容），而非整个 td。 | antd rc-table body.cell；dg `types.ts:759-764` |
| `components.body.row` | components | 名兼义异 | antd 替换 `<tr>`；dg 因 grid 布局无单一 `<tr>`，实现为**包裹层组件**（每行一个 wrapper，内部仍按 grid 定位渲染单元格）。提供时启用包裹层，未提供时维持现有布局（cell 直接 grid item）。 | dg `types.ts:753-757` |
| `column.className` / `column.style` | ColumnType | 名兼义异 | antd 作用于 `<td>`/`<th>`；dg 直接合并到 dg-cell div 的 `className`/`style`（grid item）。视觉等价，DOM 形态不同。 | dg `types.ts:381-400` |
| `column.colSpan`（表头） | ColumnType（子结构） | 名兼义异 | 在 dg 中**仅用于表头格**横向跨列（叶子列表头合并），数据单元格合并走 `onCell` 返回 `colSpan`。antd 的 column-level colSpan 语义在 dg 拆成了两套路径。 | dg `types.ts:481-490`（表头 colSpan）+ `504-507`（onCell 数据格 colSpan）|
| `render` 返回 `{ props: { colSpan, rowSpan } }` 对象形态 | ColumnType.render | 名兼义异 | antd `render` 可返回 `RenderedCell{ props:{colSpan,rowSpan,…}, children }` 对象形态（整个 td props）。dg 的 `render` 返回值仅消费 `children`/ReactNode；合并语义必须通过 `onCell` 返回 `{ colSpan, rowSpan }`（决策：合并统一走 onCell）。 | antd rc-table `RenderedCell`；dg `types.ts:470`（render 签名仅 ReactNode）+ `501-514`（onCell 承载合并）|

---

## 三、部分兼容（同名同义主体一致，但有差异）

| API | 归类 | 支持度 | 差异/说明 | 证据 |
|-----|------|--------|-----------|------|
| `scroll`（整体） | TableProps | 部分兼容 | `x` 接受 `number\|string`（rc-table 另接受 `true`）；`y` 仅 `true`（不接受 number=max-height）。`scrollToFirstRowOnChange` 未实现。 | rc-table `Table.d.ts:53-56`；dg `types.ts:990, 1313` |
| `rowSelection`（整体） | rowSelection | 部分兼容 | 覆盖：`type/selectedRowKeys/defaultSelectedRowKeys/onChange/getCheckboxProps/columnWidth/fixed/hideSelectAll/align/selections/preserveSelectedRowKeys/checkStrictly/renderCell`。缺：`onSelect/columnTitle/onCell/getTitleCheckboxProps`。`onSelectMultiple/All/Invert/None` 已废弃→`onChange`，无回归。 | antd `interface.ts:222-256`；dg `types.ts:192-318` |
| `expandable`（整体） | expandable | 部分兼容 | 覆盖：`expandedRowRender/rowExpandable/expandedRowKeys/defaultExpandedRowKeys/onExpand/onExpandedRowsChange/columnWidth/expandIcon/defaultExpandAllRows/showExpandColumn/childrenColumnName/indentSize`。缺：`expandRowByClick/expandedRowClassName/columnTitle/fixed/expandedRowOffset`。 | antd `ExpandableConfig`；dg `types.ts:1078-1158` |
| `components`（整体） | components | 部分兼容 | 覆盖：`header.cell`/`body.cell`/`body.row`。缺：`table/header.table/header.wrapper/header.row/body.wrapper/body 函数形态`。语义有适配（cell/row 见「名兼义异」）。 | antd rc-table components；dg `types.ts:742-769` |
| `sticky`（整体） | TableProps | 部分兼容 | 覆盖：`boolean \| { offsetHeader?, offsetScroll?, getContainer? }`，页面级 sticky 表头 + 底部 fake scrollbar。缺：`offsetSummary`。 | antd rc-table `interface.d.ts:199`；dg `types.ts:1017-1054, 1658` |
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
| `type/selectedRowKeys/defaultSelectedRowKeys/onChange/getCheckboxProps/columnWidth/fixed/hideSelectAll/align/selections/preserveSelectedRowKeys/checkStrictly/renderCell` | rowSelection | dg `types.ts:192-318` |
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

1. **`scroll.y` 仅 `true\|undefined`**（antd 接受 `number=max-height`）。dg 不把 number 当 max-height，需要表体限高请用容器约束。决策 7。**`scroll.scrollToFirstRowOnChange` 完全未实现。** 证据：antd `InternalTable.tsx:177-178, 426-427`；dg `types.ts:990, 1313`。

2. **`locale` 仅 `emptyText`**（antd 18 字段）。**FilterDropdown 把 `filterConfirm/Reset/emptyText/searchPlaceholder/filterCheckAll` 硬编码英文**（OK / Reset / "Select all items" / "Search in filters" / "No filters"）→ i18n 完全失效。这是 i18n 项目最优先要修的项。证据：dg `engine\FilterDropdown.tsx:420, 539, 568, 633, 636` + `types.ts:1586`；antd `interface.ts:41-63`。

3. **`pagination` 默认关**（antd 默认开 10/页）。dg 不传则无分页条；从 antd 迁入需要显式 `pagination={{}}` 才能拿到默认分页条。证据：dg types.ts（pagination 默认 undefined/false）。

4. **`rowSelection` 缺 `onSelect/columnTitle/onCell/getTitleCheckboxProps`**（均非 deprecated）。`onSelectMultiple/All/Invert/None` 已 deprecated→`onChange`，无回归。证据：antd `interface.ts:230, 243, 253, 254-255`；dg `types.ts:192-318`。

5. **`expandable` 缺 `expandRowByClick/expandedRowClassName/columnTitle/fixed/expandedRowOffset`**。证据：antd `ExpandableConfig`；dg `types.ts:1084-1085, 1107-1158`。

6. **`components` 缺 `table/header.table/header.wrapper/header.row/body(wrapper)/body 函数形态`**。`body.cell`/`body.row` 已通，但语义有适配（见「名兼义异」）。证据：dg `types.ts:742-769`。

7. **RTL（`direction`）未支持**。通过 ConfigProvider 注入，dg 未消费。证据：dg types.ts 全仓无 `direction`/`RTL`。

8. **`render` 返回 `RenderedCell{ props:{colSpan,rowSpan} }` 对象形态未支持**。合并语义在 dg 统一走 `onCell` 返回 `{ colSpan, rowSpan }`（决策：合并路径单一化）。证据：antd rc-table `RenderedCell`；dg `types.ts:470`（render 仅 ReactNode）+ `501-514`（onCell 承载合并）。

9. **`sticky.offsetSummary` 缺**；**`dataIndex` 不支持 `DeepNamePath`**（运行时支持路径数组，类型不深）。证据：antd rc-table `interface.d.ts:199`；dg `types.ts:1658, 376`。

10. **`ColumnType` 缺 `rowSpan`(独立字段,仅 onCell)/`filtered`/`sortIcon`/`filterResetToDefaultFilteredValue`**；**`filterDropdownProps` 仅透传子集**。证据：antd `interface.ts:159, 163, 178, 179`；dg `types.ts:373-548`。

---

## 建议优先对齐项

按「迁移影响面 × 实现成本」排序：

1. **P0：FilterDropdown i18n**（TOP #2）—— 把 5 处硬编码英文接到 `locale.filterConfirm/Reset/filterEmptyText/filterSearchPlaceholder/filterCheckAll`。i18n 项目硬需求，改动局部。
2. **P0：`pagination` 默认开**（TOP #3）—— 与 antd 默认一致（默认 10/页），避免迁移时漏分页条。需评估对现有 demo 的回归。
3. **P1：`rowSelection.onSelect/columnTitle/onCell/getTitleCheckboxProps`**（TOP #4）—— 都是 antd 在用、非 deprecated 的字段，迁移真实业务会立刻踩到。
4. **P1：`scroll.y` 支持 `number`（max-height）+ `scrollToFirstRowOnChange`**（TOP #1）—— 表体限高是常见诉求。
5. **P2：`expandable` 缺字段补齐**（TOP #5）—— `expandRowByClick`/`expandedRowClassName` 用得多。
6. **P2：`components` 缺槽位补齐**（TOP #6）—— 至少 `header.row`/`body.wrapper`。
7. **P3：`column.sortIcon`/`filtered`/`filterResetToDefaultFilteredValue`/`filterDropdownProps` 全透传**（TOP #10）。
8. **P3：`sticky.offsetSummary`、`dataIndex` 深类型、RTL**（TOP #7/#9）—— 长尾，按需。

---

## data-grid 专属 → gridOptions / gridColumnOptions

> 下列字段在 antd Table **不存在**，是 data-grid 因 CSS Grid 架构或增强能力引入的。
> 按命名空间策略（见 `docs/grid-options-namespace.md`），它们应收入 `gridOptions`（表级）/ `gridColumnOptions`（列级），**不污染**顶层 `TableProps`/`ColumnType` 的 antd 兼容 API。

| 字段 | 归属 | 说明 | antd 有无 |
|------|------|------|-----------|
| `gridOptions.rowHeight` / `minRowHeight` / `maxRowHeight` | 表级 | 行高约定（虚拟化用，antd 行高随内容）。 | 无 |
| `gridOptions.headerHeight` | 表级 | 表头高度约定。 | 无 |
| `gridOptions.resizable` / `resizableMinWidth` / `resizableMaxWidth` | 表级 | 列宽拖拽调整（antd v6 核查无 resizable）。 | 无 |
| `gridOptions.autoScrollOnDrag` | 表级（规划）| 拖到边缘自动滚动。见 `docs/ag-grid-drag-candidates.md`。 | 无 |
| `gridOptions.dragToPinColumn` / `hideColumnOnDragAway` / `rowDropTargets` / `dragPreview` / `multiRowReorder` | 表级（规划）| 拖拽增强候选。 | 无 |
| `gridOptions.columnReorder` | 表级（规划）| 列重排总开关。 | 无 |
| `gridColumnOptions.movable` / `lockPosition` / `cellDragSource` | 列级（规划）| 列级拖拽选项。 | 无 |

> 注：顶层 `rowHeight`/`headerHeight`/`resizable*` 在历史版本中位于 `TableProps` 顶层，正在硬迁移到 `gridOptions`（删顶层、更新 demo），详见 `docs/grid-options-namespace.md`。
