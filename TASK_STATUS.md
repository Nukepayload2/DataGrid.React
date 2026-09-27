# 黑盒测试层任务状态（antd 方式）

计划真理源：`C:\Users\19393\.claude\plans\antd-table-compiled-phoenix.md`

## 状态图例
- [ ] TODO / [x] DONE / [~] 进行中 / [!] 验证未过

## Phase 1 — 基建 + 基础 + demo 遍历

| # | 任务 | 状态 | 备注 |
|---|------|------|------|
| P1-0 | main: pnpm add -D axe-core | [x] | axe-core 4.13.0 已装入（`--store-dir G:\.pnpm-store`，因 node_modules 链自该 store）；package.json devDeps + pnpm-lock.yaml 随之更新；附带把 jest-dom/user-event/@types/react-dom 三个 devDep 提到各自 range 内最新补丁版 |
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
- pnpm store 在 `G:\.pnpm-store`；装依赖须 `pnpm add … --store-dir G:\.pnpm-store`，否则报 `ERR_PNPM_UNEXPECTED_STORE`
- **子 agent 现在可以执行 pwsh**（本轮实测：`node` / `git` / `npx vitest` 均可用），因此实施者可以自己跑单文件测试与类型检查；只有全套 `pnpm test` 留给 main，避免并发争用
- `npx vitest --reporter=basic` 在 vitest 4.1.9 **不存在**（`Failed to load custom Reporter from basic`），用默认 reporter 或 `--reporter=verbose`
- a11y 断言面用 `resultTypes: ['violations']`；新增 a11y 用例若扫描域大，务必沿用该 opts，否则会退化为分钟级挂起
- 截图基线只在**同机同浏览器版本**下可比（`playwright.config.ts` 指向系统 Chrome，文件名带 `-chromium-win32` 后缀）
