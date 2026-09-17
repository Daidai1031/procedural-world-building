import { useEffect, useRef, useState } from 'react'
import { Link, useMatch } from 'react-router-dom'
import { stepsBySlug } from '../content/loader.js'
import { useSceneStore } from '../store/sceneStore.js'
import { stepContext } from './stepContext.js'
import { safeContext } from './context.js'
import { askTutor, unlockTutor } from './client.js'
import { useTutorStore } from './tutorStore.js'
import './tutor.css'

function CitationText({ text, chunks }) {
  const steps = [...new Map(chunks.filter((chunk) => chunk.lessonSlug && chunk.stepSlug).map((chunk) => {
    const step = stepsBySlug.get(`${chunk.lessonSlug}/${chunk.stepSlug}`)
    return [step?.id, step]
  })).values()].filter(Boolean)
  if (!steps.length) return text
  const titles = steps.map((step) => step.frontmatter.title).sort((left, right) => right.length - left.length)
  const pattern = new RegExp(`(${titles.map((title) => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
  return text.split(pattern).map((part, index) => {
    const step = steps.find((entry) => entry.frontmatter.title === part)
    return step ? <Link key={index} to={`/lesson/${step.lessonSlug}/${step.stepSlug}`}>{part}</Link> : part
  })
}

function TutorResult({ message }) {
  if (!message) return null
  return <section className="tutor-result" aria-label="Tutor response" aria-busy={!['done', 'error'].includes(message.status)}>
    <p className="tutor-question">{message.question}</p>
    {message.status === 'searching' && !message.fallback && <label>Downloading the search model (23 MB). This happens once.<progress aria-label="Search model download" max="100" value={message.progress ?? 0} /></label>}
    {message.fallback && <p className="tutor-note">Search model unavailable; using keyword search.</p>}
    {message.notice && <p role="status">{message.notice}</p>}
    {message.chunks && <><h3>Related in this course</h3>{message.chunks.length ? <ol>{message.chunks.map((chunk) => <li key={chunk.id}><a href={chunk.url}>{chunk.title}</a></li>)}</ol> : <p>No close matches. Try a course term such as noise, camera, or erosion.</p>}</>}
    {message.status === 'answering' && !message.answer && <p role="status">Thinking about your question…</p>}
    {message.answer && <p className="tutor-answer"><CitationText text={message.answer} chunks={message.chunks ?? []} /></p>}
    {message.error && <p role="alert">{message.error}</p>}
  </section>
}

export function TutorForm({ context, entry = 'inline', initialQuestion = '', onResult, autoAsk = false }) {
  const [question, setQuestion] = useState(initialQuestion)
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)
  const running = useRef(false)
  const started = useRef(false)
  async function submit(event) {
    event?.preventDefault()
    if (!question.trim() || running.current) return
    running.current = true
    setBusy(true)
    const record = { id: crypto.randomUUID(), question: question.trim(), context: safeContext(entry === 'inline' ? { ...context, params: useSceneStore.getState().params } : context), status: 'searching', chunks: null, answer: '' }
    const history = entry === 'drawer' ? useTutorStore.getState().messages.filter((item) => item.answer).map(({ question, answer }) => ({ question, answer })).slice(-6) : []
    if (entry !== 'selection') useTutorStore.getState().add(record)
    function update(patch) {
      Object.assign(record, patch)
      setMessage({ ...record })
      onResult?.({ ...record })
      if (entry !== 'selection' || useTutorStore.getState().messages.some((message) => message.id === record.id)) useTutorStore.getState().update(record.id, patch)
    }
    update({})
    try { await askTutor(record.question, record.context, update, history) }
    catch (error) { update({ status: 'error', error: error.message }) }
    finally { running.current = false; setBusy(false) }
  }
  useEffect(() => {
    if (autoAsk && !started.current) { started.current = true; submit() }
  })
  return <div className="tutor-form">
    <form onSubmit={submit}>
      <label>Ask about this {entry === 'selection' ? 'code' : 'step'}<input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={2000} autoComplete="off" required /></label>
      <button type="submit" disabled={busy}>{busy ? 'Searching…' : 'Ask'}</button>
    </form>
    {entry !== 'drawer' && <TutorResult message={message} />}
    {entry === 'inline' && message && <button type="button" onClick={() => useTutorStore.getState().open(context)}>Open in drawer</button>}
  </div>
}

function AuthForm() {
  const status = useTutorStore((state) => state.authStatus)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (status === 'authenticated') return <p className="tutor-note">Generated answers are enabled.</p>
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const form = event.currentTarget
    const passphrase = new FormData(form).get('passphrase')
    setBusy(true)
    setError('')
    try { await unlockTutor(passphrase); form.reset() }
    catch (error) { setError(error.message) }
    finally { setBusy(false) }
  }
  return <details><summary>Have a tutor passphrase?</summary><form onSubmit={submit}><label>Passphrase<input name="passphrase" type="password" autoComplete="current-password" required maxLength={256} /></label><button disabled={busy}>{busy ? 'Signing in…' : 'Enable answers'}</button>{error && <p role="alert">{error}</p>}</form></details>
}

export function TutorAccessNote() {
  const authStatus = useTutorStore((state) => state.authStatus)
  return authStatus !== 'authenticated' ? <p className="tutor-note">Course search is open to everyone. Generated answers are limited to passphrase holders.</p> : null
}

export function SelectionTutor({ context, position, onClose }) {
  const [message, setMessage] = useState(null)
  const dialog = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    dialog.current.querySelector('input')?.focus()
    return () => previous?.isConnected && previous.focus()
  }, [])
  return <section ref={dialog} className="tutor-popover" role="dialog" aria-label="Explain selected code" style={{ left: position.left, top: position.top, maxHeight: `calc(100vh - ${position.top}px - var(--space-5))` }} onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose() } }}>
    <button type="button" onClick={onClose} aria-label="Close explanation">Close</button>
    <TutorAccessNote />
    <TutorForm entry="selection" context={context} initialQuestion="Explain what this selected code does." autoAsk onResult={setMessage} />
    <button type="button" onClick={() => { if (message) useTutorStore.getState().add(message); useTutorStore.getState().open(context); onClose() }}>Open in drawer</button>
  </section>
}

export default function TutorDrawer() {
  const store = useTutorStore()
  const match = useMatch('/lesson/:lessonSlug/:stepSlug')
  const step = match && stepsBySlug.get(`${match.params.lessonSlug}/${match.params.stepSlug}`)
  const panel = useRef(null)
  useEffect(() => {
    function keydown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (useTutorStore.getState().isOpen) useTutorStore.getState().close(); else useTutorStore.getState().open() }
      if (event.key === 'Escape') useTutorStore.getState().close()
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [])
  useEffect(() => {
    if (!store.isOpen) return
    const previous = document.activeElement
    panel.current?.querySelector('.tutor-form input')?.focus()
    return () => previous?.isConnected && previous.focus()
  }, [store.isOpen])
  if (!store.isOpen || !step) return null
  const context = store.context ?? stepContext(step)
  return <aside ref={panel} id="tutor-drawer" className="tutor-drawer" role="dialog" aria-label="Course tutor">
    <header><h2>Course tutor</h2><button type="button" onClick={store.close} aria-label="Close tutor">Close</button></header>
    <TutorAccessNote />
    <AuthForm />
    <div className="tutor-history" aria-label="Session conversation">{store.messages.map((message) => <TutorResult key={message.id} message={message} />)}</div>
    <TutorForm key={`${context.stepId}:${store.draft}`} entry="drawer" context={context} initialQuestion={store.draft} />
  </aside>
}
