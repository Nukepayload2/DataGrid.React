/**
 * demo 层全局虚拟化开关上下文。
 *
 * === 用途 ===
 *
 * 顶栏「Virtual」Switch 是单一真理源，控制**非虚拟 demo** 的 `virtual` 属性：
 *   - 开关 ON（virtual=true）→ 接入的对比 demo 两侧（data-grid + antd）的 Table
 *     都收到 `virtual` 且 SplitDemo 限高 pane body（让左 data-grid .dg-data-area
 *     height:100% flex 链 resolve 到固定高度，虚拟窗口才有可滚动区域）。
 *   - 开关 OFF（virtual=false，默认）→ 接入的 demo 两侧 Table 不传 virtual，
 *     非虚拟渲染（全量 DOM）。
 *
 * === 触发条件（决策 7）===
 *
 * 虚拟化生效需 `virtual===true && scroll.y===true`（scroll.y 仅 true/undefined，
 * CSS 自适应高度；父容器需有明确 height，故 SplitDemo 在开关 ON 时限高 body）。
 *
 * === 不受影响（后续任务处理）===
 *
 *   - **强制虚拟 demo**（如 virtual-list / drag-virtual-list）：自身永久 virtual=true、
 *     自管高度，不消费本开关（直接写死或自管 virtual）。
 *   - **冲突 demo**（如页面级 sticky sticky.tsx）：虚拟化与 sticky 滚动祖先冲突，
 *     排除在本开关外（SplitDemo virtualizable=false 或不在 demo 层接入）。
 *
 * === 镜像 ThemeContext 模式 ===
 *
 * 结构与 src/theme/ThemeContext.tsx 一致：Provider 持 state + Context.Provider
 * 暴露 store；useVirtualization 必须在 Provider 内调用（否则 throw）。
 */

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

/**
 * 消费全局虚拟化开关 store。
 * 必须在 `<VirtualizationProvider>` 内调用。
 */
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

/**
 * 全局虚拟化开关 Provider。
 *
 * 持有 `useState<boolean>(false)`（默认关），通过 `<VirtualizationContext.Provider>`
 * 暴露 `{ virtual, setVirtual }` 给后代（顶栏 Switch + SplitDemo + 各接入 demo）。
 *
 * 与 ThemeProvider 独立（无耦合），由 main.tsx 在 ThemeProvider 内再包一层。
 */
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
