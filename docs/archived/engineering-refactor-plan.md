# 工程化重构计划

本文记录 data-grid 为长期维护需要推进的工程化计划。目标不是推翻现有 CSS Grid 表格架构，而是在保留现有产品方向的前提下，补齐验证能力、降低核心模块耦合、建立性能基线，并逐步提升 React 工程稳定性。

## 背景判断

data-grid 已经具备组件库雏形：核心表格实现、demo 对照站、架构文档、兼容矩阵和已知限制都存在。当前主要风险不在方向错误，而在工程保护不足和核心中枢过重。

主要证据：

- `src/table/Table.tsx` 同时承担 antd 兼容层、状态编排、主题 token 桥接、分页、空态、loading、ref 适配和 `GridTable` 调用。
- `src/table/engine/GridTable.tsx` 同时承担 CSS Grid 布局、表头/表体渲染、sticky、虚拟滚动、合并、展开、summary、滚动容器等职责。
- `src/table/types.ts` 同时包含 public API、antd 兼容类型、data-grid 专属配置和部分 engine 边界类型。
- `package.json` 目前只有 `dev`、`build`、`tsc`、`preview`、`lint`，没有自动化测试脚本。
- 现有验证主要依赖 demo 人工对照，适合探索，不足以保护大规模重构。

## 非目标

- 不重写 CSS Grid 架构。CSS Grid 重做 antd Table 是项目核心目标，不是坏味道本身。
- 不优先重构 `src/demos` 和 `docs`。它们是当前最重要的验收资产。
- 不把整个表格改成普通 TypeScript 控件再用 React 包装。当前性能风险更适合局部 imperative 优化。
- 不一开始照搬 antd 的完整测试矩阵、视觉截图矩阵或浏览器矩阵。
- 不把 Playwright 作为默认 UI 测试层。只有 jsdom、纯函数测试或临时浏览器检查难以覆盖的行为，才进入 Playwright smoke。
- 不把 `react-doctor` 直接作为强阻断 gate。

## 拆分原则

拆分的主要目标是降低维护成本，不是追求文件数量。只要不会明显拖慢渲染路径或交互热点，应优先把稳定边界拆成 hooks、utils 或 adapter 模块。

推荐拆分：

- 纯计算逻辑拆成 utils，便于 Vitest 直接覆盖。
- 状态编排和副作用拆成 hooks，便于隔离依赖和减少主组件体量。
- antd 兼容桥接拆成 adapter，便于集中审计和后续升级。
- 类型转换、列树转换、分页/筛选/排序参数组装拆成纯函数或轻量 adapter。

需要谨慎拆分：

- 每个 cell、每个 row、pointermove、scroll、ResizeObserver、RAF 回调等热点路径。
- 会引入额外 React component 层级、额外 hook 调用、额外闭包分配或更复杂 memo 依赖的拆分。
- 需要跨模块频繁传递大量上下文对象的拆分。

热路径实现原则：

- 热路径不默认使用 React state/effect 驱动。对于 pointermove、scroll、hover、resize、drag、ResizeObserver、RAF 等高频路径，优先评估 `ref + callback`、事件委托、DOM class/style 写入、CSS variables、RAF 合帧等更精细的控制方式。
- imperative 优化只用于明确热点，不作为整体编码风格。组件边界、数据入口、公开 API、普通交互和低频状态仍应保持符合 React 的声明式风格。
- 热路径中的 `useEffect` 应主要用于订阅、清理和同步外部对象，不应承担每帧数据流的主要调度。
- 热路径中的 `useState` 应谨慎使用。只有状态变化需要驱动 React 重新渲染可见结构时才使用；仅用于位置、hover、拖拽中间态、滚动同步等场景时，优先考虑 ref 或 DOM/CSS 层更新。
- 使用 imperative 路径时必须集中封装，避免散落的 DOM 写入破坏可维护性。推荐封装为 `useXxxController`、`useXxxSync` 或独立 controller/utils，并明确生命周期清理。
- 任何 imperative 优化都要保留 React 层的单一数据入口和最终提交点。例如拖拽中间态可走 DOM transform，拖拽结束后再通过 React state/props 提交最终顺序。

判断标准：

- 如果拆分后主要成本发生在 props 变化、用户操作或配置变化时，可以优先拆。
- 如果拆分后成本发生在每个可见 cell、每帧拖拽、每次滚动或每次 ResizeObserver 回调中，需要先做基线或保持局部内联。
- 如果拆分能让纯逻辑进入 Vitest 覆盖，即使多一层函数调用，通常值得接受。

## 阶段 0：建立验证基线

目标：在拆核心文件前，先让回归可见。

> 现状：Vitest 最小测试栈已落地（`vite.config.ts` 配置 jsdom + setup + coverage），`pnpm run test` / `pnpm run test:watch` / `pnpm run test:coverage` 已纳入 `package.json` scripts，`@vitest/coverage-v8` 提供 v8 覆盖率（include `src/table/**`）。基线覆盖率：Lines 50.74% / Statements 49.08% / Branches 49.46% / Functions 57.18%。

任务：

1. 新增 Vitest 最小测试栈。
2. 先覆盖无 DOM 的纯逻辑模块。
3. 保留现有 `tsc` 和 `oxlint`，把 `test` 纳入日常验证命令。
4. 选取少量高价值 demo 作为后续真浏览器 smoke 候选，但不在第一阶段引入 Playwright。

建议脚本：

```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

优先测试对象：

- `src/table/engine/AATree.ts`
- `src/table/engine/binaryArraySearch.ts`
- `src/table/engine/cellMerge.ts`
- `src/table/engine/columnTree.ts`
- `src/table/engine/rowSizeSystem.ts`
- `src/table/engine/usePagination.ts` 中可独立测试的小函数
- `getRowKey`、`getValueByDataIndex`

需要抽离后测试的逻辑：

- sorter：排序方向、排序状态收集、排序结果生成。
- filter：筛选值归一、筛选数据计算、filters 参数生成。
- tree：树数据 flatten、key 收集、记录查找。
- selection：树形联动、范围选择、受控/非受控转换。
- Table 适配层：列默认值、children 转 columns、sort/filter 状态写回列树。

验收标准：

- 新增测试可以在本地稳定运行。
- 第一批纯逻辑测试覆盖核心边界条件，而不是只测 happy path。
- 后续重构前必须先跑 `pnpm run tsc`、`pnpm run lint`、`pnpm run test`。

## 阶段 1：借鉴 antd 的测试方式

目标：借鉴 antd 面向公开 API 的行为回归思路，不照搬其内部 DOM 结构测试。

> 现状：Playwright smoke 层已落地为 `e2e/` 目录 + [`playwright.config.ts`](../playwright.config.ts)。配置使用本机已有 Chrome（`G:\Program Files\ChromeCon\chrome.exe`），`fullyParallel:false`、`retries:0`，`webServer` 启动 `pnpm dev`（默认 5173，可用 `E2E_PORT` 覆盖）；`.npmrc` 设 `playwright_skip_browser_download=1` 跳过浏览器下载；`pnpm run test:e2e` 已纳入 scripts。当前 6 个 smoke 用例覆盖 `basic` / `fixed-columns` / `virtual-list` / `drag-sorting` / `tree-data` / `filter-in-tree`。

适合借鉴：

- 围绕公开 API 建立行为测试。
- 对排序、筛选、分页、选择、展开、树形、locale、空态等核心行为做回归。
- 把关键 demo 的数据和配置沉淀为测试样例。
- 针对兼容矩阵 P0/P1 项写测试。

不建议借鉴：

- 不测试 antd 原生 table DOM 结构，因为 data-grid 的 DOM 语义和布局模型不同。
- 不一开始引入完整视觉截图矩阵。
- 不把所有 demo 都变成测试。

第二批测试栈建议：

- `@testing-library/react`
- `@testing-library/user-event`
- `@testing-library/jest-dom`
- `jsdom`

真浏览器回归策略：

Playwright 只用于难以通过 Vitest/jsdom 稳定验证的场景，例如真实布局尺寸、sticky/fixed columns、虚拟滚动、拖拽、ResizeObserver、横向滚动条、dark theme 视觉状态。普通点击、回调、数据变换和公开 API 行为优先用 Vitest 或 Testing Library。

如果引入 Playwright，必须使用本机已有 Chrome，避免维护第二份浏览器：

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  use: {
    browserName: 'chromium',
    launchOptions: {
      executablePath: 'G:\\Program Files\\ChromeCon\\chrome.exe',
    },
  },
})
```

Playwright 用例数量应保持很少，只做 smoke 和难测路径，不承担主测试层职责。

真浏览器 smoke 候选：

- basic table
- fixed columns
- virtual list
- row selection
- filter dropdown
- pagination
- row drag / column drag
- dark theme

## 阶段 2：拆分 `Table.tsx`

目标：让 `Table.tsx` 回到兼容层编排职责。

拆分方向与现状：

- `tokenBridge.ts`：antd token、CSS variables、Table component token 转换。**已外提**到 [`src/table/tokenBridge.ts`](../src/table/tokenBridge.ts)。
- `columnAdapter.ts`：children 转 columns、列默认值、哨兵列插入、column key 生成。**已外提**到 [`src/table/columnAdapter.ts`](../src/table/columnAdapter.ts)。
- `sortFilterAdapter.ts`：sort/filter 状态写回 engine column tree。**已外提**到 [`src/table/sortFilterAdapter.ts`](../src/table/sortFilterAdapter.ts)。
- `selectionAdapter.ts`：antd `rowSelection` 与 `gridOptions.selection` 的桥接。**已外提**到 [`src/table/selectionAdapter.tsx`](../src/table/selectionAdapter.tsx)。
- `paginationAdapter.tsx`：pagination 配置归一、位置解析、分页节点渲染。**已外提**到 [`src/table/paginationAdapter.tsx`](../src/table/paginationAdapter.tsx)。
- `emptyLoadingAdapter.tsx`：empty、loading、Spin 相关处理。**已外提**到 [`src/table/emptyLoadingAdapter.tsx`](../src/table/emptyLoadingAdapter.tsx)。
- `expandAdapter.tsx`：展开列与 expandState 构造。**已外提**到 [`src/table/expandAdapter.tsx`](../src/table/expandAdapter.tsx)。
- `tableLayoutResolver.ts`：antd `mergedTableLayout` 等价派生（显式 prop 优先、fixColumn×scroll.x 矩阵、哨兵列跳过）。**已外提**到 [`src/table/tableLayoutResolver.ts`](../src/table/tableLayoutResolver.ts)。
- `useResponsiveColumns.ts`：antd `InternalTable.tsx` 断点过滤的等价 hook（无 `responsive` 时短路保持 `columns` 引用稳定）。**已外提**到 [`src/table/useResponsiveColumns.ts`](../src/table/useResponsiveColumns.ts)。
- `useSemanticClassNames.ts`：`classNames` / `styles` 归一（对象或函数）+ `engineSemantic` 子集（section/content/header/body）派生。**已外提**到 [`src/table/useSemanticClassNames.ts`](../src/table/useSemanticClassNames.ts)。
- `useTableThemeVars.ts`：封装 token 到 CSS variables 的桥接（`useAntdInternalToken` + 4 个 `tokenBridge` 依赖集中于此），输出 `aliasTokenVars` / `tableTokenVars` / 合并后的 `wrapperStyle`。**已外提**到 [`src/table/useTableThemeVars.ts`](../src/table/useTableThemeVars.ts)。
- `refAdapter.ts`：`TableRef.scrollTo` 到 engine handle 的桥接。**未外提**——目前仍内联在 `Table.tsx`，待后续按需提取。
- `useTablePipeline.ts`：组合 columns、sorter、filter、tree、selection、pagination 等状态流水线；仅在依赖变化时重算。**未外提**——目前仍以多个独立 hook 形式分布在 `Table.tsx` 内，未做集中 pipeline 封装。

约束：

- 第一轮拆分只移动代码，不改行为。
- 每次拆分保持小步提交。
- 拆分前后至少跑类型、lint、单元测试。
- 涉及 DOM 或交互行为时补对应测试后再移动。
- 优先拆 adapter、utils、hooks；只要没有进入 cell/scroll/drag 热点路径，轻微函数边界成本可以接受。

验收标准：

- `Table.tsx` 主要负责 props 解构、hook 编排和渲染组合。
- antd 内部 API 依赖集中在一个可审计模块中。
- public API 不变。

## 阶段 3：拆分 `GridTable.tsx`

目标：降低渲染中枢复杂度，保留现有 CSS Grid 行为。

拆分方向与现状：

- `HeaderGrid.tsx` / `HeaderCell.tsx`：多级表头、排序/筛选入口、header cell 渲染。**已外提**到 [`src/table/engine/HeaderCell.tsx`](../src/table/engine/HeaderCell.tsx)（含 `ColumnResizer`）。
- `BodyGrid.tsx`：body cell、row class/style、components.body 适配。**已外提**到 [`src/table/engine/BodyGrid.tsx`](../src/table/engine/BodyGrid.tsx)（`renderBodyCells` + 内部 `BodyCell`）。
- `FlatColumnCells.tsx`：flat 路径 ColumnCells 单层快速渲染。**已外提**到 [`src/table/engine/FlatColumnCells.tsx`](../src/table/engine/FlatColumnCells.tsx)。
- `StickyScrollBar.tsx`：sticky 横向滚动条组件。**已外提**到 [`src/table/engine/StickyScrollBar.tsx`](../src/table/engine/StickyScrollBar.tsx)。
- `ScrollContainer.tsx`：scroll.x、scroll.y、sticky viewport、浮动滚动条容器三分支路由（sticky clip-viewport + StickyScrollBar + summary-grid / 不可达 sticky fallback / FloatingScrollBar 横向）。**已外提**到 [`src/table/engine/ScrollContainer.tsx`](../src/table/engine/ScrollContainer.tsx)。
- `SummaryLayer.tsx`：summary 解析和渲染。**已外提**到 [`src/table/engine/SummaryLayer.tsx`](../src/table/engine/SummaryLayer.tsx)。
- `ExpandLayer.tsx` / `expandLayoutUtils.ts` / `expandLayerUtils.tsx`：展开行内容、track 与展开布局工具。**已外提**到 [`src/table/engine/expandLayoutUtils.ts`](../src/table/engine/expandLayoutUtils.ts) / [`src/table/engine/expandLayerUtils.tsx`](../src/table/engine/expandLayerUtils.tsx)。
- `gridTemplate.ts`：grid-template-rows / columns 纯计算。**已外提**到 [`src/table/engine/gridTemplateColumnsUtils.ts`](../src/table/engine/gridTemplateColumnsUtils.ts) / [`src/table/engine/headerHeightUtils.ts`](../src/table/engine/headerHeightUtils.ts)（列宽 / 表头高度）。
- `hoverController.ts`：行 hover 管理。**已外提**到 [`src/table/engine/hoverController.ts`](../src/table/engine/hoverController.ts)。
- `cellRenderUtils.ts`：封装 className/style/ellipsis/title 等纯计算。**已外提**到 [`src/table/engine/cellRenderUtils.tsx`](../src/table/engine/cellRenderUtils.tsx) / [`src/table/engine/bodyCellUtils.ts`](../src/table/engine/bodyCellUtils.ts)。
- `useScrollMode.ts`：sticky / virtual / 容器内固定表头的互斥派生（产出 `headerStickyTop` + `stickyHeaderOffset`）。**已外提**到 [`src/table/engine/useScrollMode.ts`](../src/table/engine/useScrollMode.ts)。
- `useRowHeightSystem.ts`：行高派生 + 有界行高模型 + `getRowHeight` / `effectiveRowHeight` 回调（热路径，使用稳定 ref）。包含同文件内的 `useEffectiveRowHeight`（依赖 `virtualState.sizeOf`，分两阶段）。**已外提**到 [`src/table/engine/useRowHeightSystem.ts`](../src/table/engine/useRowHeightSystem.ts)。
- `useGridLayout.ts`：封装列轨道、行轨道、summary 行、padding 行等布局派生值（grid-template-rows/columns/auto-flow `useMemo`）。**已外提**到 [`src/table/engine/useGridLayout.ts`](../src/table/engine/useGridLayout.ts)——通过把整个闭包作为单一 options 对象传入、deps 数组按字节对齐，绕开了"需传回 ~6 个值"的负收益问题。
- `useGridScrollSync.ts`：封装 sticky viewport、横向滚动条、scrollLeft 同步（`stickyScrollLeft` state + `onStickyViewportWheel` 回调 + `stickyTranslateStyle` 派生）。**已外提**到 [`src/table/engine/useGridScrollSync.ts`](../src/table/engine/useGridScrollSync.ts)。
- 辅助工具：`gridScrollUtils.ts` / `resizeColumnUtils.ts` / `treeIndentRenderer.tsx` / `treeColumnUtils.ts` 等小颗粒纯计算与渲染片段也已外提到 `src/table/engine/` 下相应模块，便于 Vitest 直接覆盖。

约束：

- 先拆纯计算和纯渲染片段，再动滚动、RAF、ResizeObserver、drag 相关代码。
- 任何涉及虚拟滚动、sticky、合并、拖拽的移动都要有测试或手动回归记录。
- 不在拆分过程中顺手重写布局算法。
- 对每 cell 执行的逻辑优先拆成纯 utils，而不是新增大量 React 组件层级；对 scroll/drag 每帧路径，拆分前先确认不会增加布局读取、闭包分配或 React state 更新。

验收标准：

- `GridTable.tsx` 不再同时包含所有区域渲染和所有布局计算。
- header/body/summary/scroll 的职责边界清晰。
- 已知限制文档中的重点组合仍可复现并验证。

## 阶段 4：类型边界整理

目标：减少 public API、native options、engine internal types 之间的耦合。

建议拆分方向：

- `publicTypes.ts`：对外导出的 antd-compatible 类型。
- `nativeOptions.ts`：`gridOptions` 和 data-grid 专属能力。
- `engineTypes.ts`：engine 内部 column、selection、tree、virtual、sticky 类型。
- `compatTypes.ts`：与 antd 类型兼容相关的适配类型。

约束：

- 不追求一次性消灭所有 `any` 和 `as unknown as`。
- 每次只收敛一个边界。
- 对外导出路径保持兼容，必要时由 `src/table/types.ts` 做 re-export。

验收标准：

- 使用方仍可从既有路径导入类型。
- engine 内部类型不再无意暴露为 public API。
- data-grid 原生命名空间和 antd 兼容命名空间更清楚。

## 阶段 5：性能基线和局部优化

目标：用数据决定是否优化，避免无依据重写。

优先建立基线：

- 10000 行虚拟列表。
- 虚拟列表拖拽。
- 宽表 fixed columns。
- 编辑单元格。
- 合并单元格。
- 树形数据 + 选择。

优先优化点：

1. hover：从 React state 驱动改为事件委托、ref 记录或 DOM class 切换，减少整表重渲染。
2. cell memo：让 `shouldCellUpdate` 真正进入默认 cell 路径。
3. `onCell` 缓存：避免合并计划和渲染阶段重复调用。
4. drag：拖拽期间缓存可见 cell/rect，pointermove 使用 ref 和 RAF 合帧，DOM transform 处理临时视觉，drop 后再提交 React 状态。
5. resize：如果列宽拖拽卡顿，拖拽中直接写 CSS 变量或 inline grid template，pointerup 后提交 React state。

不建议整体 TS 控件化，除非出现以下需求：

- 100k+ 行、200+ 列。
- 单元格主要是文本/数字，ReactNode 很少。
- 交互接近 spreadsheet/IDE，包含大范围选区、填充柄、公式、批量编辑、键盘导航。
- 需要跨 React/Vue/非前端宿主复用同一个 grid core。

## 阶段 6：react-doctor 接入

目标：补充 React 语义和工程风险扫描。

建议方式：

1. 先本地或 CI advisory 模式运行。
2. 配置 `blocking: none`。
3. 首次评估使用 `--no-telemetry`。
4. 收集误报和噪音后，再考虑把 CI gate 提升为 `warning` 或 `error`。

定位：

- `react-doctor` 不能替代 `tsc`、Vite build、oxlint 或 Vitest。
- 它适合补 hooks/effects、render 性能、a11y、安全和 React correctness 风险。
- 初期只作为诊断报告，不作为强阻断。

## 阶段 7：live editor 风险隔离

目标：明确 demo live editor 的安全边界。

当前判断：

- 如果 live editor 只用于本地 demo 和内部对照，保留现状可以接受，但要在文档中说明风险边界。
- 如果要暴露给外部用户，需要改成 iframe、worker 或其它 sandbox 方案。

任务：

- 为 `src/live` 增加安全边界说明。
- 明确 scope 白名单策略。
- 禁止把 live editor 的执行模型用于非受信输入场景。

## 推荐执行顺序

1. 新增 Vitest 和第一批纯逻辑测试。
2. 把 `pnpm run test` 纳入日常验证。
3. 接入 `react-doctor` advisory 模式。
4. 建立少量真浏览器 smoke 候选清单，仅难以用 Vitest/jsdom 覆盖的场景才使用 Playwright，并指定 `G:\Program Files\ChromeCon\chrome.exe`。
5. 拆 `Table.tsx` 的 token、column、pagination、ref 适配模块。
6. 拆 `GridTable.tsx` 的 header/body/summary/scroll 区域。
7. 整理类型边界。
8. 做性能基线，再按热点优化。

## 完成标准

长期工程化完成不以“文件变少”作为标准，而以以下结果作为标准：

- 核心纯逻辑有单元测试保护。
- 关键公开行为有组件或浏览器回归保护。
- `Table.tsx` 和 `GridTable.tsx` 的职责边界明显收敛。
- antd 内部 API 依赖集中、可审计。
- public API、native options、engine internal types 分层清晰。
- 性能优化有基线、有目标、有回归验证。
- `react-doctor`、`tsc`、oxlint、Vitest 各自承担清晰职责。
