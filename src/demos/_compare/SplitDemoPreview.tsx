/**
 * SplitDemoPreview：split demo 的预览容器，承载「默认 / 编辑」双模式切换。
 *
 * === 两种模式 ===
 *
 * 1. **默认模式**（editedDg && editedAntd 都 null）：`return <>{children}</>`，渲染真实
 *    `BasicDemo`（由 App 传 `<DemoComp/>`）。**零编辑开销**：不加载 sucrase、不编译、不
 *    走 evalModule、不包 ErrorBoundary——与改造前完全等价。
 *
 * 2. **编辑模式**（editedDg 或 editedAntd 任一非 null）：用 `SplitDemo` 外壳，左/右栏按是否
 *    有 edited 产物分别渲染：
 *    - 有 edited → 包 `LiveErrorBoundary` 渲染编辑产物（捕获渲染期 throw）。
 *      渲染期 throw 时 `LiveErrorBoundary` 调 `onError(msg)`，本组件把错误存入
 *      `dgRenderError`/`antdRenderError` state，在该侧改渲染 `<Alert type="error">`
 *      展示（编译错误仍由 LiveEditor 的 Alert 处理，此处仅渲染期错误）。
 *      edited 产物变化时清旧错误，让新组件重试。
 *    - 无 edited → 渲染真实子组件（fallback 到该侧默认实现）。
 *
 *    编辑模式 bordered 固定 false（简化，Phase 1 接受——Switch Bordered 仅在默认模式可见）。
 *
 * === 子组件静态 import ===
 *
 * 真实子组件（`BasicDg` / `BasicAntd` / `FixedColumnsDg` / `FixedColumnsAntd`）静态 import 并
 * 登记到 `REAL_DG` / `REAL_ANTD` map，按 `name` 查找。试点接 `basic` + `fixed-columns`。
 *
 * === 编辑模式 props（按 name 区分）===
 *
 * 不同 demo 的子组件签名不同：basic 只需 `{bordered,virtual}`，fixed-columns 还需 `size`。
 * `propsFor(name, virtual)` 辅助按 name 给出编辑模式固定的 props 集（bordered 固定 false——
 * Phase 1 简化，Switch Bordered 仅在默认模式可见）：
 *   - `basic`         → `{ bordered:false, virtual }`
 *   - `fixed-columns` → `{ bordered:false, size:'medium', virtual }`
 *
 * === 与 App 的契约 ===
 *
 * - props `name`：demo 名（用于 map 查找真实子组件）。
 * - props `editedDg/editedAntd`：编译产物组件（null = 未编辑/重置）；类型宽松
 *   `ComponentType<Record<string,unknown>>`（与 LiveEditor onApply 载荷一致）。
 * - props `children`：默认模式渲染的真实 DemoComp（由 App 传 `<DemoComp/>`）。
 */
import { useEffect, type ComponentType, type ReactNode, useState } from 'react'
import { Alert } from 'antd'
import { SplitDemo } from './SplitDemo'
import { LiveErrorBoundary } from '../../live/LiveErrorBoundary'
import { useVirtualization } from '../VirtualizationContext'
// 真实子组件静态 import（live 编辑 fallback 用）。
import BasicDg from '../basic.dg'
import BasicAntd from '../basic.antd'
import FixedColumnsDg from '../fixed-columns.dg'
import FixedColumnsAntd from '../fixed-columns.antd'

// 真实子组件签名宽松：basic 需 {bordered,virtual}，fixed-columns 需 {bordered,size,virtual}。
// 用宽松 ComponentType 登记到 map，渲染时由 propsFor 提供 name 对应的 props。
type RealComp = ComponentType<Record<string, unknown>>

// name → 真实子组件 map。试点接 basic + fixed-columns。
const REAL_DG: Record<string, RealComp> = {
  basic: BasicDg as unknown as RealComp,
  'fixed-columns': FixedColumnsDg as unknown as RealComp,
}
const REAL_ANTD: Record<string, RealComp> = {
  basic: BasicAntd as unknown as RealComp,
  'fixed-columns': FixedColumnsAntd as unknown as RealComp,
}

/**
 * 编辑模式按 name 给出子组件 props 集（bordered 固定 false，Phase 1 简化）。
 * - basic → {bordered:false, virtual}
 * - fixed-columns → {bordered:false, size:'medium', virtual}
 *
 * 编译产物组件类型是 ComponentType<Record<string,unknown>>，传多余 props 无妨；真实子组件
 * 按其签名收 props。
 */
function propsFor(name: string, virtual: boolean): Record<string, unknown> {
  const base: Record<string, unknown> = { bordered: false, virtual }
  if (name === 'fixed-columns') base.size = 'medium'
  return base
}

export interface SplitDemoPreviewProps {
  /** demo 名（用于 REAL_DG/REAL_ANTD map 查找）。 */
  name: string
  /** data-grid 段编辑产物（null = 未编辑/重置）。 */
  editedDg: ComponentType<Record<string, unknown>> | null
  /** antd 段编辑产物（null = 未编辑/重置）。 */
  editedAntd: ComponentType<Record<string, unknown>> | null
  /** 默认模式渲染内容（真实 DemoComp，由 App 传）。 */
  children: ReactNode
}

export function SplitDemoPreview({
  name,
  editedDg,
  editedAntd,
  children,
}: SplitDemoPreviewProps) {
  const { virtual } = useVirtualization()

  // 渲染期错误 state：组件 throw 时由 LiveErrorBoundary 调 onError 把错误 message 写入；
  // edited 产物变化（重新应用 / 重置 null）时清空，让新组件重试。
  const [dgRenderError, setDgRenderError] = useState<string | null>(null)
  const [antdRenderError, setAntdRenderError] = useState<string | null>(null)
  // boundary remount key：React error boundary 的 hasError 一旦 true 重新渲染不会自动清零，
  // 因此 edited 产物变化时递增 key 让 LiveErrorBoundary remount → hasError 重置 → 新组件重试。
  const [dgKey, setDgKey] = useState(0)
  const [antdKey, setAntdKey] = useState(0)
  useEffect(() => {
    setDgRenderError(null)
    setDgKey((k) => k + 1)
  }, [editedDg])
  useEffect(() => {
    setAntdRenderError(null)
    setAntdKey((k) => k + 1)
  }, [editedAntd])

  // 默认模式：editedDg && editedAntd 都 null → 渲染真实 DemoComp，零编辑开销。
  if (editedDg === null && editedAntd === null) {
    return <>{children}</>
  }

  // 编辑模式：用 SplitDemo 外壳，左/右栏按 edited 产物替换。
  const RealDg = REAL_DG[name]
  const RealAntd = REAL_ANTD[name]

  // edited 产物与真实子组件统一按宽松 RealComp 渲染，props 由 propsFor(name, virtual) 提供。
  const EditedDg = editedDg as RealComp | null
  const EditedAntd = editedAntd as RealComp | null
  const editProps = propsFor(name, virtual)

  return (
    <SplitDemo
      minPaneWidth={480}
      left={
        EditedDg ? (
          dgRenderError ? (
            <Alert
              type="error"
              message={`渲染错误：${dgRenderError}`}
              style={{ margin: 8 }}
            />
          ) : (
            <LiveErrorBoundary key={dgKey} onError={setDgRenderError}>
              <EditedDg {...editProps} />
            </LiveErrorBoundary>
          )
        ) : RealDg ? (
          <RealDg {...editProps} />
        ) : null
      }
      right={
        EditedAntd ? (
          antdRenderError ? (
            <Alert
              type="error"
              message={`渲染错误：${antdRenderError}`}
              style={{ margin: 8 }}
            />
          ) : (
            <LiveErrorBoundary key={antdKey} onError={setAntdRenderError}>
              <EditedAntd {...editProps} />
            </LiveErrorBoundary>
          )
        ) : RealAntd ? (
          <RealAntd {...editProps} />
        ) : null
      }
    />
  )
}

export default SplitDemoPreview
