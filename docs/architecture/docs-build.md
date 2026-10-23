# docs 站点构建

docs 站点有三个构建档位，产物目录与用途都不同。默认档是**多文件**，单文件只是离线分发用的补充。

| 档位 | 命令 | 产物 | 用途 |
| --- | --- | --- | --- |
| 默认 | `pnpm build:docs` | `dist-docs/`（多文件 + 内容哈希） | 发布到 GitHub Pages / 任意静态托管 |
| 离线单文件 | `pnpm build:docs:single` | `dist-docs-single/index.html` | 整包分发、`file://` 双击打开、发评审 |
| 第三方 CDN | `pnpm build:docs:cdn` | `dist-docs-cdn/`（`react`/`react-dom`/`antd` 走 import map） | 源站带宽受限时（如国内访问 GitHub Pages） |

三者共用 `vite.docs.shared.ts` 的插件与分块策略，只在 `singleFile` / `cdn` / `outDir` 上有差异。
`base` 由环境变量 `DOCS_BASE` 覆盖（GitHub Pages 项目站点要写 `/<repo>/`）。

## 为什么默认档不再是单文件

单文件档把整站压进一个 HTML：无缓存、无分包、4.8 MB 内联脚本必须先下完才开始解析。
同一份源码的实测（首屏 = 入口 + 全部 `modulepreload`，gzip）：

| 形态 | 首屏字节 | 说明 |
| --- | --- | --- |
| 改造前（`viteSingleFile`） | **1 311 KB**，1 个请求 | 无缓存，每次访问全量重下 |
| 只关 singlefile（源码未动） | 1 061 KB，95 个请求 | 内容哈希生效，重复访问 ≈0 |
| **现在（默认档）** | **635 KB**，36 个 js + 2 个 css | 见下面 P1–P5 |
| 现在（单文件档） | 962 KB，1 个请求 | 保留给离线分发 |
| 现在（CDN 档） | 323 KB（本地）+ esm.sh ≈430 KB(br) | antd/react 走 CDN |

## 首屏瘦身做了什么（P0–P5）

| 步骤 | 改动 | 首屏收益 |
| --- | --- | --- |
| P0 | 拆出三档配置，默认档去掉 `viteSingleFile()` | 1 311 → 1 061 KB(gz)，且可缓存 |
| P1 | `src/live/scope.ts` 从 10 个顶层 `import *` 改成「specifier → 动态 import」表；`LiveEditor` 在点「应用」时按编译产物里的 `require("…")` 现取注入表 | 全量 antd / dnd / data-grid 不再被首屏静态拉取 |
| P2 | `src/App.tsx` 的 `LiveEditor` 改 `React.lazy` | CodeMirror 480 KB(min) 移出首屏 |
| P3 | `SplitDemoPreview` 去掉 `import.meta.glob(..., { eager: true })` | 59 个 `.dg/.antd` chunk（153 KB）不再预载 |
| P4 | `docRegistry` 每个 slug 用 `lazyPage()` 按需 import | 16 个文档页 + `api.json`（96 KB min）移出首屏 |
| P5 | `src/live/antdScope.ts` / `src/live/icons.ts` 白名单替代 `import *` | 图标 968 KB(min) / antd 全量 1 464 KB(min) 不再进首屏 |

白名单有测试守着（`tests/live/antd-scope.test.ts`、`tests/live/icon-scope.test.ts`）：
新增 demo 用了没登记的组件/图标就红。漏登记的后果是**只有 live 编辑静默失真**，
demo 页面本身照常 —— 这类缺陷不钉住基本发现不了。

## 三个必须知道的构建语义（都是实测踩出来的）

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

## 发布到 GitHub Pages

- `DOCS_BASE=/<repo>/ pnpm build:docs`；入口 `index.html` 与 `/assets/*` 一起上传。
- Pages 的响应头是固定的：`cache-control: max-age=600`（不可改）。首次访问吃满带宽，
  10 分钟后回源只发 304；要一年 immutable 只能靠 CDN（jsDelivr `/gh/<owner>/<repo>@<tag>/`）。
- 国内 40 KB/s 的典型链路上，首屏 635 KB(gz) ≈ 16 s；同字节走 CDN 才有意义 —— 这也是 CDN 档存在的理由。
- CDN 档只是「换 host」，**不减少字节**：antd 在 esm.sh 上是全量 bundle（≈380 KB br，不 tree-shake）。
  是否启用要按真实网络实测决定，两条产物都能直接部署。

## 剩余热点（后续可做，不在本轮）

首屏最大的几块（minified）：`ThemeContext` 491 KB（站点壳用到的 antd）、`index` 466 KB（壳 + docs 组件 + `api.json`）、
`tree` 332 KB、`table` 189 KB（data-grid 自身）、`vendor-react` 185 KB、`button` 142 KB。

其中 `tree` 是**库内**依赖：`src/table/engine/FilterBuiltinPanel.tsx` 静态 import 了 antd 的
`Tree`/`Checkbox`，于是每个消费者（包括 docs）都要为「可能永远不打开的筛选面板」付 332 KB(min)/103 KB(gz)。
把筛选面板拆成动态 import 是下一步收益最大的一刀，但会动引擎内部与相关测试，单独排期。

## 怎么复现这些数字

`tmp/docs-analyze/` 下是一次性探针（已被 `.gitignore` 忽略）：

```powershell
pnpm build:docs
node tmp/docs-analyze/measure-dist.mjs dist-docs          # 首屏 / 懒加载体积
node tmp/docs-analyze/serve-dist.mjs dist-docs 5181        # 本地起静态服务冒烟
node tmp/docs-analyze/esmsh-bundle-size.mjs                # CDN 档各包的 raw/gzip/br
node tmp/docs-analyze/esmsh-peer-leak.mjs                  # 检查 esm.sh 是否泄漏绝对 URL
```
