import { useContext, useMemo, type ReactNode } from 'react'
import { ConfigProvider, Empty, Spin } from 'antd'
import type { SpinProps } from 'antd'
import type { TableLocale } from './types'

const { ConfigContext } = ConfigProvider
type RenderEmptyHandler = (componentName: string) => ReactNode

export function useTableEmptyText(args: {
  rowCount: number
  locale: TableLocale
}): ReactNode {
  const { rowCount, locale } = args
  const { renderEmpty } = useContext(ConfigContext)

  return useMemo(() => {
    if (rowCount > 0) return null

    if (locale.emptyText !== undefined) {
      return typeof locale.emptyText === 'function'
        ? locale.emptyText()
        : locale.emptyText
    }

    const rendered = (renderEmpty as RenderEmptyHandler | undefined)?.('Table')
    if (rendered !== undefined && rendered !== null && rendered !== false) {
      return rendered
    }

    // 对齐 antd InternalTable 的最终兜底（es/table/InternalTable.js:414-416）：
    // `renderEmpty?.('Table') || <DefaultRenderEmpty componentName="Table" />`，
    // 而 DefaultRenderEmpty 对 'Table' 返回 <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />。
    // antd 的 ConfigContext 默认值不携带 renderEmpty（循环依赖，见 config-provider/context.js 注释），
    // 所以无 ConfigProvider 注入时两侧都会走到这一步——必须用同款 SIMPLE 图标，否则空态视觉不一致。
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }, [locale, renderEmpty, rowCount])
}

export function normalizeSpinProps(
  loading: boolean | SpinProps | undefined,
): SpinProps | undefined {
  if (loading === undefined) return undefined
  if (typeof loading === 'boolean') return { spinning: loading }
  return loading
}

export function TableLoadingContainer(props: {
  loading: boolean | SpinProps | undefined
  children: ReactNode
}): ReactNode {
  const spinProps = normalizeSpinProps(props.loading)

  if (spinProps === undefined) return props.children

  return (
    <Spin spinning={false} {...spinProps}>
      {props.children}
    </Spin>
  )
}
