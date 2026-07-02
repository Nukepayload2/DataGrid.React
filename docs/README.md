# data-grid docs

`docs/` 按功能和长期决策组织，不保留任务批次、迁移批次或按字母分组的阅读路径。

## 阅读入口

- [`architecture/overview.md`](architecture/overview.md): 项目目标、分层和文档导航。
- [`features/`](features): 按功能域查看列、布局、滚动、交互、样式和 API 行为。
- [`decisions/0008-api-namespace-separation.md`](decisions/0008-api-namespace-separation.md): 了解兼容 API 与 data-grid 专属 API 的分层原则。
- [`reference/compat-matrix.md`](reference/compat-matrix.md): data-grid 与 antd Table 的 API 兼容矩阵。
- [`reference/known-limitations.md`](reference/known-limitations.md): 当前确认的架构边界、兼容缺口和视觉对齐遗留项。
- [`contributing/documentation-style.md`](contributing/documentation-style.md): 文档写法、源码注释迁移和目录落点约定。

## 目录

- [`architecture/`](architecture): 架构总览、渲染模型、demo 站点和 live editor。
- [`decisions/`](decisions): 关键设计决策 ADR。
- [`features/`](features): 按功能域拆分的说明文档。
- [`reference/`](reference): 兼容矩阵、命名空间策略、外部能力借鉴和限制清单。
- [`contributing/`](contributing): 文档维护和验证约定。

## 功能分组

- [`features/columns/`](features/columns): 列宽、固定列、隐藏列、响应式列、列默认值。
- [`features/layout/`](features/layout): 整体布局、表头与合并、行高、边框、sticky、summary。
- [`features/scrolling/`](features/scrolling): 滚动条与虚拟化。
- [`features/interaction/`](features/interaction): 选择、展开、树形、筛选排序、分页与数据、拖拽、编辑。
- [`features/display/`](features/display): ellipsis、空态与 loading。
- [`features/styling/`](features/styling): theme tokens、semantic DOM。
- [`features/api/`](features/api): JSX API、components 和行级钩子。

## 使用约定

- 设计思想和重要取舍进入 [`decisions/`](decisions)。
- 功能行为、差异和源码落点进入对应的 [`features/`](features) 文档。
- 兼容边界、命名空间策略和外部参考进入 [`reference/`](reference)。
- 中间任务过程、迁移批次说明、交接清单和会话进度不再作为主文档保留。
