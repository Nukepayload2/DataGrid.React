# 主题注入与 tokens 桥接（theme tokens）

data-grid 通过 `useTableThemeVars.ts` 把 antd alias token 和 Table component token 注入为同名 `--ant-*` / `--ant-table-*` CSS variables，并在 `tokens.css` 提供无主题 fallback。本文说明 token 桥接策略、getComponentToken 剪枝坑、链接色复刻、style-class demo，以及与 antd 的差异。

## token 桥接（`tokens.css`）

`tokens.css` 的对外主题变量是 antd 同名变量：

- `--ant-*`：antd alias token，例如 `--ant-color-bg-container`、`--ant-color-primary`、`--ant-line-width`。
- `--ant-table-*`：antd Table component token，例如 `--ant-table-header-bg`、`--ant-table-row-hover-bg`、`--ant-table-cell-padding-block`。

data-grid CSS 优先直接消费这些变量。只有 data-grid 的异构实现才保留 `--dg-*`：

| data-grid 内部变量 | 来源 | 用途 |
|---|---|---|
| `--dg-row-min-h` / `--dg-row-max-h` | `gridOptions.minRowHeight/maxRowHeight` inline 注入 | 有界行高模型 |
| `--dg-scrollbar-thumb-active-bg` | `--ant-table-scroll-thumb-bg-hover` | 自研悬浮滚动条 active/hover/dragging 色 |
| `--dg-scrollbar-thumb-expanded-opacity` | 固定内部视觉权重 | 自研悬浮滚动条展开态透明度 |

能与 antd Table 概念完全重合的颜色、字号、边框、圆角、padding、排序和筛选图标色，不再定义 `--dg-*` 对外桥接名。

## getComponentToken 剪枝坑

antd `getComponentToken` 会**剪枝"默认值 === alias 同值"的 component token**（最小化输出）。这导致某些 Table component token 在 DOM 上为空，data-grid 直接消费会解析为空 → 视觉错（透明/默认色）。

已知踩坑：

| 原 component token | 默认值（= alias） | data-grid 处理 | 场景 |
|---|---|---|---|
| `tableScrollThumbBg` / `tableScrollThumbBgHover` / `tableScrollBg` / `tableScrollThumbSize` | Table 内部派生 token | `tableTokenToCssVars` 显式补齐 `--ant-table-scroll-*` | 悬浮条与 sticky fake scrollbar 配色 |
| `--ant-table-header-filter-active-bg` | `colorFillContent` | `--ant-color-fill-content` | 漏斗 trigger hover bg |
| `--ant-table-filter-dropdown-bg` | `colorBgContainer` | `--ant-color-bg-container` | 筛选下拉面板背景 |

**规则**：消费前先核对 antd getComponentToken 是否会剪枝该键。公开 component token 可改消费存活 alias；antd Table 内部派生 token（如 `tableScrollThumbBgHover`）需要在 token bridge 中显式补齐同语义 CSS var。

悬浮滚动条 active 态是一个例外的 data-grid 派生色：`--dg-scrollbar-thumb-active-bg` 不引入新的主题颜色源，而是从补齐后的 `--ant-table-scroll-thumb-bg-hover` 派生。透明度只是视觉权重，用来降低 `colorTextHeading` 直出时的存在感；主题配置仍只需要覆盖 antd Table / alias token。

## 链接色复刻（genLinkStyle）

`.dg-wrapper` 非 antd 组件根（data-grid 自研渲染），不继承 antd 全局 `a` 链接样式（antd `components/style/index.tsx:79` genLinkStyle 只挂在其 `.ant-*` 组件根下）。data-grid 表内 `<a>` 默认继承 body 文字色（rgba(0,0,0,0.88)），而 antd 表内 `<a>` = #1677ff（colorLink）。

`.dg-wrapper a` 复刻 genLinkStyle，消费已注入的 `--ant-*` alias token：

| 状态 | color | text-decoration |
|---|---|---|
| 默认 | `--ant-color-link` | `--ant-link-decoration, none` |
| `:hover` | `--ant-color-link-hover` | `--ant-link-hover-decoration, underline` |
| `:active` | `--ant-color-link-active` | `--ant-link-hover-decoration, underline` |
| `:focus` | （不变） | `--ant-link-focus-decoration, none` |
| `[disabled]` | `--ant-color-text-disabled` | （不变，cursor: not-allowed） |

惠及所有含 `<a>` 的 demo（basic/virtual-list/summary 等的 Action 列）；无 `<a>` 的 demo 选择器不命中，零回归。

## font-size 重置（`.dg-grid`）

`.dg-grid` 显式 `font-size: var(--ant-table-cell-font-size)`，等效 antd `.ant-table` 根节点的 `font-size: tableFontSize`（= cellFontSize）重置。

**loading（Spin 包裹）场景下继承链断裂**：Table.tsx 在 loading 时用 antd `<Spin>` 包裹 tableContent，DOM 变为 `.dg-wrapper → .ant-spin → .ant-spin-container → .dg-grid → cell`。antd Spin 根 `.ant-spin` 显式 `font-size: var(--ant-font-size)`（= 14，基础字号，不随 Table component token 变），落在 `.dg-wrapper` 与 `.dg-grid` 之间——`.dg-grid` 未声明 font-size 时继承最近的祖先 `.ant-spin` 的 14px（而非 `.dg-wrapper` 的 `--ant-table-cell-font-size`），cell 沿继承拿 14。→ component-token demo cellFontSize=16 时 cell 实际 14px，与 antd 差 2px。本规则显式声明修复。

## style-class demo（root classNames 注入）

`.dg-style-class-root`：对齐 antd style-class demo 的 `createStaticStyles({ root })` 生成的 root class 样式（`G:\Projects\ant-design\components\table\demo\style-class.tsx:6-12`）：

```css
.dg-style-class-root {
  color: #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
```

data-grid 侧：`.dg-wrapper.dg-style-class-root`（root class 注入到根容器，`useTableThemeVars` 合并 `stylesResolved.root`）。antd 侧：`.ant-table-wrapper.dg-style-class-root`。仅 style-class demo 使用，引擎默认不消费。深色主题（#e0e0e0 文字 + 深阴影）是 antd 官方 demo 原样，逐字复刻。

## 与 antd 差异

| | data-grid | antd |
|---|---|---|
| token 注入 | `useTableThemeVars` 内的 `aliasTokenVars` / `tableTokenVars` 注入 `.dg-wrapper` | ConfigProvider theme + cssinjs |
| 链接色 | `.dg-wrapper a` 复刻 genLinkStyle | genLinkStyle 挂在 `.ant-table` 根 |
| component token | 部分 key 被 getComponentToken 剪枝 → 改消费 alias | cssinjs 内部处理 |

## 关联源码

- [`src/table/style/tokens.css`](../../../src/table/style/tokens.css) — `--ant-*` / `--ant-table-*` fallback + data-grid 异构变量。
- [`src/table/useTableThemeVars.ts`](../../../src/table/useTableThemeVars.ts) — `aliasTokenVars`（基础 alias token）/ `tableTokenVars`（Table component token）派生与合并，集中 antd token 桥接逻辑（`theme.useToken()` + `tokenBridge`），输出 `wrapperStyle`（含 `stylesResolved.root` 合并）。
- [`src/table/tokenBridge.ts`](../../../src/table/tokenBridge.ts) — `transformToken` + `useToken` realToken + 本地复制的 antd Table `prepareComponentToken` 纯 token 派生逻辑，产出 alias var 与 Table component var 字符串。
- [`src/table/Table.tsx`](../../../src/table/Table.tsx) — 调用 `useTableThemeVars`，把 `wrapperStyle` 挂到 `.dg-wrapper` inline style。

## 注入路径（与 antd 同款，零猜测）

复用 antd 真实的 token→CSS-var 注入工具（`transformToken` + `useToken` realToken），并在本地复制 antd 6.4.4 Table `prepareComponentToken` 的纯 token 派生逻辑，让 `.dg-wrapper` 拿到与 antd `.ant-table-wrapper` **同名同值的全套 `--ant-*`**（alias + Table component token），同时避免运行时依赖 `antd/es/table/style/index` 这类 Table internal API。

### alias var（基础 alias token → `--ant-*`）

`transformToken(realToken, cssVar.key, { prefix, unitless, ignore, preserve })` —— 同 `useCacheToken` 内部调用（不含 hashCls/scope → cssVarsStr selector 为 `.${key}`）。产出 `--ant-color-primary:#1677ff;--ant-border-radius:6px;...` 全套 alias。

- `realToken` 来自公开 `theme.useToken().token`，随 ConfigProvider algorithm / token / components.Table 覆盖更新。
- `cssVar` 使用 data-grid 当前支持的默认配置 `{ prefix:'ant', key:'css-var-root' }`。
- unitless / ignore / preserve 集合直接 import 自 antd 源文件（`antd/es/theme/useToken`），不自己枚举（防猜测铁律）。preserve 集合（screenXS..screenXXXL 各 min/max）复制稳定值（antd useToken.ts 内部 const 未 export）。

### Table component var（Table 组件 token → `--ant-table-*`）

完全复刻 antd `genCSSVarRegister('Table', ...)` 的 fn 回调（cssinjs-utils/es/util/genStyleUtils.js），在 `tableTokenToCssVars` 内分 4 步：

1. **defaultToken = prepareComponentToken(merge(realToken, realToken.Table))**
   （= antd `getDefaultComponentToken`：把 `realToken` 与 `realToken.Table` 合并后喂 `prepareComponentToken`，从 alias 派生 headerBg/rowHoverBg/headerSortActiveBg/expandIconScale/... 等 30+ 条默认值）。
2. **componentToken = getComponentToken(realToken, defaultToken)**：`mergedToken = { ...defaultToken, ...realToken.Table }`（用户覆盖优先），然后遍历删"mergedToken[key] === realToken[key]"的键（与 alias 同名同值——antd 为最小化输出剔除这类键）。
3. **prefixToken 重命名**：仅遍历 `Object.keys(defaultToken)`（注意是 defaultToken，非 mergedToken），把每个 key 改写为 `Table${Key}`（首字母大写），原 key delete。
   - **写回规则核心**：只重命名"在 defaultToken 中出现"的 key。用户单独覆盖的 alias 同名 token（不在 prepareComponentToken 默认输出，如 `colorBgContainer`）**不加前缀**，保持原 key → transformToken 产出 `--ant-color-bg-container`（与 alias 同名，在 dg-wrapper 作用域覆盖 alias 默认）。这是 antd 把 Table 组件 token 的 `colorBgContainer` 写回 alias var 的真实机制（不是新增 `--ant-table-color-bg-container`）。
4. **transformToken**（prefix='ant', key='css-var-root', unitless={TableExpandIconScale:true}）：把重命名 + 未重命名的混合 token 一次性转换。unitless 仅 Table 特有的 `expandIconScale`（已重命名为 TableExpandIconScale）；alias unitless 字段（lineHeight/fontSize/...）在 Table 组件 token 中无对应键，无需追加。

### 输出 parse

`transformToken` 返回 `[tokenWithCssVar, cssVarsStr]`，`parseCssVarsString` 提取 `${selector}{--k1:v1;...}` 内的 `--k:v` 对（按 `;` 分割 + 首个 `:` 分隔 key/value），合并为 React inline style 对象。

### 单位

antd transformToken number→`${v}px`（unitless 白名单除外）。data-grid tokens.css fallback 已对齐带 px 格式（如 `--ant-table-cell-padding-block: 16px`），table.css 消费者直接 `var(--ant-*)`（不再 `calc(var * 1px)`，避免 `calc(16px*1px)` 无效）。

### 跳过内部字段

realToken 含 `_tokenKey`（hash 字符串，useCacheToken 注入），非 token 字段，不产出 CSS var。用 `^_` 前缀过滤。antd `useCacheToken` 调 transformToken 时用的是 `mergedDerivativeToken`（未含 _tokenKey），data-grid 用 realToken（含 _tokenKey），故需手动过滤。

### realToken.Table 的内容

经深读 antd 源码（`antd/es/theme/useToken.js` getComputedToken），`realToken.Table` 只含**用户在 ConfigProvider theme.components.Table 显式声明的覆盖项**（prepareComponentToken 派生的默认值不在此——antd 是在 `genCSSVarRegister` 的 fn 回调里通过 getDefaultComponentToken + getComponentToken 在渲染时单独合并 + 删除与 alias 同值键）。data-grid 在注入时（tableTokenToCssVars）复刻此合并流程：prepareComponentToken 默认 + 用户覆盖。

### 默认主题（无 components.Table 覆盖）

defaultToken 全部经 prefixToken 重命名为 `--ant-table-*`，componentToken = defaultToken（无用户覆盖，删 alias 同值键后剩 defaultToken 全集）。与 antd DOM 一致：`--ant-table-header-sort-active-bg:#f0f0f0` 等。

### 合并到 `.dg-wrapper` inline style

`wrapperStyle = useMemo(() => { ...aliasTokenVars, ...tableTokenVars })`：

- 合并顺序 `{...aliasTokenVars, ...tableTokenVars}`：tableTokenVars 覆盖 aliasTokenVars 同名字段。
- 优先级：`style`（用户传入） > `stylesResolved.root`（语义 root style） > `tableTokenVars`（Table component token） > `aliasTokenVars`（基础 alias token） > tokens.css fallback。
- CSS variable 由 inline style 提供优先级高于 class（tokens.css fallback）。用户 style 与 token vars 的 key 空间不同（用户用标准 CSS 属性，token vars 用 `--ant-*`），实际不冲突。
- colorBgContainer 写回机制：用户覆 `Table.colorBgContainer` 时，tableTokenVars 直接产出 `--ant-color-bg-container`（写回 alias 同名 var），aliasTokenVars 也产出该 var（alias 默认 #ffffff），但 tableTokenVars 在合并中后置覆盖之，最终 `.dg-wrapper` 的 `--ant-color-bg-container` = 用户值（如 component-token demo 的 #e6f4ff）。data-grid 表体底色消费此 var（tokens.css）。
