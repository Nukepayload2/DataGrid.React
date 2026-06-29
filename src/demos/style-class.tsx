/**
 * 复刻 antd `style-class` demo：
 *   `G:\Projects\ant-design\components\table\demo\style-class.tsx`
 *
 * 演示 classNames/styles（对象或 `(info)=>` 函数）作用于 root/header.{cell,row,wrapper}/
 * body.{cell,row,wrapper}/title/footer/pagination.{root,item}/section/content 各槽位。
 * 深色主题逐字复刻 antd 官方 demo（不改浅色/紫色）；root class `.dg-style-class-root`
 * 的 CSS 在 `src/table/style/table.css` 末尾预定义。
 * 右栏改用 antd v6 原生 `classNames` + `styles`（替代 antd-style 库），视觉等价、零额外依赖。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import StyleClassDg from './style-class.dg'
import StyleClassAntd from './style-class.antd'

export default function StyleClassDemo() {
  const [virtual, setVirtual] = useState(true)
  const [scrollY, setScrollY] = useState(true)

  return (
    <div style={{ padding: 24 }}>
      <DemoToolbar>
        <Space wrap>
          <Switch
            checked={virtual}
            onChange={setVirtual}
            checkedChildren="Virtual"
            unCheckedChildren="Virtual"
          />
          <Switch
            checked={scrollY}
            onChange={setScrollY}
            checkedChildren="scroll.y"
            unCheckedChildren="scroll.y"
          />
          <span style={{ color: 'rgba(0,0,0,0.65)', fontSize: 12 }}>
            两块 Table 同时展示：对象 styles (size=small) + 函数 stylesFn (size=medium)
          </span>
        </Space>
      </DemoToolbar>

      <SplitDemo
        minPaneWidth={600}
        virtualizable={false}
        left={<StyleClassDg virtual={virtual} scrollY={scrollY} />}
        right={<StyleClassAntd virtual={virtual} scrollY={scrollY} />}
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd style-class demo，
          方便对照 classNames/styles 各部位注入效果。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>row 类名透传差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 表头/表体无独立 <code>&lt;tr&gt;</code>，
                  <code>body.row</code>/<code>header.row</code> 的 class/style 透传到该行所有单元格；
                  antd 作用于真实 <code>&lt;tr&gt;</code>。视觉等价。</li>
                <li><strong>触发条件</strong>：传 <code>classNames.body.row</code> /
                  <code> styles.body.row</code> 时。</li>
                <li><strong>差异原因</strong>：data-grid 用 CSS Grid，行＝多 cell 直接铺在 grid 上
                  无行容器，故行级样式分散到 cell。详见 <code>docs/design-notes/layout.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>pagination 简易模式差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：antd demo 用 <code>pagination:&#123;pageSize:3, simple:true&#125;</code>；
                  data-grid <code>TablePaginationConfig</code> 暂未暴露 <code>simple</code>，仅 <code>pageSize:3</code>。</li>
                <li><strong>触发条件</strong>：本 demo 默认配置（始终）。</li>
                <li><strong>差异原因</strong>：data-grid pagination 配置项尚未对齐 antd 全集，
                  <code>simple</code> 为已知简化。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
