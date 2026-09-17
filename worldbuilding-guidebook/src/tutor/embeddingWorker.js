import { env, pipeline } from '@xenova/transformers'
import { MODEL_ID } from './model.js'

env.allowLocalModels = false
env.useBrowserCache = true
let extractor
const downloads = new Map()

self.onmessage = async function ({ data }) {
  try {
    extractor ??= pipeline('feature-extraction', MODEL_ID, {
      progress_callback: function (progress) {
        if (progress.status !== 'progress' || !progress.total) return
        downloads.set(progress.file, { loaded: progress.loaded, total: progress.total })
        const files = [...downloads.values()]
        const loaded = files.reduce((sum, file) => sum + file.loaded, 0)
        // Keep the full advertised model size in the denominator while manifests load.
        const total = Math.max(23 * 1024 * 1024, files.reduce((sum, file) => sum + file.total, 0))
        self.postMessage({ id: data.id, progress: Math.min(99, loaded / total * 100) })
      },
    })
    const embed = await extractor
    const tensor = await embed(data.query, { pooling: 'mean', normalize: true })
    self.postMessage({ id: data.id, vector: Array.from(tensor.data) })
  } catch (error) {
    extractor = null
    self.postMessage({ id: data.id, error: error.message })
  }
}
