import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { createCodeTheme } from '../styles/codeTheme.js'
import { readToken } from '../styles/readToken.js'
import '../components/CodeBlock.css'

export default function CodeEditor({ value, onChange, label }) {
  const host = useRef(null)
  const editor = useRef(null)
  const initialValue = useRef(value)
  const change = useRef(onChange)
  useEffect(() => { change.current = onChange }, [onChange])
  useEffect(() => {
    const theme = createCodeTheme(readToken)
    const colors = theme.tokenColors
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({ doc: initialValue.current, extensions: [
        lineNumbers(), history(), keymap.of([...defaultKeymap, ...historyKeymap]), javascript(),
        EditorView.contentAttributes.of({ 'aria-label': label, spellcheck: 'false' }),
        EditorView.theme({
          '&': { backgroundColor: theme.colors['editor.background'], color: theme.colors['editor.foreground'], fontSize: '16px' },
          '.cm-content, .cm-gutters': { fontFamily: 'var(--font-data)', lineHeight: 'var(--leading-prose)' },
          '.cm-gutters': { backgroundColor: 'var(--paper-2)', color: 'var(--ink-faint)', border: 'none' },
          '&.cm-focused': { outline: '2px solid var(--ink)', outlineOffset: '2px' },
          '.cm-scroller': { overflow: 'auto', maxHeight: '360px' },
        }),
        syntaxHighlighting(HighlightStyle.define([
          { tag: tags.keyword, color: colors[1].settings.foreground },
          { tag: tags.string, color: colors[2].settings.foreground },
          { tag: tags.number, color: colors[3].settings.foreground },
          { tag: tags.comment, color: colors[4].settings.foreground, fontStyle: 'italic' },
        ])),
        EditorView.updateListener.of((update) => { if (update.docChanged) change.current(update.state.doc.toString()) }),
      ] }),
    })
    editor.current = view
    return () => view.destroy()
  }, [label])
  useEffect(() => {
    const view = editor.current
    if (view && view.state.doc.toString() !== value) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
  }, [value])
  return <div ref={host} />
}
