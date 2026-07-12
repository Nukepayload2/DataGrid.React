import { useEffect, useRef } from 'react'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { basicSetup } from 'codemirror'

const lightTheme = EditorView.theme({}, { dark: false })

const baseTheme = EditorView.theme({
  '&': {
    borderRadius: '8px',
    overflow: 'hidden',
  },
  '.cm-scroller': {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: '13px',
    lineHeight: '1.6',
  },
  '.cm-content': {
    minHeight: '100%',
  },
  '.cm-line': {
    paddingInline: '6px 12px',
  },
  '.cm-gutters': {
    fontSize: '13px',
  },
})

export interface CodeMirrorEditorProps {
  value: string
  readOnly?: boolean
  dark?: boolean
  height?: number | string
  maxHeight?: number | string
  ariaLabel?: string
  onChange?: (value: string) => void
}

function sizeValue(value: number | string | undefined): string | undefined {
  return typeof value === 'number' ? `${value}px` : value
}

export default function CodeMirrorEditor({
  value,
  readOnly = false,
  dark = false,
  height = 360,
  maxHeight,
  ariaLabel = '代码编辑器',
  onChange,
}: CodeMirrorEditorProps) {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const themeCompartmentRef = useRef(new Compartment())
  const editableCompartmentRef = useRef(new Compartment())

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const parent = parentRef.current
    if (!parent) return

    const view = new EditorView({
      parent,
      doc: value,
      extensions: [
        basicSetup,
        javascript({ jsx: true, typescript: true }),
        baseTheme,
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
        themeCompartmentRef.current.of(dark ? oneDark : lightTheme),
        editableCompartmentRef.current.of([
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current?.(update.state.doc.toString())
          }
        }),
      ],
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === value) return
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
    })
  }, [value])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeCompartmentRef.current.reconfigure(dark ? oneDark : lightTheme),
    })
  }, [dark])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: editableCompartmentRef.current.reconfigure([
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
      ]),
    })
  }, [readOnly])

  return (
    <div
      ref={parentRef}
      style={{
        height: sizeValue(height),
        maxHeight: sizeValue(maxHeight),
        overflow: 'auto',
      }}
    />
  )
}