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
 * === 拆子文件（task S29：live 编辑接入，同 basic 模式）===
 *
 * 父文件只保留「外壳职责」：virtual/scrollY state（受控真理源，驱动两侧 + 顶部 Switch 控制条）
 * + SplitDemo 外壳（virtualizable={false}：本 demo 自带局部 Virtual 开关，不接全局开关）+
 * children 对照说明。两侧表格 JSX + columns + classNames/styles（对象 + 函数）拆到子文件：
 *   - `./style-class.dg`：`StyleClassDg({virtual, scrollY})`（左栏）
 *   - `./style-class.antd`：`StyleClassAntd({virtual, scrollY})`（右栏）
 *
 * ★ classNames/styles 配置（dgClassNames/dgStyles/dgStylesFn + antd 同款）全部搬入子组件，
 *   父文件不再持有（live 编辑子组件源码可独立展示/编译）。
 *
 * ★ state 提升决策（SOP）：virtual/scrollY 必须留父——父渲染顶部 Switch 控制条需直接读写它们；
 *   且同一 state 驱动两侧同步。classNames/styles 配置无外部控制条直接操作，按 SOP 留子组件内。
 *
 * 默认渲染（App SplitDemoPreview 默认模式）直接渲染本文件 `StyleClassDemo`，零编辑开销；
 * live 编辑模式 SplitDemoPreview 静态 import 真实子组件并按 editedDg/editedAntd 替换。
 * 子组件 props 全部带默认值（virtual=false/scrollY=false），编辑态超集 props
 * {bordered,virtual,size,autoScroll} 不全也不崩（两块 Table 完整可演示）。
 */

import { useState } from 'react'
import { Space, Switch } from 'antd'
import { SplitDemo } from './_compare/SplitDemo'
import { DemoToolbar } from './_compare/DemoToolbar'
// ★ 拆子文件后，左/右栏 JSX + columns + classNames/styles 配置由子组件提供（props 驱动）。
//   RecordType/dataSource 现在由子文件各自 import style-class.shared；父文件不再需要。
import StyleClassDg from './style-class.dg'
import StyleClassAntd from './style-class.antd'

export default function StyleClassDemo() {
  // ★ 共享状态：同一个状态同时驱动两侧表格。初值 virtual=true/scrollY=true（对齐改造前 demo
  //   默认演示虚拟化 + 固定表头纵滚 + styles 组合的语义）。
  const [virtual, setVirtual] = useState(true)
  const [scrollY, setScrollY] = useState(true)

  return (
    <div style={{ padding: 24 }}>
      {/* ★ 共享控制条：全宽，在 SplitDemo 上方。同一个状态同时驱动两侧表格。
          DemoToolbar 用 useToken（light/dark/自定义 token 自适应），替代硬编码 #fff/#f0f0f0。 */}
      <DemoToolbar>
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
      </DemoToolbar>

      {/*
        minPaneWidth=600 → 横排阈值 ≈ 1216。常规笔记本视口（≥1280）即可横排；
        窄视口自动换行竖排。4 列（Name/Age/Address/Description）+ 分页 pageSize:3，半宽 ~640 友好。
      */}
      <SplitDemo
        minPaneWidth={600}
        // ★ virtualizable={false}：本 demo 自带局部 Virtual 开关（演示 virtual + styles 组合），
        // 不接全局开关——避免全局开关的限高与自带的 virtual 演示叠加冲突。
        virtualizable={false}
        left={<StyleClassDg virtual={virtual} scrollY={scrollY} />}
        right={<StyleClassAntd virtual={virtual} scrollY={scrollY} />}
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
            <li>
              <strong>全局虚拟化开关不生效</strong>：本 demo 自带局部 Virtual 开关
              （演示 virtual + styles 组合），不接全局开关。
            </li>
          </ul>
        </div>
      </SplitDemo>
    </div>
  )
}
