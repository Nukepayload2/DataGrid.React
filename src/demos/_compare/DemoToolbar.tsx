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
