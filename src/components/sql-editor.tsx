import { autocompletion, completionKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { searchKeymap } from '@codemirror/search'
import { EditorState, type Extension } from '@codemirror/state'
import { EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view'
import { SQLite, sql, type SQLNamespace } from '@codemirror/lang-sql'
import { useEffect, useMemo, useRef } from 'preact/hooks'
import type { TableInfo } from '../domain/types'

export function SqlEditor({
  value,
  schema,
  onChange,
}: {
  value: string
  schema: TableInfo[]
  onChange: (value: string) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)

  onChangeRef.current = onChange

  const schemaNamespace = useMemo<SQLNamespace>(() => {
    const namespace: Record<string, string[]> = {}
    schema.forEach((table) => {
      namespace[table.name] = table.columns.map((column) => column.name)
    })
    return namespace
  }, [schema])

  useEffect(() => {
    if (!hostRef.current) return

    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      drawSelection(),
      EditorState.allowMultipleSelections.of(true),
      sql({
        dialect: SQLite,
        schema: schemaNamespace,
        upperCaseKeywords: true,
      }),
      autocompletion({
        activateOnTyping: true,
      }),
      highlightActiveLine(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, ...completionKeymap]),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString())
        }
      }),
      EditorView.theme({
        '&': {
          minHeight: '360px',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#101712',
          color: '#d8eadf',
          fontSize: '14px',
        },
        '.cm-scroller': {
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
          lineHeight: '1.55',
        },
        '.cm-content': {
          padding: '16px 0',
        },
        '.cm-line': {
          padding: '0 16px',
        },
        '.cm-gutters': {
          backgroundColor: '#0b120e',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#718074',
        },
        '.cm-activeLine': {
          backgroundColor: 'rgba(94, 234, 212, 0.08)',
        },
        '.cm-activeLineGutter': {
          backgroundColor: 'rgba(94, 234, 212, 0.12)',
          color: '#ccfbf1',
        },
        '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
          backgroundColor: 'rgba(20, 184, 166, 0.35)',
        },
        '&.cm-focused': {
          outline: '3px solid rgba(20, 184, 166, 0.35)',
          outlineOffset: '2px',
        },
        '.cm-tooltip': {
          borderRadius: '8px',
          border: '1px solid #cfd9cd',
          overflow: 'hidden',
        },
      }),
    ]

    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value,
        extensions,
      }),
    })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [schemaNamespace])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const current = view.state.doc.toString()
    if (current === value) return

    view.dispatch({
      changes: {
        from: 0,
        to: current.length,
        insert: value,
      },
    })
  }, [value])

  return <div class="overflow-hidden rounded-lg border border-[#17231d] bg-[#101712]" ref={hostRef} />
}
