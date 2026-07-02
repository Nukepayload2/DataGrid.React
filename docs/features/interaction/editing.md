# 编辑

编辑能力分成两类: 单元格编辑和行编辑。

## 单元格编辑

- `edit-cell` 对照 antd 官方的单元格级编辑、增行和删行。
- 左右两栏各自维护编辑态，避免交叉污染。
- data-grid 通过 `components.body.row` / `components.body.cell` 适配无 `tr` / `td` 的渲染层。

## 行编辑

- `edit-row` 保留单行编辑、保存、取消和分页的基本约束。
- 左右两侧分别维护 `form`、`editingKey` 和数据源。
- data-grid 的可编辑单元格返回内容节点，真正的 grid 定位仍由表格引擎维护。

## 样式与约束

- 编辑态样式在两侧共享，只注入一次。
- 行编辑和单元格编辑都依赖 components 适配层，而不是直接依赖原生表格 DOM。

## 相关文档

- [`../api/components-and-row-hooks.md`](../api/components-and-row-hooks.md)
- [`../../reference/compat-matrix.md`](../../reference/compat-matrix.md)
