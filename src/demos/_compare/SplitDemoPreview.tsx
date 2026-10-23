import { useEffect, type ComponentType, type ReactNode, useState } from 'react'
import { Alert } from 'antd'
import { SplitDemo } from './SplitDemo'
import { LiveErrorBoundary } from '../../live/LiveErrorBoundary'
import { useVirtualization } from '../VirtualizationContext'

/**
 * 真实 demo 组件按需加载。
 *
 * 这里曾经是 `import.meta.glob(..., { eager: true })`：它把 59 个 `*.antd.tsx`
 * 全部钉进首屏（实测 59 个 chunk / 153 KB，且把整张 antd 依赖图拖进首屏）。
 * 但 REAL_DG / REAL_ANTD 只在「编辑模式且某一栏没被编辑」时才用得上 ——
 * 默认模式渲染的是 App 传进来的 children（懒加载的 DemoComp），完全不需要它们。
 * 改成 lazy glob + 首次进入编辑模式再取，按需下载单个 demo 的两个变体。
 */
const dgLoaders = import.meta.glob('../*.dg.tsx', { import: 'default' })
const antdLoaders = import.meta.glob('../*.antd.tsx', { import: 'default' })

type RealComp = ComponentType<Record<string, unknown>>

/** 已解析过的真实组件（模块级缓存：切来切去不重复 setState 闪烁）。 */
const resolvedDg = new Map<string, RealComp>()
const resolvedAntd = new Map<string, RealComp>()

function isComponent(value: unknown): value is RealComp {
  return typeof value === 'function'
}

async function loadReal(
  loaders: Record<string, () => Promise<unknown>>,
  extension: '.dg.tsx' | '.antd.tsx',
  name: string,
  cache: Map<string, RealComp>,
): Promise<RealComp | null> {
  const cached = cache.get(name)
  if (cached) return cached
  const loader = loaders[`../${name}${extension}`]
  if (!loader) return null
  try {
    const mod = await loader()
    if (!isComponent(mod)) return null
    cache.set(name, mod)
    return mod
  } catch {
    return null
  }
}

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
  /** true 时渲染 data-grid / antd 双栏；false 时只渲染 data-grid。 */
  compareWithAntd?: boolean
  /** 默认模式渲染内容（真实 DemoComp，由 App 传）。 */
  children: ReactNode
}

export function SplitDemoPreview({
  name,
  editedDg,
  editedAntd,
  compareWithAntd = true,
  children,
}: SplitDemoPreviewProps) {
  const { virtual } = useVirtualization()

  const [dgRenderError, setDgRenderError] = useState<string | null>(null)
  const [antdRenderError, setAntdRenderError] = useState<string | null>(null)
  const [dgKey, setDgKey] = useState(0)
  const [antdKey, setAntdKey] = useState(0)

  const editing = editedDg !== null || editedAntd !== null

  // 编辑模式下另一栏要回退到「真实 demo 组件」，此时才按需取模块。
  const [realDg, setRealDg] = useState<RealComp | null>(() => resolvedDg.get(name) ?? null)
  const [realAntd, setRealAntd] = useState<RealComp | null>(
    () => resolvedAntd.get(name) ?? null,
  )

  useEffect(() => {
    if (!editing) return
    let cancelled = false
    void (async () => {
      const [dg, antd] = await Promise.all([
        loadReal(dgLoaders, '.dg.tsx', name, resolvedDg),
        compareWithAntd ? loadReal(antdLoaders, '.antd.tsx', name, resolvedAntd) : null,
      ])
      if (cancelled) return
      setRealDg(() => dg)
      setRealAntd(() => antd)
    })()
    return () => {
      cancelled = true
    }
  }, [compareWithAntd, editing, name])

  useEffect(() => {
    setDgRenderError(null)
    setDgKey((k) => k + 1)
  }, [editedDg])
  useEffect(() => {
    setAntdRenderError(null)
    setAntdKey((k) => k + 1)
  }, [editedAntd])

  if (!editing) {
    return <>{children}</>
  }

  const EditedDg = editedDg as RealComp | null
  const EditedAntd = editedAntd as RealComp | null
  // 大写开头才能当组件用（小写标签会被当成字符串标签渲染）。
  const RealDgComp = realDg
  const RealAntdComp = realAntd
  const editProps = propsFor(name, virtual)
  const dgPreview = EditedDg ? (
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
  ) : RealDgComp ? (
    <RealDgComp {...editProps} />
  ) : null

  if (!compareWithAntd) {
    return dgPreview
  }

  return (
    <SplitDemo
      minPaneWidth={480}
      left={dgPreview}
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
        ) : RealAntdComp ? (
          <RealAntdComp {...editProps} />
        ) : null
      }
    />
  )
}

export default SplitDemoPreview
