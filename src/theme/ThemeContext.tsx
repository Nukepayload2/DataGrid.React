/**
 * 全局主题上下文（任务 T16）。
 *
 * === 背景 / Bug 根因 ===
 *
 * 旧 `src\demos\theme-editor.tsx` 把写死的 light 绝对值（headerBg #fafafa 等）塞进
 * useState，**全 token 都传** ConfigProvider components.Table/token → antd 当用户
 * override → dark algorithm 派生被覆盖 → dark 下表头仍 #fafafa（应派生为 #1d1d1d）。
 *
 * === ★ 核心修复语义（必守）===
 *
 * **edited = key 在 overrides 对象里；未编辑的 key 绝不进 theme.token / components.Table**
 * → 让 antd algorithm + prepareComponentToken 派生 → dark 下自动变暗。只有用户显式
 * 编辑过的 token 才作为 override 传入 ConfigProvider。
 *
 * 此 context 是单一真理源：顶栏 dark/light 切换 + 编辑/未编辑 token override 集合。
 * ThemeProvider 内部持有 state，并直接包 `<ConfigProvider theme={...}>`，把 store 值
 * 同时喂给 ConfigProvider（驱动 antd cssinjs + data-grid Table.tsx realToken 重算）
 * 与 context（供顶栏 / theme-editor / 任意 demo 读写）。
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ConfigProvider, theme } from 'antd'

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

/** 主题模式（顶栏全局切换）。 */
export type ThemeMode = 'light' | 'dark'

/**
 * 全局 token override（theme.token 字段子集）。
 * **仅含已编辑键**——未编辑键不出现于此对象 → 不进 ConfigProvider → 由 algorithm 派生。
 */
export interface GlobalOverrides {
  colorPrimary?: string
  borderRadius?: number
  fontSize?: number
  colorBgContainer?: string
}

/**
 * Table 组件 token override（theme.components.Table 字段子集）。
 * **仅含已编辑键**。
 */
export interface TableOverrides {
  headerBg?: string
  headerColor?: string
  headerSplitColor?: string
  rowHoverBg?: string
  rowSelectedBg?: string
  rowSelectedHoverBg?: string
  borderColor?: string
  cellPaddingBlock?: number
  cellPaddingInline?: number
  headerBorderRadius?: number
}

/** 全局 token 可编辑键联合。 */
export type GlobalTokenKey = keyof GlobalOverrides

/** Table 组件 token 可编辑键联合。 */
export type TableTokenKey = keyof TableOverrides

/**
 * useTheme 暴露的 API。
 * 写入即标记 edited（key 进 overrides 对象）；reset 删除 key 即取消 edited。
 */
export interface ThemeContextValue {
  /** 当前主题模式。 */
  themeMode: ThemeMode
  /** 全局 token override（仅 edited 键）。 */
  globalOverrides: GlobalOverrides
  /** Table 组件 token override（仅 edited 键）。 */
  tableOverrides: TableOverrides
  /** 任一 overrides 非空（用于「重置全部」按钮显示判定）。 */
  hasAnyOverride: boolean

  /** 切 dark/light。 */
  setThemeMode: (mode: ThemeMode) => void
  /** 写全局 token（标记 edited）。 */
  setGlobalToken: <K extends GlobalTokenKey>(
    key: K,
    value: NonNullable<GlobalOverrides[K]>,
  ) => void
  /** 写 Table 组件 token（标记 edited）。 */
  setTableToken: <K extends TableTokenKey>(
    key: K,
    value: NonNullable<TableOverrides[K]>,
  ) => void
  /** 重置单个全局 token（取消 edited）。 */
  resetGlobalToken: (key: GlobalTokenKey) => void
  /** 重置单个 Table 组件 token（取消 edited）。 */
  resetTableToken: (key: TableTokenKey) => void
  /** 重置全部（清空两 overrides；themeMode 不变）。 */
  resetAll: () => void
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * 消费全局主题 store。
 * 必须在 `<ThemeProvider>` 内调用。
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme 必须在 <ThemeProvider> 内调用')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface ThemeProviderProps {
  children: ReactNode
}

/**
 * 全局主题 Provider。
 *
 * 结构：`<ThemeProvider>` 持有 state（themeMode + 两 overrides）→ 直接渲染
 * `<ConfigProvider theme={{ token: globalOverrides, components:{ Table: tableOverrides },
 * algorithm }}>` 包 `{children}`，同时通过 `<ThemeContext.Provider>` 把 store 值
 * 暴露给后代组件（顶栏切换控件、theme-editor、SplitDemo 等任意 demo）。
 *
 * algorithm = themeMode==='dark' ? theme.darkAlgorithm : theme.defaultAlgorithm。
 *
 * **关键**：globalOverrides / tableOverrides 只含 edited 键 → ConfigProvider 仅收到
 * 用户显式覆盖项 → 未编辑键由 antd algorithm + prepareComponentToken 派生（dark 自动变暗）。
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light')
  const [globalOverrides, setGlobalOverrides] = useState<GlobalOverrides>({})
  const [tableOverrides, setTableOverrides] = useState<TableOverrides>({})

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode)
  }, [])

  const setGlobalToken = useCallback(
    <K extends GlobalTokenKey>(
      key: K,
      value: NonNullable<GlobalOverrides[K]>,
    ) => {
      setGlobalOverrides((s) => ({ ...s, [key]: value }))
    },
    [],
  )

  const setTableToken = useCallback(
    <K extends TableTokenKey>(
      key: K,
      value: NonNullable<TableOverrides[K]>,
    ) => {
      setTableOverrides((s) => ({ ...s, [key]: value }))
    },
    [],
  )

  const resetGlobalToken = useCallback((key: GlobalTokenKey) => {
    setGlobalOverrides((s) => {
      if (!(key in s)) return s
      const next = { ...s }
      delete next[key]
      return next
    })
  }, [])

  const resetTableToken = useCallback((key: TableTokenKey) => {
    setTableOverrides((s) => {
      if (!(key in s)) return s
      const next = { ...s }
      delete next[key]
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    setGlobalOverrides({})
    setTableOverrides({})
  }, [])

  const hasAnyOverride =
    Object.keys(globalOverrides).length > 0 ||
    Object.keys(tableOverrides).length > 0

  const algorithm =
    themeMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm

  const ctxValue = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      globalOverrides,
      tableOverrides,
      hasAnyOverride,
      setThemeMode,
      setGlobalToken,
      setTableToken,
      resetGlobalToken,
      resetTableToken,
      resetAll,
    }),
    [
      themeMode,
      globalOverrides,
      tableOverrides,
      hasAnyOverride,
      setThemeMode,
      setGlobalToken,
      setTableToken,
      resetGlobalToken,
      resetTableToken,
      resetAll,
    ],
  )

  return (
    <ThemeContext.Provider value={ctxValue}>
      <ConfigProvider
        theme={{
          algorithm,
          token: globalOverrides,
          components: {
            Table: tableOverrides,
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}
