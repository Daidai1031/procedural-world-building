import { useMemo } from 'react'
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
  return highlighter.codeToTokens(snippet.code, { lang: snippet.language, theme: 'seedling-light' }).tokens
}

export default function CodeBlock({ stepId, reference, snippet, blanks = [] }) {
  if (!snippet) throw new Error(`No extracted code for ${stepId}. Run npm run predev.`)
  const lines = useMemo(() => highlight(snippet), [snippet])
  const highlighted = new Set(reference.highlight ?? [])
  const labelId = `code-${stepId.replaceAll('/', '-')}`

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
    <ExpandableCode aria-labelledby={labelId}>
      <header className="code-block__header">
        <span id={labelId} className="code-block__name">{snippet.name}{reference.fn ? '()' : ''}</span>
        <span className="code-block__file" title={`${snippet.file}:${snippet.startLine}`}>
          {snippet.file.split('/').at(-1)}
        </span>
      </header>
      <pre className="code-block__scroll" tabIndex={0} aria-label={`${snippet.name} source code`}>
        <code>{lines.map((tokens, index) => (
          <span className="code-block__line" data-highlighted={highlighted.has(index + 1)} key={index}>
            <span className="code-block__number" aria-hidden="true">{index + 1}</span>
            <span>{renderTokens(tokens, index)}{index < lines.length - 1 ? '\n' : ''}</span>
          </span>
        ))}</code>
      </pre>
    </ExpandableCode>
  )
}
