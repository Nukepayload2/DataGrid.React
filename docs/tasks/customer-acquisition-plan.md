# 抢占 antd Table 客户路线图

> 上下文恢复：压缩或会话恢复后先读本文件，再启动可见度/功能/迁移任一波次的工作。
> 真理源关系：本文件是产品对抗 antd 的**计划层**；antd 病灶证据见 [`../../feedbacks/README.md`](../../feedbacks/README.md)（62 条 issue 蛇打七寸）；兼容边界见 [`../reference/compat-matrix.md`](../reference/compat-matrix.md) 与 [`../reference/known-limitations.md`](../reference/known-limitations.md)；命名空间分层见 [`../decisions/0008-api-namespace-separation.md`](../decisions/0008-api-namespace-separation.md)。

## 一、战略判断：为什么现在能抢

antd Table 的病是**架构级**的，补丁打不动。62 条 issue 收敛出的根因只有一条：**双表格 + colgroup + 末尾占位 th + rc-virtual-list 自绘滚动条**——这套架构 6 年没动（[#15630](../../feedbacks/issues/issue-15630.md) 行分组 6 年未解、[#48152](../../feedbacks/discussions/disc-48152.md) 可伸缩列 RFC 两年未落地、[#47184](../../feedbacks/issues/issue-47184.md) 维护者亲口"虚拟下 summary 只能 fixed"）。antd 不敢动架构，因为 rc-table 是上下游被锁死的历史包袱。

data-grid 从根上重做（CSS Grid 单一真理源），解药是**结构性的不是补丁**。且 8 张王牌已落地（见第三节）。定位是 **drop-in 替换**（peerDep `antd ^6`，改一行 import），所以抢客户公式里——

> 抢客户 = (antd 的痛 − data-grid 的解) × 迁移成本趋近 0 × 客户知道这事

前两个因子已做满。**当前最大短板是第三个因子：没人知道 data-grid 存在。** 因此第一波不写引擎代码，先把已落地的王牌变成"看得见的杀手锏"。

## 二、护城河（绝不丢失的优势）

任何进攻波次都不得破坏这四条。它们既是技术命根，也是抢客户的前提。

| 护城河 | 为什么是命根 | 红线 |
|---|---|---|
| **drop-in 兼容 antd v6 API** | 迁移成本=改一行 import，是抢客户唯一前提 | 新差异化能力一律走 `gridOptions` / `gridColumnOptions`，**绝不污染** `TableProps` 的 antd 兼容面 |
| **复用 antd 非表格控件**（Pagination/Spin/Tooltip/Dropdown/Empty） | 外观统一→用户和老板"看不出换过"，降低决策阻力 | 表格核心自研、非表格复用，边界已定（[`overview.md`](../architecture/overview.md)），不膨胀 |
| **token 生态对齐 antd v6** | 主题切换无缝，配色不突兀 | `--ant-*` 注入链不动，新视觉用派生 token |
| **CSS Grid 列宽真理源** | 8 张王牌的物理根基 | `grid-template-columns` 单点真值，不引入第二份列宽缓存 |

## 三、已落地的 8 张王牌（获客弹药，零代码风险）

README 里 62 条 issue 的"蛇打七寸"已逐条对应到 data-grid 已实现源码。这张表本身就是营销材料——把"我比 antd 强"从空话变成可验证证据。

| antd 病灶（issue） | data-grid 解药（已实现） | 源码落点 |
|---|---|---|
| 错位/空数据列宽跳动 [#45524](../../feedbacks/issues/issue-45524.md) [#56151](../../feedbacks/issues/issue-56151.md) [#56713](../../feedbacks/issues/issue-56713.md) | 列宽唯一真理源 `grid-template-columns` | `engine/GridTable.tsx` colTracks |
| **可伸缩列 6 年未做** [#48152](../../feedbacks/discussions/disc-48152.md) [#56356](../../feedbacks/issues/issue-56356.md) | `useColumnResize`（AG Grid 级手感，min/max 约束，组合全正确） | `engine/useColumnResize.ts` |
| 虚拟+动态行高跳跃 [#54769](../../feedbacks/issues/issue-54769.md) | 对齐 react-virtuoso 的 AATree/offsetTree 锚定 | 虚拟化引擎 |
| 虚拟滚动条手感差/hit 区窄 [#53813](../../feedbacks/issues/issue-53813.md) [#44972](../../feedbacks/issues/issue-44972.md) | 原生滚动容器 + `FloatingScrollBar`（8px 宽 hit 区 + 组件级 `scrollBarFoldMode` 折叠策略）。**注：轨道点击按页跳转 data-grid 当前亦未实现，列入第二波 #33** | [`scrolling/scrollbar.md`](../features/scrolling/scrollbar.md) |
| **虚拟+summary 互斥** [#47184](../../feedbacks/issues/issue-47184.md)（维护者认输） | summary 独立为 grid item，不进虚拟窗口 | `engine/Summary.tsx` |
| scrollTo 连外层一起滚 [#46467](../../feedbacks/issues/issue-46467.md) | 直接赋 `scrollTop`，禁用 `scrollIntoView` | scrollTo 实现 |
| fixed 列横滑掉帧 [#35241](../../feedbacks/issues/issue-35241.md) | 不用 box-shadow，边框+渐变 | [`columns/fixed-column.md`](../features/columns/fixed-column.md) |
| 命名/token 历史债 [#54633](../../feedbacks/discussions/disc-54633.md) [#53112](../../feedbacks/discussions/disc-53112.md) | 直接立 v6 RFC，不背 `@deprecated` 双跑 | [`decisions/0008`](../decisions/0008-api-namespace-separation.md) |

## 四、路线图（三波，按 ROI 排序）

**执行顺序铁律：先做第一波（可见度，demo 改造），稳定后再动第二波（功能）。** 功能波次质量门槛高（90%+ 单测），难且慢，不应在可见度缺位时闷头做——没人看见的功能等于没做。

### 第一波｜可见度（当前阶段，demo 改造优先）

目标：让每一个被 antd Table 折磨过的人，搜 issue 时搜到 data-grid。本波基本是**内容**（demo + 文档页 + 门面），不动表格引擎，风险低。

#### A. 五个"antd 做不到"对比 demo

全部用 SplitDemo 左右双栏（对照框架见 [`decisions/0007`](../decisions/0007-demo-comparison-framework.md)），左栏 antd、右栏 data-grid，在 demo registry（HomePage/Sider Menu 共享）注册。每个 demo 必须把"antd 做不到/做不好"的点**可视化放大**，不止于"能跑"。

**组织风格约束（类 Microsoft Learn）**：在当前 demo portal 结构（顶栏 + Sider 树形导航 + Content Tabs 预览/源码，见 [`demo-site.md`](../architecture/demo-site.md)）内做**内容扩展**——Sider 树即 Microsoft Learn 的 TOC，Content Tabs 即内容区单元。新 demo 按现有分类体系（`groupByCategory`）挂到 Sider 树对应分类节点，复用现有 SplitDemo / LiveEditor 组件，**不新增页面类型、路由或框架组件**。本波只加内容节点，不动 portal 骨架。

| demo id | antd 做不到的点（issue 背书） | 可视化重点 |
|---|---|---|
| `resizable-columns` ✅ | [#48152](../../feedbacks/discussions/disc-48152.md) RFC 两年未落地、[#56356](../../feedbacks/issues/issue-56356.md) 不跟手/卡死 | 拖列边界、min/max 约束、与固定列组合正确；**角标注"AG Grid 收费级，免费"** |
| `virtual-summary` ✅ | [#47184](../../feedbacks/issues/issue-47184.md) 维护者认输"只能 fixed" | 大数据量虚拟滚动 + 表尾汇总正常渲染（antd 侧失效态 + fixedSummary 开关对照 workaround） |
| `clickable-scrollbar` ⏳诚实版 | [#53813](../../feedbacks/issues/issue-53813.md) 滚动条 hit 区窄、无折叠策略 | **现状**：8px 宽 hit 区 + `scrollBarFoldMode` 三态（vs antd 精确命中 thumb）。**完整卖点（轨道点击跳页）待第二波 #33 完成后增强** |
| `stable-empty-width` 🔨 | [#56151](../../feedbacks/issues/issue-56151.md) [#56713](../../feedbacks/issues/issue-56713.md) [#55717](../../feedbacks/discussions/disc-55717.md) 空数据/动态列列宽跳 | 切空/非空、增删列，列宽稳定 vs antd 跳动 |
| `scrollto-scoped` | [#46467](../../feedbacks/issues/issue-46467.md) 连外层一起滚（团队确认 bug） | 外层有滚动条时精准跳行，表体动、外层不动 |

> 状态标记：✅ 已验证闭环 · 🔨 实施中 · ⏳ 诚实版（待依赖功能补完卖点）。demo id 以 `src/demos/index.ts` 实际注册名为准（不带 `compare-` 前缀）。

**验收**：每个 demo 双栏可运行；antd 侧如实呈现 bug（不造假）；右下角挂"对应 antd issue"外链。

#### B. "何时迁移 / Why migrate"站点页 + docs 页

面向**决策者**（非开发者细节）。结构：

1. 一句话定位（drop-in，改一行 import，外观不变）
2. **痛点 → 解药表**：整理迁移收益更直接的常见痛点，每条给出 data-grid 的处理方式和对应 demo 链接
3. **迁移成本**：兼容矩阵链接 + 已知限制（诚实写 `scroll.y` 不做 max-height、semantic DOM 不复刻 thead/tbody/tr）
4. **迁移示例提示词**：一段现成模板，用户贴进 Claude/Copilot 即可自动改 antd→data-grid。**不做 codemod/迁移 CLI**——顺应 AI 时代，提示词成本低、覆盖广

#### C. GitHub / npm 门面

- README 顶部一句**给决策者**的定位（当前偏开发者）：建议文案 "Drop-in replacement for antd Table — same API, same look, fixes the bugs antd can't. CSS Grid under the hood."
- `package.json` 的 `description` + `keywords` 补 `antd-table` / `replacement` / `virtual` / `resizable` 等可被 antd 用户搜到的词

### 第二波｜功能差异化（极致单元测试覆盖 90%+）

补 antd **明确没有/做不到**、且 feedbacks 里有真实需求的功能。优先级按"需求热度 × data-grid 独占性"排。**本波每个功能硬性满足第五节质量门槛。**

#### P0｜原生 rowGrouping

antd [#15630](../../feedbacks/issues/issue-15630.md) 六年未解，用户被迫塞伪数据行污染 dataSource。data-grid 设计主张：

- **复用 tree 的展开/折叠机制**，但 group header/footer 是"虚拟结构行"，**不污染 `dataSource`**（彻底避开 antd 病根）
- **`onGroupHeaderRow(group, props)` 独立 template**：group header 自动 `span` 整行（跨所有叶子列），渲染折叠箭头 + 分组名 + 计数
- **可选 `onGroupFooterRow`**：满足日式帳票表格的分组小计需求
- **grid line 全表对齐，零嵌套无头表格**——CSS Grid 的结构性优势，也是对 antd 最大的打击点：antd 用户模拟分组只能塞伪数据行或嵌套 headerless 内层 `<table>`，列线永远对不齐；data-grid 的 group header/footer 行与普通行**共享同一份 `grid-template-columns`**，列轨天然贯通。**demo 必须用一条贯穿的竖网格线可视化强调**（antd 对不齐 vs data-grid 对齐）
- API 归口 `gridOptions.rowGrouping`（`groupField` / `renderGroupHeader` / `defaultExpandedGroups` / `groupSummary`），不污染 antd `TableProps`

#### P1｜行内编辑一等公民（editMode，对齐 WPF DataGrid）

当前 [`editing.md`](../features/interaction/editing.md) 只是 demo 级。补齐声明式 + 命令式双轨，沿用 WPF/WinForms DataGrid 心智（与现有 `virtualization: 'standard'|'recycling'` 同源哲学，见 [`decisions/0003`](../decisions/0003-virtualization-measurement.md)）：

- **`gridOptions.editMode: 'disabled' | 'cell' | 'row'`**（值用 JS 小写串，与现有 `virtualization` 小写约定一致；语义对齐 WPF `DataGridEditMode.Cell/Row`，外加 `disabled` 总开关）
- **命令式方法（经 ref 暴露，与 `scrollTo` 同入口）**：`beginEdit()` / `cancelEdit()` / `endEdit()`
- **完备事件链**：`editStarting` / `editStarted` / `editEnding`（**可 `e.preventDefault()`**，校验失败阻止提交）/ `editEnded` / `editCanceling` / `editCanceled`
- **声明式 `column.editor`**：`options: (record) => Promise<Option[]>` + `dependsOn: ['province']` 联动 + 行级 `rowState` 隔离（治 [#55876](../../feedbacks/discussions/disc-55876.md) 跨行污染）

#### P1｜`bodyHeight` 一等公民

antd [#49445](../../feedbacks/issues/issue-49445.md)（34 评）只有 `scroll.y` 的 max-height 语义。data-grid 已主动放弃 `scroll.y` 的 max-height（见 [`known-limitations.md`](../reference/known-limitations.md)），正好用全新 `bodyHeight` API 补——固定表体高度，数据少时分页条不跳。

#### P1｜FloatingScrollBar 轨道点击按页跳转

由第一波 #30 demo 决策触发：原计划误以为已实现，查源码 `engine/FloatingScrollBar.tsx` 确认 pointerdown 立即进增量拖动模式、单击轨道空白不跳页（与 antd #53813 同病）。本任务（#33）补齐——pointerdown 时检测命中位置 vs thumb 位置：点在 thumb 上维持增量拖动，点在轨道空白则按页跳转（对齐浏览器原生滚动条行为）。完成后回头增强 #30 demo 的跳页演示，卖点才完整。硬性满足第五节质量门槛（90%+ 单测，命中检测算法抽纯函数单测）。

#### P2｜前置列顺序可配 + 命名 RFC 推广

- `gridOptions.leadingColumns: [...]`：selection 不强制最左，expand/drag/序号顺序完全可配（治 [#53918](../../feedbacks/issues/issue-53918.md) 硬编码）
- `pagination.placement` / `size: medium|small|large` / `renderXxx` / bool 用 `-able` 后缀：已有 [`decisions/0008`](../decisions/0008-api-namespace-separation.md) 决策，做迁移指南让用户用起来

### 第三波｜迁移闭环与可信度（企业级敲门砖）

1. **兼容矩阵页**：把 [`compat-matrix.md`](../reference/compat-matrix.md) 做成站点可搜索页
2. **公开性能基准**：data-grid vs antd A/B（虚拟纵向滚动是当前唯一性能痛点，必须公开量化，别只说自己快）
3. **iPad Safari 真机测试矩阵**：[#46640](../../feedbacks/issues/issue-46640.md) 是 antd 长期痛点，覆盖即独占（overlay vs classic 滚动条 A/B、触控滑动手感、JS RAF easing 回退为原生）
4. **企业采用案例**：哪怕一个真实案例，胜过十页文档

## 五、质量门槛与执行约束

### 功能质量门槛（第二波每个功能硬性满足）

- **行覆盖率 ≥ 90%**：`pnpm test:coverage`，新代码不允许低于门槛
- **类型必须过**：`pnpm run tsc`（vitest **不**做类型检查，曾因此漏过 27 错，见 [`vitest-no-typecheck` 记忆]——写测试 worker 必须额外跑 tsc）
- **CSS 兼容不回归**：`pnpm test:css-compat` 通过
- **设计阶段纯逻辑/渲染分离**：engine 层逻辑抽成纯函数单测（延续 Stage3 hook 拆分模式，见 [`engineering-refactor-table-hooks.md`](../engineering-refactor-table-hooks.md)），渲染走集成测试
- **行为兜底**：subagent 无法跑交互 Bash 时，靠 grep + 静态分析 + 行为验证三重兜底（见 [`contributing/verification-guide.md`](../contributing/verification-guide.md)）

### 执行约束

- **纯开源免费**：所有功能（含可伸缩列、rowGrouping、editMode）免费开源，不设 Pro/付费墙。AG Grid 级能力作为"收费级功能免费送"的获客武器
- **差异化不破坏兼容**：第二波所有新 API 走 `gridOptions`，`TableProps` 保持 antd 等价（护城河红线）
- **迁移只给示例提示词**：不做 codemod/迁移 CLI，迁移指南页内嵌 AI 提示词模板即可
- **实施走 implementer/verifier 串行循环**：main 只调度，所有代码修改给 implementer subagent；implementer 按代办列表做，verifier 按同一列表检查，串行交替直到完成。subagent 不得再 spawn 子 agent（防套娃）

## 六、阶段顺序与验收

| 阶段 | 内容 | 完成标志 |
|---|---|---|
| **1A**（当前） | 第一波 A 的 5 个对比 demo | 五个 demo 双栏可运行、antd 侧如实呈现 bug、挂 issue 外链 |
| **1B** | 第一波 B+C：迁移页 + 门面 | "何时迁移"页上线、README/npm 文案更新、提示词模板可用 |
| **2-P0** | rowGrouping | `gridOptions.rowGrouping` 可用、grid line 对齐 demo 上线、单测 ≥90% |
| **2-P1** | editMode + bodyHeight + 轨道跳页(#33) | 命令式 ref 方法 + 事件链 + 轨道跳页命中检测、单测 ≥90% |
| **2-P2** | 前置列 + 命名 RFC | leadingColumns 可配、命名指南成文 |
| **3** | 迁移闭环 | 兼容矩阵可搜索页、性能基准公开、iPad 矩阵、首例案例 |

每个阶段完成前不开启下一阶段的功能编码（可见度 demo 可与功能设计并行，但功能合并晚于可见度上线）。
