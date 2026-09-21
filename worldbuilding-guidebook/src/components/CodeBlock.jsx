import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { SelectionTutor } from '../tutor/Tutor.jsx'
import { stepContext } from '../tutor/stepContext.js'
import { TUTOR_ENABLED } from '../tutor/tutorEnabled.js'
import { stepsBySlug } from '../content/loader.js'
import { createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import javascript from 'shiki/langs/javascript.mjs'
import jsx from 'shiki/langs/jsx.mjs'
import { createCodeTheme } from '../styles/codeTheme.js'
import { readToken } from '../styles/readToken.js'
import './CodeBlock.css'
import ExpandableCode from './ExpandableCode.jsx'

let highlighter

function highlight(snippet) {
  highlighter ??= createHighlighterCoreSync({
    themes: [createCodeTheme(readToken)],
    langs: [javascript, jsx],
    engine: createJavaScriptRegexEngine(),
  })
  return highlighter.codeToTokens(snippet.code, { lang: snippet.language, theme: 'worldbuilding-guidebook-light' }).tokens
}

export default function CodeBlock({ stepId, reference, snippet, blanks = [] }) {
  if (!snippet) throw new Error(`No extracted code for ${stepId}. Run npm run predev.`)
  const lines = useMemo(() => highlight(snippet), [snippet])
  const [selection, setSelection] = useState(null)
  const [explaining, setExplaining] = useState(false)
  const highlighted = new Set(reference.highlight ?? [])
  const labelId = `code-${stepId.replaceAll('/', '-')}`

  useEffect(() => {
    function closeSelection(event) { if (event.key === 'Escape') setSelection(null) }
    window.addEventListener('keydown', closeSelection)
    return () => window.removeEventListener('keydown', closeSelection)
  }, [])

  function selectCode(event) {
    if (blanks.length || stepId.endsWith('-reference')) return
    const selected = window.getSelection()
    if (!selected?.rangeCount || selected.isCollapsed || !event.currentTarget.contains(selected.anchorNode) || !event.currentTarget.contains(selected.focusNode)) return
    const text = selected.toString().trim()
    if (!text) return
    const rectangle = selected.getRangeAt(0).getBoundingClientRect()
    const step = stepsBySlug.get(stepId.replace(/-fill$|-reference$/, ''))
    if (!step) return
    const line = selected.anchorNode.parentElement.closest('.code-block__line')
    const lineIndex = line ? [...event.currentTarget.querySelectorAll('.code-block__line')].indexOf(line) : 0
    setSelection({ context: { ...stepContext(step), selection: text.slice(0, 4000), selectionSource: `${snippet.file}:${snippet.startLine + lineIndex}` }, position: { left: Math.max(8, Math.min(rectangle.left, window.innerWidth - 384)), top: Math.max(8, Math.min(rectangle.bottom + 8, window.innerHeight - 400)) } })
    setExplaining(false)
  }

  function renderTokens(tokens, index) {
    const line = tokens.map((token) => token.content).join('')
    const blank = blanks.find((entry) => entry.line === index + 1)
    const start = blank ? line.indexOf(blank.answer) : -1
    if (blank && start < 0) throw new Error(`Blank answer is missing on line ${index + 1}`)
    let offset = 0
    const result = []
    let inserted = false
    for (const [i, token] of tokens.entries()) {
      const end = offset + token.content.length
      const style = { color: token.color, fontStyle: token.fontStyle & 1 ? 'italic' : undefined }
      if (!blank || end <= start || offset >= start + blank.answer.length) result.push(<span key={i} style={style}>{token.content}</span>)
      else {
        if (offset < start) result.push(<span key={`${i}-before`} style={style}>{token.content.slice(0, start - offset)}</span>)
        if (!inserted) { result.push(<span key="blank">{blank.render()}</span>); inserted = true }
        if (end > start + blank.answer.length) result.push(<span key={`${i}-after`} style={style}>{token.content.slice(start + blank.answer.length - offset)}</span>)
      }
      offset = end
    }
    return result
  }

  return (
    <>
    <ExpandableCode aria-labelledby={labelId}>
      <header className="code-block__header">
        <span id={labelId} className="code-block__name">{snippet.name}{reference.fn ? '()' : ''}</span>
        <span className="code-block__file" title={`${snippet.file}:${snippet.startLine}`}>
          {snippet.file.split('/').at(-1)}
        </span>
      </header>
      <pre onMouseUp={selectCode} onKeyUp={selectCode} className="code-block__scroll" tabIndex={0} aria-label={`${snippet.name} source code`}>
        <code>{lines.map((tokens, index) => (
          <span className="code-block__line" data-highlighted={highlighted.has(index + 1)} key={index}>
            <span className="code-block__number" aria-hidden="true">{index + 1}</span>
            <span>{renderTokens(tokens, index)}{index < lines.length - 1 ? '\n' : ''}</span>
          </span>
        ))}</code>
      </pre>
    </ExpandableCode>
    {TUTOR_ENABLED && selection && createPortal(explaining ? <SelectionTutor context={selection.context} position={selection.position} onClose={() => setSelection(null)} /> : <button type="button" className="tutor-selection-button" style={selection.position} onClick={() => setExplaining(true)} onKeyDown={(event) => { if (event.key === 'Escape') setSelection(null) }}>Explain this</button>, document.body)}
    </>
  )
}
