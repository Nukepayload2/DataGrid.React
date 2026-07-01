import { useState } from 'react'
import { Button, Space, Switch } from 'antd'
import type { TableProps as AntdTableProps } from 'antd'
import type { TableProps as DgTableProps } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import type { RecordType } from './_compare/reset-filter.shared'
import { useVirtualization } from './VirtualizationContext'
import ResetFilterDg from './reset-filter.dg'
import ResetFilterAntd from './reset-filter.antd'

type OnChange = NonNullable<DgTableProps<RecordType>['onChange']>
type AntdOnChange = NonNullable<AntdTableProps<RecordType>['onChange']>
type Filters = Parameters<OnChange>[1]
type GetSingle<T> = T extends (infer U)[] ? U : never
type Sorts = Pick<GetSingle<Parameters<OnChange>[2]>, 'columnKey' | 'order'>

export default function ResetFilterDemo() {
  const [filteredInfo, setFilteredInfo] = useState<Filters>({})
  const [sortedInfo, setSortedInfo] = useState<Sorts>({})
  const [bordered, setBordered] = useState(false)
  const { virtual } = useVirtualization()

  const handleDgChange: OnChange = (_pagination, filters, sorter) => {
    // eslint-disable-next-line no-console
    console.log('reset-filter demo onChange params:', { filters, sorter })
    setFilteredInfo(filters)
    setSortedInfo(sorter as Sorts)
  }
  const handleAntdChange: AntdOnChange = (_pagination, filters, sorter) => {
    // eslint-disable-next-line no-console
    console.log('reset-filter demo onChange params:', { filters, sorter })
    setFilteredInfo(filters as Filters)
    setSortedInfo(sorter as unknown as Sorts)
  }

  const clearFilters = () => {
    setFilteredInfo({})
  }

  const clearAll = () => {
    setFilteredInfo({})
    setSortedInfo({})
  }

  const setAgeSort = () => {
    setSortedInfo({
      order: 'descend',
      columnKey: 'age',
    })
  }

  return (
    <div style={{ padding: 24 }}>
      <DemoToolbar>
        <Space>
          <Switch
            checked={bordered}
            onChange={setBordered}
            checkedChildren="Bordered"
            unCheckedChildren="Bordered"
          />
          <Button onClick={setAgeSort}>Sort age</Button>
          <Button onClick={clearFilters}>Clear filters</Button>
          <Button onClick={clearAll}>Clear filters and sorters</Button>
        </Space>
      </DemoToolbar>

      <SplitDemo
        minPaneWidth={480}
        left={
          <ResetFilterDg
            filteredInfo={filteredInfo}
            sortedInfo={sortedInfo}
            bordered={bordered}
            virtual={virtual}
            onChange={handleDgChange}
          />
        }
        right={
          <ResetFilterAntd
            filteredInfo={filteredInfo}
            sortedInfo={sortedInfo}
            bordered={bordered}
            virtual={virtual}
            onChange={handleAntdChange}
          />
        }
      >
        <div>
          <strong>对照说明：</strong>左右并排呈现 data-grid 与 antd reset-filter demo。受控筛选/排序/重置在两侧
          行为一致：同一组 <code>filteredInfo</code>/<code>sortedInfo</code> 驱动两侧受控
          <code>filteredValue</code>/<code>sortOrder</code>，三按钮（Sort age / Clear filters /
          Clear filters and sorters）同时作用于两侧。两侧可观察差异：
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>locale 文案</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：左栏 data-grid 传中文 locale（漏斗下拉底部「确定/重置」、
                  tree 全选「全选」、搜索框 placeholder「搜索」、空筛选项占位「无筛选」）；
                  右栏 antd 不传 locale，保持英文（OK/Reset/Select all/Search/No filters）。</li>
                <li><strong>触发条件</strong>：打开任一列漏斗下拉。</li>
                <li><strong>差异原因</strong>：本 demo 用左侧中文 / 右侧英文对照验证 locale key 注入。
                  两侧机制相同（同一套 antd FilterDropdown locale），仅文案不同。</li>
              </ul>
            </li>
          </ul>
          <p style={{ margin: '8px 0 0' }}>
            末尾追加的 Status/Tag/Empty 列用于触发上述 locale 文案分支；与受控筛选/排序/重置无关。
            两栏均显式 <code>pagination=&#123;&#123;&#125;&#125;</code>（antd 默认分页器），表底一致出现
            disabled 态分页条。已知：filter 触发时 onChange 的 <code>sorter</code> 字段可能不完整
            （data-grid 与 antd 均如此，非 bug）。
          </p>
        </div>
      </SplitDemo>
    </div>
  )
}
