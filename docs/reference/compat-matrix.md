# antd v6 Table × data-grid 兼容矩阵

> **说明**：data-grid 是用 CSS Grid 重做的 antd Table，目标是兼容 antd v6。
> 本矩阵逐项判定 data-grid 对 antd Table **全量 API** 的支持度，给出证据（`file:line`）。
>
> 真相源：
> - antd：`{{AntDesign}}/components/table/interface.ts`（API 真相）、`InternalTable.tsx`、`node_modules\@rc-component\table\lib\*.d.ts`（rc-table 底层类型）。
> - data-grid：`src/table/types.ts`、`engine/*.tsx`、`Table.tsx`。

> **对照的是哪个版本（务必先读）**：本矩阵里所有「与 antd 一致 / 不一致」的判定，**默认对照的是我们测试时实际安装的
> antd 6.4.4**；底层组件另标版本（`@rc-component/table 1.10.2`、`@rc-component/util 1.11.1`）。
> `peerDependencies.antd` 写的是 `^6.1.0`，npm 当前最新是 6.6.5 ⇒ **参照是有版本的依赖，结论天生带版本条件**。
> 已确认的一例（`已实读参照源码`）：列上写 `defaultSortOrder` 且该列带 `responsive` 断点时，
> **antd 6.5.x 起**参照改用「响应式过滤之前」的列收集排序态（上游 `components/table/InternalTable.tsx:472-476`
> ＋ `components/table/hooks/useSorter.tsx:424`），**6.4.4 不这么做** ⇒ 装 6.5+/6.6 的用户会看到
> "antd 排序了、我们没排序"的结果差异，我们与 6.4.4 同值。
> 「参照版本条件性」这一整类**尚未做全量扫描**，未覆盖范围见
> [known-limitations.md](known-limitations.md) 末尾。

## 迁移前检查

迁移 antd Table 到 data-grid 前，先确认业务代码没有依赖 antd/rc-table 已标记过时的 API。data-grid 的兼容目标是 antd v6 的当前公共 API 和常用迁移路径，不承诺复刻已被 antd 标为 deprecated 且有性能风险的历史写法。过时成员的当前支持、限制和迁移建议见 [deprecated-antd-table-members.md](deprecated-antd-table-members.md)。

重点检查：

- `columns.render` 返回 `{ children, props }` 的对象形态中，`props` 已在 rc-table 中提示有性能问题并建议改用 `onCell`。data-grid 只消费 `children`；`props.colSpan` / `props.rowSpan` / `className` / `style` / 事件等不会生效。
- 需要数据格合并时，改为 `column.onCell(record, index)` 返回 `{ colSpan, rowSpan }`。
- 需要单元格样式、事件或自定义 cell 组件参数时，优先使用 `column.className` / `column.style` / `onRow` / `components.body.cell`，并按 data-grid 的 div-grid 挂载点重新确认选择器和事件目标。
- antd 自身已废弃的 Table 字段，例如 `expandable.expandedRowOffset`，迁移前应尽量改成当前推荐写法；兼容矩阵中单独标注的历史字段不应作为新代码依赖。

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
| `scroll.y = number\|string`（滚动区域高度语义） | TableProps.scroll | 未实现 | dg 的 `scroll.y` 仅接受 `true`（启用容器内纵向滚动 + sticky 表头），不把 number/string 当作滚动区域高度。antd/rc-table 接受 number/string 作为滚动区域高度。决策 7。 | antd `InternalTable.tsx:177`；rc-table `Table.d.ts:55` (`y?: number \| string`)；dg `types.ts:990, 1313`（`y?: true`）|
| `direction: 'rtl'`（RTL 布局） | ConfigProvider | 未实现 | dg 无 RTL 支持；`direction` 通过 ConfigProvider 注入，dg 未消费。 | antd `ConfigProvider` direction；dg 全仓无 `direction`/`RTL` 字段（types.ts 无命中）|
| `components.table` | components | 未实现 | 整个 `<table>` 替换。dg 无 table 元素。 | antd rc-table components；dg `types.ts:742-769`（TableComponents 仅 header/body，无 table）|
| `components.header.table` | components | 未实现 | 表头 `<table>` 替换。 | dg `types.ts:747-749`（header 只有 `cell`）|
| `components.header.wrapper` | components | 未实现 | 表头 `<thead>` 替换。 | dg `types.ts:747-749`（仅 `cell`）|
| `components.header.row` | components | 未实现 | 表头 `<tr>` 替换。 | dg `types.ts:747-749`（仅 `cell`）|
| `components.body.wrapper` | components | 未实现 | 表体 `<tbody>` 替换。 | dg `types.ts:769`（body 仅 `row`/`cell`，无 wrapper）|
| `components.body`（函数形态） | components | 未实现 | antd 的 `components.body` 支持 `(node, ...) => ReactNode` 函数形态（custom-render-body demo）。dg 仅支持对象 `{ cell?, row? }`。 | antd rc-table `body?: CustomizeScrollBody \| {…}`（`interface.d.ts:130`）；dg `types.ts:769`（仅对象）|
| `column.rowSpan`（独立字段） | ColumnType | 未实现 | antd column 上的 `rowSpan` 独立字段（非 onCell 返回）。dg 仅支持 `onCell` 返回 `{ rowSpan }`；`render` 返回对象形态的 `props` 已废弃并忽略。 | antd `interface.ts` ColumnType（继承 rc-table `ColumnSharedType.rowSpan`）；dg `types.ts:373-476`（无独立 `rowSpan`，仅 onCell 路径）|
| `column.filterDropdownOpen`（deprecated） | ColumnType | 未实现 | 旧的筛选下拉受控打开字段。dg 未暴露该字段；使用 `filterDropdownProps.open`。 | antd `interface.ts` deprecated 字段；dg `compat\column.ts` / `compat\filter.ts` 无此字段 |
| `column.onFilterDropdownOpenChange`（deprecated） | ColumnType | 未实现 | 旧的筛选下拉打开变化回调。dg 未暴露该字段；使用 `filterDropdownProps.onOpenChange`。 | antd `interface.ts` deprecated 字段；dg `compat\column.ts` / `compat\filter.ts` 无此字段 |
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

---

## 三、部分兼容（同名同义主体一致，但有差异）

| API | 归类 | 支持度 | 差异/说明 | 证据 |
|-----|------|--------|-----------|------|
| `scroll`（整体） | TableProps | 部分兼容 | `x` 接受 `true\|number\|string`；`y` 仅 `true`（不接受 number/string 滚动区域高度）。`scrollToFirstRowOnChange` 已支持，默认开启，可设 `false` 关闭。 | rc-table `Table.d.ts:53-56`；dg `publicTypes.ts` / `Table.tsx` / `usePaginationAdapter.ts` |
| `rowSelection`（整体） | rowSelection | 部分兼容 | 覆盖：`type/selectedRowKeys/defaultSelectedRowKeys/onChange/onSelect/onSelectMultiple/onSelectAll/onSelectInvert/onSelectNone/getCheckboxProps/getTitleCheckboxProps/columnTitle/onCell/columnWidth/fixed/hideSelectAll/align/selections/preserveSelectedRowKeys/checkStrictly/renderCell`。仍有 DOM 形态适配差异。 | antd `interface.ts:222-256`；dg `compat/selection.ts` / `selectionAdapter.tsx` / `useSelectionAdapter.ts` |
| `expandable`（整体） | expandable | 部分兼容 | 覆盖：`expandedRowRender/expandedRowOffset/rowExpandable/expandedRowKeys/defaultExpandedRowKeys/onExpand/onExpandedRowsChange/columnWidth/expandIcon/defaultExpandAllRows/showExpandColumn/childrenColumnName/indentSize/expandedRowClassName/columnTitle/fixed`。⚠️ **`expandRowByClick`**：树形与非树形一视同仁——点行体即切换该行／被点节点的展开态（树形下只切换含非空 `children` 的行），判据与边界见 [known-limitations.md](known-limitations.md) 的「展开」一节。`expandIcon` 同样分档：单层/树形缩进位都已支持，但只在存在展开列时生效（参照亦然，见下）。 | antd 6.4.4 `es/table/InternalTable.js`（`mergedExpandable`）；`@rc-component/table 1.10.2 es/hooks/useRowInfo.js:22-24, 32-35`（树形行也走 `expandRowByClick`）；dg `compat/expand.ts` 的 `ExpandableConfig` ＋ `expandAdapter.tsx` 的 `buildExpandColumnNode`（消费 `columnTitle`/`fixed`） |
| `components`（整体） | components | 部分兼容 | 覆盖：`header.cell`/`body.cell`/`body.row`。缺：`table/header.table/header.wrapper/header.row/body.wrapper/body 函数形态`。语义有适配（cell/row 见「名兼义异」）。 | antd rc-table components；dg `types.ts:742-769` |
| `sticky`（整体） | TableProps | 部分兼容 | 覆盖：`boolean \| { offsetHeader?, offsetSummary?, offsetScroll?, getContainer? }`，页面级 sticky 表头、fixed summary 偏移 + 底部 fake scrollbar。`offsetSummary` 在 fixed summary、页面级 sticky、非 `scroll.y` 数据区域模式下生效。 | antd rc-table `interface.d.ts:199`；dg `compat/sticky.ts` / `useScrollMode.ts` / `ScrollContainer.tsx` |
| `locale`（整体） | locale | 部分兼容 | 已接入 `useLocale('Table')`，优先级为 `TableProps.locale > ConfigProvider locale.Table > 默认英文`。已消费：`emptyText`、FilterDropdown 的 `filterConfirm/filterReset/filterEmptyText/filterSearchPlaceholder/filterCheckAll`、selection 内置菜单、排序 hover title、展开按钮 aria。`filterTitle` / `sortTitle` / `selectAll` **不消费，但参照同样不消费** ⇒ **不算 data-grid 的偏离**（此前登记为缺口，本轮实读参照后撤销，见 [known-limitations.md](known-limitations.md) 的撤账表）。 | antd 6.4.4 `es/table/interface.d.ts:20,31,35`（只有类型声明；`es/table/` 全目录搜这三个词只有这三处 `.d.ts` 命中）；dg `compat/locale.ts` / `Table.tsx` / `engine/FilterDropdown.tsx` |
| `filterDropdownProps` | ColumnType | 部分兼容 | 透传多数 antd Dropdown props；`open` / `onOpenChange` / 弹层内容由筛选状态机接管。⚠️ **开合语义两处与参照分叉（登记不修）**：参照关闭应用有两道门，我们只接了"自定义面板关闭不应用草稿"那道（`!column.filterDropdown && filterOnClose`），**第一道门 `info.source === 'trigger'` 没接** ⇒ 弹层内点 `<Menu>` 项时的**开合时机**与参照不同（我们收面板、参照保持打开），数据不丢、回调不吞；连带地，用户自传 `onOpenChange` 收到的**通知集合与参照相反**（Menu 点项我们通知、参照不通知；`confirm()`／`clearFilters({closeDropdown:true})`／`close()` 这三条程序化关闭参照通知、我们不通知）。正典与绕法见 [known-limitations.md](known-limitations.md) 的「筛选与排序」一节。 | antd 6.4.4 `es/table/hooks/useFilter/FilterDropdown.js:240-249`（门 ①＋门 ②）、`:123-129`（`triggerVisible` 内同步转发 `onOpenChange`）；dg `compat/filter.ts` / `engine/FilterDropdown.tsx:354-376`（`handleOpenChange` 不看来源）、`:385-412`（三个程序化入口不经 `handleOpenChange`）；`interface.ts:138-149, 178` |
| `dataIndex` | ColumnType | 兼容支持 | 运行时支持路径数组；类型提供有限深度 `DeepNamePath`，避免循环数据结构导致 TS 递归过深。 | antd rc-table `DeepNamePath`；dg `compat/column.ts` |
| `onCell` 返回的 `rowSpan`（树形数据下） | ColumnType（`onCell`） | 部分兼容 | 两者在纯扁平行上一致；**data-grid 有增强**：树形 `dataSource` 会先 DFS 扁平化，我们让 `rowSpan` 数的是**行**——已展开的子行不占配额，而是作为附加轨道并入合并区（`resolveCoveredTrackEnd`），`grid-row` / `aria-rowspan` 报轨道数。antd 按扁平行计，子行吃掉名额：`rowSpan: 3` 的分组格展开一个父行的子行后只盖到"父行 + 2 条子行"，同组剩余行（惯例 `rowSpan: 0`）整列留空、边框断开。语义与算例见 [header-and-span.md](../features/layout/header-and-span.md) 的「树形数据上的合并」一节。 | antd 6.4.4 `@rc-component/table` `Body/BodyRow.js`（`onCell` 返回值直接落到 `<td rowspan>`）；dg `engine/cellMerge.ts` 的 `resolveCoveredTrackEnd` ＋ `engine/GridTable.tsx` 的 `rowLevels`（按 `treeState.rowInfoMap` 派生） |
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
| `classNames`（TableSemanticType：root / section / content / title / footer / header.row / header.cell / body.row / body.cell / pagination.root / pagination.item） | styles | dg `types.ts`（语义槽声明）。⚠️ `header.wrapper` / `body.wrapper` **已从公共类型面删除**（无对应 DOM 宿主，传了会编译报错），替代写法见 [known-limitations.md](known-limitations.md) 的「语义样式与 DOM」一节。 |
| `styles`（同上语义槽） | styles | dg `types.ts`（与 `classNames` 同形状、同删除面）。 |
| `showSorterTooltip`（含 SorterTooltipProps.target） | TableProps | antd `interface.ts:67-71, 160`；dg types.ts |
| 一对一 `.ant-table-*` 类名 | styles | 已输出稳定节点 alias：`ant-table-wrapper`、`ant-table`、`ant-table-container`、`ant-table-content`、`ant-table-title`、`ant-table-footer`、`ant-table-cell`、`ant-table-cell-fix-left/right`、排序类、`ant-table-filter-trigger`。依赖 `thead/tbody/tr/td` 层级的选择器不在此兼容面。 |

### 列（ColumnType 大部分）

| API | 归类 | 证据 |
|-----|------|------|
| `key/title/width/align/fixed/className/style/onHeaderCell/ellipsis(含 showTitle)/hidden/render/children` | ColumnType | dg `types.ts:373-476` |
| `hidden`（组级 vs 叶子级，29-D 已修） | ColumnType.hidden | 组级（有 `children`）`hidden: true` 连同整棵子树移除——对齐 antd@6.4.4 `@rc-component/table` `useColumns` `filterHiddenColumns`（修点 `columnAdapter.ts:171`，BAT-35 35-A）；叶子级 `hidden` 走 0fr track（保留 DOM ＋ `.dg-cell-hidden`，`gridTemplateColumnsUtils.ts:86`） |
| `render` 返回 `RenderedCell{ children, props }` 对象形态 | ColumnType.render | dg 仅兼容 `children` 内容；`props` 废弃并忽略，合并请用 `onCell`，其它内置格样式/事件请用 column/onRow 或自定义 body.cell |
| `sorter`（bool/CompareFn/ColumnSorter）/ `sortOrder` / `defaultSortOrder` / `sortDirections` | ColumnType | dg `types.ts:339-353, 522+` |
| `filters` / `filterDropdown` / `filterMultiple` / `filteredValue` / `defaultFilteredValue` / `filterIcon` / `filterMode` / `filterSearch` / `onFilter` / `filterOnClose` | ColumnType | antd `interface.ts:162-194`；dg `types.ts` + `engine\FilterDropdown.tsx` |
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

> 迁移 antd → data-grid 时最易踩坑的几项（务必逐项核对）。

1. **`scroll.y` 仅 `true\|undefined`**（antd 接受 number/string 滚动区域高度）。dg 不把 number/string 当滚动区域高度，需要表体限高请用容器约束。`scroll.scrollToFirstRowOnChange` 已支持，默认开启，可设 `false` 关闭。

2. **树形数据下 `expandable.expandRowByClick` 与单层表格同形**（点行体会展开/收起被点节点，`src/table/Table.tsx` 的 `treeRowClickExpandEnabled` 走树的 `expandableKeySet` / `toggleExpand`）。它列在这里只因为最容易被读成"data-grid 不支持、要自己接管行点击"⇒ 迁移时**不要**再加一层手动展开。参照侧树形行同样走该判据（`@rc-component/table 1.10.2 es/hooks/useRowInfo.js:22-24, 32-35`）。`读码`

3. **函数式 `column.title` 未移植**：参照把它当公开能力（`antd 6.4.4 es/table/interface.d.ts:72` ＋ `es/table/util.js:14-19`），我们只收 `ReactNode`。实测形状是**标题渲染为空、不抛错**，开 `ellipsis` 时**连原生 `title` 悬浮提示也一起丢**；TypeScript 用户会被类型面拦住。现值：**开发态会按列发一条 `console.warn`**（消息点名是哪一列，并写明这三条后果），因此 JS 用户不再只能靠文档发现——但**渲染行为未变**（仍为空）。能力保持不移植（属功能移植）。`探针实测`

4. **`locale` 为部分兼容**。已接入：`emptyText`、FilterDropdown 的 `filterConfirm/filterReset/filterEmptyText/filterSearchPlaceholder/filterCheckAll`、selection 内置菜单 `selectionAll/selectInvert/selectNone`、排序 hover title `triggerDesc/triggerAsc/cancelSort`、展开按钮 aria `expand/collapse`。`filterTitle` / `sortTitle` / `selectAll` 我们不消费，但 **antd 6.4.4 同样只在 `es/table/interface.d.ts:20,31,35` 声明、实现零引用** ⇒ 这不是 data-grid 的偏离（此前登记为缺口，本轮撤销）。证据：dg `compat/locale.ts`、`Table.tsx`、`engine/FilterDropdown.tsx`；antd 6.4.4 `es/table/interface.d.ts:17-38`。

5. **`rowSelection` 仍为部分兼容**。常用字段已覆盖，包括 `columnTitle/onCell/getTitleCheckboxProps/onSelectMultiple`；剩余风险主要来自 data-grid 无原生 `<tr>` 行层级，选择列 cell/header props 的实际挂载点与 antd 有 div-grid 适配差异。另注意两处**同名同义但优先级跟参照走**的判据：`getTitleCheckboxProps().indeterminate` 会被内部计算值**覆盖**（参照的 spread 顺序如此，`antd 6.4.4 es/table/hooks/useSelection.js:357, 359`），而 `['aria-label']` 用户值仍可覆盖参照的硬编码默认名。

6. **`expandable.columnTitle` / `expandable.fixed` 已支持**（此前记为"缺"，本轮按实读改记）。两者都被展开列的构造函数消费：见 `src/table/expandAdapter.tsx` 的 `buildExpandColumnNode`（`title: columnTitle ?? null`、`fixed: normalizeFixed(fixed)`）。字段声明在 `src/table/compat/expand.ts` 的 `ExpandableConfig`。`读码`

7. **`components` 缺 `table/header.table/header.wrapper/header.row/body(wrapper)/body 函数形态`**。`body.cell`/`body.row` 已通，但语义有适配（见「名兼义异」）。证据：dg `types.ts`（`TableComponents`）。

   `.ant-table-*` 类名不是整体缺口：能映射到稳定节点的 alias 已输出；只有依赖原生 table 结构的选择器需要迁移。

8. **RTL（`direction`）未支持**。通过 ConfigProvider 注入，dg 未消费。证据：dg types.ts 全仓无 `direction`/`RTL`。

9. **`ColumnType` 缺 `rowSpan`(独立字段,仅 onCell props)/`filterDropdownOpen`/`onFilterDropdownOpenChange`**。证据：antd `interface.ts`；dg `compat/column.ts`。

---

## 建议优先对齐项

按「迁移影响面 × 实现成本」排序：

1. **P1：`components` 缺槽位补齐**（见上面「`components` 缺 table / header.* / body.wrapper」那条）—— 至少 `header.row`/`body.wrapper` 可以提供 data-grid 语义下的适配；完整 table DOM 替换仍受架构限制。
2. **P1：树形 `expandRowByClick`——已收口，不属待对齐项**（见上面「树形数据下 `expandable.expandRowByClick` 与单层表格同形」那条）—— 树形与非树形一视同仁地点行体切换展开态。
3. **P2：RTL**（见上面「RTL（`direction`）未支持」那条）—— 长尾，按需。

明确不作为迁移优先项：

- `scroll.y` 支持 `number|string` 滚动区域高度语义。data-grid 维持 `true | undefined`，避免回到 antd Table 需要调用方计算高度、数字/字符串后果不可控的痛点。

已不再作为优先缺口：

- FilterDropdown i18n 已接入 `locale.filterConfirm/filterReset/filterEmptyText/filterSearchPlaceholder/filterCheckAll`。
- `pagination` 默认开启已对齐 antd，`pagination={false}` 才关闭。
- `scroll.scrollToFirstRowOnChange` 已实现，默认开启，可设 `false` 关闭。
- `render` 返回 `RenderedCell{ children, props }` 对象形态仅保留 `children` 内容兼容；`props` 废弃并忽略。
- `rowSelection.onSelect/onSelectMultiple/onSelectAll/onSelectInvert/onSelectNone/columnTitle/onCell/getTitleCheckboxProps` 已实现。
- `rowSelection` 的「范围随分页」三档分母已对齐 antd 6.4.4（BAT-35 35-F）：**表头全选 / 菜单 INVERT / 菜单 NONE 保留面**限定在**当前页**，**菜单 ALL** 保持**全量**，**树形 conduction 的 disabled 判据**走**全量**（一行 disabled 与否是行属性，跨页一致）。参照 `antd 6.4.4 es/table/hooks/useSelection.js:92（flattenData(pageData)）/201-208（ALL 用 data）/217-227（INVERT 遍历 pageData）/242-245（NONE 的 checkboxPropsMap 建在 pageData）/271-277（recordKeys 建在 pageData）`。
- 拖拽排序已通过 `gridOptions.rowDragSort` / `gridOptions.columnDragSort` 作为公开 API 采用；内部 hook 不从主入口导出，demo 也不直接导入内部 hook。

---

## data-grid 专属 → gridOptions / gridColumnOptions

> 下列字段在 antd Table **不存在**，是 data-grid 因 CSS Grid 架构或增强能力引入的。
> 按命名空间策略（见 [grid-options-namespace.md](grid-options-namespace.md)），它们应收入 `gridOptions`（表级）/ `gridColumnOptions`（列级），**不污染**顶层 `TableProps`/`ColumnType` 的 antd 兼容 API。

| 字段 | 归属 | 说明 | antd 有无 |
|------|------|------|-----------|
| `gridOptions.rowHeight` / `minRowHeight` / `maxRowHeight` | 表级 | 行高约定：非虚拟路径作 grid track（不测）；虚拟路径作 RO 测量的未测兜底/初值（measured-first，antd 行高随内容）。 | 无 |
| `gridOptions.virtualizationMode` | 表级 | 虚拟渲染模式：`standard` / `recycling`。仅在 `virtual` + `scroll.y=true` 时生效。 | 无 |
| `gridOptions.headerHeight` | 表级 | 表头高度约定。 | 无 |
| `gridOptions.resizable` / `columnResizeMode` / `resizableMinWidth` / `resizableMaxWidth` | 表级 | 列宽拖拽调整。**参照侧没有这个宿主**（见下方注）：手柄的 `role="separator"` 与 `aria-label="Resize column"` 属我们**超出参照的自有无障碍增强**，并且**不走 locale**——参照的规矩是「有 locale 键就走键，没键就写英文字面量」。 | 无 |
| `gridOptions.scrollBarFoldMode` | 表级 | data-grid 悬浮滚动条显示/折叠策略。 | 无 |
| `gridOptions.selection` | 表级 | data-grid 原生选择行为：`selectionMode/showSelectionColumn/selectedValues/getSelectionValue` 等；优先级高于 antd 兼容层 `rowSelection`，但不污染兼容 API。 | 无 |
| `gridOptions.rowDragSort` / `columnDragSort` | 表级 | data-grid 行/列拖拽排序公开入口，通过回调提交新顺序。 | 无 |
| `gridOptions.autoScrollOnDrag` / `columnReorder` / `multiRowReorder` | 表级 | data-grid 拖拽排序增强项：边缘自动滚动、列重排总闸、多选行成块重排。 | 无 |
| `gridColumnOptions.dragColumnLock` | 列级 | 列级拖拽锁定选项。 | 无 |
| `gridColumnOptions.renderCellElement` / `renderCellReact` / `disposeCellElement` | 列级 | recycling 虚拟化的低层 cell 渲染/清理 hook。普通业务优先使用 `render`、`onCell` 和 `components.body.cell`。 | 无 |

> 注：`dragToPinColumn` / `hideColumnOnDragAway` / `rowDropTargets` / `dragPreview` / `cellDragSource` 等名称仍属于候选扩展，放在 [ag-grid-drag-candidates.md](ag-grid-drag-candidates.md) 作为外部能力参考，不计入当前兼容矩阵。

> **「参照侧没有列宽拖拽宿主」是怎么证的**（本轮亲跑，含真阴性对照）：
> ① `antd 6.4.4` 的整个 `es/table` 目录里搜 `resiz`（大小写不敏感）**返回「无匹配」**——连这个词都不出现；
> ② `@rc-component/table 1.10.2` 里 `onColumnResize` 的全部命中都是宽度测量：`es/Body/MeasureCell.js:13`
> 把 `cellRef.current.offsetWidth` 报上去，`es/` 整棵树搜 `separator` **0 命中**、`es/Header/` 目录搜 `role` **0 命中**；
> ③ 同一把搜索刷子能命中我们自己注入的手柄 ⇒ 上面那两个 0 是**真阴性**、不是查找式失效。
> 因此这组字段是纯 data-grid 增强，没有"与 antd 对齐"的义务；那句英文 `aria-label` 被仓库里两条既有测试钉住，
> **改文案要连带翻测试**，不是随手可改的措辞。`已实读参照源码`

