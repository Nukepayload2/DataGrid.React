/** live 源码编辑器，负责编辑、应用、重置和编译/执行错误展示。 */
import { useEffect, useState, type CSSProperties, type ComponentType } from 'react'
import { Alert, Button } from 'antd'
import { Highlight, themes } from 'prism-react-renderer'
import { useTheme } from '../theme/ThemeContext'

/** 应用回调的载荷：成功传组件、失败传错误、重置传 (null,null)。 */
export type LiveEditorApplyPayload = {
  Comp: ComponentType<Record<string, unknown>> | null
  error: string | null
}

export interface LiveEditorProps {
  /** 初始源码（来自 import.meta.glob '?raw'，与 CodeView 同源）。 */
  initialCode: string
  /** 编辑器标题（用于占位/无障碍）。 */
  title?: string
  /** require 注入表（由 scopeForDemo 构造）。 */
  scope: Record<string, unknown>
  /** 应用/重置时触发：成功 (Comp,null)、失败 (null,error)、重置 (null,null)。 */
  onApply: (Comp: ComponentType<Record<string, unknown>> | null, error: string | null) => void
}

// textarea 与高亮层必须共享排版字段，才能保持字符对齐。
const editorTypeStyle: CSSProperties = {
  margin: 0,
  padding: '12px 12px',
  fontSize: 13,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  lineHeight: 1.6,
  whiteSpace: 'pre',
  tabSize: 2,
}

export default function LiveEditor({
  initialCode,
  title,
  scope,
  onApply,
}: LiveEditorProps) {
  const { themeMode } = useTheme()
  const isDark = themeMode === 'dark'
  const prismTheme = isDark ? themes.vsDark : themes.oneLight

  const [code, setCode] = useState(initialCode)
  // 切换 demo 时同步编辑器内容，避免沿用上一个 demo 的本地 state。
  useEffect(() => {
    setCode(initialCode)
  }, [initialCode])
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  async function handleApply(): Promise<void> {
    setApplying(true)
    setError(null)
    try {
      // 仅在点击“应用”时加载编译与执行模块。
      const { compile } = await import('./compile')
      const { evalModule } = await import('./evalModule')
      const compiled = compile(code)
      if (!compiled.ok) {
        setError(compiled.error)
        onApply(null, compiled.error)
        return
      }
      const evaluated = evalModule(compiled.js, scope)
      if (!evaluated.ok) {
        setError(evaluated.error)
        onApply(null, evaluated.error)
        return
      }
      onApply(evaluated.Comp, null)
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e)
      setError(msg)
      onApply(null, msg)
    } finally {
      setApplying(false)
    }
  }

  function handleReset(): void {
    setCode(initialCode)
    setError(null)
    onApply(null, null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 12, opacity: 0.7 }}>{title ?? '源码编辑'}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="small" onClick={handleReset}>
            重置
          </Button>
          <Button
            size="small"
            type="primary"
            loading={applying}
            onClick={handleApply}
          >
            应用
          </Button>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          maxHeight: 360,
          overflow: 'auto',
          borderRadius: 8,
          background: prismTheme.plain.backgroundColor,
        }}
      >
        <Highlight code={code} language="tsx" theme={prismTheme}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <div style={{ display: 'grid' }}>
              {/* 高亮层（只读展示） */}
              <pre
                className={className}
                aria-hidden="true"
                style={{
                  ...style,
                  ...editorTypeStyle,
                  gridArea: '1 / 1',
                  pointerEvents: 'none',
                  background: 'transparent',
                  overflow: 'hidden',
                }}
              >
                {tokens.map((line, i) => {
                  const lineProps = getLineProps({ line })
                  return (
                    <div key={i} {...lineProps}>
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </div>
                  )
                })}
              </pre>

              {/* 输入层（透明文字 + 透明背景，仅 caret 可见） */}
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                wrap="off"
                style={{
                  ...editorTypeStyle,
                  gridArea: '1 / 1',
                  resize: 'none',
                  border: 'none',
                  outline: 'none',
                  color: 'transparent',
                  backgroundColor: 'transparent',
                  caretColor: isDark ? '#fff' : '#000',
                  overflow: 'hidden',
                  whiteSpace: 'pre',
                }}
              />
            </div>
          )}
        </Highlight>
      </div>

      {error && (
        <Alert
          type="error"
          showIcon
          message="编译/执行错误"
          description={error}
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        />
      )}
    </div>
  )
}
