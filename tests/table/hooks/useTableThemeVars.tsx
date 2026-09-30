import { describe, expect, it, vi } from 'vitest'
import { render, renderHook } from '@testing-library/react'
import type { CSSProperties, ReactNode } from 'react'
import { ConfigProvider, theme } from 'antd'
import { useTableThemeVars } from '../../../src/table/useTableThemeVars'
import * as tokenBridge from '../../../src/table/tokenBridge'
import type { TableSemanticStyles } from '../../../src/table/types'

// 仪表（spy）：把 tokenBridge 的两个转换函数包成 vi.fn，委托真实实现（行为零差异），
// 以便「memo 引用稳定性」块直接数「转换函数被调用几次」——这才是「token 不变 ⇒ 不重算」
// 的**直接判据**（见块内注释）。产品码 `./tokenBridge` 与本处 `../../../src/table/tokenBridge`
// 解析到同一 module id，vi.mock 对二者同时生效。
vi.mock('../../../src/table/tokenBridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/table/tokenBridge')>()
  return {
    ...actual,
    tokenToCssVars: vi.fn(actual.tokenToCssVars),
    tableTokenToCssVars: vi.fn(actual.tableTokenToCssVars),
  }
})

type Spy = ReturnType<typeof vi.fn>
function aliasSpy(): Spy {
  return tokenBridge.tokenToCssVars as unknown as Spy
}
function tableSpy(): Spy {
  return tokenBridge.tableTokenToCssVars as unknown as Spy
}

// 用 antd ConfigProvider 包裹，确保 useAntdInternalToken 能拿到真实主题上下文。
// 测试聚焦：① antd 默认主题 → aliasTokenVars/tableTokenVars 结构契约（含 --ant-* 前缀）
//          ② wrapperStyle 合并优先级（本 hook 自己的逻辑）
//          ③ 两个 token useMemo 的引用稳定性（见文末「memo 引用稳定性」块）。
// 注：本文件旧注释曾断言「jsdom 下 realToken 不响应 ConfigProvider theme.token 覆盖，故 theme 覆盖
//   断言不在范围」——该说法已被文末「反向保护」用例实测证伪（`theme.token.colorPrimary` 覆盖会体现在
//   `aliasTokenVars['--ant-color-primary']`），故 theme 反应性现已纳入直测。
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
  // 判据选型（为何**不**用「产物同引用」）：
  //   `useMemo` 的输出引用相等**不是**「本轮没重算」的可靠代理——React 19 明确把 `useMemo` 当性能
  //   提示，允许**按槽位、非确定地丢弃**某个 memo 缓存并重跑其 factory，即便 deps 逐槽 Object.is 相等。
  //   旧钉正是栽在这条上：全量并行下 `tableTokenVars` memo 被丢弃重算（新引用）而 `aliasTokenVars`
  //   memo 恰好被保留（同引用），deps 两边都稳定 ⇒ 出现「alias 绿 / table 红」这一自相矛盾的读数。
  //   另注：`tokenToCssVars` / `tableTokenToCssVars` 均**无内部缓存**（每次都现造新对象），所以旧钉里
  //   alias 侧的「引用相等」只有在 React 真的保留了那条 memo 时才成立——是**假稳定**，非语义保证。
  // 新判据（直接、确定）：用 spy 数两个转换函数在「token 不变的重渲染」里**被调用了几次**。
  //   「token 不变 ⇒ 不重算」 ⇔ 两个转换函数调用计数零增长。这直接测计算次数而非 React 的缓存策略。
  // 仪表自证：先亲读 `theme.useToken().token` 首轮与末轮同一引用（下述 tokenRefs），排除
  //   「压根没发生重渲染」导致恒绿。
  describe('memo 引用稳定性 —— token 不变的重渲染不得重算 vars', () => {
    type ProbeProps = {
      style: CSSProperties | undefined
      stylesResolved: TableSemanticStyles | undefined
    }
    type ProbeResult = ReturnType<typeof useTableThemeVars>

    // `renderHook` 的泛型次序是 `<Result, Props>`（@testing-library/react types/index.d.ts:263-272），
    // **Result 在前、Props 在后**。本文件两处曾写成 `<ProbeProps, ProbeResult>`（次序颠倒），
    // 于是回调被按「入参是 hook 返回值、返回 ProbeProps」检查，`props.style` / `result.current.wrapperStyle`
    // 逐条报不存在。此处仅调换类型实参次序（类型实参编译后被擦除，运行期零影响）。
    it('同 props + 同 realToken 引用重渲染 → 两个 token 转换函数零调用增长（含 token 引用自证）', () => {
      const aSpy = aliasSpy()
      const tSpy = tableSpy()
      const tokenRefs: unknown[] = []
      const { rerender } = renderHook<ProbeResult, ProbeProps>(
        (props) => {
          tokenRefs.push(theme.useToken().token)
          return useTableThemeVars(props.style, props.stylesResolved)
        },
        {
          initialProps: { style: undefined, stylesResolved: undefined },
          wrapper: ({ children }: { children: ReactNode }) => <>{withConfig(children)}</>,
        },
      )

      // 首轮挂载已各调用一次，记下基线。
      const aliasBefore = aSpy.mock.calls.length
      const tableBefore = tSpy.mock.calls.length

      rerender({ style: undefined, stylesResolved: undefined })

      // 仪表前提：末轮渲染拿到的 realToken 与首轮同一引用 ⇒ 「token 未变」成立（比较首轮↔末轮，
      //   覆盖真正的重渲染，而非 StrictMode 双渲染的相邻两次）。
      expect(tokenRefs.length).toBeGreaterThanOrEqual(2)
      expect(tokenRefs[tokenRefs.length - 1]).toBe(tokenRefs[0])

      // 核心断言：token 未变 ⇒ 两个 memo 都不该重算 ⇒ 两个转换函数都不该被再次调用。
      expect(aSpy.mock.calls.length).toBe(aliasBefore)
      expect(tSpy.mock.calls.length).toBe(tableBefore)
    })

    it('仅 style 变化 → 两个 token 转换函数零调用增长，只有 wrapperStyle 重算', () => {
      const aSpy = aliasSpy()
      const tSpy = tableSpy()
      const { result, rerender } = renderHook<ProbeResult, ProbeProps>(
        (props) => useTableThemeVars(props.style, props.stylesResolved),
        {
          initialProps: { style: { margin: 1 }, stylesResolved: undefined },
          wrapper: ({ children }: { children: ReactNode }) => <>{withConfig(children)}</>,
        },
      )
      const aliasBefore = aSpy.mock.calls.length
      const tableBefore = tSpy.mock.calls.length
      const firstWrapper = result.current.wrapperStyle

      rerender({ style: { margin: 2 }, stylesResolved: undefined })

      // 与 token 无关的入参变化，不得波及两个 token memo（转换函数零新增调用）。
      expect(aSpy.mock.calls.length).toBe(aliasBefore)
      expect(tSpy.mock.calls.length).toBe(tableBefore)
      // 但 wrapperStyle 必须随之重算（否则过度 memo 化）。此处断言「变了」是安全方向：
      //   deps 变化时 factory 必重算，React 只会保留旧缓存成 bug，不会反向误报。
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
