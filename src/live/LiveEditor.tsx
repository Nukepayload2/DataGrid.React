/**
 * LiveEditor：可编辑源码 + 应用/重置 + 错误展示。
 *
 * === 整体结构（仿 react-simple-code-editor / dumi）===
 * 一个 maxHeight + overflow:auto 的外层容器统一滚动，内部 display:grid 容器把
 *   - 底层 `<pre>`（prism Highlight 渲染高亮 token）——只读展示层。
 *   - 叠层 `<textarea>`（透明文字、透明背景、仅显示 caret）——真正接收输入。
 *   两者放进 grid 的 **同一格（gridArea:'1 / 1'）** 叠放，都用 overflow:hidden 不内部滚，
 *   随外层容器同步滚动。完全相同的 padding/fontSize/fontFamily/lineHeight/whiteSpace，
 *   使 textarea 的字符与 pre 的高亮字符像素级对齐（用户看到的颜色来自 pre，光标来自 textarea）。
 *   grid cell 高 = 代码全高，textarea stretch 到 cell 高，外层滚时两层一起滚（不再各自独立滚）。
 *
 * === 应用 / 重置 ===
 * - 「应用」：dynamic import ./compile + ./evalModule（**默认渲染路径不加载 sucrase**），
 *   编译 + 执行成功 → onApply(Comp, null)；失败 → onApply(null, error) 并把错误塞 Alert。
 * - 「重置」：恢复 initialCode、清 error、onApply(null, null)（null 信号 = 回退到默认渲染）。
 *
 * === 主题 ===
 * prism theme 跟随 useTheme().themeMode（dark→vsDark，light→oneLight），背景取 theme 自带
 * style.background，不硬编码颜色（遵循 demo token 化约定）。
 *
 * === 渲染期错误 ===
 * 本组件不渲染组件预览（预览由外层负责 + 包 LiveErrorBoundary）；只负责编译/执行错误的展示。
 */
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

// textarea 与 pre 共享的排版样式（像素对齐的关键：必须逐字段一致）。
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
  // 切 demo 时 useSplitDemoSource 返回新的 initialCode（App.tsx key 也变了但 rc-collapse
  // 子树稳定化未触发 remount，useState 不重置）→ 显式同步 code state 避免显示旧 demo 源码。
  // 重置按钮 setCode(initialCode) 不触发此 effect（initialCode 未变）；应用按钮不改 initialCode。
  useEffect(() => {
    setCode(initialCode)
  }, [initialCode])
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  async function handleApply(): Promise<void> {
    setApplying(true)
    setError(null)
    try {
      // dynamic import：确保默认渲染路径不加载 sucrase（仅点「应用」才拉编译器 chunk）。
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
    // null 信号：回退到默认渲染（外层用真实组件，不再用编辑产物）。
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

      {/* 编辑区：外层 maxHeight + overflow:auto 统一滚动；内部 grid 容器把 pre 与 textarea 放同一格叠放。 */}
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
            /* grid 容器：pre 和 textarea 同格（gridArea 1/1）叠放，overflow:hidden 不内部滚，随外层同步滚 */
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
