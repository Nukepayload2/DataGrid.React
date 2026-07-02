# 已知限制

本页只保留仍有长期价值的限制、兼容缺口和视觉对齐遗留项，不记录任务批次或会话过程。
能通过局部 API 适配补齐的项目不再描述为架构限制，而归入“可实施兼容 backlog”。

## 架构边界

- semantic DOM 不能完整复刻原生 `thead` / `tbody` / `tr` 层级；`header.wrapper`、`body.wrapper` 和完整 row role 结构没有对应 DOM。
- `scroll.y` 只支持 data-grid 的“数据区模式”语义，不支持 antd 的 `number|string` `max-height` 语义。
- `render` 返回 `RenderedCell` 对象并在其中携带 `rowSpan` / `colSpan` 的 antd 形态未对齐，合并统一走 `onCell`。

## 兼容缺口

- `rowSelection` 仍有一部分 antd 字段未实现，例如 `columnTitle`、`onCell`、`getTitleCheckboxProps`、`onSelectMultiple`。
- `expandable` 仍缺少部分字段，例如 `columnTitle` 和 `fixed`。
- `components` 仍缺少原生表格 wrapper 级槽位和 `body` 函数形态。

## 可实施兼容 backlog

这些项目此前容易被误记为“限制”，但本质上是 API 适配或局部渲染增强，可以按优先级补齐：

- `rowSelection.columnTitle`、`rowSelection.onCell`、`rowSelection.getTitleCheckboxProps`、`rowSelection.onSelectMultiple`。
- `expandable.columnTitle`、`expandable.fixed`。
- `scroll.scrollToFirstRowOnChange`。
- `column.filtered`、`column.sortIcon`、`column.filterResetToDefaultFilteredValue`。
- `filterDropdownProps` 更完整透传。
- `dataIndex` 的 `DeepNamePath` 类型增强。
- `sticky.offsetSummary`。

以下项目能做，但需要先确认设计取舍或回归范围：

- `scroll.y = number|string` 的 antd max-height 语义：可以和当前 `scroll.y: true` 的数据区模式并存，但需要明确优先级。
- pagination 默认开启：可以对齐 antd 默认 10/页，但会改变现有不传 `pagination` 的默认行为。
- RTL：可实现，但需要系统性处理 fixed、sticky、滚动条、拖拽方向和阴影方向。
- `components.header.row`、`components.body.wrapper`、`components.body` 函数形态：可提供 data-grid 语义下的适配，但不能等价替换原生 table DOM。

## 已实现，不再作为限制

- `locale` 已接入 antd `useLocale('Table')`：`TableProps.locale` 覆盖 ConfigProvider locale，ConfigProvider locale 覆盖默认英文；FilterDropdown、selection 内置项、排序/展开文案已纳入当前兼容面。
- `rowSelection.onSelect`、`onSelectAll`、`onSelectInvert`、`onSelectNone` 已实现。
- 拖拽相关的 `gridOptions.autoScrollOnDrag`、`gridOptions.columnReorder`、`gridColumnOptions.dragColumnLock`、`gridOptions.multiRowReorder` 已作为当前采用的 data-grid 原生能力记录。

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

## 参考

- [`compat-matrix.md`](compat-matrix.md)
- [`grid-options-namespace.md`](grid-options-namespace.md)
- [`../features/styling/semantic-dom.md`](../features/styling/semantic-dom.md)
