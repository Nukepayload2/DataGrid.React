/** 全局主题上下文；只把显式编辑过的 token 作为 override 下发给 ConfigProvider。 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ConfigProvider, theme } from 'antd'

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

export interface ThemeProviderProps {
  children: ReactNode
}

/** 提供主题模式与 token overrides，并同步配置到 antd ConfigProvider。 */
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
