// 可回调的 ResizeObserver 替换（tests/setup.ts 全局装的是 no-op RO，jsdom 无布局）。
// 需要「触发一次测量」的测试用 withResizeObserver 临时替换，用例结束调 restore()。

/** 单个 mock RO 实例（比 setup.ts 的 no-op 多了 trigger 手动触发入口）。 */
export interface MockResizeObserver {
  /** 当前 observe 中的目标集合。 */
  readonly observed: ReadonlySet<Element>
  observe(target: Element): void
  unobserve(target: Element): void
  disconnect(): void
  /** 手动触发一轮回调（模拟 resize），entries 默认取全部 observed 目标。 */
  trigger(): void
}

/** observe/unobserve/disconnect 生命周期回调（测试用来断言或触发后续行为）。 */
export interface ResizeObserverMockCallbacks {
  onObserve?: (target: Element, observer: MockResizeObserver) => void
  onUnobserve?: (target: Element, observer: MockResizeObserver) => void
  onDisconnect?: (observer: MockResizeObserver) => void
}

export interface ResizeObserverMockHandle {
  /** 替换期间构造出的全部 mock RO 实例（按构造顺序）。 */
  readonly observers: MockResizeObserver[]
  /** 恢复原 window.ResizeObserver（setup.ts 的 no-op mock）。 */
  restore(): void
}

export function withResizeObserver(
  callbacks: ResizeObserverMockCallbacks = {},
): ResizeObserverMockHandle {
  const previous = window.ResizeObserver
  const observers: MockResizeObserver[] = []

  class MockResizeObserverImpl implements ResizeObserver {
    readonly observed = new Set<Element>()

    constructor(private readonly callback: ResizeObserverCallback) {
      observers.push(this)
    }

    observe(target: Element): void {
      this.observed.add(target)
      callbacks.onObserve?.(target, this)
    }

    unobserve(target: Element): void {
      this.observed.delete(target)
      callbacks.onUnobserve?.(target, this)
    }

    disconnect(): void {
      this.observed.clear()
      callbacks.onDisconnect?.(this)
    }

    trigger(): void {
      const entries: ResizeObserverEntry[] = Array.from(this.observed).map(
        (target) =>
          ({
            target,
            contentRect: target.getBoundingClientRect(),
            borderBoxSize: [],
            contentBoxSize: [],
          }) as ResizeObserverEntry,
      )
      this.callback(entries, this)
    }
  }

  window.ResizeObserver = MockResizeObserverImpl as unknown as typeof ResizeObserver

  return {
    observers,
    restore: () => {
      window.ResizeObserver = previous
    },
  }
}
