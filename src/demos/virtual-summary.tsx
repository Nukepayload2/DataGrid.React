import { useMemo, useState } from 'react'
import { Alert, Segmented, Space, Switch, Typography } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import { getData } from './_compare/virtual-list.shared'
import VirtualSummaryDg from './virtual-summary.dg'
import VirtualSummaryAntd from './virtual-summary.antd'

const ISSUE_URL = 'https://github.com/ant-design/ant-design/issues/47184'

export default function VirtualSummaryDemo() {
  // 数据量切换：1万 / 10万——证明虚拟化下 summary 仍正常工作。
  const [count, setCount] = useState<number>(10000)
  // antd 侧 #47184 的唯一 workaround 开关。默认 false 如实呈现失效态。
  const [antdFixedSummary, setAntdFixedSummary] = useState(false)

  const data = useMemo(() => getData(count), [count])

  return (
    <div className="demo-view">
      <DemoToolbar>
        <Space wrap>
          <Segmented
            value={count}
            onChange={(val) => setCount(val as number)}
            options={[
              { label: '1万行', value: 10000 },
              { label: '10万行', value: 100000 },
            ]}
          />
          <Switch
            checked={antdFixedSummary}
            onChange={setAntdFixedSummary}
            checkedChildren="antd Summary fixed"
            unCheckedChildren="antd Summary fixed"
          />
        </Space>
      </DemoToolbar>

      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message={
          <>
            antd 在 <code>virtual</code> 模式下 <code>summary</code> 失效——维护者在{' '}
            <Typography.Link href={ISSUE_URL} target="_blank" rel="noreferrer">
              #47184
            </Typography.Link>{' '}
            中确认「虚拟下 summary 只能用 fixed」。antd 如实呈现：开关关闭时 summary 异常/不可见；开启后才作为 workaround 钉底显示。
          </>
        }
      />

      <SplitDemo
        minPaneWidth={560}
        virtualizable={false}
        left={<VirtualSummaryDg data={data} />}
        right={
          <VirtualSummaryAntd data={data} fixedSummary={antdFixedSummary} />
        }
      >
        <div>
          <strong>对照说明：</strong>两栏均开启 <code>virtual</code> 渲染万行/十万行数据，并启用 <code>Table.Summary</code> 表尾汇总。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>antd 病灶（#47184）</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：antd <code>virtual</code> 下 <code>summary</code> 函数虽被调用，但非 fixed 的 summary 可能无法正常呈现。</li>
                <li><strong>触发条件</strong>：顶栏「antd Summary fixed」开关关闭（默认）时即可观察到 summary 缺失。</li>
                <li><strong>说明</strong>：<Typography.Link href={ISSUE_URL} target="_blank" rel="noreferrer">antd#47184</Typography.Link> 记录了「虚拟下 summary 只能 fixed」的限制。</li>
              </ul>
            </li>
            <li>
              <strong>data-grid 解药</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid summary 始终可见——虚拟滚动表体时汇总行（共 N 行 / 均龄）钉在表尾视口底部，数值正确更新。</li>
                <li><strong>触发条件</strong>：任意滚动表体。</li>
                <li><strong>说明</strong>：data-grid 在虚拟滚动下仍能稳定显示汇总行；使用 <code>&lt;Table.Summary fixed&gt;</code> 可让汇总行固定在底部。</li>
              </ul>
            </li>
            <li>
              <strong>如何观察</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>data-grid</strong>：滚动表体（滚轮/拖拽滚动条/键盘 PgDn），表尾汇总行始终钉在底部，「共 N 行 / 均龄 X」数值正确。</li>
                <li><strong>antd</strong>：默认（fixed 关闭）summary 异常或不可见——这是 #47184 的真实表现，未做任何美化；开启「antd Summary fixed」后 summary 钉底显示（官方唯一 workaround）。</li>
                <li><strong>切换数据量</strong>：1万 ↔ 10万——两侧均保持虚拟化流畅滚动；data-grid summary 数值随数据量正确更新。</li>
              </ul>
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
