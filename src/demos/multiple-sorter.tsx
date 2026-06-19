/**
 * 复刻 antd multiple-sorter demo：`G:\Projects\ant-design\components\table\demo\multiple-sorter.tsx`。
 *
 * === antd demo 要素（S2 多列排序）===
 *
 * - 各分数列带 `sorter: { compare, multiple }`：
 *     * Chinese Score：multiple=3
 *     * Math Score：multiple=2
 *     * English Score：multiple=1（最小=最高优先级）
 *   Name 列不可排序。
 * - 点击多列表头叠加排序——点击一列只改该列自身 order，不清空其它列（多列语义）。
 * - 数据按 multiple 优先级叠加：先按 multiple 大的粗排、再按 multiple 小的细排，
 *   最终 multiple 最小的列是"最终决定序"（最高优先级）。
 * - 表头 caret 旁显示优先级数字（1/2/3…，按 multiple 升序；1 = 最高优先级）。
 * - onChange 返回 `SorterResult[]`（多列激活时）；console.log 各参数。
 *
 * === 验证点（S2）===
 *
 * 1. 点击 English（multiple=1）descend → 排序结果以 English 为主序（最高优先级）。
 * 2. 再点击 Math（multiple=2）descend → English 仍激活，叠加：English 相等时按 Math 排。
 * 3. 再点击 Chinese（multiple=3）descend → 三列叠加；表头分别显示 1（English）/ 2（Math）/ 3（Chinese）。
 * 4. 点击已激活列继续循环（descend → null → ascend → descend）；某列 null 时从优先级链中移除。
 * 5. onChange sorter 为数组（多列激活时）/ 单对象（仅一列激活时）/ `{}`（无激活）。
 *
 * === data-grid 实现说明 ===
 *
 * 多列状态机见 `src/table/engine/useSorter.ts`（S2 扩展）；表头优先级序号由 SortIndicator 的
 * `priority` prop 渲染（`src/table/engine/SortIndicator.tsx`）。本 demo 仅配置 columns + onChange，
 * 与 antd demo 等价（无任何 data-grid 扩展 API）。
 */

import { Table } from '../table'
import type { ColumnType, TableProps } from '../table'

interface DataType {
  key: React.Key
  name: string
  chinese: number
  math: number
  english: number
}

const columns: ColumnType<DataType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
  },
  {
    title: 'Chinese Score',
    dataIndex: 'chinese',
    sorter: {
      compare: (a, b) => a.chinese - b.chinese,
      multiple: 3,
    },
  },
  {
    title: 'Math Score',
    dataIndex: 'math',
    sorter: {
      compare: (a, b) => a.math - b.math,
      multiple: 2,
    },
  },
  {
    title: 'English Score',
    dataIndex: 'english',
    sorter: {
      compare: (a, b) => a.english - b.english,
      multiple: 1,
    },
  },
]

const data: DataType[] = [
  { key: '1', name: 'John Brown', chinese: 98, math: 60, english: 70 },
  { key: '2', name: 'Jim Green', chinese: 98, math: 66, english: 89 },
  { key: '3', name: 'Joe Black', chinese: 98, math: 90, english: 70 },
  { key: '4', name: 'Jim Red', chinese: 88, math: 99, english: 89 },
]

const onChange: TableProps<DataType>['onChange'] = (pagination, filters, sorter, extra) => {
  // eslint-disable-next-line no-console
  console.log('multiple-sorter demo onChange params:', { pagination, filters, sorter, extra })
}

export default function MultipleSorterDemo() {
  return (
    <div style={{ padding: 24 }}>
      <Table<DataType> columns={columns} dataSource={data} onChange={onChange} />
      <div
        style={{
          marginTop: 16,
          padding: 12,
          background: '#fafafa',
          borderRadius: 8,
          color: 'rgba(0,0,0,0.65)',
          fontSize: 12,
          lineHeight: 1.8,
        }}
      >
        <p style={{ margin: '0 0 4px' }}>
          <b>S2 多列排序</b>（对齐 antd multiple-sorter demo）：
        </p>
        <p style={{ margin: 0 }}>
          - <code>Chinese</code> multiple=3、<code>Math</code> multiple=2、<code>English</code> multiple=1。
        </p>
        <p style={{ margin: 0 }}>
          - 点击多列表头叠加排序（点击一列不清空其它列）。multiple 越小优先级越高；表头 caret 旁显示优先级数字。
        </p>
        <p style={{ margin: 0 }}>
          - 打开 console 查看 onChange 参数：<code>sorter</code> 多列激活时为 <code>SorterResult[]</code>。
        </p>
      </div>
    </div>
  )
}
