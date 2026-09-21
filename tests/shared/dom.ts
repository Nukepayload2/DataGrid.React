// DOM 断言辅助工厂。提取自 tests/table/api/Table.public-api.tsx
// （原文件保留自带副本，Phase 3 再去重）。
import { vi } from 'vitest'

import './polyfill'

/** 把元素 getBoundingClientRect 覆写成固定尺寸（jsdom 无布局，恒返回 0）。 */
export function setElementWidth(element: Element, width: number): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    width,
    height: 20,
    left: 0,
    right: width,
    top: 0,
    bottom: 20,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
}

/** 构造 PointerEvent（依赖 polyfill.ts 的副作用）。 */
export function pointer(type: string, clientX: number, pointerId = 7): PointerEvent {
  return new PointerEvent(type, {
    pointerId,
    clientX,
    bubbles: true,
    cancelable: true,
    button: 0,
  })
}
