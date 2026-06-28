/**
 * CodeView：demo 源码高亮展示。
 *
 * 使用 prism-react-renderer（v2，package 已装 2.4.1）。
 * - theme 跟随全局 ThemeContext.themeMode：dark→vsDark，light→oneLight。
 * - 背景取 themes 自带的 style.background（不硬编码颜色，遵循 demo token 化约定）。
 * - 带行号（左 gutter，半透明）+ 横向滚动；外层 div 控 max-height + overflow。
 */
import { Highlight, themes } from 'prism-react-renderer'
import { useTheme } from './theme/ThemeContext'

export interface CodeViewProps {
  code: string
}

export default function CodeView({ code }: CodeViewProps) {
  const { themeMode } = useTheme()
  const isDark = themeMode === 'dark'

  return (
    <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
      <Highlight code={code} language="tsx" theme={isDark ? themes.vsDark : themes.oneLight}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={className}
            style={{
              ...style,
              margin: 0,
              borderRadius: 8,
              padding: '12px 0',
              fontSize: 13,
              fontFamily: 'ui-monospace, monospace',
              overflowX: 'auto',
            }}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })} style={{ paddingLeft: 12 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '2.5em',
                    userSelect: 'none',
                    opacity: 0.45,
                    textAlign: 'right',
                    paddingRight: 16,
                  }}
                >
                  {i + 1}
                </span>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  )
}
