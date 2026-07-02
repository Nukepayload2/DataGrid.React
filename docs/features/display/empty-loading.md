# 空态与 loading

空态和 loading 都属于“表格外围表现”，核心控件继续复用 antd。

## 空态的两条通道

1. 表体空态: `locale.emptyText`
2. 筛选下拉空态: `ConfigProvider.renderEmpty('Table.filter')`

`custom-empty` demo 同时保留这两条通道，用来验证 data-grid 不把它们混成同一个占位。

## locale 优先级

data-grid 自研文案统一接入 antd `useLocale('Table')`：

1. `TableProps.locale`
2. `ConfigProvider locale.Table`
3. antd 默认英文

当前已接入：

- 表体空态 `emptyText`
- FilterDropdown 文案
- 自研选择菜单文案
- 排序 hover title
- 展开按钮 aria

## loading

- `loading` 继续复用 antd Spin。
- `ajax` demo 额外验证分页、筛选、排序和 loading 在 mock 查询链路中的组合。
- page size 变化时，demo 会先清空当前页内容再等待下一次查询结果，对齐 antd 官方示例的异步手感。

## 需要注意的兼容边界

- `locale` 类型已对齐 antd TableLocale 子集，但排序 tooltip 仍先用原生 `title`，不是 antd Tooltip。
- `scroll.y: true` 与 Spin 包裹链路的高度关系是已记录的布局限制之一。

## 相关文档

- [`../interaction/pagination-and-data.md`](../interaction/pagination-and-data.md)
- [`../styling/theme-tokens.md`](../styling/theme-tokens.md)
- [`../../reference/known-limitations.md`](../../reference/known-limitations.md)
