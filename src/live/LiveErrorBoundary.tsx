/** 捕获 live 预览区的渲染期错误并上报给外层。 */
import { Component, type ReactNode } from 'react'

export interface LiveErrorBoundaryProps {
  children: ReactNode
  /** 渲染期错误回调（与编译错误共用展示通道）。 */
  onError?: (error: string) => void
}

interface LiveErrorBoundaryState {
  hasError: boolean
}

export class LiveErrorBoundary extends Component<
  LiveErrorBoundaryProps,
  LiveErrorBoundaryState
> {
  state: LiveErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): LiveErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error): void {
    this.props.onError?.(error?.message ?? String(error))
  }

  render(): ReactNode {
    if (this.state.hasError) return null
    return this.props.children
  }
}
