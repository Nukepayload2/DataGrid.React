import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import StyleClassDg from './semantic-styling.dg'
import StyleClassAntd from './semantic-styling.antd'

export default function StyleClassDemo() {
  const [virtual, setVirtual] = useState(true)
  const [scrollY, setScrollY] = useState(true)

  return (
    <div className="demo-view">
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
            每侧同时展示两块 Table：一块用对象形式的 styles (size=small)，另一块用函数形式 (size=medium)
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
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd style-class demo，
          方便对照给各部位设置 classNames/styles 的效果。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>行类名作用差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 的行没有 <code>&lt;tr&gt;</code> 元素，
                  <code>body.row</code>/<code>header.row</code> 设置的 class/style 作用于该行所有单元格；
                  antd 有 <code>&lt;tr&gt;</code> 元素直接承接。两侧视觉效果等价。</li>
                <li><strong>触发条件</strong>：传 <code>classNames.body.row</code> /
                  <code>styles.body.row</code> 时。</li>
                <li><strong>说明</strong>：data-grid 的行没有独立的行元素，行级样式因此作用到该行每个单元格。
                  详见 <code>docs/features/layout/layout.md</code>。</li>
              </ul>
            </li>
            <li>
              <strong>pagination 简易模式差异</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：antd 侧用 <code>pagination:&#123;pageSize:3, simple:true&#125;</code>；
                  data-grid 的 pagination 暂不支持 <code>simple</code> 选项，仅设置 <code>pageSize:3</code>。</li>
                <li><strong>触发条件</strong>：本 demo 默认配置（始终）。</li>
                <li><strong>说明</strong>：data-grid 的 pagination 配置项尚未与 antd 完全对齐，
                  <code>simple</code> 为已知差距。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
