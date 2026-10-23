# docs 站点构建

docs 站点有三个构建档位，产物目录与用途都不同。默认档是**多文件**，单文件只是离线分发用的补充。

| 档位 | 命令 | 产物 | 用途 |
| --- | --- | --- | --- |
| 默认 | `pnpm build:docs` | `dist-docs/`（多文件 + 内容哈希） | 发布到 GitHub Pages / 任意静态托管 |
| 离线单文件 | `pnpm build:docs:single` | `dist-docs-single/index.html` | 整包分发、`file://` 双击打开、发评审 |
| 第三方 CDN | `pnpm build:docs:cdn` | `dist-docs-cdn/`（`react`/`react-dom`/`antd`/CodeMirror 走 import map） | 源站带宽受限时（如国内访问 GitHub Pages） |

三者共用 `vite.docs.shared.ts` 的插件与分块策略，只在 `singleFile` / `cdn` / `outDir` 上有差异。
`base` 由环境变量 `DOCS_BASE` 覆盖（GitHub Pages 项目站点要写 `/<repo>/`）。

## 为什么默认档不再是单文件

单文件档把整站压进一个 HTML：无缓存、无分包、4.8 MB 内联脚本必须先下完才开始解析。
同一份源码的实测（首屏 = 入口 + 全部 `modulepreload`，gzip）：

| 形态 | 首屏字节 | 说明 |
| --- | --- | --- |
| 改造前（`viteSingleFile`） | **1 311 KB**，1 个请求 | 无缓存，每次访问全量重下 |
| 只关 singlefile（源码未动） | 1 061 KB，95 个请求 | 内容哈希生效，重复访问 ≈0 |
| P0–P5 之后 | 635 KB，36 个 js + 2 个 css | 见下面 P1–P5 |
| **现在（默认档）** | **405 KB**，35 个 js + 2 个 css | 再加 P6–P7（CodeView / 主题编辑器惰性化） |
| 现在（单文件档） | 961 KB，1 个请求 | 保留给离线分发 |
| 现在（CDN 档） | **157 KB**（本地）+ esm.sh ≈430 KB(br) | react/antd/CodeMirror 走 CDN |

## 首屏瘦身做了什么（P0–P7）

| 步骤 | 改动 | 首屏收益 |
| --- | --- | --- |
| P0 | 拆出三档配置，默认档去掉 `viteSingleFile()` | 1 311 → 1 061 KB(gz)，且可缓存 |
| P1 | `src/live/scope.ts` 从 10 个顶层 `import *` 改成「specifier → 动态 import」表；`LiveEditor` 在点「应用」时按编译产物里的 `require("…")` 现取注入表 | 全量 antd / dnd / data-grid 不再被首屏静态拉取 |
| P2 | `src/App.tsx` 的 `LiveEditor` 改 `React.lazy` | sucrase / 注入表栈移出首屏 |
| P3 | `SplitDemoPreview` 去掉 `import.meta.glob(..., { eager: true })` | 59 个 `.dg/.antd` chunk（153 KB）不再预载 |
| P4 | `docRegistry` 每个 slug 用 `lazyPage()` 按需 import | 16 个文档页 + `api.json`（96 KB min）移出首屏 |
| P5 | `src/live/antdScope.ts` / `src/live/icons.ts` 白名单替代 `import *` | 图标 968 KB(min) / antd 全量 1 464 KB(min) 不再进首屏 |
| P6 | `src/App.tsx` + `src/docs/components.tsx` 的 `CodeView` 改 `React.lazy` | 636 → 405 KB(gz) 里的一半以上：CodeMirror 6 + Lezer 491 KB(min)/163 KB(gz) 移出首屏 |
| P7 | `ThemeEditorModal` 改 `React.lazy`（首开才挂载） | antd 的 Table/ColorPicker/Collapse/Slider/Form/InputNumber 不再随首屏下发（默认档 `index` 133 → 88 KB gz） |

P2 当初只改了 `LiveEditor`，漏了 `CodeView` 这条静态链，于是 CodeMirror 一直以
``ThemeContext-<hash>.js`` 的名字躺在首屏（chunk 名取"第一个模块的路径"，与内容无关：
那个 chunk 里项目代码只占 0.7%）。P6 补的就是这一刀。

白名单有测试守着（`tests/live/antd-scope.test.ts`、`tests/live/icon-scope.test.ts`）：
新增 demo 用了没登记的组件/图标就红。漏登记的后果是**只有 live 编辑静默失真**，
demo 页面本身照常 —— 这类缺陷不钉住基本发现不了。

## 四个必须知道的构建语义（都是实测踩出来的）

1. **`import('antd')` 拿命名空间 = 整包进首屏。**
   rolldown 对「命名空间动态导入 + 首屏已有同名模块」会**合并进首屏 chunk**：
   `static Button` + `import('antd')` ⇒ 单个 1 638 KB 的 eager chunk；
   换成懒模块里 `import { DatePicker }` ⇒ Button 294 KB eager + DatePicker 292 KB **真正懒加载**。
   所以 live 作用域必须用显式白名单（`antdScope.ts`），不能用命名空间。
2. **`codeSplitting.groups` 会把懒加载拉回首屏。**
   按依赖图分组（`vendor-antd` / `vendor-editor`）后首屏从 768 KB 反弹到 2 791 KB：
   组内既有 eager 又有 lazy 模块时，chunk 必须整体预载。现在只收拢 `react` 一族。
3. **esm.sh 的 `?external` 必须列全共享集。**
   `@ant-design/icons?external=react` 会把 peer `react-dom >=16.0.0` 编成**绝对 URL**
   （浏览器解析成当时最新版 19.3.1），import map 拦不住绝对 URL ⇒ 双实例 ⇒ React error #527。
   `vite.docs.cdn.config.ts` 里 antd 带 `external=react,react-dom`，并有构建期断言拦 esm.sh 绝对 URL。
4. **CodeMirror 必须"全量外置 + 禁 `?bundle`"，做法与 antd 相反。**
   只列 `@codemirror/state` 时，`@codemirror/view` 会把 `crelt`/`style-mod`/`w3c-keyname`
   编成 root-relative 的**版本区间**（`/crelt@^1.0.6`），import map 拦不住 ⇒ 版本漂；
   而 `?bundle`（antd 那条的省请求手段）会内联一份私有 `@codemirror/state`
   ⇒ 必踩 CodeMirror 自己的 "multiple instances ... breaking instanceof checks"。
   所以 18 个包全部进 `external=`、版本由生成表
   （`src/docs/generated/cdn-importmap.json`，`pnpm docs:cdn-map` 生成）钉死。
   细节见 `docs/decisions/0011-codemirror-cdn-externalization.md`。

## import map 的三种策略（唯一来源 `CDN_ROOTS`）

`pnpm docs:cdn-map` 把 `scripts/gen-cdn-importmap.mjs` 里的 `CDN_ROOTS` 表落成
`src/docs/generated/cdn-importmap.json`；vite 配置只负责"把表铺成 import map"，不再手写 URL。
判据只有一条：**这个包族会不会跨模块做 `instanceof` / 引用相等**。

| 策略 | 谁 | 落地方式 | 为什么 |
| --- | --- | --- | --- |
| `single` | `react` / `react/jsx-runtime` / `react-dom` / `react-dom/client` | 一个裸 specifier 一条 URL，只声明共享集 | 依赖交给 esm.sh 自己解析 |
| `bundle` | `antd` | 一条 URL + `&bundle` | 不 bundle 会拆成 1163 个模块请求；antd 不跨模块做引用相等，内联无副作用 |
| `family` | CodeMirror 闭包（18 个包） | 每个包各占一条，每条 `?external=` 列全闭包、禁 `bundle` | 跨模块 `instanceof @codemirror/state`：内联就是两份实例 |

版本一律**每个包从自己的 package.json 取**。曾经 `react-dom` 复用了 `react` 的版本号，
而 `react-dom` 的 peer 是 `^19`：装出 react 19.3 + react-dom 19.2 那天会 pin 出一个不存在的
版本 ⇒ esm.sh 404。`tests/cdn-importmap.test.ts` 现在钉住了这条。

## 发布到 GitHub Pages

- `DOCS_BASE=/<repo>/ pnpm build:docs`；入口 `index.html` 与 `/assets/*` 一起上传。
- Pages 的响应头是固定的：`cache-control: max-age=600`（不可改）。首次访问吃满带宽，
  10 分钟后回源只发 304；要一年 immutable 只能靠 CDN（jsDelivr `/gh/<owner>/<repo>@<tag>/`）。
- 国内 40 KB/s 的典型链路上，首屏 405 KB(gz) ≈ 10 s；同字节走 CDN 才有意义 —— 这也是 CDN 档存在的理由。
- CDN 档只是「换 host」，**不减少字节**：antd 在 esm.sh 上是全量 bundle（≈380 KB br，不 tree-shake）。
  是否启用要按真实网络实测决定，两条产物都能直接部署。
- CDN 档**唯一能砍掉的本地字节是 CodeMirror**（P6/P7 之后它连首屏都不在）：
  本地 157 KB(gz) 全部是站点自有代码 + esm.sh 拿不到的 `@ant-design/icons` 部分。
  剩下的 antd 字节在 CDN 档是常量：只要首屏有一个 `import { … } from 'antd'`，380 KB br 整包就来。

## 剩余热点（后续可做，不在本轮）

默认档首屏最大的几块（gzip，实测 405 KB 总量）：`index` 88 KB、`tree` 83 KB、`vendor-react` 58 KB、
`table` 52 KB（data-grid 自身）、`button` 49 KB、`tooltip` 19 KB。

- `tree` 是**库内**依赖：`src/table/engine/FilterBuiltinPanel.tsx` 静态 import 了 antd 的
  `Tree`/`Checkbox`/`Input`/`Radio`/`Button`，于是每个消费者（包括 docs）都要为「可能永远不打开的筛选面板」
  付 332 KB(min)/83 KB(gz)。把筛选面板拆成动态 `import()` 是下一步收益最大的一刀，
  但会动引擎内部与相关测试（`e2e/filter-in-tree.spec.ts`），单独排期。
- `index` 里剩下的 antd 组件（Card/Typography/Button/Alert/Spin/Tag/Drawer/Input）都是壳层首帧就要用的，
  再拆只能换来 loading 闪动。
- `table-<hash>.js` 里还混着约 14 KB(gz) 的 `antd/es/*` 深路径（en_US locale、`antd/es/grid`、
  `antd/es/menu/OverrideContext` → `@rc-component/form`）。要外置这些得把 `antd/es/*` 全写进 import map，
  并接受 esm.sh 上两份 `cssinjs`（样式缓存分裂）；更划算的是先在库里消掉这几处深路径。

## 怎么复现这些数字

`tmp/` 下是一次性探针（已被 `.gitignore` 忽略）：

```powershell
pnpm build:docs
node tmp/firstscreen.mjs dist-docs                     # 首屏 = 入口 + modulepreload + css，逐文件 raw/gzip/br
node tmp/firstscreen-audit.mjs tmp/dist-docs-srcmap    # 逐 chunk 归因：里面是谁的代码 + 谁把它拉进首屏
node tmp/chunk-share.mjs <assets 目录> <chunk 名…>      # 单个 chunk 里每个包占多少（需 --sourcemap 另建产物）

npx vite build --config vite.docs.cdn.config.ts --outDir tmp/dist-cdn-srcmap --sourcemap
node tmp/firstscreen.mjs dist-docs-cdn

pnpm docs:cdn-map          # 重新生成 CDN 档 import map 落地表（依赖升级后必须跑）
pnpm check:esmsh           # 联网自检：family 组 18 条 URL（--all 连 react/antd 共 23 条）
```

`scripts/check-esmsh-externals.mjs` 是**唯一**能发现"esm.sh 又把某个依赖内联回去"的手段：
这种情况不会让构建变红（产物里既没有 esm.sh 字面量也没有多余外部导入），只会让 `family` 组在浏览器里炸 `instanceof`。
