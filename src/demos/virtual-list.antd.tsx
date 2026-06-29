/**
 * virtual-list demo 的 antd 段（右栏），从 virtual-list.tsx 拆出。
 *
 * === 强制虚拟 demo（自管虚拟，不消费全局开关）===
 * 本 demo 自身永久 `virtual=true` + `scroll={{x:2000, y:400}}` + `pagination={false}`。
 * **子组件内部硬编码 virtual/scroll，不接 virtual prop**，不依赖父组件/propsFor 的 virtual。
 * 父组件 SplitDemo `virtualizable={false}`。
 *
 * - props 驱动 `{ bordered, fixed, expanded, empty, data, tableRef }`
 *   （由 virtual-list.tsx 父组件传；编辑模式 SplitDemoPreview 仅传超集 {bordered,virtual,size,
 *   autoScroll}，其余靠默认值兜底，data 默认 getData(10000) 非空避免编辑态空表——T1 坑）。
 * - 自包含：含 `antdFixedColumns` / `antdShortColumns` 两套列定义 + `useMemo` 列选择
 *   （fixed/expanded 推导：fixed=false→short，expanded=true→清 onCell）+ `antdExpandable`
 *   + `<AntdTable>` JSX。
 * - 忠实复刻 antd 官方 virtual-list demo：virtual + scroll={{x:2000,y:400}} + pagination={false}
 *   + rowSelection（展开关闭时 radio）+ expandable + fixedColumns。
 *   注：antd 侧 merged 行为由 fixed+expanded 推导（fixed 时展开关闭即合并、展开即清 onCell），
 *       无独立 merged prop（与左栏 data-grid 保留独立 Merged 开关作对照点）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/virtual-list.shared'`）。
 */
import { useMemo } from 'react'
import type { Ref } from 'react'
import { Space, Table as AntdTable, Typography } from 'antd'
import type { GetRef, TableProps } from 'antd'
import { getData, type RecordType } from './_compare/virtual-list.shared'

/** antd Table 的 ref 实例类型（含 scrollTo）。antd 顶层未导出 TableRef，用 GetRef 取得。 */
type AntdTableRef = GetRef<typeof AntdTable>

// ---------------------------------------------------------------------------
// 右栏（antd）列定义 —— 忠实复刻 antd 官方 virtual-list demo
// ---------------------------------------------------------------------------

const antdFixedColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 100,
    fixed: 'start',
  },
  {
    // 官方 antd virtual-list demo 此处为 'FistName'（笔误）。两侧统一为正确拼写「FirstName」
    // 以消除标题层面的可见差异（列定义对齐任务要求）。
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
      <Space>
        <Typography.Link>Action1</Typography.Link>
        <Typography.Link>Action2</Typography.Link>
      </Space>
    ),
  },
]

const antdShortColumns: NonNullable<TableProps<RecordType>['columns']> = [
  {
    title: 'ID',
    dataIndex: 'id',
    width: 100,
  },
  {
    // 同 antdFixedColumns：官方 demo 此处亦为 'FistName' 笔误，统一改为 'FirstName'。
    title: 'FirstName',
    dataIndex: 'firstName',
    width: 120,
  },
  {
    title: 'LastName',
    dataIndex: 'lastName',
    width: 120,
  },
]

export interface VirtualListAntdProps {
  /** 表格边框（共享控制条驱动）。 */
  bordered: boolean
  /** 是否启用固定列（共享控制条驱动）。 */
  fixed: boolean
  /** 是否启用展开行（共享控制条驱动；展开时清 onCell + 关 rowSelection）。 */
  expanded: boolean
  /** 是否空表（共享控制条驱动；true 时 dataSource=[]）。 */
  empty: boolean
  /** 行数据（父组件 useMemo(getData(count)) 下发）。默认 getData(10000) 非空（编辑态兜底）。 */
  data: RecordType[]
  /**
   * 父组件持有的 antd Table ref（用于双侧 scrollTo 对照）。
   * 类型 `React.Ref<AntdTableRef>` 对齐 AntdTable ref prop（父 useRef<AntdTableRef|null>(null)
   * 生成的 MutableRefObject 可赋值）。编辑模式 SplitDemoPreview 不传（undefined），内部 AntdTable 自建实例。
   */
  tableRef?: Ref<AntdTableRef>
}

export default function VirtualListAntd({
  bordered = true,
  fixed = true,
  expanded = false,
  empty = false,
  data = getData(10000),
  tableRef,
}: VirtualListAntdProps) {
  // ----- 右栏（antd）列选择逻辑（对齐 antd demo mergedColumns useMemo）-----
  const antdColumns = useMemo<NonNullable<TableProps<RecordType>['columns']>>(() => {
    if (!fixed) return antdShortColumns
    if (!expanded) return antdFixedColumns
    return antdFixedColumns.map((col) => ({ ...col, onCell: undefined }))
  }, [expanded, fixed])

  // ----- 右栏（antd）expandable（忠实 antd demo expandableProps）-----
  const antdExpandable = useMemo<TableProps<RecordType>['expandable']>(() => {
    if (!expanded) return undefined
    return {
      columnWidth: 48,
      expandedRowRender: (record: RecordType) => (
        <p style={{ margin: 0 }}>🎉 Expanded {record.address1}</p>
      ),
      rowExpandable: (record: RecordType) => record.id % 2 === 0,
    }
  }, [expanded])

  return (
    /* antd 官方 virtual-list demo 忠实复刻：
       virtual + scroll={{ x:2000, y:400 }} + pagination={false} +
       rowSelection（展开关闭时 radio）+ expandable + fixedColumns。 */
    <AntdTable<RecordType>
      ref={tableRef}
      bordered={bordered}
      virtual
      columns={antdColumns}
      scroll={{ x: 2000, y: 400 }}
      rowKey="id"
      dataSource={empty ? [] : data}
      pagination={false}
      rowSelection={expanded ? undefined : { type: 'radio', columnWidth: 48 }}
      expandable={antdExpandable}
    />
  )
}
