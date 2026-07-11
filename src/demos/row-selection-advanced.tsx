import { useState } from 'react'
import { Flex, Switch, Typography } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import RowSelectionAdvancedDg from './row-selection-advanced.dg'
import RowSelectionAdvancedAntd from './row-selection-advanced.antd'

const { Text } = Typography

export default function RowSelectionAdvancedDemo() {
  const [selectedKeys, setSelectedKeys] = useState<Array<React.Key>>([])
  const [headerDisabled, setHeaderDisabled] = useState(false)
  const [lastMultiple, setLastMultiple] = useState('Shift-click a checkbox range')

  return (
    <div style={{ padding: 24 }}>
      <DemoToolbar>
        <Flex align="center" gap="middle" wrap>
          <Switch
            checked={headerDisabled}
            onChange={setHeaderDisabled}
            checkedChildren="header disabled"
            unCheckedChildren="header enabled"
          />
          <Text type="secondary">{lastMultiple}</Text>
        </Flex>
      </DemoToolbar>
      <SplitDemo
        minPaneWidth={520}
        left={
          <RowSelectionAdvancedDg
            selectedKeys={selectedKeys}
            onSelectedKeysChange={setSelectedKeys}
            headerDisabled={headerDisabled}
            onMultiple={setLastMultiple}
          />
        }
        right={
          <RowSelectionAdvancedAntd
            selectedKeys={selectedKeys}
            onSelectedKeysChange={setSelectedKeys}
            headerDisabled={headerDisabled}
            onMultiple={setLastMultiple}
          />
        }
      >
        <div>
          <strong>对照说明：</strong>覆盖 <code>rowSelection.columnTitle</code>、
          <code>getTitleCheckboxProps</code>、<code>onCell</code> 和
          <code>onSelectMultiple</code>。表头显示自定义 Pick 文案，开关会禁用表头全选框；
          选择列单元格通过 <code>onCell</code> 注入 team 标记；先点一行 checkbox，再
          Shift-click 另一行 checkbox 可触发连续多选回调。
        </div>
      </SplitDemo>
    </div>
  )
}
