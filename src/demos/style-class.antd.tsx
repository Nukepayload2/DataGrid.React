import type { TableProps as AntdTableProps } from 'antd'
import { Table as AntdTable } from 'antd'
import { dataSource as sharedData, type RecordType } from './_compare/style-class.shared'

const antdColumns: NonNullable<AntdTableProps<RecordType>['columns']> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
  { title: 'Description', dataIndex: 'description', key: 'description' },
]

// root class 注入到根容器；视觉样式由 table.css 末尾预定义的 `.dg-style-class-root` 提供（两侧共用）。
const antdClassNames: NonNullable<AntdTableProps<RecordType>['classNames']> = {
  root: 'dg-style-class-root',
}

// Static dark-theme slot styles.
const antdStyles: NonNullable<AntdTableProps<RecordType>['styles']> = {
  root: {
    padding: 10,
    borderRadius: 8,
  },
  pagination: {
    root: {
      padding: 10,
    },
  },
  body: {
    row: {
      outline: '1px dashed rgba(226, 225, 225, 0.1)',
    },
    cell: {
      outline: '1px dashed rgba(226, 225, 225, 0.1)',
    },
  },
}

// Function styles vary by table size.
const antdStylesFn: NonNullable<AntdTableProps<RecordType>['styles']> = (info) => {
  if (info?.props?.size === 'medium') {
    return {
      root: {
        color: '#e0e0e0',
        borderRadius: 8,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      },
      title: {
        backgroundImage: 'linear-gradient(90deg, #6a5acd, #836fff)',
        color: '#fff',
        fontSize: '1.25rem',
        fontWeight: 600,
        padding: '12px 16px',
      },
      footer: {
        color: '#9ca3af',
      },
      header: {
        cell: {
          fontWeight: 600,
          fontSize: '0.95rem',
          color: '#b8bdfd',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        },
      },
      pagination: {
        root: {
          padding: 10,
        },
        item: {
          color: '#b8bdfd',
        },
      },
    }
  }
  return {}
}

export default function StyleClassAntd({
  virtual = false,
  scrollY = false,
}: {
  virtual: boolean
  scrollY: boolean
}) {
  const antdPagination = { pageSize: 3, simple: true }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h3 style={{ marginBottom: 12 }}>
          对象 styles（root/pagination/body.row/body.cell）
        </h3>
        <div style={scrollY ? { height: 300 } : undefined}>
          <AntdTable<RecordType>
            columns={antdColumns}
            dataSource={sharedData}
            classNames={antdClassNames}
            styles={antdStyles}
            title={() => 'Table Object Styles'}
            footer={() => 'Table Object Footer'}
            size="small"
            virtual={virtual}
            scroll={scrollY ? { y: 300 } : undefined}
            pagination={antdPagination}
          />
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: 12 }}>
          函数 styles（size=medium 时自定义
          root/title/footer/header.cell/pagination）
        </h3>
        <AntdTable<RecordType>
          columns={antdColumns}
          dataSource={sharedData}
          classNames={antdClassNames}
          styles={antdStylesFn}
          title={() => 'Table Function Styles'}
          footer={() => 'Table Function Styles'}
          size="medium"
          pagination={antdPagination}
        />
      </div>
    </div>
  )
}
