import { useRef, type ReactNode } from 'react'
import { Button, Space, Typography } from 'antd'
import type { GetRef } from 'antd'
import { Table as AntdTable } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import type { TableRef } from '../table'
import ScrolltoScopedDg from './scrollto-scoped.dg'
import ScrolltoScopedAntd from './scrollto-scoped.antd'

/** antd Table ref type with `scrollTo`. */
type AntdTableRef = GetRef<typeof AntdTable>

const ISSUE_URL = 'https://github.com/ant-design/ant-design/issues/46467'

function IssueLink() {
  return (
    <Typography.Link href={ISSUE_URL} target="_blank" rel="noreferrer">
      #{ISSUE_URL.split('/').pop()}
    </Typography.Link>
  )
}

function Item({
  title,
  children,
}: {
  title: ReactNode
  children: ReactNode
}) {
  return (
    <li>
      <strong>{title}</strong>
      <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>{children}</ul>
    </li>
  )
}

export default function ScrolltoScopedDemo() {
  const dgRef = useRef<TableRef>(null)
  const antdRef = useRef<AntdTableRef | null>(null)

  // 同时对两侧调用 scrollTo({ index })——两侧 outer 容器初始 scrollTop 都为 0，
  // 点按钮后即可直接对照"外层是否被动"。
  const scrollToBoth = (index: number) => {
    dgRef.current?.scrollTo({ index })
    antdRef.current?.scrollTo({ index })
  }

  return (
    <div style={{ padding: 24 }}>
      <DemoToolbar>
        <Space wrap>
          <Button onClick={() => scrollToBoth(150)}>
            Scroll To row 150 (both)
          </Button>
          <Button onClick={() => scrollToBoth(0)}>Scroll To row 0 (both)</Button>
          <span
            style={{
              color: 'var(--compare-text-secondary)',
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            两侧外层容器初始 scrollTop 都为 0。点按钮后：data-grid 表体动 / 外层不动；
            antd 外层也跟着滚（#46467）。
          </span>
        </Space>
      </DemoToolbar>

      {/*
        virtualizable=false：本 demo 自管 virtual（dg 永久 virtual、antd 永久非 virtual），
        不消费顶栏全局虚拟开关——否则 antd 侧被强制 virtual 后将走 syncScrollTop 分支不复现 bug。
      */}
      <SplitDemo
        minPaneWidth={480}
        virtualizable={false}
        left={<ScrolltoScopedDg tableRef={dgRef} />}
        right={<ScrolltoScopedAntd tableRef={antdRef} />}
      >
        <div>
          <strong>对照说明：</strong>直击 antd <IssueLink /> ——
          外层有滚动条时，<code>ref.scrollTo</code> 连外层一起滚（antd 团队确认 bug）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <Item title={`① antd 病灶（#46467）`}>
              <li>
                <strong>差异行为</strong>：右栏 antd 非虚拟模式下{' '}
                <code>ref.scrollTo(&#123; index &#125;)</code>{' '}
                的实现是 <code>scrollBodyRef.querySelector(...).scrollIntoView()</code>
                （见 rc-table <code>es/Table.js</code> L208）。原生{' '}
                <code>scrollIntoView</code> 沿 DOM 树<strong>逐层滚所有可滚动祖先</strong>，
                因此当外层容器也有滚动条时，<strong>外层会被一起滚</strong>。
              </li>
              <li>
                <strong>触发条件</strong>：右侧 demo 区——外层有可滚动空间时，点顶栏「Scroll
                To row 150」。观察外层 placeholder 也被顶上去。
              </li>
              <li>
                <strong>差异原因</strong>：rc-table 用 <code>scrollIntoView</code> 作为
                "把目标行带入视野"的实现，没有把副作用限定到表体滚动容器；issue 维护者确认
                是 bug，未修复。详见 <IssueLink />。
              </li>
            </Item>
            <Item title="② data-grid 解药（直接赋 container.scrollTop）">
              <li>
                <strong>差异行为</strong>：左栏 data-grid 的{' '}
                <code>ref.scrollTo</code> 直接给表体滚动容器的 <code>scrollTop</code>{' '}
                赋值（<code>src/table/engine/useVirtualList.ts</code> L420：
                <code>el.scrollTop = finalTop</code>；smooth 分支 L382 用{' '}
                <code>el.scrollTo&#123; top, behavior: 'instant' &#125;</code>）。
                <strong>禁用 <code>scrollIntoView</code></strong>，副作用天然限定在表体容器内。
              </li>
              <li>
                <strong>触发条件</strong>：左侧 demo 区——任意外层 scrollTop 状态下点顶栏
                「Scroll To row 150」。表体滚到目标行，外层 scrollTop <strong>不变</strong>。
              </li>
              <li>
                <strong>差异原因</strong>：data-grid 把 "scrollTo = 改一个 scrollTop" 作为
                唯一真理源（虚拟 / 非虚拟分支共用实现——非虚拟分支 engine 为 null 时 scrollTo
                为 no-op，但不会退化为 scrollIntoView）。详见{' '}
                <code>src/table/buildTableRefHandle.ts</code> +{' '}
                <code>docs/features/scrolling/virtualization.md</code>。
              </li>
            </Item>
            <Item title="③ 如何观察">
              <li>
                <strong>初始态</strong>：两侧外层容器都滚到顶部（scrollTop=0），
                上下两块 placeholder 上下夹住表格。
              </li>
              <li>
                <strong>点「Scroll To row 150」</strong>：
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  <li>
                    <strong>左栏（data-grid）</strong>：表体瞬间滚到第 150 行，
                    上下 placeholder <strong>不动</strong>（外层 scrollTop 仍为 0）。
                  </li>
                  <li>
                    <strong>右栏（antd）</strong>：表体滚到第 150 行的<strong>同时</strong>，
                    外层容器也被 <code>scrollIntoView</code> 拉动——上方 placeholder 被顶出视口、
                    下方 placeholder 滚入视口。
                  </li>
                </ul>
              </li>
              <li>
                <strong>点「Scroll To row 0」</strong>：
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  <li>
                    左栏 data-grid 表体滚回首行，外层依旧不动；右栏 antd 外层也会被
                    scrollIntoView 拉回，把表体所在区段重新对齐到外层视口。
                  </li>
                </ul>
              </li>
              <li>
                <strong>备注</strong>：data-grid 的 <code>scrollTo</code> 仅在{' '}
                <code>virtual</code> 模式下生效（publicTypes.ts L790）；antd 的 bug 仅在
                非虚拟分支（rc-table 走 scrollIntoView）触发。两侧分别按各自真理源呈现——
                这正是"实现选择不同"的可观察后果。
              </li>
            </Item>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
