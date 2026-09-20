# docs 站点简练化（一事实一处）

> 上下文恢复：改 `src/docs/**` 或 `src/DocsPage.tsx` 之前先读本文件。
> 写作规则与正典表在 [`../contributing/documentation-style.md`](../contributing/documentation-style.md) 的「一事实一处」节。
> 前序阶段：[`docs-site-reform-plan.md`](docs-site-reform-plan.md)（IA 重组、外壳平权、API 自动生成）已完成。

## 本轮决策

1. **入口页合并**：`intro` 与 `quick-start` 合成单页，slug 保留 `quick-start`，`intro` 进 `docAliases`。
2. **`scroll.y` 语义正典落 `scrolling`**：删除 `scroll-y` 页，旧 URL 进 `docAliases`。
3. **不写重复检测脚本**：本轮人工清一遍，规则与正典表落纸即可。
4. **只做减法**：不加深薄页，薄页加深留下一个阶段。

## 症状 → 处置对照

每条被删的内容都必须能在正典页找到等价或更强的表述。

| # | 原重复 | 处置 | 正典落点 |
|---|--------|------|----------|
| 1 | 最小表格代码块在 `intro` 与 `quick-start` 各渲染一份（`shared.tsx` 共享常量） | 删 `intro`，代码块只留一份并下沉到页面文件 | `quick-start` §minimal |
| 2 | `scroll.y` 语义 8 处重述（`scroll-y` 整页 + `scrolling` + `migrate-from-antd` ×3 + `when-to-migrate` ×3 + `compat-matrix` + `known-limitations` + `grid-options`） | 删 `scroll-y`；其余压成一句结论 + 链接 | `scrolling` §scroll-y |
| 3 | 能力叙事 4 版（`HomePage` / `intro` / `features` / `when-to-migrate`） | `when-to-migrate.fit` 去掉 prop 罗列、改场景判断；`quick-start.what-is` 只留定位与不追求 | `features` |
| 4 | 兼容边界 3 份（`known-limitations` / `when-to-migrate.avoid` / 迁移提示词） | `when-to-migrate.avoid` 压成举例 + 链接 | `known-limitations` |
| 5 | `render` 返回 `{ children, props }` 规则 4 处 | `when-to-migrate.adjust` 只命名该改动；`migrate-from-antd` 保留一句结论 + 链接 | `compat-matrix` §过时成员迁移特例 |
| 6 | 索引型尾块 6 页（优先 demo / 相关文档 / 下一步） | 删 `features`、`styling-and-theme`、`known-limitations`、`scrolling`、`when-to-migrate` 的索引块 | 左目录 + 顶栏搜索 |

## 刻意保留

- `HomePage` 能力速览表：站点门面摘要，可以摘要正典，但不得引入正典没有的新结论。
- `migrate-from-antd` 迁移提示词内的兼容边界段：会被复制出站点单独使用，必须自包含。
- `compat-matrix`「相关说明」与 `api-namespace`「参考入口」：概念页 → 参考页的落点映射，不是纯索引。

## 验收

- 页面数 18 → 16：开始组 4 → 3，核心概念组 4 → 3。
- 旧 URL 可用：`#/docs/intro` 落到「快速开始」，`#/docs/scroll-y` 落到「滚动和虚拟化」。
- `docRegistry` 的 `sections` 与实际渲染节一致，无空节、无死链。
- 质量门：`pnpm tsc`、`pnpm lint` 通过；`tests/live-editable-docs.test.tsx` 通过。
- 规模：`src/docs/pages/*.tsx` 汉字总量 7647 → 7171（−6.2%），源码行数 1797 → 1646（−8.4%）。渲染长度的下降幅度大于源码，因为删掉的主要是 `<Text code>` 形式的 prop 罗列与索引按钮块。

## 遗留

- 薄页加深（`scrolling`、`styling-and-theme` 正文偏薄）留待下一阶段。
- 仓库 markdown（`docs/features/**` 等）与站点内容的同步，仍按前序阶段的约定延后。
