# 外观/行为对齐 · 查漏补缺任务（§11 续）

> **背景**：§11 第 1 步 49 demo 逐个扫已「通过」，但用户复检发现验证者**过度侧重静态视觉、漏了交互状态下的行为 / 翻页器配置 / 滚动条定位 / 固定列细节 / dark mode**。甚至部分差异**读两侧 demo 源码即可发现**（列宽/翻页器配置）。本文件登记这些遗漏问题为独立改善任务，沿用 §11 工作模式执行。
>
> **根因反思**（下个会话验证者必须纠正）：
> - 验证者只看静态 computed style，**没滚动/翻页/拖拽中/固定列横滚到底**等交互态逐项核。
> - 验证者**没读两侧 demo 源码**对比 props 配置（列宽/翻页器/scroll），只浏览器目测。
> - 验证者**没测 dark mode**（demo 无切换按钮，导致 dark 主题对齐从未验证）。
> - 滚动条定位/hit 区语义理解错（8px hit 扩大 ≠ 滚动条向内移位）。
>
> **新增全局要求**（所有任务验证时必须覆盖）：
> 1. **读两侧 demo 源码**对比 props（`src\demos\<name>.tsx` + `_compare\<name>.shared.ts` vs `G:\Projects\ant-design\components\table\demo\<name>.tsx`），列宽/翻页器/scroll/size 等配置逐项对齐。
> 2. **交互态逐项核**：滚动（横滚到底/纵滚到底/滚到中间）、翻页（翻第2页/改 pageSize）、拖拽中、固定列横滚贴边、展开/收起过渡、排序/筛选激活+清除。
> 3. **dark + light 双模式**：每个 demo 加（或用对照框架的）深色/浅色切换按钮，**两种主题下都核对**（ConfigProvider theme.algorithm dark/default）。
> 4. **滚动条**：贴边位置（原位，非向内移位）+ hover 色强度 + dark 模式下滚动条色。

---

## 任务清单

### A. grouping-columns · 多级表头滚动时列头重叠
- **demo**：`#/demos/grouping-columns`
- **问题**：横向滚动时，多级（多行）表头格**重叠**（表头未正确随滚动保持层叠/固定，行间或列间错位重叠）。
- **涉及**：多级表头 sticky/定位（`GridTable.tsx` HeaderCell 多行渲染 + 横向 sticky）；可能是表头行 track 在横向滚动下的 sticky 上下文/层叠处理。
- **验证要点**：横滚到中间/最右，多级表头各层不重叠、不错位、固定列表头贴边。

### B. grouping-columns · 固定列阴影左移一列
- **demo**：`#/demos/grouping-columns`
- **问题**：固定列边缘阴影（`.dg-sticky-shadow-start/end`）作用在**错误的列**（左移了一列）。
- **涉及**：`useStickyColumns.ts` 的 `isEdge`/`shadowClass` 计算（`GridTable.tsx` shadowClass 派发）——多级表头下 leafIndex 与 shadow 边界列计算差一。
- **验证要点**：横滚时阴影精确落在固定列集群的**最右(start)/最左(end)**叶子上，不错位。

### C. virtual-list · 缺竖向滚动条
- **demo**：`#/demos/virtual-list`
- **问题**：纵向**悬浮滚动条缺失**（应有，因 scroll.y 启用数据区域模式 + FloatingScrollBar 纵向）。
- **涉及**：`FloatingScrollBar.tsx` 纵向渲染条件 / `GridTable.tsx` scrollYEnabled 分支 / 数据区域模式 `.dg-scroll` 高度链。
- **验证要点**：右侧纵向悬浮滚动条可见、可拖、同步 scrollTop、hover 变粗。

### D. virtual-list · 列宽配置与 antd 不同
- **demo**：`#/demos/virtual-list`
- **问题**：列宽分布与 antd demo 不同（scroll.x:2000 下列宽分配差异）。
- **涉及**：C1 列宽策略（`GridTable.tsx` colTracks minmax）vs antd `<col>` width；**先读两侧 demo columns 定义对比**（可能 data-grid columns 的 width 配置就与 antd 不同，或 C1 minmax 分配与 antd colgroup 不一致）。
- **验证要点**：逐列宽度与 antd 逐值对齐（读两侧 col/gridTemplateColumns）；**dark+light 双模式**。

### E. pagination · 滚动条出现在表格外面
- **demo**：`#/demos/pagination`
- **问题**：横向滚动条出现在**表格视觉外边**（应在表格内），与 antd 不同。
- **涉及**：C1 改的 `.dg-wrapper{overflow-x:auto}` 把滚动条放到了 wrapper（表格圆角/边框外）。antd 滚动条在表格容器内部。
- **方向**：滚动条应落在表格内容区内（`.dg-grid`/`.dg-scroll` 层），非 `.dg-wrapper` 外层。注意与 basic 滚动条修复（C1）的平衡——basic 需要 wrapper 出滚动条，pagination 需要表格内。可能需区分有/无 scroll.x 或表格结构。
- **验证要点**：滚动条在表格边框圆角内，不出框。

### F. tree-data · 列宽与 antd 不同
- **demo**：`#/demos/tree-data`
- **问题**：列宽实际宽度与 antd 不同。
- **涉及**：**先读两侧 demo columns 对比 width 配置**（data-grid tree-data columns vs antd tree-data columns）；若配置一致则是 C1 minmax 分配差异。
- **验证要点**：逐列宽度对齐 antd；**dark+light 双模式**。

### G. tree-data · 翻页器配置不同
- **demo**：`#/demos/tree-data`
- **问题**：翻页器配置与 antd demo 不同（pageSize/current/placement/是否分页等）。
- **涉及**：**读两侧 demo pagination prop 对比**（data-grid vs antd tree-data demo 的 pagination 配置）；对齐配置。
- **验证要点**：翻页器配置（pageSize/current/total/placement）逐项与 antd 一致；翻页交互。

### H. filter demo · filter menu 背景色不对
- **demo**：`#/demos/head`（及其它 filter demo：reset-filter/custom-filter-panel/filter-search/filter-in-tree）
- **问题**：筛选下拉菜单（filter menu）背景色不对（与 antd Dropdown/Menu 背景不一致）。
- **涉及**：`FilterDropdown.tsx` 的 `.dg-filter-dropdown` 背景 token / antd Dropdown Menu 背景（`--ant-color-bg-container`? Menu token）；可能 data-grid 包了层 div 背景错或没消费对 token。
- **验证要点**：filter 下拉菜单背景色与 antd 逐值对齐；**dark 模式**下也正确（dark 背景应跟随）。

### I. summary · 列宽与 antd 不同
- **demo**：`#/demos/summary`
- **问题**：列宽分布与 antd 不同。
- **涉及**：**先读两侧 columns 对比 width**；示例2 scroll.x:2000 数字下 C1 minmax 分配 vs antd colgroup。
- **验证要点**：逐列宽度对齐；**dark+light**。

### J. summary · summary cell 未横向固定
- **demo**：`#/demos/summary`（示例2 有固定列 + summary fixed）
- **问题**：有固定列时，summary cell **未横向 sticky 固定**（应跟随固定列横向固定，但没固定，横滚时 summary 区固定列格不贴边）。
- **涉及**：`Summary.tsx` SummaryCell sticky 定位（纵向 sticky bottom 已有，横向 sticky left/right 缺）+ 与 M2 固定列组合。
- **验证要点**：横滚时 summary 区的固定列格 sticky 贴左/右（与表体固定列一致）。

### K. FloatingScrollBar · 滚动条贴边（原位，非向内移位）
- **demo**：全局（所有用悬浮滚动条的 demo：scroll.y/scroll.x/sticky/virtual 等）
- **问题**：8px hit-test 区扩大**被误解为滚动条向内移位**——实际滚动条（thumb/track）应**看起来还在原位（贴边）**，hit 区向外/向内扩展但滚动条视觉位置不变。当前滚动条向内移了。
- **涉及**：`FloatingScrollBar.tsx`（thumb/track 定位）+ `table.css` FloatingScrollBar 样式。hit 容器（24px）在外，thumb（2px/8px）应贴容器边缘（原位），非居中或内移。
- **方向**：thumb 紧贴滚动容器边缘（top:0/right:0 等），hit 区是透明的扩展（向外），不改变 thumb 视觉位置。纵向条贴右边缘、横向条贴底边缘。
- **验证要点**：滚动条视觉贴边（与 antd 原生滚动条位置感一致），不内移；hover 时 hit 区扩展但 thumb 不跳位。

### L. FloatingScrollBar · hover 色增强
- **demo**：全局（同 K）
- **问题**：悬浮滚动条 hover 色太弱（不够明显）。
- **涉及**：`table.css` FloatingScrollBar thumb hover 色（当前 `rgba(0,0,0,0.45)` 左右）→ 增强（更深/更明显，参考 antd 或 macOS 风格）；**dark 模式**下 hover 色也要可见（浅色）。
- **验证要点**：hover 时滚动条明显变深（light）/变浅（dark），对比足够。

### M. demo · 深色/浅色模式切换按钮
- **demo**：全局（所有 demo 或对照框架层）
- **问题**：demo 无 dark/light 切换按钮，导致 dark 主题对齐从未验证。
- **涉及**：`SplitDemo.tsx`（对照框架外壳）或各 demo 根组件加一个全局 theme Switch（ConfigProvider `theme.algorithm` dark/default 切换），驱动两侧 antd + data-grid 同时切。
- **方向**：在 SplitDemo 加一个 theme toggle（Switch），包一层 ConfigProvider 切 dark/default algorithm，两侧共享。这样所有 demo 都能验证 dark mode。
- **验证要点**：切换后两侧都切 dark/light；dark 下所有状态（hover/selected/边框/滚动条/filter menu/empty 等）与 antd dark 逐项对齐。

### N. （流程任务）验证覆盖加强 · 回归所有 demo 的交互态/dark mode
- **问题**：§11 验证遗漏交互态 + dark mode。本任务是对**已通过的 demo 做交互态 + dark mode 补验**（不限于上述 A-M 的 demo）。
- **方向**：M 落地（dark/light toggle）后，对所有 49 demo 在 **dark + light 双模式**下重做关键交互态核对（滚动/翻页/固定列/拖拽/展开/排序筛选）；发现新问题补任务。
- **验证要点**：每 demo dark+light 双模式 + 交互态逐项；读两侧 demo 源码对比配置。

---

## 工作模式（任务推进方式 + agent 规范）★ 抄自 task-plan §工作模式，本任务沿用

### 推进方式
- **实施 ↔ 验证 交替循环**：main 只调度，每轮启动 1 个实施者或验证者，完成后启动下一个，循环到任务通过。
- **不用 agent teams**：不用 TaskList 任务列表系统、不用 teammate。
- 每个任务流程：实施者按规格实现（lint/build 通过）→ 验证者按浏览器 UI 测试规范验证 → 有问题回实施者修复 → 再验证，循环到通过，再进下一任务。
- **进度用 Claude TaskCreate 代办跟踪**（本文件任务逐条建代办，防遗漏）。

### ★ agent 规范（核心：避免 teammate / 浏览器争抢）
1. **只用普通 background agent，不用 agent teams / teammate**：
   - 用 Agent 工具启动 background agent，**不给 `name` 参数**（给了 name 就成可被 SendMessage 寻址的 teammate，违规）。
   - 普通背景 agent 靠 agentId 寻址，独立跑完返回结果。
2. **验证者直接用 chrome-devtools，禁止 spawn 子 agent**：
   - 验证者本身是 Agent 工具创建的 background **隔离上下文**，已满足全局规约"chrome-devtools 须在隔离上下文使用"——**直接用 chrome-devtools MCP**（navigate_page / take_snapshot / click / fill / evaluate_script / list_console_messages / take_screenshot / hover / wait_for / press_key 等）。
   - **绝对禁止验证者再用 Agent 工具 spawn 任何子 agent**（无论 teammate 还是其他）。
   - 原因：① chrome-devtools 连同一个浏览器实例，多 agent 并行操作会争抢；② 主 agent 被 kill 时子 agent 变孤儿；③ spawn 带 name 的子 agent = teammate = 违规。
   - 串行完成所有浏览器步骤。
3. **kill agent 注意**：确认无遗留孤儿子 agent。

### ★ 调度者（main）硬性约束（用户重点纠正，曾违反）
- **main 绝不直接改代码**（不用 Edit/Write 改 src/**/*.{ts,tsx,css}）。所有代码修改派 implementer subagent。main 只：读文件建上下文、调度、TaskCreate/Update 跟踪、写 task-plan/memory 进度、派发 agent。
- 实施者崩溃留半成品：不自己接手，派新实施者补完（prompt 附 main 的分析 + 缺口清单）。
- 标任务状态前**按 task subject 核对 demo 名**（曾把任务标错号）。

### Agent 工具启动模板（正确参数）★ 照此启动

**实施者**（普通 background agent）：
```
Agent({
  description: "实施 <任务号> <任务名>",        // 3-5 词
  subagent_type: "general-purpose",
  run_in_background: true,
  prompt: "<任务详情：先读本文件对应任务 + task-plan §11 + §1.5 测试规范 + §8；给出目标/参考文件/约束/返回格式>"
  // ★ 不要 name！不要 model（省略继承父模型）！
})
```

**验证者**（普通 background agent，直接用 chrome-devtools）：
```
Agent({
  description: "验证 <任务号> <任务名>",
  subagent_type: "general-purpose",
  run_in_background: true,
  prompt: "
    你是普通 background agent（本身就是隔离上下文）。
    ★ 直接用 chrome-devtools MCP（navigate_page/take_snapshot/click/fill/evaluate_script/list_console_messages/take_screenshot/hover/wait_for），串行。
    ★ 绝对禁止用 Agent 工具 spawn 任何子 agent。
    <验证步骤：读本文件任务 + task-plan §1.5 + 实施者产出；对照 antd demo 实测要点；返回 通过/不通过 + 问题清单 + 证据>
  "
  // ★ 不要 name，不要 model
})
```

**关键检查**：每次启动 agent 前，确认参数里**没有 `name`**、**没有 `model`**、`run_in_background: true`、`subagent_type: "general-purpose"`。

### 实施者规范
- 普通背景 agent（不给 name）。
- **表格核心自研**，**非核心通用控件用 antd**（决策 6：loading/spin、tooltip、pagination、筛选下拉、dropdown、empty 等）。
- 优先内置 Read/Write/Edit/Grep/Glob（Windows 路径）；Bash 仅 pnpm（易卡死，大 timeout）；**不做 UI 验证**（交验证者）；**不 spawn 子 agent、不开浏览器**。

### 验证者规范（★ 本轮加强，纠正 §11 遗漏）
- **★ 必须读两侧 demo 源码**对比配置（`src\demos\<name>.tsx` + `_compare\<name>.shared.ts` vs antd demo），列宽/翻页器/scroll/size 等 props 逐项对齐，不只浏览器目测。
- **★ 必须覆盖交互态**：滚动（横滚到底/纵滚到底/中间）、翻页（翻页/改 pageSize）、拖拽中、固定列横滚贴边、展开/收起、排序/筛选激活+清除。
- **★ 必须测 dark + light 双模式**（任务 M 落地后；dark 主题下所有状态重新核）。
- **★ 滚动条**：贴边位置（原位）+ hover 色 + dark 模式色。
- **★ 不靠目测**：evaluate_script 读两侧 computed style + antd `--ant-*` token 精确定位差异。
- **★ 截图统一存 `G:\Projects\trash-antd-table\data-grid\docs\verify\`**，命名 `p<任务号>-<demo>-<状态>.png`（p=polish）。
- **绝对禁止 spawn 子 agent**。

---

## ★ 浏览器 UI 测试规范（抄自 task-plan §1.5 + 加强）

每个任务交付前，必须完成基于浏览器的 UI 验证：

1. **复刻对照**：navigate `#/demos/<name>`，左右双栏（左 data-grid / 右 antd 6.4.4）。
2. **读源码对比配置**：读两侧 demo 源码，列宽/翻页器/scroll/size 等 props 逐项对齐（不只目测）。
3. **浏览器逐项验证**（chrome-devtools，对照 `G:\Projects\ant-design\components\table\demo\<name>.tsx`）：
   - **渲染正确性**：表头/单元格/对齐/边框/尺寸与 antd 一致。
   - **交互行为**：滚动（横/纵，到底/中间）、翻页、排序/筛选/勾选/展开/拖拽，**交互态**（非仅初始静态）与 antd 一致。
   - **视觉对照**：hover/active/selected/disabled/focus/展开/排序三态/筛选激活等**所有状态**，必要时截图比对。
   - **dark + light 双模式**：两种主题下都核对。
   - **console 无 error**。
4. **token/变量核对**：devtools 读两侧 computed style + antd `--ant-*` token，确认 data-grid 用对 token。
5. **截图存档**：`docs/verify/p<任务号>-<demo>-<状态>.png`。
6. **回归**：改动共享 table.css/tokens.css 的任务，回归相关 demo（共享 CSS 单 demo 修复可能回归其它）。

---

## 参考文件（必读）
- **本任务清单**：`docs/align-polish-tasks.md`（本文件）
- **§11 原始规格 + 工作模式 + 决策**：`docs/task-plan.md` §11 + §工作模式 + §1.5 + §8 + §9
- **共享修复现状**（§11 已落地，勿重做）：memory `theme-injection-antd`（§11 轮共享修复 + getComponentToken 剪枝坑）
- **列宽策略 C1**：memory `data-grid-project`「列宽策略（C1）」+ task-plan §当前进度 C1 收尾
- **调度者不改代码**：memory `orchestrator-no-direct-code-edits`
- **demo 对照框架**：memory `demo-compare-framework`（SplitDemo 左右双栏）
- **antd 源码**（只读对照）：`G:\Projects\ant-design\components\table\demo\` + `style\`
- **dev server**：`http://localhost:5173`（hash 路由 `#/demos/<name>`），未运行则 `pnpm dev`。

## 执行顺序建议
1. **M 先做**（dark/light toggle）——后续所有验证依赖双模式。
2. **K/L**（滚动条贴边 + hover 色）——全局基础设施，影响所有 scroll demo。
3. **A/B**（grouping-columns 表头重叠 + 阴影错位）——交互态 bug，高可见。
4. **E**（pagination 滚动条出框）——滚动条定位。
5. **C/D**（virtual-list 竖滚动条 + 列宽）。
6. **F/G**（tree-data 列宽 + 翻页器）——先读源码对比配置。
7. **H**（filter menu 背景色）。
8. **I/J**（summary 列宽 + summary cell 横向固定）。
9. **N**（全 demo dark+light 交互态补验）——收尾，发现新问题补任务。

每任务：TaskCreate 代办 → 实施者（lint/build）→ 验证者（chrome-devtools 交互态 + dark/light + 读源码）→ 循环到通过 → 标 ☑ → 进下一。
