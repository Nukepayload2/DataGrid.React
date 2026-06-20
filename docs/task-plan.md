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

## 当前进度（截至最新会话）

**已完成（验证通过）**：
- **F1-F4 基础设施**：CSS Grid 引擎 / antd v6 接口适配 / v6 token 样式 / demo 环境
- **M1-M9 移植类**：M1 多级表头 · M2 固定列 · M3 合并单元格 · M4 虚拟滚动 · M5 行选择 · M6 隐藏列 · M7 列宽拖拽 · M8 固定表头 · M9 行展开（含决策 2 虚拟×展开）
- **S1-S34 自研类**：S1 单列排序 · S2 多列排序 · S3 基础筛选 · S4 受控筛选与重置 · S5 自定义筛选面板（filterDropdown/filterIcon/filterDropdownProps + confirm/clearFilters/close + react-highlight-words 高亮） · S6 筛选项搜索 filterSearch（menu 搜索框 + 默认 contains/自定义函数 + 关闭清空） · S7 树形筛选 filterMode='tree'（antd Tree checkable 父子联动 + filterSearch 高亮 + menu 共存） · S8 受控选择与批量操作（selectedRowKeys 受控 + Reload 批量清空，引擎复用 M5 零改动） · S9 自定义选择项 selections（Table.SELECTION_ALL/NONE/INVERT + 自定义 onSelect + 表头下拉菜单） · S10 选择/展开列顺序控制（EXPAND_COLUMN/SELECTION_COLUMN 哨兵，M9 已实现，确认性验证通过） · S11 分页集成与位置（usePagination + antd Pagination + v6 placement 数组 + onChange 注入实际 pagination，默认不分页） · S12 远程数据 ajax + loading（loading Spin + preserveSelectedRowKeys + 服务端分页/排序/筛选 + filterable 放宽 + slicePage server 检测） · S13 树形数据渲染（childrenColumnName + DFS 扁平化 + 缩进 + 展开状态机 + checkStrictly 父子联动） · S14 树形跨页/保留选择（树形×分页×checkStrictly×preserveSelectedRowKeys，issue #50621，引擎零改动） · S15 单元格编辑 edit-cell（components.body.cell/row div 适配 + onCell 扩展透传 + 编辑态 + 增删行 + shouldCellUpdate） · S16 行编辑 edit-row（行级 editingKey + Edit/Save/Cancel + InputNumber，引擎零改动复用 S15） · S17 行拖拽排序 drag-sorting（**方案 B 自研 pointer**，不依赖 @dnd-kit/*；useRowDragSort + 事件委托命中 body 单元格 + hit-test 算 over + 蓝色指示线 + arrayMove；引擎零改动） · S18 拖拽手柄排序 drag-sorting-handler（复用 S17 useRowDragSort + handleSelector 限定手柄列触发，其他列不触发） · S19 列拖拽排序 drag-column-sorting（useColumnDragSort 列方向，命中 data-leaf-index 表头格，引擎零改动） · S20 省略号 ellipsis（dg-cell-ellipsis + 默认 title 提示；视觉 gap 见 §9） · S21 省略号+自定义 Tooltip（ellipsis {showTitle:false} + antd Tooltip render） · S22 汇总 summary（summary prop 函数 pagedDataSource + Table.Summary/Row/Cell + colSpan + fixed sticky bottom） · S23 自定义空状态（empty 区 + locale.emptyText + ConfigProvider.renderEmpty；'Table.filter' 修正为 filter 下拉内占位） · S24 嵌套子表格（expandedRowRender 嵌套 Table + defaultExpandedRowKeys + 三 size，M9 零改动） · S25 树形省略（issue #36583：树形首列 ellipsis+fixed+缩进+图标+rowSelection 正交组合，引擎零改动） · S26 边框 bordered + title/footer（bordered 外边框+竖线 + title/footer + 固定列组合边框补 CSS） · S27 尺寸 size（large/medium/small padding + compact=small 决策4实测 + narrow 窄容器） · S28 响应式 responsive（column.responsive + Grid.useBreakpoint 列过滤，对齐 antd） · S29 语义化样式 classNames/styles（嵌套结构+函数式，多部位注入 root/title/footer/header.cell/body.cell/pagination） · S30 component-token 主题定制（useToken 读 components.Table → 32 字段映射 --ant-* 注入 .dg-wrapper + 动态面板） · S31 JSX 风格 API（Table.Column/ColumnGroup + convertChildrenToColumns，复用 M1 多级表头） · S32 列默认值 column（applyColumnDefaults 列自身优先合并 + 哨兵豁免 + 递归 children） · S33 动态设置综合集成验收（动态面板全量切换 10Switch+5Radio，引擎零改动，集成验收达成） · S34 粘性表头页面级（sticky offsetHeader + StickyScrollBar + .dg-wrapper.dg-sticky overflow:visible 修复）

**S17 收尾记录**（验证通过；PointerEvent 实测拖拽 3 轮双向稳定 + 指示线 #1677ff + 回归不破）：task-plan §4.7 原指定依赖 `@dnd-kit/*`（方案 A：行容器 div + DndContext + useSortable）。但 data-grid 用 CSS Grid 渲染，"行"非 DOM 元素（单元格直接是 grid item），方案 A 需要"行容器 div"挂 dnd-kit 的 setNodeRef/transform/listeners，而引入行容器（`grid-column:1/-1` + subgrid）会**严重破坏** M2（固定列单元格自身 sticky，行容器阻断 sticky 祖先链）/ M3（合并 grid-row span 在行容器内失效）/ M4（虚拟行 track 布局）/ M9（展开 track grid-column:1/-1 冲突）——S15 已踩过"行容器破坏 grid 定位"的坑（EditableRow 用 `Form component={false}` + Provider 不产生 DOM 让单元格穿透为 grid 直接子元素）。CSS subgrid 浏览器支持也有限（Chrome 117+/Safari 16+）。**决策 6 允许**（dnd-kit 属表格核心交互，可自研），故采用**方案 B 自研 pointer 行拖拽**（参考 M7 useColumnResize 成熟的 setPointerCapture + 原生 move/up 模式），**不安装 @dnd-kit/***。实现：新增 `useRowDragSort` hook（事件委托——外层容器 onPointerDown 命中 `[data-row-index]` body 单元格启动拖拽；pointermove 实时 hit-test 算 over index——遍历 body 单元格 getBoundingClientRect 按实际行边界，不假设固定行高；蓝色指示线作为外层容器子元素绝对定位，**非 grid item** 不影响 grid-template-rows；pointerup arrayMove 重排 dataSource）。demo `drag-sorting` 复刻 antd（3 行 + Name/Age/Address + 超长 address 行测自适应行高）。引擎零改动（不动 GridTable/columnTree/types）。与 antd 差异：拖拽中显示指示线（antd 是 transform 平移整行），松手后重排，功能等价。S18 拖拽手柄将复用本 hook（限定手柄列触发）。

**S18 收尾记录**（验证通过；PointerEvent 实测手柄拖拽 2 轮 + 其他列不触发 + S17 回归不破）：复用 S17 `useRowDragSort`，扩展 `handleSelector?: string` option（传则仅手柄 `closest(handleSelector)` 命中才启动，不传则 S17 任意 body 单元格——零回归）。demo 手柄列 `DragHandle`（antd Button + 自绘 HolderOutlined SVG，不 import @ant-design/icons，className `dg-drag-handle`）+ Name/Age/Address。仅手柄列触发拖拽，其他列 pointerdown 不启动。

**S19 收尾记录**（验证通过；列拖拽 2 轮双向稳定 + 垂直指示线 + 回归不破）：`useColumnDragSort` hook（列方向，命中现有 `[data-leaf-index]` 叶子表头格——M2 起就有，**引擎零改动**）→ 水平 hit-test → 垂直指示线（#1677ff，跨表头+表体）→ `arrayMoveColumns` 重排 columns（区别 S17 重排 dataSource）。与 S17/S18 行拖拽（命中 `[data-row-index]` body 单元格）正交。多级表头列重排未覆盖（demo 单层，后续增强）。

**S20 收尾记录**（验证通过；CSS ellipsis 类 + 默认 title API 正确，回归不破）：`column.ellipsis:true` → 单元格（body+header）加 `dg-cell-ellipsis` 类（CSS text-overflow:ellipsis+nowrap+hidden）+ native title 提示（`toEllipsisTitle` 文本化，仅 ellipsis 列）。**视觉 gap 见 §9**（grid 列宽 max-content 默认使 ellipsis 列 track=content 宽，cell-inner 不溢出 → 视觉无 `...`；CSS 契约正确，缺列宽约束）。S21 `showTitle:false` 开关将复用 `toEllipsisTitle` 门。

**S21 收尾记录**（验证通过；showTitle:false 无 native title + Tooltip hover + S20 回归不破）：`ellipsis` 类型扩展 `boolean | {showTitle?:boolean}`（normalizeEllipsis：true→默认 showTitle，{showTitle:false}→关 title）。showTitle 门（表体+表头 4 处渲染点 `showTitle !== false` 才加 native title），showTitle:false 时 render 内 antd `<Tooltip>` 接管 hover。**双透传**（collectLeaves + flattenHeaderCells + showTitle）避免 S6 坑。视觉 gap（§9）同 S20。

**S22 收尾记录**（验证通过；示例1 计算总计 + 示例2 fixed sticky + 回归不破）：`summary` prop（函数用 **pagedDataSource 当前页**，区别 title/footer 全量）+ `Table.Summary/Row/Cell`（index + colSpan，静态属性）。grid-template-rows 末尾追加 summary tracks + summaryStartLine + Cell 按 index/colSpan 定位（gridColumn span）。fixed → `position:sticky; bottom:0`（需 scroll 滚动容器）。示例1 Total(195)/Balance(107)/colSpan=2 + 示例2 fixed sticky 滚动固定 + 横向同步。

**S23 收尾记录**（验证通过；实施 1 轮 + 修复 1 轮，对齐 antd 语义）：empty 区（pagedDataSource 空 → grid-column 1/-1 跨列居中 `.dg-empty`）。emptyText 来源对齐 antd InternalTable.tsx:714-717：表体 empty（空数据 + 筛选无结果，**不区分**）共用 `locale.emptyText > renderEmpty('Table') > 默认 Empty`。**'Table.filter' 语义修正**（上轮误用于表体筛选无结果）：实为 **filter 下拉内 filters 空时占位**（FilterDropdown 加 renderEmpty('Table.filter')，对齐 antd FilterDropdown.tsx:395,410）。ConfigContext 消费（`antd/es/config-provider/context`）。详见 memory `antd-table-filter-empty-semantics`。

**S24 收尾记录**（验证通过；M9 expandedRowRender 零改动，嵌套子 Table 渲染正确）：`expandable.expandedRowRender` 返回嵌套 `<Table>`（独立 grid 上下文，与主表正交）+ `defaultExpandedRowKeys`。**size 类型补全**（`'large'|'middle'|'medium'|'small'|'compact'`，对齐 antd v6，保留 'middle' 别名；medium=middle、compact=small 视觉等价，完整行高 padding 属 S27）。复刻 antd nested-table（主表 7 列 + 子表 5 列 Badge/Dropdown + 三 size）。回归 M9 不破。

**S25 收尾记录**（验证通过；引擎零改动，四机制正交组合 issue #36583 已正确）：S13 树形首列缩进+图标 + S20 ellipsis 类+title + M2 fixed sticky + M5 rowSelection 在 BodyCell 正交共存（fixed sticky 定位 / ellipsis CSS 类 / 树形内容前缀，不同层面不冲突）。复刻 antd tree-table-ellipsis（树形 name 超长 + Name ellipsis+fixed(Switch) + defaultExpandAllRows + rowSelection）。**已知差异**（§9）：M5 checkStrictly 默认 true（antd 默认 false）。

**S26 收尾记录**（验证通过；bordered/title/footer 已就位 + 固定列边框补 CSS）：`bordered`（表格外边框 + 单元格竖线 border-inline-end + 表头 ::before 抑制）+ `title`（上方 dg-title 底边框）+ `footer`（下方 dg-footer 顶边框）。**固定列组合边框补全**（避免 lun 右 sticky 缺左 border 缺陷）：`.dg-bordered .dg-sticky-shadow-end` border-inline-start + `.dg-sticky-shadow-start` border-inline-end（横向滚到尽头边界完整）。复刻 antd bordered（示例1 3列+title/footer + 示例2 bordered+fixed）。回归非 bordered 无边框。

**S27 收尾记录**（验证通过；size 样式确认 + compact=small 决策 4 实测）：large（默认 padding 16/16）/ medium=dg-size-middle（12/8）/ small=dg-size-small（8/8）。**compact=small**（实测 antd v6 Table 无 compact size——SizeContext `SizeType='small'|'medium'|'middle'|'large'`，table style 只 large/MD/SM 三档；compact 是 Button/Space 概念；不臆造 dg-size-compact token，决策 4）。复刻 antd size（medium+small）+ narrow（width300+200行+small+分页）。narrow 列宽 gap（§9）已知。回归默认 large 不变。

**S28 收尾记录**（验证通过；responsive 类型 + Grid.useBreakpoint 列过滤）：`column.responsive: Breakpoint[]`（antd 7 断点含 xxxl）+ antd `Grid.useBreakpoint` 检测 + 列过滤（`!responsive || responsive.some(r => matched.has(r))`，对齐 antd InternalTable.tsx:242-246；`responsive:['md']`=md+ 显示）。needResponsive 短路（无 responsive 列的 demo visibleColumns===columns 同引用，零回归）。复刻 antd responsive（Name all + Age md + Address lg）。

**S29 收尾记录**（验证通过；classNames/styles 多部位注入）：`classNames`/`styles`（对象或 `(info)=>` 函数，嵌套结构 `{root,header.{cell,row,wrapper},body.{cell,row,wrapper},title,footer,pagination.{root,item},section,content}`，对齐 antd v6）。注入：root→dg-wrapper / title→dg-title / footer→dg-footer / content→dg-grid / section→滚动容器 / header.cell→dg-cell-header / body.cell+row→dg-cell-body / pagination。复刻 antd style-class（对象 styles + 函数 stylesFn medium 触发）。**已知差异**：pagination.item 近似（antd Pagination 无 itemClassName）；body.row/header.row 透传行内单元格（grid 无 tr）；header/body.wrapper 保留类型未注入（共享 grid）。回归无 classNames/styles 不变。

**S30 收尾记录**（验证通过；useToken + CSS variables 注入）：data-grid `.dg-wrapper` 非 `.ant-table`，antd cssinjs component token 不自动注入 → 用 `theme.useToken()` 读 `token.Table`（getComputedToken 合并 components.Table）→ `buildTableTokenCssVars` 映射 32 字段（headerBg/headerColor/rowHoverBg/cellPadding*/borderColor/headerBorderRadius/footerBg/cellFontSize/...）为 inline `--ant-*` CSS variables 注入 .dg-wrapper style（覆盖 tokens.css fallback）。优先级：用户 style > token vars > fallback。复刻 antd component-token（动态面板 + ConfigProvider theme 27 token）。回归无 theme 注入时 fallback 不变。**已知 gap**（§9）：cellFontSize 等 token 已注入变量但部分子样式（字号）未消费。

**S31 收尾记录**（验证通过；JSX 子元素声明列）：`Table.Column`/`Table.ColumnGroup`（静态属性，渲染 null 数据载体，props=列字段/Group 含 children）+ `convertChildrenToColumns` 解析（React.Children → columns，ColumnGroup 嵌套复用 M1 多级表头）。columns 或 JSX children 二选一（`props.columns !== undefined` 走 columns，否则 children 解析）。复刻 antd jsx（ColumnGroup Name[First/Last] + Column Age/Address/Tags/Action）。回归 columns prop demo 不变。

**S32 收尾记录**（验证通过；column 默认合并）：TableProps 补 `column?: Partial<ColumnType>`（types.ts:312 原 column 是 SorterResult.column，非 Table 级）+ `applyColumnDefaults` 合并（列自身优先浅合并 + 哨兵豁免 + 多级表头 children 递归 + `if(!columnDefault) return columns` 零回归短路）。复刻 antd column-defaults（column align center+ellipsis，Address 覆盖 start）。回归无 column prop 不变。

**S33 收尾记录**（验证通过；集成验收，引擎零改动）：动态面板全量切换（10 Switch + 5 Radio.Group：bordered/loading/size/title/footer/showHeader/expandable/rowSelection/scroll/ellipsis/tableLayout/pagination）+ 关键组合 + 空数据 + expandable + 排序/筛选共存，全程 console 无 error。复刻 antd dynamic-settings（无 ConfigProvider theme token，区别 S30）。集成验收达成：S1-S32 + M1-M9 全部功能组合正确。

**S34 收尾记录**（验证通过；实施 1 轮 + 修复 1 轮，**最后一个自研任务**）：`sticky={{offsetHeader, offsetScroll, getContainer}}` 表头跟随**页面**滚动固定（position:sticky top:offsetHeader 相对 viewport，区别 M8 容器内 scroll.y）+ StickyScrollBar（横向滚动条 sticky bottom 同步）。**修复**：`.dg-wrapper` overflow:hidden 拦截 sticky 上下文（CSS sticky 经典陷阱——非 visible overflow 祖先成为 sticky 滚动祖先）→ sticky 模式加 `dg-sticky` 类（overflow:visible + width:auto，放开 sticky 上下文 + scroll.x 撑宽横向滚动）；圆角降级。复刻 antd sticky（100 行 + scroll.x + fixed 列 + summary fixed + offsetHeader:64）。S34 页面级 vs M8 容器内互斥（data-grid 简化）。

**★ S1-S34 全段完成**（34 自研任务全绿）：排序 S1-S2 · 筛选 S3-S7 · 选择 S8-S10 · 分页/ajax S11-S12 · 树形 S13-S14 · 编辑 S15-S16 · 拖拽 S17-S19 · 单元格展示 S20-S23 · 展开 S24-S25 · 样式 S26-S28 · API S29-S32 · 集成 S33 · sticky S34。下一步：D1 边缘用例 → 接口全兼容 → 全量回归。

**D1 收尾记录**（验证通过；边缘用例 + renderCell 补全）：nest-table-border-debug（父子 bordered Switch 隔离，引擎零改动 M9+S26）+ row-selection-custom-debug（rowSelection.renderCell 自定义勾选格 + rowSpan 合并）。**renderCell 补全**（M5 原未支持，D1 补：`renderCell(checked,record,index,node) => {props:{rowSpan},children}|ReactNode`，render 取 children + onCell 取 props.rowSpan 接入 M3 cellMerge；无 renderCell 走默认 SelectionInput 零回归）。

**接口全兼容收尾记录**（验证通过；补齐核心 API + 对照清单）：对照 antd `interface.ts` 公共 API，补齐 data-grid 未实现核心：`onHeaderRow`/`onRow`/`rowClassName`/`getPopupContainer`/`onHeaderCell`/`column.className+style`/`rowHoverable`（类型声明 + 渲染层注入；grid 无 tr → 行级 props/class 透传行内单元格）。糟粕 API 跳过（决策 1：onCellClick/filtered/sortIcon/onSelect*/columnTitle 等低价值/legacy）。回归现有 demo 不变（新 API 未传无副作用）。

**全量回归收尾记录**（最终交付验证通过）：47 个 demo 全部 ✓（渲染 + console 无 error），仅零星 a11y issue（antd 表单控件层面，非阻断）。

**🎉 data-grid 主体交付完成**：F1-F4 基础设施 + M1-M9 移植类（9）+ S1-S34 自研类（34）+ D1 边缘 + 接口全兼容 + 全量回归 全部完成。CSS Grid 重做 antd Table，兼容 antd v6 CSS variables + React 接口。

**后续可选**（非阻塞）：
- §9 已知限制修复：① 列宽策略 gap（grid max-content → ellipsis 视觉 + 表格容器适应，建议优先）；② checkStrictly 默认 true（antd false）；③ cellFontSize token 未消费；④ title/footer 全量 vs currentPageData；⑤ preserve=false 树形语义；⑥ conduction disabled 简化；⑦ rowClassName/editable-row 等 polish。
- antd 默认分页对齐（接口全兼容阶段评估）。
- demo 视觉 polish（S8 Reload 原生 button→antd Button、S13 demo checkStrictly Switch 初值等，全量回归前统一）。

**接口全兼容 收尾记录**（实施完成；lint 0 error + build 成功；未做 UI 验证——交验证者）：
对照 antd `interface.ts` / `InternalTable.tsx` / `index.en-US.md` 公共 API 全表，补齐未实现的核心公共 API：
- **onHeaderRow?: (columns, index) => HTMLAttributes**：表头行 props 注入。grid 无独立 `<tr>`，引擎把返回值透传到该表头行**所有表头格**（事件 + class + style）。columns 参数用顶层列 raw 数组（多级表头简化为顶层列，调用方一般不读）。
- **onRow?: (record, index) => HTMLAttributes**：表体行 props 注入。grid 无独立 `<tr>`，引擎把返回值透传到该行**所有数据单元格**（事件 + class + style）。★ 与内置 hover 交互：onRow.onMouseEnter/Leave 与引擎内置 hover 合并触发（两者都执行）；rowHoverable=false 仅关闭内置 hover 视觉。
- **rowClassName?: string | ((record, index) => string)**：行 class。透传到该行所有数据单元格 className（行级 class 标记）。§9 S15 待办关闭。
- **getPopupContainer?: (trigger) => HTMLElement**：筛选下拉默认挂载容器。作为 FilterDropdown 内 antd Dropdown 的默认 getPopupContainer（列级 `column.filterDropdownProps.getPopupContainer` 优先）。
- **onHeaderCell?: (column, index) => HTMLAttributes**：表头格 props 注入（与 onCell 对称）。返回值合并到表头格 div props（className/style/onClick/...）。
- **column.className / column.style**：列级单元格/表头格额外 className/style（透传到数据格 + 表头格）。
- **rowHoverable?: boolean**（since 5.16.0）：行 hover 开关，默认 true。false 时单元格不加 dg-row-hover。

**接入位置**：types.ts（TableProps + ColumnType 公共类型）+ Table.tsx（适配层透传）+ engine/types.ts（EngineColumnNode/EngineLeafColumn/EngineHeaderCell/EngineTableProps 引擎类型）+ engine/columnTree.ts（collectLeaves + flattenHeaderCells 双透传 onHeaderCell/className/style——避 S6 双透传坑）+ engine/GridTable.tsx（HeaderCell/BodyCell/ColumnCells 渲染层注入 + onClick/onMouseEnter/Leave 与排序/hover 合并 + omitKey 工具）+ engine/FilterDropdown.tsx（getPopupContainer 列级覆盖 Table 级）。

**糟粕跳过（决策 1）**：onCellClick（deprecated，用 onCell 替代）/ expandedRowClassName（legacy low-value）/ expandIconColumnIndex（deprecated）/ dropdownPrefixCls（内部）/ rootClassName（与 className 重叠）/ onScroll（虚拟模式 low-value，data-grid 用原生 scroll 容器）/ measureRowRender（决策 1 糟粕）。selection 的 onSelect*/columnTitle（M5 子接口，非 TableProps 公共字段，后续 M5 增强再补）。expandable 的 expandRowByClick/expandedRowOffset（legacy/低频，后续按需）。

**grid 布局接入差异**：grid 渲染下表头/表体无独立 `<tr>`，onHeaderRow/onRow/rowClassName 的"行级"props/class 分发到该行所有单元格（与 S29 body.row/header.row 语义化 class 同款行级透传机制）。行为等价 antd（事件触发 / class 标记），DOM 结构不同（grid item vs tr）。

**回归确认**：所有新 API 未传（undefined）时引擎零行为变化（onHeaderRow/onRow/rowClassName/getPopupContainer/onHeaderCell/column.className/style/rowHoverable 全部 undefined 兜底，不注入任何额外 DOM/props）。lint 0 error + build 成功。现有 demo 文件未改动。

**S5 收尾记录**（验证通过；实施+验证 1 轮即过）——验证发现 1 真 bug 已修、2 个疑似项经 **antd 6.4.4 源码核实为正确对齐**（不计问题，勿重复误判）：
- **Bug A（已修，`Table.tsx:686` `hasAnyFilter` 门）**：S5 自定义面板列只有 `filterDropdown+onFilter` 无 `filters`，原门条件 `node.filters && node.onFilter` 漏判 → `applyFilterToNode` 回填被整段跳过 → `cell.filteredValue` 恒 null → 放大镜激活态（`#1677ff` + `dg-filter-trigger-active`）不生效。修复：门扩展为 `((node.filters && node.onFilter) || node.filterDropdown !== undefined)`，与 `useFilter.isFilterable`/`columnTree.filterable`/`applyFilterToNode` 三处对 S5 的判定一致。**注**：数据过滤本身照常工作（`isFilterable`/`filterable` 早已含 S5），仅激活态回填断链。
- **非 bug B（clearFilters 不立即清表）**：`clearFilters()` 无参默认 `{confirm:false}`——与 antd `onReset`（`ant-design\components\table\hooks\useFilter\FilterDropdown.tsx:298-315`）逐字一致；点 Reset 只清草稿（Input 清空）、不立即清表，需再 Search(confirm 空草稿) 或关闭下拉(filterOnClose) 才回全量。data-grid 正确。
- **非 bug C（sortDirections 第三次回 null）**：`sortDirections:['descend','ascend']` 第三次点击回 null——antd `nextSortDirection`（`ant-design\components\table\hooks\useSorter.tsx:52-57`）与 data-grid `useSorter.ts:163-171` **逐字相同**，耗尽回 `undefined`(=null) 是 antd 本身循环。data-grid 正确。

**S6 收尾记录**（验证通过；实施 1 轮 + 修复 1 轮）：`filterSearch`（true=默认 contains / 函数自定义 / 空 input 显全部 / 关闭清空 / 仅 menu 模式，tree 属 S7）。
- **坑（已修）**：`columnTree.ts` `collectLeaves`（→leafColumn，单层表头+表体单元格路径）逐字段列举时漏传 `filterSearch`，导致搜索框不渲染；`flattenHeaderCells`（→headerCell，多级表头路径）已传。**columnTree 有两条平行字段透传路径（`collectLeaves` + `flattenHeaderCells`），新增列字段时两处都要加**——S7 加 `filterMode`/`children` 同理（详见 memory `columntree-dual-passthrough`）。

**S7 收尾记录**（验证通过；实施 1 轮即过，双透传坑未重蹈——filterMode 在 collectLeaves+flattenHeaderCells+Table 三处都加）：`filterMode:'tree'` 用 antd `<Tree checkable>` 父子联动（`checkStrictly=!filterMultiple`）+ filterSearch + 全选 Checkbox；menu 默认不破。
- **规格澄清（非 bug）**：filterSearch 在 tree 模式下**高亮命中节点**（对齐 antd `filterTreeNode` 的 "highlight" 语义，见 antd `FilterDropdown.tsx:451-460` + antd Tree 文档），**不隐藏**不匹配节点。data-grid 与 antd 一致，勿判为缺陷（验证者已核实）。

**S8 收尾记录**（验证通过；实施 1 轮即过，**引擎零改动**——M5 已正确实现受控：`useRowSelection` 的 `selectedKeySet` 从 `selectedRowKeys` prop 纯派生，外部 `setSelectedRowKeys([])` 天然同步清空勾选 UI）。S8 仅新增 demo（受控 + Reload 批量清空 + "Selected N items" + 46 行全显，分页属 S11）。

**S9 收尾记录**（验证通过；实施 1 轮即过）：导出 `Table.SELECTION_ALL/NONE/INVERT` 常量 + `rowSelection.selections`（true/数组）+ `SelectionItem.onSelect(changeableRowKeys)` + 表头选择列下拉菜单（antd Dropdown+Menu，自绘 caret-down）。引擎 `applySelection`：内置项保留 disabled 已选行，自定义项走 onSelect（demo 自行 setState）。无 selections 的 demo 不渲染下拉箭头（M5/S8 回归不破）。

**S10 收尾记录**（确认性验证通过，**无需新实施**）：`Table.EXPAND_COLUMN`/`Table.SELECTION_COLUMN` 哨兵机制在 M9 已一并实现（哨兵定义 + Table 静态属性 + 识别逻辑 + order-column demo 均已就位）。S10 验证列顺序（Name→展开→Age→选择→Address）+ 展开/选择功能 + 共存 + 回归 expand/expand-sticky/row-selection 全部通过。注：antd order-column demo 未设 rowExpandable，4 行均可展开（"Not Expandable" 仅文字）。

**S11 收尾记录**（验证通过）：新增 `usePagination` hook + 分页切片（filteredDataSource 之后）+ antd `<Pagination>` 渲染 + **v6 placement 数组语义**（实测 antd 6.4.4：元素 topStart/topCenter/topEnd/bottomStart/bottomCenter/bottomEnd/none，含 top/bottom 首元素决定位置+对齐，默认 `['bottomEnd']`，全 none 不渲染）+ onChange 三路径（sort/filter/paginate）注入实际 `{current,pageSize,total}`（修复原占位 `{}`）。**默认不分页**（undefined/false 全显）保持现有 demo 不变。已知差异见 §9（① 默认不分页 vs antd 默认分页；② title/footer 传全量 vs antd currentPageData）。

**S12 收尾记录**（验证通过；3 轮引擎修复，均 antd 6.4.4 源码对齐）：loading（antd `<Spin>`，undefined 不渲染零回归）+ preserveSelectedRowKeys（fireSelectionChange 过滤）+ 服务端分页/排序/筛选（受控）。3 个引擎 bug 修复：
- ① **slicePage server 模式检测**（`data.length < total` 不切片，对齐 antd `InternalTable.tsx:547-556`）——S11 无条件切片致 server 模式双重切片，翻第 2 页空表。
- ② **filterable 放宽**（`useFilter.isFilterable`/`columnTree.filterable`/`GridTable` 兜底：filters/filterDropdown/onFilter 任一即可，**onFilter 非必需**，对齐 antd `useFilter/index.tsx:38`）——server 筛选无 onFilter 也渲染漏斗；前端过滤计算对无 onFilter 列跳过守卫。
- ③ **激活态门同步**（`Table.tsx` `hasAnyFilter` 门 + `applyFilterToNode` 跳过条件统一为 `isNodeFilterable`，与 filterable 一致）——纯 filters 无 onFilter 列也回填 filteredValue → 漏斗激活态生效（与 S5 Bug A 同款根因）。
- **反思**：data-grid 此前实现偏"客户端模式"，server/async 场景（total>dataSource、onFilter 可选）考虑不足，S12 集中暴露——后续任务（树形/编辑/拖拽的 server 场景）注意对照 antd server 行为。demo 用本地 mock+setTimeout（非真实 fetch，稳定可验证）。

**S13 收尾记录**（验证通过；实施 1 轮 + 修复 1 轮）：新增 `useTreeData` hook（detectTreeData 检测 + flattenTree DFS 扁平化 level/parent/hasChildren + 展开状态机）+ 首列缩进（indentSize=15px 实测 antd `InternalTable.tsx:611`）+ ExpandIcon（复用 M9 自绘）+ `checkStrictly` 父子联动（`conductTreeCheck` 对齐 rc-tree：填充子孙 + 自底向上补全父 + 半选 indeterminate）+ 树形优先于 M9 expandedRowRender。决策 2：树形行遵循行高约定不动态测量。
- **修复**：`useTreeData.ts:225-229` `effectiveExpandedKeys` 原误耦合 `expandable ? ... : []`（无 expandable prop 时展开失效）→ 改为树形模式始终走展开状态机（antd 语义：树形由 childrenColumnName 检测，不依赖 expandable prop）。
- **fireSelectionChange 树形存在性判定用全树**（递归 walk children），确保 checkStrictly=false 勾父→勾全部含折叠子孙不被误清（对齐 antd getRecordByKey 搜全树）；selectedRows 只含可见行。

**S14 收尾记录**（验证通过；**引擎零改动**——S13 树形 + S11 分页 + S12 preserveSelectedRowKeys 三机制组合已正确覆盖 issue #50621，仅新增 demo）：issue #50621 三场景全通过——①跨页保留（页1勾父→翻页2 保留→翻回页1 保留）；②折叠保留（勾子→折叠父→子 key 保留→展开仍勾）；③联动跨页/折叠（勾父→全部含折叠/跨页子）。selectedRowKeys 真理源在 Table 层不受翻页/折叠影响；fireSelectionChange 全树存在性判定（S13）确保折叠/跨页 key 不误清。`preserve=false` 树形语义差异见 §9。

**S15 收尾记录**（验证通过）：首次引入 **components 机制**（`components.body.cell/row`）+ `onCell` 返回值扩展透传（colSpan/rowSpan 仍归 M3，其余透传 cell 组件）+ `shouldCellUpdate`。**data-grid div 渲染适配**：body.cell 替换 dg-cell **内容**（返回 ReactNode 非 td）；body.row 用 `Form component={false}`+Context.Provider（不产生 DOM）+ 提供时强制 multi 显式定位路径（使 Provider 穿透为 grid item）。复刻 antd edit-cell（EditableRow/EditableCell + 点击编辑 Form.Item+Input + 增删行 + 必填校验）。回归：非编辑 demo 零回归、M3 合并/虚拟/展开/树形不破。rowClassName 未实现见 §9。

**S16 收尾记录**（验证通过；**引擎零改动**——复用 S15 components.body.cell + onCell 透传）：行级编辑 demo（editingKey + Edit/Save/Cancel + InputNumber(age)/Input + 必填校验 + 翻页取消编辑）。**Form context 透传**：Form 在 Table 外层（`Form component={false}` 包 Table），Form.Item 在 EditableCell 内，靠 **React FormContext 跨组件树透传**（不依赖 DOM 层级），data-grid div 渲染不影响——验证 save(validateFields) 成功。无 components.body.row（区别 S15 EditableRow）。回归 S15/非编辑不破。

**下一步**：S17 验证通过 → S18 拖拽手柄 → …（自研类 S18-S34，见 §4）。

**已知限制/待办**：见 §9。

---

## 工作模式（任务推进方式 + agent 规范）★ 新会话必读

### 推进方式
- **实施 ↔ 验证 交替循环**：main 只调度，每轮启动 1 个实施者或验证者，完成后启动下一个，循环到任务通过。
- **不用 agent teams**：不用 TaskList 任务列表系统、不用 teammate。
- 每个任务流程：实施者按规格实现（lint/build 通过）→ 验证者按 §1.5 浏览器 UI 测试规范验证 → 有问题回实施者修复 → 再验证，循环到通过，再进下一任务。

### ★ agent 规范（核心：避免 teammate / 浏览器争抢）
1. **只用普通 background agent，不用 agent teams / teammate**：
   - 用 Agent 工具启动 background agent，**不给 `name` 参数**（给了 name 就成可被 SendMessage 寻址的 teammate，违规）。
   - 普通背景 agent 靠 agentId 寻址，独立跑完返回结果。
2. **验证者直接用 chrome-devtools，禁止 spawn 子 agent**：
   - 验证者本身是 Agent 工具创建的 background **隔离上下文**，已满足全局规约"chrome-devtools 须在隔离上下文使用"——**直接用 chrome-devtools MCP**（navigate_page / take_snapshot / click / fill / evaluate_script / list_console_messages / take_screenshot 等）。
   - **绝对禁止验证者再用 Agent 工具 spawn 任何子 agent**（无论 teammate 还是其他）。
   - 原因：① chrome-devtools 连同一个浏览器实例，多 agent 并行操作会争抢（导航/点击互相覆盖）；② 主 agent 被 kill 时子 agent 变孤儿继续抢浏览器；③ spawn 带 name 的子 agent = teammate = 违背"不用 agent teams"。
   - 串行完成所有浏览器步骤。
3. **kill agent 注意**：若不得已 kill 一个 agent，确认它没有遗留的孤儿子 agent（之前 `a9d0c66f54717e751` 被 kill 后留下 teammate 子 agent `s5-verify` 抢浏览器，是教训）。

### Agent 工具启动模板（正确参数）★ 照此启动

**实施者**（普通 background agent）：
```
Agent({
  description: "实施 <任务号> <任务名>",        // 3-5 词简述
  subagent_type: "general-purpose",
  run_in_background: true,
  prompt: "<任务详情：先读 task-plan 对应任务规格 + §1.1/§1.2 决策 + §1.5 测试规范 + §8；给出目标/参考文件/约束/返回格式>"
  // ★ 不要给 name 参数！给了 name 就成 teammate（违规）
  // ★ 不要给 model 参数（省略 = 继承父模型 glm-5.2）
})
```

**验证者**（普通 background agent，直接用 chrome-devtools）：
```
Agent({
  description: "验证 <任务号> <任务名>",
  subagent_type: "general-purpose",
  run_in_background: true,
  prompt: "
    你是普通 background agent（本身就是隔离上下文）。
    ★ 直接用 chrome-devtools MCP（navigate_page / take_snapshot / click / fill / evaluate_script / list_console_messages / take_screenshot / hover / wait_for），串行操作浏览器。
    ★ 绝对禁止用 Agent 工具 spawn 任何子 agent（避免 teammate + 浏览器争抢 + 孤儿）。
    <验证步骤：读 task-plan §1.5 + 任务规格 + 实施者产出文件；对照 antd demo 实测要点；返回 通过/不通过 + 问题清单 + 证据>
  "
  // ★ 不要 name，不要 model
})
```

**关键检查**：每次启动 agent 前，确认参数里**没有 `name`**（有 name = teammate = 违规）、**没有 `model`**（省略继承父模型）、`run_in_background: true`、`subagent_type: "general-purpose"`。

### 实施者规范
- 实施者也用普通 background agent（不给 name）。
- **表格核心自研**（grid 渲染/列树/固定列/合并/虚拟/排序/筛选/选择/展开状态机等），**非核心通用控件用 antd**（决策 6：loading/spin、tooltip、pagination、筛选下拉、dropdown、empty 等）。
- 优先内置 Read/Write/Edit/Grep/Glob（Windows 路径）；Bash 仅 pnpm 命令（易卡死，大 timeout）；不做 UI 验证（交验证者）。

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
| S4 受控重置 | `onChange` 在 filter 触发时 `sorter` 字段为 `{}`，未含当前已应用的排序状态（如 `defaultSortOrder` 或已点击排序）——antd 的 onChange sorter 始终反映当前完整排序 | 非受控 + 既有排序 + filter 时，onChange sorter 不完整 | 后续对齐 antd：filter/sort 的 onChange 始终注入当前完整 sorter + filters |
| S8 受控选择 | demo `row-selection-and-operation` 的 Reload 按钮用原生 `<button>` 自绘（PrimaryButton），与 antd `<Button>` 视觉微差（高度 30 vs 32、字体硬编码、无 shadow、loading 用文字非 spinner）；主色 #1677ff/圆角 6px/padding 4px 15px 已精确匹配，整体可接受 | demo 视觉非 100% 一致 antd；功能正确 | polish：换 antd `<Button type="primary" loading>`（与 custom-filter-panel demo 一致 + 决策 6），全量回归前统一 |
| S11 分页 | data-grid `pagination` 默认 `undefined`=**不分页**（全显），而 antd Table 默认 pagination 开启 | 与 antd 默认行为不同；有意保留以避免破坏全显 demo | 接口全兼容阶段对齐 antd 默认（或提供开关）；显式传 `pagination` 对象即启用，用法与 antd 一致 |
| S11 分页 | `title`/`footer` 收到的是 `filteredDataSource`（排序+筛选后**全量**），非 antd 的 `currentPageData`（当前页） | 与 antd title/footer 入参语义不同；当前无 demo 覆盖 | 后续对齐：title/footer 改传 pagedDataSource（当前页数据） |
| S13 树形 | demo `tree-data` 的 CheckStrictly Switch **初值 true**（独立），antd demo 默认 **false**（演示父子联动） | demo 首次显示独立模式，偏离 antd demo 演示意图（联动） | polish：demo useState 初值改 false（一行）；全量回归前统一 |
| S13 树形 | `checkStrictly=false` conduction 简化：disabled 子行仍参与父全选判定，未对齐 antd（antd 在 conductCheck 过滤 disabled 子） | disabled 行 × 树形联动的父全选边界与 antd 不一致；当前 demo 无此组合 | 后续对齐 antd：conduction 时过滤 disabled 子行 |
| S14 树形选择 | `preserveSelectedRowKeys=false` 树形语义与 antd 略异：data-grid 因 fireSelectionChange 走**全树存在性判定**（S13 引入），合法父行（仅被分页切到别页/折叠）的 key 仍保留；antd preserve=false 翻页后丢不可见 key | preserve=false 下跨页/折叠 key 保留行为比 antd 宽松（对树形更友好）；demo 注释已说明为有意设计 | 若需严格对齐 antd preserve=false（翻页丢不可见），后续评估；当前不阻塞 |
| S15 编辑 | `rowClassName`（Table 级 + 行级函数）未实现——antd edit-cell demo 用 `rowClassName='editable-row'`，data-grid 暂未声明（决策 3 第二步补齐） | edit-cell demo 缺 editable-row class（视觉略简，功能正常） | 接口全兼容阶段实现 rowClassName（含 `(record,index)=>string` 函数式） |
| S20 ellipsis | **ellipsis 列视觉省略号不生效**：data-grid `grid-template-columns` 默认 `max-content`（列宽=内容宽度），ellipsis 列 track=content 宽 → cell-inner 不溢出 → 无 `...`。CSS ellipsis 类（`dg-cell-ellipsis`+`text-overflow:ellipsis`）+ title API 已正确，但视觉截断依赖列宽<内容（antd 用 `width:100%`+`table-layout:fixed` 均分，data-grid 无 width 列走 max-content） | ellipsis demo 看不到省略号；表格总宽=内容宽溢出视口。**非 S20 API 问题，是列宽策略 gap**（影响 ellipsis 视觉 + 表格容器适应） | **重要 gap**：列宽策略任务——grid 容器 `width:100%` + 无 width 列 `minmax(0,1fr)` 或 `table-layout:fixed` 等效，使 ellipsis 列收缩<content 触发省略号。建议优先（独立任务或并入接口全兼容/列宽策略） |
| S25 树形 | M5 `rowSelection.checkStrictly` 默认 **true**（父子独立），antd 默认 **false**（父子联动） | 树形选择默认不联动（需显式 checkStrictly:false 才联动）；types.ts 已记录此默认 | 接口全兼容阶段评估：是否对齐 antd 默认 false（可能破坏现有默认 true 的 demo 行为），或保留 data-grid 默认 true |
| S30 token | `cellFontSize`/`cellFontSizeMD`/`cellFontSizeSM` 等 token 已通过 useToken 注入 `.dg-wrapper` inline `--ant-cell-font-size` 变量，但表头/表体字号样式**未消费该变量**（computed fontSize 14px 非 token 16） | ConfigProvider theme cellFontSize token 视觉不生效（变量在，子样式未读） | 后续：表头/表体字号 CSS 挂接 `--ant-cell-font-size` 变量（与 cellPadding 同款消费） |
