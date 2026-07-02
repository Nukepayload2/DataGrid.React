# 渲染模型

data-grid 使用单一 CSS Grid 容器承载表头和表体单元格，而不是原生 `<table>` / `<thead>` / `<tbody>` 结构。

## 核心结构

- `.dg-wrapper`: 表格外壳，承载标题、页脚、分页和主题变量。
- `.dg-scroll`: 滚动和 sticky 的外层上下文。
- `.dg-grid`: 唯一的 grid 容器；表头格和表体格都直接作为 grid item 铺在这里。
- `.dg-cell-header` / `.dg-cell-body`: 通过 `grid-row` / `grid-column` 显式定位。

## 这样做的原因

- 列轨道可以直接映射为 `grid-template-columns`，更适合列宽、隐藏列和拖拽调宽。
- 固定列、横向 sticky 阴影、summary 和虚拟化可以共享同一套定位模型。
- 多级表头、合并单元格和树形缩进都能落在同一套显式布局里。

## 架构代价

- 没有真实行容器，`header.wrapper` / `body.wrapper` 这类语义槽位没有对应 DOM。
- 无法直接复刻原生表格的 role 层级，semantic DOM 只能做到“槽位和关键 aria 尽量兼容”，不能做到原生结构等价。
- `components.body.cell` / `components.body.row` 需要按 CSS Grid 语义适配，而不是简单替换 `td` / `tr`。

## 与其它能力的关系

- 列宽和隐藏列: [`../features/columns/column-width.md`](../features/columns/column-width.md), [`../features/columns/hidden-column.md`](../features/columns/hidden-column.md)
- 表头、多级分组和合并: [`../features/layout/header-and-span.md`](../features/layout/header-and-span.md)
- 固定列和 sticky: [`../features/columns/fixed-column.md`](../features/columns/fixed-column.md), [`../features/layout/sticky.md`](../features/layout/sticky.md)
- 虚拟化: [`../features/scrolling/virtualization.md`](../features/scrolling/virtualization.md)
- semantic DOM 限制: [`../decisions/0010-semantic-dom-limits.md`](../decisions/0010-semantic-dom-limits.md)
