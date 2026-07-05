/** 只读 demo 源码高亮视图。 */
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
            {tokens.map((line, i) => {
              // Stage 6 #1-2: 不用 {...spread} 直接传，避免 react-doctor jsx-key 警告
              // （spread 可能覆盖 key）与 eslint-plugin-react jsx-key 警告（key 必须在 spread 前）
              // 两规则在位置要求上互斥。prism-react-renderer 的 getLineProps/getTokenProps 实际
              // 只产出 className + style（见其 d.ts），直接取这两个字段传入即可消除 spread，
              // 两规则同时不再触发。
              const { className: lineClassName, style: lineStyle } = getLineProps({
                line,
              })
              return (
                <div
                  key={i}
                  className={lineClassName}
                  style={{ ...lineStyle, paddingLeft: 12 }}
                >
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
                  {line.map((token, key) => {
                    const {
                      className: tokenClassName,
                      style: tokenStyle,
                    } = getTokenProps({ token })
                    return (
                      <span key={key} className={tokenClassName} style={tokenStyle} />
                    )
                  })}
                </div>
              )
            })}
          </pre>
        )}
      </Highlight>
    </div>
  )
}
