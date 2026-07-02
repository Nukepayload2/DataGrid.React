# data-grid 注释与对照说明 cleanup 规范

本规范指导 demo 对照说明 + 代码注释的清理,以及 `docs/design-notes/` 的组织。是批量 cleanup agent 的统一指引。

## 总原则

- 删除**历史叙事**:任务编号(任务#)、决策编号(决策 N / §N)、**阶段性功能代号(M1-M9 / S1-S34 / §11 / C1 / F1 等内部编号)**、返工记录、旧实现对比("之前是 X,现在改为 Y")、时间线、迁移批次说明、"Round N"。代号删除后**保留其后的描述**(如"M6 隐藏列"→"隐藏列")。
- 删除**过时说法**:描述与当前代码行为不符的注释(如"track=max-content"但实际已是 min-content)。
- **有价值的设计说明**(实现取舍的理由、与 antd 的机制差异、特殊情况的成因、易踩的坑)移到 `docs/design-notes/`(按引擎主题聚合),代码里只留**简短标题 + 文件链接**。
- 代码注释只保留"特殊情况"的简要指引,详细推导在 design-notes。

## 对照说明规范(demo 主 `.tsx` 的 SplitDemo children 对照块)

只解释 **data-grid vs antd table 在此 demo 的差异**。每个差异写三要素:

1. **差异行为**:data-grid 与 antd 具体哪里不同(视觉/交互/机制)。
2. **触发条件**:什么输入/状态下出现该差异。
3. **差异原因**:为什么不同(通常因 data-grid 用 CSS Grid 而 antd 用 `<table>`,或某项实现取舍)。

删除:任务/决策编号、拆子文件说明、live 编辑说明、历史对比、"CSS 固有约束非 bug"式自我辩护、验证步骤清单。

## 代码注释规范(demo 子文件 `.dg.tsx`/`.antd.tsx` + engine `src/table/**`)

注释只说明**特殊情况**(非显而易见的实现取舍)。格式:

```ts
// 简短标题 — 详见 docs/design-notes/<topic>.md
```

- 简短标题:一句话点明这是什么特殊情况(如"隐藏列 0fr track 占位")。
- 链接:相对仓库根目录的 design-notes 主题文件路径。
- 详细正文(推导/对比/坑)移到该主题文件对应章节。

删除:任务#、决策#、§11、返工、旧实现对比、过时描述、冗长的 inline 推导(移 design-notes)。

## design-notes 组织(按引擎主题聚合)

一个主题一个 md,文件名 kebab-case。每个文件含多节(各特殊情况),每节:**标题 + 行为 + 原因 + 关联源码文件链接(相对仓库根)**。

主题划分(参考,按需增补):

| 主题文件 | 覆盖范围 |
|---|---|
| column-width.md | 列宽 track(auto/fixed, min/max-content, minmax, width:100%) |
| scrollbar.md | FloatingScrollBar 横纵悬浮条, 原生条消除 |
| virtualization.md | 虚拟滚动 AATree/offsetTree/行测量/FillerRow |
| hidden-column.md | 隐藏列 0fr track + dg-cell-hidden + nowrap 防撑高 |
| row-height.md | 有界行高 minmax/auto, 行测量 |
| fixed-column.md | 固定列 sticky + 边缘阴影 + 偏移 |
| filter-sorter.md | 筛选/排序 UI + 机制 |
| tree-data.md | 树形缩进 + 展开图标 |
| selection.md | 行选择 |
| expand.md | 行展开 |
| bordered.md | bordered 边框 |
| sticky.md | 页面级 sticky |
| pagination.md | 分页 |
| header.md | 多级表头 + 表头分割线 |
| theme-tokens.md | 主题注入 + tokens 桥接 |
| layout.md | 整体布局 dg-wrapper/data-area/content-scrolled |

## 判定标准速查

| 内容 | 处理 |
|---|---|
| 任务# / 决策# / §N / 返工 / Round N | **删** |
| 阶段性功能代号(M1-M9 / S1-S34 / C1 / F1 等) | **删**(保留其后的描述) |
| "之前 X 现在 Y" / 旧实现对比 | **删** |
| 过时描述(与代码不符) | **删** 或改正 |
| 拆子文件 / live 编辑 / 迁移说明 | **删** |
| 实现取舍的理由 | 移 design-notes,代码留标题+链接 |
| 与 antd 的机制差异 | 移 design-notes,代码留标题+链接 |
| 特殊情况成因 / 易踩坑 | 移 design-notes,代码留标题+链接 |
| 显而易见的代码自解释 | 删(无需注释) |

## 执行方式

- 先做样板(hidden-columns 全套)→ 用户确认风格。
- 批量:demo 每 agent 5 个;engine 按文件/主题分批。
- 复查:每复查 agent 检查 10 个 demo。
