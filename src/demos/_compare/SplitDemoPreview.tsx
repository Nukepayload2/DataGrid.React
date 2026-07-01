import { useEffect, type ComponentType, type ReactNode, useState } from 'react'
import { Alert } from 'antd'
import { SplitDemo } from './SplitDemo'
import { LiveErrorBoundary } from '../../live/LiveErrorBoundary'
import { useVirtualization } from '../VirtualizationContext'

const dgModules = import.meta.glob('../*.dg.tsx', { eager: true, import: 'default' })
const antdModules = import.meta.glob('../*.antd.tsx', { eager: true, import: 'default' })

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
 * 编辑模式统一超集 props（bordered 固定 false，简化）。
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

  const [dgRenderError, setDgRenderError] = useState<string | null>(null)
  const [antdRenderError, setAntdRenderError] = useState<string | null>(null)
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

  if (editedDg === null && editedAntd === null) {
    return <>{children}</>
  }

  const RealDg = REAL_DG[name]
  const RealAntd = REAL_ANTD[name]

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
