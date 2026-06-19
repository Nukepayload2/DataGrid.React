# data-grid 开发任务计划

> **项目目标**：用 CSS Grid 重新实现 antd Table，并提供与之兼容的 **CSS variables** 与 **React 接口**。
>
> **参考来源**（均只读）：
> - `G:\Projects\trash-antd-table\lun` —— CSS Grid 表格参考库（Web Component + Vue 实现，功能不全）
> - `G:\Projects\ant-design` —— antd 官方源码，**已更新至 v6，版本 6.4.4**
> - `G:\Projects\ant-design\components\table` —— antd Table（含 demo）
> - `G:\Projects\trash-antd-table\react-component\table` —— rc-table（antd Table 底层）

本计划由两份调研支撑：**lun 能力判定** 与 **antd demo 功能点梳理**。

---

## 0. 调研结论速览（决策依据）

### 0.1 lun 能力判定

| 类别 | 能力点 | lun 参考位置 |
|------|--------|--------------|
| **A 可借鉴（算法成熟，重写为 React）** | CSS Grid 渲染骨架 | `packages/components/src/components/table/Table.tsx:198-206` |
| | 多级表头 grouping columns | `TableColumn.tsx:144-197` + `collector.ts` |
| | 固定列 fixed left/right（偏移计算） | `packages/core/src/composable/table/useSticky.ts` |
| | 合并单元格 colSpan/rowSpan | `TableColumn.tsx:70-114` |
| | 虚拟滚动 virtual | `packages/core/src/composable/virtual/useVirtual.ts` |
| | 选择状态机（全选/半选/单多选） | `packages/core/src/composable/select/index.ts` |
| | 隐藏列 / 列宽拖拽 resizable | `Table.ColumnResizer.tsx` + `hidden` 属性 |
| **B 部分（有思路需补全）** | 行展开 grid `0fr↔1fr` 过渡 | `Table.RowExpand.tsx` |
| | 省略号 ellipsis（prop 有，CSS 缺） | `table-column/basic.scss` |
| | 固定表头 sticky header（prop 有，SCSS 缺） | `type.ts:241` |
| | 边框 bordered（outline 方案有缺陷） | `table-column/basic.scss:42` |
| **C 缺失（必须自研）** | 排序 / 筛选 / 分页 / 树形 / 编辑 / 拖拽排序 / summary / responsive / 自定义空状态+loading / ajax | —— |
| **C 缺失（兼容层，自研）** | antd React 接口兼容（dataSource/columns/dataIndex/title/render/rowKey/rowSelection…） | —— |
| **C 缺失（兼容层，自研）** | antd **v6** CSS variables / design token 映射 | —— |

> **架构警示**：lun 是 **Web Custom Element + Vue**，其组件代码**不可直接复用**。移植类任务只借鉴其**算法与 CSS Grid 思路**，组件层必须用纯 React 重写。lun 的 `data/name/header/selected/renderer` 等 props 与 antd 的 `dataSource/dataIndex/title/rowSelection/render` **全面不同**，需自建 antd 接口适配层。
>
> **measureRow 不做**：`measureRowRender` 等动态行高测量属糟粕机制（bug 多于收益），不实现。行高统一走"行高约定"（见 §1.2 决策 2）。

### 0.2 antd demo 规模

共 **50 个对外 demo + `_semantic`（内部预览）+ 4 个 debug**。`measure-row-render` 标记为**不做**（糟粕）。其余 debug 类降级为有实际意义的边缘用例（见 D1）。

---

## 1. 架构基线与总体策略

### 1.1 架构基线

- **渲染层**：纯 React + CSS Grid（`display:grid` + `grid-template-rows/columns` + `grid-auto-flow:column`），参考 lun 思路重写。不使用 `<table>` 元素，不引入 Web Component。
- **接口层**：对外暴露与 **antd Table 兼容的完整 React API**（`columns`/`dataSource`/`rowKey`/`rowSelection`/`pagination`/`expandable`/`scroll`/`virtual`/`summary`/`onChange`/`components`…）。
- **样式层**：输出与 **antd v6 兼容的 CSS variables / design token**，使 antd v6 主题/CSS 可直接套用。
- **包管理**：pnpm + rolldown-vite + oxlint（已就绪）。

### 1.2 关键决策（已定）

1. **不实现无正常业务用例的兼容性 API**：`measureRowRender` 及类似的糟粕/纯调试兼容机制一律不做（`measure-row-render` demo 跳过）。
2. **虚拟滚动 × 展开**：虚拟窗口的渲染范围**按"收起状态"的行高计算**；展开内容直接渲染但**不参与虚拟窗口大小**（展开会拉长真实 DOM，牺牲性能换稳定性）。**tree 展开行视为普通表格行，遵循行高约定**（即树形展开的行本身受 rowHeight 约束，不动态测量）。
3. **antd 接口全兼容，分两步**：第一步覆盖**所有 demo 实际用到的 props 子集**；第二步补齐 antd Table 的**全部公共 API**。
4. **antd v6 token**：CSS variables 兼容 antd **v6**（参考项目 6.4.4）。**token 名以浏览器运行 antd 6.4.4 实测为准**（不确定的用 devtools 查实际变量名，不臆测）。
5. **发布形态**：暂按**项目内组件 + dev demo**开发；npm 打包/导出后置（待后续确认）。

### 1.3 任务划分规则

| 规则 | 适用对象 | 任务粒度 |
|------|----------|----------|
| **移植类（M）** | lun 已较好实现（A 类）或有思路（B 类） | **每个能力一个移植任务**，参考 lun 算法重写为 React |
| **自研类（S）** | lun 缺失（C 类） | **按 antd demo 的功能点逐点拆细，每个点一个自研任务** |
| **基础设施（F）** | 所有任务前置（引擎、接口层、样式层、demo 环境） | 优先完成 |
| **边缘（D）** | 有实际意义的边界/隔离用例 | 少量可选任务 |

### 1.4 通用工程约束

- 内部文件操作优先用内置 Read/Write/Edit/Grep/Glob（Windows 路径格式）；仅 pnpm 等命令用 Bash。
- 每个任务结束须通过 `pnpm lint`（0 error）与 `pnpm build`。
- 复刻 antd demo 的源码统一放 `src/demos/<demo名>.tsx`，通过 demo 框架路由访问（见 F4）。
- 不使用 WebSearch。
- **不实现糟粕/无正常用例的兼容性 API**（见决策 1）。

### 1.5 ★ 统一浏览器 UI 测试规范（所有任务必须执行）

每个任务交付前，必须完成基于浏览器的 UI 验证：

1. **复刻**：在 `src/demos/<demo>.tsx` 实现与 antd 同名 demo 等价的页面（数据、列、交互）。
2. **启动**：`pnpm dev`，确认 dev server 无报错。
3. **浏览器验证**：用 **chrome-devtools MCP** 打开对应路由页面（**必须用 Agent 工具隔离上下文**，遵守用户全局规约），对照 `G:\Projects\ant-design\components\table\demo\<demo>.tsx` 的官方行为逐项验证：
   - **渲染正确性**：表头/单元格内容、对齐、边框、尺寸与 antd 一致。
   - **交互行为**：点击排序/筛选/勾选/展开/拖拽/分页/编辑等，结果与 antd 一致。
   - **视觉对照**：必要时与 antd demo 截图比对（间距、配色、hover/active 态）。
   - **console 无 error**。
4. **存档**：截图存 `docs/verify/<任务号>-<demo>.png`。
5. **回归**：已通过的任务 demo 在本任务变更后回归一遍（确认无破坏）。
6. **token/变量核对**（样式相关任务）：用 devtools 对照 antd 6.4.4 实际变量名，确认 data-grid 输出的 CSS variables 名称一致。

---

## 2. 阶段 0：基础设施（Foundation，须最先完成）

> 所有后续任务的前置。产物是"能渲染一张与 antd basic demo 视觉一致的最简表格"。

### F1. CSS Grid 渲染引擎（核心）
- **来源**：[移植·参考 lun] `Table.tsx:198-206`
- **依赖**：—
- **目标**：实现内部渲染引擎。根据 `columns`（叶子列）与 `dataSource` 计算 `grid-template-rows`（表头行 + 每数据行）、`grid-template-columns`（叶子列宽拼接，缺省 `max-content`）、`grid-auto-flow:column`；用 div 渲染表头格与单元格。
- **要点**：先做非虚拟、非固定列的最简版；预留 `fixed`/`virtual`/`children`(多级表头)/`colSpan`/`rowSpan`/`rowExpand` 钩子。**支持 `rowHeight`（数字或函数）作为行高约定**——所有行高走约定值，不做动态测量。
- **验收（UI）**：渲染 5 列 × N 行普通表格，对照 antd `basic` demo 的排版与内边距。截图 `docs/verify/F1-basic.png`。

### F2. antd React 接口适配层（demo 子集优先）
- **来源**：[自研]
- **依赖**：F1
- **目标**：对外 `<Table>` 暴露 antd 兼容 props 并映射到内部引擎。**第一步**覆盖 demo 实际用到的子集：`dataSource`、`columns`（含 `dataIndex`/`title`/`render`/`width`/`align`/`fixed`/`ellipsis`）、`rowKey`、`bordered`、`size`、`showHeader`、`title`/`footer`、`tableLayout`。**第二步**（接口全兼容阶段）补齐 `components`、`onHeaderRow`、`onRow`、`rowClassName`、`customRow`、`getPopupContainer` 等全部公共 API。
- **验收（UI）**：用 antd `basic` demo 的 `columns`/`dataSource` 原样传入，页面渲染一致；`render` 自定义单元格（Tag/操作按钮）正常。回归 `basic`。

### F3. antd v6 CSS variables / token 样式层
- **来源**：[自研]
- **依赖**：F2
- **目标**：实现与 **antd v6** 兼容的 CSS variables / design token，引擎样式改为消费这些变量。覆盖表格相关 token 类别：单元格内边距、表头/表体背景与文字色、hover/选中行色、边框色、圆角、字号等。
- **方法论**：**token 名以浏览器运行参考项目 antd 6.4.4 实测为准**——实现前先跑参考项目，用 devtools 在 `.ant-table` 节点上读取实际 `--ant-*` 变量名，再据实落代码；拿不准的以实测为准，不臆测。
- **验收（UI）**：在 demo 页面 root 覆盖若干 `--ant-table-*` 变量，确认表格配色/间距随之变化；与 antd 6.4.4 默认渲染视觉一致。

### F4. demo 运行与测试环境
- **来源**：[自研]
- **依赖**：F2
- **目标**：搭建 dev-only demo 框架——demo 列表首页 + 路由（`/demos/<name>`），每个任务把 demo 挂到对应路由；提供与 antd demo 一致的布局外壳（含 `<ConfigProvider>` 占位、卡片/说明区）。
- **验收（UI）**：访问 `/` 见 demo 列表；访问任一 demo 路由能渲染。后续任务均在此环境内做 UI 测试。

---

## 3. 阶段 1：移植类任务（参考 lun，重写为 React）

> 每个 lun 已实现的能力一个移植任务，注明 lun 参考文件。

### M1. 多级表头 grouping columns
- **来源**：[移植·参考 lun] `TableColumn.tsx:144-197`、`collector.ts`
- **依赖**：F1
- **antd demo**：`grouping-columns`
- **目标**：支持 `columns[].children` 嵌套；collector tree 统计叶子列数，表头格用 `grid-column: span N` / `grid-row: span N`；与固定列可组合。
- **验收（UI）**：复刻 `grouping-columns`（含分组 + 固定列 + scroll）。回归 basic。

### M2. 固定列 fixed columns（左/右 + 间隙）
- **来源**：[移植·参考 lun] `useSticky.ts`、`useStickyTable`
- **依赖**：F1
- **antd demo**：`fixed-columns`、`fixed-columns-header`、`fixed-gapped-columns`
- **目标**：`column.fixed: 'start'|'end'`（或 `'left'/'right'`）；按左/右分组累加叶子列宽算 `position:sticky; left/right`，ResizeObserver 监听列宽；支持与固定表头组合、间隙堆叠（fixed-gapped）。
- **验收（UI）**：复刻 `fixed-columns`、`fixed-columns-header`、`fixed-gapped-columns`。

### M3. 合并单元格 colSpan / rowSpan
- **来源**：[移植·参考 lun] `TableColumn.tsx:70-114`（`updateMergeInfo`）
- **依赖**：F1
- **antd demo**：`colspan-rowspan`
- **目标**：`column.onCell` 返回 `{ colSpan, rowSpan }`（含 `=0` 不渲染）；合并区域左上角设 span，被覆盖格自动隐藏。表头合并用 `column.colSpan`/`rowScope`。
- **验收（UI）**：复刻 `colspan-rowspan`（表头列合并 + 单元格行/列合并）。

### M4. 虚拟滚动 virtual（含 × 展开）
- **来源**：[移植·参考 lun] `useVirtual.ts`
- **依赖**：F1
- **antd demo**：`virtual-list`
- **目标**：`virtual` + `scroll:{x,y}`(number) 开启；overscan、scroll 同步；行高走**约定值**（不做动态 measure）。**虚拟窗口范围按"收起状态"行高计算**——展开内容直接渲染但不计入虚拟窗口（见决策 2）；支持与固定列/选择/展开组合；`ref.scrollTo`。
- **验收（UI）**：复刻 `virtual-list`（万行 + 固定列 + 选择 + 展开 + 合并 + scrollTo）；特别验证：展开某行后滚动位置/窗口稳定、不跳动。

### M5. 行选择状态机 + 基础选择 UI
- **来源**：[移植·参考 lun] `select/index.ts`
- **依赖**：F2
- **antd demo**：`row-selection`
- **目标**：移植全选/半选(intermediate)/单选(radio)/多选(checkbox)状态机；适配为 antd `rowSelection` 接口（`type`、`selectedRowKeys`、`onChange(keys, rows)`、`getCheckboxProps`、`columnWidth`）；自动插入首列勾选格。
- **注意**：lun API（`selected`/`selectionMode`/`selectColumn`）与 antd 不同，重点是**适配层**。
- **验收（UI）**：复刻 `row-selection`（type 切换、`getCheckboxProps` 禁用、`onChange` 回调）。

### M6. 隐藏列 hidden columns
- **来源**：[移植·参考 lun] `hidden` 属性 + `0fr` 过渡
- **依赖**：F1
- **antd demo**：`hidden-columns`
- **目标**：`column.hidden`；切换时 grid track `0fr↔1fr` 过渡（如可行）；Checkbox 联动列显隐。
- **验收（UI）**：复刻 `hidden-columns`。

### M7. 列宽拖拽调整 resizable
- **来源**：[移植·参考 lun] `Table.ColumnResizer.tsx`
- **依赖**：F1
- **antd demo**：（antd 无原生对应，增强能力）
- **目标**：表头边缘拖拽改列宽（pointer 事件），更新 `grid-template-columns`。
- **验收（UI）**：拖拽列边缘改变宽度，列随之重排，无抖动。

### M8. 固定表头（容器内纵向滚动）
- **来源**：[移植+改造·参考 lun] `type.ts:241`（lun prop 有但 SCSS 未实现）
- **依赖**：F1
- **antd demo**：`fixed-header`
- **目标**：`scroll:{y}` 表头 `position:sticky; top:0` 固定，表体纵向滚动；与固定列组合（fixed-columns-header）。
- **验收（UI）**：复刻 `fixed-header`、`fixed-columns-header`。

### M9. 行展开（grid 过渡 + 展开图标列）
- **来源**：[移植+改造·参考 lun] `Table.RowExpand.tsx`（`0fr↔1fr` 思路；图标列自研）
- **依赖**：F1、（虚拟下展开）M4
- **antd demo**：`expand`、`expand-sticky`、`order-column`(展开列位置)
- **目标**：`expandable.expandedRowRender`、`rowExpandable`、`defaultExpandedRowKeys`；展开图标列（展开/收起态）；展开区用 grid track `0fr↔1fr` 过渡；`Table.EXPAND_COLUMN` 占位控制位置。**虚拟滚动下展开遵循决策 2**（窗口按收起算）。
- **验收（UI）**：复刻 `expand`（含 `rowExpandable` 禁用）、`expand-sticky`、`order-column`。

---

## 4. 阶段 2：自研类任务（按 antd demo 功能点细粒度拆分）

> lun 缺失的能力。**每个 antd demo 的每个功能点单独成任务**。

### 4.1 排序

#### S1. 单列排序（受控/非受控）
- **来源**：[自研]
- **依赖**：F2
- **antd demo**：`head`（排序部分）
- **目标**：`column.sorter`（boolean/函数）、`sortOrder`、`defaultSortOrder`、`sortDirections`；表头排序图标三态；点击触发 `onChange(pagination, filters, sorter)`。
- **验收（UI）**：复刻 `head` 的排序行为（含 `sortDirections`、`defaultSortOrder`、`showSorterTooltip`）。

#### S2. 多列排序
- **来源**：[自研]
- **依赖**：S1
- **antd demo**：`multiple-sorter`
- **目标**：`column.sorter = { compare, multiple }` 多列优先级；`onChange` 返回排序数组。
- **验收（UI）**：复刻 `multiple-sorter`。

### 4.2 筛选

#### S3. 基础列筛选
- **来源**：[自研]
- **依赖**：F2
- **antd demo**：`head`（筛选部分）
- **目标**：`column.filters`、`onFilter`、`filterMultiple`、`defaultFilteredValue`、`filterOnClose`；表头筛选下拉 + 勾选过滤；`onChange` 回调 filters。
- **验收（UI）**：复刻 `head` 的筛选行为。

#### S4. 受控筛选与重置
- **来源**：[自研]
- **依赖**：S3
- **antd demo**：`reset-filter`
- **目标**：受控 `filteredValue`/`sortOrder`；外部按钮一键重置（须指定 `column.key`）。
- **验收（UI）**：复刻 `reset-filter`。

#### S5. 自定义筛选面板
- **来源**：[自研]
- **依赖**：S3
- **antd demo**：`custom-filter-panel`
- **目标**：`filterDropdown`、`filterIcon`、`filterDropdownProps`、`onFilter`；下拉内搜索 + 高亮；`confirm`/`clearFilters(closeDropdown, confirm)`。
- **共用依赖**：`react-highlight-words`。
- **验收（UI）**：复刻 `custom-filter-panel`。

#### S6. 筛选项搜索 filterSearch
- **来源**：[自研]
- **依赖**：S3
- **antd demo**：`filter-search`
- **目标**：`filterSearch: true | (input, record) => boolean`。
- **验收（UI）**：复刻 `filter-search`。

#### S7. 树形筛选 filterMode='tree'
- **来源**：[自研]
- **依赖**：S3
- **antd demo**：`filter-in-tree`
- **目标**：`filterMode: 'tree'`、`filters.children` 树形筛选 UI；配合 `filterSearch`。
- **验收（UI）**：复刻 `filter-in-tree`。

### 4.3 行选择增强

#### S8. 受控选择与批量操作
- **来源**：[自研]
- **依赖**：M5
- **antd demo**：`row-selection-and-operation`
- **目标**：`rowSelection.selectedRowKeys` 受控；选中后批量操作并清空。
- **验收（UI）**：复刻 `row-selection-and-operation`。

#### S9. 自定义选择项 selections
- **来源**：[自研]
- **依赖**：M5
- **antd demo**：`row-selection-custom`、（debug）`selections-debug`
- **目标**：`rowSelection.selections`（SELECTION_ALL/NONE/INVERT/...，可自定义）；下拉菜单；`selections: true` 显示默认项。
- **验收（UI）**：复刻 `row-selection-custom` 的自定义选择项菜单。

#### S10. 选择/展开列顺序控制
- **来源**：[自研]
- **依赖**：M5、M9
- **antd demo**：`order-column`
- **目标**：`Table.SELECTION_COLUMN` / `Table.EXPAND_COLUMN` 占位对象，自定义选择列与展开列位置。
- **验收（UI）**：复刻 `order-column`。

### 4.4 分页与数据加载

#### S11. 分页集成与位置
- **来源**：[自研]
- **依赖**：F2
- **antd demo**：`pagination`
- **目标**：`pagination`（受控/非受控、`placement: ['top','bottom']`、pageSize/current/total）；分页与排序筛选联动 `onChange`。
- **验收（UI）**：复刻 `pagination`（top/bottom、placement 数组）。

#### S12. 远程数据 ajax + loading
- **来源**：[自研]
- **依赖**：S11、S1、S3
- **antd demo**：`ajax`
- **目标**：`loading` 态（spin）；服务端分页/排序/筛选（`onChange` 触发请求）；`preserveSelectedRowKeys` 跨页保留勾选。
- **验收（UI）**：复刻 `ajax`。

### 4.5 树形数据

#### S13. 树形数据渲染
- **来源**：[自研]
- **依赖**：F1
- **antd demo**：`tree-data`
- **目标**：`childrenColumnName`(默认 children)；自动渲染缩进 + 展开图标；`defaultExpandAllRows`/`expandedRowKeys`；`rowSelection.checkStrictly` 父子联动开关。**树形展开行视为普通表格行，遵循行高约定**（决策 2）。
- **验收（UI）**：复刻 `tree-data`（树形展开、checkStrictly 联动选择）。

#### S14. 树形跨页/保留选择
- **来源**：[自研]
- **依赖**：S13、M5
- **antd demo**：`tree-table-preserveSelectedRowKeys`
- **目标**：`checkStrictly:false` + `preserveSelectedRowKeys:true`（issue #50621）。
- **验收（UI）**：复刻 `tree-table-preserveSelectedRowKeys`。

### 4.6 编辑

#### S15. 单元格编辑 edit-cell
- **来源**：[自研]
- **依赖**：F2
- **antd demo**：`edit-cell`
- **目标**：点击单元格进入编辑（Form + Input）；支持增删行；`components.body.cell` + `onCell`；`shouldCellUpdate`（此为有正常用例的 API，保留）。
- **验收（UI）**：复刻 `edit-cell`。

#### S16. 行编辑 edit-row
- **来源**：[自研]
- **依赖**：F2
- **antd demo**：`edit-row`
- **目标**：行级 Edit/Save/Cancel 切换；InputNumber/Input；`components.body.cell` + `onCell`。
- **验收（UI）**：复刻 `edit-row`。

### 4.7 拖拽

#### S17. 行拖拽排序
- **来源**：[自研]
- **依赖**：F2
- **antd demo**：`drag-sorting`
- **目标**：`components.body.row` + dnd-kit(`restrictToVerticalAxis`) 实现行排序；`rowKey`。
- **共用依赖**：`@dnd-kit/*`。
- **验收（UI）**：复刻 `drag-sorting`。

#### S18. 拖拽手柄排序
- **来源**：[自研]
- **依赖**：S17
- **antd demo**：`drag-sorting-handler`
- **目标**：手柄列（HolderOutlined）触发行拖拽。
- **验收（UI）**：复刻 `drag-sorting-handler`。

#### S19. 列拖拽排序
- **来源**：[自研]
- **依赖**：F1
- **antd demo**：`drag-column-sorting`
- **目标**：`components.header.cell` + `components.body.cell` + `onHeaderCell`/`onCell` + dnd-kit(`restrictToHorizontalAxis`)；拖拽指示线。
- **验收（UI）**：复刻 `drag-column-sorting`。

### 4.8 单元格展示

#### S20. 省略号 ellipsis
- **来源**：[移植+改造·参考 lun]（lun prop 有，CSS 缺）[自研 CSS]
- **依赖**：F2
- **antd demo**：`ellipsis`
- **目标**：`column.ellipsis` + `column.width` → `text-overflow:ellipsis; white-space:nowrap; overflow:hidden`；默认 `title` 悬浮提示。
- **验收（UI）**：复刻 `ellipsis`。

#### S21. 省略号 + 自定义 Tooltip
- **来源**：[自研]
- **依赖**：S20
- **antd demo**：`ellipsis-custom-tooltip`
- **目标**：`column.ellipsis = { showTitle: false }` 关闭默认 title；用 Tooltip 替代。
- **验收（UI）**：复刻 `ellipsis-custom-tooltip`。

#### S22. 汇总 summary
- **来源**：[自研]
- **依赖**：F1
- **antd demo**：`summary`
- **目标**：`summary` 渲染总结栏；`Table.Summary`/`Table.Summary.Row`/`Table.Summary.Cell`；`fixed` 固定总结栏。
- **验收（UI）**：复刻 `summary`。

#### S23. 自定义空状态与 loading 占位
- **来源**：[自研]
- **依赖**：F2、S12
- **antd demo**：`custom-empty`
- **目标**：`ConfigProvider.renderEmpty` / `locale.emptyText` 自定义空数据与筛选为空呈现。
- **验收（UI）**：复刻 `custom-empty`。

### 4.9 展开（增强）

#### S24. 嵌套子表格
- **来源**：[自研]
- **依赖**：M9
- **antd demo**：`nested-table`
- **目标**：展开行内嵌套子 Table；`defaultExpandedRowKeys`；多 size 演示。
- **验收（UI）**：复刻 `nested-table`。

#### S25. 树形省略（issue 复现）
- **来源**：[自研]
- **依赖**：S13、S20
- **antd demo**：`tree-table-ellipsis`
- **目标**：树形首列 ellipsis + fixed 组合（issue #36583）。
- **验收（UI）**：复刻 `tree-table-ellipsis`。

### 4.10 样式 / 主题 / 响应式 / API

#### S26. 边框 bordered + title/footer
- **来源**：[移植+改造·参考 lun]（lun outline 方案有缺陷，需重做）
- **依赖**：F2
- **antd demo**：`bordered`
- **目标**：`bordered` 表格内外边框线；`title`/`footer`；与固定列组合时边框正确（避免 lun 的右 sticky 列缺左 border 缺陷）。
- **验收（UI）**：复刻 `bordered`（边框 + title + footer）。

#### S27. 尺寸 size
- **来源**：[自研]
- **依赖**：F3
- **antd demo**：`size`、`narrow`
- **目标**：`size: 'large'|'middle'|'small'`（含 compact medium/small）；窄容器大量数据展示。
- **验收（UI）**：复刻 `size`、`narrow`。

#### S28. 响应式 responsive
- **来源**：[自研]
- **依赖**：F2
- **antd demo**：`responsive`
- **目标**：`column.responsive: ['md','lg',...]` 按断点显隐列。
- **验收（UI）**：复刻 `responsive`（改变视口宽度，列按断点显隐）。

#### S29. 语义化样式 classNames/styles
- **来源**：[自研]
- **依赖**：F1
- **antd demo**：`style-class`、`_semantic`
- **目标**：`classNames`/`styles`（对象或 `(info)=>styles` 函数）作用于语义化部位（root/header.cell/body.row/title/footer/pagination…）。
- **验收（UI）**：复刻 `style-class`；对照 `_semantic` 确认各部位语义 class 正确。

#### S30. component-token 主题定制
- **来源**：[自研]
- **依赖**：F3
- **antd demo**：`component-token`
- **目标**：通过 ConfigProvider theme.components.Table 自定义 token，映射到内部 CSS variables（token 名以 antd 6.4.4 实测为准）；支持动态配置面板（bordered/size/scroll/ellipsis 实时切换）。
- **验收（UI）**：复刻 `component-token`（动态调整 token + 属性实时预览）。

#### S31. JSX 风格 API
- **来源**：[自研]
- **依赖**：F2、M1
- **antd demo**：`jsx`
- **目标**：`<Table.Column>` / `<Table.ColumnGroup>` 子元素声明列。
- **验收（UI）**：复刻 `jsx`。

#### S32. 列默认值 column
- **来源**：[自研]
- **依赖**：F2
- **antd demo**：`column-defaults`
- **目标**：Table 级 `column={{...}}` 设列默认属性，单列可覆盖。
- **验收（UI）**：复刻 `column-defaults`。

#### S33. 动态设置（综合集成验收）
- **来源**：[自研]
- **依赖**：S26、S27、S12、M5、M9、S20 等（大量）
- **antd demo**：`dynamic-settings`
- **目标**：控制面板动态切换 bordered/loading/size/title/footer/showHeader/expandable/rowSelection/scroll/ellipsis/tableLayout/分页位置等。
- **说明**：**集成验收 demo**，需前置功能基本完成后执行，用于整体回归。
- **验收（UI）**：复刻 `dynamic-settings`（全量动态切换无报错、视觉正确）。

### 4.11 跟随页面滚动固定（sticky）

#### S34. 粘性表头 + 滚动条（页面级）
- **来源**：[自研]
- **依赖**：M8、S22
- **antd demo**：`sticky`
- **目标**：`sticky.offsetHeader` 表头跟随**页面**滚动固定（区别于 M8 容器内固定）；横向滚动条同步固定；与 summary/fixed 列组合。
- **验收（UI）**：复刻 `sticky`（长表页面滚动时表头/滚动条固定）。

---

## 5. 阶段 3：边缘用例（可选，低优先）

### D1. 边界 / 隔离用例合集
- **来源**：[自研]
- **依赖**：按需
- **antd demo**：`nest-table-border-debug`、`row-selection-custom-debug`
- **目标**：有实际意义的边界验证：嵌套表格父子 `bordered` 隔离；`rowSelection.renderCell` 自定义勾选格（合并行场景）。
- **不做**：纯调试/性能计数类（`row-selection-debug` 的 render 计数、`selections-debug`）与糟粕 API（`measure-row-render`），按决策 1 不实现。
- **验收（UI）**：逐个复刻并确认无回归。

---

## 6. demo → 任务 速查表

| antd demo | 任务号 | 类别 | 备注 |
|-----------|--------|------|------|
| basic | F1/F2（验收基线） | 移植/自研 | |
| jsx | S31 | 自研 | |
| style-class / _semantic | S29 | 自研 | |
| column-defaults | S32 | 自研 | |
| size / narrow | S27 | 自研 | |
| component-token | S30 | 自研 | v6 token |
| custom-empty | S23 | 自研 | |
| bordered | S26 | 移植+改造 | |
| head（排序） | S1 | 自研 | |
| head（筛选） | S3 | 自研 | |
| multiple-sorter | S2 | 自研 | |
| reset-filter | S4 | 自研 | |
| custom-filter-panel | S5 | 自研 | |
| filter-search | S6 | 自研 | |
| filter-in-tree | S7 | 自研 | |
| measure-row-render | — | — | **不做（糟粕，决策 1）** |
| row-selection | M5 | 移植 | |
| row-selection-and-operation | S8 | 自研 | |
| row-selection-custom | S9 | 自研 | |
| row-selection-debug | — | — | 不做（纯性能调试，决策 1） |
| selections-debug | — | — | 不做（纯调试，决策 1） |
| pagination | S11 | 自研 | |
| ajax | S12 | 自研 | |
| tree-data | S13 | 自研 | 行高约定 |
| tree-table-preserveSelectedRowKeys | S14 | 自研 | |
| tree-table-ellipsis | S25 | 自研 | |
| expand | M9 | 移植+改造 | |
| expand-sticky | M9 | 移植+改造 | |
| order-column | S10 | 自研 | |
| nested-table | S24 | 自研 | |
| edit-cell | S15 | 自研 | |
| edit-row | S16 | 自研 | |
| drag-sorting | S17 | 自研 | |
| drag-sorting-handler | S18 | 自研 | |
| drag-column-sorting | S19 | 自研 | |
| virtual-list | M4 | 移植 | 含×展开 |
| grouping-columns | M1 | 移植 | |
| colspan-rowspan | M3 | 移植 | |
| ellipsis | S20 | 移植+改造 | |
| ellipsis-custom-tooltip | S21 | 自研 | |
| summary | S22 | 自研 | |
| fixed-columns | M2 | 移植 | |
| fixed-columns-header | M2 + M8 | 移植 | |
| fixed-gapped-columns | M2 | 移植 | |
| fixed-header | M8 | 移植+改造 | |
| sticky | S34 | 自研 | |
| hidden-columns | M6 | 移植 | |
| responsive | S28 | 自研 | |
| dynamic-settings | S33（集成验收） | 自研 | |
| nest-table-border-debug | D1 | 边缘 | |
| row-selection-custom-debug | D1 | 边缘 | |
| resizable（增强） | M7 | 移植 | |

---

## 7. 里程碑与建议执行顺序

1. **M0 基座**：F1 → F2 → F3 → F4（产出"basic 级"表格 + demo 环境 + antd v6 接口/变量兼容）。
2. **M1 渲染能力**：M1（多级表头）、M2（固定列）、M3（合并单元格）、M6（隐藏列）—— CSS Grid 骨架能力先行。
3. **M2 交互核心**：S1/S3（排序筛选）、M5（选择）、S11（分页）、M8（固定表头）、M9（展开）。
4. **M3 进阶**：S2/S4–S7（排序筛选增强）、S8–S10（选择增强）、S12（ajax）、S13/S14（树形）、S15/S16（编辑）、S17–S19（拖拽）、S20–S23（单元格展示）、M4（虚拟滚动，含×展开）。
5. **M4 收尾**：S24–S34（展开增强、样式主题响应式、sticky、JSX/column-defaults）、S33（dynamic-settings 集成验收）、D1（边缘）。
6. **接口全兼容阶段**：在 M0–M4 完成后，按决策 3 第二步补齐 antd Table 全部公共 API（`components`/`onHeaderRow`/`onRow`/`rowClassName`/`getPopupContainer` 等）。
7. **全量回归**：所有 demo 在 demo 框架内逐一浏览器验证，对照 antd 6.4.4 官方行为。

> 依赖较重的任务（S33、S34、M4）务必在前置功能完成后执行。每次合并新功能后，对已通过 demo 做回归（§1.5 第 5 步）。

---

## 8. 决策记录

| # | 议题 | 决策 |
|---|------|------|
| 1 | measureRow / 无用例兼容 API | **不做**。measureRowRender 等糟粕机制及纯调试兼容 API（性能计数、纯调试下拉）一律不实现 |
| 2 | 虚拟滚动 × 展开 | **做**。虚拟窗口按收起状态行高计算；展开内容不参与窗口大小（牺牲性能换稳定）；tree 展开行视为普通行、遵循行高约定 |
| 3 | antd 接口兼容程度 | **全兼容，分两步**：先覆盖 demo 用到的 props 子集，再补齐全部公共 API |
| 4 | CSS variables 范围 | **完整 antd v6 token**；拿不准的 token 名以浏览器运行参考项目（6.4.4）实测为准 |
| 5 | 发布形态 | **暂按项目内组件 + dev demo**；npm 打包/导出后置（待后续确认） |
| 6 | 非表格核心部位 | **用 antd 实现**。data-grid 只取代 antd Table / rc-table（表格核心：grid 渲染、列树、固定列、合并、虚拟、排序/筛选/选择/展开状态机等），**不自研通用组件**——loading/spin、tooltip、pagination、筛选下拉菜单、dropdown、empty 等非核心部位直接用 antd（已引入 antd@6.4.4）。表格特有交互元素（勾选框、展开/排序图标）暂保留自绘，可选后续统一化。引入 antd 后 demo 框架用 `<ConfigProvider>` 包裹（antd 组件正常 + token 生效）。 |

---

## 9. 已知限制 / 后续增强（随任务推进登记）

> 已通过任务中标注的"已知简化/轻微缺陷"，不阻塞该任务，但需后续单独处理。

| 来源任务 | 限制 | 影响 | 建议处理 |
|----------|------|------|----------|
| M4 虚拟滚动 | 合并单元格 × 虚拟滚动：合并组左上角滚出可视区上边界后，该组下半部分在可视区出现空白格（未用 extraRender 机制补画跨边界合并格） | 虚拟 + 跨边界合并的视觉缺块，不崩 | 后续增强：绝对定位补画跨边界合并格 |
| M4 虚拟滚动 | `scrollTo({ align: 'nearest' })` 目标行已完全可见时仍滚动 1 行（退化为 start） | nearest 边界语义轻微偏差，目标行仍可见 | 后续修正 nearest 的"已可见则不动"判定 |
| M3 合并单元格 | 合并格 × 固定列：合并格整体 sticky（偏移按左上角列），合并跨越固定/非固定边界时未做部分裁剪 | 跨边界合并固定格视觉可能不精确，不崩 | 后续视实际需求完善（当前 demo 无此组合） |
| M5 行选择 | disabled 行（`getCheckboxProps.disabled`）无整行灰底视觉提示，仅 checkbox 自身灰 | 与 antd 默认 disabled 行淡灰背景不一致，功能正确 | 视觉打磨：disabled 行加 `dg-row-disabled` 类 + 背景色 |
