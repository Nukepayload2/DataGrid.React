/**
 * 主题感知控制条容器（demo chrome）。
 *
 * 各 demo 的「共享控制条」（Bordered 开关 / Reset 按钮 / 受控 state 按钮组等）用 antd
 * `theme.useToken()` 拿主题驱动 token，避免暗主题（dark algorithm）下硬编码白底与暗背景冲突：
 *   - `colorBgContainer`：浅色≈#fff / 暗色≈#141414，自动跟随当前 ConfigProvider 主题
 *     （light / dark / 自定义 token 都自适应）。
 *   - `colorBorderSecondary`：浅色≈#f0f0f0 / 暗色≈#303030，同理。
 *
 * 调用方仅替换 `<div style={{...硬编码...}}>` 为 `<DemoToolbar>`，内部控件（Switch/Space/
 * Segmented/Button）原样保留。可选 `style` 透传合并（覆盖或追加）。
 *
 * 仅用于 demo 控制条容器（chrome），不动 demo 内容色（Tag 预设色 / 链接色 / 强调色等业务色）。
 */
import { theme } from 'antd'
import type { CSSProperties, ReactNode } from 'react'

export function DemoToolbar({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const { token } = theme.useToken()
  return (
    <div
      style={{
        marginBottom: 16,
        padding: 12,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 8,
        background: token.colorBgContainer,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export default DemoToolbar
