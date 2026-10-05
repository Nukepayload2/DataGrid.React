import { useState } from 'react'
import { Button, Flex, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import ScrollToFirstRowDg from './scroll-to-first-row.dg'
import ScrollToFirstRowAntd from './scroll-to-first-row.antd'

function scrollBodiesDown() {
  document
    .querySelectorAll<HTMLElement>('.scroll-first-demo .dg-scroll, .scroll-first-demo .ant-table-body')
    .forEach((node) => {
      node.scrollTop = 160
    })
}

export default function ScrollToFirstRowDemo() {
  const [enabled, setEnabled] = useState(true)

  return (
    <div className="scroll-first-demo demo-view">
      <DemoToolbar>
        <Flex align="center" gap="middle" wrap>
          <Switch
            checked={enabled}
            onChange={setEnabled}
            checkedChildren="scroll first"
            unCheckedChildren="keep scroll"
          />
          <Button onClick={scrollBodiesDown}>Scroll bodies down</Button>
        </Flex>
      </DemoToolbar>
      <SplitDemo
        minPaneWidth={480}
        left={<ScrollToFirstRowDg enabled={enabled} />}
        right={<ScrollToFirstRowAntd enabled={enabled} />}
      >
        <div>
          <strong>对照说明：</strong>覆盖 <code>scroll.scrollToFirstRowOnChange</code>。
          点击 <code>Scroll bodies down</code> 后切换分页；开关开启时 data-grid 表体滚回首行，
          关闭时保留当前表体滚动位置。后栏保留 antd 的数字 <code>scroll.y</code> 对照；
          data-grid 前侧仍只使用 <code>scroll.y=true</code>，不引入 antd 的数字高度语义。
        </div>
      </SplitDemo>
    </div>
  )
}
