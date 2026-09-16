import MiniSearch from 'minisearch'
import { MODEL_ID, VECTOR_DIMENSIONS, rankChunks, retrievalBoost } from './model.js'

export const RETRIEVAL_MODEL_ID = MODEL_ID
let indexPromise
let worker
let keywordIndex
let modelFailed = false
let requestId = 0
const pending = new Map()

async function loadIndex() {
  indexPromise ??= fetch('/rag-index.json').then(async (response) => {
    if (!response.ok) throw new Error('Course search could not load. Please try again.')
    const index = await response.json()
    if (index.modelId !== RETRIEVAL_MODEL_ID || index.dimensions !== VECTOR_DIMENSIONS) throw new Error('The search index needs rebuilding with the current model.')
    return index.chunks
  }).catch((error) => { indexPromise = null; throw error })
  return indexPromise
}

function embedQuery(query, onProgress) {
  if (!worker) {
    worker = new Worker(new URL('./embeddingWorker.js', import.meta.url), { type: 'module' })
    worker.onmessage = function ({ data }) {
      const request = pending.get(data.id)
      if (!request) return
      if (data.progress !== undefined) { request.onProgress(data.progress); return }
      clearTimeout(request.timeout)
      pending.delete(data.id)
      if (data.error) request.reject(new Error(data.error))
      else { request.onProgress(100); request.resolve(data.vector) }
    }
    worker.onerror = function () {
      for (const request of pending.values()) { clearTimeout(request.timeout); request.reject(new Error('Search model unavailable')) }
      pending.clear()
      worker.terminate()
      worker = null
    }
  }
  return new Promise((resolve, reject) => {
    const id = ++requestId
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error('Search model download timed out')) }, 120000)
    pending.set(id, { resolve, reject, onProgress, timeout })
    worker.postMessage({ id, query })
  })
}

export async function retrieve(query, stepId, onProgress = function () {}) {
  const chunks = await loadIndex()
  if (!modelFailed) {
    try {
      const vector = await embedQuery(query, onProgress)
      return { chunks: rankChunks(chunks, vector, query, stepId), fallback: false }
    } catch {
      modelFailed = true
      worker?.terminate()
      worker = null
    }
  }
  if (!keywordIndex) {
    keywordIndex = new MiniSearch({ fields: ['title', 'text', 'keywords'], storeFields: ['id'] })
    keywordIndex.addAll(chunks.map((chunk) => ({ ...chunk, keywords: chunk.keywords.join(' ') })))
  }
  const matches = keywordIndex.search(query, { prefix: true, fuzzy: 0.2, boost: { title: 2, keywords: 2 } })
  const maximum = matches[0]?.score || 1
  const byId = new Map(chunks.map((chunk) => [chunk.id, chunk]))
  const ranked = matches.map((match) => ({ ...byId.get(match.id), score: match.score / maximum + retrievalBoost(byId.get(match.id), query, stepId) }))
    .sort((left, right) => right.score - left.score).slice(0, 6)
  return { chunks: ranked, fallback: true }
}
