
import { useState } from 'react'
import { Checkbox, Divider } from 'antd'
import type { CheckboxOptionType } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import {
  defaultCheckedList,
  rawColumns,
} from './_compare/hidden-columns.shared'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（split pane 自动限高 400px）
import { useVirtualization } from './VirtualizationContext'
import HiddenColumnsDg from './hidden-columns.dg'
import HiddenColumnsAntd from './hidden-columns.antd'

// Checkbox.Group 选项（列 title + key）。
const options = rawColumns.map(({ key, title }) => ({
  label: title,
  value: key,
}))

// Demo 根组件

export default function HiddenColumnsDemo() {
  // 共享状态：同一个 checkedList 同时驱动两侧表格 + 顶部 Checkbox.Group。
  const [checkedList, setCheckedList] = useState<Array<string>>([...defaultCheckedList])
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y。
  const { virtual } = useVirtualization()

  return (
    <div className="demo-view">
      {/* 共享控制条：全宽，在 SplitDemo 上方。DemoToolbar 用 useToken 适配主题。 */}
      <DemoToolbar>
        <Divider style={{ margin: '0 0 12px' }}>Columns displayed</Divider>
        <Checkbox.Group
          value={checkedList}
          options={options as CheckboxOptionType[]}
          onChange={(value) => {
            setCheckedList(value as string[])
          }}
        />
      </DemoToolbar>

      {/*
        minPaneWidth=480（8 列窄列，每列内容短，无 scroll.x）→ 横排阈值 ≈ 976。
        常规笔记本视口（≥1024）即可横排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={<HiddenColumnsDg checkedList={checkedList} virtual={virtual} />}
        right={<HiddenColumnsAntd checkedList={checkedList} virtual={virtual} />}
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd hidden-columns demo，
          共享 Checkbox.Group 同步驱动两侧 8 列显隐。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>隐藏机制差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 隐藏列仍渲染单元格 DOM（grid track 收为 <code>0fr</code> +
                  加 <code>dg-cell-hidden</code> 类占位）；antd <code>column.hidden</code> 直接不渲染该列 th/td。</li>
                <li><strong>触发条件</strong>：取消勾选某列（<code>column.hidden = true</code>）。</li>
                <li><strong>差异原因</strong>：data-grid 用 CSS Grid，需保持 track 线号稳定（多级表头列范围 /
                  固定列偏移 / 合并格区间依赖线号），故保留 <code>0fr</code> track 占位而非删除；antd 原生
                  <code>&lt;table&gt;</code> 无此约束。详见 <code>docs/features/columns/hidden-column.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>隐藏 / 显示过渡</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：两者均为瞬切（无平滑动画）。</li>
                <li><strong>触发条件</strong>：列无固定 <code>width</code> 时。</li>
                <li><strong>差异原因</strong>：CSS Grid 的 <code>grid-template-columns</code> 过渡仅对可动画尺寸
                  （px / fr / %）逐项插值；无 width 列 track 为内容尺寸（min/max-content）无法插值。
                  给列设固定 <code>width</code> 可观察到 <code>0.3s</code> 动画（如 <code>resizable</code> demo 拖拽定宽后隐藏）。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}

