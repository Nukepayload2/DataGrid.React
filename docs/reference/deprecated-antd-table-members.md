# 过时 antd Table 成员兼容说明

本文只记录当前源码中对 antd Table 过时成员、旧写法和容易误判的历史兼容入口的处理。全量 API 支持度仍以 [compat-matrix.md](compat-matrix.md) 为准。

## 判定原则

- data-grid 的主目标是兼容 antd v6 当前公共 API。
- 已被 antd/rc-table 标记为 deprecated 的成员只作为迁移兼容保留，不建议新代码继续使用。
- 旧成员如果依赖原生 `table/tr/td` DOM，data-grid 会优先保留语义；不能保留的 DOM 细节会明确降级或忽略。
- data-grid 专属旧写法不算 antd deprecated 成员，单独列在本文末尾，避免迁移时混淆。

## 已兼容但不推荐继续使用

| 成员 | 当前支持 | data-grid 行为 | 建议迁移 |
|---|---|---|---|
| `column.render` 返回 `{ children, props }` | 部分兼容 | 识别 legacy `RenderedCell` 对象，但只消费 `children`。`props` 不会合并到单元格。 | 返回普通 `ReactNode`；合并格用 `column.onCell` 返回 `colSpan`/`rowSpan`；样式、事件和自定义内容优先用 `column.className`/`column.style`、`onRow`、`components.body.cell`。 |
| `RenderedCell.props` | 保留类型但忽略 | 类型上仍存在 `props?: Record<string, any>`，运行时 `normalizeRenderedCell` 直接丢弃它。 | 不要依赖 `render` 返回对象里的 `props`。 |
| `rowSelection.onSelectMultiple` | 兼容触发 | antd v6 已标记 deprecated；data-grid 在 shift range 多选方法为 `multiple` 时仍调用它，参数为 `(selected, selectedRows, changeRows)`。 | 新逻辑优先监听 `rowSelection.onChange` 并读取 `info.type`。保留 `onSelectMultiple` 只用于迁移旧代码。 |
| `expandable.expandedRowOffset` | 兼容支持 | 作为展开内容起始列偏移处理：传 `N` 时从第 `N + 1` 个叶子列开始跨到表尾。非法、负数、越界值会被 clamp。 | 用 `Table.EXPAND_COLUMN` 在 `columns` 中控制展开列位置，不再用 offset 调整展开内容布局。 |
| `locale.filterCheckall` | 兼容别名 | 小写 `all` 的旧别名仍被读取，优先级是 `filterCheckall ?? filterCheckAll ?? 默认文案`。 | 改用 `locale.filterCheckAll`。 |
| `column.fixed: true` | 旧写法兼容 | 归一化为左固定，即内部 `start`。 | 明确写 `fixed: 'left'` / `fixed: 'start'` 或 `fixed: 'right'` / `fixed: 'end'`。 |

## 未作为旧字段暴露

| 成员 | 当前状态 | 替代方式 |
|---|---|---|
| `column.filterDropdownOpen` | 当前源码未暴露该旧字段。 | 使用 `column.filterDropdownProps.open`。 |
| `column.onFilterDropdownOpenChange` | 当前源码未暴露该旧字段。 | 使用 `column.filterDropdownProps.onOpenChange`。 |

## 相关兼容限制

### `render` 对象形态只保留内容

antd/rc-table 曾允许：

```tsx
render: () => ({
  children: 'Total',
  props: { colSpan: 2, className: 'total-cell' },
})
```

data-grid 只会渲染 `children`。`props.colSpan`、`props.rowSpan`、`className`、`style`、事件等都不会生效。原因是这个对象形态本身已被 rc-table 提醒有性能风险，data-grid 将合并与单元格 props 注入统一收敛到 `onCell`。

迁移写法：

```tsx
{
  dataIndex: 'name',
  render: (value) => value,
  onCell: (record) => record.summary ? { colSpan: 2, className: 'total-cell' } : undefined,
}
```

### `onSelectMultiple` 只表达旧回调语义

data-grid 仍在连续多选时触发 `onSelectMultiple`，但它不是推荐状态源。选择状态的主链路是：

- `rowSelection.selectedRowKeys` / `defaultSelectedRowKeys`
- `rowSelection.onChange(selectedRowKeys, selectedRows, info)`
- data-grid 专属 `gridOptions.selection`（需要业务 value 选择模型时）

如果业务只想知道是否发生连续多选，读取 `onChange` 的 `info.type === 'multiple'` 更稳定。

### `expandedRowOffset` 是布局偏移，不是展开列定位

`expandedRowOffset` 只影响展开内容跨列起点，不改变展开图标列位置。data-grid 会把它转换为 grid column 起始线，越界值最多 clamp 到最后一个叶子列之前。

需要控制展开图标列的位置时，使用 antd v6 推荐的哨兵列：

```tsx
columns={[
  { dataIndex: 'name', title: 'Name' },
  Table.EXPAND_COLUMN,
  { dataIndex: 'status', title: 'Status' },
]}
```

## CSS Grid DOM 差异

过时 API 中最容易迁移失败的是依赖原生表格节点的旧写法。data-grid 没有真实 `table/tr/td` 行列层级，表格主体由 CSS Grid 的 div 节点渲染：

- `onRow` / `onHeaderRow` 表达行级 props 意图，实际会分发到同一逻辑行的 grid cells 或行包装层。
- `components.body.cell` 替换的是单元格内容层，不是整个 `td`。
- `column.className` / `column.style` 合并到 data-grid cell div，不是原生 `td` / `th`。
- 依赖 `tbody > tr > td` 的选择器需要迁移到 `.dg-*` 或已输出的 `.ant-table-*` alias。

这类差异不是 deprecated 成员本身造成的，但旧代码常把 `RenderedCell.props`、`onRow`、DOM 选择器混在一起使用，迁移时需要同时检查。

## 非 antd deprecated 但容易混淆

| 写法 | 当前状态 | 说明 |
|---|---|---|
| `scroll={{ y: number }}` / `scroll={{ y: string }}` | 不支持 | antd/rc-table 支持 `scroll.y` max-height 语义；data-grid 的 `scroll.y` 类型只接受 `true`，表示启用容器内纵向滚动和 sticky 表头。需要限高时由外层容器控制。 |
| `size="compact"` | 兼容 data-grid 旧入口 | antd Table 本身没有 `compact` size。data-grid 保留该值用于全局 size 兜底，并映射为 `small` 视觉。 |

## 源码与测试落点

| 主题 | 源码 | 测试 |
|---|---|---|
| `RenderedCell` 类型与 `props` 忽略 | [src/table/compat/column.ts](../../src/table/compat/column.ts), [src/table/engine/cellRenderUtils.tsx](../../src/table/engine/cellRenderUtils.tsx) | [tests/table/engine/body/cellRenderUtils.tsx](../../tests/table/engine/body/cellRenderUtils.tsx), [tests/table/engine/body/bodyCellUtils.ts](../../tests/table/engine/body/bodyCellUtils.ts), [tests/table/engine/body/cellMerge.ts](../../tests/table/engine/body/cellMerge.ts) |
| `rowSelection.onSelectMultiple` | [src/table/compat/selection.ts](../../src/table/compat/selection.ts), [src/table/useSelectionAdapter.ts](../../src/table/useSelectionAdapter.ts) | [tests/table/api/Table.public-api.tsx](../../tests/table/api/Table.public-api.tsx), [tests/table/selection/useSelectionAdapter.ts](../../tests/table/selection/useSelectionAdapter.ts) |
| `expandable.expandedRowOffset` | [src/table/compat/expand.ts](../../src/table/compat/expand.ts), [src/table/Table.tsx](../../src/table/Table.tsx), [src/table/engine/expandLayerUtils.tsx](../../src/table/engine/expandLayerUtils.tsx) | [tests/table/engine/body/BodyGrid.tsx](../../tests/table/engine/body/BodyGrid.tsx), [tests/table/engine/expand/expandLayerUtils.ts](../../tests/table/engine/expand/expandLayerUtils.ts) |
| `locale.filterCheckall` | [src/table/compat/locale.ts](../../src/table/compat/locale.ts), [src/table/engine/FilterDropdown.tsx](../../src/table/engine/FilterDropdown.tsx) | 当前未看到专项测试。 |
| `fixed: true` | [src/table/columnAdapter.ts](../../src/table/columnAdapter.ts) | 固定列与列树测试间接覆盖。 |
| `size="compact"` | [src/table/compat/size.ts](../../src/table/compat/size.ts), [src/table/Table.tsx](../../src/table/Table.tsx), [src/table/paginationAdapter.tsx](../../src/table/paginationAdapter.tsx) | [tests/table/pagination/paginationAdapter.ts](../../tests/table/pagination/paginationAdapter.ts) |
