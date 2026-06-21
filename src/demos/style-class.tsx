/**
 * 复刻 antd `style-class` demo：
 *   `G:\Projects\ant-design\components\table\demo\style-class.tsx`
 *
 * === 决策 9 双栏对照（S29 语义化样式 classNames/styles）===
 *
 * - **左栏（data-grid Table）**：classNames/styles（对象或 `(info)=>` 函数），作用于
 *   root/header.{cell,row,wrapper}/body.{cell,row,wrapper}/title/footer/pagination.{root,item}/
 *   section/content（对齐 antd v6 嵌套结构）。行为与改造前一致（仅放进左栏 + 接共享控制条）。
 * - **右栏（antd Table）**：忠实复刻 antd style-class demo（antd-style `createStaticStyles`
 *   CSS-in-JS 生成 root class + 对象 styles + 函数 stylesFn）。**唯一改动**：antd demo
 *   原用 `antd-style` 库（生成 className 字符串注入）；为保持「无额外依赖」+ 与左栏对齐展示，
 *   右栏改为直接用 antd 原生 `classNames` 字符串 + `styles` 对象/函数（antd v6 原生支持），
 *   视觉行为等价。
 * - **★ 忠实复刻深色主题**：antd 官方 demo 的 styles/stylesFn 用深色值（`#e0e0e0` 文字 +
 *   `rgba(0,0,0,0.3)` 阴影 + `rgba(226,225,225,0.1)` 虚线 outline + `#b8bdfd` 表头/分页色），
 *   本 demo 两侧**逐字复刻**（不改成浅色/紫色）。root class `.dg-style-class-root` 的 CSS
 *   定义在 `src/table/style/table.css` 末尾（对齐 antd `createStaticStyles` 的 root 样式：
 *   `color:#e0e0e0; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.3)`）。
 * - **共享控制条**：顶部全宽，Virtual / scroll.y 两个 Switch + 一次性展示「对象 styles /
 *   函数 stylesFn」两种模式（同一 state 同时驱动两侧表格）。
 *
 * === _semantic 部位对照（data-grid 各部位注入的 DOM）===
 *
 *   - `root`            → `.dg-wrapper`（根容器）。
 *   - `title`           → `.dg-title`（标题区）。
 *   - `footer`          → `.dg-footer`（脚注区）。
 *   - `content`         → `.dg-grid`（表格内容区根，grid 容器）。
 *   - `section`         → `.dg-scroll`（包装/滚动容器）。
 *   - `header.wrapper`  → 表头容器（grid 共享，wrapper 暂留接口）。
 *   - `header.row`      → 表头行（grid 无 tr，row class 透传到表头格）。
 *   - `header.cell`     → `.dg-cell-header`（表头单元格）。
 *   - `body.wrapper`    → 表体容器（暂留接口）。
 *   - `body.row`        → 表体行（grid 无 tr，row class 透传到该行所有 `.dg-cell-body`）。
 *   - `body.cell`       → `.dg-cell-body`（表体单元格）。
 *   - `pagination.root` → `.dg-pagination`（分页根容器）。
 *   - `pagination.item` → 透传到 antd `<Pagination>` className（近似单项样式）。
 *
 * === 两侧已知差异（如实保留作为对照价值）===
 *
 * - antd demo 用 `antd-style`（CSS-in-JS 生成 className）；本 demo 两侧均直接用字面量
 *   className 字符串 + inline style 对象（不依赖 antd-style）——功能等价，演示部位注入。
 *   root class `.dg-style-class-root` 的视觉样式由 `table.css` 预定义（对齐 antd root CSS）。
 * - antd Pagination 有原生 `itemClassName`；data-grid 的 pagination.item 为近似单项样式。
 * - grid 渲染无独立 tr，body.row/header.row 的 class 透传到行内单元格（与 antd td 结构不同）。
 */

import { useState } from 'react'
import type { TableProps as AntdTableProps } from 'antd'
import { Space, Switch, Table as AntdTable } from 'antd'
import { Table } from '../table'
import type {
  ColumnType,
  TableClassNames,
  TableStyles,
} from '../table'
import { SplitDemo } from './_compare/SplitDemo'
import { dataSource as sharedData, type RecordType } from './_compare/style-class.shared'

// ---------------------------------------------------------------------------
// 两侧共享 columns 形状（data-grid / antd 各自类型）
// ---------------------------------------------------------------------------

const dgColumns: ColumnType<RecordType>[] = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
  { title: 'Description', dataIndex: 'description', key: 'description' },
]

const antdColumns: NonNullable<AntdTableProps<RecordType>['columns']> = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Age', dataIndex: 'age', key: 'age' },
  { title: 'Address', dataIndex: 'address', key: 'address' },
  { title: 'Description', dataIndex: 'description', key: 'description' },
]

// ---------------------------------------------------------------------------
// classNames / styles 共享定义（两侧等价注入）
// ---------------------------------------------------------------------------

// classNames：对象（静态）。root class 注入到根容器（.dg-wrapper / .ant-table-wrapper）。
// 对齐 antd demo 的 `createStaticStyles({ root })` 生成的 root class（color/borderRadius/boxShadow）。
// antd demo 用 antd-style CSS-in-JS 注入该 class 的样式；本 demo 两侧均改用字面量 class +
// 预定义 CSS（见 `style-class.css` 的 `.dg-style-class-root`），视觉等价、零额外依赖。
const dgClassNames: TableClassNames<RecordType> = {
  root: 'dg-style-class-root',
}
const antdClassNames: NonNullable<AntdTableProps<RecordType>['classNames']> = {
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
// Demo 根组件
// ---------------------------------------------------------------------------

export default function StyleClassDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。
  const [virtual, setVirtual] = useState(true)
  const [scrollY, setScrollY] = useState(true)

  // pagination：antd demo 用 { pageSize:3, simple:true }；data-grid 未暴露 simple，仅 pageSize。
  const dgPagination = { pageSize: 3 }
  const antdPagination = { pageSize: 3, simple: true }

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个状态同时驱动两侧表格。 */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          background: '#fff',
        }}
      >
        <Space wrap>
          <Switch
            checked={virtual}
            onChange={setVirtual}
            checkedChildren="Virtual"
            unCheckedChildren="Virtual"
          />
          <Switch
            checked={scrollY}
            onChange={setScrollY}
            checkedChildren="scroll.y"
            unCheckedChildren="scroll.y"
          />
          <span style={{ color: 'rgba(0,0,0,0.65)', fontSize: 12 }}>
            两块 Table 同时展示：对象 styles (size=small) + 函数 stylesFn (size=medium)
          </span>
        </Space>
      </div>

      {/*
        minPaneWidth=600 → 横排阈值 ≈ 1216。常规笔记本视口（≥1280）即可横排；
        窄视口自动换行竖排。4 列（Name/Age/Address/Description）+ 分页 pageSize:3，半宽 ~640 友好。
      */}
      <SplitDemo
        minPaneWidth={600}
        left={
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
        }
        right={
          /* 忠实复刻 antd style-class demo（antd-style createStaticStyles 改为原生
             classNames/styles 对象/函数，等价展示）。两块结构同左栏。 */
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
        }
      >
        <div>
          <strong>对照说明（决策 9 B19 / S29 语义化样式 classNames/styles）：</strong>
          左右并排呈现 data-grid 与 antd style-class demo，方便对照 classNames/styles
          各部位注入效果。
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              <strong>★ 深色主题忠实复刻</strong>：antd 官方 demo 的 styles/stylesFn 用深色值
              （<code>#e0e0e0</code> 文字 + <code>rgba(0,0,0,0.3)</code> 阴影 +
              <code>rgba(226,225,225,0.1)</code> 虚线 + <code>#b8bdfd</code> 表头/分页色），
              本 demo 两侧<strong>逐字复刻</strong>（不改成浅色/紫色）——root class
              <code>.dg-style-class-root</code> 的视觉样式由 <code>table.css</code> 预定义
              （对齐 antd <code>createStaticStyles</code> root CSS）。
            </li>
            <li>
              <strong>两块 Table 同栏展示</strong>：对象 styles（size=small，含 virtual +
              scroll.y）+ 函数 stylesFn（size=medium，触发 <code>if (size==='medium')</code>
              分支）——与 antd demo 两块结构一致，两侧同屏对照。
            </li>
            <li>
              <strong>共享 Virtual / scroll.y</strong>：开关同时驱动两侧 virtual +
              scroll.y（data-grid <code>scroll:&#123;y:true&#125;</code> CSS 自适应高度，
              antd <code>scroll:&#123;y:300&#125;</code>）。父容器 300px 高。
            </li>
            <li>
              <strong>pagination simple</strong>（已知差异）：antd demo 用
              <code> pagination:&#123;pageSize:3, simple:true&#125;</code>；
              data-grid 的 <code>TablePaginationConfig</code> 暂未暴露 <code>simple</code>
              ，仅 <code>pageSize:3</code>（§9 已知简化，视觉等价）。
            </li>
            <li>
              <strong>antd-style 依赖</strong>：antd 官方 demo 用
              <code> antd-style</code> 库 <code>createStaticStyles</code>
              生成 className 字符串。本 demo 右栏改用 antd v6 原生
              <code> classNames</code>（字符串）+ <code>styles</code>（对象/函数），
              视觉等价、<strong>零额外依赖</strong>。root class 的 CSS 在
              <code>table.css</code> 末尾预定义（深色 + 圆角 12 + 阴影）。
            </li>
            <li>
              <strong>grid vs tr</strong>（已知差异）：data-grid 表头/表体无独立
              <code> &lt;tr&gt;</code>，<code>body.row</code>/<code>header.row</code>
              的 class 透传到该行所有单元格（与 antd td 结构不同，视觉等价）。
            </li>
            <li>
              <strong>pagination.item</strong>（已知差异）：antd Pagination 原生有
              <code> itemClassName</code>；data-grid <code>pagination.item</code> 为近似单项样式。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
