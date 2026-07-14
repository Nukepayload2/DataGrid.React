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

    return <Empty />
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
