# components 与行级钩子

这一组 API 是 data-grid 最容易出现“同名但语义适配”的位置。

## `components.body.cell`

- antd: 替换整个 `td`
- data-grid: 替换 `.dg-cell-inner` 里的内容节点

原因是 grid item、定位样式和 sticky 逻辑仍必须由引擎统一维护。

## `components.body.row`

- antd: 替换 `tr`
- data-grid: 提供行级包装能力，常见用法是 Context、Form 或编辑态注入

在 CSS Grid 路径下，单元格仍直接铺在 `.dg-grid` 上，行包装只是逻辑边界，不是原生行容器。

## `onRow` / `onHeaderRow` / `rowClassName`

- 这三类钩子仍然是行级扩展入口。
- 由于没有真实 `tr`，className 和 style 需要分发到行内多个 cell，或者挂到行包装层。
- 调用方应把它们理解为“行级行为和样式意图”，而不是直接操作原生表格节点。

## 典型场景

- `edit-cell` / `edit-row` 的 Form 适配
- 选择、展开、hover 和禁用态的行级样式
- 自定义上下文注入

## 相关文档

- [`jsx-api.md`](jsx-api.md)
- [`../interaction/editing.md`](../interaction/editing.md)
- [`../../reference/compat-matrix.md`](../../reference/compat-matrix.md)
