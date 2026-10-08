import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Button, Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import type { TableRef, ScrollBarFoldMode } from '../table'
import type { GetRef } from 'antd'
import { Table as AntdTable } from 'antd'
import ClickableScrollbarDg from './clickable-scrollbar.dg'
import ClickableScrollbarAntd from './clickable-scrollbar.antd'

/** antd Table ref type with `scrollTo`. */
type AntdTableRef = GetRef<typeof AntdTable>

const ISSUE_URL = 'https://github.com/ant-design/ant-design/issues/53813'

function IssueLink() {
  return (
    <a href={ISSUE_URL} target="_blank" rel="noreferrer">
      #53813
    </a>
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

export default function ClickableScrollbarDemo() {
  // data-grid 专属：scrollBarFoldMode 控制滚动条显示策略。
  const [showOnTableHover, setShowOnTableHover] = useState(false)
  const [expandOnHover, setExpandOnHover] = useState(true)

  const dgRef = useRef<TableRef>(null)
  const antdRef = useRef<AntdTableRef | null>(null)

  const scrollBarFoldMode = useMemo<ScrollBarFoldMode>(
    () => ({ showOnTableHover, expandOnHover }),
    [showOnTableHover, expandOnHover],
  )

  // 同时对两侧做程序滚动（观察 thumb 同步动画）。
  const scrollToBoth = (opts: { index?: number; key?: import('react').Key }) => {
    dgRef.current?.scrollTo(opts)
    antdRef.current?.scrollTo(opts)
  }

  return (
    <div className="demo-view">
      <DemoToolbar>
        <Space wrap>
          <Switch
            checked={showOnTableHover}
            onChange={setShowOnTableHover}
            checkedChildren="showOnTableHover"
            unCheckedChildren="showOnTableHover"
          />
          <Switch
            checked={expandOnHover}
            onChange={setExpandOnHover}
            checkedChildren="expandOnHover"
            unCheckedChildren="expandOnHover"
          />
          <Button onClick={() => scrollToBoth({ index: 5000 })}>
            Scroll To index 5000 (both)
          </Button>
          <Button onClick={() => scrollToBoth({ index: 0 })}>
            Scroll To Top (both)
          </Button>
          <span style={{ color: 'var(--compare-text-secondary)', fontSize: 12 }}>
            顶栏开关仅驱动 data-grid（data-grid 组件级配置）；antd 无对应 API。
          </span>
        </Space>
      </DemoToolbar>

      {/*
        minPaneWidth=1000 → 横排阈值 ≈ 1000×2 + 16 = 2016px。
        本 demo 是宽表（11 列 / scroll.x:2200），需要足够宽度才能横向展示完整悬浮条 +
        双侧可对照；常规笔记本视口（<2016）会自动竖排，仍可完整交互。
        virtualizable=false：自身永久 virtual=true、自管高度，不消费顶栏全局虚拟开关
        （与 virtual-list.tsx 一致）。
      */}
      <SplitDemo
        minPaneWidth={1000}
        virtualizable={false}
        left={
          <ClickableScrollbarDg
            tableRef={dgRef}
            scrollBarFoldMode={scrollBarFoldMode}
          />
        }
        right={<ClickableScrollbarAntd tableRef={antdRef} />}
      >
        <div>
          <strong>对照说明：</strong>针对 antd <IssueLink /> 的问题：虚拟滚动条不可点
          （只能拖 thumb，无法点击滚动条空白处按页跳转）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <Item title="① antd 的问题（#53813）">
              <li>
                <strong>差异行为</strong>：antd 虚拟滚动条只能拖 thumb；
                点击滚动条空白处<strong>无反应</strong>（既不跳页也不定位）。横向、纵向两条都如此。
              </li>
              <li>
                <strong>触发条件</strong>：antd 表体任意纵向 / 横向滚动条空白处点击。
              </li>
              <li>
                <strong>说明</strong>：该交互缺口记录在 <IssueLink />；本页用于对照滚动条点击和拖拽行为。
              </li>
            </Item>
            <Item title="② data-grid 对照">
              <li>
                <strong>差异行为</strong>：data-grid 滚动条提供更大的可点击区域；hover / 拖动时滑块变粗，更容易拖动。
                拖动过程中表体滚动平滑跟随；滚轮和程序滚动仍正常工作。
              </li>
              <li>
                <strong>滚动条点击按页跳转</strong>：点击 thumb 之外的滚动条空白处，
                向点击方向<strong>按页跳一视口</strong>
                （垂直：点 thumb 上方→向上一页 / 下方→向下一页；水平：点 thumb 左方→向左一页 /
                右方→向右一页），与浏览器原生滚动条点击行为一致。
              </li>
              <li>
                <strong>触发条件</strong>：拖动 data-grid 滚动条的 thumb，或点击滚动条空白处
                （即按页跳）；或滚轮 / 顶栏「Scroll To」按钮。
              </li>
              <li>
                <strong>说明</strong>：滚轮、键盘和 scrollTo 仍正常滚动表体；滚动条只提供更易用的视觉和点击入口。
              </li>
            </Item>
            <Item title="③ scrollBarFoldMode 显示策略">
              <li>
                <strong>差异行为</strong>：data-grid 支持组件级配置
                {' '}
                <code>gridOptions.scrollBarFoldMode = {'{ showOnTableHover, expandOnHover }'}</code>
                ——三态可观察：
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  <li>
                    <code>showOnTableHover:false, expandOnHover:true</code>（默认）：
                    滚动条 2px 细线常驻；鼠标悬停到滚动条上时 thumb 展开为 8px。
                  </li>
                  <li>
                    <code>showOnTableHover:true, expandOnHover:true</code>：
                    未 hover 表格时隐藏；hover 表格或滚动条后显示并展开。
                  </li>
                  <li>
                    <code>expandOnHover:false</code>：thumb 始终以展开尺寸显示（不做 2px→8px 过渡）。
                  </li>
                </ul>
                antd 无对应组件级 API（只能用全局 ConfigProvider 或 CSS 覆盖）。
              </li>
              <li>
                <strong>触发条件</strong>：顶栏 <code>showOnTableHover</code> /
                {' '}
                <code>expandOnHover</code> 开关；hover data-grid 滚动条。
              </li>
              <li>
                <strong>说明</strong>：data-grid 可通过配置控制滚动条何时显示；antd 没有对应开关。
              </li>
            </Item>
            <Item title="如何观察">
              <li>
                <strong>拖 thumb（两侧）</strong>：按住两侧滚动条的 thumb 拖动，
                表体平滑滚动；data-grid 滚动条有 8px 宽的按压区域，<strong>更易按住</strong>。
              </li>
              <li>
                <strong>滚动条按页跳（data-grid 专属）</strong>：点击 data-grid thumb 之外的滚动条空白——
                向点击方向<strong>按页跳一视口</strong>（垂直：上/下方；
                水平：左/右方），松开不进入拖动；antd 点击 thumb 之外无响应（即 #53813 记录的问题）。
                <strong>按住滚动条空白不放</strong>：500ms 后开始连续翻页（每 50ms 一页），
                三种条件停止——松开按钮 / 翻到边界 / 鼠标移到 thumb 上。
              </li>
              <li>
                <strong>8px 宽（data-grid 专属）</strong>：data-grid 滚动条有 8px 宽的按压区域
                （可见细线 2px，hover 时展开为 8px），
                按到 thumb 即拖动，按到空白即按页跳。
              </li>
              <li>
                <strong>切 visibility（data-grid 专属）</strong>：拨动顶栏
                {' '}
                <code>showOnTableHover</code> / <code>expandOnHover</code>，
                看 data-grid 滚动条形态变化（常驻细线 / 仅 hover 表格才显 / hover 滚动条展开）。
              </li>
              <li>
                <strong>程序滚动（两侧）</strong>：点「Scroll To index 5000 / Top」按钮，
                观察两侧 <code>scrollTo</code> 的 thumb 同步定位（瞬时跳转，无平滑动画）。
              </li>
            </Item>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
