/**
 * 复刻 antd `style-class` demo：
 *   `G:\Projects\ant-design\components\table\demo\style-class.tsx`
 *
 * === S29 落地说明（语义化样式 classNames/styles）===
 *
 * - `classNames`：对象（静态），作用于语义化部位 root/header.{cell,row,wrapper}/body.{cell,row,wrapper}/
 *   title/footer/pagination.{root,item}/section/content（对齐 antd v6 嵌套结构，
 *   `components/table/InternalTable.tsx:102-122`）。
 * - `styles`：同构对象（值为 CSSProperties）；或函数 `(info) => 对象`——按 `info.props`
 *   （含 size/bordered/virtual/scroll/pagination）求值返回不同样式。
 *
 * === 与 antd demo 的差异 ===
 *
 * antd demo 用 `antd-style` 库的 `createStaticStyles`（CSS-in-JS，生成 className 字符串注入）。
 * data-grid demo 简化为**直接 className 字符串 + inline style 对象**（不依赖 antd-style）——
 * 功能等价：演示 classNames（root class）+ styles（对象 inline style）+ stylesFn（函数式按 size 求值）。
 *
 * === _semantic 部位对照（详见 antd `components/table/demo/_semantic.tsx`）===
 *
 * data-grid 各语义部位注入的 DOM：
 *   - `root`            → `.dg-wrapper`（根容器）。
 *   - `title`           → `.dg-title`（标题区）。
 *   - `footer`          → `.dg-footer`（脚注区）。
 *   - `content`         → `.dg-grid`（表格内容区根，grid 容器）。
 *   - `section`         → `.dg-scroll`（包装/滚动容器，承载 content）。
 *   - `header.wrapper`  → 表头容器（data-grid grid 布局下表头与表体共享 grid，wrapper 暂留接口）。
 *   - `header.row`      → 表头行（grid 布局无独立 tr，row class 透传到表头格）。
 *   - `header.cell`     → `.dg-cell-header`（表头单元格）。
 *   - `body.wrapper`    → 表体容器（同 header.wrapper，暂留接口）。
 *   - `body.row`        → 表体行（grid 布局无独立 tr，row class 透传到该行所有 `.dg-cell-body`）。
 *   - `body.cell`       → `.dg-cell-body`（表体单元格）。
 *   - `pagination.root` → `.dg-pagination`（分页根容器）。
 *   - `pagination.item` → 透传到 antd `<Pagination>` className（近似单项样式）。
 *
 * SemanticPreview 是 antd .dumi 内部组件，本 demo 不复刻 SemanticPreview，仅用注释标注部位语义。
 */

import { Table } from '../table'
import type {
  ColumnType,
  TableClassNames,
  TableProps,
  TableStyles,
} from '../table'

interface DataType {
  key?: string
  name?: string
  age?: number
  address?: string
  description?: string
}

const columns: ColumnType<DataType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
  { title: 'Description', dataIndex: 'description', key: 'description' },
]

const dataSource: DataType[] = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    description: 'My name is John Brown, I am 32 years old, living in New York No. 1 Lake Park.',
  },
  {
    key: '2',
    name: 'Jim Green',
    age: 42,
    address: 'London No. 1 Lake Park',
    description: 'My name is Jim Green, I am 42 years old, living in London No. 1 Lake Park.',
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    address: 'Sydney No. 1 Lake Park',
    description: 'My name is Joe Black, I am 32 years old, living in Sydney No. 1 Lake Park.',
  },
  {
    key: '4',
    name: 'Disabled User',
    age: 99,
    address: 'Sydney No. 2 Lake Park',
    description: 'This user is disabled.',
  },
]

// classNames：对象（静态）。root class 注入到 .dg-wrapper。
// 对齐 antd demo 的 `classNames`（createStaticStyles 生成 root class）——这里直接用字面量 class，
// 配合下方 styles 内联样式演示。
const classNames: TableClassNames = {
  // root class：示例自定义类（demo 内联 style 为主，class 仅占位演示）。
  root: 'dg-style-class-root',
}

// styles：对象（静态）。作用于 root/pagination/body.row/body.cell 等部位。
// 对齐 antd demo 的 `styles` 对象（title/footer/bordered/virtual/scroll 等 inline style）。
const styles: TableStyles = {
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
      outline: '1px dashed rgba(226, 225, 225, 0.4)',
    },
    cell: {
      outline: '1px dashed rgba(226, 225, 225, 0.4)',
    },
  },
}

// stylesFn：函数式 `(info) => styles`。按 info.props.size 求值返回不同样式。
// 对齐 antd demo 的 `stylesFn`：size='medium' 时返回自定义 root/title/footer/header.cell/pagination。
const stylesFn: TableStyles<DataType> = (info) => {
  if (info?.props?.size === 'medium') {
    return {
      root: {
        color: '#5b21b6',
        borderRadius: 8,
        boxShadow: '0 4px 20px rgba(91, 33, 182, 0.15)',
      },
      title: {
        backgroundImage: 'linear-gradient(90deg, #6a5acd, #836fff)',
        color: '#fff',
        fontSize: '1.25rem',
        fontWeight: 600,
        padding: '12px 16px',
      },
      footer: {
        color: '#6b7280',
      },
      header: {
        cell: {
          fontWeight: 600,
          fontSize: '0.95rem',
          color: '#4338ca',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(67, 56, 202, 0.12)',
        },
      },
      pagination: {
        root: {
          padding: 10,
        },
        item: {
          color: '#4338ca',
        },
      },
    }
  }
  return {}
}

export default function StyleClassDemo() {
  // 两 Table 共享的 props（columns/dataSource/classNames/pagination）。
  // 对齐 antd demo 的 sharedProps。
  const sharedProps: TableProps<DataType> = {
    columns,
    dataSource,
    classNames,
    // 注：antd demo 用 `pagination: { pageSize: 3, simple: true }`；data-grid 的
    // TablePaginationConfig 暂未暴露 `simple`（极简分页器样式），这里去掉 simple 仅保留 pageSize。
    pagination: { pageSize: 3 },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h3 style={{ marginBottom: 12 }}>对象 styles（root/pagination/body.row/body.cell）</h3>
        <Table<DataType>
          {...sharedProps}
          styles={styles}
          title={() => 'Table Object Styles'}
          footer={() => 'Table Object Footer'}
          size="small"
          virtual
          scroll={{ y: 300 }}
        />
      </div>
      <div>
        <h3 style={{ marginBottom: 12 }}>函数 styles（size=medium 时自定义 root/title/footer/header.cell/pagination）</h3>
        <Table<DataType>
          {...sharedProps}
          styles={stylesFn}
          title={() => 'Table Function Styles'}
          footer={() => 'Table Function Styles'}
          size="medium"
        />
      </div>
    </div>
  )
}
