import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

/** useVirtualization 暴露的 API。 */
export interface VirtualizationContextValue {
  /** 当前是否启用虚拟化（默认 false）。 */
  virtual: boolean
  /** 设置虚拟化开关。 */
  setVirtual: (v: boolean) => void
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const VirtualizationContext = createContext<VirtualizationContextValue | null>(
  null,
)

/** 在 provider 内消费 demo 虚拟化开关。 */
export function useVirtualization(): VirtualizationContextValue {
  const ctx = useContext(VirtualizationContext)
  if (!ctx) {
    throw new Error('useVirtualization 必须在 <VirtualizationProvider> 内调用')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface VirtualizationProviderProps {
  children: ReactNode
}

/** Demo 层虚拟化开关 provider。 */
export function VirtualizationProvider({ children }: VirtualizationProviderProps) {
  const [virtual, setVirtualState] = useState<boolean>(false)

  const setVirtual = useCallback((v: boolean) => {
    setVirtualState(v)
  }, [])

  const ctxValue = useMemo<VirtualizationContextValue>(
    () => ({ virtual, setVirtual }),
    [virtual, setVirtual],
  )

  return (
    <VirtualizationContext.Provider value={ctxValue}>
      {children}
    </VirtualizationContext.Provider>
  )
}
