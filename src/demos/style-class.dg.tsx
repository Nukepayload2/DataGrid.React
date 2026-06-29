/**
 * style-class demo 的 data-grid 段（左栏），从 style-class.tsx 拆出。
 *
 * - props 驱动 `{ virtual, scrollY }`（由 style-class.tsx 父组件传）：
 *   * virtual：本地 Virtual 开关（本 demo 自带局部开关，virtualizable={false} 不接全局开关）。
 *   * scrollY：scroll.y 开关（决策 7：data-grid y:true 数据区域模式，CSS 自适应高度）。
 * - 自包含：含 `dgColumns` + `<Table>` JSX + `dgClassNames` + `dgStyles`（对象）+ `dgStylesFn`（函数）。
 * - 行为与改造前一致：两块 Table 同栏展示——对象 styles（root/pagination/body.row/body.cell）+
 *   函数 stylesFn（size=medium 时自定义 root/title/footer/header.cell/pagination）。
 *
 * === ★ classNames/styles 配置搬入子组件（task S29 live 编辑接入）===
 * 原父文件的 `dgClassNames` / `dgStyles` / `dgStylesFn` 全部搬入本子组件，对齐 antd 6.4.4 官方
 * style-class demo 的 styles 对象 + stylesFn 函数（深色主题逐字复刻）。root class
 * `.dg-style-class-root` 的视觉样式由 `src/table/style/table.css` 末尾预定义（对齐 antd
 * `createStaticStyles` root CSS）。
 *
 * === props 默认值（合理有效初值，坑5+坑7）===
 * - virtual=false（OFF 回非虚拟，行为与改造前 OFF 一致；本 demo 自带局部 Virtual 开关，
 *   父级默认 ON 时由父 prop 传入覆盖）。
 * - scrollY=false（OFF 回 undefined scroll，对象 styles 块 Table 正常展示，仅不固定表头纵滚）。
 * 编辑模式 propsFor 超集 {bordered,virtual,size,autoScroll} 已覆盖 virtual；scrollY 不在超集
 * 中靠默认值兜底——对象 styles 块 Table 不滚（仍可见全部 4 行），函数 stylesFn 块不涉及 scroll.y，
 * 两块 Table 完整可演示。
 *
 * === live 编辑 ===
 * 本文件源码通过 `import.meta.glob './demos/*.dg.tsx' '?raw'` 加载并展示在 LiveEditor，
 * 由 sucrase 编译后用 `evalModule` 执行。import specifier 字面对齐 scope.ts 注入表 key
 * （`'../table'` / `'./_compare/style-class.shared'`），源码可原样展示无需路径改写。
 */
import { Table } from '../table'
import type {
  ColumnType,
  TableClassNames,
  TableStyles,
} from '../table'
import { dataSource as sharedData, type RecordType } from './_compare/style-class.shared'

// ---------------------------------------------------------------------------
// 左栏（data-grid）列定义
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
  { title: 'Description', dataIndex: 'description', key: 'description' },
]

// ---------------------------------------------------------------------------
// classNames / styles 配置（从父文件搬入；对齐 antd 6.4.4 官方 style-class demo）
// ---------------------------------------------------------------------------

// classNames：对象（静态）。root class 注入到根容器（.dg-wrapper）。
// 对齐 antd demo 的 `createStaticStyles({ root })` 生成的 root class（color/borderRadius/boxShadow）；
// 视觉样式由 table.css 末尾预定义的 `.dg-style-class-root` 提供。
const dgClassNames: TableClassNames<RecordType> = {
  root: 'dg-style-class-root',
}

// styles：对象（静态）。作用于 root/pagination/body.row/body.cell 等部位。
// 对齐 antd demo 的 `styles` 对象（深色主题，逐字复刻 antd 6.4.4 官方 style-class demo）。
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

// stylesFn：函数式 `(info) => styles`。按 info.props.size 求值返回不同样式。
// 对齐 antd demo 的 `stylesFn`：size='medium' 时返回自定义深色 root/title/footer/header.cell/pagination
// （逐字复刻 antd 6.4.4 官方 style-class demo）。
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

// ---------------------------------------------------------------------------
// 子组件
// ---------------------------------------------------------------------------

export default function StyleClassDg({
  virtual = false,
  scrollY = false,
}: {
  virtual: boolean
  scrollY: boolean
}) {
  // pagination：antd demo 用 { pageSize:3, simple:true }；data-grid 未暴露 simple，仅 pageSize。
  const dgPagination = { pageSize: 3 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* 对象 styles 块（含 virtual + scroll.y）。 */}
      <div>
        <h3 style={{ marginBottom: 12 }}>
          对象 styles（root/pagination/body.row/body.cell）
        </h3>
        {/*
          ★ 决策 7：scroll.y:true 数据区域模式需父容器有明确 height。
          scrollY 开启时给对象 styles 块固定 height:300（等价 antd demo y:300）；
          函数 stylesFn 块不涉及 scroll.y，不包 height。
        */}
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
      {/* 函数 stylesFn 块（size=medium，无 scroll.y）。 */}
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
