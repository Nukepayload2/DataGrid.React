# Demos q-z Comment Migration

本文件汇总 `src/demos` 直接子文件中 `q-z` 范围内被迁移出源码的实质性说明注释。源码仅保留局部必要注释；较长的设计说明、兼容性说明、布局阈值说明和 demo 任务说明集中记录于此。

## `src/demos/reset-filter.tsx`

- 双栏 demo 共享同一组 `filteredInfo` / `sortedInfo` 状态；两侧列的 `column.key` 同名，因此任一侧排序或筛选都会同步另一侧。
- 控制条包含 `Bordered`、`Sort age`、`Clear filters`、`Clear filters and sorters`，共同驱动左右两栏。
- 末尾追加 `Status` / `Tag` / `Empty` 三列并非业务列，而是专门用于验证 locale 文案：
  - `Status` 验证 `filterSearchPlaceholder`
  - `Tag` 验证 `filterCheckAll`
  - `Empty` 验证 `filterEmptyText`
- 左栏传中文 locale，右栏保持 antd 默认英文，用于对照 `filterConfirm`、`filterReset`、`filterSearchPlaceholder`、`filterCheckAll`、`filterEmptyText`。
- 已知现象：筛选触发时 `onChange` 的 `sorter` 可能不完整，data-grid 与 antd 表现一致，这里不额外修补。
- `SplitDemo minPaneWidth=480` 用于让这类窄表在常见桌面宽度下横排，窄视口下自动竖排。

## `src/demos/reset-filter.dg.tsx`

- 左栏完全受控：`filteredInfo` / `sortedInfo` 是唯一真理源，子组件不保留内部筛选或排序状态。
- `Status` / `Tag` / `Empty` 是 locale 验证列，不属于 reset-filter 主流程。
- 虚拟化开启时，data-grid 采用 `scroll={{ y: true }}`，依赖 `SplitDemo` 提供的受限高度。

## `src/demos/reset-filter.antd.tsx`

- 右栏保留 antd 的受控筛选和排序实现，与左栏使用同一份外部状态。
- 虚拟化开启时，antd 侧使用数字 `scroll.y`，这里取 `280` 以适配当前 pane 高度与表头/分页占位。

## `src/demos/resizable.tsx`

- 这是一个特例 demo：左栏演示 data-grid 的列宽拖拽，右栏没有 antd 原生对等实现。
- 控制条中的 `columnResizeMode`、`minWidth`、`maxWidth` 只作用于左栏。
- `SplitDemo minPaneWidth=480` 的说明属于布局信息，已从源码迁出。

## `src/demos/resizable.dg.tsx`

- 左栏使用 `columnResizeMode`、`resizableMinWidth`、`resizableMaxWidth` 演示 data-grid 自身的列宽拖拽能力。
- 未声明 `width` 的列按内容宽度布局；首次拖拽后会转为受控像素宽度。
- `Tags` 列使用本地 `InlineTag`，原因是左栏刻意不依赖 antd 的 `Tag` 组件，只保持视觉对齐。
- 虚拟化开启时，data-grid 侧用 `scroll={{ y: true }}`。

## `src/demos/resizable.antd.tsx`

- antd 6.4.4 `Table` 没有原生列宽拖拽能力，因此右栏只提供静态基线表格和说明区。
- 这里明确不引入 `react-resizable` 等社区封装，以保持“右栏只展示 antd 原生能力”的对照原则。
- 虚拟化开启时，右栏使用 `scroll={{ y: 340 }}` 作为静态基线的可滚动高度。

## `src/demos/row-selection.tsx`

- 左右两栏共享 `selectionType` 与 `selectedKeys`。
- 切换 `checkbox` / `radio` 时会主动清空 `selectedKeys`，避免从多选切到单选后残留无效选择。
- 文档化差异点：
  - 左栏 demo 内类型切换控件是最小原生实现，右栏使用 antd `Radio.Group`
  - 左栏用普通分隔线样式替代 antd `Divider`
  - data-grid 的 `rowSelection.onChange` 带第三个 `info` 参数，antd 只有前两个

## `src/demos/row-selection-fixed.tsx`

- 此 demo 用于对照“选择列 fixed 是否继承邻列 fixed”。
- 共享控制条包含：
  - `selectionType`
  - `firstColFixed`
  - `rowSelection.fixed`
- `rowSelection.fixed='auto'` 表示不显式传值，而是走引擎或 antd 的邻列继承逻辑。
- data-grid 使用 `start/end`，antd 使用 `left/right`，视觉效果等价，但命名体系不同。
- `SplitDemo minPaneWidth=520` 属于宽表布局阈值说明，已迁出源码。

## `src/demos/row-selection-fixed.dg.tsx`

- 左栏显式使用 `start/end` 逻辑方向值。
- 开启虚拟化时，在 `scroll.x=1200` 基础上叠加 `y: true`，不改变 fixed 继承行为。

## `src/demos/row-selection-fixed.antd.tsx`

- `selFixed` 从控制条传入后映射为 antd 原生的 `left/right/undefined`。
- 虚拟化开启时，在 `scroll.x=1200` 基础上叠加 `y: 300`。

## `src/demos/row-selection-custom.tsx`

- 共享 `selectedRowKeys` 同时驱动左右两栏的 selections 菜单和页面下方可视化区。
- 页面下方的 `selectedRowKeys` 展示区是为双栏对照额外加入的验证辅助，不是 antd 原 demo 的一部分。
- 左栏默认不分页，右栏显式 `pagination={false}`；这样两侧都维持 46 行全显。
- `SplitDemo minPaneWidth=480` 用于让这类四列表格在常见桌面宽度下横排，较窄视口自动竖排。

## `src/demos/row-selection-custom.dg.tsx`

- 左栏的 `SELECTION_ALL` / `INVERT` / `NONE` 是 data-grid 对齐 antd 语义的引擎常量。
- odd/even 自定义项保持与 antd demo 相同的筛选逻辑。

## `src/demos/row-selection-custom.antd.tsx`

- 右栏忠实保留 antd demo 的 selections 数组结构，并叠加受控 `selectedRowKeys`。

## `src/demos/sticky.tsx`

- 原始 antd sticky demo 依赖页面滚动；当前 app-shell 场景改造为“容器内固定表头”。
- 左栏使用 `scroll.y: true` 且要求外层容器给定高度；右栏使用数字 `scroll.y`。
- 共享 `Summary Fixed` 开关同时作用于两侧 summary，但两侧 fixed 取值不同：
  - data-grid: boolean，固定到底部
  - antd: `'top' | 'bottom'`
- 本 demo 明确不接入全局虚拟化开关，避免干扰 sticky 对照。
- `SplitDemo minPaneWidth=900` 是为了让宽表在普通视口下默认竖排，避免半宽下横向滚动过重。

## `src/demos/sticky.dg.tsx`

- 左栏的容器内固定表头依赖外层 `height: 500` 和 `scroll={{ x: 1500, y: true }}`。
- 这里保留 `pagination={{}}` 是为了和右栏默认分页条在存在性上对齐。

## `src/demos/sticky.antd.tsx`

- 右栏保留官方 sticky demo 的列结构和 summary 内容，但弃用页面级 `sticky`，改为容器内滚动。
- antd 侧使用 `scroll={{ x: 1500, y: 400 }}`，不需要像 data-grid 一样依赖外层固定高度。

## `src/demos/summary.tsx`

- demo 分为两个互相独立的示例：
  - 示例 1：汇总计算
  - 示例 2：`Table.Summary fixed`
- 开启虚拟化时：
  - 示例 1 两侧都补 `scroll.y`
  - 示例 2 保留各自原有 `scroll`，只额外开启 `virtual`
- 两组 `SplitDemo minPaneWidth=600` 是布局说明，已迁出源码。
- 原来的大段说明区内容属于设计对照文档，不再放在源码注释里。

## `src/demos/summary.dg.tsx`

- 左栏示例 1 使用 `summary(pageData)` 做总计。
- 左栏示例 2 依赖外层 `height: 550` 和 `scroll.y: true` 来实现固定底部 summary。
- data-grid summary 的定位方式依赖 `index` 与 `colSpan`，因为其内部不是原生 `tfoot` 结构；详见 `docs/design-notes/summary.md`。

## `src/demos/summary.antd.tsx`

- 右栏示例 2 保留官方 `scroll.y: 500`。
- 开启虚拟化时，示例 2 只加 `virtual`，不改原有 `scroll`。

## `src/demos/semantic-dom.tsx`

- 该 demo 的核心对照包含三部分：
  - 13 槽位 `classNames/styles`
  - a11y 属性兼容矩阵
  - `Age` 列排序带来的 `aria-sort` 变化
- data-grid 的结构是 `div + CSS Grid`，没有原生 `table/thead/tbody/tr` 层级，因此不可能完整等价于原生表格语义，这个架构限制不再写成长注释放在源码顶部。
- 完整兼容矩阵以 `docs/semantic-dom-compat.md` 为主，demo 内只保留必要的数据常量与展示代码。
- 本 demo 不接入全局虚拟化，避免影响 DOM 检视。

## `src/demos/semantic-dom.dg.tsx`

- `header.wrapper` / `body.wrapper` 在 data-grid 渲染层没有对应 DOM，因此 class/style 会被忽略，这是刻意保留的差异面。
- `header.row` / `body.row` 的样式会下沉到该行的多个 cell，而不是作用于真实 `<tr>`。

## `src/demos/semantic-dom.antd.tsx`

- antd 侧有真实 `thead/tbody/tr` 容器，因此 13 槽位都能映射到实际 DOM。

## `src/demos/registry.ts`

- demo portal 使用自建 hash 路由而不是 `react-router`，保持 demo 壳层依赖最小。
- 路由约定只有两类：`#/` 对应 demo 列表首页，`#/demos/<name>` 对应单个 demo。
- `DemoMeta.compare` 是显式 opt-in 标记，只影响列表页和侧栏里的“对比”展示。
- `groupByCategory` 按注册表里的首次出现顺序分组，供首页卡片区和侧栏菜单复用同一排序。

## `responsive`

来源：
- `src/demos/responsive.tsx`
- `src/demos/responsive.dg.tsx`
- `src/demos/responsive.antd.tsx`

说明：
- 该 demo 对照复刻 antd `responsive` 示例，核心是 `column.responsive` 在 `md` / `lg` 断点上的列显隐。
- `Name` 始终显示，`Age` 仅在 `md` 及以上显示，`Address` 仅在 `lg` 及以上显示。
- 顶部断点文字只用于展示当前 `Grid.useBreakpoint()` 结果；真正的列显隐仍由两侧表格各自内部订阅同一套 antd breakpoint 语义。
- 左栏显式传 `pagination={{}}`，是为了补齐 data-grid 默认不分页与 antd 默认渲染分页条之间的产品默认差异。
- 开启虚拟化时，data-grid 使用 `scroll.y: true` 继承 pane 高度，antd 使用数字 `scroll.y`。

## `row-selection-and-operation`

来源：
- `src/demos/row-selection-and-operation.tsx`
- `src/demos/row-selection-and-operation.dg.tsx`
- `src/demos/row-selection-and-operation.antd.tsx`

说明：
- 该 demo 对照复刻 antd `row-selection-and-operation` 示例。
- 根组件把 `selectedRowKeys` 和 `loading` 提升为共享状态，使顶部 `Reload` 与 `Selected N items` 同时驱动左右两栏。
- `Reload` 的行为保持为示例级模拟：按钮进入 `loading`，一秒后清空共享选择态。
- 左栏 data-grid 通过默认“不分页”达到 46 行全显；右栏显式 `pagination={false}` 来对齐这一可见行数。
- `SplitDemo minPaneWidth=480` 用于让这类 4 列窄表在常见桌面宽度下横排，较窄视口自动竖排。

## `row-selection-custom-debug`

来源：
- `src/demos/row-selection-custom-debug.tsx`
- `src/demos/row-selection-custom-debug.dg.tsx`
- `src/demos/row-selection-custom-debug.antd.tsx`

说明：
- 该 demo 对照复刻 antd `row-selection-custom-debug` 示例，核心是 `rowSelection.renderCell` 同时返回自定义勾选格内容和 `rowSpan`。
- 两侧都使用同一条合并规则：偶数索引行 `rowSpan=2`，奇数索引行 `rowSpan=0`，并渲染 `"{checked}: {node}"`。
- data-grid 侧需要把 `props.rowSpan` 接到自身的 `cellMerge` 链路，因为渲染层不是原生 `<td rowSpan>`。
- 该 demo 仍保留“rowSpan 与虚拟滚动并存属于已知简化”的背景说明，当前不额外修补。
- `SplitDemo minPaneWidth=480` 用于让单列加选择列的窄表在常见桌面宽度下横排。

## `size`

来源：
- `src/demos/size.tsx`
- `src/demos/size.dg.tsx`
- `src/demos/size.antd.tsx`

说明：
- 该 demo 对照复刻 antd `size` 示例，但把原来的静态多表展示改成共享 `Segmented` 的单表切换，便于双栏逐档比较。
- 共享 size 取值是 `'large' | 'medium' | 'small'`；这里的 `medium` 作为两侧共同的中档拼写使用。

## `style-class`

来源：
- `src/demos/style-class.tsx`
- `src/demos/style-class.dg.tsx`
- `src/demos/style-class.antd.tsx`

说明：
- 该 demo 对照 `classNames` / `styles` 在多个表格槽位上的注入效果，每一栏都同时展示“对象 styles”与“函数 stylesFn”两张表。
- 深色主题样式与 antd 官方 `style-class` 示例保持对齐；共享根类名 `.dg-style-class-root` 的 CSS 预定义在 `src/table/style/table.css`。
- 右栏改用 antd v6 原生 `classNames` / `styles`，不再依赖 `antd-style` 的 `createStaticStyles`。
- data-grid 没有真实 `thead/tbody/tr` 包装层，因此行级 class/style 会下沉到该行的多个单元格，而不是作用于真实 `<tr>`。
- data-grid 当前没有对齐 antd `pagination.simple` 的配置面，本 demo 左栏只保留 `pageSize: 3`。

## `tree-data`

来源：
- `src/demos/tree-data.tsx`
- `src/demos/tree-data.dg.tsx`
- `src/demos/tree-data.antd.tsx`

说明：
- 该 demo 对照复刻 antd `tree-data` 示例，覆盖树形数据、首列缩进、展开图标与 `checkStrictly` 开关。
- 根组件共享 `checkStrictly`，并以 `false` 作为初值，主动对齐 antd 的“父子联动”默认体验。
- data-grid 自身默认 `checkStrictly=true`，所以本 demo 必须显式把共享 state 传给左栏，避免两侧默认值不一致。
- 左栏显式传 `pagination={{}}`，用于补齐 data-grid 默认不分页与 antd 默认分页之间的差异。
- antd 侧保留 `onSelect` 日志；data-grid 侧只有 `onChange`，这里把它当作等价观察点。

## `tree-table-ellipsis`

来源：
- `src/demos/tree-table-ellipsis.tsx`
- `src/demos/tree-table-ellipsis.dg.tsx`
- `src/demos/tree-table-ellipsis.antd.tsx`

说明：
- 该 demo 对照复刻 antd `tree-table-ellipsis` 示例，验证树形首列在 `ellipsis + fixed + selection + expandable` 组合下的表现。
- 共享 `Fixed first column` 开关同时驱动左右两栏，默认只固定 `Name` 列，其余列保持非 fixed。
- `Name` 列保持 `width: '30%'` 与 `ellipsis: true`；`Age` 为 `12%`，`Address` 留作剩余宽度列。
- 左栏显式传 `pagination={{}}`，是为了对齐右栏 antd 的默认分页条存在性。
- `SplitDemo minPaneWidth=900` 用于让这类宽树表在常见桌面视口下优先竖排，避免半宽状态下横向滚动过重。

## `tree-table-preserveSelectedRowKeys`

来源：
- `src/demos/tree-table-preserveSelectedRowKeys.tsx`
- `src/demos/tree-table-preserveSelectedRowKeys.dg.tsx`
- `src/demos/tree-table-preserveSelectedRowKeys.antd.tsx`

说明：
- 该 demo 对照复刻 antd `tree-table-preserveSelectedRowKeys` 示例，覆盖树形、分页、`checkStrictly` 与 `preserveSelectedRowKeys` 的组合。
- 根组件共享 `checkStrictly` 与 `preserveSelectedRowKeys` 两个开关，初值分别是 `false` 和 `true`。
- 固定树形数据源下，两侧在 `preserve=true/false` 时的翻页与折叠保留行为一致；源码里原先那段 ajax 数据源差异说明已移到文档。
- antd 侧保留 `onSelect` 日志；data-grid 侧继续使用 `onChange` 作为等价观察点。
- 两侧都使用 `defaultPageSize: 5`，用来覆盖跨页保留与折叠保留两类场景。

## `virtual-list`

来源：
- `src/demos/virtual-list.tsx`
- `src/demos/virtual-list.dg.tsx`
- `src/demos/virtual-list.antd.tsx`

说明：
- 该 demo 对照万行虚拟表、宽表横滚、固定列、展开行和合并单元格的组合场景。
- 它是“强制虚拟” demo：父组件显式 `virtualizable={false}`，左右子组件各自硬编码 `virtual=true` 与固定 `scroll`。
- 顶部控制条共享 `bordered`、`fixed`、`expanded`、`empty`、`count`；左栏额外暴露 `merged` 开关作为 data-grid 专属差异项。
- 父组件同时持有 data-grid / antd 两侧 ref，用于演示 `scrollTo` 的同步滚动；`Scroll To key 50` 则只作用于左栏。
- 合并版列定义保持同一套规则：`Group` 列按 `id % 4 === 0` 做 `rowSpan=4`，`Age` 列把同一批行的 `Address 1` 吃掉形成 `colSpan=2`。
- antd 官方示例里 `FirstName` 标题原本有 `FistName` 笔误；当前双栏实现统一改成正确拼写，避免把标题拼写差异混入对照。
- `SplitDemo minPaneWidth=1000` 用于让这类 `scroll.x=2000` 的宽表在常规桌面视口下优先竖排。

## `src/demos/VirtualizationContext.tsx`

- 这是 demo 层的全局虚拟化开关 store，不是表格引擎本身的通用运行时配置。
- 顶栏 `Virtual` 开关是单一真理源，只驱动那些显式接入的“非强制虚拟” demo。
- 开关打开后，接入 demo 的左右两栏都会收到 `virtual`，同时 `SplitDemo` 会把 pane body 约束到可滚动高度，让 `scroll.y: true` 真正生效。
- `virtual-list`、`drag-virtual-list` 这类自管虚拟化的 demo，以及 `sticky` 这类与虚拟滚动祖先冲突的 demo，不受这个上下文影响。
- `VirtualizationProvider` 与 `ThemeProvider` 独立，只要求 `useVirtualization()` 必须运行在 provider 内。
