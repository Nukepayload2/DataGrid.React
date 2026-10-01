# 黑盒测试层任务状态（antd 方式）

计划真理源：`~/.claude/plans/antd-table-compiled-phoenix.md`（本机 Claude 计划文件，未随仓库分发）

> **本页的时效边界**：「已知行为缺口」表、「一、已落地但没有独立验证者」、「四、剩余待办」三节是 **2026-09-28 的台账快照**——此后落地的批次已修掉其中多条，另有若干条**登记本身被实测推翻**（写了"偏离 antd"实为一致）。这三节里的行**不许直接当派工前提**；
> 引用前先取当前读数：`node tmp/anchor-audit.mjs`（指针与死引用）、`node tmp/check-skips.mjs`（跳过依据计数）。
> 门读数看**第七节**——它按「快照时刻＋失效规则」写法给出，引用时连快照时刻一起引，不把它当"现在"。
> 行为级结论一律以 `docs/reference/known-limitations.md` 与 `docs/features/**` 为准。

## 状态图例
- [ ] TODO / [x] DONE / [~] 进行中 / [!] 验证未过

## Phase 1 — 基建 + 基础 + demo 遍历

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| P1-0 | main: pnpm add -D axe-core | [x] | axe-core 4.13.0 已装入（`--store-dir` 指本机 pnpm store 根，因 node_modules 链自该 store；路径随机器，见本机 pnpm 配置）；package.json devDeps + pnpm-lock.yaml 随之更新；附带把 jest-dom/user-event/@types/react-dom 三个 devDep 提到各自 range 内最新补丁版 |
| P1-1 | vite.config.ts test.exclude 追加 `tests/shared/**` | [x] | exclude 现为 `[...configDefaults.exclude, 'e2e/**', 'tests/setup.ts', 'tests/shared/**']` |
| P1-2 | package.json scripts 加 `"test:types": "vitest --typecheck --run"` | [x] | 位于 test:coverage 之后；axe-core 依赖由用户 pnpm add。**该 script 原本是空跑，已在 P3-9 修好** |
| P1-3 | tests/shared/polyfill.ts + dom.ts（从 Table.public-api.tsx:8-68 提取） | [x] | polyfill.ts 副作用模块；dom.ts 导出 setElementWidth/pointer，原 Table.public-api.tsx 未动 |
| P1-4 | tests/shared/render.tsx（customRender StrictMode + renderWithConfig ConfigProvider） | [x] | 顶部 import './polyfill' 副作用；不包 app 壳 ThemeProvider |
| P1-5 | tests/shared/fakeTimers.ts（useFakeTimersSafe + waitFakeTimer） | [x] | shouldAdvanceTime:true；注释标明弹窗/动画用真 timers |
| P1-6 | tests/shared/mountTest.tsx | [x] | antd 逐行等价（describe+rerender+unmount） |
| P1-7 | tests/shared/directionTest.tsx（skip 占位） | [x] | it.skip 带注释引 known-limitations: rtl |
| P1-8 | tests/shared/roMock.ts（可回调 RO 替换） | [x] | withResizeObserver(callbacks) 返回 {observers, restore}，实例带 trigger()。**P3-9 期间补了 `devicePixelContentBoxSize`（`ResizeObserverEntry` 必填字段），导出面未变** |
| P1-9 | tests/shared/axe.ts（axe-core 封装） | [x] | expectNoAxeViolations(container, disabledRules)，失败信息带 violation 摘要；恒定禁用 jsdom 无能力评估的 `color-contrast`，并传 `resultTypes: ['violations']`（不传会在 7000 节点 demo 上退化为 >10 分钟不返回） |
| P1-10 | tests/shared/demoHarness.tsx（mountAll/snapshotDemos/extendDemos/axeAll，registry 驱动） | [x] | registry 驱动 66 demo；compare 侧取左栏 data-grid（`resolveSnapshotTarget` 快照 / `resolveA11yScope` a11y，自定义堆叠布局的 compare demo 退化为容器内首个 `.dg-wrapper`）；antd 对照 demo 在 snapshot/axe 默认 skip；各 runner 显式单测预算（mount/snapshot/extend 30s、a11y 120s）；弹窗快照前剥离 rc-motion 过渡态类 + 轮询等收敛 |
| P1-11 | tests/table/features/Table.test.tsx（30 用例，skip 带注释） | [x] | 直测 22 + skip 10 = 32（antd 30 its：直测 21 + skip 9，另 mountTest 1 直测 + direction 占位 1 skip），skip 均带注释（src 文件:行号依据）。**P3-9 期间：`align:'right'`→`'end'`（antd 用 left/right、data-grid 用逻辑值，见下「已知行为缺口 #13」），另 3 处 `Element.style` 类型窄化** |
| P1-12 | tests/table/features/empty.test.tsx（6 用例） | [x] | 直测 7 + skip 1 = 8（antd 6 its：直测 5 + skip 1「loading 不抑制 empty 为行为差异」，另 2 个 data-grid 特有直测），skip 均带注释 |
| P1-13 | tests/table/features/demo.test.tsx（挂载 + registry 一致性） | [x] | mountAll 全量 66 + name kebab-case/唯一 + **抽片完整性**（每个 demo 恰进一个快照片）4 用例；快照职责已拆出（见 P1-13b） |
| P1-13b | 快照基线按类目拆分（14 类 → 14 文件 + 14 个 `.snap`） | [x] | 抽片表 `tests/shared/demoGroups.ts`（类目→slug，未登记类目直接抛错）；快照对象由全量 HTML 改为**结构摘要**（见下方「快照基线重设计」） |
| P1-14 | 弹窗展开按类目拆分（14 文件 + 14 个 `.snap`） | [x] | `extendDemos` 按同一抽片表取片；弹窗快照确定性处理见 harness（过渡态类归一 + 轮询等收敛） |
| P1-15 | tests/table/features/a11y.test.tsx（66 遍历，triage） | [x] | axeAll 全量遍历；首跑 11 条违规逐条取证后收敛为 6 条架构边界 skip（`demoHarness.tsx` 的 `A11Y_ROOT_CAUSE_SKIP` + 根因注释）；另修 2 条真缺陷（见下方轮次记录） |

## Phase 2 — 四大厚域全量对齐

对账口径：`直测 + skip = antd 源文件用例数`。antd 源里本身没有 skip 的用例，故全部要在本层占位。

| # | 任务 | 状态 | 对账（antd = 直测 + skip） | 备注 |
|---|------|------|---------------------------|------|
| P2-0 | 探针用例定级（计划「需先验证」10 项） | [x] | — | 10 项全部实测定级，结论见下方「P2-0 探针定级结论」 |
| P2-1 | `tests/table/features/Table.sorter.test.tsx` | [x] | 40 = 31 + 9 | 另加 3 条 data-grid 补测（原生 title 提示 / 多列优先级徽标 / 列级 sortDirections 循环）= 43 it |
| P2-2 | `tests/table/features/Sorter.value.test.tsx` | [x] | 2 = 2 + 0 | 受控 useState 驱动 |
| P2-3 | `tests/table/features/Table.filter.test.tsx` | [x] | 90 = 69 + 21 | 最大成本域。antd 源的 88 处静态 `it(` 中有 2 处在会被多次调用的工厂内（L309 `function test(propName)` 调 2 次、L796 forEach 2 项），88−2+2+2=90 |
| P2-4 | `tests/table/features/Table.rowSelection.test.tsx` | [x] | 74 = 49 + 25 | skip 最集中的域（详见「已知行为缺口」行选择组） |
| P2-5 | `tests/table/features/Table.pagination.test.tsx` | [x] | **39** = 30 + 9 | **计划记的 38 有误**：实测 antd 源 `Table.pagination` 内 36 条 + `Table pagination placement` 内 3 条 = 39；本层另加 1 条 data-grid 形状补测 |

## Phase 3 — 其余域 + 洼地超越 + 截图

| # | 任务 | 状态 | 对账 | 备注 |
|---|------|------|------|------|
| P3-1 | `Table.expand.test.tsx` | [x] | antd 7 = 5 + 2 | 超越洼地：另加 13 条补充直测（受控 expandedRowKeys/onExpandedRowsChange、defaultExpandedRowKeys、defaultExpandAllRows、rowExpandable:false、expandedRowClassName、expandedRowOffset、fixed 展开列、EXPAND_COLUMN 哨兵、默认列序、树形互斥、showExpandColumn:false、expandRowByClick 行体点击、expandIcon 单独使用钉行为）= 20 it |
| P3-2 | `Table.virtual.test.tsx` | [x] | antd 6 = 4 + 2 | 超越洼地：另加 7 条（视口窗口裁剪 100 行 vs 17 行对照、`.dg-virtual-scroll` + `.dg-filler-row` 占位、ref.scrollTo 仅虚拟生效、`virtualizationMode:'recycling'`、virtual×scroll.x 正交、virtual×分页+筛选、无 `scroll.y` 降级）= 13 it |
| P3-3 | `Table.order.test.tsx` | [x] | antd 2 = 1 + 1 | 另加 1 条哨兵列位置直测 |
| P3-4 | `Table.size-locale.test.tsx` | [x] | 10 = 10 + 1 | antd 无同名文件，按 plan 目标条数撰写；skip 1 条（`filterTitle`/`sortTitle`/`selectAll` 无消费点） |
| P3-5 | `Table.summary.test.tsx` | [x] | 8 = 8 + 0 | 差异化重点：`summary` 函数收到**分页后**记录、`Table.Summary fixed` 的 sticky bottom、**virtual × summary 共存** |
| P3-6 | `semantic.test.tsx` | [x] | antd 3 → 4 + 1 | 断言面换成 data-grid 字段集（`useSemanticClassNames.ts:59-67` 的 13 个槽位表驱动）× class/style 双向 + 函数式 `info.props` 键集 + 槽位出现次数；skip 1 条（ConfigProvider 级 `table.styles` 无消费点） |
| P3-7 | `type.test-d.tsx` | [x] | 6 = 6 + 0 | 按 data-grid 自有类型写（非移植 antd）；`expectTypeOf` 写在 `it()` 内以同时满足 `pnpm test` 与 `pnpm test:types` 两种消费 |
| P3-8 | `e2e/screenshots.spec.ts`（66×2 主题） | [x] | 130 用例 | 65 个 demo × light/dark 两档（skip 纯 antd 对照 `dom-recycled-virtual-list-antd`）；基线 130 PNG / 11.17MB 进 git；二次运行比对通过（101s / 251s / 184s 三次全绿） |
| P3-9 | `package.json` test:types 验收 + 类型收口 | [x] | — | **发现并修复 `test:types` 空跑**（见下方「类型检查从空跑到生效」）；黑盒层 24 处类型错误清零；连带修 `tests/shared/roMock.ts` 1 处 |

## 验收记录

| 轮次 | 命令 | 结果 |
|------|------|------|
| Round A 静态对账（verify-p1-infra） | 无（静态核查） | P1-1~P1-8、P1-10 全 PASS；P1-9 代码对但 axe-core 依赖缺失（阻断，待装） |
| Round B 静态对账（verify-p1-features） | 无（静态核查） | 14 PASS + 1 DEFERRED（git 侧兜底）；antd 30+6 its 逐条对齐无遗漏，11 个 skip 证据抽查 12 条全属实 |
| Round C 静态对账（verify-p1-demos） | 无（静态核查） | 12 PASS + 1 DEFERRED；axeAll 4 禁用规则确内置于 harness:122；低危：a11y 注释「对齐 antd 基线」措辞略夸大（首跑 triage 时顺手修） |
| Round D 首跑动态验收 | `pnpm add -D axe-core && pnpm test` | axe-core 4.13.0 装入；**201 快照生成；13 失败**（11 a11y + 2 snapshot）；根因 3 条见下方「D 轮发现与修复」 |
| Round E a11y triage + 修复后复跑 | `pnpm test` + `pnpm run tsc` | **全绿**：83 文件 / 1359 通过 / 11 skip（含 css-compat）；`tsc -b` exit 0；耗时 **72s**（首跑 1279s）；现有 79 白盒文件与 `tests/setup.ts` 零改动 |
| Round F 确定性复验 | `vitest run tests/table/features/` ×3 + `pnpm test` ×2 | 遍历层连续 3 次全绿；全量连续 2 次全绿（110 文件 / 1360 通过 / 11 skip）；`pnpm run lint` 0 警告 0 错误（533 文件）；`tsc -b` exit 0 |
| Round G 快照基线重设计 | `pnpm test` ×2 + 体量实测 | 单文件 3.5MB/91398 行 → 30 文件合计 **190KB**，单文件最大 113 行；连续 2 次全量全绿 |
| Round H Phase 2 实施（4 域并行） | 各域 `npx vitest run <文件>`（域内 3–5 次复跑） | sorter 43 it / filter 90 / rowSelection 74 / pagination 39 全绿；**无 flaky**（filter 连续 5 次一致） |
| Round I Phase 3 实施（4 组并行） | 各文件 `npx vitest run <文件>` | expand 20 / virtual 13 / order 3 / size-locale 11 / summary 8 / semantic 5 / type 6 全绿 |
| Round J 截图基线生成 | `npx playwright test e2e/screenshots.spec.ts --update-snapshots` | **130 passed (4.7m)**，130 PNG / 11.17MB 写入 `e2e/screenshots.spec.ts-snapshots/` |
| Round K 截图确定性复验 + 全量 e2e | `npx playwright test e2e/screenshots.spec.ts` 再跑；`pnpm test:e2e` | 截图二次比对 **130 passed (4.1m)**；`pnpm test:e2e` 全量 **136 passed (3.0m)**（6 个原有 spec + 130 截图） |
| Round L 快照基线二次收口 | `npx vitest run tests/table/features -u` | 把主题张量从 5 个功能快照文件里剥掉：287,100 B → **78,962 B（−72%）**，明细见下方「快照基线重设计 · Round L」 |
| Round M 类型检查从空跑到生效 + 收口 | `npx tsc -p tsconfig.test.json --noEmit` / `pnpm test:types` | 黑盒层 24 处类型错误清零；`tsc -p tsconfig.test.json --noEmit` **exit 0**；`pnpm test:types` **exit 0**（123 文件 / 1609 通过 / 82 skip） |
| Round N 终验 | `pnpm test` + `pnpm run lint` + `npx tsc -b` + `pnpm test:types` + `pnpm test:e2e` + `vitest run --coverage` | 见下方「终验数字」；覆盖率对账 adapter 层 **零回退** |

### 终验数字

| 项 | Phase 1 结束 | Phase 2+3 结束 |
|---|---|---|
| `pnpm test` | 110 文件 / 1360 通过 / 11 skip（1371） | **122 文件 / 1603 通过 / 82 skip（1685）** |
| `pnpm test:types` | 空跑（无实际检查） | **123 文件 / 1609 通过 / 82 skip / Type Errors no errors** |
| `pnpm test:e2e` | 6 spec | **136 用例（6 spec + 130 截图）** |
| `pnpm run lint` | 0 警告 0 错误（533 文件） | 0 警告 0 错误（**547 文件**） |
| `npx tsc -b` | exit 0 | exit 0 |
| `src/table/**` 覆盖率 | lines 93.30% / branch 85.39%（110 文件口径复测） | **lines 94.62% / branch 86.97%** |
| 功能快照体量 | 5 文件 287,100 B | **5 文件 78,962 B** |

新增用例构成：314 个用例槽位（12 个新文件）+ 130 张截图基线。
Phase 1 的 6 条 a11y 架构边界 skip 保持不变。

## P2-0 探针定级结论（10 项，全部实测）

| # | 待验行为 | 实测结论 | 定级 |
|---|----------|----------|------|
| 1 | 筛选/排序后 `pagination.current` 是否复位为 1 | **不复位**。`innerCurrent` 只在分页器交互时更新（`engine/usePagination.ts:86-106`），筛选/排序路径不触碰分页 state；排序 onChange 注入的是 `paginationStateRef.current`（`Table.tsx:388-392`） | 直测（filter 2 条 + sorter 1 条 + pagination 2 条） |
| 2 | `onSelect` 是否收到 `nativeEvent` | **收到**，第 4 参为 `MouseEvent`（`type === 'click'`；`selectionAdapter.tsx:313,360,416` → `useSelectionAdapter.ts:290-295` 兜底 `new Event('change')`） | 直测 |
| 3 | 选中行高亮的类名 | 该行**全部格**加 `.dg-cell-body.dg-row-selected`（`engine/BodyGrid.tsx:183-184` + `style/table.css:366`） | 直测 |
| 4 | `filterDropdownProps.onOpenChange` 是否被消费 | **被消费，但只在用户交互时回调**：点触发器 → `[true]`；程序化 `confirm()`/`close()` 关闭 → 不回调（`engine/FilterDropdown.tsx:327-346`） | 直测（把 antd 的「回调次数」断言换成 `.ant-dropdown-open` 可观测断言） |
| 5 | `clearFilters`/`confirm` 是否接受 `{confirm, closeDropdown}` | **接受，四组合语义与 antd 一致**（`FilterDropdown.tsx:355-379`）。注意 `setSelectedKeys + confirm` 写在同一个 handler 里时 confirm 读到上一轮草稿，需拆两次派发 | 直测 |
| 6 | 重置按钮 disabled 态 | **没有 disabled 逻辑**（`engine/FilterBuiltinPanel.tsx:247-250` 只传 `size` + `onClick`，且是 default 按钮而非 antd 的 `.ant-btn-link`） | skip + 依据（另一条 `filterResetToDefaultFilteredValue` 直测） |
| 7 | responsive 断点是否在运行时消费 | **消费**（antd `Grid.useBreakpoint`）。jsdom 里 `matchMedia().matches` 恒 false（`tests/setup.ts` 的 MockMediaQueryList）→ 列被**从 columns 数组整体移除**（`useResponsiveColumns.ts:57-72`），故被移除列的 `defaultSortOrder` 完全不参与排序 | skip + 依据 |
| 8 | 非法 `total` 的处理 | `null` / `-1` / `NaN` / `0` / `'100'` **全部等同未传**，回落 `dataSource.length`；只有正数 number 生效（`engine/usePagination.ts:98-101`） | 直测 |
| 9 | `onChange` 分页参数是否附 `selectedRowKeys`/`selectedRows` | **不附**。实测 `[{current,pageSize,total}, {}, {}, {currentDataSource, action}]`，第 2/3 参恒 `{}`（与 antd 一致） | 直测 |
| 10 | `sorter` 树数据 + `defaultExpandAllRows` 组合 | 排序**不递归 children**（只排扁平 dataSource，树形扁平化在其后，`Table.tsx:435-444`），树形展开顺序恒为原始 DFS；且 `defaultExpandAllRows` **只从 `expandable.defaultExpandAllRows` 读**（`engine/useTreeData.ts:224`），table 级同名 prop 不被消费 | 直测（断言按实测改写） |

## 类型检查从空跑到生效（P3-9 的核心发现）

**问题**：`pnpm test:types` = `vitest --typecheck --run`，而 vitest 默认的 `typecheck.tsconfig` 是根 `tsconfig.json` —— 它是 `{"files": [], "references": [...]}` 的 solution 文件，交给 tsc 会编译 **0 个文件**。实测：往测试里写 `const x: number = 'string'` 仍报 `Type Errors  no errors`。也就是说 Phase 1 交付的 P1-2 是个**空跑的 script**。

**处置**：
1. 新增 `tsconfig.test.json`（extends `tsconfig.app.json`，`include: ["src", "tests/setup.ts", "tests/shared", "tests/table/features"]`，关掉 `noUnusedLocals/noUnusedParameters` —— 类型测试里有意保留未使用的声明）。`tests/setup.ts` 必须进 include，否则 `@testing-library/jest-dom` 的 matcher 类型（`toHaveClass`/`toHaveStyle`/`toHaveTextContent`/`toHaveAttribute`/`toBeDisabled`）不在 program 里，会凭空产生 ~70 条假错误。
2. `vite.config.ts` 的 `test` 块加 `typecheck: { tsconfig: './tsconfig.test.json' }`，并写明上面这条理由。
3. 收口 **24 处**黑盒层类型错误（`tests/shared/roMock.ts` 1 + `tests/table/features/*` 23）：其中 8 处是**真实的 API 偏差**（顶层 `expandedRowRender`、table 级 `sortDirections`、`showSorterTooltip` 对象形式、`getCheckboxProps` 只认 `disabled`/`name`），用「交叉类型常量 + 注释」保留 antd 用例语义而不改运行时；其余是类型推断/窄化问题（`selections: true` 的字面量拓宽、`querySelectorAll<HTMLElement>`、`pagination: false as const`、`state` 泛型）。

**收口后**：`npx tsc -p tsconfig.test.json --noEmit` exit 0；`pnpm test:types` exit 0。

**遗留（未修，超出本次范围）**：把 `tests/**` 全部纳入 program 会暴露 **白盒层 17 处既有类型错误**（10 个文件：`engine/columns/useColumnDragSort.tsx` 3、`style/styleSystemContract.ts` 3、`engine/drag/useRowDragSort.tsx` 2、`engine/scroll/useGridScrollSync.ts` 2、`selection/selectionAdapter.tsx` 2，另 `columnAdapter.tsx`、`engine/expand/useRowExpand.ts`、`engine/scroll/useVirtualList.ts`、`engine/sort/useSorter.ts`、`engine/summary/SummaryLayer.tsx` 各 1）。`src/**` 零错误。修它们要动 79 个白盒文件，与计划「现有 79 个白盒文件零改动」冲突，故本次把 typecheck 范围限定在黑盒层；把白盒层纳入是独立任务。

## 已知行为缺口（实测，本次不改 src，仅登记）

均为黑盒用例实测 + src 定位，不是猜测。每条在对应测试文件里有紧邻注释。

**筛选**
1. 对象型筛选值被 `String(item)` 去重折叠（`engine/filterUtils.ts:62`）—— 2 项进 / 1 项出，labelInValue + Select 场景不可用（对应 1 条 skip）。
2. 同值筛选项 React key 冲突（`engine/FilterBuiltinPanel.tsx:220` `key={String(item.value)}`）—— filterSearch 过滤后 DOM 留 3 项且文案错位（对应 1 条 skip）。
3. 自定义面板里的用户 `Menu` 失去 `onSelect`（`engine/FilterDropdown.tsx:454-464` 未包 antd 的 `<OverrideProvider selectable={undefined}>`，被 Dropdown 注入 `selectable:false`）（对应 1 条 skip）。
4. 排序路径 `onChange.filters` 恒为 `{}`（`engine/useSorter.ts:269`；`Table.tsx:388-392` 只替换了 pagination）。
5. `setFilterValue` 无条件回调（`engine/useFilter.ts:157-193`）—— 空筛选点 OK 也会 fire onChange（对应 3 条 skip）。
6. 树形数据 children 不参与筛选、分组列不渲染漏斗（`filterUtils.ts:78-103`、`engine/columnTree.ts:226-233`）。
7. `renderEmpty('Table.filter')` 返回 `false` 时回退内置 Empty（`FilterDropdown.tsx:290-301`）。
8. 无受控/非受控混合校验；重置按钮无 disabled；menu 模式无三级子菜单；`column.title` 不接受渲染函数。

**行选择**
9. `getCheckboxProps` 只消费 `disabled`/`name`（`engine/useRowSelection.ts:55-59`），antd 的 `indeterminate`/`aria-label`/`onClick`/`onChange` 全被丢弃（对应 5 条 skip，类型层也已印证）。
10. 表头全选框 disabled 不随「全 disabled」推导（`selectionAdapter.tsx:211` vs antd `useSelection.tsx:514`）；全选/半选基于 `selectableKeys`（对应 3 条 skip）。
11. 树形联动不排除 disabled 子树（`engine/selectionTreeConduction.ts`）—— 禁用某子树后点父节点仍会选中它（对应 4 条 skip）。
12. key 存在性判定用**筛选后**数据源（`useSelectionAdapter.ts:237-255`），筛选交互下丢失已选 key；`selectedRows` 只含当前可见行（`:268-273`）；勾选框未 `stopPropagation`（`SelectionInput.tsx:59-64`）；选择菜单不消费 `getPopupContainer`；回调顺序是先 `onChange` 后 `onSelect*`（与 antd 相反）；菜单 trigger 是 `click` 而非 hover。

**排序 / 展开 / 分页 / 其他**
13. `align` 取值差异：antd 用 `'left' | 'center' | 'right'`（antd `es/table/interface.d.ts:180`），data-grid 用逻辑值 `'start' | 'center' | 'end'`（`nativeOptions.ts:5`），对齐由 `data-align` 驱动的 flex `justify-content` 实现（`style/table.css:220-226`）。传 `'right'` 会直通成 `data-align="right"` 但 CSS 无匹配规则。
14. table 级 `sortDirections` 不存在且被静默忽略（引擎只读列级 `engine/useSorter.ts:224`）；`sortIcon` 初始收到 `null` 而非 `undefined`（`engine/HeaderCell.tsx:196`）；取消排序兜底文案 `'Click to cancel sorting'` 与实际 locale 的 `'Cancel sorting'` 不一致（`:299` vs `Table.tsx:27,90-92`）；排序方向循环不回绕（`engine/sorterUtils.ts:102-110`）；multiple 排序器不互斥（`engine/useSorter.ts:232-253`）。
15. 重复 `Table.SELECTION_COLUMN` 无查重（`useColumnTreeBuilder.ts:74-96`）—— 渲染两套选择列 + React duplicate key 报错（antd 会 warning）。
16. `expandable.expandIcon` 单独使用（不给 `expandedRowRender`）不建展开列（`engine/useRowExpand.ts:47` + `Table.tsx:506-514`）；antd 允许。已用直测断言钉住现状。
17. antd 顶层 `expandedRowRender` / `defaultExpandAllRows` 不被消费（只在 `expandable.*`，`compat/expand.ts:86`、`Table.tsx:613-620`）。
18. `pagination` 适配层把同一个 `onInternalChange` 同时挂给 antd `<Pagination>` 的 `onChange` 与 `onShowSizeChange`（`paginationAdapter.tsx:73-74`），rc-pagination 改页长时依次调用两者 ⇒ 外部回调各触发 2 次；`pagination={['topLeft','bottomRight']}` 数组简写只渲染 1 个分页器；`hideOnSinglePage` 隐藏时外层 `.dg-pagination` 仍在 DOM。
19. flat 快速路径表头格硬编码英文排序提示、不读 locale（`engine/FlatColumnCells.tsx:291-301`），multi 路径读（`engine/HeaderCell.tsx:292-302`）⇒ 同一配置两条路径文案不一致。
20. `classNames/styles` 的 `header.wrapper` / `body.wrapper` 无 DOM 注入点；`pagination.item` 落在 Pagination 根元素（`paginationAdapter.tsx:75-85`），与 `pagination.root` 语义重叠；**sticky 模式下 `classNames.section` 丢失**（`engine/ScrollContainer.tsx:219-286` sticky 分支不用 sectionClassName/sectionStyle）。
21. 类型层：`Table.EXPAND_COLUMN` / `SELECTION_COLUMN` 是 `{} as const`（`compat/expand.ts:154,165`），使 `ColumnOrSentinel<T>` 的空对象成员接受**任意非 null 对象**，columns 元素的属性检查整体失效（实测 `{ anything: 1 }` 通过，只有 `null` 报错）。
22. `locale` 的 `filterTitle` / `sortTitle` / `selectAll` 无消费点（`compat/locale.ts` 只有类型声明）；`expand`/`collapse` **已消费**（`expandAdapter.tsx:73-81` 的展开按钮 aria-label）—— 计划的全局 skip 矩阵在这一点上不准确，实施时按实测纠正。

**a11y（Phase 1 遗留）**：6 条架构边界 skip（`aria-colspan`/`aria-rowspan`/`aria-sort` 落在无 role 的格子 div 上，合法化需整条 ARIA 链）。用户裁定本次不修。

## 遗留事项（backlog）

按「建议处理顺序」排列。类别只标最贴切的一种；状态四态：未开始 / 进行中 / 已完成 / 已知限制。

| # | 事项 | 类别 | 证据 | 建议返回阶段 | 状态 |
|---|------|------|------|--------------|------|
| L1 | 22 条已知行为缺口逐条裁决：哪些补 compat、哪些写进 `src/docs/pages/known-limitations.tsx`、哪些开 issue | 产品决策 | 上方「已知行为缺口」每条都带 src 文件:行号与复现，对应测试注释可 grep | 验收和收尾 | 未开始 |
| L2 | 白盒层 17 处既有类型错误收口 | 基建 | 见下方「L2 证据」；`src/**` 零错误 | 投料并炼制（独立任务，别和本层混做） | 未开始 |
| L3 | 6 条 a11y ARIA 链 skip（`aria-colspan`/`aria-rowspan`/`aria-sort` 落在无 role 格子 div 上） | 架构边界 | `tests/shared/demoHarness.tsx` 的 `A11Y_ROOT_CAUSE_SKIP` + 紧邻根因注释 | 配方发想（合法化需先设计整条表格 ARIA 链，属结构级改动） | 已知限制（用户已裁定本次不修） |
| L4 | `ColumnOrSentinel` 的 `{} as const` 哨兵使 columns 元素的属性检查整体失效 | 类型层 | 缺口 #21（实测 `{ anything: 1 }` 能通过 columns 元素检查，只有 `null` 报错） | 投料并炼制 | 未开始 |
| L5 | 截图基线绑定本机 Chrome 版本（换机/升级浏览器后必红） | 环境 | 基线文件名带 `-chromium-win32`；`playwright.config.ts:14` 的 `executablePath` 指向本机 Chrome | 无（换环境时 `npx playwright test e2e/screenshots.spec.ts --update-snapshots` 重生成） | 已知限制 |
| L6 | `tmp/` 下的本轮工作简报、探针与运行日志 | 工作区 | `tmp/phase2-brief.md`、`tmp/check-skips.mjs`、`tmp/apply-snapshot-normalize.mjs`、`tmp/cov-compare.mjs`、`tmp/p3-*.log`、`tmp/cov-*.lcov` | 无 | 已知限制（`tmp/` 已 gitignore，可随时删） |
| L7 | 把白盒层纳入 typecheck（即 L2 完成后的收尾） | 基建 | `tsconfig.test.json` 现在的 `include` 只覆盖 `src` + `tests/setup.ts` + `tests/shared` + `tests/table/features` | 投料并炼制（L2 之后） | 未开始 |

**L2 证据**：把 `tests/**` 全量纳入一个临时 tsconfig（include `src` + `tests`，关掉 `noUnusedLocals/noUnusedParameters`）跑 `tsc --noEmit`，得 17 条错误、10 个文件，`src/**` 零错误。

| 文件 | 错误数 |
|------|--------|
| `tests/table/engine/columns/useColumnDragSort.tsx` | 3 |
| `tests/table/style/styleSystemContract.ts` | 3 |
| `tests/table/engine/drag/useRowDragSort.tsx` | 2 |
| `tests/table/engine/scroll/useGridScrollSync.ts` | 2 |
| `tests/table/selection/selectionAdapter.tsx` | 2 |
| `tests/table/columnAdapter.tsx` | 1 |
| `tests/table/engine/expand/useRowExpand.ts` | 1 |
| `tests/table/engine/scroll/useVirtualList.ts` | 1 |
| `tests/table/engine/sort/useSorter.ts` | 1 |
| `tests/table/engine/summary/SummaryLayer.tsx` | 1 |

`tests/table/style/styleSystemContract.ts` 的 3 条是缺 `@types/node`（`node:fs` / `node:path` / `process`），属配置问题而非测试写法问题 —— 单独处理它就要决定是否为测试层引入 `@types/node` 这个 devDependency（**本层未引入任何新依赖**，故留给 L2 决策）。

**返工建议（按性价比）**：验收和收尾（L1）→ 投料并炼制（L2 → L7 → L4）→ 配方发想（L3）。不需要回到素材收集：本层的参照与断言面都已实测核实。

**学习候选**
- **触发条件**：新增任何「检查类」script（lint / typecheck / CSS 兼容门 / 快照比对）。
- **证据**：它 exit 0。
- **验证方法**：先塞一个「必然失败」的样本跑一次，确认它会变红 —— 会红才算这个门是活的。
- **本次实例**：`pnpm test:types` 因 vitest 默认 `typecheck.tsconfig` 指向根 `tsconfig.json`（solution 文件）而编译 0 个文件，从 Phase 1 起长期空跑；塞入 `const x: number = 'string'` 仍报 `no errors`。
- **停止条件**：该 script 在「必然失败」样本下变红后，把样本移入正式用例（或删掉并记录已验）。

## 快照基线重设计

### Round G（用户指出「九万行快照不可维护」后返工）

**问题**：首版把 66 个 demo 的全量 DOM 快照堆进一个文件 —— 3505KB / 91398 行，`fixed-columns-and-header` 单条 28236 行。不可 review、回归无法定位。

**实测的体量构成**（先量后改）：
- 主题张量占 26.6%：每张表根元素内联整份 `--ant-*` 张量（450 个 token、单块 14.8KB）；
- 其余主体是渲染规模本身：`fixed-columns-and-header` 单 demo 有 **2323 个 `dg-cell`**。**全量 HTML 在这种规模下无法既完整又可维护**。

**处置**：
1. **按 registry 类目拆文件**（14 类 → 14 个 `demo-snapshot.<slug>.test.tsx` + 14 个 `demo-extend.<slug>.test.tsx`，各带同名 `.snap`）。粒度按定位成本定：一个改动影响哪几个类目的 demo，就恰好哪几个文件对比不过。
2. **快照对象改为结构摘要**（`buildDemoStructureDigest`）：根 class / 节点·行·格·表头格计数 / 网格轨道数 / 列序 / 行索引游程 / 跨列与合并跨度分布 / 结构件计数 / 主题覆盖 / 标签直方图。每 demo 约 12 行。

**权衡（显式记录）**：摘要不含单元格文本与属性书写顺序 —— 内容/文案类回归由功能用例承担，不靠快照兜。

### Round L（把同一条原则推到功能快照）

Phase 2/3 的功能用例原本 `expect(container.firstChild).toMatchSnapshot()` 打在整个渲染树上，同样把 14.8KB 主题张量原样写进基线。新增 `tests/shared/snapshot.ts`：

- `stripThemeTokens(element)`：深拷贝后删除所有 `--*` 自定义属性声明，删空则连 `style=""` 一起去掉；**其余内联样式（`text-align` / `grid-column` / `position`）保留** —— 它们是断言真正关心的布局信号。
- `expectSnapshot(target)`：断言目标存在后调用 `stripThemeTokens` 再快照（参数放宽到 `Node`，因为调用方常传 `container.firstChild`）。

**边界（显式记录）**：主题张量取值由主题层决定，改动主题会让所有快照同时失败 —— 那是噪声不是定位信息；它有自己的白盒用例与 demo 摘要的 `themeOverrides` 字段。剥掉后基线只剩「该用例关心的结构与类名」。

**效果**：5 个功能快照文件 287,100 B → **78,962 B（−72%）**。

| 文件 | 改前 | 改后 |
|---|---|---|
| `Table.filter.test.tsx.snap` | 82,959 | 23,491 |
| `Table.pagination.test.tsx.snap` | 78,508 | 19,040 |
| `empty.test.tsx.snap` | 62,932 | 18,331 |
| `Table.sorter.test.tsx.snap` | 24,054 | 9,187 |
| `Table.test.tsx.snap` | 38,647 | 8,913 |

`Table.expand.test.tsx.snap`（590 B）本来就是摘要式，未参与改造。

### 守卫

`demoGroups.ts` 的 `DEMO_CATEGORY_SLUGS` 未登记的新类目会抛错；`demo.test.tsx` 另有「每个 demo 恰进一个片」用例——新增 demo 不会静默漏测。

## D 轮发现与修复（3 条根因）

| # | 症状 | 根因（实测证据） | 处置 |
|---|------|------------------|------|
| 1 | `snapshot page-sticky-header` / `snapshot semantic-dom-slots` 报 `expected null not to be null` | harness 把 `compare: true` 当成 SplitDemo 结构，这两个 demo 是「data-grid 表 + antd 表同文档流堆叠」(61 个 compare demo 中唯二不用 SplitDemo) | 新增 `resolveSnapshotTarget`：SplitDemo 走左栏 pane，自定义 compare 布局退化为「容器内首个 `.dg-wrapper`」；非 compare 仍原样取 container |
| 2 | a11y 遍历 >21 分钟不收敛（`axe fixed-columns-and-header` 单条 1173991ms） | 两因叠加：① `axe.run` 未传 `resultTypes`，axe 在 7000+ 节点上构建全部 passes/incomplete/inapplicable 结果组（实测 >10 分钟不返回，只取 `['violations']` 后同 demo <20s）；② jsdom 无 canvas，`color-contrast` 退化为逐元素重试 | `axe.ts` 恒定禁用 `color-contrast` + 传 `resultTypes: ['violations']`；harness 给 a11y 单测显式预算 120s |
| 3 | `extend` 弹窗快照抖动（单跑 3 次绿，全量跑偶发 1–10 条失败；`-u` 后二次运行仍可失败） | 两个独立时序源：① rc-motion 过渡态类在 jsdom 里**永不脱落**（无 transitionend）；② `motionDeadline` 后才移除的 `-start` 标记在点击后 ~300ms 内消失 | ① 快照前 `normalizeMotionClasses` 统一剥离过渡态类；② `settlePopupHtml` 轮询「连续 3 次取值一致」等收敛（上限 5s） |

## D 轮 a11y triage 结论（11 条 → 6 条 skip + 2 条真修 + 3 条归属修正）

- **修 2 条真缺陷**：① `FilterDropdown.tsx` 触发器补 `role="button"` + `tabIndex={-1}` + `aria-label="Filter"`（只加 `aria-label` 会触发 `aria-prohibited-attr`，二者必须成对）；② `semantic-dom-slots` demo 标题 `h5`→`h4`（跳级）+ `index.css` 同步选择器。
- **归属修正 1 条**：`custom-filter-panel` 的 `aria-command-name` 全部来自**右栏 antd 对照表** → a11y 扫描域收窄到 data-grid 侧（`resolveA11yScope`）。
- **保留 skip 6 条**：`aria-colspan`/`aria-rowspan`/`aria-sort` 落在无 role 格子 div 上。补 role 实测立刻变 `aria-required-parent`（CSS Grid 无行容器元素）；合法化需整条 ARIA 链，属结构级改动。**用户裁定本次不修**。

## 交接状态

**Phase 1 / 2 / 3 全部完成**。`pnpm test`、`pnpm test:types`、`pnpm run lint`、`npx tsc -b`、`pnpm test:e2e` 全绿；覆盖率对账 adapter 层零回退。数字见上方「终验数字」。

**改动面**
- 新增（黑盒层）：`tests/shared/snapshot.ts`、`tests/table/features/` 下 12 个功能测试文件与对应 `.snap`、`e2e/screenshots.spec.ts` + 130 张基线 PNG、`tsconfig.test.json`
- 修改：`vite.config.ts`（`test.typecheck.tsconfig`）、`tests/shared/roMock.ts`（1 处 `ResizeObserverEntry` 字段）、Phase 1 的 `Table.test.tsx`/`empty.test.tsx`（快照入口 + 类型收口）、`package.json`（axe-core，Phase 1）
- **未动**：79 个白盒测试文件、`tests/setup.ts`；Phase 2/3 期间 `src/**` 零改动（Phase 1 的 2 处 a11y 修复仍是有记录的唯一例外）

**接手第一件事**：读上方「遗留事项（backlog）」——L1（22 条行为缺口裁决）与 L2（白盒层 17 处类型错误）是本层之外仅剩的两块实质工作，其余为已登记的已知限制。

**永久约束（继续遵守）**
- 所有 `it.skip`/`describe.skip` 必须带注释（无注释 skip = 未完成）；skip 措辞引 known-limitations 或 src 文件:行号证据
- 用例清单与 antd 同文件逐条对齐（直测 + skip = antd 用例数）
- 支持矩阵与选择器重映射规则见计划文件（顶部「计划真理源」路径）；`scroll.y` 仅 `true`；portal 内容用 `screen` 查询
- 快照基线一律走 `expectSnapshot`（剥主题张量）；demo 快照走结构摘要
- 断言必须针对 data-grid 实测行为：先读 src 形成假设 → 写探针实测 → 再写正式断言。计划/简报里的调查结论只是线索，实测优先（本次有 3 处按实测推翻了简报：`dg-selection-input` 的落点、`locale` 已消费字段范围、`components.body.row|cell` 是否被消费）

**环境注意**
- 装依赖须把 `--store-dir` 指到**本机 pnpm store 根**（路径随机器，不在本文写死；本机值可在 pnpm 配置／npmrc 里查到），否则报 `ERR_PNPM_UNEXPECTED_STORE`
- **子 agent 现在可以执行 pwsh**（本轮实测：`node` / `git` / `npx vitest` 均可用），因此实施者可以自己跑单文件测试与类型检查；只有全套 `pnpm test` 留给 main，避免并发争用
- `npx vitest --reporter=basic` 在 vitest 4.1.9 **不存在**（`Failed to load custom Reporter from basic`），用默认 reporter 或 `--reporter=verbose`
- a11y 断言面用 `resultTypes: ['violations']`；新增 a11y 用例若扫描域大，务必沿用该 opts，否则会退化为分钟级挂起
- 截图基线只在**同机同浏览器版本**下可比（`playwright.config.ts` 指向系统 Chrome，文件名带 `-chromium-win32` 后缀）

---

# 追加：本轮"行为缺陷 + 代码质量"清理的交接状态（2026-09-28）

账本真理源：`tmp/vortex-logs/fix-real-bugs/`（`ledger.md` 逐条裁定、`gap-disposition.md` 每条问题的终态、
`pitfalls.md` 可复用教训、`bat*-workorder.md` 工单）。本节只写结论与恢复施工需要的东西。

**状态口径**（每条主张都带）：**亲验**＝我在这一轮自己跑过命令或读过原文；**继承·未复验**＝来自某个子任务的读数，我没复跑；
**推断**＝从结构推出、没跑过。

## 一、已修好，且经过独立复跑与"摘掉代码必红"的反证
1. 三层树形勾选：勾最里层子行，上层父行不显示"半选" —— 已修（父行随子行半选一起半选）。亲验（我自己复跑过验证者的反证读数）。
2. 树形里"子行是空数组"的表项被误判成全选 —— 已修，与上游一致（不再判该父行）。亲验。
3. 点"整行展开"时点展开图标会连带触发用户自己的行点击回调 —— 已修（按上游的两层阻断同形实现，默认图标无条件阻断）。亲验（我实读了上游 `ExpandIcon.js:15-28` 并复跑验证者的六格双侧读数）。
4. 筛选面板勾选状态串位（同值筛选项 React key 冲突）、自定义筛选面板里用户自己的菜单点不动、
   筛选生效后点表头排序会丢掉已生效的条件、受控多列排序时单列与多列排序器不互斥、
   表级默认排序方向配置被静默忽略 —— 已修。继承·未复验（实现者跑过门，我这轮没逐条复跑）。
5. 表头排序格不能用键盘操作；排序格的无障碍描述写死英文不跟随语言包 —— 已修。亲验（我把透传链读全了：
   `Table.tsx` 合成 locale → 引擎 props → 两条表头路径成对注入）。
6. 分组表头列上写的筛选配置被静默丢弃 —— 已修（优先让分组列真参与筛选）。继承·未复验。
7. 自定义筛选面板关闭时会**把用户已生效的筛选清空**（我们无差别地替用户应用了草稿）—— 已修：
   只接参照的第二道门（自定义面板不因关闭而应用），内置面板关闭**照旧应用**（对照组零变化）。
   参照的第一道门（`source === 'trigger'` 那条**开合语义**）按本轮目标判为**登记不修**，
   与"确定后关闭延迟一个宏任务""用户自己的 `onOpenChange` 通知集合相反"同组，留待用户裁。
   继承·未复验（实现者双侧探针＋摘码反证都跑过；我没逐向量复跑）。
8. 表级／列级 `sortDirections` 生效时**排序箭头多画一枚**（只配"降序→无"这类序列时，参照画 1 枚、我们画 2 枚）—— 已修：
   改成参照同形的**节点级条件渲染**，并把表级默认值按参照的两级回落并入列配置（列级优先、未配回落表级），
   两条表头路径**成对**接上；组件在未收到该配置时 DOM 逐字节不变 ⇒ 存量基线不动。
   对应的 demo 结构基线由我在独占窗口刷新（节点 82→79，少的正是那枚多余箭头），改前基线留在 `tmp/60-snap-BEFORE.snap`。亲验。
9. 多列排序时 `onChange` 回调里的 `sorter` **数组顺序与参照相反**，而且原先**没有任何门能发现**（断言用的是对顺序失明的形状）——
   已修：取消我们多走的那一步二次排序（参照不做二次排序），并把失明断言换成有序断言，
   做过"旧断言仍绿／新断言变红"的失明反证。亲验（我复跑了该域三个测试文件，全绿）。
10. `ConfigProvider` 的 `table` 上下文里，用户给的 `rowKey`／`scroll`／`expandable.expandIcon` **我们一个都不读**——
    最狠的一条是行键：靠上下文给键、而记录没有 `key` 字段时行键静默变成 `undefined`，选择／展开／虚拟化的键全撞
    （不报错，只是行为错乱）。已修：新增 `src/table/contextDefaults.ts` 做**唯一一处**"props → 上下文 → 缺省"回落，
    终端缺省 `'key'` 也从 `Table.tsx` 收进这一层（摘掉这条收口有 8 条用例变红 ⇒ 门有牙）。
    亲验（我 19:33 起的全量复跑：**`Test Files 1 failed | 124 passed (125)`**，唯一红是下面 R-1 那条文档门 ⇒ 该域 16 条由我这一跑覆盖）。
11. 树形（`children`／`treeData`）下 `expandRowByClick` 声明了却整条不生效 —— 已修；
    原先据此写的文档（`docs/features/interaction/tree-data.md`、`docs/reference/compat-matrix.md`、
    `docs/reference/known-limitations.md`、`src/docs/pages/*` 两页）也已改成现值，且**没有**顺手弱化任何既有限制。亲验（我读过改后的两页与站点页文案）。
12. **筛选生效后分页不回到第一页**（用户看到结果集"中段"甚至空白）—— 已修成参照的分界线：
    **只有筛选复位**到第 1 页，排序／改页大小／点 Reset **都不复位**（参照那条"复位"机制经查是真机制、不是死参数）。
    受控分页下我们**只通知、不自己改值**（外观仍停在原页，与参照一致）。亲验（该域全量门覆盖，我在无 agent 在飞时复跑）。
13. **一整个"死引用"类清零**：库码注释里 **134 处**指向从未存在过的内部设计文档，被四片并行改成指向真实正典页
    或删掉无背书的指针子句；仓库那条**常红的永久门**（注释/文档路径引用必须指向磁盘真身）**首次转绿**。亲验。
14. **列标题传函数时静默变显式**：参照把函数式 `column.title` 当公开能力，我们只收 `ReactNode`，原先是**渲染为空、不抛错**
    （开了 `ellipsis` 连原生 `title` 悬浮提示也一起丢），JS 用户只能靠读文档才发现。
    现在**开发态会按列发一条告警**并在消息里点名是哪一列、写清三条后果；**渲染行为与"能力不移植"的判断都没变**。
    ⚠️ 顺带修掉一句被登记过的**假理由**（"函数当 React child 会被 React 抛错"——框架只按父组件名去重写一条 console 错误、永不抛），
    它当时正躺在一条 skip 的**跳过依据**里（假依据会让下一轮误判"转直测就会抛"）。亲验（七道门＋两次反证：关去重 ⇒ 5 红、摘告警 ⇒ 只剩负例绿）。
15. **开发态告警现在不会再打进生产包**：原先全仓 5 个 `console.warn('[data-grid] …')` 调用点**没有任何环境门**
    （参照 6.4.4 是把告警整体门在 `process.env.NODE_ENV !== 'production'` 后面的）⇒ 用户的生产构建里会吃到我们的内部噪音。
    现在收成**一份出口** `src/table/devWarn.ts`（前缀拼接＋按 key 去重＋环境门），5 个点全部走它，
    且只有这种裸判据写法能被生产构建**整条消除**（构建产物里 `[data-grid]`、`console.warn`、`devWarnOnce` 字面量都不剩）。
    保留裸 `process.env.NODE_ENV` 写法的依据是我量的：参照自己的 `es/` 里 **150 个文件**同样裸引用、
    且**从不用** `typeof process` 守卫 ⇒ 本包的 peer 依赖本身就要求一个会替换它的打包器，没有引入新的失败面。亲验。
16. **同名类型多处声明**（本轮 5 条里的 4 条）已收口：`RowSelectMethod` 转发、引擎侧 `Align`→`EngineAlign`、
    内部 `FilterDropdownProps` 改名、`RenderEmptyHandler` 引擎侧改名（＋表头格补 `sortDirections` 字段的成对性收口）。
    ⚠️ **只剩 `PoolBucket` 没做，而且是故意不做的**：两份声明的字段面**不同**（`{elements, options}` vs `{outer, inner, options}`），
    用"挑一份改名"就会把真实差异抹平，所以按工单的条件句**停手**，我判它**登记为缺陷**：
    同名不同物 ＋ 两文件各有一份逐字相同的 `sameOptions`/`clearBucket` ＋ `useCellElementPool` 这个 hook
    **只有测试在用、零生产消费者**。怎么处置（删死码／收成一份真身）需要产品决策，排在你裁定之后。
17. **终局门读数（我亲跑）**：`Test Files 127 passed (127)`（本轮新增两份测试）、`pnpm build` 的声明发射 OK、
    `tsc -b` EXIT=0、`oxlint` 0/0、`check-skips` `49/0/46`（skip 未升）、悬空引用 **14／行号越界 0**。
    其中 +2 是我在第六节写的那条 `git rm --cached …` 命令里的路径，**刻意保留**（改掉就等于把可粘贴的处置命令写错），
    永久门不扫根目录过程文档，已核实。
18. **一条跳过理由写假的用例已改成双侧直测**：那条 skip 的依据写"antd 会把隐藏列（被 `responsive` 过滤掉的列）的
    `defaultSortOrder` 也收集进来排序"。实读**已安装的 6.4.4**：喂给排序 hook 的是**过滤后**的列，
    且所谓"过滤前收集"的写法在 6.4.4 里**根本不存在** ⇒ 参照在该版本不生效，我方与它同值，所以这条不该继续 skip。
    现在它是直测，并且**同一条用例里带非空对照**（同配置去掉 `responsive` ⇒ 排序真的跑，两侧同序），
    否则直测会永绿；摘掉对照做反证确实变红（证明它有牙）。
    ⚠️ 我工单里给的对照行序是**错的**，账按实测改正（两侧实测 `['Tom','Lucy','Jack','Jerry']`）。
19. **版本条件性限制已升级成实读**：从 **6.5.x 起参照改为"过滤前收集"**（6.5.2 源码与 issue #32847），
    本轮又用 npm **6.6.5 的发布产物**实读到该逻辑仍在 ⇒ 而本包 peer 写 `^6.1.0`，
    所以**装 6.5+/6.6 的用户会看到"antd 按隐藏列默认排序、我们不排"的数据结果分叉**。已登记在限制页（`已运行`，读的是发布产物）。
    要不要跟随 6.5+ 的行为＝**待你裁定**（与"裁判版本/peer 范围"是同一条决策）。
20. **覆盖率那条收尾项是干净阴性**：`vitest --coverage` 全量 127 文件通过，整体 **92.8% 语句 / 94.92% 行**；
    列成"0% 行"的 17 个文件**逐个核过运行语句数＝0** ⇒ 全是纯类型声明模块（`compat/*.ts`、`engineTypes/*.ts`、`nativeOptions.ts`），
    不是测试缺口。**没有任何含运行时代码的库文件处于 0% 覆盖**。
21. **翻页时一次多余的"滚回首行"写入**（未给任何 `scroll` 配置时我方仍写一次，参照不写；排序触发路径同理）—— 已修：
    新增**一份**判据 `shouldScrollToFirstRowOnChange(scroll)`，唯一调用点改用它。
    ⚠️ 三处必要的澄清：
    ① 之前记的"用户没配滚动也会被翻页滚走页面"**是外推过头，已撤回**：9 个臂实测下来
       **两侧对 `window`／表外容器写入都是 0**，参照把滚动容器定成它自己的 body，我方代码里也没有 `window.scroll`。
       真实症状只在自家容器那一格里。
    ② "参照写 16 次、我们写 1 次"**不是分叉**：参照是 450ms 逐帧写同一个 0，终值相同 ⇒ **刻意不对齐**（对齐＝为噪音改产品码）。
    ③ 修法的关键是**"有没有给 `scroll` 对象"**，不是"有没有高度值"：参照在非固定表头分支把 body 挂在另一个 class 上，
       之前那次取证只给一个 class 装了探针，于是把"读不到"当成了"没发生"。
       若按"只有 `y` 才滚"去修会**修出一个新缺陷**（只配横向滚动时参照照样滚）——现在有一条专门钉住它的臂。
    终局认证（含本条）：**`Test Files 128 passed (128)`**、`oxlint` 0/0、`tsc -b` EXIT=0、声明发射与 `docs:api` 重生 OK、
    `check-skips` `45/0/47`、锚点 14／越界 0、机器路径泄露 0。上面"零"节里那几行是历史读数，别拿来当现值。
22. **批量选择后按 shift 勾选，`onSelectMultiple` 永远不触发** —— 已修：我们判断"是不是区间选择"用的是"有没有锚点"，
    参照用的是"已经有选中项"，于是回调里 `info.type` 报成 `single`（选中键集合却恰好相同 ⇒ 老断言根本看不见这个差）。
    现在改后两侧 `info.type` 同值、回调真的会发；三处单独摘码各自恰红（4／1／2 条）。
    ⚠️ 这条**不是**上一批选择改动写坏的（那是既有设计），是那批的"清锚"修复把它从"蒙对"变成**可观测**——
    独立验证者量出来、实现者复现后才修的。
23. **选择域第一次有独立验证者**：三项里两项**通过**（其中一项比实现者自证的更完整，验证者补证了第三个构件），
    第三项**未交付**——但实现者**当初就自报缺项**，属"没做"而非"虚报"。
    同一次复验把两条"未证明项"升级成**已证分叉**，其一是第 22 条（已修）；另一条是
    **"清空选择"对跨页且被禁用的已选行清不掉**（参照清空、我们留一个幽灵选中项），
    我已裁定**它与那项未交付的工作合并成同一个产品裁定**（同一个根：跨页／切片后的集合语义该归哪一层），
    需要先拍"分页状态的单一真身放引擎侧还是适配层"——**不许**为了顺手修而造第二份真身。
24. **"跳过依据"这一类基本收口**：本轮分四片共判完 **37 条**（8＋7＋8＋14），这是最后 14 条。
    这一片又抓到 **4 条依据是假话**并转成直测，
    最典型的一条是**依据还在说"我方没实现全局 `rowKey`"，而那个缺陷本轮早已修好** ⇒
    这是"改完行为、依据没跟着改"的镜像面：断言本身没错，但**理由**会把下一轮引去修一个已经不存在的问题。
    另两条：一条依据是 v5 时代写的（那几个 locale 字段在 6.4.4 里其实零消费，参照自己也不读）、
    一条把上游用例的**负向**期望读成了正向（那个告警在 6.4.4 产物里不存在）。
    还剩 3–4 条（选择域少记的几条）没判。
    ⚠️ 同时**新立一条待探缺陷**：选择列的**列轨宽度硬编码 32**、无视主题 token（token 确实喂给了勾选框本身 32→200px，
    不生效的是轨道）⇒ 下一轮先定级"是不是明显 bug"。
    ⚠️ 另登记一处**测试基础设施的结构性脆弱**：主题类名 `css-var-_r_N_` 里的 N 会随同文件挂载次数漂移 ⇒
    在任何快照用例**之前**新增用例都会把它染红。正解要在 token 归一里加一条，但那要求重生快照基线（高风险、须独占窗口），
    本轮**没做**，只做了一处"把新用例后置到域末"的规避（文件内已写明原因）。

## 零、全量门**现在全绿**（下面那张表是过程记录，R-1／R-2 都已关闭）

我 21:56 亲跑（四片并行清完死引用之后、分页复位之前）：`Test Files **125 passed (125)`**、`tsc -b` EXIT=0、
`oxlint` 0/0、`node tmp/check-skips.mjs` ⇒ `skip 总数=49 无注释=0 文件数=44`、悬空指针 `12`（其中 7 条是永久门
具名豁免钉住的条目、4 条在生成物 JSON 内、1 条是 `package.json` 的写出目标 ⇒ **都不是缺陷**）。
本轮从头红到尾的那条永久门（注释/文档路径引用必须指向磁盘真身）**已转绿**——134 处指向从未存在过的内部设计文档的
注释引用被四片并行清完（改指真实正典页，或删掉无背书的指针子句），**没有新建任何一份"design-notes"文档充数**。
终态读数见 `tmp/main-gates-clean.log`（无 agent 在飞时重跑）。

早先的读数（保留作过程证据）：`2 failed | 1682 passed | 52 skipped (1736)` → R-2 清除后 `1 failed | 123 passed (124)` → 全绿。

| # | 红的用例 | 归因 | 处置（不许放宽门） |
|---|---|---|---|
| R-1 | `tests/docs-reference.test.ts`（注释/文档路径引用必须指向磁盘真身） | **既有红**，非本轮引入：违规面几乎全是那 **181 条**指向不存在 `docs/design-notes/*.md` 的注释引用（另有 10 条其它类）。⚠️ 早先记的 188/27 是我**扫描仪表本身缺路径边界守卫**造成的虚数，仪表已修、旧数作废；永久门自己报 186——两个工具扫描面不同，**别拿一个去校另一个** | 就是 BAT-21 第 3 档本体：要么补文档、要么把死引用改成指向真身或声明"无该文档"。豁免表只允许具名条目，**不许**为变绿而放宽 |
| ~~R-2~~ **已清除** | ~~`tests/table/engine/header/HeaderCell.tsx`：`filterable 仅在 cell.isLeaf=true 时生效（分组格不可筛选）`~~ | **白盒层还钉着被修掉的旧行为**（分组列参与筛选让前提过期；写代码的与验证的都漏了这域） | 我把这条断言翻成新语义（分组格同样 `dg-column-has-filter`，并加断言它仍带 `dg-cell-header-group`），单文件 `1 passed`。**参照侧那句仍是"继承"**——我没重跑参照，升成实锤要补一次双侧并排 |
| R-3 **候选，未判定** | `src/table/publicTypes.ts`、`src/table/sortFilterAdapter.ts` 里仍带 `isLeaf`/筛选字样 | 可能还在陈述"分组格不可筛选"这条旧语义。我**没读那两处句子、没判成缺陷** | 归 BAT-13／BAT-21 的"库码注释真话"清单：按"改注释还是改语义"二选一裁定，不许顺手统一措辞 |

清完 R-2 后的全量复跑读数落在 `tmp/main-gates-1727.log`。

## 一、已落地但**没有独立验证者**（下一轮先补这一格，别急着派新功能修复）
- 选择域的三项（全选/反选的作用范围是否按"当前页"、批量操作后区间锚点不复位、树形父子勾选的 PR-4 向量）
  由实现者落地（+15/+40 行），**没有验证者复跑**。继承·未复验。
- 我亲验的部分仅限：类型门与解析面在三个子任务撞轮次上限死后仍然干净——
  `tsc -p tsconfig.lib.json --noEmit` = 0、`tsc -p tsconfig.test.json --noEmit` = 0、
  近 34 个改动文件 sucrase 解析全过。**全量测试/门读数见 `tmp/main-gates-1654.log`**（我跑完会并进来）。

## 三、这轮被实测推翻的旧结论（包含我自己的三条，避免下一轮当前提用）
1. **我**猜"上游只在开了整行展开时才阻断图标冒泡" —— 错，上游是无条件阻断（默认图标那一层）。
2. **我**要求文档写"函数式列标题已加开发态告警" —— 树里没有那条告警（`warn(` 全仓 4 处，无一与标题有关），
   属把将来时写成完成时；文档已按"能力未移植"写。
3. **我**说"筛选/排序分母＝80+14=94" —— 真读数 **83+12=95**（94 是 80+14 的算术口误）；
   解锁 skip 的方向只降不升，成立。**没有**新增用例。
4. "把插槽类型从 div 换成 Fragment 就能救 React key 冲突" —— 被证伪（无 key 时两者同构）。
5. 我自己写的**表头注入静态比对**两个方向都无效（既会漏报也会假阳性），那条"表头零差异"的负结果已作废。
6. 悬空引用扫描工具 `tmp/anchor-audit.mjs` **缺路径边界守卫**：会把上游包路径 `react-component/table/src/Table.tsx`
   从中间切成本仓假路径。永久门 `tests/docs-reference.test.ts` 有这个守卫。⇒ 我的验收数字"27→8"因此不可达。

## 四、剩余待办（按优先级；工单都已预编，含锚点与禁令）
1. **补验证**（最便宜也最该先做）：本节的修复里**没有独立验证者**的一批——分组列参与筛选、筛选面板勾选串位、
   自定义面板菜单被覆盖、排序丢筛选、单/多列排序互斥、表级默认方向、选择域三项（全选/反选范围、区间锚点复位、树形传导）、
   `filterOnClose` 只接一道门、排序箭头枚数、`sorter` 数组顺序、上下文默认值（行键／滚动／展开图标）。
   派法：**一片一棒**、验证者**只跑被指派那两片**，别再要求"复跑每一道门"（那正是上一轮三个验证/实现棒撞上限的原因）。
2. **真缺陷（仍未开工）**：`bat29-workorder.md` 的 **29-D**（分组列 `hidden` 是否生效——
   证明不了就整条退回，不许猜着改）、BAT-23 剩下的 **23-E／23-F**（函数式列标题"把静默变显式"那两条）。
   ⇒ `bat24-workorder.md`（分页复位）**已落地**，且那个挂了很久的前置问题已裁死：参照的"复位"机制是**真机制、不是死参数**
   （定义 `usePagination.js:38-43`、传入 `InternalTable.js:274/:276`、调用点**恰好一处** `:186`），
   判据实测＝**只有筛选复位**。**别重派。**
3. **代码质量**：`bat21-workorder.md` 第 3 档**已结案**（134 处死引用清零，见上面第 13 条）；
   `bat25-workorder.md` 的四条同名声明收口**已落地**（含表头格补 `sortDirections` 字段的成对性收口），
   **同批还剩两条没做**：`RenderEmptyHandler` 与 `PoolBucket` 的声明收口（工单里编号与本棒派发的编号不一致，
   且工单记的 `engine/FilterDropdown.tsx:55` 已漂到 `:57`）。
   另有三处一行级收尾：`tests/table/engine/header/sortDirectionsWiring.tsx:221-222` 的注释在补字段后成了假断言；
   `tests/table/features/Table.filter.test.tsx:912/:1660` 两条 skip 现可转直测（**别照抄用例名**——受控态的真实事实是"外观不变、只有回调参数是 1"）；
   `src/demos/**`／`docs/**` 里若干**没带版本**的旧 antd 引用（要逐条回 6.4.4 源码核，属独立一片）。
   再往下＝`bat13-workorder.md` 剩余组、`bat11-workorder.md`、`bat14/bat15-workorder.md`（demo 面）、
   `bat29-workorder.md` 的 **29-D**（分组列 `hidden`——证明不了就整条退回，不许猜着改）。
   ⇒ BAT-23 至此**全部落地**（23-A／23-B／23-D／23-E／23-F），**别重派**。
7. **跳过依据逐条取证的活儿（已开一片，剩约 23 条）**：把仍写着的"antd 会…"式**跳过依据逐条对当前裁判 6.4.4 取证**。
   - **筛选域 7 条已完成**（步骤 75）：2 条依据是假话 ⇒ 转直测（其中一条干脆**凭空写了个读数**：注释称"实测 current 保持 3"，
     实测两侧都是 1）；5 条依据**核实为真**、留 skip，但补齐了两个版本号与真身锚点，**没有为了降数字硬转**。
   - 剩下约 23 条在其它域：`Table.test.tsx` 9 条、`pagination` 7 条、`rowSelection` 5 条、`virtual` 2 条
     （清单在 `tmp/vortex-logs/fix-real-bugs/75-auditor-skip-basis-filter.md` §6/§9 与 74 日志同名小节）。
   - 派工时三条纪律已被实测钉死（写进提示词）：**P-125** 分母只认 `check-skips` 与运行时，grep 计数会把散文提及算进来（55 vs 50 vs 48）；
     **P-126** 补锚点的人会当场造新假锚点 ⇒ 同一轮内必须跑"被引标识符是否落在被引区间内"的第二步核对（脚本 `tmp/75-anchor-step2.mjs`）；
     **P-127** 参照测试件的选择器不可直抄（本仓里参照弹层 portal 到 `document.body`，容器内计数恒 0 ⇒ 会得到"两侧都是 0"的假同值）。
   - 样板：`rowSelection:244/275/290`（依据带版本号 ⇒ 天然可证伪）＋ 步骤 75 那两条转直测的形状（同一条 `it` 内双臂并排 ＋ 非空对照 ＋ 摘码反证）。
4. **零散收尾**：`pitfalls.md` 的两对同号（原 P-050／P-051 各两条）已重编号为 **P-113／P-114** 解决；
   步骤 70／74／75 的教训候选也已全部分配（**P-115～P-128**，其中一条并入既有 P-108 ④），现整表 **126 行**、
   复跑 `grep -o '^- \[P-[0-9]*\]' tmp/vortex-logs/fix-real-bugs/pitfalls.md | sort | uniq -d` **零重号**；
   站点摘要页不镜像那 6 条分叉＝**已裁定接受**；
   文档站 `.tsx` 的文案改动**不在任何类型门覆盖内**（`tsconfig.lib.json` 只 include `src/table/**`）⇒ BAT-0 的候选门。
5. **⚠️ 门知识更正（我原先写错过）**：`npx tsc -b` 在本仓**不发射任何 `.d.ts`**（app 配置 `noEmit`，lib 配置不在 references 里）
   ⇒ 要证声明面只认 **`pnpm build`**；且 `.d.ts` 里带 JSDoc，改名批的产物比对是**三态**（改名差／注释差／真差异），
   不是"改名件 vs 其余逐字节相同"的二分。
6. **已完成的收尾**（下一轮不必重做）：`anchor-audit.mjs` 的边界守卫已补（旧读数 215/188/27 作废，现值 **12**，其中 7 条是门具名豁免钉住、4 条在生成物 JSON、1 条是 `package.json` 写出目标 ⇒ **都不是缺陷**）；
   `pnpm docs:api`／`build:docs`／`build` 的产物已在独占窗口重生。

## 五、恢复施工的操作顺序（照这个走，别再发明一遍）
1. `git status --short` 确认工作树（**提交由用户负责，任何 agent 与我都不许碰 git 写**；本轮全部产物都是工作树形态）。
2. 先跑门，确认起点绿：`pnpm test` → `npx tsc -p tsconfig.lib.json --noEmit` → `npx tsc -p tsconfig.test.json --noEmit`
   → `npx oxlint . --ignore-path=.oxlintignore` → `node tmp/check-skips.mjs`（`skip 总数/无注释/文件数`）。
3. 派单前必读 `gap-disposition.md` 的终态列：**已结案的不重派**，撞过上限的**换更小的片**。
4. 并发纪律：同一批文件只许一个写者；共享编译图会产生幻影类型错误（读数要标"越域"）；
   子任务禁全量测试、禁 `tsc -b`（抢 tsbuildinfo 锁）；产物重生与全量门只在独占窗口由 main 跑。
5. 反证（摘掉修复应必红）**只能在所有门绿之后**做，且**一次一处**：回退前先把备份路径与可粘贴的恢复命令写进日志，
   校验字节用 node 读原始字节（MSYS `sha1sum` 对同一文件会给两个值）。
6. 参照裁判是**已安装的 antd 6.4.4**（上游 spec 6.5.2、npm 最新 6.6.5 —— 引用行为必须同时写版本）。

## 六、需要用户决定或动手的三件事
1. **提交**：工作树里有大量本轮产物（含未复验的两批），提交时机与拆分由你定；我未创建任何提交。
   ⚠️ **提交前先清一条索引残留**：`git status --porcelain` 现在有一条 `AD tests/table/devWarn.test.tsx`
   （那个测试从 `tests/table/` 搬到了 `tests/table/features/`，而旧路径已被 `git add` 进过索引）。
   **照当前索引直接提交，会把一个工作树里已不存在的旧路径文件写进提交**。
   二选一：`git rm --cached tests/table/devWarn.test.tsx`，或 `git add -A tests/table/`。
2. **peer 版本**：`package.json` 写 `^6.1.0`，而本轮所有"已对齐"结论的靶子是 **6.4.4**，用户实际会装到 6.6.x。
   要不要换裁判/加版本门（`bat0-workorder.md` 的 0-E 有选项与代价）。
3. ~~**是否补上那两个未复验批次的验证**~~ ——**已闭合**：步骤 86／88 两批的代码与钉都在树里，
   接手方已按「不复跑自报、main 亲跑」复验（见「七之二」与 `tmp/vortex-logs/fix-real-bugs/E-165-takeover.md`），
   并各做了一次改前必红反证（86 摘 `key` 剔除 ⇒ 两条 flat/multi 钉恰红；88 复原 hook 体内 `cssVar` 字面量 ⇒ 两条 memo 钉恰红），
   两次装回后 sha1 逐字节等于终态。
4. **截图基线**：已处置——e2e 首跑红 4 张（`sorting-and-filtering`／`semantic-dom-slots` × light/dark），
   定性为**基线过期**（证据见「七之二」），已备份旧件到 `tmp/e2e-baseline-bak/` 并只重刷那 4 张，
   `pnpm test:e2e` 现为 **`136 passed` EXIT=0**。

## 七、门读数快照（main 亲跑；对象＝工作树 2026-09-29 19:17，**不含**步骤 86／88 的改动）

> 本节是**快照**，不是"当前状态"。口径规则：任一产品码或测试改动落地后，本表即作废、须重跑并换新的快照时刻。
> 快照之后的读数写在表末「快照之后」一节，两者**不许混读**（独立复审抓到过这正是本表的一处断层）。

| 门 | 命令 | 读数 |
|---|---|---|
| 全量 | `pnpm test`（= `vitest run` ＋ CSS 兼容门） | **EXIT=0**；`Test Files 128 passed (128)`、`Tests 1785 passed \| 42 skipped (1827)`、`Test timed out` 命中 **0**；`CSS compatibility check passed for Chrome >= 105.`（＝**快照态**读数，不含步骤 86／88） |
| 类型 | `pnpm test:types` | **EXIT=0**；`129 files / 1791 passed \| 42 skipped (1833)` |
| 类型 | `npx tsc -b`、`npx tsc -p tsconfig.test.json --noEmit`、`npx tsc -p tsconfig.lib.json --noEmit` | 各 **EXIT=0**、`error TS` **0** 行 |
| 静态 | `npx oxlint . --ignore-path=.oxlintignore` | `Found 0 warnings and 0 errors.`（555 files / 99 rules） |
| 构建 | `pnpm build`（vite 双格式 ＋ 声明产物） | **EXIT=0**；`dist/index.js` 245.34 kB、`dist/index.cjs` 195.12 kB、`dist/style.css` 29.04 kB，`.d.ts` 树 mtime 与运行时刻一致（非空跑） |
| 构建 | `pnpm build:docs` | **EXIT=0**；`dist-docs/index.html` **5,096,097 B**；产物内 `design-notes` 命中 **0** ⇒ 死文档路径不进重生产物 |
| 生成物 | `node scripts/extract-api.mjs` | **EXIT=0**，与工作树抄件 `diff` **0 行**；`sortDirections` 命中 8 次 |
| 计数 | `node tmp/check-skips.mjs` | `skip 总数=40 无注释=0 文件数=47`（本轮基线 41 ⇒ 只降不升） |
| 计数 | `node tmp/anchor-audit.mjs` | **这类计数会随批次漂移，引用前必复跑**：快照态 指针 1452／悬空 **14**／越界 **0**／候选 65；含步骤 86／88 的重跑得 指针 **1467**／悬空 **15**（越界仍 0）。⇒ 把任何单个数字当"当前值"都是错的 |
| 覆盖 | `pnpm test:coverage` | **EXIT=0**；`All files 92.84% stmts / 87.83% branch / 95.92% fn / 95% lines`；**零覆盖的 `src/table/**` 生产文件清单为空**（`coverage/lcov.info` 记录数 103、全部落在统计面内；最低档 `engine/RecyclingBodyGrid.tsx` 76.3%）。⚠️ 该配置**不产** `coverage-final.json`，按 json 解析会得出假的「0 条」 |

### 快照之后（含步骤 86／88 改动，main 亲跑 2026-09-29 21:0x）——**已被下面「七之二」取代，留作过程记录**

| 门 | 读数 | 定性 |
|---|---|---|
| 全量 `pnpm test` | **EXIT=1**；`Test Files 1 failed \| 127 passed (128)`、`Tests 2 failed \| 1788 passed \| 42 skipped (1832)` | 红的两条**都是步骤 88 自己新加的 memo 钉**（`tests/table/hooks/useTableThemeVars.tsx`）；scoped 三种组合全绿 ⇒ 只在**全量**下红 ⇒ **已收口**（见「七之二」，判据已换成 spy 调用计数） |
| `npx oxlint` | `Found 1 warning` | dead `useState` import（步骤 88 遗留）⇒ **已删**，复跑回到 0/0 |
| `node tmp/anchor-audit.mjs` | 悬空 **15**（＋1） | ＋1 是 main 把工具转储字段当本仓路径抄进本页所致 ⇒ **已改写**，复跑回到 14 |
| `react-doctor`（0.7.1） | **`All 129 issues`**（Security 1／Bugs 10 errors＋36 warnings／Performance 17／Accessibility 1／Maintainability 64） | 静态计数链：**134 → 130**（批 3 抑制生效）→ **129**（批 1／批 2 落地后）。⚠️ 链上每换一个工具版本都要重取，跨版本数字不可比 |

## 七之二、接手复跑（2026-09-30，**本节的当前有效快照**）

> 本节**取代**上面那张过程表。口径：全部由接手方亲跑，日志落在 `tmp/takeover-*.log`。
> 静态计数（doctor／anchor-audit／check-skips）**引用前仍须复跑**，它们随批次漂移。

| 门 | 命令 | 读数 |
|---|---|---|
| 全量 | `pnpm test` **连跑两次** | 两次均 **EXIT=0**；`Test Files 128 passed (128)`、`Tests 1796 passed \| 42 skipped (1838)`（较接手期 1790/1832 净增 6 ＝ 步骤 92 的 6 条新钉）、`Test timed out` 命中 **0**、`CSS compatibility check passed for Chrome >= 105.`（日志 `tmp/main-full-run1.log`／`-run2.log`，2026-09-30 三棒落地后独占窗口） |
| 类型 | `pnpm test:types` | **EXIT=0**；`129 files / 1802 passed \| 42 skipped (1844)`、`Type Errors no errors`（`tmp/main-types-run.log`；步骤 93 扩 include 后 typecheck 通道实测吃到整个 `tests/**`） |
| 类型 | `npx tsc -b`／`tsconfig.test.json`／`tsconfig.lib.json` | 各 **EXIT=0** |
| 静态 | `npx oxlint . --ignore-path=.oxlintignore` | `Found 0 warnings and 0 errors.`（555 files / 99 rules） |
| 构建 | `pnpm build` | **EXIT=0**；`dist/index.js` 245,360 B、`dist/index.cjs` 195,142 B、`dist/style.css` 29,042 B、`.d.ts` **110** 个（非空跑） |
| 构建 | `pnpm build:docs` | **EXIT=0**；`dist-docs/index.html` **5,096,121 B**；产物内 `design-notes` 命中 **0** |
| 生成物 | `node scripts/extract-api.mjs` | **EXIT=0**，与重生成前抄件 `diff` **0 行**；`sortDirections` 命中 11 次 |
| 计数 | `node tmp/check-skips.mjs` | `skip 总数=40 无注释=0 文件数=47`（＝基线，未降未升） |
| 计数 | `node tmp/anchor-audit.mjs` | 扫描 **703**／指针 **1492**（本仓 1456＋参照 36）／悬空 **14**／越界 **0**／候选 70（悬空／越界＝基线未升；指针增量来自三棒新注释，`tmp/main-gates-anchor.log`） |
| 静态 | `react-doctor`（**0.9.14**，步骤 95 已升版） | **101 条**（Maintainability 49／Bugs 37／Performance 14／Security 1；error **12**／warning 89）；0.7.1 的 `All 125 issues` 与 `jsx-key` Count: 2 **作废**（0.9.14 不再报 `jsx-key` ⇒ 批 1 对账门已迁到步骤 84 的 fiber 探针件，复跑 4 臂全 `["a","b","c"]` 绿）；新开的 6 条 `no-ref-current-in-render` 全判 **B 判跳**（有意 latest-ref，5 条带注释、1 条生产未调用），见 `95-implementer-doctor-upgrade.md` |
| 覆盖 | `pnpm test:coverage` | **EXIT=0**；92.84% stmts／87.83% branch／95.92% fn／95% lines；`lcov.info` 中 `src/table/**` 记录 **103**、**零覆盖生产文件 0 个** |
| e2e | `pnpm test:e2e` | 首跑 **EXIT=1**（`127 passed / 9 failed`）⇒ 定性见下方「端到端首次复跑」；**已处置后复跑 `136 passed (2.8m)`、EXIT=0** |


**判红一次的定性（不是产品回归）——已修·放行（步骤 94／BAT-34，2026-09-30，main 代执行收口）**：
`demo-extend.pagination-remote > extend remote-data` 在**带 v8 插桩**的 coverage 跑里快照取到 `[]`；
同一工作树**独占复跑该文件 ⇒ 3 passed / EXIT=0**。单变量差＝插桩变慢导致的**弹窗收敛竞态**
（红点 `tests/shared/demoHarness.tsx`：`settlePopupHtml()` 的旧判据把**销毁后的空层**当成收敛值返回 `[]`；
弹窗生存期由 demo 的 `setTimeout(800)` 异步回填决定，插桩把 50ms 轮询定时器阻塞 501ms 拖过销毁边界）。
修法：收敛判据不变，但**空层不是可接受的收敛值**——回退到最后一次非空读数（`settlePopupHtml`，`demoHarness.tsx:84-132`）。
证据：改前码（＝git HEAD，sha1 `5f493be8…`）16 路并发插桩 **12/16 红**、重负载批 5/16 红；改后码（sha1 `15562f0e…`）
16 路并发插桩 **16/16 绿**；main 复跑 nocov＋插桩 ×3 连跑均 EXIT=0；零 `--update-snapshots`（工单红线遵守）。
权衡已登记：本层断言弹窗**内容**不断言生存期，「弹窗被永久销毁」类回归由 `Table.filter.test.tsx` 覆盖。
见 `94-implementer-popup-settle-race.md`、**E-168**。

### 端到端首次复跑（`pnpm test:e2e` = EXIT=1，9 红分两类）

e2e 自 Round K（2026-09-28 19:50、130 截图全绿）以来**一直没人跑过**；本节是那之后的第一次。两类红，性质完全不同：

1. **4 条功能 spec 抖动**（`basic`／`fixed-columns`／`tree-data`／`filter-in-tree`）——`Locator('.dg-wrapper')` 5s 内找不到。
   **独占复跑同 4 个文件 ⇒ `4 passed (9.0s)`** ⇒ Vite dev 冷编译超出 `expect` 默认超时，非产品问题。
2. **4 张截图基线确定性不符**（`sorting-and-filtering` light/dark、`semantic-dom-slots` light/dark；
   另 `basic-table` light 属上类抖动——复跑 `-g 'basic-table|semantic-dom-slots'` 时它已转绿）。
   复跑 `-g 'semantic-dom-slots'` ⇒ 两张**稳定红** ⇒ 确定性漂移。

   **归因（三条独立证据，都指向「基线过期」而不是回归）**：
   - **不是步骤 86／88**：这两个 demo 的源文件**都不含 `onRow`**（grep 零命中）⇒ 步骤 86 剔 `key` 对它们零 DOM 影响；
     步骤 88 只把 `cssVar` 对象字面量的**位置**从 hook 体内移到模块作用域，产出的 CSS 变量逐键同值。
   - **不是环境／浏览器漂移**：同一轮里 **130 张里 126 张过** ⇒ 同机同 Chrome 版本可比，L5 那条环境解释被排除。
   - **与已登记的产品改动对得上**：PNG 基线的时间戳早于本轮行为修复。`sorting-and-filtering` 的差异像素**只落在排序箭头一处**，
     正对应「表级／列级 `sortDirections` 生效时多画一枚箭头」那次修复——该 demo 的 **vitest 结构基线已刷到 `nodes: 79`**
     （少的正是那枚多余箭头）且本次全量绿；`semantic-dom-slots` 的差异是右侧语义槽说明面板**整段下移约一行**（多处文字重影），
     对应「排序格无障碍描述改为跟随语言包」那次修复。两处的**结构基线**都随改动刷过并绿，唯独 **PNG 基线没刷**。

   ⇒ **处置（已执行）**：先备份旧基线到 `tmp/e2e-baseline-bak/`（node sha1 四条留痕），再
   `npx playwright test e2e/screenshots.spec.ts -g 'sorting-and-filtering|semantic-dom-slots' --update-snapshots`。
   `-g` 过滤器保证**只重写这 4 张**：`已运行` 逐张比对确认 **changed=4 / total=130**，其余 126 张**零改动**。
   **终局**：`pnpm test:e2e` ⇒ **`136 passed (2.8m)`、EXIT=0**（与 Round K 同数），首跑那 4 条功能 spec 抖动本次未复现。

### 本次接手新立的一条缺陷（**表体通道已修，表头通道同形状未修**）

- **症状**：用户在 `onHeaderRow` 返回值里写 `key`，该键会落到该表头行**每一个**表头格的 React key 上。
- **落点**：表头走**另一条**通道 `src/table/engine/headerCellUtils.ts:59` 的 `mergeHeaderEventProps`，
  剔除集仍只有 `className`／`style`（与表体的 `src/table/engine/bodyCellUtils.ts:46` 同型但**未同步**）。
- **实测**（`tmp/probe-takeover-header-key.test.tsx`，fiber 读数）：flat 路径 2 个表头格 key 全为 `boom-header-key`
  （对照组恒 `<undefined>`）；multi 路径 3 个表头格同样全塌成一个；React 19 自己发告警
  `A props object containing a "key" prop is being spread into JSX`。
- **与步骤 86 的差别（必须写清，否则会被当成同一条已结案）**：表体那条是**引擎 key 被覆写**（身份被摧毁）；
  表头这条是**引擎本来没有 key、用户的 key 被注入**，而表头格的**组件身份在父层**、未被摧毁 ⇒ 严重度低一档，
  但同族、同一个一行形状的修法。步骤 86 的实现者**如实自报未修**（`headerCellUtils.ts` 不在其可写面）并交回 main。
- **状态**：**已修·放行（步骤 92／BAT-32，2026-09-30，main 代执行收口）**。修法＝`headerCellUtils.ts:87`
  的 `mergeHeaderEventProps` 剔除集由 `className`／`style` 扩为 `className`／`style`／**`key`**（1 行功能＋JSDoc 依据块，
  与表体通道 `bodyCellUtils.ts:46` 同形 ⇒ 两条独立通道已同步）。钉 6 条（白盒 3＋黑盒 3）；反证 CF-1（摘
  `|| k === 'key'`）⇒ **6 红**（各自独立红）＋装回 sha1 `cf751a65…` 逐字节 RESTORE-OK（main 重做，实现者棒死亡）。
  门 battery main 亲跑全绿（片 `57 passed | 7 skipped`、`tsc -p tsconfig.{test,lib}.json` 各 EXIT=0、oxlint 0/0、
  全量 ×2 绿）。见 `92-implementer-header-key.md`、**E-168**。

### 仍未覆盖的面（不许被上面的绿掩盖）

1. **端到端**：`pnpm test:e2e` 已跑并**已全绿**（`136 passed`）。红过的 4 条功能 spec 是 Vite 冷编译抖动（复跑即绿），
   4 张 PNG 是过期基线（已按上面证据重刷，只动那 4 张）。**残余**：流程缺口——PNG 基线没有"随可见像素改动重刷"的规则，
   已登记在 `gap-disposition.md` 二·补第 14 条，建议写进收尾清单。
2. **「参照版本条件性分叉」整类未扫**：对齐基准＝已安装的 **antd 6.4.4**（peer 写 `^6.1.0`、npm 最新 6.6.5、本机上游克隆 6.5.2）。
   已抓到两例（某排序状态的列收集口径 6.5.x 起改；表体勾选框默认无障碍名是 6.5.2 才有的能力）
   ⇒ 凡「参照没有／不生效」类依据都必须带**裁判版本号**，换裁判要重判一遍。
3. **「注释声称与 antd 一致」共 406 条，只逐条复核了承载「不修／跳过」决策的 55 条**。
4. **代码质量面（静态分析）分诊已交回，A 档 3 批全部收口（as-of 2026-09-30）**：权威清单是 **134 条**（产品码 83／站点码 51），不是 206——
   同二进制、同 `doctor.config.ts` 的 `--verbose` 重跑两次都稳定 134；**206 是没吃到行内抑制时的读数**
   （anchor ×85 与 pnpm-hardening ×2 会重新出现），这个差异**尚未闭合**、引用时要带档位口径。
   A 档 3 批／11 条：**批 1 是真缺陷**（用户 `onRow` 的 `key` 经后置 spread 覆写引擎给的格子 key，flat 与 multi 两条表体路径同坏，
   fiber 实锤 `["boom","boom","boom"]`）**与批 2**（`useTableThemeVars.ts` 把 `cssVar` 字面量写在 hook 体内当 memo 依赖
   ⇒ 两个 token memo 每轮全量重算，与 `:63-64` 注释自陈的预期互相矛盾）**均已落进工作树**（两棒都被上一会话轮次上限打断、
   **未交报告**，集成由 main 接管）；**批 3 已落地**（6 处 disable 注释只写短名 `react-hooks/exhaustive-deps`、引擎按全名匹配 ⇒ 抑制不生效；改全名后
   总数 **134 → 130**，`已运行`：`oxlint` 0/0、`tsc` EXIT=0，**只改注释名、依赖数组未动**）。
   另修 `package.json` 的 `doctor` 脚本一个漏写 flag：`--json-out` 必须配 `--json` 才产文件（实测补上后写出 184,646 B 报告）。
   ✅ **批 2 已收口（步骤 90，E-165 §二）**：接手期那两条「只在全量下红」的 memo 钉，红点定性为
   **React 19 允许按槽位非确定丢弃 memo 缓存**——「产物同引用」不是「本轮没重算」的可靠代理
   （`tokenBridge` 两个转换函数无内部缓存 ⇒ 引用相等只在 React 恰好保留那条 memo 时成立，是**假稳定**）。
   判据已换成 **spy 数转换函数调用次数**（「token 不变 ⇒ 不重算」⇔ 计数零增长）＋ `tokenRefs` 首末同引用自证
   （选型依据明写在 `tests/table/hooks/useTableThemeVars.tsx:179-194`）。反证 F2：把 `cssVar` 复原成 hook 体内字面量
   并加回 deps ⇒ 两条 memo 钉恰红（`expected 12 to be 11`／`expected 14 to be 13`），装回 sha1 `26c0dce4…` RESTORE-OK。
   全量 `pnpm test` 连跑两次该文件均 13 绿、「只在全量下红」不复现。⚠️ 如实登记：新判据与旧判据在本仓**严格性等价**
   （无缓存 ⇒ factory 重跑必出新引用），改进在**可诊断**不在严格性。
   判跳要点：12 条 `unused-export` **零条落在产品码**；85 条 `Anchor used as a button` 按本仓实际路径落在
   **46 个 `src/demos/**` ＋ 1 个文档站测试件**，**生产码 0 命中** ⇒ 禁整类 sweep
   （转储另有 1 条的宿主在本仓查无此文件——那是 react-doctor 自己的转储字段名，不是本仓路径；
   本页刻意不写它的字面形式，否则指针扫描器会把这一句本身计成一条悬空命中）。
   工具仓库钉 `^0.7.1`、最新 0.9.14 是另一套 100 条规则集（升不升属裁判级决定，见第六节第 2 项同源问题）。
5. ~~**白盒层 2 条既有类型错**（`tests/table/selection/selectionAdapter.tsx:102`、`:117`）被 `tsconfig.test.json`
   的 include 面盖住 ⇒ `tsc` 门 EXIT=0 **不等于**测试层类型干净。~~ **已关闭（步骤 93／BAT-33，as-of 2026-09-30）**：
   `tsconfig.test.json` 的 include 扩到整个 `tests/**` ⇒ 盲区关闭；类型错现值复测 **33 处／12 文件**（旧数 17 已过期）
   **全部归零**（写法 24／API 偏差 3／依赖缺失 6）；依赖缺失的 6 处（`@types/node`）走 6 条**自校验** `@ts-expect-error`
   （各标 TS2591，日后装上 `@types/node` 立即翻红 TS2578 ⇒ 不会静默失效，零新依赖）。it-count 118→118、skips 0→0、
   零删断言；`pnpm test:types` 129 files／1802 passed、Type Errors none。见 `93-implementer-typecheck-blindspot.md`、**E-168**。

## 七之三、BAT-0 五门全量 battery（2026-09-30，**本节的当前有效快照**）

> 本节**取代**上面七之二表（七之二表保留为过程快照）。口径：全部 main 独占窗口串行执行（零子代理），日志落
> `tmp/bat0-final-*.log`；全量 `pnpm test` 共 4 次，**最后 2 次在最终代码态连续 2 次全绿**。

| 门 | 命令 | 读数 |
|---|---|---|
| 全量 | `pnpm test` **连跑两次（最终态）** | 两次均 **EXIT=0**；`Test Files 131 passed (131)`、`Tests 1845 passed \| 49 skipped (1894)`、`Test timed out` 命中 **0**、`CSS compatibility check passed for Chrome >= 105.`（日志 `tmp/bat0-final-test-run{3,4}.log`；前 2 次 run{1,2} 同读数。较七之二 +3 文件／+56 测试＝BAT-0 新门全部，delta 已逐条归因） |
| 类型 | `pnpm test:types` | **EXIT=0**；`132 files / 1851 passed \| 49 skipped (1900)`、`Type Errors no errors`（首跑红＝与 tsc 并发引发的 30s 超时 flake，干净重跑转绿，`tmp/bat0-final-types2.log`） |
| 类型 | `npx tsc -b`／`tsconfig.test.json`／`tsconfig.lib.json` | 各 **EXIT=0**（3 个新文件 27 条类型错顺手修复：TS2591 自校验抑制约定＋接口并集＋直接索引） |
| 静态 | `npx oxlint . --ignore-path=.oxlintignore` | `Found 0 warnings and 0 errors.`（559 files / 99 rules；新文件 5 警告顺手修复） |
| 构建 | `pnpm build` | **EXIT=0**；`dist/index.cjs` 195.15 kB、`dist/style.css` 29.04 kB（与七之二基线同形无漂移；test.alias 为 test 作用域，站点构建面零影响） |
| 构建 | `pnpm build:docs` | **EXIT=0**（6.86 s） |
| 生成物 | `node scripts/extract-api.mjs` | **EXIT=0**，与重生成前抄件 `diff` **0 行**；成员 table 36／tableRef 2／gridOptions 14／column 38／gridColumnOptions 6／selection 6／virtualizationMode 3／exports 62 |
| 计数 | `node tmp/check-skips.mjs` | `skip 总数=39 无注释=0 文件数=47`（**−1**＝0-B #3 的 skip 转直测） |
| 计数 | `node tmp/anchor-audit.mjs` | 扫描 **708**／指针 **1557**（本仓 1521＋参照 36）／悬空 **14**／越界 **0**（悬空／越界＝基线未升；指针增量＝本批新文件锚点注释＋本新节引用） |
| 静态 | `react-doctor`（**0.9.14**） | **101 条**、EXIT=0（基线未动，`tmp/bat0-final-doctor.log`） |
| e2e | `pnpm test:e2e` | **136 passed (2.8 m)、EXIT=0**（与基线同数，`tmp/bat0-final-e2e.log`） |

**BAT-0 落地内容（+56 测试增量全部由此）**：五道插桩门全落地——0-A 快照缺键 `update: 'none'`（静默写入改红，
`-u` 写回保留）、0-B antd 双实例 test 作用域 alias（`antd`→`antd/es`，站点构建零影响）＋#3 skip 转直测、
0-C skip 纪律常驻门（递归扫 `tests/**`，覆盖旧盲点）、0-D api.json 对账门（生成器与门共用 `extractPayload()`，
假 prop 自证红→装回绿）、0-E 分母恒等式门（独立 fixture 11 片 × 双版本 6.4.4/6.5.2＋静态 24/24＋运行期 11 片全绿
384 用例，7 行版本差集全部入账 `extra652`；G-1 按 51 §4.1 否决）。新门文件＋27 测试、14 片 snapshot 计数断言
+14、a11y skip 注册 7＋1 计数断言、api-json 3→9。`src/**` 零改动（0-D 假 prop 已装回、sha1 逐字节一致）、
`tsconfig*.json`／`docs/**`／`package.json`／`e2e/**` 未动。详见 `96-implementer-bat0-testgates.md` §6 与 **E-170**。

**遗交项**：`docs/reference/known-limitations.md`「测试环境的观测面」条的旧句已于 **2026-09-30 改毕**（用户指示，
main 直接执行；原句保留为历史口径＋新增「已修」行；anchor-audit 复跑 14/0 未升）。其余待用户裁定：Z-4 表头全选/反选页面范围；
29-D grouped-column `hidden`；peer `^6.1.0` vs 实装 6.4.4；PoolBucket 两个同名声明；item-14 PNG 重基线清单；
lib→ES2022；git：停机维护期间用户已自行提交 4 个 `add tests` 提交（最新 `fedeb7e`，2026-09-30 21:17），
`AD` 索引残件（旧路径 devWarn 测试文件，见本文件 :483 既有登记）与未跟踪 `tmpv53-final2-progress.txt` 均已随提交处置
（旧路径出索引、进度件已入库）；**当前未提交面＝本批 §6.1 类型/lint 修复 4 文件＋本 七之三 节**
（`scripts/antd-denominator.mjs`、`tests/api-json-reconcile.test.ts`、`tests/denominator.test.ts`、
`tests/skip-discipline.test.ts`、`TASK_STATUS.md`），提交时机仍由用户定。

## 七之四、BAT-35 六项全量 battery（2026-09-30，**本节的当前有效快照**）

> 用户 2026-09-30 裁定：antd 版本声明（peer `^6.1.0`）**不动**；其余六项按建议做。main 独占窗口串行执行（零子代理），
> 日志落 `tmp/bat35-*.log`。写面＝`src/table/**`（7 文件）、`tests/**`（3 文件＋1 删除）、`docs/reference/{compat-matrix,known-limitations}.md`、
> `docs/contributing/verification-guide.md`、`src/docs/generated/api.json`、`AGENTS.md`、`TASK_STATUS.md`、`tmp/**`；
> `package.json`／`pnpm-lock.yaml`／`tsconfig*.json`／`vite.config.ts`／`playwright.config.ts`／`e2e/**`／`src/demos/**`／`scripts/**` 零写。

**六项落地**（详见 `97-implementer-bat35-six-items.md`）：
- **35-A**（29-D 分组列 `hidden`）：`filterHiddenColumns` 删 `hidden:true` 分组列；leaf `hidden` 走 0fr＋`.dg-cell-hidden` 保留 DOM。
- **35-B**（PoolBucket 改名＋`useCellElementPool` 退役）：`useCellElementPool.ts` 删除（live `defaultRenderCellElement` 先移走）；AGENTS.md「DOM 复用」行更新。
- **35-C**（截图重基线规则）：`docs/contributing/verification-guide.md` 写入重基线规则。
- **35-D**（lib→ES2022 不动裁定）：零代码，裁定登记（peer `^6.1.0` 不动、lib target 不动）。
- **35-E**（自定义筛选面板门①）：`FilterDropdown.tsx` `handleOpenChange` 加 `if (info?.source !== 'trigger') return` 门①（点菜单项不关面板）；`compat/column.ts` JSDoc 更新；api.json 重生成。摘码反证 sha1 `0ac3ede3…` 逐字节一致。
- **35-F**（Z-4/29-B+B4c 表头全选/反选范围，三档三份分母）：`useRowSelection.ts` 加 `pageDataSource` 可选 prop＋三档分母（表头全选/INVERT/NONE 保留面=当前页、菜单 ALL=全量、树形 conduction disabled=全量）；`useSelectionAdapter.ts` 加 `pageDataSource` 可选 prop（默认 filteredDataSource，白盒零回归）；`Table.tsx` `usePaginationAdapter` 上移到 `useSelectionAdapter` 之前＋喂 `pagedDataSource`。4 新直测 pre-red 必红→修复后全绿；摘码反证 sha1 `D5ED0F3B…` 逐字节一致。树形 conduction 回归（isKeyDisabled 误用当前页 disabledKeySet）修复＝加 allDisabledKeySet（全量）专供 conduction。

**收口 battery（终态含 35-F）**：

| 门 | 读数 |
|---|---|
| 全量 `pnpm test` ×2 | 连续两次 **130 文件 / 1848 passed\|48 skipped (1896)**、0 failed（vs 七之三 1845：＋3＝35-F 4 新直测－1 白盒回归修复） |
| `pnpm test:types` | **131 文件 / 1854 passed\|48 skipped (1902)**、Type Errors none |
| `tsc -p tsconfig.json --noEmit` ×3 | 全 EXIT=0 |
| oxlint | 0 warnings / 0 errors |
| check-skips | skip 总数=38（基线 39 ⇒ **−1**，前批 skip 转直测，未升） |
| api.json 重生成 | sha1 `cbb0483e…` **不变**（pageDataSource 内部类型，公共 API 零变化） |
| build / build:docs | 全 EXIT=0 |
| anchor-audit | 行号越界 0、悬空 其它=14（基线 14 未升） |
| react-doctor | ok=True、totalDiagnosticCount=100（基线 101 ⇒ **−1**，未升） |
| e2e | **136 passed**（2.8m） |

**遗交**（本批不动，随收口上呈）：① 用户决策项已裁定（peer `^6.1.0` 不动、六项按建议做）⇒ 全部落地；
② git：实现者零写（纪律遵守），未提交面＝35-A..35-F 全部改动＋本 七之四 节，提交时机由用户定；
③ 不在 BAT-35 范围（待用户）：N-2 表级一跳、G-1 独立复验、29-C C4。

