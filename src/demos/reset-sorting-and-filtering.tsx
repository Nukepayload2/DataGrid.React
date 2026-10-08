import { useState } from 'react'
import { Button, Space, Switch } from 'antd'
import type { TableProps as AntdTableProps } from 'antd'
import type { TableProps as DgTableProps } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import type { RecordType } from './_compare/reset-sorting-and-filtering.shared'
import { useVirtualization } from './VirtualizationContext'
import ResetFilterDg from './reset-sorting-and-filtering.dg'
import ResetFilterAntd from './reset-sorting-and-filtering.antd'

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
    <div className="demo-view">
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
          <strong>对照说明：</strong>两栏呈现 data-grid 与 antd reset-filter demo。受控筛选/排序/重置在两侧
          行为一致：同一组 <code>filteredInfo</code>/<code>sortedInfo</code> 驱动两侧受控
          <code>filteredValue</code>/<code>sortOrder</code>，三按钮（Sort age / Clear filters /
          Clear filters and sorters）同时作用于两侧。两侧可观察差异：
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>locale 文案</strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li><strong>差异行为</strong>：data-grid 侧传了中文 locale：筛选下拉底部按钮为「确定/重置」、
                  搜索框占位文案「搜索」、树形筛选的全选「全选」、空筛选占位「无筛选」；
                  antd 侧不传 locale，保持英文（OK/Reset/Select all items/Search in filters/No filters）。</li>
                <li><strong>触发条件</strong>：打开任一列的筛选下拉。</li>
                <li><strong>说明</strong>：本 demo 故意 data-grid 侧用中文、antd 侧用英文，方便看清文案差异。
                  两侧筛选下拉文案都来自 antd 的 locale 配置，只是语言不同。</li>
              </ul>
            </li>
          </ul>
          <p style={{ margin: '8px 0 0' }}>
            末尾追加的 Status/Tag/Empty 列用于让上述筛选文案（搜索框占位、树形全选、空筛选占位）
            实际出现；与受控筛选/排序/重置无关。
            两侧均使用默认分页器，数据只有 1 页，分页条的前后翻页按钮为禁用态。已知：仅触发 filter 时 onChange 的
            <code>sorter</code> 参数可能不完整
            （data-grid 与 antd 均如此，非 bug）。
          </p>
        </div>
      </SplitDemo>
    </div>
  )
}
