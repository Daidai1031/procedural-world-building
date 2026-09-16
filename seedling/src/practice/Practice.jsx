import { useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_MAP_SETTINGS } from '../scene/demos/proceduralMaps/noiseMath.js'
import CodeBlock from '../components/CodeBlock.jsx'
import CodeEditor from './CodeEditor.jsx'
import { useProgressStore } from '../store/progressStore.js'
import { useSceneStore } from '../store/sceneStore.js'
import { mapSettingsFromParams } from '../scene/demos/proceduralMaps/params.js'
import { matchDistance, normalizeWhitespace, withinTolerance } from './scoring.js'
import { sourceWithMath } from './mathSource.js'
import { runSandbox } from './sandbox.js'
import './practice.css'

function answerMatches(answer, expected) {
  try { return normalizeWhitespace(answer ?? '') === normalizeWhitespace(expected) }
  catch { return false }
}

function TutorOffer({ context }) {
  return <button type="button" disabled data-tutor-context={JSON.stringify(context)} title="Available in Phase 5">Ask about this {context.blank ? 'blank' : 'task'}</button>
}

function Result({ result }) {
  return result?.passed ? <p><span className="practice__pass" aria-label="Passed">{'\u2713'}</span> Passed</p> : null
}

function saveAttempt(stepId, patch) {
  const store = useProgressStore.getState()
  const previous = store.practiceResults[stepId] ?? {}
  const result = { ...patch, attempts: (previous.attempts ?? 0) + 1, failures: (previous.failures ?? 0) + (patch.passed ? 0 : 1), passed: previous.passed || patch.passed }
  store.savePractice(stepId, result)
  if (result.passed) store.markStepComplete(stepId)
}

function Match({ stepId, task, result }) {
  const params = useSceneStore((state) => state.params)
  const settings = useMemo(() => mapSettingsFromParams(params), [params])
  const distance = useMemo(() => matchDistance(task.target, settings, task.compare), [task, settings])
  useEffect(() => {
    const previous = useProgressStore.getState().practiceResults[stepId]
    if (previous?.params) {
      for (const key of task.compare) useSceneStore.getState().setParam(`map${key[0].toUpperCase()}${key.slice(1)}`, previous.params[key])
    }
  }, [stepId, task])
  useEffect(() => {
    useProgressStore.getState().savePractice(stepId, { params: settings, distance })
  }, [stepId, settings, distance])
  return <>
    <p>{task.prompt}</p>
    <label>Distance <meter min="0" max="1" value={distance} low={task.tolerance} optimum="0" /></label>
    <output aria-live="polite">{distance.toFixed(4)}</output>
    <button type="button" onClick={() => saveAttempt(stepId, { passed: distance <= task.tolerance, distance, params: settings })}>Check match</button>
    {distance > task.tolerance && <><p>{task.hints?.[0]}</p><TutorOffer context={{ stepId, task, params: settings }} /></>}
    <Result result={result} />
  </>
}

function Fill({ stepId, task, snippet, result }) {
  const [answers, setAnswers] = useState(result?.answers ?? {})
  const [checked, setChecked] = useState((result?.attempts ?? 0) > 0)
  function change(index, value) {
    const next = { ...answers, [index]: value }
    setAnswers(next)
    useProgressStore.getState().savePractice(stepId, { answers: next })
  }
  function check(event) {
    event.preventDefault()
    setChecked(true)
    saveAttempt(stepId, { answers, passed: task.blanks.every((blank, i) => answerMatches(answers[i], blank.answer)) })
  }
  const blanks = task.blanks.map((blank, i) => ({ ...blank, render: () => blank.options ?
    <select aria-label={`Blank ${i + 1}`} value={answers[i] ?? ''} onChange={(event) => change(i, event.target.value)}><option value="">Choose...</option>{blank.options.map((option) => <option key={option}>{option}</option>)}</select> :
    <input aria-label={`Blank ${i + 1}`} value={answers[i] ?? ''} onChange={(event) => change(i, event.target.value)} autoComplete="off" spellCheck={false} /> }))
  return <form onSubmit={check}>
    <CodeBlock stepId={`${stepId}-fill`} reference={task.from} snippet={snippet} blanks={blanks} />
    <button type="submit">Check answers</button>
    {checked && task.blanks.map((blank, i) => !answerMatches(answers[i], blank.answer) && <div key={i} role="status"><p>{blank.hint}</p><TutorOffer context={{ stepId, blank: { ...blank, response: answers[i] ?? '' }, source: { file: snippet.file, startLine: snippet.startLine + blank.line - 1 } }} /></div>)}
    <Result result={result} />
  </form>
}

function MapImage({ label, values }) {
  const canvas = useRef(null)
  useEffect(() => {
    const context = canvas.current.getContext('2d')
    const image = context.createImageData(64, 64)
    values.forEach((value, i) => {
      const gray = Math.round(Math.max(0, Math.min(1, value)) * 255)
      image.data.set([gray, gray, gray, 255], i * 4)
    })
    context.putImageData(image, 0, 0)
  }, [values])
  return <figure><canvas ref={canvas} width="64" height="64" aria-label={label} /><figcaption>{label}</figcaption></figure>
}

function Implement({ stepId, task, snippet, result }) {
  const [source, setSource] = useState(result?.source ?? task.starter)
  const [error, setError] = useState(result?.error ?? '')
  const [busy, setBusy] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [maps, setMaps] = useState(null)
  const controller = useRef(null)
  useEffect(() => () => controller.current?.abort(), [])
  function change(value) {
    setSource(value)
    useProgressStore.getState().savePractice(stepId, { source: value })
  }
  async function run(event) {
    event?.preventDefault()
    controller.current?.abort()
    controller.current = new AbortController()
    const signal = controller.current.signal
    setBusy(true)
    setMaps(null)
    try {
      const inputs = task.cases.map((entry) => entry.args)
      const name = task.reference.fn
      const [actual, expected] = await Promise.all([
        runSandbox({ source: sourceWithMath(source, name), name: 'evaluate', inputs }, { signal }),
        runSandbox({ source: sourceWithMath(snippet.code.replace(/\bexport /g, ''), name), name: 'evaluate', inputs }, { signal }),
      ])
      const passed = actual.every((value, i) => withinTolerance(value, expected[i], task.tolerance))
      if (task.visual) {
        const gridInputs = Array.from({ length: 4096 }, (_, i) => [(i % 64 / 63 - 0.5) * 10, (Math.floor(i / 64) / 63 - 0.5) * 10, task.visualSettings ?? {}])
        for (const args of gridInputs) args[2] = { ...DEFAULT_MAP_SETTINGS, ...args[2] }
        const [learner, reference] = await Promise.all([
          runSandbox({ source: sourceWithMath(source, name), name: 'evaluateMap', inputs: gridInputs }, { signal }),
          runSandbox({ source: sourceWithMath(snippet.code.replace(/\bexport /g, ''), name), name: 'evaluateMap', inputs: gridInputs }, { signal }),
        ])
        if ([...learner, ...reference].some((value) => !Number.isFinite(value))) throw new Error('Maps must contain finite numbers')
        setMaps({ learner, reference, difference: learner.map((value, i) => Math.abs(value - reference[i])) })
      }
      setError(passed ? '' : 'Some cases differ from the course version.')
      saveAttempt(stepId, { source, passed, error: passed ? '' : 'Some cases differ from the course version.' })
    } catch (error) {
      if (!signal.aborted) { setError(error.message); saveAttempt(stepId, { source, passed: false, error: error.message }) }
    } finally { if (!signal.aborted) setBusy(false) }
  }
  return <>
    <p>{task.brief}</p>
    <form onSubmit={run} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !busy) run(event) }}>
      <div className="code-block"><header className="code-block__header"><span className="code-block__name">{task.signature}</span><span className="code-block__file">{snippet.file.split('/').at(-1)}</span></header><CodeEditor label={`Implementation for ${stepId}`} value={source} onChange={change} /></div>
      <button type="submit" disabled={busy}>{busy ? 'Running...' : 'Run cases'}</button>
    </form>
    {error && <><p role="alert">{error}</p><TutorOffer context={{ stepId, task, source, error }} /></>}
    {maps && <div className="practice__maps"><MapImage label="Your map" values={maps.learner} /><MapImage label="Course map" values={maps.reference} /><MapImage label="Absolute difference" values={maps.difference} /></div>}
    {(result?.failures ?? 0) >= 3 && <button type="button" onClick={() => setReveal(true)}>Compare with the course version</button>}
    {reveal && <CodeBlock stepId={`${stepId}-reference`} reference={task.reference} snippet={snippet} />}
    <Result result={result} />
  </>
}

export default function Practice({ stepId, task, snippet }) {
  const result = useProgressStore((state) => state.practiceResults[stepId])
  const Kind = { match: Match, fill: Fill, implement: Implement }[task.kind]
  if (!Kind) throw new Error(`Unknown practice kind: ${task.kind}`)
  return <section className="practice" aria-label={`${task.kind} practice`}><Kind key={stepId} stepId={stepId} task={task} snippet={snippet} result={result} /></section>
}

