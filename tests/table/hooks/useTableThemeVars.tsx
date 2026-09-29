import { describe, expect, it } from 'vitest'
import { render, renderHook } from '@testing-library/react'
import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { ConfigProvider, theme } from 'antd'
import { useTableThemeVars } from '../../../src/table/useTableThemeVars'
import type { TableSemanticStyles } from '../../../src/table/types'

// 用 antd ConfigProvider 包裹，确保 useAntdInternalToken 能拿到真实主题上下文。
// 测试聚焦：① antd 默认主题 → aliasTokenVars/tableTokenVars 结构契约（含 --ant-* 前缀）
//          ② wrapperStyle 合并优先级（本 hook 自己的逻辑）。
// antd 内部 useToken realToken 在 jsdom 测试环境下不响应 ConfigProvider theme.token 覆盖
// （antd 缓存机制 + 缺 StyleProvider），故 theme 覆盖断言不在本测试范围（零行为回归）。
function withConfig(children: ReactNode): ReactNode {
  return <ConfigProvider>{children}</ConfigProvider>
}

describe('useTableThemeVars', () => {
  describe('aliasTokenVars —— alias 全套 --ant-* CSS vars', () => {
    it('默认主题产出 --ant-color-primary 等关键 alias var', () => {
      const { result } = renderHook(() => useTableThemeVars(undefined, undefined), {
        wrapper: ({ children }) => <>{withConfig(children)}</>,
      })
      const { aliasTokenVars } = result.current
      // antd 默认主题 colorPrimary = #1677ff（antd v5 token seed 默认值）。
      expect(aliasTokenVars['--ant-color-primary']).toBe('#1677ff')
      // 关键 alias 字段存在。
      expect('--ant-color-bg-container' in aliasTokenVars).toBe(true)
      expect('--ant-border-radius' in aliasTokenVars).toBe(true)
      // alias 默认 colorBgContainer = #ffffff。
      expect(aliasTokenVars['--ant-color-bg-container']).toBe('#ffffff')
    })

    it('aliasTokenVars 含 antd preset 颜色全集（--ant-blue/--ant-red/...）', () => {
      const { result } = renderHook(() => useTableThemeVars(undefined, undefined), {
        wrapper: ({ children }) => <>{withConfig(children)}</>,
      })
      const { aliasTokenVars } = result.current
      // antd 默认主题注入全套 preset 色（colorPresetList 13+ 条）。
      expect('--ant-blue' in aliasTokenVars).toBe(true)
      expect('--ant-red' in aliasTokenVars).toBe(true)
      expect('--ant-purple' in aliasTokenVars).toBe(true)
    })

    it('aliasTokenVars 值非 var() 自引用（realToken 为未 var 化原值）', () => {
      const { result } = renderHook(() => useTableThemeVars(undefined, undefined), {
        wrapper: ({ children }) => <>{withConfig(children)}</>,
      })
      const { aliasTokenVars } = result.current
      // realToken（index 1）= 未 var 化原值 → 产出值是直接颜色/数值，非 'var(--ant-...)'。
      expect(aliasTokenVars['--ant-color-primary'].startsWith('var(')).toBe(false)
    })
  })

  describe('tableTokenVars —— Table component token CSS vars', () => {
    it('产出 --ant-table-* 前缀 var（prepareComponentToken 派生 30+ 默认值）', () => {
      const { result } = renderHook(() => useTableThemeVars(undefined, undefined), {
        wrapper: ({ children }) => <>{withConfig(children)}</>,
      })
      const { tableTokenVars } = result.current
      // antd Table prepareComponentToken 默认派生 headerBg / headerColor / rowHoverBg /
      // cellPaddingBlock / expandIconScale 等 37 条（默认主题无用户覆盖 → 全部加 Table 前缀）。
      const tableKeys = Object.keys(tableTokenVars).filter((k) =>
        k.startsWith('--ant-table-'),
      )
      expect(tableKeys.length).toBeGreaterThan(10)
      // 关键 Table 组件 token 字段存在。
      expect('--ant-table-header-bg' in tableTokenVars).toBe(true)
      expect('--ant-table-row-hover-bg' in tableTokenVars).toBe(true)
      expect('--ant-table-cell-padding-block' in tableTokenVars).toBe(true)
      expect('--ant-table-expand-icon-scale' in tableTokenVars).toBe(true)
    })

    it('tableTokenVars 默认主题下全部为 --ant-table-* 前缀（无 alias 写回键）', () => {
      const { result } = renderHook(() => useTableThemeVars(undefined, undefined), {
        wrapper: ({ children }) => <>{withConfig(children)}</>,
      })
      const { tableTokenVars } = result.current
      // 默认主题无用户覆盖：prepareComponentToken 派生的所有 key 都被 prefixToken 加 Table 前缀，
      // 故 tableTokenVars 不应出现 alias 同名 var（如 --ant-color-bg-container）。
      const nonTableKeys = Object.keys(tableTokenVars).filter(
        (k) => !k.startsWith('--ant-table-'),
      )
      expect(nonTableKeys).toEqual([])
    })
  })

  describe('wrapperStyle —— 合并优先级（本 hook 自有逻辑）', () => {
    it('style=undefined + stylesResolved=undefined → wrapperStyle 仅含 token vars', () => {
      const { result } = renderHook(() => useTableThemeVars(undefined, undefined), {
        wrapper: ({ children }) => <>{withConfig(children)}</>,
      })
      const merged = result.current.wrapperStyle as Record<string, unknown>
      // 含 token vars。
      expect(merged['--ant-color-primary']).toBe('#1677ff')
      expect(merged['--ant-table-header-bg']).toBeDefined()
      // 不含任何标准 CSS 属性（未提供 style/stylesResolved.root）。
      expect(merged.color).toBeUndefined()
      expect(merged.background).toBeUndefined()
      expect(merged.margin).toBeUndefined()
    })

    it('自定义 style 被合并进 wrapperStyle（与 token vars 共存，key 空间不冲突）', () => {
      const { result } = renderHook(
        () => useTableThemeVars({ margin: 8, color: 'red' }, undefined),
        { wrapper: ({ children }) => <>{withConfig(children)}</> },
      )
      const merged = result.current.wrapperStyle as Record<string, unknown>
      // 标准 CSS 属性被合并。
      expect(merged.margin).toBe(8)
      expect(merged.color).toBe('red')
      // token vars 仍存在（key 空间不同，不冲突）。
      expect(merged['--ant-color-primary']).toBe('#1677ff')
      expect(merged['--ant-table-header-bg']).toBeDefined()
    })

    it('stylesResolved.root 被合并（后置覆盖 style 同名字段）', () => {
      const stylesResolved: TableSemanticStyles = {
        root: { padding: 16, color: 'green' },
      }
      const { result } = renderHook(
        () => useTableThemeVars({ padding: 4, margin: 8 }, stylesResolved),
        { wrapper: ({ children }) => <>{withConfig(children)}</> },
      )
      const merged = result.current.wrapperStyle as Record<string, unknown>
      // Object.assign(merged, style, stylesResolved.root)：root 覆盖 style 同名字段 padding。
      expect(merged.padding).toBe(16)
      // style 独有字段保留。
      expect(merged.margin).toBe(8)
      // stylesResolved.root 独有字段 color（style 无此字段时直接写入；root.color='green' 生效）。
      expect(merged.color).toBe('green')
      // token vars 仍存在。
      expect(merged['--ant-color-primary']).toBe('#1677ff')
    })

    it('style 存在但 stylesResolved 为 undefined → 仅合并 style（不走 root 分支）', () => {
      const { result } = renderHook(
        () => useTableThemeVars({ margin: 4 }, undefined),
        { wrapper: ({ children }) => <>{withConfig(children)}</> },
      )
      const merged = result.current.wrapperStyle as Record<string, unknown>
      expect(merged.margin).toBe(4)
    })

    it('stylesResolved 存在但 .root 为 undefined → 仅合并 style（不引用 root）', () => {
      const stylesResolved: TableSemanticStyles = { section: { padding: 1 } }
      const { result } = renderHook(
        () => useTableThemeVars({ margin: 12 }, stylesResolved),
        { wrapper: ({ children }) => <>{withConfig(children)}</> },
      )
      const merged = result.current.wrapperStyle as Record<string, unknown>
      expect(merged.margin).toBe(12)
    })
  })

  // ── memo 引用稳定性（缺陷 A-2 钉子）──────────────────────────────────────────
  // 被钉语义：`aliasTokenVars` / `tableTokenVars` 两个 useMemo 只在**真实输入变化**时才重算。
  //   二者的真实输入只有 `theme.useToken()` 的 realToken 引用（`cssVar` 是与 ConfigProvider 无关的
  //   固定配置常量）。旧实现把 `cssVar` 写成 hook 体内对象字面量并塞进 deps ⇒ 每轮 `===` 必失败
  //   ⇒ 每轮全量重算（全套 alias 转换 + `prepareComponentToken` 派生），memo 静默失效。
  // 为什么「产物同引用」是直接判据而不是代理指标：
  //   `tokenToCssVars` / `tableTokenToCssVars` 每次调用都现造并返回新对象（无内部缓存），
  //   故「引用相同」⇔「本轮 memo 回调没有执行」⇔「被钉的缺陷不在」。
  // 仪表自证：先亲读 `theme.useToken().token` 的引用确实没换（下述 tokenRefs），否则「产物同引用」
  //   会因为「压根没发生重渲染」而恒绿，什么也测不到。
  describe('memo 引用稳定性 —— token 不变的重渲染不得重算 vars', () => {
    type ProbeProps = {
      style: CSSProperties | undefined
      stylesResolved: TableSemanticStyles | undefined
    }
    type ProbeResult = ReturnType<typeof useTableThemeVars>

    it('同 props + 同 realToken 引用重渲染 → 三个产物引用全等（含 token 引用自证）', () => {
      const tokenRefs: unknown[] = []
      const { result, rerender } = renderHook<ProbeProps, ProbeResult>(
        (props) => {
          tokenRefs.push(theme.useToken().token)
          return useTableThemeVars(props.style, props.stylesResolved)
        },
        {
          initialProps: { style: undefined, stylesResolved: undefined },
          wrapper: ({ children }: { children: ReactNode }) => <>{withConfig(children)}</>,
        },
      )

      const firstAlias = result.current.aliasTokenVars
      const firstTable = result.current.tableTokenVars
      const firstWrapper = result.current.wrapperStyle

      rerender({ style: undefined, stylesResolved: undefined })

      // 仪表前提：本轮渲染拿到的 realToken 与首轮是同一引用 ⇒ 「token 未变」成立。
      expect(tokenRefs.length).toBeGreaterThanOrEqual(2)
      expect(tokenRefs[1]).toBe(tokenRefs[0])

      // 核心断言：token 未变 ⇒ memo 不该重算 ⇒ 产物同引用。
      expect(result.current.aliasTokenVars).toBe(firstAlias)
      expect(result.current.tableTokenVars).toBe(firstTable)
      expect(result.current.wrapperStyle).toBe(firstWrapper)
    })

    it('仅 style 变化 → token memo 不跟着失效，只有 wrapperStyle 重算', () => {
      const { result, rerender } = renderHook<ProbeProps, ProbeResult>(
        (props) => useTableThemeVars(props.style, props.stylesResolved),
        {
          initialProps: { style: { margin: 1 }, stylesResolved: undefined },
          wrapper: ({ children }: { children: ReactNode }) => <>{withConfig(children)}</>,
        },
      )
      const firstAlias = result.current.aliasTokenVars
      const firstTable = result.current.tableTokenVars
      const firstWrapper = result.current.wrapperStyle

      rerender({ style: { margin: 2 }, stylesResolved: undefined })

      // 与 token 无关的入参变化，不得波及两个 token memo。
      expect(result.current.aliasTokenVars).toBe(firstAlias)
      expect(result.current.tableTokenVars).toBe(firstTable)
      // 但 wrapperStyle 必须随之更新（否则就是过度 memo 化）。
      expect(result.current.wrapperStyle).not.toBe(firstWrapper)
      expect((result.current.wrapperStyle as Record<string, unknown>).margin).toBe(2)
    })

    it('反向保护：换 ConfigProvider theme 覆盖 → var 值跟上新 token', () => {
      // 修「memo 每轮全量重算」时最容易顺手修成「memo 永不重算」——这条钉住后者。
      // 与首轮比较的是**值**（不是引用）：theme 变了就必须看到新值。
      const seen: Array<Record<string, string>> = []
      function Probe() {
        seen.push(useTableThemeVars(undefined, undefined).aliasTokenVars)
        return null
      }
      const { rerender } = render(
        <ConfigProvider theme={{ token: { colorPrimary: '#ff0000' } }}>
          <Probe />
        </ConfigProvider>,
      )
      rerender(
        <ConfigProvider theme={{ token: { colorPrimary: '#00ff00' } }}>
          <Probe />
        </ConfigProvider>,
      )

      expect(seen[0]?.['--ant-color-primary']).toBe('#ff0000')
      expect(seen[1]?.['--ant-color-primary']).toBe('#00ff00')
      expect(seen[1]).not.toBe(seen[0])
    })
  })
})
