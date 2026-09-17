import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pipeline, env } from '@xenova/transformers'
import { MODEL_ID, rankChunks } from '../src/tutor/model.js'

const questions = [
  { question: 'What makes a mesh different from its geometry and material?', stepId: 'scene-anatomy/entities-geometry-and-transform' },
  { question: 'Why does the metal sphere need an environment to reflect?', stepId: 'scene-anatomy/matte-and-metal' },
  { question: 'Why do the same coordinates and seed always give the same noise?', stepId: 'procedural-maps/position-function-value' },
  { question: 'How does perlin2d calculate smooth gradient noise?', stepId: 'procedural-maps/perlin-versus-worley' },
  { question: 'How can I make the surface rougher without changing the size of the broad hills?', stepId: 'procedural-maps/persistence' },
  { question: '相机的裁剪距离和 OrbitControls 的距离限制有什么区别？', englishQuery: 'What is the difference between camera clipping distances and OrbitControls distance limits?', stepId: 'scene-anatomy/moving-the-camera' },
  { question: '这个练习要我让球体正好放在地板上，应该怎样思考？', englishQuery: 'How should I reason about the practice task to place the sphere resting on the floor?', stepId: 'scene-anatomy/entities-geometry-and-transform' },
  { question: '为什么水会沿着地面加水的表面高度往下流？', englishQuery: 'Why does water flow downhill following terrain plus water surface height?', stepId: 'procedural-maps/water-follows-surface-height' },
  { question: '我在实现 octave 循环，如何理解频率和振幅每层的变化？', englishQuery: 'I am implementing the octave loop. How do frequency and amplitude change in each layer?', stepId: 'procedural-maps/values-become-height' },
  { question: 'React 的 props 和 state 有什么不同？', englishQuery: 'What is the difference between React props and state?', stepId: null },
]

env.cacheDir = path.resolve('.cache/transformers')
const embed = await pipeline('feature-extraction', MODEL_ID)
const index = JSON.parse(await readFile('public/rag-index.json', 'utf8'))
const results = []
for (const question of questions) {
  const query = question.englishQuery ?? question.question
  const vector = await embed(query, { pooling: 'mean', normalize: true })
  const ranked = rankChunks(index.chunks, vector.data, query, question.stepId)
  results.push({ ...question, translation: question.englishQuery ? 'Hand-translated evaluation query; not a live API translation' : 'None', top: ranked.map(({ id, title, url, score }) => ({ id, title, url, score })) })
}
await writeFile('artifacts/phase5/retrieval-questions.json', JSON.stringify(results, null, 2) + '\n')
console.log(results.map((result) => `${result.question}\n  ${result.top[0].title} (${result.top[0].score.toFixed(3)})`).join('\n'))
