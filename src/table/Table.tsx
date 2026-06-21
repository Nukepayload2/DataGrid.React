/**
 * data-grid 对外 Table 组件（F2 适配层）。
 *
 * 把 antd 兼容 props（`TableProps`）映射到内部引擎（`GridTable`）。
 * 第一步覆盖 demo 子集（见 types.ts 注释）。
 *
 * === M4 虚拟滚动 ref 适配 ===
 *
 * - 用 `forwardRef` 暴露 `TableRef`（含 `scrollTo` 与 `nativeElement`）。
 * - `scrollTo({ key })`：在适配层根据 `rowKey` 把 key → index，再转给引擎 `scrollTo({ index })`。
 *   引擎层只处理 index/scrollTop（虚拟窗口内逻辑），与解耦保持一致。
 * - 非 virtual 模式下 `scrollTo` 为 no-op（不报错；与 antd 在非虚拟下 ref.scrollTo 不可用一致）。
 *
 * === M5 行选择（rowSelection）适配 ===
 *
 * - `rowSelection` 传入时，适配层在最前插入一个"选择列"叶子节点（`buildSelectionColumnNode`），
 *   该节点对引擎透明（普通 `EngineColumnNode`，无 children → 叶子），与 M1 多级表头 / M2 固定列 /
 *   M3 合并 / M4 虚拟滚动无缝组合。
 * - 状态机由 `useRowSelection`（移植自 lun `select/index.ts`，纯 React 重写）派生：
 *     * checkbox：全选(allSelected)/半选(intermediate) + toggleRow/toggleAll。
 *     * radio：单选互斥 + selectRow。
 * - 受控语义：`selectedRowKeys` 传入即受控；未传则用 `defaultSelectedRowKeys`（非受控）。
 *   勾选触发 `onChange(keys, rows, { type })`（type 为 'single'/'all'/'none'，对齐 antd RowSelectMethod）。
 * - `getCheckboxProps(record).disabled` 的行不参与全选/半选、不可手动勾选。
 */

import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Dropdown, Empty, Pagination, Spin } from 'antd'
import type { SpinProps as SpinPropsInput } from 'antd'
// S28：响应式断点检测用 antd Grid.useBreakpoint（决策 6：响应式检测用 antd）。
// useBreakpoint 返回 ScreenMap（{ xs?, sm?, md?, lg?, xl?, xxl?, xxxl? } 各断点布尔），
// screens[bp]===true 表示当前视口 >= bp（antd responsiveObserver 语义）。
import Grid from 'antd/es/grid'
// S23：消费 antd ConfigProvider 的 renderEmpty（全局空状态自定义）。
// ConfigContext 从 antd 内部 es 路径导入（antd 主入口不导出 ConfigContext）。
// renderEmpty 签名：RenderEmptyHandler = (componentName: string) => ReactNode。
import { ConfigContext } from 'antd/es/config-provider/context'
import type { RenderEmptyHandler } from 'antd/es/config-provider/defaultRenderEmpty'
// ★ 主题注入重构 Round 1：直接调用 antd 真实的 token→CSS-var 注入工具（防猜测铁律）。
//
// 旧实现（S30 + task #21）手维护两张 token→CSS var 映射表 + 两个 build 函数（72 条手枚举），
// 既漏键又得手动维护 kebab-case（cellPaddingBlockMD → --ant-cell-padding-block-md 等）。
// 现直接复用 antd 内部同一套注入工具，**同输入同输出**，零猜测：
//
// - `useToken`（antd 内部 hook，`antd/es/theme/internal` 公开导出）返回 6 元组
//   `[mergedTheme, realToken, hashId, token, cssVar, zeroRuntime]`：
//     * `realToken`（index 1）= **未 var 化的原值** token（含 colorPrimary:'#1677ff' 原值，
//       非公开 useToken 的 'var(--ant-x)' 字符串）。
//     * `cssVar`（index 4）= `{ prefix, key }`（默认 prefix='ant', key='css-var-root'），
//       与 antd 注入 alias var 的 transformToken 配置完全一致。
// - `transformToken`（`@ant-design/cssinjs/es/util/css-variables` 内部导出）：antd 注入
//   `:where(.${hashId}).${scope}{--k:v;...}` 的真实函数。内部处理：
//     * number 且非 unitless → `${v}px`（与 antd 注入格式一致）。
//     * string → 原样。
//     * ignore 跳过（motionBase/motionUnit）；preserve 原样保留（screenXS..screenXXXL）。
//     * camelCase→kebab + `--${prefix}-` 前缀（token2CSSVar）。
//   返回 `[tokenWithCssVar, cssVarsStr]`，我们 parse cssVarsStr 取 `--k:v` 对。
//
// ★ unitless / ignore / preserve 集合**直接 import 自 antd 源文件**（`antd/es/theme/useToken`），
//   不自己枚举（防猜测铁律）。antd Table style 在 `genStyleHooks('Table', ..., { unitless: { expandIconScale: true } })`
//   额外声明 expandIconScale unitless，我们在 Table 组件 token 注入时合并此条。
//
// ★ Table 组件 token 的 prefixToken 重命名（`genCSSVarRegister` 的 fn 回调里）：antd 先把
//   `headerBg` → `TableHeaderBg`（key 改写，原 key delete），再喂 transformToken → 产出
//   `--ant-table-header-bg`（不是 `--ant-header-bg`）。我们同样复制 prefixToken 重命名，保证
//   data-grid .dg-wrapper 注入的组件 token 键名与 antd .ant-table-wrapper DOM 完全一致。
//
// ★ 交叉验证（chrome-devtools 读 .ant-table-wrapper 实际 computed --ant-*，逐键对比 .dg-wrapper）：
//   交验证者做（启动 dev server + 双栏 component-token/basic demo + dump 全套 var）。
import { useToken as useAntdInternalToken } from 'antd/es/theme/internal'
import {
  ignore as antdTokenIgnore,
  unitless as antdTokenUnitless,
} from 'antd/es/theme/useToken'
import { transformToken } from '@ant-design/cssinjs/es/util/css-variables'
// ★ 主题注入 Round 2：直接 import antd 的 prepareComponentToken（Table 组件 token 默认派生函数）。
//   来自 antd Table style 模块（`antd/es/table/style/index` 导出 `prepareComponentToken`）。
//   它从 alias token 派生 Table 组件 token 默认值（如 colorFillAlter→headerBg/rowHoverBg、
//   colorFillSecondary→headerSortActiveBg、fontSize→expandIconScale 等 30+ 条）。
//   复用 antd 真实实现，零猜测（避免在 data-grid 内手维护派生表）。
//   副作用：该模块顶层执行 `genStyleHooks('Table', ...)`（仅生成 hook，不立即注入样式），
//   并引入 `@ant-design/fast-color`（antd 已有依赖，零新增体积）。
import { prepareComponentToken as antdTablePrepareComponentToken } from 'antd/es/table/style/index'
// prepareComponentToken 的公开类型是 union（`null | ComponentToken | GetDefaultTokenFn`），
// 但运行时它始终是函数（antd 源码 `export const prepareComponentToken = (token) => {...}`）。
// tsgo 不允许直接 invoke union 类型，这里 cast 为确定性函数签名以便调用。
type AntdTablePrepareComponentTokenFn = (
  token: Record<string, unknown>,
) => Record<string, unknown>
const prepareTableComponentToken: AntdTablePrepareComponentTokenFn =
  antdTablePrepareComponentToken as unknown as AntdTablePrepareComponentTokenFn
import { GridTable, getRowKey } from './engine/GridTable'
import { SelectionInput } from './engine/SelectionInput'
import { ExpandIcon } from './engine/ExpandIcon'
import { Summary as SummaryComponent } from './engine/Summary'
import {
  useRowSelection,
  type UseRowSelectionResult,
  type SelectionItem,
  SELECTION_ALL,
  SELECTION_NONE,
  SELECTION_INVERT,
} from './engine/useRowSelection'
import { useRowExpand } from './engine/useRowExpand'
import { useSorter } from './engine/useSorter'
import { resolveColumnSortKey } from './engine/useSorter'
import { useFilter, resolveFilterKey } from './engine/useFilter'
import { useTreeData } from './engine/useTreeData'
import {
  usePagination,
  slicePage,
  resolvePlacement,
} from './engine/usePagination'
import type { EngineColumnNode, EngineExpandState, EngineSemantic, EngineTreeState, FixedSide } from './engine/types'
import {
  EXPAND_COLUMN,
  SELECTION_COLUMN,
  type ColumnGroupProps,
  type ColumnOrSentinel,
  type ColumnProps,
  type ColumnType,
  type Expandable,
  type RowSelectMethod,
  type SizeType,
  type TablePaginationConfig,
  type TablePaginationState,
  type TableProps,
  type TableRef,
  type TableRowSelection,
  type SelectionRenderCellResult,
  type TableSemanticClassNames,
  type TableSemanticStyles,
} from './types'
import './style/tokens.css'
import './style/table.css'

/**
 * 主题注入重构 Round 1（替代旧 S30 + task #21 的两张手维护映射表 + 两个 build 函数）。
 *
 * 直接调用 antd 真实工具（transformToken + useToken realToken），让 `.dg-wrapper` 拿到与
 * antd `.ant-table-wrapper` **同名同值的全套 `--ant-*`**（alias + Table component token）。
 *
 * === 注入路径（与 antd 同款，零猜测）===
 *
 * 1. **alias var**（基础 alias token → `--ant-*`）：
 *    `transformToken(realToken, cssVar.key, { prefix: cssVar.prefix, unitless, ignore, preserve })`
 *    —— 同 `useCacheToken` 内部调用（不含 hashCls/scope → cssVarsStr selector 为 `.${key}`）。
 *    产出 `--ant-color-primary:#1677ff;--ant-border-radius:6px;...` 全套 alias。
 *
 * 2. **Table component var**（Table 组件 token → `--ant-table-*`）：
 *    antd `genCSSVarRegister('Table', ...)` 内部两步：
 *      (a) `prefixToken` 重命名：`{headerBg:...}` → `{TableHeaderBg:...}`（原 key delete），
 *          喂 transformToken 后产出 `--ant-table-header-bg`（不是 `--ant-header-bg`）。
 *      (b) `transformToken(renamed, cssVar.key, { prefix, unitless: {TableExpandIconScale:true} })`，
 *          unitless 仅追加 Table 特有的 `expandIconScale`（antd table style genStyleHooks 声明）。
 *    我们复制此流程：realToken.Table → prefixToken 重命名 → transformToken。
 *
 * === 输出 parse ===
 *
 * transformToken 返回 `[tokenWithCssVar, cssVarsStr]`，cssVarsStr = `${selector}{--k1:v1;--k2:v2;...}`。
 * 我们 parse 提取 `--k:v` 对（正则），合并为 React inline style 对象。
 *
 * === 单位 ===
 *
 * antd transformToken number→`${v}px`（unitless 白名单除外）。data-grid tokens.css fallback
 * 已对齐带 px 格式（如 `--ant-cell-padding-block: 16px`），table.css 消费者直接 `var(--ant-*)`
 * （不再 `calc(var * 1px)`，避免 `calc(16px*1px)` 无效）。
 *
 * === 跳过内部字段 ===
 *
 * realToken 含 `_tokenKey`（hash 字符串，useCacheToken 注入），非 token 字段，不产出 CSS var。
 * 用 `^_` 前缀过滤。antd `useCacheToken` 调 transformToken 时用的是 `mergedDerivativeToken`
 * （未含 _tokenKey），我们用 realToken（含 _tokenKey），故需手动过滤。
 *
 * === 超集说明 + Round 2 派生机制 ===
 *
 * **realToken.Table 的内容**：经深读 antd 源码（`antd/es/theme/useToken.js` getComputedToken），
 * `realToken.Table` 只含**用户在 ConfigProvider theme.components.Table 显式声明的覆盖项**
 * （prepareComponentToken 派生的默认值不在此——antd 是在 `genCSSVarRegister` 的 fn 回调里
 * 通过 getDefaultComponentToken + getComponentToken 在渲染时单独合并 + 删除与 alias 同值键）。
 *
 * **data-grid Round 2（task #27）**：注入时完全复刻 antd `genCSSVarRegister('Table', ...)` 的
 * fn 回调流程（详见 `tableTokenToCssVars` 注释），即：
 *   1. `defaultToken = prepareComponentToken(merge(realToken, realToken.Table))`
 *      （从 alias 派生 Table 组件 token 默认值，如 colorFillAlter→headerBg）。
 *   2. `componentToken = { ...defaultToken, ...userOverride }`，删除"与 alias 同名同值"键
 *      （与 antd getComponentToken 一致——最小化输出，剔除 alias 已有同值键）。
 *   3. **prefixToken 重命名**：仅对在 `defaultToken` 中出现的 key 加 `Table` 前缀
 *      （`headerBg`→`TableHeaderBg`→`--ant-table-header-bg`）。
 *      **★ 写回规则**：不在 `defaultToken` 的 key（即用户单独覆盖的 alias 同名 token，
 *      如 `colorBgContainer`）**不加前缀**，直接产出 `--ant-color-bg-container`——在
 *      dg-wrapper 作用域覆盖 alias 默认值。这与 antd DOM 完全一致（用户覆 `Table.colorBgContainer`
 *      → antd DOM 的 `.ant-table-wrapper` 上 `--ant-color-bg-container` = 用户值，不是新增
 *      `--ant-table-color-bg-container`）。
 *   4. transformToken 转换（unitless 仅 Table 特有 expandIconScale，已重命名为 TableExpandIconScale）。
 *
 * **默认主题（无 components.Table 覆盖）**：defaultToken 全部经 prefixToken 重命名为 `--ant-table-*`，
 *   componentToken = defaultToken（无用户覆盖，删 alias 同值键后剩 defaultToken 全集）。与 antd DOM 一致：
 *   `--ant-table-header-sort-active-bg:#f0f0f0`（dg 旧 fallback 是 `#fafafa`——本次修复）等 5 条偏差
 *   修正 + 新增 `--ant-table-expand-icon-scale`（dg 旧版未注入）。
 */
function parseCssVarsString(cssVarsStr: string): Record<string, string> {
  // cssVarsStr 格式：`${selector}{--k1:v1;--k2:v2;...}`（selector 内部可能含 :where(...)）。
  // 提取 `{...}` 内的 declarations，逐条按 `;` 分割 + 首个 `:` 分隔 key/value。
  const open = cssVarsStr.indexOf('{')
  const close = cssVarsStr.lastIndexOf('}')
  if (open < 0 || close < 0) return {}
  const body = cssVarsStr.slice(open + 1, close)
  const vars: Record<string, string> = {}
  for (const decl of body.split(';')) {
    const colon = decl.indexOf(':')
    if (colon < 0) continue
    const key = decl.slice(0, colon).trim()
    const value = decl.slice(colon + 1).trim()
    if (!key || !value) continue
    vars[key] = value
  }
  return vars
}

/**
 * 把任意 token 对象通过 antd `transformToken` 转换为 `--k:v` 对（解析 cssVarsStr）。
 *
 * - 跳过内部字段（`_` 开头，如 `_tokenKey`）。
 * - unitless / ignore / preserve 由调用方传入（alias 用 antd 全集，Table 用 Table 子集）。
 */
function tokenToCssVars(
  token: Record<string, unknown>,
  cssVar: { prefix: string; key: string },
  options: {
    unitless?: Record<string, boolean>
    ignore?: Record<string, boolean>
    preserve?: Record<string, boolean>
  } = {},
): Record<string, string> {
  // 过滤内部字段（_tokenKey 等），避免污染输出。
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(token)) {
    if (k.startsWith('_')) continue
    cleaned[k] = v
  }
  const [, cssVarsStr] = transformToken(cleaned, cssVar.key, {
    prefix: cssVar.prefix,
    unitless: options.unitless,
    ignore: options.ignore,
    preserve: options.preserve,
  })
  return parseCssVarsString(cssVarsStr)
}

/**
 * antd `genCSSVarRegister` 的 `prefixToken`（私有，复制实现避免依赖未导出）。
 * 命名规则：`Table` + key[0].toUpperCase() + key.slice(1)。
 * 例：`headerBg` → `TableHeaderBg`、`cellPaddingBlockMD` → `TableCellPaddingBlockMD`。
 */
function tablePrefixToken(key: string): string {
  return `Table${key.slice(0, 1).toUpperCase()}${key.slice(1)}`
}

/**
 * 把 Table 组件 token 通过 antd 同款流程转为 `--ant-table-*`（+ 写回 alias 同名 var） CSS vars。
 *
 * **完全复刻 antd `genCSSVarRegister('Table', ...)` 的 fn 回调**（cssinjs-utils/es/util/genStyleUtils.js）：
 *
 * 1. **defaultToken = prepareComponentToken(merge(realToken, realToken.Table))**
 *    （= antd `getDefaultComponentToken`：把 `realToken` 与 `realToken.Table` 合并后喂
 *    `prepareComponentToken`，得到 Table 组件 token 默认值——从 alias 派生 headerBg/rowHoverBg/
 *    headerSortActiveBg/expandIconScale/... 等 30+ 条）。
 *
 * 2. **componentToken = getComponentToken(realToken, defaultToken)**：
 *    `mergedToken = { ...defaultToken, ...realToken.Table }`（用户覆盖优先），
 *    然后遍历删"mergedToken[key] === realToken[key]"的键（与 alias 同名同值——antd 为最小化输出
 *    剔除这类键，如默认主题 prepareComponentToken 不产出与 alias 同值键，故通常 noop；但用户覆盖
 *    alias 同名 token 为同值时会被剔除）。
 *
 * 3. **prefixToken 重命名**：仅遍历 `Object.keys(defaultToken)`（注意是 defaultToken，非 mergedToken），
 *    把每个 key 改写为 `Table${Key}`（首字母大写），原 key delete：
 *      `componentToken[prefixToken(key)] = componentToken[key]; delete componentToken[key]`
 *    **★ 写回规则核心**：只重命名"在 defaultToken 中出现"的 key。用户单独覆盖的 alias 同名 token
 *    （不在 prepareComponentToken 默认输出，如 `colorBgContainer`）**不加前缀**，保持原 key
 *    → transformToken 产出 `--ant-color-bg-container`（与 alias 同名，在 dg-wrapper 作用域覆盖 alias 默认）。
 *    这是 antd 把 Table 组件 token 的 `colorBgContainer` 写回 alias var 的真实机制
 *    （不是新增 `--ant-table-color-bg-container`）。
 *
 * 4. **transformToken**（prefix='ant', key='css-var-root', unitless={TableExpandIconScale:true}）：
 *    把重命名 + 未重命名的混合 token 一次性转换。unitless 仅 Table 特有的 `expandIconScale`
 *    （genStyleHooks('Table', ..., {unitless:{expandIconScale:true}}) → 已重命名为 TableExpandIconScale）。
 *    alias unitless 字段（lineHeight/fontSize/...）在 Table 组件 token 中无对应键（Table 不派生这些），无需追加。
 *
 * **输入**：完整 `realToken`（含 `.Table` 子对象）+ cssVar。输出：`--k:v` 字典（含 `--ant-table-*` 与
 *   写回的 `--ant-color-bg-container` 等 alias 同名 var）。
 *
 * **过滤内部字段**：realToken.Table 的 `_tokenKey` 等 `_` 前缀字段在用户覆盖合并阶段已自然排除
 *   （getComponentToken 的 customToken 来自 token[component]，antd 源同款）；但 prepareComponentToken
 *   的输入 realToken 含 `_tokenKey`，可能被它透传——故在第 2 步合并后显式过滤 `_` 前缀键（防御性）。
 */
function tableTokenToCssVars(
  realToken: Record<string, unknown>,
  cssVar: { prefix: string; key: string },
): Record<string, string> {
  const userOverride = (realToken.Table ?? {}) as Record<string, unknown>
  // (1) defaultToken = prepareComponentToken(merge(realToken, userOverride))（与 antd getDefaultComponentToken 一致）。
  const mergedAlias = { ...realToken, ...userOverride }
  const defaultToken = prepareTableComponentToken(mergedAlias)
  // (2) componentToken = getComponentToken(realToken, defaultToken)：合并默认 + 用户覆盖 + 删 alias 同值键。
  const componentToken: Record<string, unknown> = { ...defaultToken, ...userOverride }
  for (const key of Object.keys(componentToken)) {
    if (key.startsWith('_')) {
      delete componentToken[key]
      continue
    }
    // 与 antd getComponentToken 一致：删除与 alias token 同名同值的键（最小化输出）。
    if (componentToken[key] === realToken[key]) {
      delete componentToken[key]
    }
  }
  // (3) prefixToken 重命名：仅遍历 defaultToken 的 key（非 componentToken 全部）。
  //   在 defaultToken 中 → 加 Table 前缀（→ --ant-table-*）；不在 → 保持原 key（→ --ant-* 写回 alias）。
  for (const key of Object.keys(defaultToken)) {
    if (key.startsWith('_')) continue
    if (!(key in componentToken)) continue // 已被删（alias 同值）则跳过
    const renamedKey = tablePrefixToken(key)
    componentToken[renamedKey] = componentToken[key]
    delete componentToken[key]
  }
  // (4) transformToken：unitless 仅 Table 特有 expandIconScale（已重命名为 TableExpandIconScale）。
  const [, cssVarsStr] = transformToken(componentToken, cssVar.key, {
    prefix: cssVar.prefix,
    unitless: { TableExpandIconScale: true },
  })
  return parseCssVarsString(cssVarsStr)
}

function normalizeFixed(fixed: ColumnType['fixed']): FixedSide | undefined {
  // S22：antd v6 `fixed: true` 等价 `'left'`（固定到左侧）；data-grid 归一化为 'start'。
  if (fixed === true) return 'start'
  if (fixed === 'left' || fixed === 'start') return 'start'
  if (fixed === 'right' || fixed === 'end') return 'end'
  return undefined
}

/**
 * 把外部 `column.ellipsis`（antd v6 联合类型 `boolean | { showTitle?: boolean }`）normalize 为
 * 引擎层双字段 `{ ellipsis, showTitle }`（S20 + S21）。
 *
 * - `true` → ellipsis=true, showTitle=undefined（=默认显示 title，渲染层 `showTitle !== false` 命中）。
 * - `false` / undefined → ellipsis=undefined/false，showTitle=undefined（非 ellipsis 列，无 title）。
 * - `{ showTitle: false }` → ellipsis=true, showTitle=false（加 ellipsis 类 + **不加** native title，
 *   让 render 内 antd Tooltip 接管；antd ellipsis-custom-tooltip demo 用法）。
 * - `{ showTitle: true }` / `{}` → ellipsis=true, showTitle=undefined（=true，加类 + 加默认 title）。
 *
 * 返回 `showTitle` 仅在显式 false 时落 `false`，其余落 `undefined`（让渲染层 `!== false` 判定更简洁，
 * 避免 `showTitle: true` 与 `undefined` 在语义上分叉——两者都表示"显示默认 title"）。
 */
function normalizeEllipsis(ellipsis: ColumnType['ellipsis']): {
  ellipsis: boolean | undefined
  showTitle: boolean | undefined
} {
  if (ellipsis === true) return { ellipsis: true, showTitle: undefined }
  if (ellipsis && typeof ellipsis === 'object') {
    return {
      ellipsis: true,
      showTitle: ellipsis.showTitle === false ? false : undefined,
    }
  }
  return { ellipsis: undefined, showTitle: undefined }
}

/**
 * 路径分隔符（用于分组列 key 的层级拼接）。
 *
 * 历史上用 `/`（与 antd/lun 的 column path 概念一致），但 `/` 会出现在生成的 React key
 * 里（`h-/col-0`），与表头/单元格其它 key 拼写易冲突，且 antd 自身列 path 也未规定分隔符。
 * M9 验证者发现 grouping-columns demo 报 `h-/col-0` 重复 warning：根因是表头分组列 key
 * 拼接含 `/`，与其它表头格 key 冲突。改用 `.`（点号）——更安全的层级分隔，避免与 key 内
 * 允许出现的字符冲突，也避免 React key 含斜杠的视觉混乱。
 */
const COLUMN_PATH_SEP = '.'

/**
 * 生成稳定的列 key（叶子列：column.key / dataIndex；分组列：派生自路径，避免重名）。
 * `parentPath` 为父分组 key 路径（根为空串）。
 *
 * ★ M9 key 去重修复：当列既无 `key` 也无 `dataIndex` 时，回退 key 用**全局递增序号**
 * `col-${globalSeq}`（由 `toEngineColumns` 传入的计数器对象维护），保证每个匿名列
 * （无论是否跨 `toEngineColumns` 调用、是否嵌套于不同分组）都获得**唯一**回退 key。
 *
 * 之前的 bug：回退 key 用 `col-${index}`，而适配层 `Table.tsx` 的 `columnTree` 构建对每个
 * 顶层列都**独立**调 `toEngineColumns([col])`（单元素数组），导致每个匿名列的 `index` 恒为 0
 * → 多个匿名列（如 virtual-list demo 的 `Group` 列与 `Action` 列）都得到 `col-0`，
 * 表头格 React key `h-col-0` 重复。引入全局计数器后，第 N 个匿名列得到 `col-N`，全表唯一。
 */
function columnKey<RecordType>(
  col: ColumnType<RecordType>,
  parentPath: string,
  counter: { seq: number },
): string {
  const own =
    col.key !== undefined
      ? String(col.key)
      : Array.isArray(col.dataIndex)
        ? col.dataIndex.join('.')
        : col.dataIndex !== undefined
          ? String(col.dataIndex)
          : `col-${counter.seq++}`
  return parentPath ? `${parentPath}${COLUMN_PATH_SEP}${own}` : own
}

/**
 * 把 antd column 数组（**支持 children 嵌套，任意深度**）构建为引擎列树。
 *
 * 规约：
 *   - 有 children 一律视为分组列；分组列仅取 key/title/align/fixed。
 *   - 无 children 的节点视为叶子列，取 dataIndex/title/width/align/fixed/ellipsis/render。
 *   - `fixed` 透传给每个节点（M2 才真正消费 sticky；此处仅归一化字段）。
 *
 * 返回 `EngineColumnNode[]`，前序遍历即 antd 列顺序。
 *
 * ★ M9 key 去重：`counter` 是**跨调用共享**的匿名列计数器（`{ seq }`）。适配层
 * `columnTree` 构建时为整棵列树建一个 counter，逐个顶层列传入，保证全表匿名列序号唯一。
 *
 * ★ S1：`tableShowSorterTooltip` 为 Table 级 showSorterTooltip（默认 true）；列级未指定时用 Table 级。
 */
function toEngineColumns<RecordType>(
  columns: Array<ColumnType<RecordType>>,
  counter: { seq: number } = { seq: 0 },
  tableShowSorterTooltip: boolean | { target?: 'full-header' | 'sorter-icon' } | undefined = undefined,
): Array<EngineColumnNode<RecordType>> {
  const build = (
    cols: Array<ColumnType<RecordType>>,
    parentPath: string,
  ): Array<EngineColumnNode<RecordType>> =>
    cols.map((col) => {
      const path = columnKey(col, parentPath, counter)
      const hasChildren = !!col.children && col.children.length > 0
      // S21：normalize ellipsis（boolean | { showTitle }) → { ellipsis, showTitle } 双字段。
      const ellipsisNorm = normalizeEllipsis(col.ellipsis)
      const node: EngineColumnNode<RecordType> = {
        // ★ M9 key 去重：所有节点（叶子 + 分组）统一用完整 path 作为 key。
        //   历史上叶子节点用 `path.split(sep).pop()`（取末段），但这会让不同父分组下同名叶子
        //   退化到相同 key（如顶层 `name` 与 `Profile.name` 都变 `name`），存在潜在冲突；
        //   也让匿名回退列的 key 丢失父路径信息。统一用完整 path 既消除歧义又与分组节点一致。
        //   消费方（useStickyColumns.headerSticky Map / useColumnResize.resizedWidths Map /
        //   GridTable 表头 React key）均以 cell.key/col.key 为键，内部一致，改名安全。
        key: path,
        title: col.title,
        align: col.align,
        fixed: normalizeFixed(col.fixed),
        // ★ 接口全兼容（决策 3 第二步）：column.className / column.style 透传（叶子 + 分组都带；
        //   分组节点的 className/style 仅作用于分组表头格，叶子节点的作用于数据格 + 叶子表头格）。
        className: col.className,
        style: col.style,
        ellipsis: ellipsisNorm.ellipsis,
        showTitle: ellipsisNorm.showTitle,
        raw: col,
      }
      if (hasChildren) {
        node.children = build(col.children!, path)
      } else {
        node.dataIndex = col.dataIndex
        node.width = col.width
        node.render = col.render
        // M3：单元格合并 / 表头跨列 / 行标题语义透传（仅叶子列消费）。
        // onCell 的 record 类型从 ColumnType<RecordType> 传入即 RecordType，与引擎签名兼容。
        node.onCell = col.onCell
        node.colSpan = col.colSpan
        node.rowScope = col.rowScope
        // ★ 接口全兼容（决策 3 第二步）：column.onHeaderCell 透传（仅叶子列消费；分组表头格无
        //   onHeaderCell——antd 同款语义：分组列的 onHeaderCell 无意义）。引擎渲染层把返回值
        //   合并到表头格 div props（className/style/onClick/...）。
        node.onHeaderCell = col.onHeaderCell
        // M6：隐藏列透传（仅叶子列消费；分组列的 hidden 无意义）。
        node.hidden = col.hidden
        // S1：排序相关透传（仅叶子列消费；分组列无 sorter）。
        // sortOrder 由适配层 useSorter 派生后回填（buildColumnTree 阶段），这里先透传 sorter/
        // sortDirections/showSorterTooltip（配置类字段）；sortOrder 在 columnTree useMemo 中回填。
        node.sorter = col.sorter
        node.sortDirections = col.sortDirections
        // S1：showSorterTooltip 列级优先，未指定时用 Table 级（默认 true 由引擎渲染层兜底）。
        node.showSorterTooltip = col.showSorterTooltip ?? tableShowSorterTooltip
        // S3：筛选相关透传（仅叶子列消费；分组列无筛选）。
        //   filters/onFilter/filterMultiple/filterOnClose 是配置类字段，直接透传。
        //   filteredValue 由适配层 useFilter 派生后回填（applyFilterToNode 阶段）。
        node.filters = col.filters as unknown as Array<import('./engine/types').EngineFilterItem> | undefined
        node.onFilter = col.onFilter as unknown as ((value: string | number, record: RecordType) => boolean) | undefined
        node.filterMultiple = col.filterMultiple
        node.filterOnClose = col.filterOnClose
        // S5：自定义筛选面板相关字段透传（filterDropdown/filterIcon/filterDropdownProps）。
        //   filterDropdown 存在时渲染层（FilterDropdown）切换为自定义面板；filterIcon 覆盖漏斗图标；
        //   filterDropdownProps 透传到 antd Dropdown（open 受控 / onOpenChange / triggerClassName 等）。
        node.filterDropdown = col.filterDropdown as unknown as EngineColumnNode<RecordType>['filterDropdown']
        node.filterIcon = col.filterIcon as unknown as EngineColumnNode<RecordType>['filterIcon']
        node.filterDropdownProps = col.filterDropdownProps
        // S6：筛选项搜索透传（true → 默认 contains；函数 → 自定义匹配）。
        node.filterSearch = col.filterSearch as unknown as EngineColumnNode<RecordType>['filterSearch']
        // S7：筛选下拉展示模式透传（'tree' → 树形；'menu'/undefined → Checkbox/Radio）。
        node.filterMode = col.filterMode
        // S15：单元格重渲染优化透传（仅叶子列消费；components.body.cell 提供时生效）。
        node.shouldCellUpdate = col.shouldCellUpdate as EngineColumnNode<RecordType>['shouldCellUpdate']
      }
      return node
    })
  return build(columns, '')
}

/**
 * S31 JSX 风格 API：`<Table.Column>` 单列声明组件（对齐 antd v6 `Table.Column`）。
 *
 * **不渲染 DOM**（渲染 null）——它是 `columns` prop 的语法糖，仅作 `<Table>` JSX 子元素
 * 声明一列的数据载体。Table 适配层（`convertChildrenToColumns`）遍历 JSX 子元素时取出其 props
 * 转换为 ColumnType。
 *
 * props = ColumnType 全部字段（title/dataIndex/key/render/width/align/fixed/...）；
 * `children` 禁止（Column 是叶子列，多级表头用 ColumnGroup）。
 *
 * 与 antd 一致："This is a syntactic sugar for `columns` prop. So HOC will not work on this."
 * （不通过 HOC 增强，纯数据载体）。
 *
 * 用类型断言 `as unknown as (props: ColumnProps<RecordType>) => null` 绕过 TS 对泛型箭头函数
 * 的限制（与 antd `<RecordType extends AnyObject>(_: ColumnProps<RecordType>) => null` 同款）。
 */
function TableColumn<RecordType = any>(_: ColumnProps<RecordType>): null {
  return null
}
// 显式声明为函数组件（displayName 便于 devtools 识别 + 运行时挂 type 标记供解析识别）。
const Column: <RecordType = any>(props: ColumnProps<RecordType>) => null =
  TableColumn as <RecordType = any>(props: ColumnProps<RecordType>) => null
;(Column as unknown as { displayName: string }).displayName = 'Table.Column'

/**
 * S31 JSX 风格 API：`<Table.ColumnGroup>` 分组列声明组件（对齐 antd v6 `Table.ColumnGroup`）。
 *
 * **不渲染 DOM**（渲染 null）。声明一个多级表头分组列（M1 `columns[].children` 的 JSX 等价物）。
 * props：`title`（分组列表头）+ `children`（Column / ColumnGroup 的 ReactElement 数组，任意深度嵌套）。
 * Table 适配层把它转换为 `{ title, ...rest, children: [...] }`（复用 M1 多级表头渲染）。
 */
function TableColumnGroup<RecordType = any>(_: ColumnGroupProps<RecordType>): null {
  return null
}
const ColumnGroup: <RecordType = any>(props: ColumnGroupProps<RecordType>) => null =
  TableColumnGroup as <RecordType = any>(props: ColumnGroupProps<RecordType>) => null
;(ColumnGroup as unknown as { displayName: string }).displayName = 'Table.ColumnGroup'

/**
 * 运行时类型标记——用于 `convertChildrenToColumns` 识别 JSX 子元素是 Column 还是 ColumnGroup。
 *
 * antd 依赖 React `type` 引用相等（node.type === Column）区分；data-grid 同款实现（Column 与
 * ColumnGroup 是模块内唯一函数引用，children 解析时用 `===` 比对）。同时挂 `__isDgColumn`/
 * `__isDgColumnGroup` 布尔标记作为防御性识别（避免混淆/打包重命名导致引用失配）。
 */
;(Column as unknown as { __isDgColumn: boolean }).__isDgColumn = true
;(ColumnGroup as unknown as { __isDgColumnGroup: boolean }).__isDgColumnGroup = true

/**
 * S31 JSX children → columns 转换（对齐 antd rc-table `convertChildrenToColumns`）。
 *
 * 用 React.Children 遍历 `<Table>` 的 JSX 子元素，识别 `<Table.Column>`（→ ColumnType）与
 * `<Table.ColumnGroup>`（→ `{ title, ...rest, children: 递归转换 }`，复用 M1 多级表头），生成
 * `ColumnType[]`（等价于传 `columns` prop 的产物，下游 columnTree 构建透明消费）。
 *
 * **识别机制**：
 *   - 跳过非 ReactElement 子节点（文本/null/boolean 等，与 antd `toArray().filter(isValidElement)` 一致）。
 *   - Column（叶子列）：取 props（除 children）+ React key（key !== undefined 时写入 ColumnType.key
 *     作为稳定 key，对齐 antd `convertChildrenToColumns` 把 node.key 并入 column）。
 *   - ColumnGroup（分组列）：同上取 props，并把其 JSX children **递归**转换（任意深度），写入
 *     ColumnType.children（复用 M1 渲染）。
 *   - 既非 Column 也非 ColumnGroup 的元素：按 antd 行为兼容处理（当普通列对象取 props）——
 *     data-grid 仅官方支持 Column/ColumnGroup，此处保守地透传 props（与 antd rc-table 通用
 *     `convertChildrenToColumns` 不区分 type 的行为一致）。
 *
 * **React key 并入**：与 antd 一致，把元素的 React key（`node.key`）作为 column.key 回填
 * （仅当 props 未显式传 key 且 node.key 存在时），保证列有稳定 key（多级表头/排序/筛选/拖拽依赖）。
 *
 * 与 antd rc-table `convertChildrenToColumns`（`react-component/table/src/hooks/useColumns/index.tsx:18-37`）
 * 逐行对齐。
 */
function convertChildrenToColumns<RecordType>(
  children: ReactNode,
): Array<ColumnType<RecordType>> {
  const nodes = Children.toArray(children).filter((node): node is ReactElement => isValidElement(node))
  return nodes.map((node) => {
    const element = node as ReactElement<Record<string, any>>
    const reactKey = element.key
    // 解构出 children（ColumnGroup 递归用），其余 props 作为列字段。
    const { children: nodeChildren, ...restProps } = element.props ?? {}
    const column: ColumnType<RecordType> = { ...restProps } as ColumnType<RecordType>
    // React key 并入（与 antd 一致：node.key 作为 column.key 回填）。
    if (column.key === undefined && reactKey !== null && reactKey !== undefined) {
      column.key = reactKey
    }
    // ColumnGroup：递归转换 JSX children → ColumnType.children（复用 M1 多级表头）。
    // 普通元素（非 Column/ColumnGroup）若有 children 也按 antd 通用路径递归（保守兼容）。
    if (nodeChildren !== undefined && nodeChildren !== null) {
      column.children = convertChildrenToColumns<RecordType>(nodeChildren)
    }
    return column
  })
}

/**
 * S32 列默认值合并：把 Table 级 `column` prop（列默认属性）浅合并到每个列。
 *
 * **对齐 antd** `useFilledColumns`（`components/table/hooks/useFilledColumns.ts`）+
 * `@rc-component/util` 的 `mergeProps` 语义（后者覆盖前者，但 `undefined` 不覆盖已定义值）。
 *
 * 合并规则（**列自身优先**）：
 *   - 对每个普通列，浅合并 `{ ...stripUndefined(columnDefault), ...stripUndefined(col) }`，
 *     其中 `stripUndefined` 剔除值为 `undefined` 的字段（保证列自身未设置的字段回退到默认、
 *     默认未设置的字段不污染列）。这等价于 antd `mergeProps(default, col)`：col 已定义字段覆盖
 *     default，col 未定义（undefined）字段保留 default。
 *   - **哨兵豁免**：`Table.EXPAND_COLUMN` / `Table.SELECTION_COLUMN` 哨兵对象**原样返回**（保持引用不变），
 *     因为适配层后续用 `===` 识别哨兵，合并会破坏引用相等（对齐 antd `useFilledColumns` 哨兵分支）。
 *   - **多级表头递归**：含 `children` 的分组列，对**该列自身**先做合并（剔除 `column.children`，
 *     避免错误注入分组结构——对齐 antd：`omit(column, ['children'])`），再**递归**合并其 children
 *     每一层（`column` 默认逐层下传）。
 *
 * **零回归**：`columnDefault` 为 undefined 时直接返回原 `columns` 引用（不遍历、不新建数组），
 *   保证无 column prop 的所有现有 demo 列引用不变（下游 useMemo 不重算）。
 */
function applyColumnDefaults<RecordType>(
  columns: Array<ColumnOrSentinel<RecordType>>,
  columnDefault: Partial<ColumnType<RecordType>> | undefined,
): Array<ColumnOrSentinel<RecordType>> {
  if (!columnDefault) return columns
  // 预剔除 column 默认里的 undefined 字段 + children（避免污染分组结构）。
  const base: Partial<ColumnType<RecordType>> = {}
  for (const k of Object.keys(columnDefault) as Array<keyof ColumnType<RecordType>>) {
    if (k === 'children') continue
    const v = columnDefault[k]
    if (v !== undefined) (base as Record<string, unknown>)[k as string] = v
  }

  const merge = (col: ColumnType<RecordType>): ColumnType<RecordType> => {
    // col 自身已定义字段覆盖 base（undefined 字段不覆盖）。
    const merged: Record<string, unknown> = { ...base }
    for (const k of Object.keys(col) as Array<keyof ColumnType<RecordType>>) {
      const v = col[k]
      if (v !== undefined) merged[k as string] = v
    }
    const result = merged as unknown as ColumnType<RecordType>
    // 多级表头：递归合并 children（column 默认逐层下传）。
    if (Array.isArray(col.children) && col.children.length > 0) {
      result.children = col.children.map((child) => merge(child))
    }
    return result
  }

  return columns.map((c) => {
    if (c === SELECTION_COLUMN || c === EXPAND_COLUMN) return c
    return merge(c as ColumnType<RecordType>)
  })
}

function sizeToClass(size: SizeType | undefined): string | undefined {
  switch (size) {
    case 'small':
      return 'dg-size-small'
    case 'middle':
    // antd v6 'medium' 视觉等价 v5 'middle'（InternalTable.tsx:294 把 'middle' 映射为 'medium'）；
    // 共用 dg-size-middle 类（cell padding block 12 / inline 8）。
    case 'medium':
      return 'dg-size-middle'
    case 'compact':
      // ★ S27 决策 4 实测：antd v6 Table 组件本身**不存在 compact size**
      //   （SizeType = 'small'|'medium'|'middle'|'large'，config-provider/SizeContext.tsx:6；
      //    Table style 只输出 large/MD/SM 三档 token，table/style/index.ts:516-528）。
      //   compact 是 Button/Space/Input 等其它组件的尺寸概念。data-grid 的 SizeType 保留 'compact'
      //   （用于 <ConfigProvider componentSize> 全局消费的兜底），Table 层视觉等价 'small'
      //   （与 antd 6.4.4 实测最紧凑 Table 尺寸一致）。不造 antd 不存在的 token（决策 4，避免臆测）。
      return 'dg-size-small'
    case 'large':
      // 显式 'large'：dg-size-large 类无样式覆写（等价默认无 size 类，padding 16/16）。
      return 'dg-size-large'
    default:
      return undefined
  }
}

/**
 * 节点是否有子列（M1 多级表头；S1 排序仅作用于叶子列）。
 */
function hasChildren<RecordType>(
  node: EngineColumnNode<RecordType>,
): boolean {
  return !!node.children && node.children.length > 0
}

/**
 * 把 useSorter 派生的 sortOrderMap + sortPriorityMap 回填到列树节点（S1 + S2）。
 *
 * 规则：
 *   - 叶子节点（无 children）：从其 raw（原始 antd column）算出 sortKey（column.key ?? dataIndex），
 *     查 sortOrderMap；命中 → 设 sortOrder；未命中但该列可排序（node.sorter 为 truthy）→ 设 null
 *     （确保引擎渲染"无序"图标态）；不可排序列保持 undefined。
 *     S2：再查 sortPriorityMap；命中（order 非 null 且多列模式下有序号）→ 设 sortPriority；
 *     否则 undefined（引擎不渲染优先级数字）。
 *   - 分组节点：递归处理 children（分组节点本身无 sortOrder）。
 *
 * 返回**浅拷贝**的节点（不改原引用），避免原 columnTree 被污染（每次 sortOrder 变化都应产生新树）。
 */
function applySortOrderToNode<RecordType>(
  node: EngineColumnNode<RecordType>,
  sortOrderMap: Map<string, import('./types').SortOrder>,
  sortPriorityMap: Map<string, number>,
): EngineColumnNode<RecordType> {
  if (hasChildren(node)) {
    // 分组节点：递归处理子节点。
    const newChildren = node.children!.map(
      (child) => applySortOrderToNode(child, sortOrderMap, sortPriorityMap),
    )
    return { ...node, children: newChildren }
  }
  // 叶子节点：回填 sortOrder。
  // 不可排序列（sorter 为 falsy）：sortOrder 保持 undefined（引擎不渲染图标）。
  if (!node.sorter) return node
  const raw = node.raw as ColumnType<RecordType> | undefined
  const sortKey = raw ? resolveColumnSortKey(raw) : undefined
  const key = sortKey !== undefined ? String(sortKey) : undefined
  const order = key !== undefined ? sortOrderMap.get(key) : undefined
  // S2：仅当该列激活（order 非 null）时查优先级序号；未激活或单列模式 → undefined。
  const priority =
    order !== null && key !== undefined ? sortPriorityMap.get(key) : undefined
  return { ...node, sortOrder: order ?? null, sortPriority: priority }
}

/**
 * 判定 `EngineColumnNode` 是否可筛选——与 `useFilter.isFilterable` 字面一致
 * （antd `useFilter/index.tsx:38`：filters 非空 || filterDropdown 存在 || onFilter 存在）。
 *
 * ★ S12：激活态回填门（hasAnyFilter + applyFilterToNode 跳过条件）需与 filterable 判定单一真理源对齐。
 *   `EngineColumnNode` 无 `filterable` 字段（仅 `EngineHeaderCell` 在 columnTree.ts:206 计算），
 *   故此处用内联条件复刻 isFilterable，避免引入跨类型字段或破坏列树结构。
 *
 * - S3（filters + onFilter 列）：true（filters 非空）。
 * - S5（filterDropdown 列，无 filters）：true（filterDropdown 存在）。
 * - S12（纯 filters 无 onFilter 列，如 ajax Gender）：true（filters 非空）——本修复核心。
 * - 仅 onFilter（filters 空、filterDropdown 空）：true（兜底）。
 * - 三者皆无：false。
 */
function isNodeFilterable<RecordType>(
  node: EngineColumnNode<RecordType>,
): boolean {
  if (node.filterDropdown !== undefined && node.filterDropdown !== null) return true
  if (!!node.filters && node.filters.length > 0) return true
  return typeof node.onFilter === 'function'
}

/**
 * 把 useFilter 派生的 filteredValueMap 回填到列树节点（S3）。
 *
 * 规则：
 *   - 叶子节点（无 children）：从其 raw（原始 antd column）算出 filterKey（与 sortKey 同算法：
 *     column.key ?? dataIndex），查 filteredValueMap；命中 → 设 filteredValue；
 *     未命中但该列可筛选（isNodeFilterable）→ 设 null（确保漏斗为 Outlined 灰态）；
 *     不可筛选列保持 undefined。
 *   - 分组节点：递归处理 children。
 *
 * 返回**浅拷贝**的节点（不改原引用）。
 */
function applyFilterToNode<RecordType>(
  node: EngineColumnNode<RecordType>,
  filteredValueMap: Map<string, Array<string | number>>,
): EngineColumnNode<RecordType> {
  if (hasChildren(node)) {
    const newChildren = node.children!.map(
      (child) => applyFilterToNode(child, filteredValueMap),
    )
    return { ...node, children: newChildren }
  }
  // 不可筛选列：filteredValue 保持 undefined。
  // ★ S12：跳过条件与 useFilter.isFilterable 字面一致（filters 非空 || filterDropdown 存在 || onFilter 存在）。
  //   修复：此前 (!filters || !onFilter) && !filterDropdown 漏掉「纯 filters 无 onFilter」列
  //   （ajax demo Gender），导致该类列 filteredValue 不回填、漏斗无激活态。
  //   S5（filterDropdown 列）/ S3（filters+onFilter 列）行为不变——仍判定为可筛选。
  if (!isNodeFilterable(node)) return node
  const raw = node.raw as ColumnType<RecordType> | undefined
  const filterKey = raw ? resolveFilterKey(raw) : undefined
  const key = filterKey !== undefined ? String(filterKey) : undefined
  const value = key !== undefined ? filteredValueMap.get(key) : undefined
  return { ...node, filteredValue: value ?? null }
}

/** 选择列稳定 key（用作引擎列 key 与 React key）。 */
const SELECTION_COLUMN_KEY = '__dg_selection__'

/** 展开列稳定 key（用作引擎列 key 与 React key；M9）。 */
const EXPAND_COLUMN_KEY = '__dg_expand__'

/**
 * S9 表头 selections 下拉（决策 6：用 antd `<Dropdown>` + `<Menu>`）。
 *
 * - 触发器：自绘 caret-down SVG（与既有自绘图标约定一致，避免直接 import @ant-design/icons）。
 *   视觉对齐 antd `DownOutlined`（antd 选择列表头的下拉箭头）。
 * - 菜单项：列 selections 的 `text`；点击 → `onSelect(item)`（由 `buildSelectionColumnNode`
 *   转发到 `selection.applySelection`）。
 * - `onSelect` 签名 void（对齐 antd `SelectionItemSelectFn`）。
 */
function SelectionsDropdown({
  selections,
  onSelect,
}: {
  selections: Array<SelectionItem>
  onSelect: (item: SelectionItem) => void
}) {
  const menuItems = selections.map((item, index) => ({
    key: item.key ?? index,
    label: item.text ?? item.key,
    onClick: () => onSelect(item),
  }))
  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']}>
      <span
        className="dg-selection-dropdown-trigger"
        role="button"
        aria-label="selections"
      >
        {/* caret-down SVG（自绘，视觉对齐 antd DownOutlined）。尺寸 12×12 对齐 antd
            selection.ts:88 `fontSize: fontSizeIcon`（=12px）。 */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 1024 1024"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M884 256h-75c-5.1 0-9.9 2.5-12.9 6.6L512 654.2 227.9 262.6c-3-4.1-7.8-6.6-12.9-6.6h-75c-6.5 0-10.3 7.4-6.5 12.6l352.6 486.1c12.8 17.6 39 17.6 51.7 0l352.6-486.1c3.9-5.2.1-12.6-6.4-12.6z" />
        </svg>
      </span>
    </Dropdown>
  )
}

/**
 * 构造选择列叶子节点（M5）。
 *
 * 把选择列封装为一个普通 `EngineColumnNode`（无 children → 叶子），引擎无需感知"选择"语义，
 * 与 M1 多级表头 / M2 固定列 / M3 合并 / M4 虚拟滚动透明组合：
 *   - 列宽走 `rowSelection.columnWidth`（缺省 32px，对齐 antd 默认 `tableSelectionColumnWidth`）。
 *   - `fixed` 由 rowSelection.fixed 指定（与 M2 sticky 完全一致；常用于 'start'）。
 *   - `align` 默认 'center'（与 antd 一致：勾选格居中）。
 *   - `title`：表头格内容。
 *       * checkbox：渲染全选 SelectionInput（indeterminate = selection.intermediate）。
 *         hideSelectAll=true 或 radio 模式 → 空。
 *       * radio：空（antd 行为：radio 表头无全选）。
 *   - `render(text, record, index)`：表体格内容——每行 SelectionInput。
 *       * checked = selection.isSelected(key)；disabled = getCheckboxProps().disabled。
 *       * onChange：调 selection.toggleRow(key) → fireSelectionChange(nextKeys, method)。
 *
 * 因为节点无 children 且 align/width/fixed 仅依赖 rowSel 配置，每次切换勾选时虽然 selection
 * 引用变化导致 useMemo 重建 columnTree，但列布局（宽/位置/固定）不变——引擎 resolveColumnTree
 * 重算 O(cols)，sticky/cellMerge 重算，对典型表格可接受（与 antd rc-table 重渲染量级一致）。
 */
function buildSelectionColumnNode<RecordType>(
  rowSel: TableRowSelection<RecordType>,
  selection: UseRowSelectionResult<RecordType>,
  fireSelectionChange: (nextKeys: Array<React.Key>, method: RowSelectMethod) => void,
  rowKeyResolved: string | ((record: RecordType) => string | number),
): EngineColumnNode<RecordType> {
  const { columnWidth, fixed, hideSelectAll = false, align = 'center', renderCell } = rowSel
  const isRadio = selection.isRadio
  const type: 'checkbox' | 'radio' = isRadio ? 'radio' : 'checkbox'
  // 列宽默认：antd 选择列默认宽度 32px（token tableSelectionColumnWidth）。
  // 用户传 columnWidth 时覆盖；未传则用 32px（对齐 antd 默认视觉）。
  const width = columnWidth ?? 32

  // S9：表头下拉箭头（仅当 resolvedSelections 非空 + 非 radio + 非 hideSelectAll 时渲染）。
  // 对齐 antd `${prefixCls}-selection-extra`：表头全选 checkbox 旁的小下拉，点击弹出 selections 菜单。
  const resolvedSelections = selection.resolvedSelections
  const showSelectionDropdown =
    !isRadio && !hideSelectAll && resolvedSelections && resolvedSelections.length > 0

  // 表头格内容。
  const headerContent: ReactNode = (() => {
    if (isRadio) return null // radio 无全选
    if (hideSelectAll) return null
    const checkbox = (
      <SelectionInput
        type="checkbox"
        checked={selection.allSelected}
        indeterminate={selection.intermediate}
        aria-label="Select all"
        onChange={() => {
          const next = selection.toggleAll()
          const method: RowSelectMethod = selection.allSelected ? 'none' : 'all'
          fireSelectionChange(next, method)
        }}
      />
    )
    if (!showSelectionDropdown) return checkbox
    return (
      <div className="dg-selection-header" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {checkbox}
        <SelectionsDropdown
          selections={resolvedSelections}
          onSelect={(item) => {
            const result = selection.applySelection(item)
            if (result) {
              fireSelectionChange(result.nextKeys, result.method)
            }
            // 自定义项（result===null）：onSelect 内部已调用 item.onSelect(changeableRowKeys)，
            // demo 自行 setState（受控回填）——引擎无需动作（对齐 antd）。
          }}
        />
      </div>
    )
  })()

  return {
    key: SELECTION_COLUMN_KEY,
    title: headerContent,
    align,
    fixed: normalizeFixed(fixed),
    // 叶子列属性：width/render。dataIndex 不设（选择列不取数据字段）。
    width,
    // D1：rowSelection.renderCell —— 自定义勾选格内容（替代默认 SelectionInput）。
    // 接入 M3 cellMerge：onCell 调 renderCell 提取 props.rowSpan/colSpan，返回给 cellMerge
    //   计算合并（被覆盖格 hidden 不渲染）。render 与 onCell 各调一次 renderCell（demo 的
    //   renderCell 须为纯函数，与 antd rc-table 一致）。
    onCell: renderCell
      ? (record: RecordType, index: number) => {
          const key = getRowKey(record, rowKeyResolved)
          const checked = selection.isSelected(key)
          const node = buildDefaultSelectionInput(
            type,
            record,
            key,
            checked,
            selection,
            rowSel,
            fireSelectionChange,
            rowKeyResolved,
          )
          let result: SelectionRenderCellResult
          try {
            result = renderCell(checked, record, index, node)
          } catch {
            return undefined
          }
          // ReactNode 形态：无 props 合并。
          if (result === null || typeof result !== 'object' || Array.isArray(result) || !('props' in result)) {
            return undefined
          }
          // 对象形态：透传 props（含 rowSpan/colSpan，由 cellMerge 消费）。
          return (result as { props?: Record<string, any> }).props
        }
      : undefined,
    render: (_text: any, record: RecordType, index: number) => {
      const key = getRowKey(record, rowKeyResolved)
      const disabled = selection.isDisabled(record)
      const checked = selection.isSelected(key)
      // S13 树形父子联动：父行半选态（checkStrictly=false + 部分子选中）。
      const indeterminate = selection.isIndeterminate(key)
      const name = rowSel.getCheckboxProps?.(record)?.name
      // D1：renderCell 存在时用其返回值的 children（或 ReactNode）替代默认 SelectionInput。
      if (renderCell) {
        const node = (
          <SelectionInput
            type={type}
            checked={checked}
            indeterminate={indeterminate}
            disabled={disabled}
            name={name}
            aria-label={typeof name === 'string' && name ? name : undefined}
            onChange={() => {
              if (disabled) return
              const next = selection.toggleRow(key)
              fireSelectionChange(next, 'single')
            }}
          />
        )
        let result: SelectionRenderCellResult
        try {
          result = renderCell(checked, record, index, node)
        } catch {
          return node
        }
        // ReactNode 形态：直接返回。
        if (
          result === null ||
          typeof result !== 'object' ||
          Array.isArray(result) ||
          !('props' in result)
        ) {
          return result as ReactNode
        }
        // 对象形态：返回 children（默认 node 若 children 未提供）。
        return (result as { children?: ReactNode }).children ?? node
      }
      return (
        <SelectionInput
          type={type}
          checked={checked}
          indeterminate={indeterminate}
          disabled={disabled}
          name={name}
          aria-label={typeof name === 'string' && name ? name : undefined}
          onChange={() => {
            if (disabled) return
            const next = selection.toggleRow(key)
            fireSelectionChange(next, 'single')
          }}
        />
      )
    },
  }
}

/**
 * D1：构造默认 `<SelectionInput>`（作为 renderCell 的 `node` 参数透传给用户）。
 * 与 buildSelectionColumnNode 内 render 默认分支同款 props，抽函数避免 renderCell 路径重复。
 */
function buildDefaultSelectionInput<RecordType>(
  type: 'checkbox' | 'radio',
  record: RecordType,
  key: React.Key,
  checked: boolean,
  selection: UseRowSelectionResult<RecordType>,
  rowSel: TableRowSelection<RecordType>,
  fireSelectionChange: (nextKeys: Array<React.Key>, method: RowSelectMethod) => void,
  _rowKeyResolved: string | ((record: RecordType) => string | number),
) {
  const disabled = selection.isDisabled(record)
  const indeterminate = selection.isIndeterminate(key)
  const name = rowSel.getCheckboxProps?.(record)?.name
  return (
    <SelectionInput
      type={type}
      checked={checked}
      indeterminate={indeterminate}
      disabled={disabled}
      name={name}
      aria-label={typeof name === 'string' && name ? name : undefined}
      onChange={() => {
        if (disabled) return
        const next = selection.toggleRow(key)
        fireSelectionChange(next, 'single')
      }}
    />
  )
}

/**
 * 构造展开列叶子节点（M9，自研——lun 无展开图标列）。
 *
 * 把展开列封装为普通 `EngineColumnNode`（无 children → 叶子），引擎无需感知"展开"语义，
 * 与 M1 多级表头 / M2 固定列 / M3 合并 / M4 虚拟滚动 / M5 选择列透明组合：
 *   - 列宽走 `expandable.columnWidth`（缺省 48px，对齐 antd tableExpandColumnWidth 默认）。
 *   - `align` 默认 'center'（与选择列一致：展开图标居中）。
 *   - `title`：表头格空（展开列表头无内容，与 antd 一致）。
 *   - `render(text, record, index)`：表体格内容——展开/收起图标。
 *       * 可展开行（rowExpandable!==false 且 render 非 null）：渲染展开图标；点击 toggleExpand。
 *       * 不可展开行：渲染禁用态图标（antd 行为：图标灰、不响应），或不渲染（这里选禁用态，
 *         保持列宽对齐——与 antd expand demo "Not Expandable" 行视觉一致：图标可见但禁用）。
 *       * expandable.expandIcon 自定义图标优先。
 *
 * 展开图标点击 → expand.toggleExpand(key, record) → useRowExpand 更新展开态 + 触发 onExpand/onExpandedRowsChange。
 */
function buildExpandColumnNode<RecordType>(
  expandable: Expandable<RecordType>,
  expand: {
    isExpanded: (key: React.Key) => boolean
    expandableKeySet: Set<React.Key>
    toggleExpand: (key: React.Key, record: RecordType) => void
  },
  rowKeyResolved: string | ((record: RecordType) => string | number),
): EngineColumnNode<RecordType> {
  const { columnWidth, expandIcon } = expandable
  // 列宽默认：antd 展开列默认宽度 48px（token tableExpandColumnWidth）。用户传 columnWidth 覆盖。
  const width = columnWidth ?? 48
  // 展开列固定居中（与 antd 一致：展开图标居中；antd expandable 无 align 字段）。
  const align = 'center' as const
  const customIcon = typeof expandIcon === 'function' ? expandIcon : undefined

  return {
    key: EXPAND_COLUMN_KEY,
    title: null, // 展开列表头无内容（与 antd 一致）
    align,
    fixed: undefined,
    // 叶子列属性：width/render。dataIndex 不设（展开列不取数据字段）。
    width,
    render: (_text: any, record: RecordType, _index: number) => {
      const key = getRowKey(record, rowKeyResolved)
      const expandable_ = expand.expandableKeySet.has(key)
      const expanded = expand.isExpanded(key)
      // 不可展开行：渲染禁用图标（视觉占位，与 antd expand demo "Not Expandable" 行一致）。
      // 可展开行：渲染可点击展开图标。
      if (customIcon) {
        return customIcon({
          expanded,
          record,
          onExpand: (_rec, _e) => {
            if (!expandable_) return
            expand.toggleExpand(key, record)
          },
        })
      }
      return (
        <ExpandIcon
          expanded={expanded}
          disabled={!expandable_}
          onExpand={() => {
            if (!expandable_) return
            expand.toggleExpand(key, record)
          }}
        />
      )
    },
  }
}

/**
 * `Table` 对外组件（含 M9 静态属性 `Table.EXPAND_COLUMN` / `Table.SELECTION_COLUMN`，
 * 对齐 antd——在 `columns` 数组中插入哨兵对象可控制展开列 / 选择列位置）。
 *
 * 静态属性挂载在运行时 forwardRef 组件上（与 antd `ForwardTable.EXPAND_COLUMN = ...` 同款实现）。
 */
const TableComponent = forwardRef(TableInner) as <RecordType = any>(
  props: TableProps<RecordType> & { ref?: React.Ref<TableRef> },
) => React.ReactElement

// 运行时挂载静态属性（forwardRef 组件是函数对象，可挂属性；与 antd 同款实现）。
// S9：追加 SELECTION_ALL / SELECTION_NONE / SELECTION_INVERT（对齐 antd ForwardTable）。
// S22：追加 Summary（对齐 antd ForwardTable.Summary，含 .Row / .Cell 静态属性）。
// S31：追加 Column / ColumnGroup（对齐 antd `Table.Column` / `Table.ColumnGroup`，
//   JSX 风格 API——`<Table.Column>` / `<Table.ColumnGroup>` 子元素声明列）。
Object.assign(TableComponent, {
  EXPAND_COLUMN,
  SELECTION_COLUMN,
  SELECTION_ALL,
  SELECTION_NONE,
  SELECTION_INVERT,
  Summary: SummaryComponent,
  Column,
  ColumnGroup,
})

export const Table = TableComponent as typeof TableComponent & {
  EXPAND_COLUMN: typeof EXPAND_COLUMN
  SELECTION_COLUMN: typeof SELECTION_COLUMN
  SELECTION_ALL: SelectionItem
  SELECTION_NONE: SelectionItem
  SELECTION_INVERT: SelectionItem
  /** S22 汇总组件（对齐 antd `Table.Summary`，含 .Row / .Cell）。 */
  Summary: typeof SummaryComponent
  /**
   * S31 JSX 风格 API 单列组件（对齐 antd `Table.Column`）。
   * `<Table.Column title="..." dataIndex="..." />` 等价于在 `columns` 里声明一列。详见 `ColumnProps`。
   */
  Column: typeof Column
  /**
   * S31 JSX 风格 API 分组列组件（对齐 antd `Table.ColumnGroup`）。
   * `<Table.ColumnGroup title="..."><Table.Column/></Table.ColumnGroup>` 等价于 `columns[].children`。详见 `ColumnGroupProps`。
   */
  ColumnGroup: typeof ColumnGroup
}

function TableInner<RecordType = any>(
  props: TableProps<RecordType>,
  ref: React.Ref<TableRef>,
) {
  const {
    dataSource = [],
    rowKey = 'key',
    bordered = false,
    size,
    showHeader = true,
    title,
    footer,
    rowHeight,
    headerHeight,
    scroll,
    virtual,
    resizable = false,
    resizableMinWidth,
    resizableMaxWidth,
    rowSelection,
    expandable,
    pagination,
    loading,
    className,
    style,
    onChange,
    showSorterTooltip,
    components,
    summary,
    // ★ §9 列宽策略 tableLayout（对齐 antd `TableProps.tableLayout`）。详见下方 derivedTableLayout 注释。
    tableLayout: tableLayoutProp,
    locale,
    classNames,
    styles,
    // S32：Table 级列默认属性（对齐 antd `TableProps.column`）。undefined 时不合并（零回归）。
    column,
    // S34：页面级粘性表头（对齐 antd `TableProps.sticky`）。undefined/false 不启用（零回归）。
    sticky,
    // ★ 接口全兼容（决策 3 第二步）新公共 API：onHeaderRow / onRow / rowClassName /
    //   getPopupContainer / rowHoverable。全部 undefined 时引擎零回归（不注入任何额外 DOM/props）。
    onHeaderRow,
    onRow,
    rowClassName,
    getPopupContainer,
    rowHoverable,
  } = props

  // === S31 JSX 风格 API：columns 或 children 二选一 ===
  // 与 antd `columns || convertChildrenToColumns(children)`（InternalTable.tsx:231）逐字对齐：
  //   - 传 `columns` prop（含显式 `[]`）→ 走 columns 路径（所有现有 demo，零回归），JSX children 忽略。
  //   - 未传 `columns` prop（undefined）但传 JSX children（`<Table.Column>` / `<Table.ColumnGroup>`）
  //     → 走解析路径，用 convertChildrenToColumns 把 JSX 子元素转为 columns 数组。
  //   - 两者都未传 → columns=[] 空表（无列）。
  // ★ 关键：用 `props.columns === undefined` 区分"未传"与"显式传 []"（解构默认值无法区分，故不从解构取 columns）。
  //   仅当 columns 未传时才解析 children，保证传 columns 的所有现有 demo 零回归（visibleColumns/columnTree 等
  //   下游 useMemo 依赖项不变）。
  const columns: Array<ColumnOrSentinel<RecordType>> = useMemo(() => {
    let raw: Array<ColumnOrSentinel<RecordType>>
    if (props.columns !== undefined) {
      raw = props.columns
    } else if (props.children !== undefined && props.children !== null) {
      raw = convertChildrenToColumns<RecordType>(props.children)
    } else {
      raw = []
    }
    // S32：把 Table 级 `column` 默认属性浅合并到每个列（列自身优先；哨兵豁免；多级表头递归）。
    //   `column` undefined 时 applyColumnDefaults 原样返回 raw（零回归：现有 demo 列引用不变）。
    //   合并位置在 responsive 过滤 / 排序 / 筛选 / 列树构建之前，保证 column 默认（如 align/ellipsis/
    //   responsive/sorter/...）对所有下游机制生效（对齐 antd `useFilledColumns(rawColumns, column)`
    //   在 InternalTable 派生 baseColumns 时合并，下游消费 baseColumns）。
    return applyColumnDefaults<RecordType>(raw, column)
    // children 是 ReactNode（含 ReactElement），引用稳定（JSX 每次渲染产生新数组但元素引用稳定；
    // convertChildrenToColumns 依赖元素 props，props 变化时父组件本就会重渲染）。依赖 columns + children + column。
  }, [props.columns, props.children, column])

  const rowKeyResolved = rowKey as string | ((record: RecordType) => string | number)

  // === S28 响应式 responsive：按当前视口断点过滤列（对齐 antd InternalTable.tsx:235-246）===
  // 实现位置：在所有列派生（排序/筛选/选择/展开/列树构建）之前过滤 columns，保证被移除的列
  //   不参与任何下游机制（与 antd 一致：antd 在 InternalTable 派生 mergedColumns 时过滤，
  //   下游消费 mergedColumns）。
  //
  // ★ 性能优化（对齐 antd `needResponsive` 思路）：先算 needResponsive（任一普通列设了 responsive）。
  //   - needResponsive=false（所有现有 demo 默认）：visibleColumns 直接返回原 columns 引用（短路），
  //     即使 screens 在视口变化时更新，visibleColumns 引用不变 → 下游 useMemo 不重算 → 零回归、
  //     零多余重渲染。
  //   - needResponsive=true：按 screens 过滤。
  //   哨兵（EXPAND_COLUMN / SELECTION_COLUMN）不是 ColumnType，不带 responsive，跳过判定。
  //
  // 注：antd 公开类型 `Grid.useBreakpoint` 声明为无参（`() => ScreenMap`），底层 hook 实际支持
  //   `refreshOnChange` 参数但公开类型未暴露。这里用无参形式（refreshOnChange 默认 true，订阅
  //   responsiveObserver）；needResponsive 短路保证无 responsive 的 demo 不触发重渲染（visibleColumns
  //   引用稳定），订阅本身是轻量 ResizeObserver，无性能问题。
  const needResponsive = useMemo(() => {
    for (const c of columns as Array<ColumnOrSentinel<RecordType>>) {
      if (c === SELECTION_COLUMN || c === EXPAND_COLUMN) continue
      if ((c as ColumnType<RecordType>).responsive) return true
    }
    return false
  }, [columns])

  // useBreakpoint 订阅 antd responsiveObserver，视口变化时返回新 ScreenMap 触发重渲染。
  // 仅在 needResponsive=true 的场景下被下游 visibleColumns 消费；needResponsive=false 时短路。
  const screens = Grid.useBreakpoint()

  // 过滤 columns：无 responsive 的列（含哨兵）保留；有 responsive 的列按 antd 语义匹配
  // （列出的任一断点在当前视口激活即保留）。逐字对齐 antd InternalTable.tsx:242-246：
  //   matched = Object.keys(screens).filter(bp => screens[bp])
  //   显示 <=> !responsive || responsive.some(r => matched.has(r))
  const visibleColumns = useMemo(() => {
    if (!needResponsive) return columns
    const screensMap = screens ?? {}
    const matched = new Set<string>()
    for (const bp in screensMap) {
      if (screensMap[bp as keyof typeof screensMap]) matched.add(bp)
    }
    return (columns as Array<ColumnOrSentinel<RecordType>>).filter((c) => {
      // 哨兵不带 responsive，始终保留（对齐 antd：哨兵在 useFilledColumns 阶段展开，已不是
      // responsive 过滤的对象）。
      if (c === SELECTION_COLUMN || c === EXPAND_COLUMN) return true
      const col = c as ColumnType<RecordType>
      if (!col.responsive) return true
      return col.responsive.some((r) => matched.has(r as string))
    })
  }, [columns, needResponsive, screens])

  // === S1 单列 + S2 多列排序（须在 M5 选择 / M9 展开之前派生 sortedDataSource，供下游 hooks 消费）===
  // useSorter 从原始 antd columns 派生排序状态（受控/非受控、sortDirections 循环、defaultSortOrder、
  // S2 多列 multiple 优先级）。
  // - sortOrderMap：每列 sortOrder（键 = resolveColumnSortKey(column) = column.key ?? dataIndex，
  //   与 antd sorter.columnKey 取值一致）。单列模式下仅一列非 null；多列模式下可多列非 null。
  // - sortPriorityMap（S2）：多列模式下激活列的优先级序号（1-based，按 multiple 降序，
  //   multiple 最大=编号 1=最高优先级，对齐 antd getSortData 实际比较顺序）；单列模式空。
  // - sortedDataSource：非受控时为排序后的 dataSource 副本（单列直接排；多列按 multiple 链式叠加）；
  //   受控时为原 dataSource。
  // - onSorterClick：引擎表头格点击时触发（该列自身 sortDirections 循环 + 单列/多列状态切换 + onChange 分发）。
  // 注意：传入的 columns 是**已过滤哨兵**的原始 antd 列（哨兵不是可排序列）。
  // === S11 分页状态占位 ref ===
  // useSorter（在下方）/ useFilter（下方）的 onChange 在用户交互时触发（滞后于 render），
  // 届时 ref 已被 usePagination（更下方）同步为最新分页状态。这样 sort/filter 触发的 onChange
  // 的 pagination 参数始终反映当前分页（对齐 antd：onChange 的 pagination 始终反映当前分页）。
  // 初始值兜底（pagination 未启用时也安全——下方 useMemo 会算出"未启用"态注入）。
  const paginationStateRef = useRef<TablePaginationState>({ current: 1, pageSize: 0, total: 0 })

  const sortableColumns = useMemo(
    () =>
      (visibleColumns as Array<ColumnOrSentinel<RecordType>>).filter(
        (c): c is ColumnType<RecordType> =>
          c !== SELECTION_COLUMN && c !== EXPAND_COLUMN,
      ),
    [visibleColumns],
  )
  const { sortOrderMap, sortPriorityMap, sortedDataSource, onSorterClick, currentSorterResult } = useSorter<RecordType>({
    columns: sortableColumns,
    dataSource,
    // S11：包装 onChange，把 useSorter 内部传入的占位 pagination `{}` 替换为当前实际分页状态
    // （paginationStateRef.current，对齐 antd：onChange 的 pagination 始终反映当前分页）。
    // filters/sorter/extra 原样透传（useSorter 内部已组装 filters={} / sorter / action:'sort'）。
    onChange: onChange
      ? (_pagination, filters, sorter, extra) => {
          onChange(paginationStateRef.current, filters, sorter, extra)
        }
      : undefined,
  })

  // === S3 基础列筛选（须在 M5 选择 / M9 展开之前派生 filteredDataSource，供下游 hooks 消费）===
  // useFilter 从原始 antd columns + sortedDataSource 派生筛选状态（受控/非受控、filteredValue、
  // defaultFilteredValue、filterMultiple）。
  // - filteredValueMap：每列激活筛选值（键 = resolveFilterKey(column) = column.key ?? dataIndex，
  //   与 sortKey 一致）。
  // - filteredDataSource：非受控时为"排序后 → 筛选后"的数据源（叠加顺序：raw → sort → filter，
  //   对齐 antd）；受控时为 sortedDataSource（外部控制）。
  // - setFilterValue：FilterDropdown 应用/重置时触发（引擎层 onFilterApply 转发到此）。
  // 注意：传入 sortedDataSource（排序后），实现 raw → sort → filter 叠加（与 antd 一致）。
  // 排序结果（sortOrderMap/sortedDataSource）变化时，useFilter 的输入随之变化，filteredDataSource
  // 重算（筛选条件基于新排序结果——虽然筛选是数据集合层面操作、与顺序无关，但叠加链顺序对齐 antd）。
  const { filteredValueMap, filteredDataSource, setFilterValue, getFiltersArg } = useFilter<RecordType>({
    columns: sortableColumns,
    dataSource: sortedDataSource,
    onFilterChange: (filters, currentDataSource) => {
      // 适配层注入最新 sorter（useSorter.currentSorterResult），组装完整 onChange。
      // sorter 取当前排序状态（非"本次筛选前的"也非"点击排序触发的 nextStates"——
      // 筛选不改变排序，sorter 应反映当前已应用的排序）。
      // S11：注入当前分页状态（对齐 antd：onChange 的 pagination 始终反映当前分页）。
      if (!onChange) return
      onChange(
        paginationStateRef.current,
        filters,
        currentSorterResult,
        { currentDataSource, action: 'filter' },
      )
    },
  })

  // === S13 树形数据（须在 M5 选择 / M9 展开之前派生 flattenedDataSource，供下游 hooks 消费）===
  // 解析 childrenColumnName / indentSize：expandable.* 字段优先（对齐 antd getExpandableProps），
  // 未设时用 Table 级字段；都未设时用默认 'children' / 15（对齐 antd 6.4.4 实测 InternalTable.tsx:611）。
  const childrenColumnName =
    expandable?.childrenColumnName ?? props.childrenColumnName ?? 'children'
  const indentSize = expandable?.indentSize ?? 15

  // useTreeData：检测树形（任一 record 含 childrenColumnName 非空数组）→ 扁平化 + 展开过滤。
  // 非树形 → flattenedData 原样 filteredDataSource（零回归）；rowInfoMap/parentChildrenMap 空。
  const tree = useTreeData<RecordType>({
    dataSource: filteredDataSource,
    childrenColumnName,
    rowKey: rowKeyResolved,
    expandable: expandable as Expandable<RecordType> | undefined,
  })
  const treeEnabled = tree.treeEnabled
  // 树形模式下，下游选择/展开/分页/渲染都消费 flattenedData（仅可见行）。
  // 非树形 → flattenedData === filteredDataSource（同引用，零回归）。
  const flattenedDataSource = tree.flattenedData

  // === M5 行选择 ===
  // 非受控默认值：仅当 rowSelection.selectedRowKeys 未传时使用 defaultSelectedRowKeys。
  // 内部用 useState 持有"非受控当前值"，受控模式（selectedRowKeys 传入）下此 state 不参与。
  const rowSel = rowSelection as TableRowSelection<RecordType> | undefined
  const isControlledSelection = rowSel ? rowSel.selectedRowKeys !== undefined : false
  const [uncontrolledKeys, setUncontrolledKeys] = useState<Array<React.Key>>(
    () => rowSel?.defaultSelectedRowKeys ?? [],
  )
  // 受控：用 rowSel.selectedRowKeys；非受控：用 uncontrolledKeys。
  const effectiveSelectedKeys: Array<React.Key> = rowSel
    ? isControlledSelection
      ? (rowSel.selectedRowKeys as Array<React.Key>)
      : uncontrolledKeys
    : []

  // 状态机：从 effectiveSelectedKeys + flattenedDataSource + rowKey + getCheckboxProps 派生。
  // ★ S1：用排序后的顺序；★ S3：用筛选后的数据源（与引擎实际渲染顺序一致）。
  // ★ S13：树形模式下用 flattenedDataSource（仅可见行）——与引擎实际渲染顺序一致；
  //   同时传 checkStrictly + parentChildrenMap 启用父子联动。
  //   使 selectedRows 与引擎渲染顺序一致（与 antd "onChange 返回渲染后顺序的 selectedRows"语义一致）。
  // 返回 isSelected/allSelected/intermediate/isDisabled/isIndeterminate 与 toggle* 操作。
  const selection = useRowSelection<RecordType>({
    type: rowSel?.type,
    selectedRowKeys: effectiveSelectedKeys,
    dataSource: flattenedDataSource,
    rowKey: rowKeyResolved,
    getCheckboxProps: rowSel?.getCheckboxProps,
    selections: rowSel?.selections,
    checkStrictly: rowSel?.checkStrictly,
    parentChildrenMap: tree.parentChildrenMap,
  })

  // 统一 onChange 分发：更新非受控 state + 调用 rowSel.onChange。
  // selectedRows 按 selectableKeys 顺序返回（即排除 disabled 行；与 antd 一致）。
  // ★ S12 preserveSelectedRowKeys（跨页/跨数据源保留已选 key，对齐 antd）：
  //   - false（默认）：每次勾选操作生成的 nextKeys 会被**过滤**——保留 dataSource 中存在的 key，
  //     丢弃不在当前数据源的 key（antd `setSelectedKeys` 非 preserve 分支：keys.filter(getRecordByKey)）。
  //     即：已选但翻页后不在当前页的 key，会在下次勾选时被清掉。
  //   - true：不过滤，nextKeys 原样保留所有 key（antd preserve 分支：availableKeys = keys）。
  //     典型 ajax 场景：翻页后回原页，之前选的仍是选中态。
  //   受控/非受控都过滤（antd 的 setMergedSelectedKeys 对两者都写过滤后的值）。
  const fireSelectionChange = useCallback(
    (nextKeysInput: Array<React.Key>, method: RowSelectMethod) => {
      if (!rowSel) return
      const preserve = rowSel.preserveSelectedRowKeys === true
      // S12：非 preserve 模式过滤掉不在数据源中的 key（对齐 antd）。
      // preserve=true 则保留全部（含跨页/跨数据源的 key）。
      // ★ S13：树形模式下用**全树**（filteredDataSource，未扁平化）做存在性判定——
      //   折叠的子孙 key 仍在全树中（antd getRecordByKey 搜全树，行为一致），
      //   不应被清掉（checkStrictly=false 勾父→勾全部子孙含折叠的）。
      const existenceSource = treeEnabled ? filteredDataSource : flattenedDataSource
      const nextKeys: Array<React.Key> = preserve
        ? nextKeysInput
        : (() => {
            const existSet = new Set<React.Key>()
            const walk = (records: Array<RecordType>) => {
              for (const rec of records) {
                existSet.add(getRowKey(rec, rowKeyResolved))
                // 树形：递归收集子孙 key（折叠的也在）。
                const children = rec && typeof rec === 'object'
                  ? (rec as any)[childrenColumnName]
                  : undefined
                if (Array.isArray(children) && children.length > 0) walk(children)
              }
            }
            walk(existenceSource)
            return nextKeysInput.filter((k) => existSet.has(k))
          })()
      if (!isControlledSelection) {
        setUncontrolledKeys(nextKeys)
      }
      // 按 selectableKeys 顺序构造 selectedRows（disabled 行不会出现在 nextKeys 的 selectable 子集里）。
      // ★ S1/S3/S13：遍历 flattenedDataSource（排序+筛选+树形扁平化后顺序——仅可见行），
      //   与 antd "onChange 返回渲染后顺序的 selectedRows" 一致。
      //   注：折叠的子孙 record 不在 flattenedDataSource，不出现在 selectedRows（与 antd 一致：
      //   antd selectedRows 也只含当前可见的选中行）。
      const keySet = new Set<React.Key>(nextKeys)
      const rows: Array<RecordType> = []
      for (const rec of flattenedDataSource) {
        const k = getRowKey(rec, rowKeyResolved)
        if (keySet.has(k)) rows.push(rec)
      }
      rowSel.onChange?.(nextKeys, rows, { type: method })
    },
    [rowSel, isControlledSelection, flattenedDataSource, filteredDataSource, treeEnabled, childrenColumnName, rowKeyResolved],
  )

  // === M9 行展开状态（useRowExpand hook 派生；引擎 + 展开列 render 闭包共同消费）===
  // ★ S1：用排序后的顺序；★ S3：用筛选后的数据源（与引擎实际渲染顺序一致）。
  // ★ S13：树形模式下**不启用** M9 expandState（antd 行为：tree-data 与 expandedRowRender 互斥，
  //   树形优先）。故 useRowExpand 仍调用（非树形 demo 不破），但 engineExpandState 在树形模式下
  //   返回 undefined（见下方 useMemo 守卫）。
  const expand = useRowExpand<RecordType>({
    expandable: expandable as Expandable<RecordType> | undefined,
    dataSource: flattenedDataSource,
    rowKey: rowKeyResolved,
  })
  // ★ S13：树形模式下禁用 M9 expand（即使 expandable.expandedRowRender 存在）——树形优先。
  const expandEnabled = !treeEnabled && expand.expandEnabled
  const showExpandColumn =
    expandEnabled && (expandable?.showExpandColumn !== false)

  // === 构建引擎列树（支持任意深度 children）。引擎内部按需退化为单层快速路径（maxDepth===1）。===
  // M5：若 rowSelection 传入，在最前插入一个"选择列"叶子节点（参与 grid 布局）。
  //   选择列的 render/title 是闭包（捕获当前 selection state），每次切换勾选都会重建 columnTree。
  //   引擎 resolveColumnTree 随之重算（O(cols)），可接受（antd rc-table 同样每次切换重渲染）。
  // M9：若 expandable 传入且至少有一行可展开，在最前插入一个"展开列"叶子节点（在选择列之后）。
  //   展开列的 render 是闭包（捕获当前 expand state），每次展开/收起都会重建 columnTree。
  //
  // === Table.EXPAND_COLUMN / Table.SELECTION_COLUMN 哨兵（M9 / order-column demo）===
  // 若 columns 数组含哨兵对象，选择列 / 展开列插在哨兵位置（而非默认最前）。
  // 不含哨兵时按默认位置：选择列最前，展开列在选择列之后。
  const selectionNode = rowSel
    ? buildSelectionColumnNode<RecordType>(
        rowSel,
        selection,
        fireSelectionChange,
        rowKeyResolved,
      )
    : null
  const expandNode =
    expandEnabled && showExpandColumn
      ? buildExpandColumnNode<RecordType>(expandable as Expandable<RecordType>, expand, rowKeyResolved)
      : null

  const columnTree = useMemo(() => {
    // 遍历 columns（含哨兵）：哨兵位置插入对应列节点；普通列走 toEngineColumns 单元素构建。
    // 收集哨兵命中信息——若未命中，按默认位置在最前插入。
    let seenSelectionSentinel = false
    let seenExpandSentinel = false
    const result: Array<EngineColumnNode<RecordType>> = []
    // ★ M9 key 去重：整棵列树共享一个匿名列计数器。每个匿名列（无 key/dataIndex）按遍历顺序
    //   得到唯一的 `col-N`，避免之前每个顶层列独立调 `toEngineColumns([col])` 导致 `index` 恒 0
    //   → 多个匿名列都回退到 `col-0` → 表头格 React key 重复（virtual-list demo 的 `Group` 与
    //   `Action` 列均无 key/dataIndex，都得到 `col-0`）。
    const anonCounter = { seq: 0 }
    for (const item of visibleColumns as Array<ColumnOrSentinel<RecordType>>) {
      if (item === SELECTION_COLUMN) {
        seenSelectionSentinel = true
        if (selectionNode) result.push(selectionNode)
        continue
      }
      if (item === EXPAND_COLUMN) {
        seenExpandSentinel = true
        if (expandNode) result.push(expandNode)
        continue
      }
      // 普通列：单元素构建（与 toEngineColumns 内部一致）；共享 anonCounter 保证全局唯一。
      const col = item as ColumnType<RecordType>
      const node = toEngineColumns<RecordType>([col], anonCounter, showSorterTooltip)[0]
      if (node) result.push(node)
    }
    // 默认位置：未命中哨兵的列插在最前（选择列在前，展开列随后）。
    if (!seenSelectionSentinel && selectionNode) result.unshift(selectionNode)
    if (!seenExpandSentinel && expandNode) {
      // 展开列在选择列之后；若选择列已 unshift 在 0，展开列插在 1，否则插在 0。
      if (!seenSelectionSentinel && selectionNode) result.splice(1, 0, expandNode)
      else result.unshift(expandNode)
    }
    return result
    // selection / expand state 变化时重建（捕获最新勾选/展开态）；columns 变化时重建。
    // ★ S28：visibleColumns 是 columns 经 responsive 过滤后的结果，依赖项改用 visibleColumns
    //   （screens 变化时 visibleColumns 重算 → columnTree 重建 → 引擎按新列树渲染）。
  }, [visibleColumns, selectionNode, expandNode, showSorterTooltip])

  // 把 useSorter 派生的 sortOrderMap 回填到 columnTree 的叶子节点（引擎据此渲染排序图标 +
  // dg-column-sort 类）。回填按"原始 antd column"匹配：每个叶子引擎节点的 raw 字段保留原始列引用，
  // 从中算出 sortKey（column.key ?? dataIndex），查 sortOrderMap 得 sortOrder。
  // 未匹配的叶子节点 sortOrder 保持 undefined（引擎视为 null）。
  // S3：同时把 useFilter 派生的 filteredValueMap 回填到可筛选叶子节点（引擎据此渲染漏斗激活态 +
  //   下拉默认勾选）。
  const columnTreeWithSortAndFilter = useMemo(() => {
    // 第一步：排序回填（S1/S2）。
    let tree = columnTree
    if (sortOrderMap.size === 0) {
      // 无任何排序列 → 给所有可排序叶子节点显式设 null（确保图标渲染为"无序"态而非 undefined）。
      // 优化：仅当存在至少一个可排序列时才做回填，避免对无排序表格做无谓遍历（零回归）。
      let hasAnySorter = false
      for (const node of columnTree) {
        if (!hasChildren(node) && node.sorter) {
          hasAnySorter = true
          break
        }
      }
      if (hasAnySorter) {
        tree = columnTree.map(
          (node) => applySortOrderToNode(node, sortOrderMap, sortPriorityMap),
        )
      }
    } else {
      tree = columnTree.map(
        (node) => applySortOrderToNode(node, sortOrderMap, sortPriorityMap),
      )
    }
    // 第二步：筛选回填（S3）。仅当存在至少一个可筛选列时才做回填（零回归优化）。
    // ★ S12：激活态门与 filterable 判定单一真理源对齐（与 useFilter.isFilterable 字面一致——
    //   filters 非空 || filterDropdown 存在 || onFilter 存在）。修复「纯 filters 无 onFilter」列
    //   （如 ajax demo Gender）激活态不回填：此前门用 (filters && onFilter) || filterDropdown，
    //   漏掉纯 filters 列 → hasAnyFilter=false → applyFilterToNode 跳过 → filteredValue 恒 null → 漏斗不变蓝。
    //   注：EngineColumnNode 无 filterable 字段（仅 EngineHeaderCell 有），故此处用内联条件复刻 isFilterable。
    let hasAnyFilter = false
    for (const node of tree) {
      if (
        !hasChildren(node) &&
        isNodeFilterable(node)
      ) {
        hasAnyFilter = true
        break
      }
    }
    if (hasAnyFilter) {
      tree = tree.map((node) => applyFilterToNode(node, filteredValueMap))
    }
    return tree
  }, [columnTree, sortOrderMap, sortPriorityMap, filteredValueMap])

  // === S29 语义化样式 classNames/styles 求值 ===
  // 支持对象（静态）或函数 `(info) => 对象`（动态，按 info.props 求值）。对齐 antd v6：
  //   - info.props 含 size/bordered/virtual/scroll/pagination 子集（与 antd 一致：暴露当前生效 props）。
  //   - 求值后统一得到 `TableSemanticClassNames`/`TableSemanticStyles` 对象。
  // 适配层直接消费 root/title/footer/pagination.*（注入到对应 DOM）；section/content/header/body
  //   透传给引擎（GridTable.semantic）由引擎注入到 grid 内部部位。
  // 未提供（undefined）时 semanticResolved 为 undefined，所有部位走默认 class/style，零回归。
  const semanticInfo = {
    props: {
      size,
      bordered,
      virtual,
      scroll,
      pagination: pagination as false | TablePaginationConfig | undefined,
    },
  }
  const classNamesResolved: TableSemanticClassNames | undefined = useMemo(() => {
    if (classNames === undefined) return undefined
    if (typeof classNames === 'function') return classNames(semanticInfo)
    return classNames
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classNames, size, bordered, virtual, scroll, pagination])
  const stylesResolved: TableSemanticStyles | undefined = useMemo(() => {
    if (styles === undefined) return undefined
    if (typeof styles === 'function') return styles(semanticInfo)
    return styles
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styles, size, bordered, virtual, scroll, pagination])

  // 引擎消费子集（section/content/header/body）。
  const engineSemantic: EngineSemantic | undefined = useMemo(() => {
    if (!classNamesResolved && !stylesResolved) return undefined
    const sem: EngineSemantic = {}
    if (classNamesResolved?.section || stylesResolved?.section) {
      sem.section = {
        className: classNamesResolved?.section,
        style: stylesResolved?.section,
      }
    }
    if (classNamesResolved?.content || stylesResolved?.content) {
      sem.content = {
        className: classNamesResolved?.content,
        style: stylesResolved?.content,
      }
    }
    if (classNamesResolved?.header || stylesResolved?.header) {
      sem.header = {
        className: classNamesResolved?.header,
        style: stylesResolved?.header,
      }
    }
    if (classNamesResolved?.body || stylesResolved?.body) {
      sem.body = {
        className: classNamesResolved?.body,
        style: stylesResolved?.body,
      }
    }
    return sem
  }, [classNamesResolved, stylesResolved])

  // S34：sticky 启用时给 .dg-wrapper 加 dg-sticky 修饰类。
  //   table.css 的 .dg-wrapper 默认 overflow:hidden + width:100%（圆角裁剪 + 容器约束），
  //   但 overflow:hidden 使 .dg-wrapper 成为表头 sticky 的非 visible 溢出祖先（CSS 规范），
  //   拦截 sticky 上下文，导致页面级 sticky 表头相对 viewport 永不触发；同时 width:100%
  //   裁切 .dg-grid min-width:scrollX，使页面横向不滚动（fixed-end/StickyScrollBar 失效）。
  //   故 sticky 启用时切到 .dg-sticky：overflow:visible 放开 sticky 上下文到 viewport，
  //   width:auto 不约束宽度让 grid 撑宽页面横向滚动。
  //   圆角降级：sticky 模式下 .dg-wrapper 不裁剪，圆角视觉降级（优先 sticky 功能正确）。
  const stickyClassEnabled = sticky !== undefined && sticky !== false
  // 决策 7：scroll.y===true 数据区域模式 → .dg-wrapper 加 dg-data-area 修饰类
  //   （display:flex; flex-direction:column; height:100%），让表体区（.dg-scroll-wrap）
  //   flex:1 填满父容器剩余空间（CSS 自动适应高度，不用 JS 算数字）。父容器需有明确 height。
  const dataAreaClassEnabled = scroll?.y === true
  const wrapperClass = [
    'dg-wrapper',
    sizeToClass(size),
    bordered ? 'dg-bordered' : '',
    stickyClassEnabled ? 'dg-sticky' : '',
    dataAreaClassEnabled ? 'dg-data-area' : '',
    className ?? '',
    // S29：语义化 root 部位 className（合并到根容器）。
    classNamesResolved?.root ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  // ★ 主题注入重构 Round 1：用 antd 内部 `useToken`（`antd/es/theme/internal`）拿 realToken
  //   （未 var 化的原值，与 antd transformToken 输入完全一致），喂 antd 真实 `transformToken`
  //   产出与 .ant-table-wrapper 同名同值的全套 `--ant-*`。详见文件头注释 + `tokenToCssVars`/
  //   `tableTokenToCssVars` 注释。
  //
  // useAntdInternalToken 返回 6 元组 `[mergedTheme, realToken, hashId, token, cssVar, zeroRuntime]`：
  //   - realToken（index 1）= 未 var 化原值（公开 theme.useToken().token 已被 var 化为 'var(--ant-x)'，
  //     不能直接喂 transformToken——会产出 --ant-x:var(--ant-y) 自引用空循环）。
  //   - cssVar（index 4）= `{ prefix:'ant', key:'css-var-root' }`（默认；ConfigProvider cssVar
  //     可覆盖 prefix/key，但 demo 不覆盖）。
  //
  // 旧实现 `theme.useToken()` 返回的 token 是 var 化的（值是字符串 'var(--ant-color-primary)'），
  //   旧映射表只读键名不读值（直接写入 token 字段值如 '#1677ff'），凑巧没踩 var 自引用坑。
  //   新实现必须用 realToken（原值），与 antd transformToken 同输入同输出。
  //
  // ★ realToken.Table 仅含**用户在 ConfigProvider theme.components.Table 显式声明的覆盖项**
  //   （不含 prepareComponentToken 派生的默认值——antd 是在 genCSSVarRegister 的 fn 回调里
  //   通过 getDefaultComponentToken + getComponentToken 在渲染时单独合并 + 删除与 alias 同值键）。
  //   data-grid 在注入时（tableTokenToCssVars）复刻此合并流程：prepareComponentToken 默认 + 用户覆盖。
  //
  // ★ useMemo 依赖 realToken：useCacheToken 内部用 tokenStr 缓存，realToken 引用在 theme/override
  //   变化时更新（新对象）→ useMemo 重算 vars → 视觉同步。
  const antdUseTokenResult = useAntdInternalToken()
  // realToken 已是 GlobalToken（useToken 元组 index 1），强转为 Record<string, unknown>
  //   以便 transformToken 处理（transformToken 接受任意 token 对象，TS 上用 Record 表达）。
  //   经 unknown 中转避免 strict 类型校验。
  const realToken = antdUseTokenResult[1] as unknown as Record<string, unknown> | undefined
  const cssVar = antdUseTokenResult[4] as { prefix: string; key: string }

  // alias var：transformToken(realToken, ...)，与 useCacheToken 内部同款调用。
  //   unitless/ignore/preserve 直接复用 antd 源文件导出的全集（不自己枚举，防猜测）。
  const aliasTokenVars = useMemo(
    () =>
      realToken
        ? tokenToCssVars(realToken, cssVar, {
            unitless: antdTokenUnitless as Record<string, boolean>,
            ignore: antdTokenIgnore as Record<string, boolean>,
            // preserve 集合 antd useToken.ts 内部声明为 const（未 export），复制稳定集合：
            //   screenXS..screenXXXL 各 min/max（preserve 让 transformToken 原样保留数值不转 CSS var）。
            preserve: {
              screenXS: true, screenXSMin: true, screenXSMax: true,
              screenSM: true, screenSMMin: true, screenSMMax: true,
              screenMD: true, screenMDMin: true, screenMDMax: true,
              screenLG: true, screenLGMin: true, screenLGMax: true,
              screenXL: true, screenXLMin: true, screenXLMax: true,
              screenXXL: true, screenXXLMin: true, screenXXLMax: true,
              screenXXXL: true, screenXXXLMin: true,
            },
          })
        : {},
    [realToken, cssVar],
  )

  // Table component var：完全复刻 antd genCSSVarRegister fn 回调（详见 tableTokenToCssVars 注释）。
  //   传入完整 realToken（含 .Table 子对象），内部调 prepareComponentToken 派生默认 + 合并用户覆盖
  //   + 删 alias 同值键 + prefixToken 重命名（仅 defaultToken 的 key）→ 产出 --ant-table-*（默认派生）
  //   与写回 alias 同名的 --ant-* （如 colorBgContainer）混合 CSS vars。
  //   realToken 为 undefined（首次渲染前）时输出空对象（零回归）。
  const tableTokenVars = useMemo(
    () =>
      realToken
        ? tableTokenToCssVars(realToken, cssVar)
        : {},
    [realToken, cssVar],
  )

  // S29：语义化 root 部位 style（合并到根容器 style；semantic 覆盖同名字段）。
  // 主题注入：aliasTokenVars（基础 alias token）+ tableTokenVars（Table component token）合并到根容器
  //   style；优先级：style（用户传入） > stylesResolved.root（S29 语义 root style）
  //   > tableTokenVars（Table component token）> aliasTokenVars（基础 alias token）
  //   > tokens.css fallback。
  //
  //   合并顺序 `{...aliasTokenVars, ...tableTokenVars}`：tableTokenVars 覆盖 aliasTokenVars 同名字段。
  //   实际几乎不重名：alias 用 `--ant-color-*`/`--ant-border-radius` 等直名（`token2CSSVar('colorPrimary','ant')`
  //   = `--ant-color-primary`），Table 用 `--ant-table-*`（prefixToken 加 `Table` 前缀后再 token2CSSVar：
  //   `token2CSSVar('TableHeaderBg','ant')` = `--ant-table-header-bg`）。
  //
  //   ★ colorBgContainer 写回机制（Round 2，task #27）：用户覆 `Table.colorBgContainer` 时，
  //   tableTokenVars 直接产出 `--ant-color-bg-container`（写回 alias 同名 var，非新增
  //   `--ant-table-color-bg-container`）——与 antd DOM 一致。aliasTokenVars 也产出
  //   `--ant-color-bg-container`（alias 默认 #ffffff），但 tableTokenVars 在合并中后置覆盖之
  //   （`{...aliasTokenVars, ...tableTokenVars}`），最终 .dg-wrapper 的 `--ant-color-bg-container`
  //   = 用户值（如 component-token demo 的 #e6f4ff）。data-grid 表体底色消费此 var（tokens.css）。
  //
  //   CSS variable 由 inline style 提供优先级高于 class（tokens.css fallback）。用户 style 与 token
  //   vars 的 key 空间不同（用户用标准 CSS 属性，token vars 用 `--ant-*`），实际不冲突。
  const wrapperStyle = useMemo(() => {
    const merged: React.CSSProperties = { ...aliasTokenVars, ...tableTokenVars }
    if (stylesResolved?.root) {
      Object.assign(merged, style, stylesResolved.root)
    } else if (style) {
      Object.assign(merged, style)
    }
    return merged
  }, [style, stylesResolved?.root, tableTokenVars, aliasTokenVars])

  /**
   * ★ C1 列宽策略 tableLayout 派生（对齐 antd rc-table `Table.tsx:613-627` mergedTableLayout）。
   *
   * data-grid `grid-template-columns` 默认 `max-content`（列宽=内容宽）→ ① ellipsis 列 track=content
   * 宽，cell-inner 不溢出 → 视觉无 `...`（S20 gap）；② 固定列 + scroll.x 场景下，无 width 列
   * max-content 不填满 scrollX，实际列总宽 < 声明宽 → 横滚到右时 fixed-end 列脱离右边缘（§9
   * task#38 暴露的 virtual-list 问题）。antd 用 `<table>{width:100%}` + `table-layout:fixed`
   * 让无 width 列均分剩余（填满 scrollX，fixed-end 始终贴右；被压缩 < content → ellipsis 生效）。
   *
   * **派生规则**（对齐 antd `mergedTableLayout`，C1 完整版——补 fixColumn/fixHeader/sticky 派生）：
   *   - 用户显式传 `tableLayout`（`'fixed'` / `'auto'`）→ 用之。
   *   - 未显式 + **fixColumn**（任一叶子列 `fixed:'start'|'end'`）→ 'fixed'（除非 scroll.x==='max-content'，
   *     此时 antd 保持 'auto' 让内容自然撑宽）。
   *   - 未显式 + **fixHeader**（scroll.y===true 容器内固定表头）/ **sticky**（S34 页面级）/ **有 ellipsis 列**
   *     → 'fixed'。
   *   - 否则 → 'auto'（默认，维持 max-content；basic 等无 fixed/ellipsis/scroll 的 demo 走此路径）。
   *
   * antd 源码依据：`react-component/table/src/Table.tsx:613-627`：
   *   ```
   *   if (tableLayout) return tableLayout;
   *   if (fixColumn) return mergedScrollX === 'max-content' ? 'auto' : 'fixed';
   *   if (fixHeader || isSticky || flattenColumns.some(({ellipsis}) => ellipsis)) return 'fixed';
   *   return 'auto';
   *   ```
   *
   * ★ 与 C1 colTracks 策略配合：fixed 模式下无 width 列 `minmax(0,1fr)` 均分剩余填满容器/scrollX，
   *   绝对 width 列 `minmax(width,1fr)`；auto 模式下 `max-content`/`minmax(width,max-content)`。
   *   修 §9 task#38 virtual-list fixed-end 脱离 + S20 ellipsis + S27 narrow 均分（narrow 需 demo 显式
   *   tableLayout:fixed 或有 fixed/ellipsis 列才派生，narrow demo 三列均无 fixed/ellipsis 故仍 auto
   *   ——属 auto 语义预期，§9 已登记，不在本任务改 demo）。
   *
   * ★ M2 固定列偏移不受影响：useStickyColumns 用 ResizeObserver 实测 DOM 宽度（不依赖 col.width 数值），
   *   fixed 模式下 minmax 算出的实际宽度会被 ResizeObserver 重测，sticky 偏移自动正确。
   *
   * ★ ellipsis/fixed 判定：基于已过滤哨兵的 visibleColumns（与渲染一致）。哨兵（SELECTION/EXPAND）
   *   不是 ColumnType，不带 ellipsis/fixed，跳过。
   */
  const derivedTableLayout: 'auto' | 'fixed' = useMemo(() => {
    if (tableLayoutProp === 'fixed' || tableLayoutProp === 'auto') return tableLayoutProp
    // 扫描叶子列：fixColumn（任一 fixed）+ ellipsis（任一 ellipsis truthy）。
    let hasFixedColumn = false
    let hasEllipsis = false
    for (const c of visibleColumns as Array<ColumnOrSentinel<RecordType>>) {
      if (c === SELECTION_COLUMN || c === EXPAND_COLUMN) continue
      const col = c as ColumnType<RecordType>
      if (col.fixed) hasFixedColumn = true
      if (col.ellipsis) hasEllipsis = true
    }
    // fixHeader = scroll.y===true（决策 7 容器内固定表头）；isSticky = sticky prop 启用。
    const fixHeader = scroll?.y === true
    const isSticky = sticky !== undefined && sticky !== false
    // 对齐 antd `Table.tsx:620-622`：fixColumn 时提前返回（max-content → auto，否则 fixed），
    //   不再落到 fixHeader/ellipsis 分支——即使同时有 fixHeader/ellipsis，fixColumn+max-content 仍 auto。
    if (hasFixedColumn) {
      return scroll?.x === 'max-content' ? 'auto' : 'fixed'
    }
    if (fixHeader || isSticky || hasEllipsis) return 'fixed'
    return 'auto'
  }, [tableLayoutProp, visibleColumns, scroll?.x, scroll?.y, sticky])

  // 引擎层 ref（暴露 scrollTo 等）。本组件的 forwardRef ref 桥接到它。
  const engineRef = useRef<TableEngineHandle | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useImperativeHandle(
    ref,
    (): TableRef => ({
      scrollTo: (config) => {
        const engine = engineRef.current
        if (!engine) return
        // key → index：在适配层根据 rowKey 解析（引擎不感知 key 语义）。
        // ★ S1/S3/S13：用 flattenedDataSource（引擎实际渲染的数据源顺序——排序+筛选+树形扁平化后），
        //   否则排序/筛选/树形展开后 scrollTo(key) 会滚到错误行。
        if (config.key !== undefined) {
          const key = config.key
          const idx = flattenedDataSource.findIndex(
            (rec) => getRowKey(rec, rowKeyResolved) === key,
          )
          if (idx < 0) return
          engine.scrollTo({
            index: idx,
            offset: config.offset,
            align: config.align,
          })
          return
        }
        // antd 同名 top：合并到 scrollTop。
        if (config.scrollTop === undefined && config.top !== undefined) {
          engine.scrollTo({
            scrollTop: config.top,
            offset: config.offset,
            align: config.align,
          })
          return
        }
        engine.scrollTo({
          index: config.index,
          scrollTop: config.scrollTop,
          offset: config.offset,
          align: config.align,
        })
      },
      nativeElement: rootRef.current,
    }),
    [flattenedDataSource, rowKeyResolved],
  )

  // === M9 引擎展开状态对象 ===
  // 把 useRowExpand 的派生结果封装为 EngineExpandState，传给引擎。
  // 引擎据此插展开内容 track（0fr/1fr）+ 渲染展开内容；展开列 render 闭包直接用 expand（hook 结果）。
  // ★ S13：树形模式下 engineExpandState 恒 undefined（树形优先；treeState 单独传）。
  const engineExpandState: EngineExpandState | undefined = useMemo(() => {
    if (treeEnabled) return undefined
    if (!expandEnabled || !expandable?.expandedRowRender) return undefined
    return {
      expandEnabled,
      isExpanded: expand.isExpanded,
      expandableKeySet: expand.expandableKeySet,
      isExpandable: (key) => expand.expandableKeySet.has(key),
      expandedRowRender: (record, index, expanded) =>
        expandable.expandedRowRender!(record, index, 0, expanded),
      toggleExpand: expand.toggleExpand,
      showExpandColumn,
      expandIcon: expandable.expandIcon,
    }
  }, [treeEnabled, expandEnabled, expandable, expand, showExpandColumn])

  // === S13 引擎树形状态对象 ===
  // 把 useTreeData 的派生结果封装为 EngineTreeState，传给引擎。
  // 引擎据此在第一列数据单元格内按 level × indentSize 左缩进 + 渲染展开/收起图标。
  // 非树形 → undefined（零回归，引擎不消费）。
  const engineTreeState: EngineTreeState | undefined = useMemo(() => {
    if (!treeEnabled) return undefined
    return {
      treeEnabled,
      indentSize,
      rowInfoMap: tree.rowInfoMap,
      isExpanded: tree.isExpanded,
      toggleExpand: tree.toggleExpand,
    }
  }, [treeEnabled, indentSize, tree])

  // === S34 页面级粘性表头归一化 ===
  // 对外 `sticky?: boolean | StickyConfig`（对齐 antd v6）→ 引擎层统一为
  // `{ offsetHeader?, offsetScroll?, getContainer? } | undefined`。
  //   - undefined / false：不启用（engineSticky=undefined，零回归）。
  //   - true：启用（默认偏移 0；engineSticky={}，引擎读 offsetHeader/offsetScroll 时兜底 0）。
  //   - 对象：原样透传。
  const engineSticky = useMemo(() => {
    if (sticky === undefined || sticky === false) return undefined
    if (sticky === true) return {}
    return sticky
  }, [sticky])

  // === S11 分页集成 ===
  // ★ 默认不分页：pagination 为 undefined/false → 不启用分页，pagedDataSource = filteredDataSource（全显），
  //   保持 F1–M9/S1–S10 所有 demo 行为不变（零回归）。
  //   显式传 TablePaginationConfig 对象才启用分页：切片 + 渲染 antd Pagination。
  const paginationEnabled = pagination !== undefined && pagination !== false
  const paginationConfig = (pagination === undefined || pagination === false
    ? {}
    : pagination) as TablePaginationConfig

  const paginationInfo = usePagination({
    pagination: paginationConfig,
    // ★ S13：树形模式下分页基于扁平化后数据源长度（仅可见行）；非树形同 filteredDataSource。
    dataSourceLength: flattenedDataSource.length,
    onPaginationChange: (nextCurrent, nextPageSize) => {
      // 翻页/改 pageSize → 触发 Table onChange(action:'paginate')。
      // paginationState 用回调参数构造（antd Pagination 不会传越界 page，current 已 effective）。
      if (!onChange) return
      const total =
        typeof paginationConfig.total === 'number' && paginationConfig.total > 0
          ? paginationConfig.total
          : flattenedDataSource.length
      const nextState: TablePaginationState = {
        current: nextCurrent,
        pageSize: nextPageSize,
        total,
      }
      onChange(
        nextState,
        getFiltersArg(),
        currentSorterResult,
        // currentDataSource：分页**前**的全量数据源（与 antd 一致）。
        { currentDataSource: flattenedDataSource, action: 'paginate' },
      )
    },
  })

  // 同步 paginationStateRef（供 useSorter/useFilter 的 onChange 闭包注入最新分页）。
  // 分页未启用时构造"全量态"（current=1, pageSize=长度, total=长度），保证 onChange.pagination
  // 始终有意义（与 antd 未开分页时 onChange.pagination 仍含 {current,pageSize,total} 一致）。
  const effectivePaginationState: TablePaginationState = paginationEnabled
    ? paginationInfo.paginationState
    : { current: 1, pageSize: flattenedDataSource.length, total: flattenedDataSource.length }
  paginationStateRef.current = effectivePaginationState

  // 分页切片（未启用 → 全量）。
  // S12：传入 paginationInfo.total 用于服务端模式检测——dataSource.length < total（server/async）
  // 时不切片（对齐 antd InternalTable.tsx:547-557），避免双重分页。
  // ★ S13：基于 flattenedDataSource（树形扁平化后）切片；非树形同 filteredDataSource。
  const pagedDataSource = paginationEnabled
    ? slicePage(
        flattenedDataSource,
        paginationInfo.current,
        paginationInfo.pageSize,
        paginationInfo.total,
      )
    : flattenedDataSource

  // === S22 汇总 summary 解析 ===
  // summary prop：函数 → 用 pagedDataSource（当前页数据）调用；ReactNode → 原样。
  // ★ 与 title/footer 传 filteredDataSource（全量）不同：summary 传 **pagedDataSource**（当前页），
  //   对齐 antd summary 实际行为（antd summary 的 pageData 也是当前页数据，见 antd summary demo
  //   `summary={(pageData) => ...}` 注释）。未启用分页时 pagedDataSource = filteredDataSource（全量）。
  const summaryNode: ReactNode = useMemo(() => {
    if (summary === undefined || summary === null) return null
    if (typeof summary === 'function') {
      return (summary as (pageData: Array<RecordType>) => ReactNode)(pagedDataSource)
    }
    return summary
  }, [summary, pagedDataSource])

  // === S23 自定义空状态与 loading 占位 ===
  // 消费 antd ConfigContext.renderEmpty（全局空状态自定义）+ TableProps.locale.emptyText（Table 级）。
  //
  // emptyText 来源优先级（严格对齐 antd `InternalTable.tsx:706-718` 的 mergedEmptyNode）：
  //   1. `locale.emptyText`（Table 级，最高优先级——antd 同款门：typeof locale?.emptyText !== 'undefined' 即用）。
  //   2. `ConfigProvider.renderEmpty('Table')`（全局空状态）。
  //   3. 默认 antd `<Empty>`（无描述）。
  //
  // **表体 empty 不区分"空数据 vs 筛选无结果"**（对齐 antd InternalTable.tsx:714-717）：
  //   antd 表体 empty（RcTable emptyText）由 mergedEmptyNode 决定，来源固定为
  //   `locale.emptyText > renderEmpty('Table') > 默认`，**不区分** dataSource 为空 vs 筛选后无匹配。
  //   data-grid 同样如此：pagedDataSource 为空（含空数据与筛选无结果两种）时统一用上述优先级解析。
  //
  //   ★ 注意：antd 的 `'Table.filter'` 是**另一个**独立语义（见 FilterDropdown.tsx:395,410）——
  //   仅用于 **filter 下拉面板内部**当 `column.filters` 为空数组时的占位，**不是**表体筛选无结果。
  //   该语义在 data-grid 由 FilterDropdown 消费（见 engine/FilterDropdown.tsx），与本处表体 empty 无关。
  //
  // **loading 交互**（对齐 antd `InternalTable.tsx:711-713`）：当 loading spinning 且 dataSource
  //   为 null/undefined（这里 data-grid 的 dataSource 默认 [] 而非 null，故该 antd 边界不直接对应）时，
  //   antd 不显示 empty（只显示 loading）。data-grid 的 dataSource 恒为数组，故无需特殊处理 loading
  //   × empty 互斥（loading 由 Spin 遮罩覆盖 empty 区，视觉上 empty 被 loading 盖住，功能正确）。
  const { renderEmpty } = useContext(ConfigContext)

  const emptyText: ReactNode = useMemo(() => {
    // pagedDataSource 非空 → 不需要 empty（引擎渲染数据行）。
    if (pagedDataSource.length > 0) return null
    // 1. Table 级 locale.emptyText 优先（antd 同款门：typeof !== 'undefined'）。
    if (locale?.emptyText !== undefined) return locale.emptyText
    // 2. ConfigProvider.renderEmpty('Table')（表体 empty 统一用 'Table'，不区分空数据 vs 筛选无结果）。
    const rendered = (renderEmpty as RenderEmptyHandler | undefined)?.('Table')
    if (rendered !== undefined && rendered !== null && rendered !== false) return rendered
    // 3. 默认 antd Empty（无描述）。
    return <Empty />
  }, [pagedDataSource.length, locale?.emptyText, renderEmpty])

  // 解析 placement → top/bottom 对齐（未启用分页 → 两侧均 null，不渲染）。
  const placement = paginationEnabled
    ? resolvePlacement(paginationConfig.placement)
    : { top: null, bottom: null }
  // antd 行为：仅当 total > 0 且分页启用时渲染分页器。
  const showPagination = paginationEnabled && paginationInfo.total > 0
  // 分页器尺寸：pagination.size 优先；否则随 Table size（small/middle→'small'，其余 default/undefined）。
  // 传给 antd Pagination 时类型断言（antd Pagination size 接受 SizeType，这里只在 'small'/undefined 间取）。
  const paginationSize: 'small' | undefined =
    paginationConfig.size === 'small'
      ? 'small'
      : paginationConfig.size === 'default'
        ? undefined
        : size === 'small' || size === 'middle' || size === 'medium' || size === 'compact'
          ? 'small'
          : undefined

  // 构造单个分页器节点（对齐 antd InternalTable.renderPagination）。
  // S29：注入 semantic.pagination.root（外层 div className/style）+ pagination.item（透传到
  //   antd Pagination 的 className——近似语义：antd Pagination 无单项 item className 公共 API，
  //   data-grid 把 item className 合并到 Pagination 整体 className，item style 合并到 style）。
  const paginationRootClassName = classNamesResolved?.pagination?.root
  const paginationItemClassName = classNamesResolved?.pagination?.item
  const paginationRootStyle = stylesResolved?.pagination?.root
  const paginationItemStyle = stylesResolved?.pagination?.item
  const renderPaginationNode = (align: 'start' | 'center' | 'end') => (
    <div
      className={[
        'dg-pagination',
        `dg-pagination-${align}`,
        paginationRootClassName,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        // ★ 对齐（start/center/end）由 `dg-pagination-${align}` class 提供 justify-content
        // （见 table.css `.dg-pagination-start/center/end`，对齐 antd `.ant-table-pagination-*`）。
        // display:flex / flex-wrap / row-gap / margin / `> *` flex:none 均在 table.css
        // `.dg-pagination` 消费 `var(--ant-margin)`/`var(--ant-padding-xs)`（主题可驱动，
        // 对齐 antd `components/table/style/pagination.ts`）。
        ...(paginationRootStyle ?? null),
      }}
    >
      <Pagination
        current={paginationInfo.current}
        pageSize={paginationInfo.pageSize}
        total={paginationInfo.total}
        showSizeChanger={paginationConfig.showSizeChanger}
        pageSizeOptions={paginationConfig.pageSizeOptions}
        showTotal={paginationConfig.showTotal}
        hideOnSinglePage={paginationConfig.hideOnSinglePage}
        size={paginationSize}
        onChange={paginationInfo.onInternalChange}
        onShowSizeChange={paginationInfo.onInternalChange}
        className={[
          paginationConfig.className,
          paginationItemClassName,
        ]
          .filter(Boolean)
          .join(' ') || undefined}
        style={
          paginationItemStyle
            ? { ...(paginationConfig.style ?? null), ...paginationItemStyle }
            : paginationConfig.style
        }
      />
    </div>
  )
  const topPaginationNode =
    showPagination && placement.top ? renderPaginationNode(placement.top) : null
  const bottomPaginationNode =
    showPagination && placement.bottom
      ? renderPaginationNode(placement.bottom)
      : null

  // === S12 loading 态（决策 6：Spin 用 antd）===
  // 把 loading prop 归一化为 antd `<Spin>` 的 props（对齐 antd InternalTable.spinProps）：
  //   - boolean：{ spinning: <bool> }。
  //   - SpinProps 对象：原样透传（spinning 字段优先，与 antd `<Spin spinning={false} {...spinProps}>` 一致）。
  //   - **undefined（默认）：完全不包 Spin**（零 DOM 变化，保证现有 demo 回归不破）。
  // 用 Spin 包裹整个表格内容（topPagination / title / 表体 / footer / bottomPagination），
  // 与 antd InternalTable 的 Spin 包裹范围一致（antd 也是把 top/bottom pagination + table 全包在 Spin 内）。
  // ★ 零回归优化：loading 未传（undefined）时**不渲染 Spin 容器**，DOM 与原先完全一致——
  //   避免 antd Spin 的 `.ant-spin-nested-loading` 包裹层给现有无 loading 的 demo 引入额外 DOM
  //   （antd 自身所有 Table 都有这层，但 data-grid 为严格零回归，仅在显式启用 loading 时才引入）。
  const spinProps: SpinPropsInput | undefined = useMemo(() => {
    if (loading === undefined) return undefined
    if (typeof loading === 'boolean') return { spinning: loading }
    return loading
  }, [loading])

  // 表格内容（topPagination / title / 表体 / footer / bottomPagination）。
  // loading 启用时用 Spin 包裹；未启用时直接渲染（零 DOM 变化）。
  // S29：title/footer 注入 semantic.title / semantic.footer 的 className/style；
  //   GridTable 接收 engineSemantic（section/content/header/body 子集）。
  const titleClassName = classNamesResolved?.title
  const titleStyle = stylesResolved?.title
  const footerClassName = classNamesResolved?.footer
  const footerStyle = stylesResolved?.footer
  const tableContent = (
    <>
      {topPaginationNode}
      {title ? (
        <div
          className={['dg-title', titleClassName].filter(Boolean).join(' ')}
          style={titleStyle}
        >
          {title(flattenedDataSource)}
        </div>
      ) : null}
      <GridTable<RecordType>
        ref={engineRef as unknown as React.Ref<TableEngineHandle>}
        columnTree={columnTreeWithSortAndFilter}
        dataSource={pagedDataSource}
        rowKey={rowKeyResolved}
        rowHeight={rowHeight}
        headerHeight={headerHeight}
        showHeader={showHeader}
        scroll={scroll}
        virtual={virtual}
        resizable={resizable}
        resizableMinWidth={resizableMinWidth}
        resizableMaxWidth={resizableMaxWidth}
        expandState={engineExpandState}
        treeState={engineTreeState}
        tableLayout={derivedTableLayout}
        onSorterClick={onSorterClick}
        onFilterApply={setFilterValue}
        components={components}
        summary={summaryNode}
        emptyText={emptyText}
        semantic={engineSemantic}
        sticky={engineSticky}
        onHeaderRow={onHeaderRow}
        onRow={onRow}
        rowClassName={
          rowClassName === undefined
            ? undefined
            : typeof rowClassName === 'string'
              ? rowClassName
              : (record: RecordType, index: number) => rowClassName(record, index)
        }
        getPopupContainer={getPopupContainer}
        rowHoverable={rowHoverable}
        // ★ §11 C2 tree-data 种子 #3（共享）：行选中态判定 → 引擎加 dg-row-selected 类（CSS 消费
        //   --ant-table-row-selected-bg / row-selected-hover-bg）。仅 rowSelection 启用时提供
        //   （无选择 demo 零回归，避免每 cell 多一次回调）；record→key 用 canonical getRowKey（与引擎一致）。
        isRowSelected={
          rowSel
            ? (record: RecordType) => selection.isSelected(getRowKey(record, rowKeyResolved))
            : undefined
        }
      />
      {footer ? (
        <div
          className={['dg-footer', footerClassName].filter(Boolean).join(' ')}
          style={footerStyle}
        >
          {footer(flattenedDataSource)}
        </div>
      ) : null}
      {bottomPaginationNode}
    </>
  )

  return (
    <div className={wrapperClass} style={wrapperStyle} ref={rootRef}>
      {spinProps !== undefined ? (
        <Spin spinning={false} {...spinProps}>
          {tableContent}
        </Spin>
      ) : (
        tableContent
      )}
    </div>
  )
}

/**
 * 引擎对外暴露的句柄（仅 M4 scrollTo）。与 `engine/GridTable.tsx` 的 `GridTableHandle`
 * 结构一致（这里独立定义避免引擎类型外泄到对外 API 文档）。
 */
interface TableEngineHandle {
  scrollTo: (config: {
    index?: number
    scrollTop?: number
    offset?: number
    align?: 'start' | 'center' | 'end' | 'nearest'
  }) => void
}

export { getRowKey }
// S31 JSX 风格 API：命名导出 Column / ColumnGroup 组件（同时挂为 Table.Column / Table.ColumnGroup 静态属性）。
export { Column, ColumnGroup }
export type {
  TableProps,
  ColumnType,
  ColumnProps,
  ColumnGroupProps,
  SizeType,
  TableRef,
  TablePaginationConfig,
  TablePaginationPlacement,
  TablePaginationState,
} from './types'
