# 已知限制

本页只保留仍有长期价值的限制、兼容缺口和视觉对齐遗留项，不记录任务批次或会话过程。
能通过局部 API 适配补齐的项目不再描述为架构限制。

每条主张后面标着它的核验状态：`已实读参照源码`＝打开参照实现读到该行；`探针实测`＝两侧并排跑过取回读数；
`读码`＝只读代码没跑；`未实测`＝只登记现象、没构造过实害。

## 对照的是哪个版本的 antd

本仓库的兼容目标是 antd v6 的公共 API。`peerDependencies` 写的是 `^6.1.0`，也就是用户装 6.x 里任意版本都算合法，
npm 当前最新是 6.6.5。而本页与兼容矩阵里所有「与 antd 一致 / 不一致」的判断，**默认对照的是我们测试时实际安装的
antd 6.4.4**——证据一律写成 `antd 6.4.4 <文件>:<行>` 这个形状，参照的传递依赖另标组件与版本
（如 `@rc-component/table 1.10.2 <文件>:<行>`）。

参照是**有版本的依赖**，因此"参照某行为何"这类结论天生带版本条件。目前核到版本边界的实例是这一条：
列上写 `defaultSortOrder` 且该列带 `responsive` 断点时，**从 antd 6.5.x 起**参照改用「响应式过滤之前」的列去收集
排序态，而 6.4.4 完全不这么做。三个版本各自的证据：

- **6.4.4（`node_modules` 里装的那版，也是本页所有「与 antd 一致」判断的默认裁判）**：
  `es/table/hooks/useSorter.js` 里搜 `baseColumns` **零命中**；`es/table/InternalTable.js:219-227` 传给 `useSorter`
  的是**响应式过滤之后**的 `mergedColumns`（过滤就在同文件 `:80`；`baseColumns` 在 6.4.4 只是
  `InternalTable.js:75` 的局部变量）。⇒ 参照在 6.4.4 上同样**不排序**。`已实读参照源码`
- **6.5.2（上游 checkout）**：`components/table/InternalTable.tsx:472-476` 把 `baseColumns` 传进 `useSorter`，
  自带注释「Pass `baseColumns` (pre-responsive) so `defaultSortOrder` and controlled `sortOrder` on a `responsive`
  column are still honored」；`components/table/hooks/useSorter.tsx:424` =
  `const collectColumns = baseColumns ?? mergedColumns`。两处都引 issue #32847。`已实读参照源码`
- **6.6.5（npm `latest`）**：同一逻辑仍在**发布产物**里 —— `es/table/InternalTable.js:261-268` 传 `baseColumns`，
  `es/table/hooks/useSorter.js:297-298` 是 `collectColumns = baseColumns ?? mergedColumns` →
  `collectSortStates(collectColumns, true)`。⇒ 分叉不是 6.5.2 的一次性写法，`latest` 上仍然成立。`已实读参照源码`

**现值**：data-grid 与**已安装的 6.4.4 同值**——被 `responsive` 隐藏的列，其 `defaultSortOrder` **不生效**，
行序保持原始序。机制：不匹配断点的列在 `src/table/useResponsiveColumns.ts:56-72` 就被摘出列集，
`src/table/Table.tsx:403-424` 的 `sortableColumns` 只从过滤后的列集取叶子并交给我方排序 hook，
所以 `collectSortStates` 根本看不到那一列（`src/table/engine/sorterUtils.ts:138-144` 的 `defaultSortOrder` 纳入点
收不到它）。`读码`

这条现值是双侧并排跑出来的，不是推论：同一套列定义（一个可见列 ＋ 一个带 `responsive: ['md']` 的排序列）
下，data-grid 与已安装 antd **行序同为原始序**；把 `responsive` 摘掉后两侧**同为降序**
（`['Tom','Lucy','Jack','Jerry']`），即排序管道本身是活的——"不排"是被观察到的行为，不是测不到的空档。
`探针实测`。钉住它的用例：`tests/table/features/Table.sorter.test.tsx` 的
`defaultSortOrder does not apply when column is hidden by responsive (same as installed antd 6.4.4)`，
该用例把「隐藏 ⇒ 两侧同原始序」与「去掉 responsive ⇒ 两侧同降序」并排断言，并有「降序 ≠ 原始序」的活门自证。
注意它的可证范围受 harness 限制：测试环境的 `matchMedia` 恒不匹配（`tests/setup.ts`），
参照的七枚断点全 false，所以"某断点下可见的 `responsive` 列"这个形状在这套 harness 里构造不出来。`探针实测`

**后果**：`peerDependencies.antd` 是 `^6.1.0`（npm 现 6.6.5），装 **6.5.x / 6.6.x** 的合法用户会看到
**数据结果分叉**——同一份列定义，antd 按隐藏列的 `defaultSortOrder` 排了序，我们不排。这是行序差异而不是
样式差异，容易被直接读成 bug。反过来，若改成对齐 6.5+ 的「过滤前收集」，就等于在 peer 下界那侧
主动背离 6.1–6.4 的参照行为，且会让"隐藏列不参与任何计算"这条我方不变式破口。
**采哪一侧为对齐目标尚未裁定**，本页只登记分叉事实。`推测`

「参照版本条件性」**这一整类尚未做过全量扫描**，见文末「本轮验证未覆盖的范围」。

## 架构边界

- semantic DOM 不能完整复刻原生 `thead` / `tbody` / `tr` 层级；完整 row role 结构没有对应 DOM。能映射到稳定节点的 `.ant-table-*` class alias 已兼容，不属于架构限制。`读码`
- `scroll.y` 只支持 data-grid 的“数据区域模式”语义，不支持 antd 的 `number|string` 滚动区域高度语义。`读码`
- 表头格与数据格是**没有 role 的 div**。antd 把 `aria-label` / `aria-description` 等落在 `<th>` 上（合法），
  我们落在无 role 的 div 上会被无障碍检查判成「该元素不得使用此属性」。要把这类属性合法化，需要先把整条表格
  ARIA 链（`role="table"` / `rowgroup` / `row` / `columnheader`）一起补齐，而那受上面第一条架构边界约束。
  因此这类属性一律走「不加 ＋ 留下证据 ＋ 在代码注释里写明原因」，不是遗漏。`探针实测`

## 兼容缺口

- `components` 仍缺少原生表格 wrapper 级槽位和 `body` 函数形态。`读码`

## 需要确认取舍的兼容项

以下项目能做，但需要先确认设计取舍或回归范围：

- RTL：可实现，但需要系统性处理 fixed、sticky、滚动条、拖拽方向和阴影方向。
- `components.header.row`、`components.body.wrapper`、`components.body` 函数形态：可提供 data-grid 语义下的适配，但不能等价替换原生 table DOM。

明确不做的迁移项：

- `scroll.y = number|string` 的 antd 滚动区域高度语义。data-grid 保持 `true | undefined`，避免继续要求调用方手算高度或在数字/字符串语义之间承担不可控后果。
- 函数式 `column.title`（详见下面「列与表头」一节）：属功能移植，超出"修明显缺陷"的边界，保持不移植。

## 已实现，不再作为限制

- `locale` 已接入 antd `useLocale('Table')`：`TableProps.locale` 覆盖 ConfigProvider locale，ConfigProvider locale 覆盖默认英文；FilterDropdown、selection 内置项、排序/展开文案已纳入当前兼容面。
- `pagination` 默认开启已对齐 antd：未传等价 `{}`，默认 10/页；`pagination={false}` 才关闭。
- `scroll.scrollToFirstRowOnChange` 已实现：分页、排序、筛选变化默认滚回首行，可设 `false` 关闭。
- `render` 返回 `RenderedCell` 对象形态仅兼容 `children` 内容；`props` 已废弃并被 data-grid 忽略。单元格合并请使用 `onCell`，其它内置格样式/事件请使用 column/onRow 或自定义 body.cell。
- `rowSelection.onSelect`、`onSelectMultiple`、`onSelectAll`、`onSelectInvert`、`onSelectNone` 已实现。
- `rowSelection.columnTitle`、`rowSelection.onCell`、`rowSelection.getTitleCheckboxProps` 已实现。
- `getCheckboxProps` 现在透传 `disabled` 之外的字段（`aria-label` / `title` / `id` / `className` / `style` 等），不再只取 `disabled`。`已实读参照源码`
- 树形父子联动的勾选传导已按参照的规则实现：disabled 行不参与传导、子行的半选会向上级联、
  空 `children` 的表项不把父行判成全选。`探针实测`
- 表头全选框的默认无障碍名按参照硬编码两分支（有自定义下拉菜单时 `Custom selection`，否则 `Select all`），
  不再误用 locale 里「下拉菜单项文案」那个键。`已实读参照源码`
- 稳定节点的一对一 `.ant-table-*` class alias 已实现：wrapper、table/container/content、title/footer、cell、fixed cell、排序节点和筛选触发器。
- 拖拽排序已作为公开 API 接入：行拖用 `gridOptions.rowDragSort`，列拖用 `gridOptions.columnDragSort`，列锁定用 `gridColumnOptions.dragColumnLock`。内部 hook 仍不从主入口导出。

## 已登记的边界

这里登记的是**有意保留**的差异、超出参照的增强、以及参照侧本来就没有对应物的部位。
写法：差异 → 参照怎么做 → 我们怎么做 → 依据。

### 展开

- **`expandable.expandRowByClick` 树形与非树形一视同仁**：
  - 单层（非树形）表格：点击行体切换该行展开态，与 `onRow.onClick` 共存。
  - 树形数据：点击行体同样切换被点节点的展开态，行点击的状态源换成树的
    `expandableKeySet` / `toggleExpand`；判据是树形模式、`expandable.expandRowByClick === true`
    且该树存在含非空 `children` 的行（`src/table/Table.tsx` 的 `treeRowClickExpandEnabled`，`读码`）。
    无子节点的行点行体不切换（绑定按"该行在 `expandableKeySet` 内"逐行判定，`src/table/useExpandRowBinding.ts`）。
  - 参照侧树形行同样走该判据：`@rc-component/table 1.10.2 es/hooks/useRowInfo.js:22-24` 把 `expandableType === 'nest'`
    并入 `mergedExpandable`，`:32-35` 的行点击判据是 `expandRowByClick && mergedExpandable`，与展开类型无关。
- **展开列只在 `expandedRowRender` 存在时才创建**：这不是我们的偏离。参照同样如此——
  `@rc-component/table 1.10.2 es/Table.js:146` 把 `expandable` 判据写成 `!!expandableConfig.expandedRowRender`，
  `es/hooks/useColumns/index.js:90` 的展开列插入被这个判据门住。`已实读参照源码`
- **顶层 `defaultExpandAllRows` 不被消费**（只在 `expandable.*` 下生效）：同样不是偏离，参照的 `es/table/InternalTable.js`
  从头到尾没解构这个字段（在 antd 6.4.4 的 `es/table/` 目录搜 `defaultExpandAllRows` 零命中），它只在
  `@rc-component/table 1.10.2 es/hooks/useExpand.js:39-46` 里被当作初始展开集的来源。`已实读参照源码`
- **顶层 `expandedRowRender` 不被消费**仍是一条真实缺口：参照**确实**在 `antd 6.4.4 es/table/InternalTable.js:62`
  解构、`:147` 判定它，所以我们与参照在这里不一致。`已实读参照源码`
- **只经 ConfigProvider 给 `expandable.expandIcon`、props 完全没给 `expandable` 时我们不渲染图标**：症状是用户想
  在应用根部统一换一套展开图标，只写 `<ConfigProvider table={{ expandable: { expandIcon } }}>` 时**一个图标都出不来**
  （表格没配 `expandable`、也没有 `expandedRowRender`）；参照在同样输入下会把该图标**内联进每行第一个既有数据格**
  （不加列、不加行）。现状/绕法：这是**能力缺失但正常可用**——把图标写进 props 的 `expandable={{ expandIcon }}`，
  或本就配了 `expandedRowRender`（我们只在展开列这一条路径上消费图标，
  `src/table/expandAdapter.tsx:57` 的 `render`；展开列要求 `expandedRowRender`，`src/table/engine/useRowExpand.ts:47`）。
  判类：**登记不修**——参照那条路走的是它自己标注将来会删的私有后门：`antd 6.4.4 es/table/InternalTable.js:317`
  把 `__PARENT_RENDER_ICON__` 挂上、`:319` 兜底图标 → `@rc-component/table 1.10.2 es/hooks/useExpand.js:24-28`
  据此把展开类型判成 `'nest'`（同文件 `:16-23` 的原注释写着 "Do not use `__PARENT_RENDER_ICON__` in prod since
  we will remove this when refactor"）→ `es/Body/BodyRow.js:33-46` 内联进格；对齐它等于给每张处在这种上下文里的
  表的**每一行**新增 DOM 节点，超出"多认一份上下文"的边界。实测分叉与我方"DOM 增量为 0"那两道断言见
  `tests/table/features/Table.context.test.tsx:659-728`。`已实读参照源码`
- **不可展开行（含树形叶子行）的 spaced 图标：我们用 `disabled` 属性，参照只用 CSS 隐藏**：症状面真实用户两侧都
  点不到（两套 CSS 都是 `visibility:hidden`），差别在程序化操作与属性面——我们那颗是 `disabled` 的按钮，React 不为
  disabled 元素执行 handler，所以对它派发点击时**冒泡会打到行上的 `onRow.onClick`**、`onExpand` 不回调；
  参照那颗没有 `disabled`，它的 handler 跑得到，于是 `onExpand` 回调、冒泡被它自己阻断。
  现状/绕法：需要"不可展开行也能被程序化点击触发行逻辑"的调用方直接挂 `onRow`，不要靠点 spaced 图标。
  判类：**登记不修**——逐字贴参照要拿掉 `disabled`，那会同时翻掉钉着"不可展开行图标 disabled"的现有用例与
  图标冒泡那一族断言，而且会把参照"对不可展开行也回调 `onExpand`"的怪癖抄进我方。
  两侧图标**数量**不分叉：参照对每个树行（含叶子）出 spaced 图标，我方叶子行同样出
  （`src/table/engine/treeIndentRenderer.tsx:44-61` 的 else 分支），钉住的断言是两侧数量相等
  （`tests/table/features/Table.context.test.tsx:501-537`）。
  依据：我方 `src/table/engine/ExpandIcon.tsx:42`（写 `disabled`）＋ `src/table/style/table.css:698-708`（另有一条
  hidden 规则）；参照 `antd 6.4.4 es/table/ExpandIcon.js:15-28`（整个参数表里没有 `disabled`，`-spaced` 只是类名）
  ＋ `es/table/style/expand.js:85-93`。`已实读参照源码`

### 行选择

- **区间（shift）选择的回调形状与参照不同**：症状——同一次区间勾选，参照只派发 `onSelectMultiple` ＋ `onChange`，
  我方还会**多派发一次** `onSelect`（实测 `onSelect` 次数 dg 2 vs `antd 6.4.4` 1），且两者的**先后顺序相反**
  （参照 `onSelectMultiple` 先于 `onChange`，我方相反；参照区间支**不**调 `onSelect`）。
  现状/绕法：选中结果集合本身同值，依赖回调**次数或顺序**做去重/联动的调用方请以 `onChange` 为准。
  判类：**登记不修**——对齐顺序要重排既有派发链，会牵动已被独立验证的批量/清锚语义，收益不抵风险。`探针实测`
- **「清空选择」对跨页且被禁用的已选行处理（BAT-35 35-F 已修）**：参照只保留**当前页**的 disabled 已选
  （跨页那部分被清掉），我方修前保留**全量** disabled 已选 ⇒ 用户在翻页场景看到"清空后仍留有一个选中项"。
  35-F 起菜单 NONE 的保留面改建在**当前页**切片（`useRowSelection` 的 `disabledKeySet` 建在 `pageData` 上，
  参照 `antd 6.4.4 es/table/hooks/useSelection.js:242-245` checkboxPropsMap 建在 pageData）⇒ 与参照同形。
  直测钉在 `Table.rowSelection.test.tsx` 的 `describe('35-F selection scope')`（`menu NONE clears a cross-page
  disabled-selected row`）。`探针实测`

- **选择项下拉的触发形态（触发方式 ＋ 容器回调次数，一件事登记一次）**：
  - **触发方式**：我们只在**点击**时打开，参照默认**悬停**打开。依据：参照 `antd 6.4.4 es/table/hooks/useSelection.js:326-329`
    渲染那个下拉时**没有**传 `trigger`，而 `@rc-component/dropdown 1.0.x es/Dropdown.js:24` 的默认值是 `['hover']`；
    我们在 `src/table/selectionAdapter.tsx` 的 `SelectionsDropdown` 里显式传 `trigger={['click']}`。
    判类：触屏与窄容器下 `click` 更稳，属有意取舍，不改。`已实读参照源码`
  - **`getPopupContainer` 的调用次数**：面板开合一轮我们调 5 次、参照 4 次。挂在的容器与触发节点两侧一致
    （`triggerNode` 都是同一个 `span` 触发器），差异来自我们多带一个类名 ＋ 显式 `trigger` 造成的重渲染次数。
    判类：**计数级微差**，功能等价、没有漏接。`探针实测`
- **表头全选框的半选值是计算值覆盖用户值**：`rowSelection.getTitleCheckboxProps()` 返回的 `indeterminate`
  **会被内部计算值覆盖**。这是对「antd 同名同义字段」跟回 antd 的**修复**，不是新增差异——参照的 spread 顺序就是
  先展开用户 props、后写计算值（`antd 6.4.4 es/table/hooks/useSelection.js:357, 359`）。
  要表达半选请改用 `selectedRowKeys` 或树形联动，不要靠这个字段。`已实读参照源码`
  ⚠️ 这里曾有一条反向承诺（"custom 覆盖计算值"），已作废；**两个方向现在都有直测钉住**，不再是"无用例可证"。`探针实测`
- **内部约定：选择适配层要求传入未排序、未筛选、未分页的原始数据源**。这不是冗余参数：
  勾选状态的"这个 key 还存不存在于数据里"必须对着全量数据判定，只喂当前可见行会让跨页 / 跨筛选的已选 key 静默丢失。
  参照同构——`antd 6.4.4 es/table/InternalTable.js:177` 用 `rawData` 建 key↔record 映射。
  该约定在测试的白盒层有门钉着。`读码`
- **`SELECTION_COLUMN` 出现在 `columns` 但没配 `rowSelection` 时我们不告警**：参照在开发构建下会提示
  （`antd 6.4.4 es/table/hooks/useSelection.js:264`，且挂在 `process.env.NODE_ENV !== 'production'` 上）。
  哨兵相关的告警目前只有「重复哨兵」和「`EXPAND_COLUMN` 无展开列」两条（全仓告警总数见「告警与开发期提示」一节）。
  判类：未登记的缺口，保持登记不修（是否补齐属用户裁定）。`已实读参照源码`

### 筛选与排序

- **分组（带 `children`）的列携带的排序字段被丢弃**：参照给带 `sorter` 的分组列在**该分组格**的 title 上挂 caret，并收集其受控 `sortOrder`
  （`antd 6.4.4 es/table/hooks/useSorter.js:47-50` 的 children 分支、`:70`/`:165` 的 `injectSorter`）；我方喂排序状态机的列集只取叶子、渲染层又要求表头格是叶子格（`src/table/Table.tsx` 的 `sortableColumns`、`src/table/engine/HeaderCell.tsx` 的 `sortable`）⇒ 写在分组列上的 `sorter`/`sortOrder`/`defaultSortOrder` 不生效，属**登记不修**。
  筛选面不在此列：分组列自己既画漏斗、其 `filters`/`onFilter` 也参与过滤，与参照同形（见 [filter-sorter.md](../features/interaction/filter-sorter.md)）。`读码`
- **树形数据的筛选是浅拷贝**：值面与参照等价，身份面比参照保守——参照会把更多行克隆一份，我们只克隆
  「判定通过且带非空 `children`」的行，其余沿用原引用。外部传入的 `dataSource` 两侧都不被改写。`探针实测`
- **`children` 为非数组真值**：参照会抛错，我们容忍并跳过。判类：边界，容忍方向对我们更安全，不改。`读码`
- **筛选项文案相同（同值）时的 React key**：我们已修为按项取稳定唯一键；参照在同样输入下**同样**会漏出
  duplicate-key 警告。因此这条记为**超越参照的健壮性**，不是兼容性差异。`探针实测`
- **对象型筛选值不再被字符串化折叠**：去重用语言内置的集合语义（原始值按值、对象按引用），
  参照侧的字符串化只当**查表键**用、从不因字符串化丢项，两侧在值面等价。`已实读参照源码`
- **筛选"值没变就不回调"的守卫与参照同形**：参照用浅比较（`antd 6.4.4 es/table/hooks/useFilter/FilterDropdown.js:197`
  调用 `isEqual(a, b, true)`，而 `@rc-component/util 1.11.1 es/isEqual.js:22-24` 在 `shallow` 为真时数组元素层只剩
  `a === b`），我们逐项比较（`src/table/engine/filterUtils.ts` 的 `isSameFilteredValueList`）。
  **这条不是分叉**——此前把它登记成"参照深比较、我们引用比较"是错的，已撤销（见下面撤账表）。
  唯一可构造的微差是 `NaN`：我们判等、参照判不等（筛选项值里不会出现，`读码`）。
- **自定义面板 `confirm()` 之后关闭下拉延迟一个宏任务**：症状是确认后当前这一轮事件循环里面板还开着，参照是
  同步即关；紧跟着读 DOM 或截一帧的调用方会看到"值已确认、面板未关"。
  绕法：筛选值在 `confirm()` 当刻就已应用（不延迟），要等面板关完再动作就自己等一帧。
  判类：**登记不修**——这条延迟是有名字的成因，不是随手写的时序：同步卸载 portaled 弹出层会让残余的 click 派发落到
  弹出层背后的表头格、误触发一次排序，机制与双重保险都记在 [filter-sorter.md](../features/interaction/filter-sorter.md)
  的「关闭下拉用 `setTimeout(0)` 延迟卸载弹出层」一节。`confirm()`／`clearFilters({closeDropdown:true})`／`close()`
  三个入口共用同一条延迟关闭（`src/table/engine/FilterDropdown.tsx:385-391`、`:404`、`:410`），改同步就是把这个
  误派发路径重新打开，而分叉的代价只有那一帧可见状态、没有数据后果。参照侧确实同步：`triggerVisible(false)`
  直接在 `doFilter` 里调用（`antd 6.4.4 es/table/hooks/useFilter/FilterDropdown.js:236`）。`已实读参照源码`
- **用户自己传的 `filterDropdownProps.onOpenChange` 收到的通知集合与参照不同**：症状是订阅方在参照**会通知**的
  三条**程序化关闭**（`confirm()`、`clearFilters({closeDropdown:true})`、自定义面板拿到的 `close()`）场合收不到通知
  ——我们只由**用户交互**（点触发器/点面板外/ESC，`source==='trigger'`）驱动这个回调，三个程序化入口直接
  `setOpen`、不经 `handleOpenChange`。（此前"Menu 点项引起的开合"那条分叉已由 **BAT-35 35-E 接门 ①** 消除：
  Menu 点项现在与参照一致、不回调。）
  绕法：需要感知程序化关闭的调用方在自己调用这三个入口时同步更新自己那一份开合态，别只靠这个回调。
  判类：**登记不修**——要让三个程序化入口也走 `handleOpenChange` 转发，得同时改掉我们自己的延迟关闭实现
  （`setTimeout(0)` 那条，见上一条），而分叉的代价只是订阅方少收三次通知、没有数据后果。
  依据：我方 `src/table/engine/FilterDropdown.tsx` 的 `handleOpenChange`（`:372`）只由用户交互驱动、
  在 `:379` 转发，而 `applyAndClose`（`:350`）／`clearFiltersFn`（`:416`）／`closeFn`（`:431`）三个程序化入口
  直接 `setOpen`；参照在 `triggerVisible` 里同步转发（`antd 6.4.4 es/table/hooks/useFilter/FilterDropdown.js:123-129`），
  调用点是 `:207`、`:221`、`:236`、`:302` 与经门 ① 的 `:246`。`已实读参照源码`
- **排序指示器的 `aria-hidden` 挂在我方外层、参照挂在 inner**：症状只有拿无障碍树或 DOM 断言对比两侧时才现——
  我们把整块排序指示（箭头 ＋ 优先级徽标）一起隐藏，参照只隐藏装箭头的那层。读屏用户目前的实际结果相同。
  绕法：写选择器时取 `.dg-column-sorter`（我方挂属性的元素），参照对应 `.ant-table-column-sorter-inner`。
  判类：**登记不修**——我们的外层除了 inner 还包着优先级数字徽标（参照没有这个节点），把属性搬到 inner
  会把徽标数字暴露给辅助技术、读屏会念出一个参照里不存在的东西。依据：我方
  `src/table/engine/SortIndicator.tsx:81`（属性在根 span）与 `:83-98`（inner 与徽标同为根 span 的子节点）；
  参照 `antd 6.4.4 es/table/hooks/useSorter.js:100-107`（根只有 class 与 `-full`，`aria-hidden` 在 inner 上）。`已实读参照源码`

### 列与表头

- **函数式 `column.title` 未移植**：参照把它当公开能力——`antd 6.4.4 es/table/interface.d.ts:72` 的类型是
  `React.ReactNode | ((props) => React.ReactNode)`，`es/table/util.js:14-19` 遇到函数就直接调用它。
  我们的类型只收 `ReactNode`，传函数时的实际形状是**渲染面静默失效**（`探针实测`，两条表头路径 × 四档配置全部如此）：
  - 标题**渲染为空**，**不抛错**——框架对"函数当 React child"只写一条 console 错误、按父组件名去重、永不抛；
  - 开了 `ellipsis` 时**连原生 `title` 悬浮提示属性也一起丢**，即可见标题与悬浮提示同时消失。
  处置：能力**仍然不移植**（属功能移植）。渲染行为不变，但**不再是静默的**：开发态会收到一条
  `[data-grid]` console 告警，按列点名（`key`／`dataIndex`／列序号，三者有谁说哪个）并写明上面两条后果
  （生产档位不发，见「告警与开发期提示」一节）。
  判据与**去重键的选择**只有一份，落在归一层 `src/table/columnAdapter.ts` 的 `warnFunctionTitleOnce`
  （两条表头路径读同一份列树 ⇒ 覆盖两条路径而不会各吼一遍）；去重表与环境门在全仓唯一出口
  `src/table/devWarn.ts` 里（列树重建与 StrictMode 双渲染也只发一次，
  代价是同一个列键在第二个 Table 实例上不再重发）。`探针实测`
  TypeScript 用户会被类型面拦住，这条只影响 JS 与被 `any` 绕过的调用方。
- **列宽拖拽手柄是我们超出参照的自有增强**：参照侧**根本没有这个宿主**——`antd 6.4.4` 的整个 `es/table` 目录里
  连 `resiz` 这个词都不出现（搜索返回码为「无匹配」）；`@rc-component/table 1.10.2` 里 `onColumnResize` 的命中
  全是 ResizeObserver 的宽度测量（`es/Body/MeasureCell.js:13` 报 `offsetWidth`），整棵 `es/` 里 `separator` 零命中、
  `es/Header/` 里 `role` 零命中（`已实读参照源码`，含真阴性对照）。
  因此手柄上的 `role="separator"` 与 `aria-label="Resize column"` 是**超出参照的无障碍增强**，
  并且**不走 locale**——参照的规矩是「有 locale 键就走键，没键就写英文字面量」（对照：
  `antd 6.4.4 es/table/ExpandIcon.js:26` 走 locale，`es/table/hooks/useSelection.js:356` 写死 `"Select all"`）。
  把它接进 locale 会让我们**比参照更激进**，故不做。`读码`
- **表头无障碍描述 `aria-description` 的「计算值覆盖用户值」这一判据只在单层表头一侧有活门**：
  两条表头渲染路径都实现了该属性，但钉住覆盖顺序的用例只在其中一路是真门——另一路即使把实现摘掉也不会红
  （那一档用的是默认 locale，硬编码值恰好与计算值相等）。补测要求已登记。`探针实测`

### 分页

- **`pagination` 传数组简写时只渲染 1 个分页器**：与参照一致，不是偏离。参照的 `pagination` 只接受
  `false | 对象`（`antd 6.4.4 es/table/hooks/usePagination.js:23` 用「是否 plain object」决定要不要读这份配置，
  数组直接被当空配置），因此参照同样只会走"渲染一个底部默认位置分页器"那条分支
  （`es/table/InternalTable.js:360-373`）。`已实读参照源码`
  差异只剩类型面：我们把数组简写做成合法写法并按其摆放位置，参照的类型里没有这个写法。

### 语义样式与 DOM

- **`pagination.root` 落点差异（结构级，一条讲完）**：参照把分页语义直接打在分页器 `<ul>` 上——
  `antd 6.4.4 es/table/InternalTable.js:123` 决定前缀、`:341-347` 的 `renderPagination` 把
  `classNames.pagination` 整体交给 `<Pagination>`，并在同一个元素上打 `ant-table-pagination` 与
  `ant-table-pagination-<placement>` 两个布局类；**我们多包了一层布局 div**，于是
  ① `classNames.pagination.root` / `styles.pagination.root` 落在外层 `.dg-pagination`（承载对齐与间距）而不是 `<ul>`，
  ② 我们的 `<ul>` 上没有 `ant-table-pagination` 与 `ant-table-pagination-<placement>` 这两组类名
  （`src/` 全量搜这两个类名零命中）。
  判类：**收益不完整的结构级差异**，维持现状。想按 `.ant-table-pagination` 选择器写样式的调用方需要改成
  `.dg-pagination` 或自己包的容器；把 `root` 语义改到 `<ul>` 是一次可推翻的裁定，不是技术定论。`已实读参照源码`
- **`pagination.item` 按项分发**：已透传给分页组件的**逐项**槽位（每个页码/前后翻页项都收到），
  与参照同形。此前写的「合并到分页组件的 className/style、不逐项传递」是旧行为，已作废。`读码`
- **`classNames.header.wrapper` / `classNames.body.wrapper`（以及对应 `styles` 槽）已从公共类型面删除**：
  它们没有可落点的宿主——参照把这两个语义打在 `<thead class="ant-table-thead">` 与 `<tbody class="ant-table-tbody">` 上，
  而 data-grid 的表头格与数据格**共享同一个 grid 容器**、没有对应的中间容器（唯一的候选已被 `content` 槽占用）。
  **替代写法**：整区样式改挂 `root` / `section` / `content`；整行样式用 `header.row` / `body.row`
  （它们分发到该行每个格子）。传这两个字段现在会**编译报错**，而不是静默不生效。
  判类：这条选择的是"从公共类型面删除"而非"保留字段 + 运行时告警"，属**用户可推翻**的裁定。`读码`
- **哨兵列的类型 brand 是我们有意强于参照**：`Table.EXPAND_COLUMN` / `Table.SELECTION_COLUMN` 的用法、位置、运行时行为
  与参照完全一致，唯一区别是我们在 `columns` 里把哨兵写成别的字段名时会**编译报错**。
  按「与参照类型逐字一致」去记分叉会把它记错，所以在这里写明它是**有意超出**。`读码`
- **空对象字面量仍能通过哨兵列的类型检查**：`[{}]` 这种写法不报错。要彻底闭合必须破坏性改动列类型，
  代价是让「匿名列自动编号」这套机制沦为死代码，因此保持现状。`读码`

### 告警与开发期提示

- **告警通道**：我们一共 5 处开发态提示，全走**同一个出口** `devWarnOnce`（`src/table/devWarn.ts`），
  消息统一 `[data-grid] ` 前缀（正文在调用点：`src/table/useColumnTreeBuilder.ts` 的重复 `SELECTION_COLUMN`、
  重复 `EXPAND_COLUMN`、`EXPAND_COLUMN` 无展开列，`src/table/engine/usePagination.ts` 的分页 async 可疑配置，
  `src/table/columnAdapter.ts` 的函数式 `column.title`）。
  ① **带生产环境门**：`process.env.NODE_ENV === 'production'` ⇒ 直接返回 ⇒ 生产构建里不发。
  判据写成**裸 `process.env.NODE_ENV`**（照抄 `antd 6.4.4 es/_util/warning.js:13-15` 的形状），
  实测两条后果：库构建产物里保留**裸引用**（与参照发布的 ES 产物同契约，`es/table/InternalTable.js:168` 也是裸的）
  ⇒ 由**消费者的打包器**决定发/不发，消费者的开发构建照样收得到；应用构建会把它折成字面量并**整条 DCE**
  ⇒ 生产包里确实一条不发。代价＝**不经任何打包器**直接跑 `dist/` 时，告警调用点抛
  `ReferenceError: process is not defined`（参照同款裸引用，同一代价；换成 `typeof process !== 'undefined'`
  这类守卫写法会挡住 DCE、把"生产构建里照发"原样留下，故不采用）。`已运行`
  ② **去重只有一张表**（`src/table/devWarn.ts` 里的模块级 `Set`，跨 Table 实例不重发），键分两档：
  **消息级**（防刷屏，同一文案至多一次）与**语义级** `onceKey`（"每个 X 只说一次"——目前只有函数式
  `column.title` 那条按列键传入，见「列与表头」一节）。测试态（`NODE_ENV === 'test'`）只复位**消息级**
  那一档，好让每条用例都重新看得见告警；**语义级不复位**（它钉的是产品语义）。生产档位在读写这张表
  **之前**就返回 ⇒ 生产路径不留任何状态。
  参照侧同形：组件包里导出的 `warning` 其实就是**带去重的** `warningOnce`
  （`@rc-component/util 1.11.1 es/index.js:30` 以默认导出重导出、`es/warning.js:64`，去重在 `es/warning.js:45-50`
  的 `call()`、复位在 `es/warning.js:42-44` 的 `resetWarned()`），并且带 `NODE_ENV` 门（`es/warning.js:24-25`）；
  参照测试里看到"重复打印"是因为 antd 自己在 `NODE_ENV === 'test'` 时每条告警后立刻 `resetWarned()`
  （`antd 6.4.4 es/_util/warning.js:17-19`），**不是**参照没有去重。
  仍存的分叉：我们发 `console.warn`，参照的 `warning` 发 `console.error`
  （`@rc-component/util 1.11.1 es/warning.js:28`），且消息前缀是 `[data-grid]` 而非 `[antd: Table]`
  ⇒ 按 antd 文案写的日志过滤规则抓不到我们的提示。`已实读参照源码`

### 测试环境的观测面（不是产品差异）

- **测试里 antd 可能有两个实例**（该假象已消除，2026-09-30）：历史上非 CI 环境下裸包名 `antd` 会解析到 `lib/`（CommonJS 构建），
  而我们代码引的是 `antd/es` ⇒ 同一份源码被加载两次、两份 Context。凡历史上得到「测试里观测不到某个 antd 行为」
  这类结论的，都要重查是不是被这个假象遮蔽过（曾被遮蔽的一条：自定义筛选面板里用户 `Menu` 的 `selectable` 被
  参照的下拉上下文覆盖）。判类：**仪表面**问题；产品代码不受影响。`探针实测`
  **已修**：`vite.config.ts` 的 test 块加了 test 作用域 alias（`antd` → `antd/es`，对 CI 与非 CI 的所有 vitest 跑都生效；
  顶层 `resolve.alias` 未动，站点构建不受影响）⇒ 探针复测：`antd` 与 `antd/es` 已是同一模块实例（改前两份），
  行为面同时恢复（es ConfigConsumer 读裸 Provider 注入，改前 `undefined`、改后 `"rtl"`）。见 `tmp/vortex-logs/fix-real-bugs/96-implementer-bat0-testgates.md` §2。`探针实测`

## 此前登记有误、本轮回撤的条目（留痕）

下面 7 条此前被登记成「data-grid 偏离 antd」，逐条实读参照实现后确认**两侧一致**，故撤销登记。
按仓库纪律，撤销必须留痕而不是悄悄改掉；每条写清「此前怎么说 / 实情是什么 / 依据」。

| 此前登记的说法 | 实情 | 依据（均为本轮亲读） |
|---|---|---|
| `sortIcon` 初始收到 `null` 而参照给 `undefined`，算分叉 | **此前登记有误**。参照对非受控的未排序列同样给 `null`：`antd 6.4.4 es/table/hooks/useSorter.js:81` 写 `sorterState ? sorterState.sortOrder : null`，`:84-87` 把它喂给 `column.sortIcon({ sortOrder })` | 撤销；不进差异清单 |
| 排序方向循环不回绕是缺陷 | **此前登记有误**。参照同样**没有取模**：`antd 6.4.4 es/table/hooks/useSorter.js:29-34` 用 `sortDirections.indexOf(current) + 1` 取值，越界自然得到 `undefined` ⇒ 取消排序 | 撤销；两侧同形 |
| 参照允许只给 `expandIcon`、不配 `expandedRowRender` 也能建出展开列 | **此前登记有误**。参照的展开列同样只在 `!!expandedRowRender` 时创建：`@rc-component/table 1.10.2 es/Table.js:146` 与 `es/hooks/useColumns/index.js:90` | 撤销；见「展开」一节 |
| 顶层 `defaultExpandAllRows` 不被消费是缺口 | **此前登记有误（只撤后半条）**。参照也没解构它：`antd 6.4.4 es/table/InternalTable.js` 全文零命中，该字段只在 `@rc-component/table 1.10.2 es/hooks/useExpand.js:39-46` 里被消费。**前半条（顶层 `expandedRowRender`）仍成立**，参照在 `es/table/InternalTable.js:62`/`:147` 确实消费它 | 撤销后半；后半不进差异清单 |
| `pagination` 数组简写只渲染 1 个分页器是缺口 | **此前登记有误**。参照同样只渲染 1 个：`antd 6.4.4 es/table/hooks/usePagination.js:23` 把数组当空配置，`es/table/InternalTable.js:360-373` 落到"渲染一个底部分页器"那一条分支 | 撤销；见「分页」一节 |
| `filterTitle` / `sortTitle` / `selectAll` 没有消费点算缺口 | **此前登记有误**。参照也只在类型声明里放着、实现零引用：`antd 6.4.4 es/table/interface.d.ts:20`（`filterTitle`）、`:31`（`selectAll`）、`:35`（`sortTitle`），在 `es/table/` 的实现文件里搜这三个词只有这三处 `.d.ts` 命中 | 撤销；这三个字段**参照同样不消费**，不算我们的偏离 |
| 取消排序的兜底文案 `'Click to cancel sorting'` 与 locale 里的 `'Cancel sorting'` 不一致 | **此前登记有误，且改前就不成立**。参照默认英文 locale 里写的正是 `'Click to cancel sorting'`（`antd 6.4.4 es/locale/en_US.js:36`，键名 `cancelSort`），我们默认 locale 直接展开参照的默认值 ⇒ 两侧同值。那句话是从一条假注释（flat 侧当年确实硬编码过 `'Cancel sorting'`）抄出来的 | 撤销 |

另有两条**只改理由、不改判定**的：

- 函数式 `column.title`：此前的登记理由（把"传函数"说成会被框架当场拒绝、因此不算静默失效）**是假的**，已撤销。
  实情：react-dom 对"函数当 React child"只写一条 console 错误、**按父组件名去重、永不抛**
  ⇒ 渲染面确实是静默的。现值见上面「列与表头」那条（标题为空 + 连带丢原生 `title`，
  另有一条按列去重的 `[data-grid]` 开发态告警）。**判定不变**：不移植。
- 选择菜单触发方式：此前只写「我们 `click`、参照 hover」，依据换成
  `antd 6.4.4 es/table/hooks/useSelection.js:326-329` 未传 `trigger`（默认值来自
  `@rc-component/dropdown 1.0.x es/Dropdown.js:24`）。**判定不变**：不改成 hover。

## 行为和布局限制

- 虚拟化与跨边界合并格的组合仍有简化路径，极端滚动位置需要继续观察。
- `scrollTo({ align: 'nearest' })` 的边界判定仍记录过轻微偏差。
- `scroll.y: true` 与 Spin 组合时，高度链仍依赖额外布局约束。
- 纯横向滚动场景曾记录过纵向 hit 容器仍渲染的 click-catch 问题，属于滚动条实现的重点回归项。

## 视觉对齐遗留项

以下问题来自对照校验文档中的未完项，仍值得作为回归关注点保留:

- 多级表头横滚时的层叠和固定列阴影边界
- 虚拟表示例的纵向滚动条、列宽与 fixed 贴边细节
- pagination 场景下滚动条是否落在表格内部
- filter dropdown 背景色、summary fixed cell 横向 sticky
- FloatingScrollBar 的贴边位置、hover 对比度和 dark mode 表现

## 本轮验证未覆盖的范围

下面是**已经检查过、但没有证据覆盖**的面，如实列出以免被读成"已全面对齐"：

1. **树形勾选传导的一条退化分支没有生产层功能门**：父行下挂着「key 无法解析」的子行时传导结果会退化，
   这个形状能在真实渲染里构造出来，但目前**没有**对应的功能层用例钉住它（补测已登记，不是定论性缺口）。
2. **disabled 行的点击守卫在测试环境里不可证伪**：黑盒两侧的点与变更都是 0 次 ⇒ 这条差异无法用黑盒用例分辨；
   可以改用白盒方式直接调用返回元素上的变更回调来构造，但本轮没做。
3. **表头无障碍描述的覆盖判据只有一半是活门**：见「列与表头」一节最后一条。
4. **端到端用例与截图基线本轮只做过"选择器文本"的静态核对**，没有实跑；实跑需要独占窗口（本机浏览器 + 起服务）。
5. **「代码注释声称与 antd 一致」这类主张只做了部分复核**：全仓这类主张共 406 条，本轮只逐条复核了
   其中**拿来给"不修 / 跳过"当依据的 55 条**；剩下 351 条仍未复核（它们不都承载决策，但会误导读者）。
6. **参照版本条件性分叉没有做整类扫描**：见开头「对照的是哪个版本的 antd」。本轮只抓到 1 条实例，
   要覆盖需要把 peer 上界那版装起来、逐条重跑双侧对账，代价是所有"已对齐"结论的靶子同时移动。

## 参考

- [`compat-matrix.md`](compat-matrix.md)
- [`grid-options-namespace.md`](grid-options-namespace.md)
- [`../features/styling/semantic-dom.md`](../features/styling/semantic-dom.md)
- [`../features/interaction/expand.md`](../features/interaction/expand.md)
- [`../features/interaction/selection.md`](../features/interaction/selection.md)
- [`../features/interaction/filter-sorter.md`](../features/interaction/filter-sorter.md)
