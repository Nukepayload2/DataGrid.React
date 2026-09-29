// fake timers 封装（antd 上游仓 tests/utils.tsx waitFakeTimer 的 vitest 等价；本机 checkout 6.5.2:77，npm 包 6.4.4 不发测试件）。
import { act } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

/**
 * 弹窗/动画类测试用真 timers + waitFor（rc-motion 动画循环遇 runAllTimers 会炸）；
 * fake timers 只用于 loading delay / debounce 等纯计时断言。
 */
export function useFakeTimersSafe(): void {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })
}

/** 分块推进 fake 时间（每块包 act），共等待 advanceTime × times 毫秒。 */
export async function waitFakeTimer(advanceTime = 1000, times = 20): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await Promise.resolve()
      vi.advanceTimersByTime(advanceTime)
    })
  }
}
