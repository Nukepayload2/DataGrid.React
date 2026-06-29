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
 * === 子组件 glob 自动发现 ===
 *
 * 真实子组件（如 `BasicDg` / `BasicAntd` / `FixedColumnsDg` / `FixedColumnsAntd`）通过
 * `import.meta.glob('../*.dg.tsx' | '../*.antd.tsx', { eager, import:'default' })` 自动发现
 * （glob 相对路径 `../*.dg.tsx` 因为本文件在 src/demos/_compare/）。glob key 形如
 * `'../basic.dg.tsx'`，用正则 `/([^/]+)\.(dg|antd)\.tsx$/` 提取 demo name 作为 map key。
 * **新增 demo 只需把 *.dg.tsx/*.antd.tsx 文件放进 src/demos/ 即自动接入，无需改本文件。**
 *
 * === 编辑模式 props（统一超集）===
 *
 * `propsFor(_name, virtual)` 返回所有子组件签名的超集（bordered/size/virtual/autoScroll）。
 * 不同 demo 子组件按各自签名收所需 props；约定「子组件解构参数全部带默认值」，
 * 因此即便超集 props 不全，子组件仍有兜底默认值，不崩。bordered 固定 false（Phase 1 简化，
 * Switch Bordered 仅在默认模式可见）。
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

// 子组件 glob 自动发现（模块顶层字面量调用；相对路径 '../*.dg.tsx' 因为本文件在 src/demos/_compare/）。
// eager + import:'default' → 模块对象 { '../basic.dg.tsx': BasicDg, ... }。
const dgModules = import.meta.glob('../*.dg.tsx', { eager: true, import: 'default' })
const antdModules = import.meta.glob('../*.antd.tsx', { eager: true, import: 'default' })

// 子组件签名宽松：用宽松 ComponentType 登记到 map，渲染时由 propsFor 统一超集提供 props。
type RealComp = ComponentType<Record<string, unknown>>

/**
 * 从 glob key（如 '../basic.dg.tsx'）提取 demo name（'basic'）。
 * 正则取 `/` 之后、`.dg.tsx` / `.antd.tsx` 之前的部分。
 */
function extractName(path: string): string | null {
  const m = path.match(/([^/]+)\.(?:dg|antd)\.tsx$/)
  return m ? m[1] : null
}

/** glob modules → name → 真实子组件 map。 */
function buildRealMap(mods: Record<string, unknown>): Record<string, RealComp> {
  const m: Record<string, RealComp> = {}
  for (const [path, mod] of Object.entries(mods)) {
    const name = extractName(path)
    if (name) m[name] = mod as RealComp
  }
  return m
}

const REAL_DG = buildRealMap(dgModules)
const REAL_ANTD = buildRealMap(antdModules)

/**
 * 编辑模式统一超集 props（bordered 固定 false，Phase 1 简化）。
 * - {bordered:false, virtual, size:'medium', autoScroll:true}
 *
 * 不同 demo 子组件按各自签名收所需 props；子组件解构参数全部带默认值，超集 props 不全也不崩。
 * _name 保留参数名兼容调用方，但不再用于分支。
 */
function propsFor(_name: string, virtual: boolean): Record<string, unknown> {
  return { bordered: false, virtual, size: 'medium', autoScroll: true }
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
