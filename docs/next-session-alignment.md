# 下一会话：深入 antd 对齐决策（接力清单，2026-06-26）

## 项目背景（一句话）
data-grid = 用 **CSS Grid 重做 antd Table**，兼容 **antd v6** 的 CSS variables（`--ant-*`）+ React 接口；49 个 demo 用 SplitDemo 左右对比（左 data-grid / 右 antd 6.x 官方同名 demo）。非表格核心控件（pagination / filter 下拉 / tooltip 等）复用 antd；表格核心（grid 渲染 / 列树 / 固定列 / 合并 / 虚拟 / 排序筛选选择展开状态机）自研。

## 本会话已完成（勿重复）
- **demo 配置等价大修**：49 demo 左右对齐（pagination / filter / sorter / action 链接色 / 可见高度）。详见 memory `demo-config-equivalence` + `docs/align-demo-config-tasks.md`。
- **门户改造**：antd Layout 顶导 + 首页按类别分组卡片网格 + 搜索 + 类 antd 文档页（`HomePage.tsx` / `DocsPage.tsx` / `App.tsx`）。
- **虚拟化对齐 react-virtuoso**：AATree/offsetTree 动态行高 + `gridOptions`（rowHeight/min/max 有界）+ flushSync/isScrolling + smooth scrollTo（JS RAF easing）+ FillerRow。详见 memory `virtualization-virtuoso-aligned`。
- **滚动条修复**：thumb min 32px + 单路径 transform + hit 区 8px + 真实滚轮 bug（measureHeaderHeight 参照容器 / FillerRow 消闪烁 / 拖动 release 修复）。
- **嵌套列 sorter/filter key bug 修复**（多级表头下 cell.key 路径 vs sortKey）。详见 memory `columntree-dual-passthrough`。
- **action 链接色**：`.dg-wrapper a` 复刻 antd genLinkStyle（table.css）。

## 下一会话 6 项深入对齐决策

### 1. 选择列跟随固定列（first column fixed → selection 也 fixed）
当首列 `fixed` 时，row-selection 列（checkbox/radio，渲染在最左）也应 fixed。
- **先查 antd 行为**：`G:\Projects\ant-design\components\table` 里 selection 列与 fixedColumns 的交互（`getColumns`/`injectSelection` 把 selection 列 fixed 与否的逻辑）。antd 6.x 是否自动把 selection 列并入 leftFixed？
- data-grid：选择列由引擎注入（`__dg_selection__`），fixed 取决于注入逻辑。需对齐 antd：首列 fixed → selection 也 fixed（粘在最左）。
- 验证：row-selection + fixed 列组合 demo（左 data-grid / 右 antd 对照）。

### 2. 主题 token 详细 demo（类 antd theme-editor）
参考 https://ant.design/theme-editor-cn —— 全局 token（colorPrimary / borderRadius / fontSize…）+ Table 组件 token（headerBg / rowHoverBg / cellPadding…）实时调节影响外观。
- data-grid 已有主题注入机制（memory `theme-injection-antd`：transformToken + realToken 注入全套 `--ant-*` 到 `.dg-wrapper`）+ 现有 `component-token` demo（较简单）。
- **要建一个丰富的 theme-editor demo**：左侧控制面板（全局 token + Table 组件 token 的 Input/Slider/ColorPicker）+ 右侧实时预览表格 + dark/light 切换 + 左右对比（data-grid vs antd 同 token 下外观一致）。证明主题注入全覆盖。
- 可复用 antd `theme-editor` 的 token 列表思路（不必搬其代码）。

### 3. Semantic DOM 兼容性（classNames/styles 槽位 + DOM 语义）
「semantic dom」= data-grid 的语义化 `classNames`/`styles` 槽位（header.{cell,row,wrapper} / body.{cell,row,wrapper} / title / footer / pagination.* / section / content 等，见 `style-class` demo）**以及** DOM 结构语义（aria-* / role / accessibility）。
- 蕴含大量细节，每个槽位都要 demo 证明与 antd 兼容（antd 同名 slots 行为一致）。
- **审计现状**：grep data-grid 支持哪些 semantic slots vs antd 支持的（antd Table classNames/styles 的完整槽位清单，读 antd 类型 + 文档）；补齐缺失槽位 + 各加 demo。
- a11y：aria-rowindex / aria-colindex / aria-sort / role=row/gridcell 等是否齐（memory 提过 aria-sort 缺失，N6 发现）。

### 4. 与 antd 不兼容的 API 收入 gridOptions / gridColumnOptions
data-grid 专属（antd 无或语义不同）的 API 统一收进命名空间，与 antd 兼容 API 分离（已立先例：`gridOptions.rowHeight/minRowHeight/maxRowHeight`）。
- **table 级 → `gridOptions`**：rowHeight（已入）、scroll.y:true vs 数字（data-grid 不支持数字）、virtual、resizable 相关、其它 data-grid 专属。审计 `TableProps` 找出所有非 antd 字段，迁入 gridOptions（保留向后兼容过渡）。
- **column 级 → `gridColumnOptions`**（新建）：column 上 data-grid 专属字段（若有）。
- **策略文档**：在 DocsPage 或单独 md 写清「哪些 API 与 antd 兼容（同名同义）/ 哪些是 data-grid 专属（入 gridOptions/gridColumnOptions）/ 哪些 antd 有但 data-grid 暂不支持」。

### 5. antd 兼容 API 深挖策略（compat matrix）
系统过一遍 antd Table **全量 API**（TableProps 所有字段 + ColumnType 所有字段 + ref 方法 scrollTo/getColumns 等 + 事件 onChange/onRow/onHeaderRow 等），逐项判定 data-grid 支持度：完全兼容 / 部分兼容（差异说明）/ 未实现 / 名称兼容语义不同。
- 产出兼容矩阵（DocsPage 一节或 md 表格），作为对齐决策依据。
- 重点核对易漏的：server/async 模式（pagination/sorter/filter 远程，memory 有教训）、measureRowRender（决策：不做）、components.body.cell/row（edit-cell/edit-row 用）、Table.Column/ColumnGroup JSX（S31）、EXPAND_COLUMN/SELECTION_COLUMN 哨兵、summary 子组件、locale.emptyText/renderEmpty 两种语义（memory `antd-table-filter-empty-semantics`）。

### 6. ag-grid 能力借鉴（gridOptions/gridColumnOptions 增强，★严格约束）
借鉴 `G:\Projects\ag-grid`（已授权可读）中 **antd Table 没有、但 data-grid 可考虑** 的能力，丰富 gridOptions/gridColumnOptions（与第 4 项互补：第 4 项是收纳 data-grid 已有专属 API，本项是从 ag-grid 引入新能力）。
**★ 严格约束（用户钦定）**：
- **API 名字必须用户自定**——**绝不照抄 ag-grid 的 API 名**（ag-grid 分商业版，抄名有法律/品牌风险）。只借鉴能力/行为，命名独立。
- **商业版（enterprise）特有功能**：只研究其**预期行为/用户视角效果**，**不得抄代码**。
- **社区版（community）功能**：可看行为**也可抄代码**。
- 先读 ag-grid 仓库结构区分 enterprise vs community 模块（如 `packages/ag-grid-community` vs `packages/ag-grid-enterprise`），据此判定每个能力的抄码许可。
- 产出：候选能力清单（逐项标注 enterprise/community + 建议 data-grid 命名 + 是否值得做 + 预期行为描述），**命名交用户拍板**后再 implement。先调研列单 → 用户定名 → 再做。

## 工作模式（必守）
- **main 只调度，不改代码**（memory `orchestrator-no-direct-code-edits`）；implementer 改、verifier 查。
- **implement↔verify 交替**，每个子能力改完即验，循环到干净。
- **subagent 禁用 Agent 工具**（防套娃）——每个 subagent prompt 醒目处写明（memory `subagents-no-agent-tool`）。
- **滚动相关验证用真实滚动路径**（scrollBy 循环 / 真实滚轮 / MCP drag），不用 `el.scrollTop=X` 单跳（会漏 RO-at-high-scrollTop 类 bug）。
- 优先内置 Read/Edit/Grep/Glob（Windows 路径）；Bash 易卡。chrome-devtools 经 Agent 隔离。
- 会话开始先读 `G:\Projects\CodeAtelier\MagicTools\manifest.md`（用户智能体）；memory 自动加载（MEMORY.md 索引）。

## 关键源/参考路径
- data-grid：`G:\Projects\trash-antd-table\data-grid`（主）。引擎 `src/table/engine/*`、类型 `src/table/types.ts`、样式 `src/table/style/*.css`。
- antd 官方（只读对照 + API 真相）：`G:\Projects\ant-design\components\table`。
- react-virtuoso（虚拟化参考，已授权）：`G:\Projects\react-virtuoso`。
- ag-grid（能力借鉴，已授权）：`G:\Projects\ag-grid`。★ **enterprise 模块只研究行为不抄码；community 模块可抄；API 名用户自定、绝不照抄 ag-grid 名**。
- task-plan：`docs/task-plan.md`；本清单：`docs/next-session-alignment.md`。
