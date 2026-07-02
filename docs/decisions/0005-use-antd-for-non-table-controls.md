# 0005 use antd for non-table controls

## Title

非表格核心控件直接复用 antd

## Status

Accepted

## Context

项目的核心价值在于重做 Table/rc-table，而不是复刻整套通用 UI 组件。若把 Pagination、Spin、Tooltip、Dropdown、Empty 等通用控件一并自研，会显著扩大维护面并弱化与 antd 主题的一致性。

## Decision

- 表格核心自研。
- 非表格核心控件直接复用 antd。
- 只在需要接轨 antd 主题或交互时，为这些控件提供最小包装层或布局容器。

## Consequences

- 主题和视觉一致性更容易保持。
- 部分功能文档需要同时说明“表格核心行为”和“复用 antd 控件的承载方式”。
- 兼容讨论应把“核心能力差异”和“外围控件差异”区分开。

## Related docs

- [`../features/interaction/pagination-and-data.md`](../features/interaction/pagination-and-data.md)
- [`../features/display/empty-loading.md`](../features/display/empty-loading.md)
- [`../features/interaction/selection.md`](../features/interaction/selection.md)
