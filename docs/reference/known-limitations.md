# 已知限制

本页只保留仍有长期价值的限制、兼容缺口和视觉对齐遗留项，不记录任务批次或会话过程。

## 架构边界

- semantic DOM 不能完整复刻原生 `thead` / `tbody` / `tr` 层级；`header.wrapper`、`body.wrapper` 和完整 row role 结构没有对应 DOM。
- `scroll.y` 只支持 data-grid 的“数据区模式”语义，不支持 antd 的 `number|string` `max-height` 语义。
- `render` 返回 `RenderedCell` 对象并在其中携带 `rowSpan` / `colSpan` 的 antd 形态未对齐，合并统一走 `onCell`。

## 兼容缺口

- `locale` 当前只完整覆盖表体 `emptyText`；筛选下拉相关 i18n 仍不完整。
- `rowSelection` 仍有一部分 antd 字段未实现，例如 `onSelect`、`columnTitle`、`onCell`、`getTitleCheckboxProps`。
- `expandable` 仍缺少部分字段，例如 `columnTitle` 和 `fixed`。
- `components` 仍缺少原生表格 wrapper 级槽位和 `body` 函数形态。

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
