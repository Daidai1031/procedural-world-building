import { useMemo } from 'react'
import { createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import javascript from 'shiki/langs/javascript.mjs'
import jsx from 'shiki/langs/jsx.mjs'
import { createCodeTheme } from '../styles/codeTheme.js'
import { readToken } from '../styles/readToken.js'
import './CodeBlock.css'

let highlighter

function highlight(snippet) {
  highlighter ??= createHighlighterCoreSync({
    themes: [createCodeTheme(readToken)],
    langs: [javascript, jsx],
    engine: createJavaScriptRegexEngine(),
  })
  return highlighter.codeToTokens(snippet.code, { lang: snippet.language, theme: 'seedling-light' }).tokens
}

export default function CodeBlock({ stepId, reference, snippet }) {
  if (!snippet) throw new Error(`No extracted code for ${stepId}. Run npm run predev.`)
  const lines = useMemo(() => highlight(snippet), [snippet])
  const highlighted = new Set(reference.highlight ?? [])
  const labelId = `code-${stepId.replaceAll('/', '-')}`

  return (
    <section className="code-block" aria-labelledby={labelId}>
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
            <span>{tokens.map((token, tokenIndex) => (
              <span key={tokenIndex} style={{ color: token.color, fontStyle: token.fontStyle & 1 ? 'italic' : undefined }}>
                {token.content}
              </span>
            ))}{index < lines.length - 1 ? '\n' : ''}</span>
          </span>
        ))}</code>
      </pre>
    </section>
  )
}
