# Row-major DOM order plan

本文记录 data-grid 为修复原生文字横向选择行为而调整单元格 DOM 顺序的计划。

## 背景

data-grid 依赖 CSS Grid 渲染表格。视觉位置由 `gridColumn` / `gridRow` 或 `grid-auto-flow` 决定，DOM 顺序不一定等于视觉顺序。

当前部分渲染路径是 column-major DOM：

```text
col0 header
col0 row0
col0 row1
col1 header
col1 row0
col1 row1
```

浏览器原生文字选择按 DOM 文本流工作，不按 CSS Grid 的视觉行列顺序工作。因此用户横向拖选一行时，选区会穿过 DOM 中间的整列内容，表现为“想选一行，实际选中中间几列的多行文字”。

## 目标

- 让普通横向文字选择按视觉行顺序工作。
- 将表体 DOM 顺序调整为 row-major：

```text
row0 col0
row0 col1
row0 col2
row1 col0
row1 col1
row1 col2
```

- 保留 CSS Grid 布局模型，不改成 `<table>`。
- 保留固定列、sticky、列宽拖拽、合并、展开、summary、虚拟滚动等现有能力。
- 对 recycling 模式采用最小 DOM 移动策略，避免在每个 scrollTop 更新里无差别重排全部可见 cell。

## 非目标

- 不实现 Excel 风格自定义单元格框选。
- 不禁用原生文本选择作为主要方案。
- 不把所有表格重写成真实 table DOM。
- 不在第一步改变数据选择 `rowSelection` / `gridOptions.selection` 的语义。

## 当前路径判断

### flat 快速路径

位置：`src/table/engine/GridTable.tsx` + `src/table/engine/FlatColumnCells.tsx`

触发条件：单层表头，且无合并、虚拟、展开、树形、summary、empty、`components.body.row`。

现状：

- `GridTable` 按 `leafColumns.map(...)` 渲染 `ColumnCells`。
- `ColumnCells` 输出“一列表头 + 这一列所有数据格”。
- `useGridLayout` 在 flat 模式下设置 `grid-auto-flow: column`。
- DOM 顺序 column-major，视觉靠 auto-flow 成表。

结论：

- 不能只把 `grid-auto-flow: column` 改成 `row`，否则视觉布局会错。
- 推荐将 flat 迁到显式 grid 定位，和 multi 路径使用同一类布局模型。

### multi / standard virtual 路径

位置：`src/table/engine/BodyGrid.tsx`

现状：

- `BodyRow` 存在时已经 row-major。
- 无 `BodyRow` 时默认 column-major，注释说明是为了性能略优。
- 每个 `BodyCell` 已显式设置 `gridColumn` / `gridRow`。

结论：

- 这是最低风险改动点。
- 默认分支可以直接改成 row-major，不影响视觉布局。

### recycling 路径

位置：`src/table/engine/RecyclingBodyGrid.tsx`

现状：

- 外层遍历列，内层遍历行。
- 新 cell 创建时 `grid.appendChild(outer)`。
- 释放 cell 时会从 DOM detach 并放回 pool。
- 滚动时 `useVirtualList` 会更新 `virtualState`，当前 effect 依赖整个 `virtualState` 对象。

结论：

- recycling 也可以维护 row-major DOM 顺序。
- 不应在每次 scrollTop 更新时无条件移动所有 cell。
- 应根据可见行列窗口变化维护顺序，或在 effect 中做最小移动。

## 实施计划

### 阶段 1：multi 默认改 row-major

改动：

- 在 `renderBodyCells` 中删除无 `BodyRow` 时的 column-major 默认分支。
- 统一按行遍历，再按列遍历。
- 继续跳过被 `colSpan` / `rowSpan` 覆盖的 cell。
- 保持 `BodyRow` 分支行为不变。

验证：

- 普通多级表头 demo。
- 合并单元格 demo。
- 展开行 demo。
- summary demo。
- sticky demo。
- 浏览器手动横向拖选文本，确认选择顺序按行。

### 阶段 2：flat 改显式定位 + row-major

改动方向：

- 停止依赖 `grid-auto-flow: column`。
- flat 表头 cell 显式设置：

```ts
gridColumn: colIdx + 1
gridRow: 1
```

- flat 表体 cell 显式设置：

```ts
gridColumn: colIdx + 1
gridRow: showHeader ? index + 2 : index + 1
```

- 输出 DOM 顺序改为：

```text
headers row, then body rows
```

或者：

```text
row0 cells, row1 cells...
```

其中 header 最好保持在 body 前，保证表头阅读顺序稳定。

实现选择：

- 方案 A：新增 `FlatRowCells` / `renderFlatCells`，逐行输出显式定位 cell。
- 方案 B：让 flat 直接走 multi 的表头/表体显式定位路径，但仍避免不需要的合并/展开/summary 计算。

推荐先做方案 A，改动边界更小。

验证：

- basic demo。
- head demo。
- fixed header demo。
- fixed columns demo。
- column resize demo。
- filter/sorter demo。
- 横向文字选择。

### 阶段 3：recycling 维护 row-major DOM 顺序

改动：

- 将 `RecyclingBodyGrid` 的目标遍历改为 row-major：

```ts
for row in visibleRows:
  for col in leafColumns:
    ensure cell
    patch cell
    desiredOrder.push(cell.outer)
```

- 在 patch 完成后维护 DOM 顺序。
- 不要无条件 `appendChild` 每个 active cell。
- 使用最小移动：

```ts
let cursor = firstExpectedBodyNode
for (const node of desiredOrder) {
  if (node !== cursor) {
    grid.insertBefore(node, cursor)
  }
  cursor = node.nextSibling
}
```

注意：

- `insertBefore(existingNode, cursor)` 会移动已有节点，不会复制节点。
- 向下连续滚动时，新底部行通常自然 append；向上滚动时，新顶部行需要插到前面。
- 跳转滚动、列重排、响应式列变化需要一次性修正顺序。

优化：

- 跟踪上一次 order key：

```text
start/end + visible row identities + column identities
```

- 只有 order key 变化才做顺序维护。
- `scrollTop` 变化但 start/end 与行列集合未变时，只 patch 位置/内容，不移动 DOM。

验证：

- `#/demos/virtual-list-recycling`。
- 快速连续滚动帧率。
- 横向文字选择。
- 固定列 + recycling。
- `renderCellElement` 与 `renderCellReact` 两条路径。
- 列拖拽、行拖拽、hover、selection 样式。

### 阶段 4：测试与文档

自动化建议：

- 增加一个 DOM 顺序单测或 jsdom 渲染测试，断言 body cell 的 `[data-row-index]` 顺序为 row-major。
- 增加 recycling order utility 的纯函数测试。
- 如现有测试栈不足以覆盖真实 selection，可增加 Playwright smoke：
  - 打开 basic/virtual-list-recycling。
  - 用鼠标横向拖选一行文本。
  - 读取 `window.getSelection()?.toString()`，确认不包含下一行文本。

文档更新：

- `docs/architecture/rendering-model.md` 增加 DOM 顺序说明。
- `docs/reference/known-limitations.md` 移除或更新原生文字选择限制。
- 如保留某些模式不支持 row-major，需明确列为限制。

## 风险

- flat 从 auto-flow 改显式定位后，可能影响隐式布局细节，需要重点看列宽、ellipsis、fixed、resize。
- recycling 如果每次 scrollTop 都移动所有 DOM，可能影响高帧率目标；必须避免无条件重排。
- rowSpan / colSpan 下 DOM 顺序不一定等于用户直觉的完整选择矩形，但至少应避免 column-major 穿列问题。
- 展开内容目前在 body cells 后统一渲染；若用户跨展开区域选择文本，可能还需把展开内容跟随对应行输出。

## 推荐执行顺序

1. 先改 `BodyGrid` 默认 row-major，收益大、风险小。
2. 再改 flat，去掉 `grid-auto-flow: column` 依赖。
3. 最后改 recycling，并用性能 trace 对比。
4. 所有阶段都保留 `pnpm tsc`、`pnpm lint`、`pnpm build`，并用浏览器手动验证文字选择。
