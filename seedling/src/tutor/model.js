export const MODEL_ID = 'Xenova/all-MiniLM-L6-v2'
export const VECTOR_DIMENSIONS = 384

export function cosineSimilarity(left, right) {
  let dot = 0
  let leftLength = 0
  let rightLength = 0
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index]
    leftLength += left[index] ** 2
    rightLength += right[index] ** 2
  }
  return leftLength && rightLength ? dot / Math.sqrt(leftLength * rightLength) : 0
}

export function retrievalBoost(chunk, query, stepId) {
  const keyword = chunk.keywords.some((word) => query.toLowerCase().includes(word.toLowerCase()))
  const current = `${chunk.lessonSlug}/${chunk.stepSlug}` === stepId
  return (keyword ? 0.05 : 0) + (current ? 0.03 : 0)
}

export function rankChunks(chunks, vector, query, stepId) {
  return chunks.map((chunk) => ({ ...chunk, score: cosineSimilarity(vector, chunk.vector.map((value) => value / 127)) + retrievalBoost(chunk, query, stepId) }))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id)).slice(0, 6)
}
