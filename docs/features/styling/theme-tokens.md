# 主题注入与 tokens 桥接（theme tokens）

data-grid 通过 `tokens.css` 定义 `--dg-*` 变量，并在 `useTableThemeVars.ts` 注入全套 `--ant-*` alias token 到 `.dg-wrapper`。本文说明 token 桥接策略、getComponentToken 剪枝坑、链接色复刻、style-class demo，以及与 antd 的差异。

## token 桥接（`tokens.css`）

`tokens.css` 定义两套变量：

- `--dg-*`：data-grid 自有变量（如 `--dg-font-size`、`--dg-body-bg`、`--dg-header-bg`、`--dg-border`、`--dg-radius` 等），多数桥接自 `--ant-*` alias token（未接主题时 fallback 到 antd 默认值）。
- `--ant-*`：antd alias token（由 `useTableThemeVars` 内的 `aliasTokenVars` 注入 `.dg-wrapper`，未接主题时 tokens.css fallback 兜底）。

`--dg-*` 桥接示例：

| data-grid | 桥接 antd | 用途 |
|---|---|---|
| `--dg-font-size` | `--ant-table-cell-font-size[-md/-sm]` | cell 字号（随 size） |
| `--dg-body-bg` | `--ant-table-bg`（fallback `--ant-color-bg-container`） | 表体底色 |
| `--dg-header-bg` | `--ant-table-header-bg` | 表头底色 |
| `--dg-header-color` | `--ant-table-header-color`（= colorTextHeading） | 表头文字色 |
| `--dg-border` | `--ant-table-border-color` + line-width + line-type | 边框 |
| `--dg-radius` | `--ant-table-header-border-radius`（= borderRadiusLG） | 表格外框圆角 |
| `--dg-row-hover-bg` | `--ant-table-row-hover-bg` | 行 hover 底色 |
| `--dg-header-split-color` | `--ant-table-header-split-color` | 表头分割竖线色 |
| `--dg-header-sort-hover-bg` / `--dg-header-sort-active-bg` / `--dg-body-sort-bg` | sort 相关 component token | 排序底色 |
| `--dg-header-icon-color` / `--dg-header-icon-hover-color` | header icon color | 表头图标色 |
| `--dg-primary-color` | `--ant-color-primary` | 主色 |
| `--dg-resizer-color` | `--ant-color-primary` | 列宽拖拽手柄色 |

## getComponentToken 剪枝坑

antd `getComponentToken` 会**剪枝"默认值 === alias 同值"的 component token**（最小化输出）。这导致某些 Table component token 在 DOM 上为空，data-grid 直接消费会解析为空 → 视觉错（透明/默认色）。

已知踩坑（改消费存活 alias）：

| 原 component token | 默认值（= alias） | 改消费 alias | 场景 |
|---|---|---|---|
| `--ant-table-sticky-scroll-bar-bg` / `--ant-table-scroll-thumb-bg` | `colorTextPlaceholder` | `--ant-color-text-placeholder` | 悬浮条 thumb 默认色 |
| `--ant-table-sticky-scroll-bar-bg-hover` / `--ant-table-scroll-thumb-bg-hover` | `colorTextHeading` | `--ant-color-text-heading` | 悬浮条 thumb hover 色 |
| `--ant-table-header-filter-active-bg` | `colorFillContent` | `--ant-color-fill-content` | 漏斗 trigger hover bg |
| `--ant-table-filter-dropdown-bg` | `colorBgContainer` | `--ant-color-bg-container` | 筛选下拉面板背景 |
| `--ant-table-sticky-scroll-bar-bg` | `colorTextPlaceholder` | `--ant-color-text-placeholder` | sticky scrollbar |

**规则**：消费前先核对 antd getComponentToken 是否会剪枝该键（默认值与 alias 同值则剪枝），若剪枝则改消费对应 alias token。

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

`.dg-grid` 显式 `font-size: var(--dg-font-size)`，等效 antd `.ant-table` 根节点的 `font-size: tableFontSize`（= cellFontSize）重置。

**loading（Spin 包裹）场景下继承链断裂**：Table.tsx 在 loading 时用 antd `<Spin>` 包裹 tableContent，DOM 变为 `.dg-wrapper → .ant-spin → .ant-spin-container → .dg-grid → cell`。antd Spin 根 `.ant-spin` 显式 `font-size: var(--ant-font-size)`（= 14，基础字号，不随 Table component token 变），落在 `.dg-wrapper` 与 `.dg-grid` 之间——`.dg-grid` 未声明 font-size 时继承最近的祖先 `.ant-spin` 的 14px（而非 `.dg-wrapper` 的 `--dg-font-size`），cell 沿继承拿 14。→ component-token demo cellFontSize=16 时 cell 实际 14px，与 antd 差 2px。本规则显式声明修复。

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

- [`src/table/style/tokens.css`](../../../src/table/style/tokens.css) — `--dg-*` 桥接定义 + `--ant-*` fallback。
- [`src/table/useTableThemeVars.ts`](../../../src/table/useTableThemeVars.ts) — `aliasTokenVars`（基础 alias token）/ `tableTokenVars`（Table component token）派生与合并，集中 antd 内部 API 依赖（`useAntdInternalToken` + 4 个 `tokenBridge` 导出），输出 `wrapperStyle`（含 `stylesResolved.root` 合并）。
- [`src/table/tokenBridge.ts`](../../../src/table/tokenBridge.ts) — `transformToken` + `useToken` realToken + `prepareComponentToken` 复刻，产出 alias var 与 Table component var 字符串。
- [`src/table/Table.tsx`](../../../src/table/Table.tsx) — 调用 `useTableThemeVars`，把 `wrapperStyle` 挂到 `.dg-wrapper` inline style。

## 注入路径（与 antd 同款，零猜测）

直接复用 antd 真实的 token→CSS-var 注入工具（`transformToken` + `useToken` realToken + `prepareComponentToken`），让 `.dg-wrapper` 拿到与 antd `.ant-table-wrapper` **同名同值的全套 `--ant-*`**（alias + Table component token）。

### alias var（基础 alias token → `--ant-*`）

`transformToken(realToken, cssVar.key, { prefix, unitless, ignore, preserve })` —— 同 `useCacheToken` 内部调用（不含 hashCls/scope → cssVarsStr selector 为 `.${key}`）。产出 `--ant-color-primary:#1677ff;--ant-border-radius:6px;...` 全套 alias。

- `realToken`（`useToken` 元组 index 1）= 未 var 化原值（公开 `theme.useToken().token` 已被 var 化为 `'var(--ant-x)'`，不能直接喂 transformToken——会产出 `--ant-x:var(--ant-y)` 自引用空循环）。
- `cssVar`（index 4）= `{ prefix:'ant', key:'css-var-root' }`（默认；ConfigProvider cssVar 可覆盖 prefix/key）。
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

antd transformToken number→`${v}px`（unitless 白名单除外）。data-grid tokens.css fallback 已对齐带 px 格式（如 `--ant-cell-padding-block: 16px`），table.css 消费者直接 `var(--ant-*)`（不再 `calc(var * 1px)`，避免 `calc(16px*1px)` 无效）。

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
