# 0011 CodeMirror 在 CDN 档外置（不是 antd 那套做法）

## 状态

已实施（P1）。配套：P2 把 `CodeView` / `ThemeEditorModal` 惰性化。

## 背景

docs 站点的 CDN 档（`vite.docs.cdn.config.ts`）把 react / react-dom / antd 交给 esm.sh 的 import map。
发布后首屏最大的单块是 `ThemeContext-<hash>.js`：**491 KB min / 163 KB gz / 137 KB br**。

sourcemap 归因（`tmp/chunk-share.mjs`）：该 chunk 20 个模块里项目代码只占 **0.7%**
（`src/theme/ThemeContext.tsx` 236 行 + `src/code/CodeMirrorEditor.tsx`），剩下 99.3% 是
CodeMirror 6 + Lezer（`@codemirror/view` 37%、`state` 11%、`language` 8%……）。

**chunk 名只取"第一个模块的路径"**，因此 `ThemeContext` 这个名字与内容无关。
它进首屏的原因不是 `LiveEditor`（那个已经 `lazy` 了），而是 `src/App.tsx` 与
`src/docs/components.tsx` 对 `CodeView` 的**静态** import。

## 决策

把 CodeMirror 整个闭包（18 个包）交给 esm.sh，做法是**逐包 `?external=<整个闭包>`**。

### 为什么必须全量 external

实测（直接看 esm.sh 返回的 import 语句）：

| 请求 | 结果 |
| --- | --- |
| `@codemirror/view@6.43.6?external=@codemirror/state` | shim 里仍有 `/crelt@^1.0.6`、`/style-mod@^4.1.0`、`/w3c-keyname@^2.2.4` —— root-relative 且带**版本区间**，import map 拦不住 |
| `@codemirror/view@6.43.6?external=@codemirror/state,crelt,style-mod,w3c-keyname` | inner 模块的 specifier 全为裸名；body 内 `https://esm.sh/` 计数 0 |

只外置一部分等于放弃锁版本，而且拿到的是"绝对 URL 形式的另一份 `@codemirror/state`"
—— 正是 CodeMirror 自己报错的那件事：

> Unrecognized extension value in extension set (…). This sometimes happens because multiple
> instances of @codemirror/state are loaded, breaking instanceof checks.

### 为什么不用 `?bundle`

antd 那条用 `?bundle`（否则 1163 个模块请求），因为它不涉及 `instanceof` 互认。
CodeMirror 相反：`?bundle` 会把依赖内联进产物，`basicSetup` 与我们自己的 `EditorState`
来自两份 `@codemirror/state` ⇒ 必崩。所以 CodeMirror 组**禁止** `?bundle`，构建期断言拦。

### 为什么版本来自生成表

`tsconfig.node.json` 刻意不引 `@types/node`，vite 配置文件不碰 Node 类型面，
因此不能在配置里遍历 `node_modules`。沿用仓里既有套路：
`scripts/gen-cdn-importmap.mjs`（Node 侧 `.mjs`）→ `src/docs/generated/cdn-importmap.json`（提交进 git）
→ `vite.docs.shared.ts` 静态导入。`--check` 模式挂在 `pnpm test` 上，防止依赖升级后忘生成。

### 为什么不只有 CodeMirror 需要生成表（antd 为什么不需要）

最初只有 CodeMirror 走生成表，react/antd 是配置里五行字面量。那个不对称看着像设计，其实是
路径依赖：**生成脚本存在的唯一理由是"要枚举一个闭包的版本"**，而只有 CodeMirror 需要枚举
（`family` 策略）。react/antd 各只需一条 URL，版本静态 `import x/package.json` 就拿到了。

但它带来两个实际缺陷，所以后来统一成一张表：

- `react-dom` 的 URL 曾复用 `react` 的版本号（`const reactVersion` 跨包复用）。两者今天都是
  19.2.7 所以没炸，但 `react-dom` 的 peer 是 `react ^19`，pnpm 装出 19.3 + 19.2 的组合就会
  pin 一个不存在的版本 ⇒ esm.sh 404。
- 命名问题：叫 `docs:codemirror` 的脚本其实在生产**整个 CDN 档的 import map**，下一个要外置的
  组（`@dnd-kit/*`、或修 `antd/es/*` 深路径）会立刻再问一次"是不是也该有个 `docs:dnd`"。

现在的形状：`CDN_ROOTS` 一张表，每项声明 `single` / `bundle` / `family` 之一，
脚本统一解析版本（`family` 额外展开闭包）并产出 import map 条目 + `CDN_EXTERNALS`。
策略的判据只有一条：**这个包族会不会跨模块做 `instanceof` / 引用相等**。

## 代价

- **请求数**：每个包 2 个请求（shim + inner），18 包 ≈ 36 个（HTTP/2 并行、esm.sh 长缓存）。
  换来的是本地产物里 0 字节。
- **首屏字节不会自己变少**：外置只换 host。真正减字节靠 P2（`CodeView` 惰性化）——
  两者缺一，用户下载量不变。

## 被否掉的方案

| 方案 | 否掉原因 |
| --- | --- |
| 只外置 `@codemirror/state` | 见上表：叶子依赖编成 root-relative + 版本区间 |
| 全部 `?bundle` | 双实例，`instanceof` 断裂 |
| 手动在配置里写版本号 | 依赖一升级就漂，且没有 CI 能发现 |
| 默认档 / 单文件档也外置 | 默认档是企业内网自托管；单文件档要能 `file://` 离线打开 |
| 只懒加载不外置 | CDN 档要把 137 KB br 从 40 KB/s 的 GitHub Pages 出；外置让这部分走 esm.sh |

## 验证

- `tests/cdn-importmap.test.ts`：锁 `external` 全集、禁 `bundle`、版本来自表。
- `docs:cdn-guard`（构建期）：① 产物无 `https://esm.sh/` 字面量；② 每个裸 specifier 必须在 import map 里；
  ③ CodeMirror 闭包的模块不得出现在任何本地产物里；④ import map 顺序与 CodeMirror 条目形状。
- `scripts/check-esmsh-externals.mjs`（手动探针，需网络）：抓每个 CDN URL，
  断言 body 内无绝对 esm.sh URL、裸 specifier ⊆ 闭包 —— 唯一能发现"esm.sh 又把某个依赖内联回去"的手段。
