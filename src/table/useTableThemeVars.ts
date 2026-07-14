/**
 * 主题 token → CSS vars 编排 + wrapperStyle 合并 hook。
 *
 * 集中 data-grid 对 antd 主题 token 读取的依赖：
 * 把 `Table.tsx` 原内联的主题注入编排骨架抽到本 hook，调用方只需提供 `style` /
 * `stylesResolved` 即可拿到合并后的根容器 inline style。
 *
 * 注入路径（与 antd 同款，零猜测；纯字节级搬运，逻辑未变）：
 * 1. `useAntdInternalToken()` 拿 6 元组 → 取 `realToken`（index 1，未 var 化原值）+
 *    `cssVar`（index 4，`{ prefix:'ant', key:'css-var-root' }`）。
 * 2. `aliasTokenVars = tokenToCssVars(realToken, cssVar, { unitless, ignore, preserve })`
 *    —— alias 全套 `--ant-color-*` / `--ant-border-radius` / ...（与 antd useCacheToken 同款）。
 * 3. `tableTokenVars = tableTokenToCssVars(realToken, cssVar)`
 *    —— Table component token（`--ant-table-*` + 写回 alias 同名 var 如 `--ant-color-bg-container`），
 *    复刻 antd `genCSSVarRegister('Table', ...)` 的 fn 回调。
 * 4. `wrapperStyle` 合并：`{...aliasTokenVars, ...tableTokenVars}` 为基底，
 *    再 `Object.assign(merged, style, stylesResolved.root)`（用户 style + 语义 root style 后置覆盖）。
 *
 * 行为零差异（先移动不重写）：从 `Table.tsx` L909-998 字节级搬位置，逻辑保持。
 */

import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { theme } from 'antd'
import {
  antdTokenIgnore,
  antdTokenUnitless,
  tableTokenToCssVars,
  tokenToCssVars,
} from './tokenBridge'
import type { TableSemanticStyles } from './types'

/**
 * 计算主题 token CSS vars 并合并出根容器 inline style。
 *
 * @param style              `TableProps.style`（用户传入的根容器自定义 style）
 * @param stylesResolved     `useSemanticClassNames` 求值后的语义化 styles（取 `.root`）
 * @returns `{ aliasTokenVars, tableTokenVars, wrapperStyle }`
 *          - `aliasTokenVars`：alias 全套 `--ant-*` CSS vars（realToken 为 undefined 时为 `{}`）
 *          - `tableTokenVars`：Table component token CSS vars（同上）
 *          - `wrapperStyle`：合并后的根容器 inline style（可直接挂到 `.dg-wrapper`）
 */
export function useTableThemeVars(
  style: CSSProperties | undefined,
  stylesResolved: TableSemanticStyles | undefined,
): {
  aliasTokenVars: Record<string, string>
  tableTokenVars: Record<string, string>
  wrapperStyle: CSSProperties
} {
  // 主题注入：用 antd 公开 `theme.useToken()` 拿 realToken
  //   （未 var 化的原值，与 antd transformToken 输入一致），喂 antd 真实 `transformToken`
  //   产出与 .ant-table-wrapper 同名同值的全套 `--ant-*`。详见 `docs/design-notes/theme-tokens.md`。
  //
  // 公开 `theme.useToken()` 返回对象的 `token` 可直接喂 transformToken。
  // cssVar 默认沿用 `{ prefix:'ant', key:'css-var-root' }`。
  //
  // token.Table 仅含**用户在 ConfigProvider theme.components.Table 显式声明的覆盖项**
  //   （不含 prepareComponentToken 派生的默认值——antd 是在 genCSSVarRegister 的 fn 回调里
  //   通过 getDefaultComponentToken + getComponentToken 在渲染时单独合并 + 删除与 alias 同值键）。
  //   data-grid 在注入时（tableTokenToCssVars）复刻此合并流程：prepareComponentToken 默认 + 用户覆盖。
  //
  // useMemo 依赖 real token 引用：theme.useToken() 在 theme/override 变化时更新（新对象）
  //   → useMemo 重算 vars → 视觉同步。
  const { token: realToken } = theme.useToken()
  const cssVar = { prefix: 'ant', key: 'css-var-root' }
  const tokenRecord = realToken as unknown as Record<string, unknown> | undefined

  // alias var：transformToken(realToken, ...)，与 useCacheToken 内部同款调用。
  //   unitless/ignore/preserve 直接复用 antd 源文件导出的全集（不自己枚举，防猜测）。
  const aliasTokenVars = useMemo(
    () =>
      tokenRecord
        ? tokenToCssVars(tokenRecord, cssVar, {
            unitless: antdTokenUnitless,
            ignore: antdTokenIgnore,
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
    [tokenRecord, cssVar],
  )

  // Table component var：完全复刻 antd genCSSVarRegister fn 回调（详见 tableTokenToCssVars 注释）。
  //   传入完整 realToken（含 .Table 子对象），内部调 prepareComponentToken 派生默认 + 合并用户覆盖
  //   + 删 alias 同值键 + prefixToken 重命名（仅 defaultToken 的 key）→ 产出 --ant-table-*（默认派生）
  //   与写回 alias 同名的 --ant-* （如 colorBgContainer）混合 CSS vars。
  //   realToken 为 undefined（首次渲染前）时输出空对象（零回归）。
  const tableTokenVars = useMemo(
    () =>
      tokenRecord
        ? tableTokenToCssVars(tokenRecord, cssVar)
        : {},
    [tokenRecord, cssVar],
  )

  // 语义化 root 部位 style（合并到根容器 style；semantic 覆盖同名字段）。
  // 主题注入：aliasTokenVars（基础 alias token）+ tableTokenVars（Table component token）合并到根容器
  //   style；优先级：style（用户传入） > stylesResolved.root（语义 root style）
  //   > tableTokenVars（Table component token）> aliasTokenVars（基础 alias token）
  //   > tokens.css fallback。
  //
  //   合并顺序 `{...aliasTokenVars, ...tableTokenVars}`：tableTokenVars 覆盖 aliasTokenVars 同名字段。
  //   实际几乎不重名：alias 用 `--ant-color-*`/`--ant-border-radius` 等直名（`token2CSSVar('colorPrimary','ant')`
  //   = `--ant-color-primary`），Table 用 `--ant-table-*`（prefixToken 加 `Table` 前缀后再 token2CSSVar：
  //   `token2CSSVar('TableHeaderBg','ant')` = `--ant-table-header-bg`）。
  //
  //   colorBgContainer 写回机制：用户覆 `Table.colorBgContainer` 时，tableTokenVars 直接产出
  //   `--ant-color-bg-container`（写回 alias 同名 var，非新增 `--ant-table-color-bg-container`）——
  //   与 antd DOM 一致。aliasTokenVars 也产出 `--ant-color-bg-container`（alias 默认 #ffffff），
  //   但 tableTokenVars 在合并中后置覆盖之（`{...aliasTokenVars, ...tableTokenVars}`），最终
  //   .dg-wrapper 的 `--ant-color-bg-container` = 用户值（如 component-token demo 的 #e6f4ff）。
  //   data-grid 表体底色消费此 var（tokens.css）。
  //
  //   CSS variable 由 inline style 提供优先级高于 class（tokens.css fallback）。用户 style 与 token
  //   vars 的 key 空间不同（用户用标准 CSS 属性，token vars 用 `--ant-*`），实际不冲突。
  const wrapperStyle = useMemo(() => {
    const merged: CSSProperties = { ...aliasTokenVars, ...tableTokenVars }
    if (stylesResolved?.root) {
      Object.assign(merged, style, stylesResolved.root)
    } else if (style) {
      Object.assign(merged, style)
    }
    return merged
  }, [style, stylesResolved?.root, tableTokenVars, aliasTokenVars])

  return { aliasTokenVars, tableTokenVars, wrapperStyle }
}
