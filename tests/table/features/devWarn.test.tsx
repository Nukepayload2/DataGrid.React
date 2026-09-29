// 黑盒 feature-slice：`[data-grid]` 开发态告警通道的**生产门**（片段 E-156）。
//
// 一句话：全仓 5 条 `[data-grid]` 提示过去是 5 处裸 `console.warn`（无环境门 ⇒ 生产构建里照发），
// 现在收口到唯一出口 `src/table/devWarn.ts`；本文件钉的是"生产不发 / 开发恰一次"这条判据，
// 以及**每个调用点各自**的"生产态零输出"对照。
//
// ⚠ 本文件的三条仪表纪律（都是本仓已登记的坑）：
//   - **P-096**：`console.warn` 上同时挂着 React / antd / 本仓多种输出，且 react-dom 与 rc-util
//     都按消息去重 ⇒ 任何计数前**先按消息标记过滤**，绝不裸数 `warnSpy` 次数。
//   - **P-107**：本文件全部"生产态零输出"的断言都必须配**同一探测器的阳性对照臂**
//     （开发/测试态必须读数 ON），否则"零输出"可能只是探测器坏了。每条用例都成对写。
//   - `NODE_ENV` 是**进程级**变量，vitest 同进程共享 ⇒ 只在触发窗口内改、`finally` 里复原，
//     `afterEach` 再兜一次；不在生产档位里做断言之外的任何事。
import type { ReactNode } from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { Table } from '../../../src/table/index'
import { devWarnOnce } from '../../../src/table/devWarn'
import { customRender } from '../../shared/render'

/** 本仓告警通道的公共前缀（过滤掉 React / antd 自己的输出）。 */
const CHANNEL = '[data-grid]'

/** 五条调用点各自的消息标记（改前／改后都按这个认，不靠消息条数）。 */
const MARKS = {
  dupSelection: 'Multiple `SELECTION_COLUMN`',
  dupExpand: 'Multiple `EXPAND_COLUMN`',
  expandNoNode: 'but no expand column is rendered',
  paginationAsync: 'Verify async mode config',
  functionTitle: '`column.title`',
} as const

const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

/**
 * 测试侧读写 `NODE_ENV` 的**唯一**入口：经 `globalThis` 取值（本仓不引 `@types/node`，
 * 裸 `process` 在本文件的类型面里不存在；同族写法见 `tests/shared/polyfill.ts`）。
 * ⚠ 只有**测试**可以这样绕：出口 `devWarn.ts` 里的判据必须写成裸 `process.env.NODE_ENV`
 *   才会被消费者的打包器折量＋DCE（实测见该文件注释），两者目的相反、不要互相抄。
 */
type NodeProcess = { env: Record<string, string | undefined> }
function nodeProcess(): NodeProcess {
  const p = (globalThis as { process?: NodeProcess }).process
  if (!p) throw new Error('devWarn 用例需要 Node 的 process 全局来切 NODE_ENV')
  return p
}
function readNodeEnv(): string {
  return nodeProcess().env.NODE_ENV ?? ''
}
function writeNodeEnv(value: string): void {
  nodeProcess().env.NODE_ENV = value
}

/** 开工时的 NODE_ENV（vitest 里是运行时活读值，用于确认"测试态"这条臂真的存在）。 */
const nodeEnvAtOpen = readNodeEnv()

afterEach(() => {
  writeNodeEnv(nodeEnvAtOpen)
  warnSpy.mockClear()
})

afterAll(() => {
  warnSpy.mockRestore()
})

beforeAll(() => {
  expect(nodeEnvAtOpen).not.toBe('production') // 阳性前提：开工时不是生产档，否则"应发"臂全是空断言
})

/** 在指定 NODE_ENV 窗口内跑 fn，用完即恢复（别把 env 漏给别的用例）。 */
function inEnv<T>(env: string, fn: () => T): T {
  const previous = readNodeEnv()
  writeNodeEnv(env)
  try {
    return fn()
  } finally {
    writeNodeEnv(previous)
  }
}

/** 只取本仓通道里、命中指定消息标记的那几条。 */
function channelWarns(mark?: string): Array<string> {
  return warnSpy.mock.calls
    .map((args) => args.join(' '))
    .filter((text) => text.startsWith(CHANNEL))
    .filter((text) => (mark === undefined ? true : text.includes(mark)))
}

type Rec = { key: string; name: string; age: number }

/** ⑤ 的去重键是"每一列"，故每条用例都要一条**独占的列键**，否则后用的用例会被前一条吃掉。 */
let fnTitleSeq = 0

const data: Rec[] = [
  { key: 'r1', name: 'Jack', age: 38 },
  { key: 'r2', name: 'Lucy', age: 30 },
  { key: 'r3', name: 'Tom', age: 24 },
]

/** 五个调用点的触发器：各自返回被渲染的 Table（渲染即触发，不额外调内部函数）。 */
const triggers: Record<keyof typeof MARKS, () => void> = {
  // ① `src/table/useColumnTreeBuilder.ts` 重复 `SELECTION_COLUMN`
  dupSelection: () => {
    customRender(
      <Table<Rec>
        rowKey="key"
        dataSource={data}
        rowSelection={{ type: 'checkbox' }}
        columns={[
          Table.SELECTION_COLUMN,
          { key: 'name', dataIndex: 'name', title: 'Name' },
          Table.SELECTION_COLUMN,
        ]}
      />,
    )
  },
  // ② 同文件重复 `EXPAND_COLUMN`（配了 expandable ⇒ 只有"重复哨兵"这一条该发）
  dupExpand: () => {
    customRender(
      <Table<Rec>
        rowKey="key"
        dataSource={data}
        expandable={{ expandedRowRender: () => <div className="dg-probe-expand" /> }}
        columns={[
          Table.EXPAND_COLUMN,
          { key: 'name', dataIndex: 'name', title: 'Name' },
          Table.EXPAND_COLUMN,
        ]}
      />,
    )
  },
  // ③ 同文件 `EXPAND_COLUMN` 但没有展开列
  expandNoNode: () => {
    customRender(
      <Table<Rec>
        rowKey="key"
        dataSource={data}
        columns={[Table.EXPAND_COLUMN, { key: 'name', dataIndex: 'name', title: 'Name' }]}
      />,
    )
  },
  // ④ `src/table/engine/usePagination.ts` 的 async 模式可疑配置（length<total 且 length>pageSize）
  paginationAsync: () => {
    customRender(
      <Table<Rec>
        rowKey="key"
        dataSource={data}
        columns={[{ key: 'name', dataIndex: 'name', title: 'Name' }]}
        pagination={{ current: 1, pageSize: 2, total: 10 }}
      />,
    )
  },
  // ⑤ `src/table/columnAdapter.ts` 函数式 `column.title`（每列一次 ⇒ 用独占列键）
  functionTitle: () => {
    customRender(
      <Table<Rec>
        rowKey="key"
        dataSource={data}
        columns={[
          {
            key: `warn-probe-fn-title-${fnTitleSeq++}`,
            dataIndex: 'name',
            title: (() => <span>Title</span>) as unknown as ReactNode,
          },
          { key: 'name', dataIndex: 'name', title: 'Name' },
        ]}
      />,
    )
  },
}

describe('devWarn 生产门（五条调用点的"生产不发"对照）', () => {
  const sites = Object.keys(triggers) as Array<keyof typeof triggers>

  it.each(sites)('%s：阳性对照臂 ⇒ 非生产态读数必须 ON（P-107）', (site) => {
    inEnv('development', () => {
      triggers[site]()
    })
    // 探测器本身好使：同一条消息在开发态必须看得见至少一次。
    expect(channelWarns(MARKS[site]).length).toBeGreaterThan(0)
  })

  it.each(sites)('%s：生产态 ⇒ 该条零输出，且通道整体零输出', (site) => {
    inEnv('production', () => {
      triggers[site]()
    })
    expect(channelWarns(MARKS[site])).toEqual([])
    // 更硬的口径：生产态下整条 `[data-grid]` 通道都不该有一声。
    expect(channelWarns()).toEqual([])
  })

  it('开发态：同一次渲染里没中招的配置 ⇒ 零告警（门不是无条件静音）', () => {
    inEnv('development', () => {
      customRender(
        <Table<Rec>
          rowKey="key"
          dataSource={data}
          columns={[
            { key: 'name', dataIndex: 'name', title: 'Name' },
            { key: 'age', dataIndex: 'age', title: 'Age' },
          ]}
        />,
      )
    })
    expect(channelWarns()).toEqual([])
  })

  it('测试态（vitest 默认档）⇒ 同一条告警可复现，不被消息级去重吃掉第二条', () => {
    // 参照在 `NODE_ENV === 'test'` 里主动复位去重表（`antd 6.4.4 es/_util/warning.js:17-19`），
    // 就是为了"每条用例都真看得到告警"；我方同形。判据是**第二次仍 ON**，不是次数（StrictMode
    // 双渲染会让单次触发就发多条，钉次数会被仪表噪声打红）。
    inEnv(nodeEnvAtOpen, () => {
      triggers.expandNoNode()
    })
    expect(channelWarns(MARKS.expandNoNode).length).toBeGreaterThan(0)

    warnSpy.mockClear()
    inEnv(nodeEnvAtOpen, () => {
      triggers.expandNoNode()
    })
    expect(channelWarns(MARKS.expandNoNode).length).toBeGreaterThan(0)
  })
})

/** helper 自己的用例全部用**独占消息文本**，免得跟上面 5 个调用点用例共用去重表而互相吃掉。 */
let probeSeq = 0
function uniqueMessage(label: string): string {
  probeSeq += 1
  return `probe-${label}-${probeSeq}`
}

describe('devWarnOnce 判据本身（环境门 ＋ 两层去重）', () => {
  it('生产态 ⇒ 消息级与语义级两档键都零输出', () => {
    const message = uniqueMessage('prod')
    const scopeKey = uniqueMessage('prod-scope')

    inEnv('production', () => {
      devWarnOnce(message)
      devWarnOnce(message)
      devWarnOnce(`scoped body ${message}`, `column:${scopeKey}`)
      devWarnOnce(`scoped body ${message}`, `column:${scopeKey}`)
    })
    expect(channelWarns()).toEqual([])

    // 阳性对照臂（P-107）：**同一个探测器、同一批消息**，非生产档位必须读数 ON，
    // 否则上面那句"零输出"可能只是 spy 坏了。
    inEnv('development', () => {
      devWarnOnce(message)
      devWarnOnce(`scoped body ${message}`, `column:${scopeKey}`)
    })
    expect(channelWarns(message)).toHaveLength(2)
  })

  it('开发态 ⇒ 同一消息恰好一次（消息级去重真的生效，不是每帧重发）', () => {
    const message = uniqueMessage('dev-once')
    inEnv('development', () => {
      devWarnOnce(message)
      devWarnOnce(message)
      devWarnOnce(message)
    })
    expect(channelWarns(message)).toHaveLength(1)
  })

  it('开发态 ⇒ 不同消息各发一次（去重不是"整条通道只准响一次"）', () => {
    const first = uniqueMessage('dev-a')
    const second = uniqueMessage('dev-b')
    inEnv('development', () => {
      devWarnOnce(first)
      devWarnOnce(second)
      devWarnOnce(second)
    })
    expect(channelWarns(first)).toHaveLength(1)
    expect(channelWarns(second)).toHaveLength(1)
  })

  it('测试态 ⇒ 消息级去重被复位（参照 `resetWarned()` 同形），语义级 onceKey 照样去重', () => {
    const message = uniqueMessage('test-arm')
    const scopeKey = uniqueMessage('test-scope')

    inEnv('test', () => {
      devWarnOnce(message)
      devWarnOnce(message)
    })
    expect(channelWarns(message)).toHaveLength(2)

    // 语义级键是产品语义（"每列只说一次"），测试态不复位 ⇒ 第二条被吃掉。
    warnSpy.mockClear()
    inEnv('test', () => {
      devWarnOnce(`scoped body ${message}`, `column:${scopeKey}`)
      devWarnOnce(`scoped body ${message}`, `column:${scopeKey}`)
    })
    expect(channelWarns(`scoped body ${message}`)).toHaveLength(1)
  })
})
