import { Table } from '../table'
import type {
  ColumnType,
  TableClassNames,
  TableStyles,
} from '../table'
import { dataSource as sharedData, type RecordType } from './_compare/semantic-styling.shared'

const dgColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
  { title: 'Description', dataIndex: 'description', key: 'description' },
]

// root class 注入到根容器；视觉样式由 table.css 末尾预定义的 `.dg-style-class-root` 提供。
const dgClassNames: TableClassNames<RecordType> = {
  root: 'dg-style-class-root',
}

// Static dark-theme slot styles.
const dgStyles: TableStyles<RecordType> = {
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
const dgStylesFn: TableStyles<RecordType> = (info) => {
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

export default function StyleClassDg({
  virtual = false,
  scrollY = false,
}: {
  virtual: boolean
  scrollY: boolean
}) {
  const dgPagination = { pageSize: 3 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h3 style={{ marginBottom: 12 }}>
          对象 styles（root/pagination/body.row/body.cell）
        </h3>
        {/* scroll.y:true 数据区域模式需父容器有明确 height（详见 docs/design-notes/virtualization.md）。
            scrollY 开启时给对象 styles 块固定 height:300。 */}
        <div style={scrollY ? { height: 300 } : undefined}>
          <Table<RecordType>
            columns={dgColumns}
            dataSource={sharedData}
            classNames={dgClassNames}
            styles={dgStyles}
            title={() => 'Table Object Styles'}
            footer={() => 'Table Object Footer'}
            size="small"
            virtual={virtual}
            scroll={scrollY ? { y: true } : undefined}
            pagination={dgPagination}
          />
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: 12 }}>
          函数 styles（size=medium 时自定义
          root/title/footer/header.cell/pagination）
        </h3>
        <Table<RecordType>
          columns={dgColumns}
          dataSource={sharedData}
          classNames={dgClassNames}
          styles={dgStylesFn}
          title={() => 'Table Function Styles'}
          footer={() => 'Table Function Styles'}
          size="medium"
          pagination={dgPagination}
        />
      </div>
    </div>
  )
}
