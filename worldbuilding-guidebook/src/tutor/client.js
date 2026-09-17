import { containsCjk, safeContext } from './context.js'
import { useTutorStore } from './tutorStore.js'

async function post(url, body) {
  const response = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    if (response.status === 401) useTutorStore.setState({ authStatus: 'guest' })
    throw new Error(error.error ?? 'The tutor could not respond. Please try again.')
  }
  return response
}

export async function unlockTutor(passphrase) {
  await post('/api/auth', { passphrase })
  useTutorStore.setState({ authStatus: 'authenticated' })
}

export async function askTutor(question, context, onUpdate, history = []) {
  const { retrieve } = await import('./retrieval.js')
  let englishQuery = question
  let answerLanguage = 'en'
  let notice = ''
  if (containsCjk(question)) {
    try {
      const translation = await (await post('/api/translate-query', { question })).json()
      englishQuery = translation.englishQuery
      answerLanguage = translation.detectedLanguage
    } catch (error) { notice = error.message + ' Try an English search for closer results.' }
  }
  onUpdate({ status: 'searching', progress: 0, notice })
  const result = await retrieve(englishQuery, context.stepId, (progress) => onUpdate({ progress }))
  const chunks = result.chunks.map(({ vector: _vector, score: _score, ...chunk }) => chunk)
  onUpdate({ chunks, fallback: result.fallback, status: 'checking' })
  let { authStatus } = useTutorStore.getState()
  if (authStatus === 'unknown') {
    try {
      const response = await fetch('/api/auth', { credentials: 'same-origin' })
      authStatus = response.ok && (await response.json()).authenticated ? 'authenticated' : 'guest'
    } catch { authStatus = 'guest' }
    useTutorStore.setState({ authStatus })
  }
  if (authStatus !== 'authenticated' || notice) { onUpdate({ status: 'done' }); return }
  onUpdate({ status: 'answering' })
  const response = await post('/api/chat', { question, answerLanguage, context: safeContext(context), chunks, history })
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let answer = ''
  let completed = false
  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.trim()) continue
      const event = JSON.parse(line)
      if (event.error) throw new Error(event.error)
      if (event.text) { answer += event.text; onUpdate({ answer }) }
      if (event.done) completed = true
    }
    if (done) break
  }
  if (!completed) throw new Error('The answer was interrupted. Please try again.')
  onUpdate({ status: 'done' })
}
