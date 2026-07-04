# 响应式列

`column.responsive` 复用 antd 的断点语义，在不同 breakpoint 下决定列是否参与渲染。

## 基本规则

- `Name` 这类基础列可以始终显示。
- `Age`、`Address` 这类补充列通过 `responsive: ['md']`、`responsive: ['lg']` 控制显示时机。
- 断点状态本身来自与 antd 一致的 breakpoint 体系。

## demo 对照点

- 顶部断点文字只是当前 breakpoint 的可视化，不参与列显隐判定。
- 两侧表格各自消费相同的响应式语义，比较重点是“哪些列消失/恢复”和布局是否稳定。
- data-grid 与 antd 默认都会渲染分页器；若 demo 需要展示全量行，应显式传 `pagination={false}`。

## 相关文档

- 列轨道: [`column-width.md`](column-width.md)
- 整体布局: [`../layout/layout.md`](../layout/layout.md)
- 兼容矩阵: [`../../reference/compat-matrix.md`](../../reference/compat-matrix.md)
