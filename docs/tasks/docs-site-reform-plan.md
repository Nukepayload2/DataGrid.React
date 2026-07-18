# docs 站点改造计划

> 上下文恢复：压缩或会话恢复后先读本文件，再动手改 `src/docs/*`、`src/DocsPage.tsx`、`src/App.tsx`、公开类型 JSDoc。
> 触发背景见 `tmp/docs-review-ms-veteran.md`（外部评审）。本计划已脱离该评审的权威性独立成立——
> 地基是"一个宣称接 antd Table 班的库，文档该有的样子"，不是"某位客户这么说"。

## 背景与目标

现状：文档区是**穿了落地页外衣的迁移备忘录**——API 表手抄自家类型系统（`src/docs/pages.tsx` 里的行数组），迁移杀手锏（SplitDemo + 差异矩阵）只窝在示例区，docs 切过去后搜索/主题/虚拟化全消失。

目标：升级为**可查询的参考型文档 + 内嵌的迁移兵器库**。

- 参考层追平 antd 成熟度底线：API 从 TypeScript 类型自动生成，不手抄、不漂移。
- 迁移层把 data-grid 独有的对照能力（antd 文档都没有）搬进 docs 正文，变成护城河。
- 全站外壳与三区结构（home + docs + demos）和三栏 docs 布局**不变**。

## 三条已定决策

1. **封装强度不改**：本轮只改文档层。源码层面的封装重构全部记入"源码/API 结构延后项"延后，不在本计划执行。
2. **代码可交互**：`DocsCode` 加复制按钮；docs 区代码块接入可编辑（复用示例区 `LiveEditor`）。
3. **类型生成**：`package.json` 加 `docs:api` target，用 TS Compiler API 提取公开类型为结构化 API 数据，驱动参考页。

## 范围澄清（补充）

- **JSDoc 属文档层，可改**：公开类型（`publicTypes.ts` 等）的 JSDoc 视为文档，本轮可直接编辑——把对外语义与内部实现机制在源端分离。这让提取管线能依赖干净的源 JSDoc（顺带改善 IDE 悬浮提示），不必做复杂运行时过滤。API 与代码结构（导出、命名空间归属）仍属代码层，不动。
- **`docs/**/*.md` 本轮不动**：仓库 markdown 是文档，但须等网站改造完成后才同步——网站改造会改变内容形态与落点，先改 markdown 是返工。markdown 对齐放到后续单独阶段。
- **版本写 `1.0.0`**：尚未发布，`package.json#version` 直接设为 `1.0.0`（收拾完发布的就是 1.0.0）；顶栏版本号读它。

## 设计原则

- **类型即真理源**：参考页的属性清单来自 `docs:api` 产物，不再有 `pages.tsx` 里手写的 `*Rows` 数组。手抄自身类型系统属自废武功。
- **迁移即内嵌对照**：迁移页讲差异时旁边就是活的可对照表/双栏，不是只读代码块 + "去看 demo"按钮。
- **封装墙（文档层）**：面向用户的文档不出现内部函数名（`normalizeRenderedCell`）、内部数据结构（`列树`、`逻辑行`）、内部 DOM 根因（"grid 无 thead/tbody/tr 所以不行"）。读者只需知道"支持 / 不支持 / 怎么用"，不需知道"为什么底层做不到"。剥离发生在 **JSDoc 源端清理 + 提取管线 + 文案改写**三层；JSDoc 可改，API/代码结构不动。
- **范围纪律**：追的是"我覆盖到的部分查得到、查得准"，不是"API 覆盖面赶上 antd"。产品已声明"不追求所有历史兼容 API"，盲目铺全 API + per-prop changelog 会背叛自己的取舍。
- **术语统一**：建一份 glossary 作为全站用词真理源，钉死同物异名。

## 目标信息架构（在现有 4 组内重组，不新增组）

| 现状 | 动作 | 目标 |
|---|---|---|
| `api-summary`（与 `table-api` 同 render、描述自承"内容等同"） | **删除** | 消除重复页 |
| `public-api` / `table-api` / `column-api` / `grid-options` | **改由 `docs:api` 产物驱动** | 四个参考页 = 四个公开类型切面，单一真理源 |
| `api-namespace`（核心概念）罗列 gridOptions 清单 | **精简**：只讲"兼容 API 在顶层、专属能力进 gridOptions"的分工，清单指向 `grid-options` 参考页 | 概念页不再与参考页重复 |
| `compat-matrix` 与 `deprecated-antd-members` 高度重叠 | **分工去重**：前者=兼容状态（完全/部分/未暴露），后者=过时成员迁移动作（怎么改） | 同一问题（如 `rowSelection`）不再跨四页查 |
| `renderFeaturePage` 工厂生成的 6 篇模板薄页 | **有实质内容的充实**（scrolling / interaction），**纯索引的合并或保留为入口** | 消除雷同模板句 |
| `intro`（九行索引表，与左目录重复） | **改成真入门**：定位 + 一段话讲清 data-grid 是什么/不是什么 + 两条主路径（快速用 / 从 antd 迁） | 首页不再是目录副本 |

## 实施阶段

### Phase 0 — 清理与外壳平权（P0，低成本高回报）

目标：立刻干掉"docs 是二等公民"的体感，删掉客观重复。

- 删 `api-summary`：`src/docs/docRegistry.tsx` 去掉该 entry；修正 `table-api` 的"下一篇"指向（当前指向该重复页）。
- 外壳平权：`src/App.tsx` 中搜索框 / 主题编辑器 / 虚拟化开关不再以 `isDemoArea` 为唯一门禁，docs 区可用（docs 区的虚拟化开关可视情况隐藏，因多数文档表格非虚拟场景，但搜索与主题必须给到）。
- 左目录 `DocsToc`（`src/DocsPage.tsx`）：从死平铺改为可折叠分组 + 过滤搜索。
- 面包屑（`src/DocsPage.tsx:120-134`）：分组与标题级也可点，补 `aria-label="breadcrumb"`。
- 版本号：顶栏读 `package.json#version`（已设为 `1.0.0`，即目标发布版本）。
- 代码复制按钮：`DocsCode` / `CodeView` 加一键复制（可编辑见 Phase 4）。

落点：`src/App.tsx`、`src/DocsPage.tsx`、`src/docs/docRegistry.tsx`、`src/CodeView.tsx`、`src/docs/components.tsx`。

### Phase 1 — JSDoc 清理 + 类型提取管线（P0，已定决策 #3）

目标：把公开类型变成结构化数据，为参考层去手抄打地基。

- **JSDoc 源端清理（封装墙，关键，已纳入范围）**：直接编辑公开类型 JSDoc（`publicTypes.ts` 等），把内部实现说明（"grid 渲染下表体无独立 `<tr>`""列树""逻辑行""RO 测量"等）从对外注释剥离——降级为代码旁普通注释或收进 `@internal` 块。提取器据此渲染，运行时过滤降至最小（仅识别 `@internal` 隐藏）。顺带改善 IDE 悬浮提示。
- 新增 `package.json` script：`"docs:api": "node scripts/extract-api.mjs"`，并接入 `build:docs` 前置，保证 docs 构建产物最新。
- 提取器用**已安装的 `typescript` ^7 Compiler API 手写**（不引 typedoc / ts-morph 重依赖；公开类型面有限）。输出 `src/docs/generated/api.json`。
- 提取源（本阶段 inventory 先核实确切文件与符号）：
  - `src/table/publicTypes.ts`：`TableProps`、`TableRef`
  - `src/table/compatTypes.ts`：`ColumnType` 等
  - `src/table/nativeOptions.ts`：`GridSelectionOptions`、`TableComponents` 等
  - `src/table/engine/recyclingCellTypes.ts`：`VirtualizationMode`
  - `gridColumnOptions` 定义处（inventory 定位）
- 产物字段：`name / kind(prop\|method\|type\|export) / signature / type / defaultValue / required / deprecated / since / stability / advanced / summary`。
- inventory 子任务：核实类型 JSDoc 引用的 `docs/design-notes/*.md` 是否存在（glob 未见该目录，疑似断链或重命名）。本轮只检测；JSDoc 内的断链在清理时一并处理（重指 `docs/features/**` 或删除），markdown 文件本身按"本轮不动"延后。

落点：`src/table/publicTypes.ts` 等类型文件（仅 JSDoc）、`package.json`、`scripts/extract-api.mjs`（新）、`src/docs/generated/api.json`（新）。

### Phase 2 — 参考层重构（P0/P1）

目标：参考页吃 `api.json`，补齐缺失项，属性可查。

- `table-api` / `column-api` / `grid-options` / `public-api` 四页的 render 改为消费 `api.json`，删除 `pages.tsx` 里对应的手写行数组（`tablePropRows`、`gridOptionRows`、`selectionOptionRows`、`scrollBarFoldRows`、`gridColumnOptionRows`、`columnPropRows`、`publicApiRows` 等）。
- 新增或增强 `ApiRefTable` 组件（替代这些场景的 `DocsDataGrid`）：属性名可点（锚）、`deprecated` 醒目标记、`since` 版本、类型签名列、必填标记、`advanced` 分区。
- 自动补齐评审指出的缺失项：`loading`、`onChange`、`rowClassName`、`bordered`、`size`、`onRow`、`onHeaderRow` 等（这些在 `publicTypes.ts` 已有详尽 JSDoc，清理 + 提取即覆盖）。
- `api-namespace` 精简：去掉 gridOptions 清单，指向 `grid-options`。

落点：`src/docs/pages.tsx`、`src/docs/components.tsx`、`src/docs/docRegistry.tsx`。

### Phase 3 — 迁移层内嵌（P1）

目标：把对照兵器从示例区搬进 docs，补选型指引。

- `migrate-from-antd`：内嵌 `SplitDemoPreview`（或其轻量对照态）活对照，而非仅 demo 链接。讲 `scroll.y` 语义改造时旁边就是可对照表格。
- 新增"何时迁移 / 何时不要迁移"选型页（建议放"开始"或"核心概念"组）——antd 给不了、只有继任者才需要写的设计层指引。
- `compat-matrix` ↔ `deprecated-antd-members` 按"状态 / 动作"分工去重，交叉引用明确。

落点：`src/docs/pages.tsx`、`src/docs/docRegistry.tsx`、复用 `src/demos/_compare/SplitDemoPreview`。

### Phase 4 — 写作、术语与可编辑（P2）

目标：读起来像成品。

- 建 `src/docs/glossary.ts`（术语真理源）：`过时成员 ↔ deprecated`、`槽位 ↔ slot`、`scroll.y` 模式名统一为"数据区域模式"（消灭"数据区滚动模式 / 数据区模式 / 纵向滚动模式"三叫法）。render 与 lint 阶段引用。
- 去翻译腔（如 `pages.tsx:916`"会按迁移价值选择保留、降级或不暴露"），lede 写完整导语而非名词短语，消解主语跳跃。
- 充实或合并 `renderFeaturePage` 六篇模板正文。
- `semantic-dom` 页改写：a11y 矩阵"结论"列只说"支持/不支持"，移除"因为没有 thead/tbody 所以不行"的内部根因（封装墙）。
- 代码可编辑：docs 区代码块可选接入 `src/live/LiveEditor`（复用 sucrase 链路），与复制按钮并存。

落点：`src/docs/pages.tsx`、`src/docs/components.tsx`、`src/docs/glossary.ts`（新）、`src/live/LiveEditor.tsx`。

## 源码 / API 结构层延后项（记录，不在本轮修）

按决策 #1，**API 与代码结构**不动；JSDoc 与文档文案可改。以下属代码结构层，本轮只在 JSDoc/文档层规避，代码改动延后：

1. **escape-hatch 与常规选项同 namespace**：`gridColumnOptions` 把 HTMLElement 级低层 hook（`renderCellElement` / `renderCellReact` / `disposeCellElement`）与常规选项（`dragColumnLock`）放同一层。本轮在 JSDoc 标 `@advanced` + 提取器分组做视觉区隔；未来拆 `gridColumnOptions.advanced.*` 是 API 改动 → 延后。
2. **内部 drag hooks 仍从源码导出**：本轮文档删掉 `renderPublicApi` 的"拖拽 hooks 不作为公开 API"声明节（声明即坐实），改为只讲 `gridOptions.rowDragSort/columnDragSort` 公开入口；真正"源码不导出内部 hook"属代码改动 → 延后。

> 类型 JSDoc 对外语义与内部机制混杂（原候选项）已因"JSDoc 可改"晋升为 Phase 1 的源端清理任务，不再延后。

## 完成标准

- **参考**：四参考页由 `api.json` 驱动，`pages.tsx` 无 API 手写行数组；属性含 `deprecated` / `since` / 类型签名；评审缺失项补齐；`api-summary` 删除。
- **迁移**：`migrate-from-antd` 内嵌活对照；"何时迁移"页上线；`compat-matrix` 与 `deprecated` 分工无重叠。
- **外壳**：docs 区有搜索与主题控件；左目录可折叠可过滤；面包屑每级可点且带 `aria-label`；版本号读取 `package.json`（显示 `1.0.0`）。
- **封装（文档层）**：公开类型 JSDoc 已分离对外/内部；全站文档不出现 `normalizeRenderedCell`、`列树`、`逻辑行`、内部 DOM 根因；escape-hatch 在参考表中视觉分离；无"声明不公开"节。
- **交互**：`DocsCode` 有复制按钮；迁移/参考页代码可编辑。
- **写作**：glossary 落地并被引用；导语完整；翻译腔样本清零；术语无漂移。
- **质量门**：`pnpm tsc` 通过；目标 Vitest 套件通过；浏览器核对参考页、迁移页、外壳控件（chrome-devtools，按 `verification-workflow` 约定隔离 agent）。
- 源码/API 结构延后项 #1–#2 已记录，且本轮未触碰 API 与代码结构。

## 不做 / 保留

**本轮不做**：源码/API 结构调整（延后项 #1–#2）；追 antd 全 API 覆盖率与 per-prop changelog（违反范围纪律）；引入 typedoc 全家桶；编辑 `docs/**/*.md`（网站改造完成后单独阶段同步）。

**保留不动**：home + docs + demos 三区结构；三栏 docs 外壳；`DocsDataGrid` 的 dogfooding 思路（思路对，问题在喂的是手抄数据而非类型，Phase 2 后自愈）；示例区对照说明的高信息密度——这是资产。

## 后续阶段（网站改造完成后）

- 同步 `docs/**/*.md`：把网站改造后定型的 IA、术语、封装口径回写到仓库 markdown（architecture / features / reference / decisions）。
- 处理 `docs/design-notes/*` 断链（Phase 1 inventory 结论）：重指或归档。
- 评估源码/API 结构延后项 #1–#2 是否进入下个版本。
