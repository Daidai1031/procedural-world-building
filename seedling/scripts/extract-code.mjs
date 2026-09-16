import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Parser } from 'acorn'
import jsx from 'acorn-jsx'
import { parse } from 'yaml'

const JavaScriptParser = Parser.extend(jsx())

function dedent(source) {
  const lines = source.split(/\r?\n/)
  const indentation = Math.min(...lines.filter((line) => line.trim()).map((line) => line.match(/^\s*/)[0].length))
  return lines.map((line) => line.slice(indentation)).join('\n')
}

function findFunctions(node, name, parent = null, matches = []) {
  if (node.type === 'FunctionDeclaration' && node.id?.name === name) matches.push({ node, parent })
  if (node.type === 'VariableDeclarator' && node.id.name === name &&
    ['FunctionExpression', 'ArrowFunctionExpression'].includes(node.init?.type)) matches.push({ node, parent })
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const child of value) if (child?.type) findFunctions(child, name, node, matches)
    } else if (value?.type) findFunctions(value, name, node, matches)
  }
  return matches
}

function regionMarker(line) {
  const comment = line.match(/^\s*\/\/\s*(.*?)\s*$/)?.[1]
    ?? line.match(/^\s*\{\s*\/\*\s*(.*?)\s*\*\/\s*\}\s*$/)?.[1]
  return comment?.match(/^#(region|endregion)(?:\s+(.+?))?\s*$/)
}

export function extractSnippet(source, reference, stepFile) {
  const { file, fn, region } = reference
  const name = fn ?? region
  function fail(message) {
    throw new Error(`${stepFile}: ${message} in ${file}`)
  }
  if (!file || Boolean(fn) === Boolean(region)) fail('code requires a file and exactly one of fn or region')
  let start
  let end
  if (fn) {
    const comments = []
    const ast = JavaScriptParser.parse(source, { ecmaVersion: 'latest', sourceType: 'module', onComment: comments })
    const matches = findFunctions(ast, fn)
    if (matches.length !== 1) fail(`${matches.length ? 'ambiguous' : 'missing'} function "${fn}"`)
    const { node, parent } = matches[0]
    start = node.start
    end = node.end
    let attachment = ['ExportNamedDeclaration', 'ExportDefaultDeclaration'].includes(parent?.type) ? parent.start : start
    if (node.type === 'VariableDeclarator') {
      if (parent.declarations.length !== 1) fail(`function "${fn}" must have its own variable declaration`)
      start = parent.start
      end = parent.end
      attachment = start
      const prefix = source.slice(0, start).match(/export\s+$/)
      if (prefix) attachment -= prefix[0].length
    }
    let commentStart = attachment
    for (const comment of comments.toReversed()) {
      if (comment.end > commentStart) continue
      if (!/^[\t ]*(?:\r?\n[\t ]*)?$/.test(source.slice(comment.end, commentStart))) break
      commentStart = comment.start
      if (comment.type === 'Block') break
    }
    if (commentStart < attachment) start = commentStart
  } else {
    const lines = source.split(/\r?\n/)
    const stack = []
    const matches = []
    let offset = 0
    for (const line of lines) {
      const marker = regionMarker(line)
      if (marker?.[1] === 'region' && !marker[2]) fail('region requires a name')
      const opening = marker?.[1] === 'region'
      const closing = marker?.[1] === 'endregion'
      if (opening) stack.push({ name: marker[2], start: offset + line.length + (source[offset + line.length] === '\r' ? 2 : 1) })
      if (closing) {
        const name = marker[2]
        const index = name ? stack.findLastIndex((entry) => entry.name === name) : stack.length - 1
        if (index < 0) fail(`unmatched #endregion${name ? ` ${name}` : ''}`)
        const [opened] = stack.splice(index, 1)
        if (opened.name === region) matches.push({ start: opened.start, end: offset })
      }
      offset += line.length + (source[offset + line.length] === '\r' ? 2 : 1)
    }
    if (stack.length) fail(`unclosed region "${stack.at(-1).name}"`)
    if (matches.length !== 1) fail(`${matches.length ? 'ambiguous' : 'missing'} region "${region}"`)
    start = matches[0].start
    end = matches[0].end
  }
  const lines = source.slice(start, end).replace(/\r?\n$/, '').split(/\r?\n/)
  const code = dedent(lines.filter((line) => !regionMarker(line)).join('\n'))
  if (!code.trim()) fail(`empty snippet "${name}"`)
  for (const line of reference.highlight ?? []) {
    if (!Number.isInteger(line) || line < 1 || line > code.split('\n').length) fail(`highlight ${line} is outside snippet "${name}"`)
  }
  return { code, language: file.endsWith('.jsx') ? 'jsx' : 'javascript', file, name, startLine: source.slice(0, start).split('\n').length }
}

async function stepFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? stepFiles(target) : target.endsWith('.mdx') ? [target] : []
  }))
  return files.flat().sort()
}

export async function extractAll(root) {
  const snippets = {}
  for (const filename of await stepFiles(path.join(root, 'content/lessons'))) {
    const stepFile = path.relative(root, filename).replaceAll('\\', '/')
    try {
      const raw = await readFile(filename, 'utf8')
      const frontmatter = parse(raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '')
      if (!frontmatter?.code && !frontmatter?.practice) continue
      const lessonDirectory = stepFile.split('/')[2]
      const meta = await readFile(path.join(root, 'content/lessons', lessonDirectory, 'lesson.yaml'), 'utf8')
      const slugLine = meta.match(/^slug:\s*(.+)$/m)?.[1].trim()
      const lessonSlug = slugLine ? parse(slugLine) : lessonDirectory.replace(/^\d+-/, '')
      const id = `${lessonSlug}/${path.basename(filename, '.mdx').replace(/^\d+-/, '')}`
      if (snippets[id]) throw new Error(`duplicate step id "${id}"`)
      const references = [[id, frontmatter.code], [`${id}:practice`, frontmatter.practice?.from ?? frontmatter.practice?.reference]]
      for (const [key, reference] of references) {
        if (!reference) continue
        const source = await readFile(path.resolve(root, reference.file), 'utf8')
        snippets[key] = extractSnippet(source, reference, stepFile)
      }
      if (frontmatter.practice?.kind === 'match' && !stepFile.includes('/chapters/01-')) throw new Error('match practice is only supported in chapter 1')
    } catch (error) {
      if (error.message.startsWith(`${stepFile}:`)) throw error
      throw new Error(`${stepFile}: ${error.message}`)
    }
  }
  const output = path.join(root, 'src/generated')
  await mkdir(output, { recursive: true })
  await writeFile(path.join(output, 'snippets.json'), `${JSON.stringify(snippets, null, 2)}\n`)
  return snippets
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const snippets = await extractAll(path.resolve(process.argv[2] ?? '.'))
    console.log(`Extracted ${Object.keys(snippets).length} code snippets`)
  } catch (error) {
    console.error(`Code extraction failed: ${error.message}`)
    process.exitCode = 1
  }
}
