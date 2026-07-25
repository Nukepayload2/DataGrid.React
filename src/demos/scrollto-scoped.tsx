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
                <strong>差异行为</strong>：右栏 antd 非虚拟模式下调用
                <code>ref.scrollTo(&#123; index &#125;)</code> 时，外层容器也可能被一起滚动。
              </li>
              <li>
                <strong>触发条件</strong>：右侧 demo 区——外层有可滚动空间时，点顶栏「Scroll
                To row 150」。观察外层 placeholder 也被顶上去。
              </li>
              <li>
                <strong>说明</strong>：该问题已在 <IssueLink /> 记录；本页用于复现外层滚动被影响的场景。
              </li>
            </Item>
            <Item title="② data-grid 对照">
              <li>
                <strong>差异行为</strong>：左栏 data-grid 的 <code>ref.scrollTo</code> 只滚动表体，外层容器不会动。
              </li>
              <li>
                <strong>触发条件</strong>：左侧 demo 区——任意外层 scrollTop 状态下点顶栏
                「Scroll To row 150」。表体滚到目标行，外层 scrollTop <strong>不变</strong>。
              </li>
              <li>
                <strong>说明</strong>：本页重点验证 scrollTo 的影响范围是否限定在表格内部。
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
                <strong>备注</strong>：data-grid 的 <code>scrollTo</code> 仅在 <code>virtual</code> 模式下生效；右栏用于复现 antd 非虚拟场景的问题。
              </li>
            </Item>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
