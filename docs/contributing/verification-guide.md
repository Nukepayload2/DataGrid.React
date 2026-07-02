# 验证指南

文档里的“已对齐”结论应当来自真实对照，不来自静态猜测。

## 基本流程

1. 读功能文档和对应 demo 源码，先确认要比较的配置是否相同。
2. 打开 compare demo，左右同时观察 data-grid 和 antd。
3. 同时检查静态渲染、交互态和深浅色主题。
4. 发现差异时，先判断是产品决策、架构限制还是实现缺陷，再更新对应文档。

## 必查项

- 列宽、分页、scroll、size、fixed、selection、expand 这类 props 是否真的两侧一致
- 横滚到底、纵滚到底、中间滚动、翻页、排序、筛选、展开、拖拽中的表现
- light / dark 双主题下的边框、背景、滚动条、hover、selected、filter dropdown
- console 是否干净

## 文档更新原则

- 确认是长期边界的，写入 [`../reference/known-limitations.md`](../reference/known-limitations.md) 或 ADR。
- 确认是功能差异的，更新对应 `features/**` 文档。
- 确认是兼容判定变化的，更新 [`../reference/compat-matrix.md`](../reference/compat-matrix.md)。

## 不要把这些内容写回主文档

- 临时截图路径
- 某次会话的实施/验证分工
- “本轮已完成 N/N” 之类过程状态
