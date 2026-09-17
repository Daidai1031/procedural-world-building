export function safeContext(context = {}) {
  const result = {}
  for (const key of ['stepId', 'stepTitle', 'selection', 'selectionSource', 'error']) {
    if (typeof context[key] === 'string') result[key] = context[key].slice(0, 4000)
  }
  if (context.params && typeof context.params === 'object') result.params = Object.fromEntries(Object.entries(context.params).filter(([, value]) => typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean'))
  if (context.task) result.task = { kind: context.task.kind, prompt: context.task.prompt ?? context.task.brief }
  if (typeof context.attempt === 'string') result.attempt = context.attempt.slice(0, 8000)
  return result
}

export function containsCjk(question) {
  return /[\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/u.test(question)
}
