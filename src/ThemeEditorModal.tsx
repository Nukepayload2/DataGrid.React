/**
 * ThemeEditorModal：顶栏「主题编辑器」按钮打开的 Modal。
 *
 * 内部渲染 ThemeEditorPanel（从 src/demos/theme-editor 抽出，行为零变化）。
 * Modal body 限高 80vh + 滚动（panel 内容较长，控制面板 + 双栏预览 + 折叠说明区）。
 */
import { Modal } from 'antd'
import { ThemeEditorPanel } from './demos/theme-editor'

export interface ThemeEditorModalProps {
  open: boolean
  onClose: () => void
}

export default function ThemeEditorModal({
  open,
  onClose,
}: ThemeEditorModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="主题编辑器"
      width={1100}
      footer={null}
      styles={{ body: { maxHeight: '80vh', overflow: 'auto' } }}
    >
      <ThemeEditorPanel />
    </Modal>
  )
}
