/**
 * LiveErrorBoundary：捕获 live 编辑预览区的渲染期错误。
 *
 * === 为什么需要 ===
 * compile/evalModule 只在「点应用」时跑一次，能拿到编译/导出错误。但组件**渲染时**（render
 * 阶段抛错，例如引用了 undefined 的属性、JSX 语法产物运行时崩溃）不会被 try/catch 捕获——
 * 必须用 React class 错误边界。本组件把渲染期错误转成回调，让 LiveEditor 在 Alert 里展示，
 * 同时返回 null 让预览区变空（避免整页白屏）。
 *
 * === 设计点 ===
 * - getDerivedStateFromError：同步更新 hasError，触发重渲染走 fallback。
 * - componentDidCatch：把错误透传给上层 onApply/onError（与编译错误走同一展示通道）。
 * - 透传 children：未出错时原样渲染（不包额外 DOM，避免破坏布局）。
 */
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
