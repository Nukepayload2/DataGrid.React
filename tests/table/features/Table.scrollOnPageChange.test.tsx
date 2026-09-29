// 黑盒 feature-slice 测试：表格变化（翻页 / 排序 / 筛选）后「滚回首行」的**判据**域。
//
// 分母来源声明（P-031）：本文件是 E-158 / 步骤 78 新建的「数量增加」文件。
//   来源＝步骤 76 取证分页域 skip 时留下的两格运行时读数（本棒用双臂探针 `tmp/probe-78.test.tsx`
//   复现并定性：见下「缺陷定性」）。上游 antd 无同名源文件（`components/table/__tests__/` 下
//   无 scrollOnPageChange 专测），判据依据＝**已安装裁判 antd 6.4.4** `es/table/InternalTable.js`
//   triggerOnChange 内的门 ＋ 本仓探针双臂读数。本文件 skip 0 条；未改动任何其它文件的 skip 名单。
//
// 缺陷定性（步骤 78，裁判＝antd 6.4.4；引行为必带版本 P-088）：
//   - 裁判的门＝ `scroll && scroll.scrollToFirstRowOnChange !== false && internalRef.body.current`
//     （`es/table/InternalTable.js:196-199`）。第一条是 **`scroll` 对象存在性**，不是"有没有 y"：
//     裁判把 body ref 也挂在 non-fixHeader 分支的 `.ant-table-content` 上
//     （`@rc-component/table@1.10.2/es/Table.js:552`），故 `scroll={{ x: 100 }}`（无 y）时裁判照样复位。
//   - 修复前我方门只有 `scroll?.scrollToFirstRowOnChange === false` ⇒ **不配 scroll 也照样发起滚动写入**
//     （探针 V1 翻页＝我方 1 次 / 裁判 0 次；V5a 点排序＝我方 1 次 / 裁判 0 次）。
//   - 用户可见面：两侧写入都只落在自家滚动容器，两侧 `window.scrollTo` 均 0 次
//     （探针九臂 `windowScrollTo` 恒 0、`writesOutsideTable` 恒 0）⇒ "翻页把页面滚走"**不可复现**；
//     本域判住的是**越界发起滚动写入**这条白盒行为，不是页面位移。
//   - 不追的差：裁判 `es/_util/scrollTo.js` 是 450ms raf 逐帧写同一容器（探针里 16-19 次），
//     我方同步写一次 ⇒ 次数差＝实现细节，末态同值，**不在本域断言**。
//
// 判据单一实现（不许两处各写一份 if）：
//   - 判据：`src/table/engine/useScrollMode.ts` 的 `shouldScrollToFirstRowOnChange`
//   - 唯一调用点：`src/table/Table.tsx` 的 `scrollToFirstRowOnChange` 回调（翻页 / 排序 / 筛选三路共用）
//
// 摘码反证对应关系（P-092，一次一处，详见步骤 78 日志）：
//   - 摘掉判据（回调改回 `if (scroll?.scrollToFirstRowOnChange === false) return`）⇒ 本文件
//     「未配 scroll ⇒ 不写」两条（翻页 / 排序）必红；
//   - 判据若误写成"有 y 才滚"（`return !!scroll?.y`）⇒ 本文件「只配 scroll.x 仍要滚」必红。
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'

import { Table } from '../../../src/table/index'
import { customRender } from '../../shared/render'

type Row = { key: number; name: string }
const rows: Row[] = Array.from({ length: 5 }, (_, i) => ({ key: i, name: `n${i}` }))
const columns = [
  { title: 'Name', dataIndex: 'name', sorter: true },
  { title: 'Age', dataIndex: 'age' },
]
const pagination = { pageSize: 2 }

/** 一次滚动写入（jsdom 无布局 ⇒ 真位移不可测，这里量的是"写入事件＋落点"）。 */
type ScrollWrite = { cls: string; value: number }

interface ScrollSpy {
  /** 全部 scrollTop 写入事件（含挂载期；用例只在触发后 take()，故不含挂载期）。 */
  take: () => ScrollWrite[]
  /** window.scrollTo 调用次数（"页面被滚走"的字面判据）。 */
  windowScrollTo: () => number
  /** 给容器装"可观测的既有滚动位置"（own accessor），返回读取器。 */
  prime: (el: HTMLElement, value: number) => () => number
  restore: () => void
}

function installScrollSpy(): ScrollSpy {
  const log: ScrollWrite[] = []
  const topDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop')!
  Object.defineProperty(Element.prototype, 'scrollTop', {
    configurable: true,
    get: function (this: Element) {
      return topDesc.get!.call(this) as number
    },
    set: function (this: Element, v: number) {
      log.push({ cls: this.className, value: v })
      topDesc.set!.call(this, v)
    },
  })
  const winSpy = vi.fn()
  const origWinScrollTo = window.scrollTo
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    writable: true,
    value: winSpy,
  })
  return {
    take: () => log.splice(0, log.length),
    windowScrollTo: () => winSpy.mock.calls.length,
    prime: (el: HTMLElement, value: number) => {
      let backing = value
      Object.defineProperty(el, 'scrollTop', {
        configurable: true,
        get: () => backing,
        set: (v: number) => {
          backing = v
          // own accessor 会遮蔽上面的 prototype 间谍 ⇒ 这里自己补记一次写入事件，
          // 否则"该滚的滚"三臂的落点断言读不到数。
          log.push({ cls: el.className, value: v })
        },
      })
      return () => backing
    },
    restore: () => {
      Object.defineProperty(Element.prototype, 'scrollTop', topDesc)
      Object.defineProperty(window, 'scrollTo', {
        configurable: true,
        writable: true,
        value: origWinScrollTo,
      })
    },
  }
}

let spy: ScrollSpy | null = null

afterEach(() => {
  spy?.restore()
  spy = null
})

/** 渲染一棵表并返回根节点（每臂现取节点，避免陈旧节点读数 P-112）。 */
function mount(props: Record<string, unknown>) {
  const { container } = customRender(
    <Table<any> columns={columns as never} dataSource={rows} pagination={pagination} {...props} />,
  )
  return container
}

const dgScrollNodes = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('.dg-scroll'))

const clickNextPage = (container: HTMLElement) => {
  const next = container.querySelector('.ant-pagination-next')
  const btn = next?.querySelector('button') ?? next
  expect(btn).toBeTruthy()
  spy!.take() // 丢弃挂载期读数
  fireEvent.click(btn!)
  return spy!.take()
}

const clickSorter = (container: HTMLElement) => {
  const sorters = container.querySelector('.ant-table-column-sorters')
  expect(sorters).toBeTruthy()
  spy!.take()
  fireEvent.click(sorters!)
  return spy!.take()
}

/** 只算落在"表内滚动容器"上的写入；其余一律视作越界落点（本域两侧都不该出现）。 */
const onTableContainer = (list: ScrollWrite[]) => list.filter((w) => w.cls.includes('dg-scroll'))

describe('scrollToFirstRowOnChange 判据（翻页 / 排序触发面）', () => {
  // ============ 不该滚的不滚：V1（无 scroll）＋ V5a（无 scroll ＋ 排序）============
  it('未配 scroll 时翻页不发起任何滚动写入（对齐裁判 scroll && 短路）', () => {
    spy = installScrollSpy()
    const container = mount({})
    const writes = clickNextPage(container)
    expect(writes.length).toBe(0)
    expect(spy.windowScrollTo()).toBe(0)
  })

  it('未配 scroll 时点排序同样不发起滚动写入（三路共用一份判据）', () => {
    spy = installScrollSpy()
    const container = mount({})
    const writes = clickSorter(container)
    expect(onTableContainer(writes).length).toBe(0)
    expect(spy.windowScrollTo()).toBe(0)
  })

  it('scrollToFirstRowOnChange:false ＋ 无 y ⇒ 完全不写（显式抑制面）', () => {
    spy = installScrollSpy()
    const container = mount({ scroll: { scrollToFirstRowOnChange: false } })
    expect(clickNextPage(container).length).toBe(0)
  })

  // ============ 该滚的滚：V1b（只配 x）＋ V2（y=true）＋ V6（排序 ＋ y=true）============
  it('只配 scroll.x（无 y）时翻页仍滚回首行（判据是 scroll 存在性，不是有 y）', () => {
    spy = installScrollSpy()
    const container = mount({ scroll: { x: 100 } })
    const nodes = dgScrollNodes(container)
    expect(nodes.length).toBeGreaterThan(0)
    const readers = nodes.map((n) => spy!.prime(n, 120))
    const writes = clickNextPage(container)
    expect(onTableContainer(writes).length).toBeGreaterThan(0)
    // 复位语义：被滚开的那个容器写回 0（写入值＝0，与裁判 scrollTo(0) 同值）
    expect(readers.some((r) => r() === 0)).toBe(true)
  })

  it('scroll.y=true 时翻页把滚动位置写回 0（数据区域模式该滚）', () => {
    spy = installScrollSpy()
    const container = mount({ scroll: { y: true } })
    const nodes = dgScrollNodes(container)
    expect(nodes.length).toBeGreaterThan(0)
    const read = spy.prime(nodes[0]!, 120)
    const writes = clickNextPage(container)
    expect(onTableContainer(writes).length).toBeGreaterThan(0)
    expect(read()).toBe(0)
  })

  it('scroll.y=true 时点排序也把滚动位置写回 0（sort 面同判据）', () => {
    spy = installScrollSpy()
    const container = mount({ scroll: { y: true } })
    const nodes = dgScrollNodes(container)
    expect(nodes.length).toBeGreaterThan(0)
    const read = spy.prime(nodes[0]!, 120)
    const writes = clickSorter(container)
    expect(onTableContainer(writes).length).toBeGreaterThan(0)
    expect(read()).toBe(0)
  })

  it('scroll.y=true ＋ scrollToFirstRowOnChange:false 时翻页不滚（false 优先）', () => {
    spy = installScrollSpy()
    const container = mount({ scroll: { y: true, scrollToFirstRowOnChange: false } })
    const nodes = dgScrollNodes(container)
    expect(nodes.length).toBeGreaterThan(0)
    const read = spy.prime(nodes[0]!, 120)
    expect(clickNextPage(container).length).toBe(0)
    expect(read()).toBe(120)
  })

  // ============ 越界字面判住：任何配置都不许写 window / 表外元素 ============
  it('四臂配置下滚动写入只落在自家 .dg-scroll，window.scrollTo 恒 0 次', () => {
    for (const props of [
      {},
      { scroll: { x: 100 } },
      { scroll: { y: true } },
      { scroll: { y: true, scrollToFirstRowOnChange: false } },
    ]) {
      spy = installScrollSpy()
      const container = mount(props)
      const writes = clickNextPage(container)
      expect(spy.windowScrollTo(), `window.scrollTo with ${JSON.stringify(props)}`).toBe(0)
      for (const w of writes) {
        expect(w.cls, `越界落点 with ${JSON.stringify(props)}`).toContain('dg-scroll')
        expect(w.value, `写入值 with ${JSON.stringify(props)}`).toBe(0)
      }
      spy.restore()
      spy = null
    }
  })
})
