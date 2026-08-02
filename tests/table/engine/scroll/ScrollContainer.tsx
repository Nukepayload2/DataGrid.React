import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ScrollContainer,
  type ScrollContainerProps,
} from '../../../../src/table/engine/ScrollContainer'
import { Summary } from '../../../../src/table/engine/Summary'

/**
 * ScrollContainer 单元测试。
 *
 * 覆盖三路 return 渲染分支：
 * 1. sticky 模式 → 渲染 dg-sticky-scroll-viewport + StickyScrollBar（+ 提取 summary 时多一个 viewport）。
 * 2. 兜底分支（理论不可达，stickyEnabled 在分支 1 已 return；防御保留）。
 * 3. 非 sticky FloatingScrollBar 分支 → 渲染 .dg-scroll-wrap（含 .dg-scroll 容器）。
 *
 * 断言 props 透传：stickyScrollLeft/onStickyViewportWheel/children/style/className/ref 等。
 *
 * jsdom 限制：FloatingScrollBar 内部用 ResizeObserver/useLayoutEffect 测量，jsdom 无布局，
 * 但不影响本测试——只验证 ScrollContainer 把 props 正确路由到子组件。
 */

// ResizeObserver mock（FloatingScrollBar 内部使用；jsdom 无原生实现）。
class RO {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO

function baseProps(overrides: Partial<ScrollContainerProps> = {}): ScrollContainerProps {
  return {
    children: <div data-testid="grid-content">grid</div>,
    stickyEnabled: false,
    stickyViewportRef: { current: null },
    onStickyViewportWheel: () => {},
    onStickyViewportPointerDown: () => {},
    onStickyViewportPointerMove: () => {},
    onStickyViewportPointerUp: () => {},
    stickyScrollLeftRef: { current: 0 },
    setStickyScrollLeft: () => {},
    stickyScrollBarUpdateThumbRef: { current: null },
    stickyScrollInertiaActive: false,
    stickyOffsetScroll: 0,
    stickyOffsetSummary: 0,
    stickyGetContainer: undefined,
    gridRef: { current: null },
    stickySummaryGridRef: { current: null },
    extractSummary: false,
    summaryParsed: null,
    leafSticky: [],
    gridClassName: 'dg-grid',
    gridTemplateColumns: undefined,
    scrollMinWidth: undefined,
    scrollYEnabled: false,
    scrollXEnabled: false,
    virtualEnabled: false,
    scrollYNonVirtual: false,
    virtualScrollRef: { current: null },
    sectionClassName: undefined,
    sectionStyle: undefined,
    ...overrides,
  }
}

describe('ScrollContainer', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('sticky 分支：渲染 dg-sticky-scroll-viewport + 底部 StickyScrollBar，children 包在视口内', () => {
    const onWheel = vi.fn()
    const viewportRef: ScrollContainerProps['stickyViewportRef'] = { current: null }
    const { container, getByTestId } = render(
      <ScrollContainer
        {...baseProps({
          stickyEnabled: true,
          stickyViewportRef: viewportRef,
          onStickyViewportWheel: onWheel,
        })}
      />,
    )
    // children 被包在 dg-sticky-scroll-viewport 内。
    const viewport = container.querySelector('.dg-sticky-scroll-viewport')
    expect(viewport).not.toBeNull()
    expect(viewport?.contains(getByTestId('grid-content'))).toBe(true)
    // 视口 ref 被赋值（StickyScrollBar 也用同一 ref）。
    expect(viewportRef.current).toBe(viewport)
    // StickyScrollBar 渲染了底部固定横向滚动条（dg-sticky-scroll-bar）。
    expect(container.querySelector('.dg-sticky-scroll-bar')).not.toBeNull()
    // 非 FloatingScrollBar 路径——不应出现 .dg-scroll-wrap。
    expect(container.querySelector('.dg-scroll-wrap')).toBeNull()
  })

  it('sticky 分支：extractSummary=true 时多渲染一个 dg-sticky-scroll-viewport（独立 summary grid）', () => {
    const summaryRows = [
      // 占位 summary row 元素（SummaryLayer cloneElement 处理；这里只验证结构层数）。
      <div key="r1" />,
    ]
    const { container } = render(
      <ScrollContainer
        {...baseProps({
          stickyEnabled: true,
          extractSummary: true,
          summaryParsed: { fixed: true, rows: summaryRows as never, count: 1 },
          gridClassName: 'dg-grid',
          gridTemplateColumns: '10px 20px',
          scrollMinWidth: 120,
        })}
      />,
    )
    // 两个 dg-sticky-scroll-viewport（主 grid + 提取出的 summary grid）。
    const viewports = container.querySelectorAll('.dg-sticky-scroll-viewport')
    expect(viewports.length).toBe(2)
  })

  it('sticky 分支：offsetSummary 只在 fixed summary 且非数据区域滚动时生效，并保持滚动条在 summary 上方', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 400,
      height: 36,
      top: 0,
      right: 400,
      bottom: 36,
      left: 0,
      toJSON: () => ({}),
    } as DOMRect)

    const { container } = render(
      <ScrollContainer
        {...baseProps({
          stickyEnabled: true,
          extractSummary: true,
          stickyOffsetScroll: 4,
          stickyOffsetSummary: 20,
          summaryParsed: {
            fixed: true,
            rows: [
              <Summary.Row key="r1">
                <Summary.Cell index={0}>Offset summary</Summary.Cell>
              </Summary.Row>,
            ],
            count: 1,
          },
          gridClassName: 'dg-grid',
          gridTemplateColumns: '100px',
          scrollMinWidth: 120,
        })}
      />,
    )

    const summaryCell = screen.getByText('Offset summary').closest('.dg-cell-summary') as HTMLElement
    expect(summaryCell.style.bottom).toBe('20px')

    const bar = container.querySelector('.dg-sticky-scroll-bar') as HTMLElement
    const summaryViewport = container.querySelector('.dg-sticky-summary-viewport') as HTMLElement
    expect(summaryViewport.style.position).toBe('sticky')
    expect(summaryViewport.style.bottom).toBe('20px')
    await waitFor(() => {
      expect(bar.style.bottom).toBe('60px')
    })
  })

  it('sticky 分支：offsetSummary 不作用于非 fixed summary', () => {
    const { container } = render(
      <ScrollContainer
        {...baseProps({
          stickyEnabled: true,
          extractSummary: true,
          stickyOffsetScroll: 4,
          stickyOffsetSummary: 20,
          summaryParsed: {
            fixed: false,
            rows: [
              <Summary.Row key="r1">
                <Summary.Cell index={0}>Inline summary</Summary.Cell>
              </Summary.Row>,
            ],
            count: 1,
          },
        })}
      />,
    )

    const summaryCell = screen.getByText('Inline summary').closest('.dg-cell-summary') as HTMLElement
    expect(summaryCell.style.bottom).toBe('')
    expect((container.querySelector('.dg-sticky-scroll-bar') as HTMLElement).style.bottom).toBe('4px')
  })

  it('sticky 分支：scroll.y 数据区域模式下 offsetSummary 不生效', () => {
    const { container } = render(
      <ScrollContainer
        {...baseProps({
          stickyEnabled: true,
          extractSummary: true,
          scrollYEnabled: true,
          stickyOffsetScroll: 4,
          stickyOffsetSummary: 20,
          summaryParsed: {
            fixed: true,
            rows: [
              <Summary.Row key="r1">
                <Summary.Cell index={0}>Data area summary</Summary.Cell>
              </Summary.Row>,
            ],
            count: 1,
          },
        })}
      />,
    )

    const summaryCell = screen.getByText('Data area summary').closest('.dg-cell-summary') as HTMLElement
    expect(summaryCell.style.bottom).toBe('0px')
    expect((container.querySelector('.dg-sticky-scroll-bar') as HTMLElement).style.bottom).toBe('4px')
  })

  it('sticky 分支：主视口和 summary 视口都用 passive:false 原生 wheel 监听', () => {
    const addSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener')
    const removeSpy = vi.spyOn(HTMLDivElement.prototype, 'removeEventListener')
    const onWheel = vi.fn()
    const { container, unmount } = render(
      <ScrollContainer
        {...baseProps({
          stickyEnabled: true,
          extractSummary: true,
          summaryParsed: { fixed: true, rows: [<div key="r1" />] as never, count: 1 },
          onStickyViewportWheel: onWheel,
        })}
      />,
    )

    const wheelRegistrations = addSpy.mock.calls.filter(([type, listener, options]) => {
      return type === 'wheel'
        && listener === onWheel
        && (options as AddEventListenerOptions | undefined)?.passive === false
    })
    expect(wheelRegistrations).toHaveLength(2)

    const [viewport] = Array.from(container.querySelectorAll('.dg-sticky-scroll-viewport'))
    const event = new WheelEvent('wheel', { deltaX: 40, bubbles: true, cancelable: true })
    viewport.dispatchEvent(event)
    expect(onWheel).toHaveBeenCalledWith(event)

    unmount()
    const wheelRemovals = removeSpy.mock.calls.filter(([type, listener]) => {
      return type === 'wheel' && listener === onWheel
    })
    expect(wheelRemovals).toHaveLength(2)
  })

  it('非 sticky 分支：渲染 FloatingScrollBar 包装（.dg-scroll-wrap），children 在 .dg-scroll 容器内', () => {
    const { container, getByTestId } = render(
      <ScrollContainer
        {...baseProps({
          stickyEnabled: false,
        })}
      />,
    )
    const wrap = container.querySelector('.dg-scroll-wrap')
    expect(wrap).not.toBeNull()
    // 滚动容器带 dg-scroll 类。
    const scrollContainer = container.querySelector('.dg-scroll')
    expect(scrollContainer).not.toBeNull()
    expect(scrollContainer?.contains(getByTestId('grid-content'))).toBe(true)
    // 非 sticky 路径不应出现 sticky 视口。
    expect(container.querySelector('.dg-sticky-scroll-viewport')).toBeNull()
  })

  it('非 sticky 分支：scrollYEnabled=true 时容器 style 含 flex:1 + overflowY:auto', () => {
    const { container } = render(
      <ScrollContainer
        {...baseProps({
          stickyEnabled: false,
          scrollYEnabled: true,
        })}
      />,
    )
    const scrollContainer = container.querySelector('.dg-scroll') as HTMLElement
    expect(scrollContainer.style.overflowY).toBe('auto')
    expect(scrollContainer.style.overflowX).toBe('auto')
    // flex: '1' 在 jsdom 中被规范化为 '1 1 0%'（grow/shrink/basis）。
    expect(scrollContainer.style.flex.startsWith('1')).toBe(true)
    // minHeight: '0' 在 jsdom 中被规范化为 '0px'。
    expect(scrollContainer.style.minHeight).toBe('0px')
  })

  it('非 sticky 分支：virtualEnabled=true 时容器加 dg-virtual-scroll 修饰类 + 传入 virtualScrollRef', () => {
    const virtualScrollRef: ScrollContainerProps['virtualScrollRef'] = { current: null }
    const { container } = render(
      <ScrollContainer
        {...baseProps({
          stickyEnabled: false,
          virtualEnabled: true,
          virtualScrollRef,
        })}
      />,
    )
    const scrollContainer = container.querySelector('.dg-scroll') as HTMLElement
    expect(scrollContainer.className).toContain('dg-virtual-scroll')
    // virtualScrollRef 被赋值到滚动容器（FloatingScrollBar 内部 ref 转发）。
    expect(virtualScrollRef.current).toBe(scrollContainer)
  })

  it('非 sticky 分支：scrollXEnabled=true 且 scrollYEnabled=false 时加 dg-x-scroll 修饰类', () => {
    const { container } = render(
      <ScrollContainer
        {...baseProps({
          stickyEnabled: false,
          scrollXEnabled: true,
          scrollYEnabled: false,
        })}
      />,
    )
    const scrollContainer = container.querySelector('.dg-scroll') as HTMLElement
    expect(scrollContainer.className).toContain('dg-x-scroll')
  })

  it('非 sticky 分支：scrollYNonVirtual=true 时加 dg-fixed-header-scroll 修饰类', () => {
    const { container } = render(
      <ScrollContainer
        {...baseProps({
          stickyEnabled: false,
          scrollYNonVirtual: true,
          scrollYEnabled: true,
        })}
      />,
    )
    const scrollContainer = container.querySelector('.dg-scroll') as HTMLElement
    expect(scrollContainer.className).toContain('dg-fixed-header-scroll')
  })

  it('非 sticky 分支：sectionClassName/sectionStyle 注入到 .dg-scroll-wrap 外层', () => {
    const { container } = render(
      <ScrollContainer
        {...baseProps({
          stickyEnabled: false,
          sectionClassName: 'my-section',
          sectionStyle: { position: 'relative' },
        })}
      />,
    )
    const wrap = container.querySelector('.dg-scroll-wrap') as HTMLElement
    expect(wrap.className).toContain('my-section')
    expect(wrap.style.position).toBe('relative')
  })
})
