// mount/unmount 冒烟用例（antd tests/shared/mountTest.tsx 逐行等价）。
import type { ComponentType } from 'react'
import { describe, expect, it } from 'vitest'

import { customRender } from './render'

export function mountTest(Component: ComponentType): void {
  describe('mount and unmount', () => {
    // https://github.com/ant-design/ant-design/pull/18441
    it('component could be updated and unmounted without errors', () => {
      const { unmount, rerender } = customRender(<Component />)
      expect(() => {
        rerender(<Component />)
        unmount()
      }).not.toThrow()
    })
  })
}
