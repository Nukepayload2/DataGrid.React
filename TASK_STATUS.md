# 黑盒测试层任务状态（antd 方式）

计划真理源：`C:\Users\19393\.claude\plans\antd-table-compiled-phoenix.md`

## 状态图例
- [ ] TODO / [x] DONE / [~] 进行中 / [!] 验证未过

## Phase 1 — 基建 + 基础 + demo 遍历

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| P1-0 | main: pnpm add -D axe-core | [x] | axe-core 4.13.0 已装入（`--store-dir G:\.pnpm-store`，因 node_modules 链自该 store）；package.json devDeps + pnpm-lock.yaml 随之更新；附带把 jest-dom/user-event/@types/react-dom 三个 devDep 提到各自 range 内最新补丁版 |
| P1-1 | vite.config.ts test.exclude 追加 `tests/shared/**` | [x] | exclude 现为 `[...configDefaults.exclude, 'e2e/**', 'tests/setup.ts', 'tests/shared/**']` |
| P1-2 | package.json scripts 加 `"test:types": "vitest --typecheck --run"` | [x] | 位于 test:coverage 之后；axe-core 依赖由用户 pnpm add |
| P1-3 | tests/shared/polyfill.ts + dom.ts（从 Table.public-api.tsx:8-68 提取） | [x] | polyfill.ts 副作用模块；dom.ts 导出 setElementWidth/pointer，原 Table.public-api.tsx 未动 |
| P1-4 | tests/shared/render.tsx（customRender StrictMode + renderWithConfig ConfigProvider） | [x] | 顶部 import './polyfill' 副作用；不包 app 壳 ThemeProvider |
| P1-5 | tests/shared/fakeTimers.ts（useFakeTimersSafe + waitFakeTimer） | [x] | shouldAdvanceTime:true；注释标明弹窗/动画用真 timers |
| P1-6 | tests/shared/mountTest.tsx | [x] | antd 逐行等价（describe+rerender+unmount） |
| P1-7 | tests/shared/directionTest.tsx（skip 占位） | [x] | it.skip 带注释引 known-limitations: rtl |
| P1-8 | tests/shared/roMock.ts（可回调 RO 替换） | [x] | withResizeObserver(callbacks) 返回 {observers, restore}，实例带 trigger() |
| P1-9 | tests/shared/axe.ts（axe-core 封装） | [x] | expectNoAxeViolations(container, disabledRules)，失败信息带 violation 摘要；恒定禁用 jsdom 无能力评估的 `color-contrast`，并传 `resultTypes: ['violations']`（不传会在 7000 节点 demo 上退化为 >10 分钟不返回） |
| P1-10 | tests/shared/demoHarness.tsx（mountAll/snapshotAll/extendAll/axeAll，registry 驱动） | [x] | registry 驱动 66 demo；compare 侧取左栏 data-grid（`resolveSnapshotTarget` 快照 / `resolveA11yScope` a11y，自定义堆叠布局的 compare demo 退化为容器内首个 `.dg-wrapper`）；antd 对照 demo 在 snapshot/axe 默认 skip；各 runner 显式单测预算（mount/snapshot/extend 30s、a11y 120s）；弹窗快照前剥离 rc-motion 过渡态类 + 轮询等收敛 |
| P1-11 | tests/table/features/Table.test.tsx（30 用例，skip 带注释） | [x] | 直测 22 + skip 10 = 32（antd 30 its：直测 21 + skip 9，另 mountTest 1 直测 + direction 占位 1 skip），skip 均带注释（src 文件:行号依据） |
| P1-12 | tests/table/features/empty.test.tsx（6 用例） | [x] | 直测 7 + skip 1 = 8（antd 6 its：直测 5 + skip 1「loading 不抑制 empty 为行为差异」，另 2 个 data-grid 特有直测），skip 均带注释 |
| P1-13 | tests/table/features/demo.test.tsx（挂载 + registry 一致性） | [x] | mountAll 全量 66 + name kebab-case/唯一 + **抽片完整性**（每个 demo 恰进一个快照片）4 用例；快照职责已拆出（见 P1-13b） |
| P1-13b | 快照基线按类目拆分（14 类 → 14 文件 + 14 个 `.snap`） | [x] | 抽片表 `tests/shared/demoGroups.ts`（类目→slug，未登记类目直接抛错）；快照对象由全量 HTML 改为**结构摘要**（见下方「快照基线重设计」） |
| P1-14 | 弹窗展开按类目拆分（14 文件 + 14 个 `.snap`） | [x] | `extendDemos` 按同一抽片表取片；弹窗快照确定性处理见 harness（过渡态类归一 + 轮询等收敛） |
| P1-15 | tests/table/features/a11y.test.tsx（66 遍历，triage） | [x] | axeAll 全量遍历；首跑 11 条违规逐条取证后收敛为 6 条架构边界 skip（`demoHarness.tsx` 的 `A11Y_ROOT_CAUSE_SKIP` + 根因注释）；另修 2 条真缺陷（见下方轮次记录） |

## Phase 2 — 四大厚域全量对齐

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| P2-0 | ⚠️ 探针用例定级（计划「需先验证」清单 10 项） | [ ] | 先于正式用例 |
| P2-1 | Table.sorter.test.tsx（40 对齐） | [ ] | |
| P2-2 | Sorter.value.test.tsx（2） | [ ] | |
| P2-3 | Table.filter.test.tsx（90 对齐） | [ ] | 最大成本域 |
| P2-4 | Table.rowSelection.test.tsx（74 对齐） | [ ] | |
| P2-5 | Table.pagination.test.tsx（38 对齐） | [ ] | |

## Phase 3 — 其余域 + 洼地超越 + 截图

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| P3-1 | Table.expand.test.tsx（超越洼地） | [ ] | |
| P3-2 | Table.virtual.test.tsx（超越洼地） | [ ] | |
| P3-3 | Table.order.test.tsx（2） | [ ] | |
| P3-4 | Table.size-locale.test.tsx（10） | [ ] | |
| P3-5 | Table.summary.test.tsx（8） | [ ] | |
| P3-6 | semantic.test.tsx（4，data-grid 字段集） | [ ] | |
| P3-7 | type.test-d.tsx（6，expectTypeOf） | [ ] | |
| P3-8 | e2e/screenshots.spec.ts（66×2 主题） | [ ] | 基线 main 生成 |
| P3-9 | package.json test:types 验收（vitest --typecheck） | [ ] | |

## 验收记录

| 轮次 | 命令 | 结果 |
|------|------|------|
| Round A 静态对账（verify-p1-infra） | 无（静态核查） | P1-1~P1-8、P1-10 全 PASS；P1-9 代码对但 axe-core 依赖缺失（阻断，待装） |
| Round B 静态对账（verify-p1-features） | 无（静态核查） | 14 PASS + 1 DEFERRED（git 侧兜底）；antd 30+6 its 逐条对齐无遗漏，11 个 skip 证据抽查 12 条全属实 |
| Round C 静态对账（verify-p1-demos） | 无（静态核查） | 12 PASS + 1 DEFERRED；axeAll 4 禁用规则确内置于 harness:122；低危：a11y 注释「对齐 antd 基线」措辞略夸大（首跑 triage 时顺手修） |
| Round D 首跑动态验收 | `pnpm add -D axe-core && pnpm test` | axe-core 4.13.0 装入；**201 快照生成；13 失败**（11 a11y + 2 snapshot）；根因 3 条见下方「D 轮发现与修复」 |
| Round E a11y triage + 修复后复跑 | `pnpm test` + `pnpm run tsc` | **全绿**：83 文件 / 1359 通过 / 11 skip（含 css-compat）；`tsc -b` exit 0；耗时 **72s**（首跑 1279s）；现有 79 白盒文件与 `tests/setup.ts` 零改动 |
| Round F 确定性复验 | `vitest run tests/table/features/` ×3 + `pnpm test` ×2 | 遍历层连续 3 次全绿；全量连续 2 次全绿（110 文件 / 1360 通过 / 11 skip）；`pnpm run lint` 0 警告 0 错误（533 文件）；`tsc -b` exit 0 |
| Round G 快照基线重设计 | `pnpm test` ×2 + 体量实测 | 单文件 3.5MB/91398 行 → 30 文件合计 **185KB/约 2250 行**，单文件最大 99 行（demo 快照）；连续 2 次全量全绿 |

## 快照基线重设计（Round G，用户指出「九万行快照不可维护」后返工）

**问题**：首版把 66 个 demo 的全量 DOM 快照堆进一个文件 —— 3505KB / 91398 行，`fixed-columns-and-header` 单条 28236 行。不可 review、回归无法定位。

**实测的体量构成**（先量后改，不凭感觉）：
- 主题张量占 26.6%：每张表根元素内联整份 `--ant-*` 张量（450 个 token、单块 14.8KB），全库 27852 条声明去重后仅 450 对（`--ant-color-primary` 等各只有 1 种取值）；
- 其余主体是渲染规模本身：`fixed-columns-and-header` 单 demo 有 **2323 个 `dg-cell`**（23 列 × 101 行 × 固定列/粘性表头分层）。**全量 HTML 在这种规模下无法既完整又可维护**。

**处置**（两条一起做）：
1. **按 registry 类目拆文件**（14 类 → 14 个 `demo-snapshot.<slug>.test.tsx` + 14 个 `demo-extend.<slug>.test.tsx`，各带同名 `.snap`）。粒度按定位成本定：一个改动影响哪几个类目的 demo，就恰好哪几个文件对比不过，失败文件清单本身就是定位信息。
2. **快照对象改为结构摘要**（`buildDemoStructureDigest`）：根 class / 节点·行·格·表头格计数 / 网格轨道数 / 列序（表头列键按 DOM 序）/ 行索引游程 / 跨列与合并跨度分布 / 固定列·选择列·展开列·汇总·滚动条等结构件计数 / 与 token 基线不同的主题覆盖 / 标签直方图。每 demo 约 12 行、可读、diff 指向具体字段。

**权衡（显式记录）**：摘要不含单元格文本与属性书写顺序 —— 内容/文案类回归由功能用例承担，不靠快照兜。换来的是基线可 review、回归可定位。

**守卫**：`demoGroups.ts` 的 `DEMO_CATEGORY_SLUGS` 未登记的新类目会抛错；`demo.test.tsx` 另有「每个 demo 恰进一个片」用例——新增 demo 不会静默漏测。

## D 轮发现与修复（3 条根因）

| # | 症状 | 根因（实测证据） | 处置 |
|---|------|------------------|------|
| 1 | `snapshot page-sticky-header` / `snapshot semantic-dom-slots` 报 `expected null not to be null` | harness 把 `compare: true` 当成 SplitDemo 结构，这两个 demo 是「data-grid 表 + antd 表同文档流堆叠」（61 个 compare demo 中唯二不用 SplitDemo） | 新增 `resolveSnapshotTarget`：SplitDemo 走左栏 pane，自定义 compare 布局退化为「容器内首个 `.dg-wrapper`」；非 compare 仍原样取 container |
| 2 | a11y 遍历 >21 分钟不收敛（`axe fixed-columns-and-header` 单条 1173991ms） | 两因叠加：① `axe.run` 未传 `resultTypes`，axe 在 7000+ 节点上构建全部 passes/incomplete/inapplicable 结果组（实测 >10 分钟不返回，只取 `['violations']` 后同 demo <20s）；② jsdom 无 canvas，`color-contrast` 退化为逐元素重试 | `axe.ts` 恒定禁用 `color-contrast` + 传 `resultTypes: ['violations']`；harness 给 a11y 单测显式预算 120s（vitest 默认 5s 不够渲染+扫描） |
| 3 | `extend` 弹窗快照抖动（单跑 3 次绿，全量跑偶发 1–10 条失败；`-u` 后二次运行仍可失败） | 两个独立时序源：① rc-motion 过渡态类（`ant-slide-up-appear-active` 等）在 jsdom 里**永不脱落**（transitionend 不触发，静置 2.4s 仍挂着），挂哪一档取决于点击间隔；② `motionDeadline` 后才移除的 `-start` 标记在点击后 ~300ms 内消失，早取即含它 | ① 快照前 `normalizeMotionClasses` 统一剥离过渡态类；② `settlePopupHtml` 轮询「连续 3 次取值一致」等收敛（上限 5s），不用固定 sleep；`waitFor` 只等弹窗挂载 |

## D 轮 a11y triage 结论（11 条 → 6 条 skip + 2 条真修 + 3 条归属修正）

- **修 2 条真缺陷**：① `FilterDropdown.tsx` 触发器补 `role="button"` + `tabIndex={-1}` + `aria-label="Filter"`（纯图标触发器在 antd Dropdown 标记为可聚焦控件后无名，`column.filterIcon` 传裸 svg 的列必违规；只加 `aria-label` 会触发 `aria-prohibited-attr`，二者必须成对）；② `semantic-dom-slots` demo 标题 `h5`→`h4`（跳级）+ `index.css` 同步选择器。
- **归属修正 1 条**：`custom-filter-panel` 的 `aria-command-name` 全部来自**右栏 antd 对照表**（祖先链 `div.ant-table > … > th.ant-table-filter-column`），左栏扫描本已 clean → a11y 扫描域收窄到 data-grid 侧（新增 `resolveA11yScope`，与 snapshotAll 同判据同理据）。
- **保留 skip 6 条**：`aria-colspan`/`aria-rowspan`/`aria-sort` 落在无 role 格子 div 上（`BodyGrid.tsx:208-209`、`HeaderCell.tsx:260`）。补 role 实测立刻变 `aria-required-parent`（缺 `role=row` 祖先），而 CSS Grid 无行容器元素；合法化需整条 ARIA 链，属结构级改动。**用户裁定本次不修**，记入 `demoHarness.tsx` 的 `A11Y_ROOT_CAUSE_SKIP` 常量 + 根因注释。

## 交接状态（2026-09-21，本轮收尾）

**Phase 1 DONE**：15 项全部完成；`pnpm test` / `pnpm run tsc` 全绿；快照已生成并逐条核对差异（改动面仅 `aria-label`/`role`/`tabindex` 三属性与过渡态类归一，无意外内容）。

**下一步 = Phase 2，P2-0 探针先行**：计划「⚠️ 需实施时先验证再定级」10 项清单，先写探针用例跑一遍定级，再写正式用例。随后按域推进 P2-1~P2-5（sorter 40 → Sorter.value 2 → filter 90 → rowSelection 74 → pagination 38）。

**永久约束（继续遵守）**：
- Vortex 循环：implementer/verifier 串行交替，main 只调度；子 agent 无 Bash，`pnpm test` / `pnpm run tsc` / `pnpm add` 由 main 执行；并发 ≤ 4
- 所有 `it.skip`/`describe.skip` 必须带注释（无注释 skip = 未完成）；skip 措辞引 known-limitations 或 src 文件:行号证据
- 用例清单与 antd 同文件逐条对齐（直测 + skip = antd 用例数）
- 支持矩阵与选择器重映射规则见计划文件（顶部「计划真理源」路径）；scroll.y 仅 `true`；portal 内容用 `screen` 查询

**环境注意**：
- pnpm store 在 `G:\.pnpm-store`（node_modules 链自该 store）；装依赖须 `pnpm add … --store-dir G:\.pnpm-store`，否则报 `ERR_PNPM_UNEXPECTED_STORE`
- `--store-dir <工作区内路径>` 不可再用于临时试装（会产生本地 store 残留，需手工清理）
- a11y 断言面用 `resultTypes: ['violations']`；新增 a11y 用例若扫描域大，务必沿用该 opts，否则会退化为分钟级挂起
