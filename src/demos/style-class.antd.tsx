/**
 * style-class demo 的 antd 段（右栏），从 style-class.tsx 拆出。
 *
 * - props 驱动 `{ virtual, scrollY }`（由 style-class.tsx 父组件传，与左栏同款）。
 * - 自包含：含 `antdColumns` + `<AntdTable>` JSX + `antdClassNames` + `antdStyles`（对象）+
 *   `antdStylesFn`（函数）。
 * - 忠实复刻 antd style-class demo（antd-style `createStaticStyles` CSS-in-JS 改为 antd v6 原生
 *   `classNames` 字符串 + `styles` 对象/函数，视觉等价、零额外依赖）。两块 Table 同栏展示。
 *
 * === ★ classNames/styles 配置搬入子组件（task S29 live 编辑接入）===
 * 原父文件的 `antdClassNames` / `antdStyles` / `antdStylesFn` 全部搬入本子组件。深色主题逐字复刻
 * antd 6.4.4 官方 style-class demo（不改成浅色/紫色）。root class `.dg-style-class-root` 的视觉
 * 样式由 `src/table/style/table.css` 末尾预定义（对齐 antd `createStaticStyles` root CSS）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - virtual=false（OFF 回 undefined scroll，行为与改造前 OFF 一致）。
 * - scrollY=false（OFF 回 undefined scroll，对象 styles 块 Table 正常展示）。
 * 编辑模式两块 Table 完整可演示（与左栏同款）。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.antd.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'antd'` / `'./_compare/style-class.shared'`）。
 */
import type { TableProps as AntdTableProps } from 'antd'
import { Table as AntdTable } from 'antd'
import { dataSource as sharedData, type RecordType } from './_compare/style-class.shared'

// ---------------------------------------------------------------------------
// 右栏（antd）列定义
// ---------------------------------------------------------------------------

const antdColumns: NonNullable<AntdTableProps<RecordType>['columns']> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
  { title: 'Description', dataIndex: 'description', key: 'description' },
]

// ---------------------------------------------------------------------------
// classNames / styles 配置（从父文件搬入；对齐 antd 6.4.4 官方 style-class demo）
// ---------------------------------------------------------------------------

// classNames：对象（静态）。root class 注入到根容器（.ant-table-wrapper）。
// 对齐 antd demo 的 `createStaticStyles({ root })` 生成的 root class；视觉样式由 table.css 末尾
// 预定义的 `.dg-style-class-root` 提供（两侧共用同一 root class CSS）。
const antdClassNames: NonNullable<AntdTableProps<RecordType>['classNames']> = {
  root: 'dg-style-class-root',
}

// styles：对象（静态）。作用于 root/pagination/body.row/body.cell 等部位。
// 对齐 antd demo 的 `styles` 对象（深色主题，逐字复刻 antd 6.4.4 官方 style-class demo）。
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

// stylesFn：函数式 `(info) => styles`。按 info.props.size 求值返回不同样式。
// 对齐 antd demo 的 `stylesFn`：size='medium' 时返回自定义深色 root/title/footer/header.cell/pagination
// （逐字复刻 antd 6.4.4 官方 style-class demo）。
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

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

export default function StyleClassAntd({
  virtual = false,
  scrollY = false,
}: {
  virtual: boolean
  scrollY: boolean
}) {
  // pagination：antd demo 用 { pageSize:3, simple:true }（data-grid 未暴露 simple）。
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
