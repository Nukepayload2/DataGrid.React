/**
 * 复刻 antd `size` demo：`G:\Projects\ant-design\components\table\demo\size.tsx`。
 *
 * === S27 落地说明 ===
 *
 * antd v6 size demo 用两个 Table 演示中等/紧凑两档行高 padding 差异：
 *   - `size="medium"`：中等行高（cell padding block 12 / inline 8）。antd demo Divider "Medium size table"。
 *   - `size="small"`：紧凑行高（cell padding block 8 / inline 8，antd 文档标注 small 用于 Modal 内）。
 *   - 另：`size="large"`（默认）虽未在本 demo 显式演示，但 size 列表页其它 demo（如 basic）默认即 large
 *     （cell padding 16 / 16）——本 demo 仅 medium + small 对照。
 *
 * data-grid 三档视觉尺寸（tokens.css `dg-size-*`，对齐 antd v6 `table/style/index.ts:544-567`）：
 *   - large（默认，无 size 类）：16 / 16。
 *   - medium = middle（dg-size-middle）：12 / 8。
 *   - small（dg-size-small）：8 / 8。
 *
 * 复刻要点：
 *   - 3 列（Name/Age/Address）+ 3 行（John Brown / Jim Green / Joe Black），逐字对齐 antd demo。
 *   - antd 用 `<Divider>Medium size table</Divider>` 作为分隔；data-grid demo 沿用既有约定
 *     （bordered.tsx 用 `<h3>`，row-selection/hidden-columns 用 border-top），这里用 antd `<Divider>`
 *     视觉等价的 `<h3>` + 底边框（避免在 size demo 引入额外 antd 依赖，保持 demo 纯净）。
 */

import { Table } from '../table'
import type { ColumnType } from '../table'

interface DataType {
  key: React.Key
  name: string
  age: number
  address: string
}

const columns: ColumnType<DataType>[] = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Address', dataIndex: 'address' },
]

const data: DataType[] = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
  { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
  { key: '3', name: 'Joe Black', age: 32, address: 'Sydney No. 1 Lake Park' },
]

/** antd `<Divider>Text</Divider>` 的视觉等价（水平分隔线 + 居中文字）。 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        margin: '24px 0 12px',
        color: 'rgba(0,0,0,0.88)',
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      <span style={{ paddingRight: 12 }}>{children}</span>
      <span style={{ flex: 1, borderTop: '1px solid #f0f0f0' }} />
    </div>
  )
}

export default function SizeDemo() {
  return (
    <div>
      <SectionLabel>Medium size table</SectionLabel>
      <Table<DataType> columns={columns} dataSource={data} size="medium" />

      <SectionLabel>Small size table</SectionLabel>
      <Table<DataType> columns={columns} dataSource={data} size="small" />
    </div>
  )
}
