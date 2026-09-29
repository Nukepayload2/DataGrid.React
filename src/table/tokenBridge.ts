import { transformToken } from '@ant-design/cssinjs/es/util/css-variables'
import { FastColor } from '@ant-design/fast-color'

const antdTokenUnitless: Record<string, boolean> = {
  lineHeight: true,
  lineHeightSM: true,
  lineHeightLG: true,
  lineHeightHeading1: true,
  lineHeightHeading2: true,
  lineHeightHeading3: true,
  lineHeightHeading4: true,
  lineHeightHeading5: true,
  opacityLoading: true,
  fontWeightStrong: true,
  zIndexPopupBase: true,
  zIndexBase: true,
  opacityImage: true,
}

const antdTokenIgnore: Record<string, boolean> = {
  motionBase: true,
  motionUnit: true,
}

type AntdTableTokenInput = Record<string, unknown> & {
  colorFillAlter: string
  colorBgContainer: string
  colorTextHeading: string
  colorFillSecondary: string
  colorFillContent: string
  controlItemBgActive: string
  controlItemBgActiveHover: string
  padding: number
  paddingSM: number
  paddingXS: number
  colorBorderSecondary: string
  borderRadiusLG: number
  controlHeight: number
  colorTextPlaceholder: string
  fontSize: number
  fontSizeSM: number
  lineHeight: number
  lineWidth: number
  colorIcon: string
  colorIconHover: string
  opacityLoading: number
  controlInteractiveSize: number
}

/**
 * antd Table 组件 token 默认派生函数。
 *
 * 源自 `{{AntDesign}}/components/table/style/index.ts` 的
 * `prepareComponentToken`（antd 6.4.4），复制到本地以避免运行时依赖
 * `antd/es/table/style/index` 这类 internal API。只保留纯 token 派生逻辑，不引入
 * antd Table 样式注册、渲染或 rc-table/virtual-list。
 */
function prepareTableComponentToken(
  token: Record<string, unknown>,
): Record<string, unknown> {
  const {
    colorFillAlter,
    colorBgContainer,
    colorTextHeading,
    colorFillSecondary,
    colorFillContent,
    controlItemBgActive,
    controlItemBgActiveHover,
    padding,
    paddingSM,
    paddingXS,
    colorBorderSecondary,
    borderRadiusLG,
    controlHeight,
    colorTextPlaceholder,
    fontSize,
    fontSizeSM,
    lineHeight,
    lineWidth,
    colorIcon,
    colorIconHover,
    opacityLoading,
    controlInteractiveSize,
  } = token as AntdTableTokenInput

  const colorFillSecondarySolid = new FastColor(colorFillSecondary)
    .onBackground(colorBgContainer)
    .toHexString()
  const colorFillContentSolid = new FastColor(colorFillContent)
    .onBackground(colorBgContainer)
    .toHexString()
  const colorFillAlterSolid = new FastColor(colorFillAlter)
    .onBackground(colorBgContainer)
    .toHexString()

  const baseColorAction = new FastColor(colorIcon)
  const baseColorActionHover = new FastColor(colorIconHover)

  const expandIconHalfInner = controlInteractiveSize / 2 - lineWidth
  const expandIconSize = expandIconHalfInner * 2 + lineWidth * 3

  return {
    headerBg: colorFillAlterSolid,
    headerColor: colorTextHeading,
    headerSortActiveBg: colorFillSecondarySolid,
    headerSortHoverBg: colorFillContentSolid,
    bodySortBg: colorFillAlterSolid,
    rowHoverBg: colorFillAlterSolid,
    rowSelectedBg: controlItemBgActive,
    rowSelectedHoverBg: controlItemBgActiveHover,
    rowExpandedBg: colorFillAlter,
    cellPaddingBlock: padding,
    cellPaddingInline: padding,
    cellPaddingBlockMD: paddingSM,
    cellPaddingInlineMD: paddingXS,
    cellPaddingBlockSM: paddingXS,
    cellPaddingInlineSM: paddingXS,
    borderColor: colorBorderSecondary,
    headerBorderRadius: borderRadiusLG,
    footerBg: colorFillAlterSolid,
    footerColor: colorTextHeading,
    cellFontSize: fontSize,
    cellFontSizeMD: fontSize,
    cellFontSizeSM: fontSize,
    headerSplitColor: colorBorderSecondary,
    fixedHeaderSortActiveBg: colorFillSecondarySolid,
    headerFilterHoverBg: colorFillContent,
    filterDropdownMenuBg: colorBgContainer,
    filterDropdownBg: colorBgContainer,
    expandIconBg: colorBgContainer,
    selectionColumnWidth: controlHeight,
    stickyScrollBarBg: colorTextPlaceholder,
    stickyScrollBarBorderRadius: 100,
    expandIconMarginTop:
      (fontSize * lineHeight - lineWidth * 3) / 2 -
      Math.ceil((fontSizeSM * 1.4 - lineWidth * 3) / 2),
    headerIconColor: baseColorAction
      .clone()
      .setA(baseColorAction.a * opacityLoading)
      .toRgbString(),
    headerIconHoverColor: baseColorActionHover
      .clone()
      .setA(baseColorActionHover.a * opacityLoading)
      .toRgbString(),
    expandIconHalfInner,
    expandIconSize,
    expandIconScale: controlInteractiveSize / expandIconSize,
  }
}

export { antdTokenIgnore, antdTokenUnitless }

export function deriveTableComponentTokenDefaults(
  token: Record<string, unknown>,
): Record<string, unknown> {
  return prepareTableComponentToken(token)
}

/**
 * 主题注入辅助：parse antd transformToken 产出的 cssVarsStr 为 `--k:v` 字典。
 *
 * 直接调用 antd 真实工具（transformToken + useToken realToken），让 `.dg-wrapper` 拿到与
 * antd `.ant-table-wrapper` **同名同值的全套 `--ant-*`**（alias + Table component token）。
 * 详见 `docs/features/styling/theme-tokens.md` 的「注入路径」节。
 *
 * 注入路径（与 antd 同款，零猜测）：
 * 1. alias var：`transformToken(realToken, cssVar.key, { prefix, unitless, ignore, preserve })`
 *    —— 同 `useCacheToken` 内部调用（不含 hashCls/scope → cssVarsStr selector 为 `.${key}`）。
 *    产出 `--ant-color-primary:#1677ff;--ant-border-radius:6px;...` 全套 alias。
 * 2. Table component var：antd `genCSSVarRegister('Table', ...)` 内部两步：
 *    (a) prefixToken 重命名（`headerBg`→`TableHeaderBg`）→ 产出 `--ant-table-header-bg`（详见 `tableTokenToCssVars`）。
 *    (b) transformToken 转换，unitless 仅追加 Table 特有的 `expandIconScale`（antd table style genStyleHooks 声明）。
 *
 * transformToken 返回 `[tokenWithCssVar, cssVarsStr]`，cssVarsStr = `${selector}{--k1:v1;...}`，
 * 这里 parse 提取 `--k:v` 对。
 *
 * 单位：antd transformToken number→`${v}px`（unitless 白名单除外）。data-grid tokens.css fallback
 * 已对齐带 px 格式，table.css 消费者直接 `var(--ant-*)`。
 *
 * 跳过内部字段：realToken 含 `_tokenKey`（hash 字符串，useCacheToken 注入），非 token 字段，
 * 用 `^_` 前缀过滤（antd useCacheToken 调 transformToken 时用的是未含 _tokenKey 的 mergedDerivativeToken，
 * data-grid 用 realToken 故需手动过滤）。
 */
export function parseCssVarsString(cssVarsStr: string): Record<string, string> {
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
 * 跳过内部字段（`_` 开头，如 `_tokenKey`）；unitless / ignore / preserve 由调用方传入
 * （alias 用 antd 全集，Table 用 Table 子集）。
 */
export function tokenToCssVars(
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
export function tablePrefixToken(key: string): string {
  return `Table${key.slice(0, 1).toUpperCase()}${key.slice(1)}`
}

/**
 * 把 Table 组件 token 通过 antd 同款流程转为 `--ant-table-*`（+ 写回 alias 同名 var） CSS vars。
 * 完全复刻 antd `genCSSVarRegister('Table', ...)` 的 fn 回调
 * （cssinjs-utils/es/util/genStyleUtils.js）。详见 `docs/features/styling/theme-tokens.md`。
 *
 * 1. defaultToken = prepareComponentToken(merge(realToken, realToken.Table))
 *    （= antd `getDefaultComponentToken`：从 alias 派生 Table 组件 token 默认值 headerBg/rowHoverBg/
 *    headerSortActiveBg/expandIconScale/... 等 30+ 条）。
 *
 * 2. componentToken = getComponentToken(realToken, defaultToken)：合并默认 + 用户覆盖 + 删 alias 同值键
 *    （antd 为最小化输出剔除这类键；用户覆盖 alias 同名 token 为同值时也会被剔除）。
 *
 * 3. prefixToken 重命名：仅遍历 `Object.keys(defaultToken)`（注意是 defaultToken，非 mergedToken）。
 *    **写回规则核心**：只重命名"在 defaultToken 中出现"的 key。用户单独覆盖的 alias 同名 token
 *    （不在 prepareComponentToken 默认输出，如 `colorBgContainer`）**不加前缀**，保持原 key
 *    → transformToken 产出 `--ant-color-bg-container`（与 alias 同名，在 dg-wrapper 作用域覆盖 alias 默认）。
 *    这是 antd 把 Table 组件 token 的 `colorBgContainer` 写回 alias var 的真实机制
 *    （不是新增 `--ant-table-color-bg-container`）。
 *
 * 4. transformToken（prefix='ant', key='css-var-root', unitless={TableExpandIconScale:true}）：
 *    把重命名 + 未重命名的混合 token 一次性转换。unitless 仅 Table 特有的 `expandIconScale`
 *    （已重命名为 TableExpandIconScale）；alias unitless 字段（lineHeight/fontSize/...）在 Table 组件 token
 *    中无对应键，无需追加。
 *
 * 输入：完整 `realToken`（含 `.Table` 子对象）+ cssVar。输出：`--k:v` 字典（含 `--ant-table-*` 与
 * 写回的 `--ant-color-bg-container` 等 alias 同名 var）。
 */
export function tableTokenToCssVars(
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
  const vars = parseCssVarsString(cssVarsStr)

  // antd Table 在 genStyle 里额外派生了虚拟/粘性滚动条内部 token：
  // tableScrollThumbBg、tableScrollThumbBgHover、tableScrollBg、tableScrollThumbSize。
  // 它们不是 prepareComponentToken 的公开 component token，transformToken 不会自动产出
  // `--ant-table-scroll-*`，但 data-grid 的自研悬浮条需要消费同一套配色语义。
  const cssPrefix = `--${cssVar.prefix}`
  const tableScrollThumbBg = ({ ...defaultToken, ...userOverride }).stickyScrollBarBg
  const tableScrollThumbBgHover = realToken.colorTextHeading
  const tableScrollBg = realToken.colorSplit
  if (tableScrollThumbBg !== undefined) {
    vars[`${cssPrefix}-table-scroll-thumb-bg`] = String(tableScrollThumbBg)
  }
  if (tableScrollThumbBgHover !== undefined) {
    vars[`${cssPrefix}-table-scroll-thumb-bg-hover`] = String(tableScrollThumbBgHover)
  }
  if (tableScrollBg !== undefined) {
    vars[`${cssPrefix}-table-scroll-bg`] = String(tableScrollBg)
  }
  vars[`${cssPrefix}-table-scroll-thumb-size`] = '8px'

  return vars
}
