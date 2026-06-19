/**
 * 复刻 antd `virtual-list` demo（M4 验收）：
 *   `G:\Projects\ant-design\components\table\demo\virtual-list.tsx`
 *
 * 重点：万行数据虚拟滚动 + 固定列 + scrollTo API + 合并单元格 × 虚拟。
 *
 * === 与 antd demo 的差异（M5/M9 未实现的部分）===
 *
 * - **选择（rowSelection radio）**：antd demo 默认开启 rowSelection={type:'radio'}。
 *   data-grid 行选择状态机（M5）尚未实现，本 demo **去掉** rowSelection。
 *   待 M5 完成后回归：补 `rowSelection={{ type: 'radio', columnWidth: 48 }}`。
 *
 * - **展开（expandable）**：antd demo 有 Expandable 开关，开启时去掉 onCell（合并）并加
 *   expandedRowRender。data-grid 行展开（M9）尚未实现，本 demo **去掉** expandable 开关
 *   与展开相关逻辑。待 M9 完成后回归：补 Expandable 开关 + expandable props（并验证决策 2：
 *   展开后滚动位置/窗口稳定、不跳动）。
 *
 * - **合并（onCell rowSpan/colSpan）**：**保留**（验证合并 × 虚拟）。但需注意 ★ 已知简化
 *   （见 GridTable M4 注释）：若合并格的左上角在可视区**外**（start 之前），其延伸到可视区
 *   内的覆盖部分不渲染，视觉上会出现"缺一块"。在 scrollTo 到 999 等场景下，恰好把合并区
 *   拉到边界时可能触发。完整实现需补 rc-table BodyGrid 的 extraRender 机制——留作 M4 增强。
 *   通过 `Merge` 开关可关闭合并，便于对照。
 *
 * === 保留的 antd demo 要素 ===
 *
 * - 万行数据（count: 0 / 4 / 10000）→ 验证 DOM 行数远小于总数（只渲染可视区 + overscan）。
 * - fixedColumns（ID/FirstName/LastName 固定 start，Action 固定 end）→ 验证虚拟下固定列仍 sticky。
 * - bordered / fixed 切换开关。
 * - scrollTo({ index: 999 }) 按钮 → 验证 ref.scrollTo API。
 * - scroll={{ x: 2000, y: 400 }} + virtual → 启用虚拟滚动。
 */

import { useMemo, useRef, useState } from 'react'
import { Table } from '../table'
import type { ColumnType, TableRef } from '../table'

interface RecordType {
  id: number
  firstName: string
  lastName: string
  age: number
  address1: string
  address2: string
  address3: string
}

// 含固定列 + 合并的列定义（对齐 antd virtual-list demo 的 fixedColumns）。
// 合并语义：
//   - Group 列：id % 4 === 0 的行 rowSpan=4（向下合并 4 行），其余 rowSpan=0（被覆盖）。
//   - Age 列：id % 4 === 0 的行 colSpan=2（向右合并 2 列，吃掉 Address 1）。
//   - Address 1 列：id % 4 === 0 的行 colSpan=0（被 Age 的 colSpan=2 覆盖）。
const mergedColumns: ColumnType<RecordType>[] = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 100,
    fixed: 'start',
  },
  {
    title: 'FirstName',
    dataIndex: 'firstName',
    width: 120,
    fixed: 'start',
  },
  {
    title: 'LastName',
    dataIndex: 'lastName',
    width: 120,
    fixed: 'start',
  },
  {
    title: 'Group',
    width: 120,
    render: (_, record) => `Group ${Math.floor(record.id / 4)}`,
    onCell: (record) => ({
      rowSpan: record.id % 4 === 0 ? 4 : 0,
    }),
  },
  {
    title: 'Age',
    dataIndex: 'age',
    width: 100,
    onCell: (record) => ({
      colSpan: record.id % 4 === 0 ? 2 : 1,
    }),
  },
  {
    title: 'Address 1',
    dataIndex: 'address1',
    onCell: (record) => ({
      colSpan: record.id % 4 === 0 ? 0 : 1,
    }),
  },
  {
    title: 'Address 2',
    dataIndex: 'address2',
  },
  {
    title: 'Address 3',
    dataIndex: 'address3',
  },
  {
    title: 'Action',
    width: 150,
    fixed: 'end',
    render: () => (
      <span style={{ display: 'inline-flex', gap: 8 }}>
        <a>Action1</a>
        <a>Action2</a>
      </span>
    ),
  },
]

// 关闭合并后的列定义（对齐 antd demo "expanded 时清掉 onCell" 的等价路径）。
const plainColumns: ColumnType<RecordType>[] = [
  { title: 'ID', dataIndex: 'id', width: 100, fixed: 'start' },
  { title: 'FirstName', dataIndex: 'firstName', width: 120, fixed: 'start' },
  { title: 'LastName', dataIndex: 'lastName', width: 120, fixed: 'start' },
  { title: 'Group', width: 120, render: (_, r) => `Group ${Math.floor(r.id / 4)}` },
  { title: 'Age', dataIndex: 'age', width: 100 },
  { title: 'Address 1', dataIndex: 'address1' },
  { title: 'Address 2', dataIndex: 'address2' },
  { title: 'Address 3', dataIndex: 'address3' },
  {
    title: 'Action',
    width: 150,
    fixed: 'end',
    render: () => (
      <span style={{ display: 'inline-flex', gap: 8 }}>
        <a>Action1</a>
        <a>Action2</a>
      </span>
    ),
  },
]

const getData = (length: number): RecordType[] =>
  Array.from({ length }).map<RecordType>((_, index) => ({
    id: index,
    firstName: `First_${index.toString(16)}`,
    lastName: `Last_${index.toString(16)}`,
    age: 25 + (index % 10),
    address1: `New York No. ${index} Lake Park`,
    address2: `London No. ${index} Lake Park`,
    address3: `Sydney No. ${index} Lake Park`,
  }))

export default function VirtualListDemo() {
  const [fixed, setFixed] = useState(true)
  const [bordered, setBordered] = useState(true)
  // M9（展开）已实现：补 Expandable 开关，验证决策 2（虚拟 × 展开不崩、滚动稳定）。
  // 合并 × 展开互斥（antd demo 同款：展开时清掉 onCell），故 expand 开启时强制 plainColumns。
  const [merged, setMerged] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [count, setCount] = useState(10000)

  const tblRef = useRef<TableRef>(null)

  const data = useMemo<RecordType[]>(() => getData(count), [count])

  const columns = useMemo<ColumnType<RecordType>[]>(() => {
    if (!fixed) return plainColumns.slice(0, 3) // 与 antd 一致：非 fixed 时只显示前 3 列。
    // 展开启用时强制 plainColumns（与 antd demo "Expandable 开关切到展开时清 onCell" 一致）。
    return merged && !expanded ? mergedColumns : plainColumns
  }, [fixed, merged, expanded])

  // M9：展开内容渲染（展开后行实际更高，但虚拟窗口仍按收起态 rowHeight=40 算——决策 2）。
  const expandable = expanded
    ? {
        expandedRowRender: (record: RecordType) => (
          <div style={{ padding: 8 }}>
            Expanded content for id={record.id}: {record.address1} / {record.address2}
          </div>
        ),
      }
    : undefined

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={bordered} onChange={() => setBordered(!bordered)} />
          Bordered
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={fixed} onChange={() => setFixed(!fixed)} />
          Fixed
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={merged} onChange={() => setMerged(!merged)} />
          Merged
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input type="checkbox" checked={expanded} onChange={() => setExpanded(!expanded)} />
          Expandable
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Count:
          <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
            <option value={0}>None (0)</option>
            <option value={4}>Less (4)</option>
            <option value={10000}>Lot (10000)</option>
          </select>
        </label>
        {data.length >= 1000 ? (
          <>
            <button type="button" onClick={() => tblRef.current?.scrollTo({ index: 999 })}>
              Scroll To index 999
            </button>
            <button type="button" onClick={() => tblRef.current?.scrollTo({ key: 50 })}>
              Scroll To key 50
            </button>
            <button type="button" onClick={() => tblRef.current?.scrollTo({ index: 0 })}>
              Scroll To Top
            </button>
          </>
        ) : null}
      </div>

      <p style={{ margin: '0 0 8px', color: 'rgba(0,0,0,0.65)', fontSize: 12 }}>
        ★ 决策 2（虚拟 × 展开）：展开行后该行实际 DOM 更高（多了展开内容 track），但虚拟窗口仍按
        收起态 rowHeight=40 算（不感知展开态）。展开后滚动位置/窗口稳定不崩。展开开启时强制关闭合并
        （与 antd demo 一致）。合并 × 虚拟存在已知简化（跨可视区边界的合并左上角不补画）。
      </p>

      <Table<RecordType>
        ref={tblRef}
        bordered={bordered}
        virtual
        columns={columns}
        scroll={{ x: 2000, y: 400 }}
        rowKey="id"
        dataSource={data}
        expandable={expandable}
        // 行高约定：每行 40px（决策 2：虚拟窗口按此约定算，不测量真实 DOM 高）。
        rowHeight={40}
        headerHeight={40}
      />
    </div>
  )
}
