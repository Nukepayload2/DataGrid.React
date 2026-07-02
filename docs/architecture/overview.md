# 架构总览

data-grid 的目标是用 CSS Grid 重做 antd Table，并保持 antd v6 的 React API 和 token 生态尽量可迁移。

## 系统分层

1. 渲染层: React + CSS Grid，负责列轨道、表头、表体、固定列、合并和虚拟化。
2. 兼容层: 暴露与 antd Table 尽量一致的 `TableProps`、`ColumnType` 和 JSX 子组件 API。
3. 样式层: 复用 antd v6 token 和 CSS variables，保证主题切换、尺寸和交互态尽量一致。
4. demo 站点: 用左右对照的 demo 验证 data-grid 与 antd 官方示例的差异。

## 产品边界

- 表格核心自研: grid 渲染、列树、固定列、合并、虚拟滚动、排序、筛选、选择、展开。
- 非表格核心复用 antd: Pagination、Spin、Tooltip、Dropdown、Empty 及其它通用控件。
- 兼容目标以真实业务和 antd demo 为主，不追求所有历史兼容 API 或无业务价值的调试接口。

## 先读哪些文档

- 渲染原理: [`rendering-model.md`](rendering-model.md)
- demo 站点: [`demo-site.md`](demo-site.md)
- live 编辑链路: [`live-editor.md`](live-editor.md)
- 决策总表: [`../decisions/`](../decisions)
- 兼容现状: [`../reference/compat-matrix.md`](../reference/compat-matrix.md)

## 相关功能文档

- 布局与轨道: [`../features/layout/layout.md`](../features/layout/layout.md), [`../features/columns/column-width.md`](../features/columns/column-width.md)
- 虚拟化: [`../features/scrolling/virtualization.md`](../features/scrolling/virtualization.md)
- 样式和主题: [`../features/styling/theme-tokens.md`](../features/styling/theme-tokens.md)
- 语义化槽位: [`../features/styling/semantic-dom.md`](../features/styling/semantic-dom.md)
