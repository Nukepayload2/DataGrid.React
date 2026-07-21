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
  // data-grid 专属：scrollBarFoldMode（组件级滚动条 visibility / fold 真理源）。
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
    <div style={{ padding: 24 }}>
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
            顶栏开关仅驱动左栏（data-grid 组件级配置）；右栏 antd 无对应 API。
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
          <strong>对照说明：</strong>直击 antd <IssueLink /> 虚拟滚动条不可点
          （虚拟滚动条只能拖 thumb，无法点击轨道空白处按页跳转）。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <Item title="① antd 病灶（#53813）">
              <li>
                <strong>差异行为</strong>：右栏 antd 虚拟滚动条由 <code>rc-virtual-list</code> 自绘
                （<code>.rc-virtual-list-scrollbar</code> +
                {' '}
                <code>.rc-virtual-list-scrollbar-thumb</code>），只有 thumb 本体可拖；
                点击轨道空白处<strong>无反应</strong>（既不跳页也不定位）。横向、纵向两条都如此。
              </li>
              <li>
                <strong>触发条件</strong>：右栏表体任意纵向 / 横向滚动条轨道空白处点击。
              </li>
              <li>
                <strong>差异原因</strong>：<code>rc-virtual-list</code> 未实现 track click /
                page jump / 箭头按钮；issue 维护者回复"已记录建议，待未来版本评估"，
                无 linked PR、无实现计划。详见 <IssueLink />。
              </li>
            </Item>
            <Item title="② data-grid 解药（FloatingScrollBar）">
              <li>
                <strong>差异行为</strong>：左栏 data-grid 用自研
                {' '}
                <code>FloatingScrollBar</code>（<code>src/table/engine/FloatingScrollBar.tsx</code>）
                替代原生条——视觉默认 2px 半透明细线，<strong>8px hit 区</strong>命中范围
                （hover / 拖动时 thumb 展开为 8px 实色）；在整个 8px hit 区内
                {' '}
                <code>pointerdown</code> 命中 thumb 即<strong>起拖</strong>，无需精确瞄准 2px thumb。
                拖动过程中容器 <code>scrollTop/scrollLeft</code> 平滑跟随；原生滚轮 /
                程序 scroll 完整保留。
              </li>
              <li>
                <strong>轨道点击按页跳转</strong>：点在 thumb 之外的轨道空白处
                {' '}
                <code>pointerdown</code> 不再进入增量拖动——改为向点击方向<strong>按页跳一视口</strong>
                （垂直：点 thumb 上方→向上一页 / 下方→向下一页；水平：点 thumb 左方→向左一页 /
                右方→向右一页），与浏览器原生滚动条轨道点击行为一致。命中检测算法是纯函数
                {' '}
                <code>computeTrackJump</code>（<code>src/table/engine/floatingScrollBarUtils.ts</code>），
                单测覆盖各分支与边界。
              </li>
              <li>
                <strong>触发条件</strong>：左栏滚动条 hit 区（右侧 8px 纵 / 底部 8px 横）任意
                {' '}
                <code>pointerdown + drag</code>（命中 thumb 时）/ 单
                {' '}
                <code>pointerdown</code>（命中轨道空白时即按页跳）；或滚轮 / 顶栏「Scroll To」按钮。
              </li>
              <li>
                <strong>差异原因</strong>：原生滚动容器 <code>overflow:auto</code> 保留滚轮 / 程序
                {' '}
                <code>scroll</code>；悬浮条仅替代视觉与交互入口——<code>pointerdown</code> 绑在 hit 容器，
                先做命中检测（clientY/X vs thumb 屏幕坐标）：thumb 上 → <code>setPointerCapture</code>
                {' '}
                + window <code>pointermove</code> 换算 delta → 更新容器 scroll（增量拖动）；thumb 外 →
                {' '}
                <code>computeTrackJump</code> 算出 ±viewportSize 的目标位置直接赋给容器 scroll（按页跳）。
                详见 <code>docs/features/scrolling/scrollbar.md</code>。
              </li>
            </Item>
            <Item title="③ 组件级 scrollBarFoldMode（visibility 真理源）">
              <li>
                <strong>差异行为</strong>：左栏支持组件级配置
                {' '}
                <code>gridOptions.scrollBarFoldMode = {'{ showOnTableHover, expandOnHover }'}</code>
                ——三态可观察：
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  <li>
                    <code>showOnTableHover:false, expandOnHover:true</code>（默认）：
                    滚动条 2px 细线常驻；hover 8px hit 区 → thumb 展开为 8px。
                  </li>
                  <li>
                    <code>showOnTableHover:true, expandOnHover:true</code>：
                    未 hover 表格时隐藏；hover 表格 / hit 区 / 触摸后显示并展开。
                  </li>
                  <li>
                    <code>expandOnHover:false</code>：thumb 始终以展开尺寸显示（不做 2px→8px 过渡）。
                  </li>
                </ul>
                右栏 antd 无对应组件级 API（只能用全局 ConfigProvider 或 CSS 覆盖）。
              </li>
              <li>
                <strong>触发条件</strong>：顶栏 <code>showOnTableHover</code> /
                {' '}
                <code>expandOnHover</code> 开关；hover 左栏滚动条 hit 区。
              </li>
              <li>
                <strong>差异原因</strong>：data-grid 把"滚动条折叠 / 显示"做成组件级配置
                （<code>ScrollBarFoldMode</code> 导出自 <code>../table</code>）；antd 侧无对等项。
              </li>
            </Item>
            <Item title="如何观察">
              <li>
                <strong>拖 thumb（两侧）</strong>：在两侧滚动条 thumb 上 pointerdown + 拖动，
                表体平滑滚动；左栏 thumb 因 8px hit 区<strong>更易命中</strong>。
              </li>
              <li>
                <strong>轨道按页跳（左栏专属，#33）</strong>：左栏点击 thumb 之外的轨道空白
                {' '}
                <code>pointerdown</code>——向点击方向<strong>按页跳一视口</strong>（垂直：上/下方；
                水平：左/右方），松开不进入拖动；右栏 thumb 之外 pointerdown 无响应（#53813 病灶）。
                <strong>按住轨道空白不放</strong>：500ms 后开始连续翻页（每 50ms 一页 = 20 CPS，
                Windows repeat button 手感），三种条件停止——松开 pointer / 翻到边界 / pointer
                {' '}
                移到 thumb 上。
              </li>
              <li>
                <strong>hit 区（左栏专属）</strong>：左栏 thumb 之外的 8px 透明 hit 区
                {' '}
                <code>pointerdown</code> 命中 thumb 即起拖；命中轨道即按页跳。
              </li>
              <li>
                <strong>切 visibility（左栏专属）</strong>：拨动顶栏
                {' '}
                <code>showOnTableHover</code> / <code>expandOnHover</code>，
                看左栏滚动条形态变化（常驻细线 / 仅 hover 表格才显 / hover hit 区展开）。
              </li>
              <li>
                <strong>程序滚动（两侧）</strong>：点「Scroll To index 5000 / Top」按钮，
                观察两侧 <code>scrollTo</code> 的 thumb 同步动画。
              </li>
            </Item>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
