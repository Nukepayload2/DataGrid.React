// PointerEvent polyfill（jsdom 无原生 PointerEvent，指针交互断言依赖它）。
// 副作用模块：import 即生效，无导出。
// 提取自 tests/table/api/Table.public-api.tsx（原文件保留自带副本，Phase 3 再去重）。
if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 1
    }
  }

  ;(window as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent = PointerEventPolyfill
  ;(globalThis as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent =
    PointerEventPolyfill
}
