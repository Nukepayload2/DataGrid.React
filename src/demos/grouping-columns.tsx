/**
 * 复刻 antd `grouping-columns` demo：`G:\Projects\ant-design\components\table\demo\grouping-columns.tsx`。
 *
 * 重点：多级表头（任意深度嵌套 children）。
 *
 * === 本 demo 相对 antd 官方 demo 的简化（M1 任务范围）===
 *
 * 1. **固定列 sticky 效果**：保留 antd 列定义中的 `fixed: 'start'`（Name）与 `fixed: 'end'`（Gender），
 *    但**真正的 sticky 定位效果留待 M2 任务落地**。M1 仅保证：
 *      - 列定义被正确解析并参与渲染；
 *      - 叶子列顺序、表头分组结构、数据对齐正确。
 *    引擎已透传 `fixed` 字段，CSS 中 `.dg-cell-fixed-start/end` 预留 `position:sticky`
 *    （M0 占位），但多级表头显式定位路径下 sticky 偏移计算属 M2 范围。
 *
 * 2. **scroll / 数据量**：antd 用 100 行 + `scroll:{x,y}` 实现固定表头 + 横纵滚动。
 *    M1 不实现固定表头（M8）与虚拟滚动（M4），故**缩减数据至 6 行**展示多级表头对齐，
 *    避免无滚动撑爆页面。`scroll` prop 也不传（M8/M4 才消费）。
 *
 * 3. **filters / sorter**：antd 的 Name 列有 `filters/onFilter`、Age 列有 `sorter`。
 *    排序/筛选属 S1/S3 自研任务，本 demo **去掉** filters/sorter 字段，仅保留多级表头结构。
 *
 * 4. **bordered / size**：保留 `bordered`（与 antd 一致，便于看清多级表头边框）。
 *    antd 的 `size="medium"` 在 data-grid 中等价于不传 size（默认 large）或显式 'middle'；
 *    这里用默认（large）以突出多级表头层级，与 antd 视觉差异最小。
 */

import { Table } from '../table'
import type { ColumnType } from '../table'

interface DataType {
  key: string | number
  name: string
  age: number
  street: string
  building: string
  number: number
  companyAddress: string
  companyName: string
  gender: string
}

const columns: ColumnType<DataType>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: 100,
    // M1 范围：保留 fixed 列定义，sticky 效果留待 M2。
    fixed: 'start',
  },
  {
    title: 'Other',
    children: [
      {
        title: 'Age',
        dataIndex: 'age',
        key: 'age',
        width: 120,
      },
      {
        title: 'Address',
        children: [
          {
            title: 'Street',
            dataIndex: 'street',
            key: 'street',
            width: 150,
          },
          {
            title: 'Block',
            children: [
              {
                title: 'Building',
                dataIndex: 'building',
                key: 'building',
                width: 100,
              },
              {
                title: 'Door No.',
                dataIndex: 'number',
                key: 'number',
                width: 100,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    title: 'Company',
    children: [
      {
        title: 'Company Address',
        dataIndex: 'companyAddress',
        key: 'companyAddress',
        width: 200,
      },
      {
        title: 'Company Name',
        dataIndex: 'companyName',
        key: 'companyName',
      },
    ],
  },
  {
    title: 'Gender',
    dataIndex: 'gender',
    key: 'gender',
    width: 80,
    // M1 范围：保留 fixed 列定义，sticky 效果留待 M2。
    fixed: 'end',
  },
]

const dataSource: DataType[] = Array.from({ length: 6 }).map<DataType>((_, i) => ({
  key: i,
  name: 'John Brown',
  age: i + 1,
  street: 'Lake Park',
  building: 'C',
  number: 2035,
  companyAddress: 'Lake Street 42',
  companyName: 'SoftLake Co',
  gender: 'M',
}))

export default function GroupingColumnsDemo() {
  return (
    <Table<DataType> columns={columns} dataSource={dataSource} bordered />
  )
}
