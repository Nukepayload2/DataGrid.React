# CDN 档 CodeMirror 外置 + 首屏大依赖懒加载（规划）

> 状态：**只做了测量与设计，代码未动**。等通知后按第 11 节顺序执行。
> 本文件的读数全部是实测（sourcemap 逐模块归因 + 产物 gzip/br），不是估算。

## 0. 一句话

`ThemeContext-*.js`（491 KB raw / 163 KB gz）是 **CodeMirror 6 + Lezer 的代码，套了个 `src/theme/ThemeContext.tsx` 的名字**，而它被 `modulepreload` 钉在首屏 ——
所以本轮做两件互不替代的事：

1. **P1 外置**：CDN 档把 CodeMirror 全量交给 esm.sh（本地产物里彻底消失）。
2. **P2 懒加载消费端**：`CodeView` 惰性化 —— 否则"外置"只是换 host，首屏字节一点没少。

P3 再把默认档里非首屏必需的大依赖（theme-editor、筛选面板的 antd `Tree`）挪出首屏。

## 1. 现状读数

### 1.1 三档首屏（入口 + 全部 `modulepreload` + css）

| 档位 | 首屏文件数 | raw | gzip | br |
| --- | --- | --- | --- | --- |
| 默认 `dist-docs` | 38 | 2029 KB | **636 KB** | 539 KB |
| CDN `dist-docs-cdn`（本地部分） | 15 | 1059 KB | **324 KB** | 270 KB |
| CDN 档另需 esm.sh | — | — | — | react ≈50 + antd ≈380 |

### 1.2 逐 chunk 归因（sourcemap `sources` + `sourcesContent`）

| chunk | raw / gz | 模块 | 内容 | 归属 |
| --- | --- | --- | --- | --- |
| `ThemeContext-*.js` | 491 / **163** | 20 | view 37% · state 11% · language 8% · autocomplete 7% · commands 6% · lezer/common 6% · lezer/javascript 6% … **项目代码仅 0.7%**（`CodeMirrorEditor.tsx` + `ThemeContext.tsx`） | 第三方，可外置 |
| `table-*.js`（CDN 档） | 252 / 74 | 183 | 81% `src/table/**`；19% `antd/es/*` 深路径（`@rc-component/form` 7.5% · antd 4.3% · async-validator 3.4% · cssinjs 2.9%） | 自己的库，不可外置 |
| `index-*.js`（CDN 档） | 243 / 65 | 23 | 95.6% 站点壳 + 页面注册 | 自己的代码 |
| `index-*.js`（默认档） | 466 / 133 | — | antd 48% + `@rc-component/table` 15% + `@rc-component/tabs` 7% | 见 1.3-c |
| `tree-*.js`（默认档） | 332 / **100** | — | antd 42% + rc-select 11% + rc-tree 10% + rc-form 9% | 见 1.3-d |
| `button-*.js`（默认档） | 142 / 50 | — | antd 36% + rc-trigger 16% + cssinjs 11% | 壳自身按钮，不动 |

### 1.3 四条事实（决定了下面的方案）

- **a. chunk 名 = 该 chunk 里第一个模块的路径，与内容无关。** `ThemeContext` 这个名字是 `src/theme/ThemeContext.tsx`（236 行、0.7% 体积）带来的，不是 antd 的 `ThemeContext`。
- **b. CodeMirror 之所以在首屏，是 `CodeView` 这条静态链没跟着 P2 一起惰性化。**
  `src/App.tsx:33` `import CodeView` + `src/docs/components.tsx:14` `import CodeView`，两处都是静态 import；`App.tsx:47` 只把 `LiveEditor` 改成了 `lazy`。
- **c. 默认档 `index` chunk 的 antd 大头来自 `src/demos/theme-editor.tsx`。** 它一次性静态引入 `Button/Card/Collapse/ColorPicker/Form/InputNumber/Segmented/Slider/Space/Table(antd)/Tag/theme`，被 `App.tsx:36` 的静态 `import ThemeEditorModal` 拉进首屏 —— 而这个 Modal 只在点顶栏按钮时才出现。
- **d. `tree` chunk 来自库内 `FilterBuiltinPanel`。** `src/table/engine/FilterDropdown.tsx:53` 静态 import，面板只在筛选下拉打开时才渲染。
- **e. CDN 档里"外置 antd"只外置了裸 `antd`。** `external: ['antd']` 不匹配 `antd/es/*` 子路径，所以 en_US locale、`antd/es/grid`、`antd/es/menu/OverrideContext`（→ `_util/ContextIsolator` → `form/context` + `space/Compact` → `@rc-component/form` 全量）都被打进 `table-*.js`。本轮**不处理**（约 14 KB gz，见 5.3）。

## 2. 目标与边界

- 目标：把 CodeMirror 从"我的产物"里彻底移出（CDN 档），并把非首屏必需的大依赖移出首屏（三档）。
- 不在本轮：`antd/es/*` 深路径归位、引擎内部架构调整、默认档 `button` 拆分。
- 不变量：
  - 单文件档（`dist-docs-single`）继续能 `file://` 离线打开 ⇒ **不外置任何东西**。
  - 默认档继续自托管 ⇒ **不依赖公共 CDN**。
  - 只有 `cdn: 'esmsh'` 档新增外置项。

## 3. P1：CodeMirror 全量外置（仅 CDN 档）

### 3.1 必须"全外置"，不能只外置 state

实测（`Invoke-WebRequest` 直接看 esm.sh 返回的 import 语句）：

| 请求 | 结果 |
| --- | --- |
| `@codemirror/view@6.43.6?external=@codemirror/state` | shim 里仍有 `/crelt@^1.0.6`、`/style-mod@^4.1.0`、`/w3c-keyname@^2.2.4` —— **root-relative + 版本区间**，import map 拦不住，等于放弃锁版本 |
| `@codemirror/view@6.43.6?external=@codemirror/state,crelt,style-mod,w3c-keyname` | shim 只剩 1 条 `export * from "/@codemirror/view@6.43.6/X-Z…/es2022/view.mjs"`；inner 的 specifier 全为裸名：`@codemirror/state` / `crelt` / `style-mod` / `w3c-keyname`；body 内 `https://esm.sh/` 计数 = **0** |
| `@codemirror/lang-javascript@6.2.5?external=<7 个>` | 同上，裸名含 `@lezer/common`、`@lezer/javascript`；绝对 URL = **0** |
| `codemirror@6.0.2?external=<7 个>`、`@codemirror/theme-one-dark@6.1.3?external=<4 个>` | 同上 |

结论：**把闭包里每个包都写进 `external=`**，esm.sh 才会把每个依赖都吐成裸 specifier，由我们的 import map 一一钉死 ⇒ `@codemirror/state` 在页面上只有一个实例 ⇒ 不会踩 `@codemirror/view` 里那句

> `Unrecognized extension value in extension set (…). This sometimes happens because multiple instances of @codemirror/state are loaded, breaking instanceof checks.`

（这句话现在就在 `ThemeContext-*.js` 里躺着。）

**禁止 `?bundle`**：`?bundle` 会把依赖内联进产物，`basicSetup` 与我们的 `EditorState` 就来自两份 state —— 双实例必崩。antd 用 `?bundle`（1163 请求 → 1）是另一回事，因为它不涉及 `instanceof` 互认。

### 3.2 版本来源：生成表，禁止手写

`tsconfig.node.json` 刻意不引 `@types/node`（见 `vite.docs.shared.ts:34-36` 的注释），因此 **不能** 在 TS 配置里 `import { createRequire } from 'node:module'`。
沿用仓里既有的"Node 侧用 `.mjs` 脚本、产物 JSON 提交进 git"的套路（`scripts/extract-api.mjs` → `src/docs/generated/api.json`，已 git 跟踪）：

- 新增 `scripts/gen-codemirror-cdn-map.mjs`
  - 从 5 个直接 specifier 出发：`codemirror`、`@codemirror/state`、`@codemirror/view`、`@codemirror/lang-javascript`、`@codemirror/theme-one-dark`
  - 用 `createRequire` 逐个 `require.resolve('<pkg>/package.json')`，读 `version` + `dependencies`，递归求闭包（去重、按名排序）
  - 写 `src/docs/generated/codemirror-cdn.json`：`{ packages: [{ name, version }], externals: [name…] }`（确定性输出，便于 diff）
  - `--check` 模式：只比对不写文件，不一致 → 非零退出
- `package.json`
  - `"docs:codemirror": "node scripts/gen-codemirror-cdn-map.mjs"`
  - `"build:docs:cdn": "pnpm docs:api && pnpm docs:codemirror && vite build --config vite.docs.cdn.config.ts"`
  - `"test": "vitest run && pnpm run test:css-compat && node scripts/gen-codemirror-cdn-map.mjs --check"`

预期闭包 18 个包（实测版本，全部单版本、无重复）：`@codemirror/{autocomplete,commands,lang-javascript,language,lint,search,state,theme-one-dark,view}`、`@lezer/{common,highlight,javascript,lr}`、`@marijn/find-cluster-break`、`codemirror`、`crelt`、`style-mod`、`w3c-keyname`。

### 3.3 实施点

- `vite.docs.shared.ts`
  - 顶部 `import codemirrorCdn from './src/docs/generated/codemirror-cdn.json'`（`resolveJsonModule` 已开）。
  - `CDN_EXTERNALS` 扩展为 `[…现有 5 个, ...codemirrorCdn.externals]` —— 把叶子包也列进 `external`，是为了让"以后有人在 `src/` 里直接 `import '@codemirror/language'`"也走 CDN 而不是偷偷变成本地 chunk（双实例）。
  - `createEsmShImportMap()` 增一组：每个包 `https://esm.sh/<name>@<version>?external=<externals 逗号连接>`，与 react/antd 三条并列。
  - 注释写清三条"实测踩出来的"约束：全量 external、禁 `?bundle`、版本取生成表。
- 单文件档 / 默认档：`cdn` 未开启 ⇒ 一行不变。

### 3.4 守卫（三条，全部挡在构建期）

`docsCdnGuardPlugin` 扩为：

1. **每个裸 specifier 必须在 import map 里**：正则扫 chunk 的 `from"X"` / `import"X"`，`X` 不是相对路径且不在 map 键集合 → `this.error`（兜住"外置了但忘了映射"与"漏了 external 的裸导入"）。
2. **CodeMirror 条目必须带 `external=` 且不含 `bundle`**：任何 `@codemirror/*` / `@lezer/*` 的 URL 不满足 → `this.error`。
3. 保留现有的"chunk 内不得出现 `https://esm.sh/` 字面量"与"import map 必须在入口 module script 之前"。

再加一个**联网探针**（不进 `pnpm test`，因为要网络）：`scripts/check-esmsh-externals.mjs`
- 取 import map 里每条 CDN URL，抓回来断言：① 该 URL 与它 re-export 的 inner 模块里 `https://esm.sh/` 计数为 0；② 所有裸 specifier ⊆ 闭包。
- 这是唯一能发现"esm.sh 某天又开始内联某个 dep"的手段（内联不会让上面三条构建期断言变红，但会造成双实例）。

### 3.5 代价（要认下来）

- **请求数**：全外置 ⇒ 每个包 2 个请求（shim + inner），18 包 ≈ 36 个（HTTP/2 并行、esm.sh 长缓存）。现状是 1 个本地 chunk。这是"字节不从你的源站出"换来的成本。
- **首屏字节不变**：若同时不做 P2，浏览器照样在首屏下载 137 KB br 的 CodeMirror，只是从 esm.sh 下。**这就是 P2 必做的原因。**

## 4. P2：消费端懒加载（三档都做）

- `src/App.tsx`
  - `const CodeView = lazy(() => import('./CodeView'))`（第 33 行改），第 633 行 `<CodeView …/>` 包进 `<Suspense fallback={<div>Loading source…</div>}>`（与 594/631 的文案一致）。
  - `const ThemeEditorModal = lazy(() => import('./ThemeEditorModal'))`（第 36 行改），调用处包 Suspense。
- `src/docs/components.tsx`
  - 第 14 行静态 import 改 lazy；`DocsCode` 的只读分支（第 177-179 行）包 Suspense，fallback 用 `height`/`maxHeight` 等高占位，避免 CLS。
- 收益：默认档 636 → **473 KB gz**；CDN 档本地 324 → **161 KB gz**，且 CodeMirror 只在展开"源码"折叠面板或进 docs 代码块时才向 esm.sh 请求。
- 观感变化：源码区首次展开有 ~1 帧 loading。**这是 P2 唯一的 UX 代价，需拍板**（见第 10 节）。

## 5. P3：其余大依赖懒加载

### 5.1 `theme-editor`（默认档 −50~70 KB gz 预估）

- 已由 4 节的 `ThemeEditorModal` 惰性化覆盖（它是唯一引入点）。
- 关键：`src/demos/theme-editor.tsx` 只能被 `ThemeEditorModal` 引用；落地后要复测 `index` chunk 里 antd/rc-table/rc-tabs 是否真的走掉，并确认 `modal`(11)/`form`(9)/`input-number`(7)/`typography`(7) 这几个 chunk 是否随之离开首屏。
- CDN 档收益 ≈0（antd 已是外置整包；`index` 里 95.6% 是项目代码，本地只省 ~5 KB gz）。

### 5.2 筛选面板的 antd `Tree`（默认档 −100 KB gz）

- `src/table/engine/FilterDropdown.tsx:53`：`FilterBuiltinPanel` 改
  `const FilterBuiltinPanel = lazy(() => import('./FilterBuiltinPanel').then(m => ({ default: m.FilterBuiltinPanel })))`，
  第 446 行使用处包 `<Suspense fallback={null}>`（面板只在打开时渲染，不会闪空白）。
- 代价：动引擎内部 + 相关测试（`e2e/filter-in-tree.spec.ts`、筛选面板单测）。
- CDN 档收益 ≈0（同上，`Tree` 来自 esm.sh 的 antd 整包）。
- 备选（不推荐，收益更低）：只把 `Tree`/`Checkbox` 换成本地轻实现。

### 5.3 明确不动

| 项 | 原因 |
| --- | --- |
| `button` 50 KB gz | 顶栏/首页首帧就要，懒加载只会更慢 |
| `table-*.js` 里的 `antd/es/*` 14 KB gz | 要外置就得把 `antd/es/*` 全写进 import map，并接受 esm.sh 上两份 `cssinjs`（样式缓存分裂） |
| `vendor-react` 58 KB gz | 首屏必需 |
| `compile`(sucrase) 196 KB | 已经是懒加载，不在首屏 |

## 6. 预期读数（执行后按此验收）

| 阶段 | 默认档首屏 gz | CDN 档首屏本地 gz | CodeMirror 是否在产物里 |
| --- | --- | --- | --- |
| 现在 | 636 | 324 | 是（491 KB chunk） |
| P1 | 636 | **161** | 否（改由 esm.sh 供） |
| P1+P2 | **473** | **161** | 否，且首屏不下载 |
| +P3.1 | ~410 | ~156 | 否 |
| +P3.2 | **~310** | ~156 | 否 |

（P1 单独落地时 CDN 档"本地字节"减 163，但真实首屏下载量不变 —— 表格里的 161 只统计本地文件，esm.sh 侧 137 KB br 的 CodeMirror 仍会在首屏发生，除非 P2 也做。）

## 7. 测试与门禁

- `scripts/gen-codemirror-cdn-map.mjs --check` 进 `pnpm test`（防版本漂移）。
- 新增 `tests/docs/cdn-importmap.test.ts`（纯函数级）：断言 react/antd 三条仍在、CodeMirror 条目数 = 闭包大小、每条带 `external=`、无 `bundle`、无重复键、版本与 JSON 一致。
- `pnpm test` / `pnpm test:e2e`（现有 7 个 spec 必须全绿）。
- 单文件档冒烟：`pnpm build:docs:single` 后 `file://` 打开，确认编辑器可用（证明没被外置污染）。
- CDN 档浏览器冒烟（chrome-devtools）：`npx vite preview --config vite.docs.cdn.config.ts --port 4173` →
  - Network：CodeMirror 的 URL 全部来自 `esm.sh`，无本地产物；
  - Console：无 React #527（双 React）、无 CodeMirror `instanceof` 报错；
  - 交互：进 `#/basic-table` → 展开"源码" → 编辑器出现且高亮正常 → live 编辑点"应用" → 预览更新。

## 8. 文档

- `docs/architecture/docs-build.md`：读数表加一行"CDN 档 CodeMirror 外置"；在"三个必须知道的构建语义"里补第 4 条（外置必须全量 + 禁 bundle + 生成表锁版本）；更新"剩余热点"（`ThemeContext` 那条改写成 CodeMirror 已外置、剩余热点只剩 `table`/`index`/`tree`）。
- 新增 `docs/decisions/0011-codemirror-cdn-externalization.md`（ADR）：为什么全外置、为什么不 `?bundle`、为什么单文件档不外置、代价与回退。
- `AGENTS.md`：`{src}/code/CodeMirrorEditor.tsx` 行补"外置边界（CDN 档）"；`{docs}/architecture/docs-build.md` 行不变。执行时按仓库既有行式风格改。

## 9. 风险与回退

| 风险 | 影响 | 处置 |
| --- | --- | --- |
| esm.sh 在目标网络不可达/慢 | 编辑器打不开（站点其余部分正常，因为它已外置 antd/react，同样依赖 esm.sh） | 决定档位；回退 = 用默认档产物，一行配置 |
| 36 个请求的 RTT | 首次打开编辑器变慢 | 编辑器本来就在交互后才用；esm.sh 长缓存；必要时再评估"只外置 11 个共享包、内联 4 个叶子" |
| esm.sh 把某 dep 又内联（未来） | 双实例 → 编辑器崩 | `scripts/check-esmsh-externals.mjs` 探针 |
| CodeMirror 版本漂移 | 类型/行为不一致 | 生成表 + `--check` 进 `pnpm test` |
| P2 的 loading 闪动 | 观感 | 等高占位；必要时只对 `#/` 首页保留 eager（牺牲收益） |
| P3.2 动引擎 | 回归 | 先做 P1/P2，P3.2 单独一次提交，跑 `e2e/filter-in-tree.spec.ts` + 筛选相关单测 |

## 10. 待拍板

1. **P2 做不做**（`CodeView` 惰性化）：不做则 P1 只是换 host，首屏字节不变；做则默认档 −163 KB gz。推荐做。
2. **P3 本轮做不做**：收益全在默认档（CDN 档 ≈0），其中 5.2 会动引擎与测试。推荐 P1+P2 先落，P3 单独排。
3. **单文件档是否也要外置**：推荐不要（离线 `file://` 会废）。

## 11. 执行顺序（等通知）

1. P1 步骤 3.2（生成脚本 + JSON）→ 3.3（配置）→ 3.4（守卫 + 探针）→ 7 的单测/门禁 → 8 的 docs-build 与 ADR。
2. `pnpm build:docs:cdn` → `node tmp/firstscreen.mjs dist-docs-cdn` 对账（预期本地 161 KB gz，CodeMirror 原名消失）。
3. P2 → 复测两档（636→473 / 324→161）；chrome-devtools 冒烟。
4. （若拍板做）P3.1 → 复测；P3.2 → 复测 + e2e。

## 附：本轮新建的探针（都在 `tmp/`，已忽略）

- `tmp/chunk-share.mjs <dir> <chunk…>`：按 `sourcesContent` 算每个包在 chunk 里的占比，并给 raw/gzip/br。
- `tmp/firstscreen.mjs <dist>`：从 `index.html` 抓首屏资源，逐文件 raw/gzip/br + 合计。
- `tmp/firstscreen-audit.mjs <dist>`：默认档首屏逐 chunk 归因（包占比 + 项目入口文件）。
- `tmp/dist-docs-srcmap/`、`tmp/dist-cdn-srcmap/`：带 `--sourcemap` 另建的临时产物（`dist-docs*` 原样未动）。
