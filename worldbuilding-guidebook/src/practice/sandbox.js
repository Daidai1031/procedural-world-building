export function runSandbox({ source, name, inputs, bindings = {} }, { signal } = {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./practiceWorker.js', import.meta.url), { type: 'module' })
    const timer = setTimeout(() => finish(new Error('Evaluation exceeded 2 seconds.')), 2000)
    function finish(error, value) {
      clearTimeout(timer)
      worker.terminate()
      signal?.removeEventListener('abort', abort)
      if (error) reject(error)
      else resolve(value)
    }
    function abort() { finish(new DOMException('Evaluation cancelled', 'AbortError')) }
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) return abort()
    worker.onmessage = ({ data }) => finish(data.error ? new Error(data.error) : null, data.values)
    worker.onerror = (event) => finish(new Error(event.message))
    try { worker.postMessage({ source, name, inputs, bindings }) }
    catch (error) { finish(error) }
  })
}
