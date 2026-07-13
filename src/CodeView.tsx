/** 只读 demo 源码视图。 */
import CodeMirrorEditor from './code/CodeMirrorEditor'
import { useTheme } from './theme/ThemeContext'

export interface CodeViewProps {
  code: string
  height?: number | string
  maxHeight?: number | string
  ariaLabel?: string
}

export default function CodeView({
  code,
  height = '70vh',
  maxHeight,
  ariaLabel = '只读源码',
}: CodeViewProps) {
  const { themeMode } = useTheme()

  return (
    <CodeMirrorEditor
      value={code}
      readOnly
      dark={themeMode === 'dark'}
      height={height}
      maxHeight={maxHeight}
      ariaLabel={ariaLabel}
    />
  )
}
