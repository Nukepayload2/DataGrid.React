# 筛选与排序（filter & sorter）

data-grid 的排序图标（caret-up/caret-down）改用 antd `@ant-design/icons CaretUpOutlined/CaretDownOutlined`（非核心用 antd），筛选漏斗触发器视觉对齐 antd `filter.ts`。本文说明排序视觉、多列优先级徽标、筛选漏斗触发器、筛选下拉面板，以及与 antd 的差异。

## 排序（sorter）

视觉对齐 antd 6.4.4（`components/table/style/sorter.ts` + `#/demos/head` 右栏实测）：

| 类 | 用途 |
|---|---|
| `.dg-column-has-sorters` | 可排序列表头格——`cursor: pointer` + hover 背景（tableHeaderSortHoverBg） |
| `.dg-column-sort` | 当前排序列——表头背景 tableHeaderSortBg + 表体背景 tableBodySortBg（淡灰） |
| `.dg-column-sorters` | 表头格内部 flex 容器（title + 排序图标 space-between） |
| `.dg-column-title` | 标题文字，`flex: 1` 占据剩余空间 |
| `.dg-column-sorter` | 排序图标容器（`font-size: 0` 消除 caret 行高 + color 灰） |
| `.dg-column-sorter-inner` | caret-up + caret-down 垂直堆叠（inline-flex column） |
| `.dg-column-sorter-up/down` | antd CaretUpOutlined/CaretDownOutlined icon（SVG，12×12，`fill = currentColor`） |
| `.dg-column-sorter-active` | 激活 caret 主色高亮（colorPrimary=#1677ff） |

### 排序颜色取值

| 用途 | data-grid 消费 | antd 源 | 默认值 |
|---|---|---|---|
| caret 默认（未激活） | `--ant-table-header-icon-color` | headerIconColor（= colorIcon*opacityLoading） | rgba(0,0,0,0.294) |
| caret 激活 | `--ant-color-primary` | colorPrimary | #1677ff |
| 可排序表头 hover bg | `--ant-table-header-sort-hover-bg` | tableHeaderSortHoverBg |  |
| 当前排序表头 bg | `--ant-table-header-sort-active-bg` | tableHeaderSortBg |  |
| 当前排序表体 bg | `--ant-table-body-sort-bg` | tableBodySortBg |  |

### active caret 上提

`.dg-column-sorter-up + .dg-column-sorter-down { margin-top: -3.6px }`（对齐 antd `&-up + &-down { marginTop: -0.3em }`，0.3em × 12px = 3.6px），让 up caret 与 down caret 在 active 态视觉收紧。

### 排序列 hover 表体维持 sort 底色

`.dg-cell-body.dg-column-sort.dg-row-hover { background: var(--ant-table-body-sort-bg) }`——CSS 顺序在 dg-row-hover 之后（单类同优先级，后者覆盖），让排序列在 hover 时维持 sort 底色更视觉一致。

## 多列排序优先级徽标（data-grid 增强）

`.dg-column-sorter-priority`：多列模式下激活的排序列表头 caret 旁显示一个优先级数字徽标（1/2/3…）。

**这是 data-grid 增强，非 antd 对齐项**：antd 6.4.4 官方 multiple-sorter demo 与 sorter.ts 样式均无此徽标；此为 data-grid `SortIndicator` 自带渲染。

编号语义：1 = 最高优先级 = `sorter.multiple` **最大**（对齐 antd `getSortData` 的 `b.multiplePriority - a.multiplePriority` 实际比较顺序，multiple 大者先比较 = 主排序键）。

仅当该列激活（order 非 null）且处于多列模式时由适配层传入 priority；其它情况不渲染。

## 筛选（filter）

### 漏斗触发器 `.dg-filter-trigger`

对齐 antd `filter.ts:51-74`：

| 属性 | antd 源 | data-grid 消费 | 默认值 |
|---|---|---|---|
| 默认 color | headerIconColor | `--ant-table-header-icon-color` | rgba(0,0,0,0.45) |
| font-size | fontSizeSM | `--ant-font-size-sm` | 14（非 12） |
| marginBlock | `-paddingXXS` | `calc(var(--ant-padding-xxs) * -1)` | -4px |
| marginInline | `paddingXXS + (-tablePaddingHorizontal/2)` | `padding-xxs + calc(--ant-table-cell-padding-inline / 2 * -1)` | 4px + -8px |
| padding | `0 paddingXXS` | `0 padding-xxs` | 0 4px |
| borderRadius | 基础 borderRadius（非 tableRadius） | `--ant-border-radius` | 6 |
| min-height | used height（实测 30） | `min-height: 30px` | 30 |

负右 margin 让 trigger 右沿贴齐 cell 右内边距；负上下 margin 让 trigger 高度越过 cell padding 上下沿。

### hover trigger 自身（非表头格 hover）

**关键**：antd 是 `.ant-table-filter-trigger:hover`（trigger 自身 :hover），不是表头格 hover。data-grid 同款选择器。

| 用途 | antd 源 | data-grid 消费 | 原因 |
|---|---|---|---|
| hover color | colorIcon（无 opacityLoading 折扣，实色更深） | `--ant-color-icon` |  |
| hover background | tableHeaderFilterActiveBg | `--ant-color-fill-content` | 该 Table component token 默认值与 alias `colorFillContent` 同值，getComponentToken 剪枝同值键 → 原 `--ant-table-header-filter-active-bg` 在 DOM 上为空 → 解析为空 → 透明（FAIL）。改消费存活 alias。 |

### active 态（有筛选值）

`.dg-filter-trigger.dg-filter-trigger-active { color: var(--ant-color-primary) }`（对齐 antd `&.active { color: colorPrimary }`）。

active + hover 组合：antd filter.ts 仅两条规则——`:hover` 与 `.active`（无 background、无单独 active:hover 规则）。同特异性 (0,2,0) → CSS 源顺序决胜（active 在后）→ active:hover 实际值：color = colorPrimary（active 覆盖 hover 的 colorIcon），background = tableHeaderFilterActiveBg（active 未声明 background，不覆盖 hover 的 bg）。data-grid 显式声明 `.dg-filter-trigger-active:hover` 复刻该最终计算值。

### 纯 filter 列表头 hover 无 background

antd `sorter.ts:17-23` 的 `thead th.column-has-sorters:hover { background: tableHeaderSortHoverBg }` 只作用于**同时有 sorter 的列表头**。纯 filter 列（无 sorter，只有 has-filters 类）的表头格 hover **antd 不应用任何 background**——filter trigger 自身 hover 的 bg 独立。data-grid 删除了原"纯 filter 列表头 hover 变色"规则，对齐 antd。

## 筛选下拉面板 `.dg-filter-dropdown`

- `min-width: 120px`，背景 `--ant-color-bg-container`（同款 getComponentToken 剪枝 bug：`tableFilterDropdownBg` 默认值 = `filterDropdownBg` = `colorBgContainer`，剪枝后原 component token 在 DOM 上为空 → 透明，改消费存活 alias）。
- 圆角 `--ant-border-radius`。
- antd Dropdown 默认会包一层 popup 容器（带阴影/边框）；data-grid 只管面板内部布局。

内部：`.dg-filter-dropdown-menu`（项列表，padding 8、max-height 264、overflow-y auto）、`.dg-filter-dropdown-search`（搜索框区，padding 8 8 0）、`.dg-filter-menu-list`（flex column gap 4）、`.dg-filter-menu-item`（min-height 28）、`.dg-filter-checkbox-group`/`.dg-filter-radio-group`（强制 column 布局）、`.dg-filter-dropdown-btns`（底部按钮区，border-top 1px `--ant-table-border-color`）。

## 特殊情况

### `'Table.filter'` vs `'Table'` 占位语义

antd 的 `renderEmpty(componentName)` 用 componentName 区分两种 empty：`'Table.filter'` 是**筛选下拉内 filters 列表为空**时的占位（`(column.filters||[]).length===0` 时菜单区渲染，默认 antd `Empty SIMPLE` + `locale.filterEmptyText` "No filters"）；`'Table'` 是**表体 empty**（含筛选无结果），由 `Table.tsx` 的 `mergedEmptyNode` 统一处理（不区分原因）。两者易混——`'Table.filter'` 不影响表体，表体筛选无结果走 `'Table'`。

`FilterDropdown` 仅内置面板（menu/tree）消费此占位；自定义面板（`column.filterDropdown`）不消费。menu 模式下搜索过滤后无匹配项（`visibleItems` 为空）也复用同一占位（对齐 antd `isEmpty` 分支）。

### 关闭下拉用 `setTimeout(0)` 延迟卸载弹出层

点"确定"应用筛选时，`onApply` 同步调用（保证 onChange 在用户交互当下立刻 fire），但**关闭下拉（`setOpen(false)`）延迟到下一个宏任务**（`setTimeout(() => setOpen(false), 0)`）。

原因：antd v6 rc-dropdown 的弹出层 portaled 到 body，与表头格不在同一 DOM 子树，但 React 17+ 根委托（root delegation）+ 同步卸载弹出层会出现"事件分发途中目标节点被移除"的边界——残余的 click 派发可能落到弹出层背后坐标处的元素（如表头格），从而误触发表头 onClick（`onSorterClick`）——表现为"点 OK 还冒出一个 sortOrder"。延迟关闭让原生 click 分发完整结束后再卸载弹出层，彻底切断误派发路径。面板整体 `onClick`/`onMouseDown` `stopPropagation` 是同源问题的双重保险。

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| caret 图标 | antd `CaretUpOutlined/CaretDownOutlined`（非核心用 antd） | 同款 SVG icon |
| 多列优先级徽标 | data-grid 增强（SortIndicator 自带） | 无 |
| Dropdown 弹出层 | antd `<Dropdown>`（非核心用 antd） | antd 原生 |
| 表头 padding 间距 token | `--ant-table-cell-padding-inline`（= cellPaddingInline） | tablePaddingHorizontal |

## 引擎状态机（自研核心）

data-grid 自研排序/筛选状态机（下拉 UI 用 antd），对齐 antd `useSorter` / `useFilter` 语义。两个 hook 各自维护一份"每列一条状态"的集合，受控/非受控混合，并按固定顺序串联处理 dataSource。

### 排序状态模型（`useSorter`）

- 内部维护 `SortState[]`：每个**可排序**叶子列一条 `{ column, key, sortOrder, multiplePriority }`。
  - `sortOrder`：`'ascend' | 'descend' | null`。
  - `multiplePriority`：来自 `sorter.multiple`（number，**越大优先级越高**，对齐 antd `getSortData` 的 `b.multiplePriority - a.multiplePriority`）；`false` 表示单列排序器。
- **多列排序器**（`sorter: { compare, multiple }` 中 `multiple` 为 number）：点击该列**只改该列自身**的 sortOrder，不互斥清空其它列。
- **单列排序器**（`sorter` 为 boolean / 函数 / 对象但无 number `multiple`）：点击该列**清空所有其它列**（含多列），仅保留该列。
- sortDirections 循环（与 antd `nextSortDirection` 一致）：null → `sortDirections[0]`（默认 `'ascend'`）；非 null → `indexOf(current)+1`，越界回退 `null`。默认 `['ascend', 'descend']`：null → ascend → descend → null。

### 多列优先级叠加（稳定排序链）

非受控时按以下方式排序 dataSource：

1. 取所有激活列（`sortOrder != null`），按 `multiplePriority` **从大到小**排序。
2. 在 `Array.prototype.sort` 的比较器里，**从大 multiple 到小 multiple 依次**应用 compare：找到第一个 `!= 0` 的结果即返回；都为 0 则返回 0（稳定）。
3. 结果：multiple 大的列最先比较 = 主排序键；multiple 小的列后比较，在主键相等时作为次级排序细化。

单列排序器（`multiplePriority === false`）按 antd 规则只可能存在一列（点击即清空其它），故其优先级等同于"最高"（独立链）。

前端排序细节：`sorter: true` 走默认比较（数值 `-`、字符串 `localeCompare`、其它 `<`/`>`）；`sorter: (a,b)=>number` 自定义；`sorter: { compare }` 取 `compare`；descend 反转结果。`[...dataSource].sort()` 副本，不改原数组。

### 受控语义（对齐 antd）

受控模式**仍**调 `getSortData` 排序 dataSource——受控仅表示"状态来源 + onChange 通知"，不跳过数据处理（与 antd `InternalTable` 把 `mergedSorterStates` 喂给 `getSortData` 一致）。onChange 仍只在用户交互（`onSorterClick`）时触发，避免外部 state 变化造成循环。

### 筛选状态模型（`useFilter`）

- 内部维护 `Record<filterKey, filteredValue[]>`：每个**可筛选**叶子列一组激活值。`filterKey` = `column.key ?? dataIndex`（与 sortKey 同算法）。
- `filteredValue` 为 `Array<string|number>`，空数组 = "无激活筛选"（与 antd 一致：空数组/null 同义 = 该列未筛选）。
- **可筛选判定**（对齐 antd `useFilter/index.tsx:38`）：`filters || filterDropdownIsDefined || 'onFilter' in column` 任一存在即 filterable（渲染漏斗）。**onFilter 非必需**——服务端模式列声明 filters 但不传 onFilter，漏斗仍渲染、onChange 仍回传 filters、前端不过滤（数据由服务端处理）。
- 受控/非受控混合（与 useSorter 同款语义）：每列独立判定，受控列（`filteredValue !== undefined`，含 null/[] 显式受控）取外部值、非受控列（`defaultFilteredValue` 或都不传）取内部 state。merged 状态受控列用外部值、非受控列用内部 state。
- **受控仍参与前端过滤**（与 antd `getFilterData` 一致）：受控仅表示"状态来源 + onChange 通知"，不跳过数据处理。

### 前端筛选语义

- `filterMultiple=true`（默认）：保留命中**任一**激活值的 record（OR 语义）。
- `filterMultiple=false`：仅保留命中**唯一**激活值的 record（单选语义；多选时仍按 OR）。
- `filteredValue` 为空 → 该列不过滤（保留全部）。
- 多列叠加：AND 语义——每列各自过滤后取交集（record 必须通过所有可筛选列的过滤）。

### 处理链顺序：raw → sort → filter

对齐 antd：前端处理链为"先排序、后过滤"——

1. `useSorter` 对 raw dataSource 排序 → `sortedDataSource`。
2. `useFilter` 对 `sortedDataSource` 过滤 → `filteredDataSource`（最终渲染数据源）。

排序图标/排序态基于全量数据，筛选只是"在已排序的结果上裁剪"。与 antd `getFilterData` 在排序后的数据上再过滤的语义一致。

### onChange 分发

`useFilter` 不直接调 antd 全量 onChange（不持有排序态）。应用筛选（Dropdown 关闭/确定按钮）时调 `onFilterChange(filters, currentDataSource)`，适配层 `Table.tsx` 在此回调里注入最新 sorter（从 `useSorter` 取），组装完整的 `onChange(pagination, filters, sorter, extra)`：

- `pagination`：占位 `{}`（适配层替换为实际分页状态）。
- `filters`：`{ [filterKey]: filteredValue[] | null }`——所有可筛选列均出现为 key；无激活筛选的列值为 `null`（对齐 antd）。
- `sorter`：适配层从 `useSorter` 派生的最新排序结果。
- `extra`：`{ currentDataSource, action: 'filter' }`。currentDataSource 为排序+筛选后的数据源（受控为传入 dataSource）。

排序 onChange（`onSorterClick`）同款：sorter 形态——0 激活 → `{}`（data-grid 简化，调用方判 `!sorter.order`）；1 激活 → 单对象；≥2 激活 → `SorterResult[]`（按 multiple 升序输出，仅含 order != null 的列；此为 onChange 输出顺序，与排序优先级方向无关）。extra.action = `'sort'`。

### filters 扁平化

`ColumnFilterItem[]`（含 children，树形筛选）扁平化为 value 列表参与勾选（不做二级菜单 UI）。返回的扁平 value 列表仅用于"判定某 value 是否在 filters 配置中"等辅助；实际渲染下拉 UI 用原始 `ColumnFilterItem[]`（保留 text）。

## 关联源码

- [`src/table/style/table.css`](../../../src/table/style/table.css) — `.dg-column-has-sorters` / `.dg-column-sort` / `.dg-column-sorters` / `.dg-column-sorter*` / `.dg-column-sorter-priority` / `.dg-filter-trigger` / `.dg-filter-dropdown*` / `.dg-filter-menu-*`。
- [`src/table/engine/useSorter.ts`](../../../src/table/engine/useSorter.ts) — 排序状态机（`SortState`/`collectSortStates`/`getSortData`/`generateSorterInfo`/`nextSortDirection`）。
- [`src/table/engine/useFilter.ts`](../../../src/table/engine/useFilter.ts) — 筛选状态机（`resolveFilterKey`/`isFilterable`/`computeFilteredDataSource`/`buildFiltersArg`）。
- [`src/table/engine/FilterDropdown.tsx`](../../../src/table/engine/FilterDropdown.tsx) — 筛选下拉面板组件（menu/tree/自定义 + filterOnClose/localSelected 草稿 + antd 兼容 confirm/clearFilters）。
- [`src/table/engine/GridTable.tsx`](../../../src/table/engine/GridTable.tsx) — `dg-column-sort`（由 order 非 null 驱动）、`dg-column-sorter-active`（当前排序方向）。
- [`src/table/engine/SortIndicator.tsx`](../../../src/table/engine/SortIndicator.tsx) — 多列优先级徽标渲染。
- [`src/table/Table.tsx`](../../../src/table/Table.tsx) — Dropdown overlay（antd）、`onFilterChange` 适配（注入 sorter 组装完整 onChange）。
