/**
 * reset-filter 双栏对照 demo：复刻 antd reset-filter demo。
 *
 * 左栏 data-grid / 右栏 antd Table 受控 filteredValue/sortOrder + 外部按钮一键重置，
 * 共享同一组 `filteredInfo`/`sortedInfo` state（两侧 column.key 同名）+ 共享 onChange（写回同一组 state，
 * 任一栏点排序/筛选都会同步另一栏）+ 共享 Bordered 开关 + 三按钮（Sort age / Clear filters /
 * Clear filters and sorters）。三列均带 `key` + `ellipsis`。共享数据见 `_compare/reset-filter.shared.ts`。
 *
 * demo 末尾追加的 Status/Tag/Empty 列用于 locale 文案验证：左栏 data-grid 传中文 locale，右栏 antd 保持英文对照
 * （filterConfirm/filterReset/filterSearchPlaceholder/filterCheckAll/filterEmptyText 五个 key）。
 */

import { useState } from 'react'
import { Button, Space, Switch } from 'antd'
import type { TableProps as AntdTableProps } from 'antd'
import type { TableProps as DgTableProps } from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
import type { RecordType } from './_compare/reset-filter.shared'
// 全局虚拟化开关接入：开关 ON 时叠加 virtual + scroll.y（SplitDemo pane 自动限高，虚拟窗口才有滚动区）
import { useVirtualization } from './VirtualizationContext'
import ResetFilterDg from './reset-filter.dg'
import ResetFilterAntd from './reset-filter.antd'

// 受控 state 类型（父持有 filteredInfo/sortedInfo + handleChange 写回 state）。
type OnChange = NonNullable<DgTableProps<RecordType>['onChange']>
type AntdOnChange = NonNullable<AntdTableProps<RecordType>['onChange']>
type Filters = Parameters<OnChange>[1]
type GetSingle<T> = T extends (infer U)[] ? U : never
type Sorts = GetSingle<Parameters<OnChange>[2]>

// ---------------------------------------------------------------------------
// Demo 根组件
// ---------------------------------------------------------------------------

export default function ResetFilterDemo() {
  // 共享受控 state：同一组 filteredInfo/sortedInfo 同时驱动两侧受控
  // filteredValue/sortOrder（两侧 column.key 同名，故同一份 state 即可双驱动）。
  const [filteredInfo, setFilteredInfo] = useState<Filters>({})
  const [sortedInfo, setSortedInfo] = useState<Sorts>({})
  // 共享 Bordered 开关。
  const [bordered, setBordered] = useState(false)
  // 全局虚拟化开关接入：开关 ON 时两栏叠加 virtual=true + scroll.y。
  const { virtual } = useVirtualization()

  // 两侧共用同一个 onChange：写回同一组 state → 两侧受控同步。
  // 已知：filter 触发时 onChange 的 sorter 字段可能不完整（data-grid 与 antd 均如此，不修）。
  const handleChange: OnChange = (_pagination, filters, sorter) => {
    // eslint-disable-next-line no-console
    console.log('reset-filter demo onChange params:', { filters, sorter })
    setFilteredInfo(filters)
    setSortedInfo(sorter as Sorts)
  }

  // 清空所有筛选（保留排序）。两侧 state 同步清空。
  const clearFilters = () => {
    setFilteredInfo({})
  }

  // 清空所有筛选 + 排序（回到全量未排序初始态）。两侧 state 同步清空。
  const clearAll = () => {
    setFilteredInfo({})
    setSortedInfo({})
  }

  // 外部设置 Age 列降序。两侧 state 同步设置。
  const setAgeSort = () => {
    setSortedInfo({
      order: 'descend',
      columnKey: 'age',
    })
  }

  return (
    <div style={{ padding: 24 }}>
      {/* 共享控制条：全宽，在 SplitDemo 上方。DemoToolbar 用 useToken 适配主题。 */}
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

      {/*
        minPaneWidth=480（窄表，3 列无 scroll.x；ellipsis 列默认 tableLayout:fixed 撑满 100%）→
        横排阈值 ≈ 976。常规笔记本视口（≥1024）即可横排；窄视口自动换行竖排。
      */}
      <SplitDemo
        minPaneWidth={480}
        left={
          <ResetFilterDg
            filteredInfo={filteredInfo}
            sortedInfo={sortedInfo}
            bordered={bordered}
            virtual={virtual}
            onChange={handleChange}
          />
        }
        right={
          <ResetFilterAntd
            filteredInfo={filteredInfo}
            sortedInfo={sortedInfo}
            bordered={bordered}
            virtual={virtual}
            onChange={handleChange as AntdOnChange}
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
