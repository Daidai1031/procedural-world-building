import { useCallback, useEffect, useRef, useState } from 'react'
import CodeEditor from './CodeEditor.jsx'
import { evaluateOverride } from './overrides.js'
import { useSceneStore } from '../store/sceneStore.js'
import './practice.css'

export default function EditableCode({ stepId, reference, snippet }) {
  const [source, setSource] = useState(snippet.code.replace(/\bexport /g, ''))
  const simulationError = useSceneStore((state) => state.overrideError)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const controller = useRef(null)
  const apply = useCallback(async function apply(code) {
    controller.current?.abort()
    controller.current = new AbortController()
    const signal = controller.current.signal
    setBusy(true)
    try { await evaluateOverride(reference.fn, code, signal); setError('') }
    catch (error) { if (!signal.aborted) setError(error.message) }
    finally { if (!signal.aborted) setBusy(false) }
  }, [reference.fn])
  useEffect(() => () => controller.current?.abort(), [])
  function reset() {
    controller.current?.abort()
    useSceneStore.getState().publishOverrides({}, null)
    setSource(snippet.code.replace(/\bexport /g, ''))
    setError('')
    setBusy(false)
  }
  return <section className="code-block practice" aria-label={`Edit ${snippet.name}`}>
    <header className="code-block__header"><span className="code-block__name">{snippet.name}()</span><span className="code-block__file">{snippet.file.split('/').at(-1)}</span></header>
    <form onSubmit={(event) => { event.preventDefault(); apply(source) }} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); if (!busy) apply(source) } }}>
      <CodeEditor label={`Code for ${stepId}`} value={source} onChange={setSource} />
      <button disabled={busy} type="submit">{busy ? 'Evaluating...' : 'Apply to scene'}</button>
      <button type="button" onClick={reset}>Reset to original</button>
      {(error || simulationError) && <p role="alert">{error || simulationError}</p>}
    </form>
  </section>
}

