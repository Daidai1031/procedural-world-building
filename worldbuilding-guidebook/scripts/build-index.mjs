import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { Parser } from 'acorn'
import jsx from 'acorn-jsx'
import { parse } from 'yaml'
import { extractSnippet } from './extract-code.mjs'
import { MODEL_ID, VECTOR_DIMENSIONS } from '../src/tutor/model.js'

export const INDEX_MODEL_ID = MODEL_ID
const parser = Parser.extend(jsx())

async function filesUnder(directory, extension) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`${directory}/${entry.name}: symlinks are not index sources`)
    if (['generated', 'node_modules', 'tests', 'artifacts'].includes(entry.name)) continue
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await filesUnder(filename, extension))
    else if (extension.test(entry.name)) files.push(filename)
  }
  return files.sort()
}

export function practiceChunk(step, task) {
  const prompt = task.prompt ?? task.brief
  if (!['match', 'fill', 'implement'].includes(task.kind) || typeof prompt !== 'string' || !prompt.trim()) throw new Error(`${step.path}: practice requires kind and prompt or brief`)
  return { ...step, id: step.id.replace('step:', 'practice:'), type: 'practice', title: `${step.title} — practice`, kind: task.kind, text: `${task.kind} practice: ${prompt}` }
}

export function splitDocument(raw) {
  const sections = []
  let title = 'Introduction'
  let lines = []
  let fenced = false
  function flush() {
    // A word is approximately 1.33 English tokens: 338 words / 45 overlap.
    const words = lines.join('\n').trim().split(/\s+/).filter(Boolean)
    for (let start = 0; start < words.length; start += 293) {
      sections.push({ title, text: words.slice(start, start + 338).join(' ') })
      if (start + 338 >= words.length) break
    }
    lines = []
  }
  for (const line of raw.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
    const heading = !fenced && line.match(/^#{1,6}\s+(.+)$/)
    if (heading) { flush(); title = heading[1] }
    else lines.push(line)
  }
  flush()
  return sections
}

export async function collectChunks(root) {
  const chunks = []
  const codeSteps = new Map()
  for (const filename of await filesUnder(path.join(root, 'content/lessons'), /\.mdx$/)) {
    const relative = path.relative(root, filename).replaceAll('\\', '/')
    try {
      const raw = await readFile(filename, 'utf8')
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\s*\r?\n/)
      if (!match) throw new Error('missing or malformed frontmatter')
      const meta = parse(match[1])
      if (!meta?.title?.trim() || !meta?.goal?.trim()) throw new Error('frontmatter requires title and goal')
      if (meta.keywords && (!Array.isArray(meta.keywords) || meta.keywords.some((word) => typeof word !== 'string'))) throw new Error('keywords must be strings')
      const lesson = parse(await readFile(path.join(root, ...relative.split('/').slice(0, 3), 'lesson.yaml'), 'utf8'))
      if (typeof lesson.slug !== 'string') throw new Error('lesson.yaml requires a slug')
      const stepSlug = path.basename(filename, '.mdx').replace(/^\d+-/, '')
      const step = { id: `step:${lesson.slug}/${stepSlug}`, type: 'step', title: meta.title,
        text: raw.slice(match[0].length).replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/<\/?[A-Za-z][^>]*>/g, '').trim(),
        keywords: meta.keywords ?? [], lessonSlug: lesson.slug, stepSlug, url: `/lesson/${lesson.slug}/${stepSlug}`, path: relative }
      if (!step.text) throw new Error('empty step prose')
      chunks.push(step)
      if (meta.code) codeSteps.set(`${meta.code.file}:${meta.code.fn ?? ''}`, step)
      if (meta.practice) chunks.push(practiceChunk(step, meta.practice))
    } catch (error) { throw new Error(`${relative}: ${error.message}`) }
  }
  for (const filename of await filesUnder(path.join(root, 'content/sources'), /\.md$/)) {
    if (path.basename(filename) === 'README.md') continue
    const relative = path.relative(root, filename).replaceAll('\\', '/')
    try {
      const raw = await readFile(filename, 'utf8')
      const publicPath = relative.replace('content/', '')
      await mkdir(path.dirname(path.join(root, 'public', publicPath)), { recursive: true })
      await writeFile(path.join(root, 'public', publicPath), raw)
      for (const [index, section] of splitDocument(raw).entries()) chunks.push({ id: `source:${relative}:${index}`, type: 'source', ...section, keywords: [], lessonSlug: null, stepSlug: null, url: `/${publicPath}`, path: relative })
    } catch (error) { throw new Error(`${relative}: ${error.message}`) }
  }
  for (const filename of await filesUnder(path.join(root, 'src'), /\.(js|jsx)$/)) {
    const relative = path.relative(root, filename).replaceAll('\\', '/')
    try {
      const source = await readFile(filename, 'utf8')
      const ast = parser.parse(source, { ecmaVersion: 'latest', sourceType: 'module' })
      const names = new Set()
      for (const node of ast.body) {
        if (!['ExportNamedDeclaration', 'ExportDefaultDeclaration'].includes(node.type)) continue
        if (node.declaration?.type === 'FunctionDeclaration') names.add(node.declaration.id.name)
        for (const declaration of node.declaration?.declarations ?? []) if (['ArrowFunctionExpression', 'FunctionExpression'].includes(declaration.init?.type)) names.add(declaration.id.name)
        for (const specifier of node.specifiers ?? []) {
          if (ast.body.some((entry) => entry.type === 'FunctionDeclaration' && entry.id.name === specifier.local.name)) names.add(specifier.local.name)
        }
      }
      for (const name of names) {
        const snippet = extractSnippet(source, { file: relative, fn: name }, relative)
        const step = codeSteps.get(`${relative}:${name}`) ?? codeSteps.get(`${relative}:`)
        const publicPath = `sources/code/${relative}`
        await mkdir(path.dirname(path.join(root, 'public', publicPath)), { recursive: true })
        await writeFile(path.join(root, 'public', publicPath), source)
        chunks.push({ id: `code:${relative}:${name}`, type: 'code', title: name, text: snippet.code, keywords: [name], lessonSlug: step?.lessonSlug ?? null, stepSlug: step?.stepSlug ?? null, url: step?.url ?? `/${publicPath}`, path: relative, startLine: snippet.startLine })
      }
    } catch (error) { throw new Error(`${relative}: ${error.message}`) }
  }
  if (new Set(chunks.map((chunk) => chunk.id)).size !== chunks.length) throw new Error('Duplicate chunk ids')
  return chunks
}

export async function buildIndex(root) {
  const chunks = await collectChunks(root)
  const { pipeline, env } = await import('@xenova/transformers')
  env.cacheDir = path.join(root, '.cache/transformers')
  const embed = await pipeline('feature-extraction', INDEX_MODEL_ID)
  for (const [index, chunk] of chunks.entries()) {
    const tensor = await embed(`${chunk.title}\n${chunk.text}`, { pooling: 'mean', normalize: true })
    chunk.vector = Array.from(tensor.data, (value) => Math.round(value * 127))
    if (chunk.vector.length !== VECTOR_DIMENSIONS) throw new Error(`${chunk.path}: wrong embedding dimensions`)
    if ((index + 1) % 25 === 0) console.log(`Embedded ${index + 1}/${chunks.length}`)
  }
  const output = JSON.stringify({ modelId: INDEX_MODEL_ID, dimensions: VECTOR_DIMENSIONS, chunks })
  const gzipBytes = gzipSync(output).length
  if (chunks.length > 300 || gzipBytes > 150 * 1024) throw new Error(`Corpus unexpectedly large: ${chunks.length} chunks, ${gzipBytes} gzip bytes; inspect sources`)
  await mkdir(path.join(root, 'public'), { recursive: true })
  await writeFile(path.join(root, 'public/rag-index.json'), output)
  console.log(JSON.stringify({ chunks: chunks.length, types: Object.fromEntries(['step', 'practice', 'source', 'code'].map((type) => [type, chunks.filter((chunk) => chunk.type === type).length])), bytes: Buffer.byteLength(output), gzipBytes }))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildIndex(path.resolve(process.argv[2] ?? '.')).catch((error) => { console.error(`Index build failed: ${error.message}`); process.exitCode = 1 })
}
