const stepModules = import.meta.glob('../../content/lessons/**/steps/*.mdx', { eager: true })
const lessonMetaModules = import.meta.glob('../../content/lessons/*/lesson.yaml', {
  eager: true,
  query: '?raw',
  import: 'default',
})
const chapterMetaModules = import.meta.glob('../../content/lessons/*/chapters/*/chapter.yaml', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const LESSON_META_PATH = /content\/lessons\/([^/]+)\/lesson\.yaml$/
const CHAPTER_META_PATH = /content\/lessons\/([^/]+)\/chapters\/([^/]+)\/chapter\.yaml$/
const NESTED_STEP_PATH = /content\/lessons\/([^/]+)\/chapters\/([^/]+)\/steps\/([^/]+)\.mdx$/
const FLAT_STEP_PATH = /content\/lessons\/([^/]+)\/steps\/([^/]+)\.mdx$/
const PREFIXED_NAME = /^(\d+)-(.+)$/

// lesson.yaml and chapter.yaml are flat key/value only. Anything richer belongs in
// step frontmatter, which remark-mdx-frontmatter parses with a real YAML parser.
function parseMetaFile(raw, filePath) {
  const meta = {}

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/)
    if (!match) {
      throw new Error(`Cannot parse "${trimmed}" in ${filePath} — expected "key: value"`)
    }

    meta[match[1]] = parseScalar(match[2])
  }

  return meta
}

function parseScalar(rawValue) {
  const value = rawValue.trim()
  const isQuoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))

  if (isQuoted) return value.slice(1, -1)
  if (value !== '' && !Number.isNaN(Number(value))) return Number(value)
  return value
}

function splitPrefixedName(name, filePath) {
  const match = name.match(PREFIXED_NAME)
  if (!match) {
    throw new Error(`"${name}" in ${filePath} needs a numeric prefix, for example "01-${name}"`)
  }

  return { order: Number(match[1]), slug: match[2] }
}

const PRACTICE_KINDS = ['match', 'fill', 'implement']

export function validateStepFrontmatter(frontmatter, filePath) {
  if (!frontmatter || typeof frontmatter !== 'object') {
    throw new Error(`${filePath} has no frontmatter block`)
  }

  for (const field of ['title', 'goal']) {
    if (typeof frontmatter[field] !== 'string' || frontmatter[field].trim() === '') {
      throw new Error(`${filePath} is missing required frontmatter field "${field}"`)
    }
  }

  if (frontmatter.keywords !== undefined && !Array.isArray(frontmatter.keywords)) {
    throw new Error(`${filePath} frontmatter field "keywords" must be a list`)
  }

  if (frontmatter.scene !== undefined) {
    if (typeof frontmatter.scene !== 'object' || Array.isArray(frontmatter.scene)) {
      throw new Error(`${filePath} frontmatter field "scene" must be a map`)
    }

    if (frontmatter.scene.unlock !== undefined && !Array.isArray(frontmatter.scene.unlock)) {
      throw new Error(`${filePath} frontmatter field "scene.unlock" must be a list of param keys`)
    }
  }

  if (frontmatter.practice !== undefined) {
    if (typeof frontmatter.practice !== 'object' || Array.isArray(frontmatter.practice)) {
      throw new Error(`${filePath} frontmatter field "practice" must be a map`)
    }

    if (!PRACTICE_KINDS.includes(frontmatter.practice.kind)) {
      throw new Error(`${filePath} frontmatter field "practice.kind" must be one of ${PRACTICE_KINDS.join(', ')}`)
    }

    // A fill renders a code block with controls in it and nothing else. Without
    // a prompt the learner is looking at a dropdown with no question attached.
    const { kind, prompt } = frontmatter.practice
    if (kind === 'fill' && (typeof prompt !== 'string' || prompt.trim() === '')) {
      throw new Error(`${filePath} frontmatter field "practice.prompt" is required for a fill — say what the learner should achieve`)
    }
  }
}

function buildLesson(lessonDir) {
  const meta = lessonMetaByDir.get(lessonDir)
  if (!meta) {
    throw new Error(`content/lessons/${lessonDir} has no lesson.yaml`)
  }

  const { order, slug } = splitPrefixedName(lessonDir, `content/lessons/${lessonDir}`)

  return {
    slug: meta.slug ?? slug,
    number: meta.number === undefined ? String(order) : String(meta.number),
    title: meta.title,
    summary: meta.summary,
    shape: meta.shape ?? 'flat',
    estimatedMinutes: meta.estimatedMinutes,
    directoryOrder: order,
    chapters: [],
    steps: [],
  }
}

function buildChapter(lessonDir, chapterDir) {
  const meta = chapterMetaByDir.get(`${lessonDir}/${chapterDir}`)
  if (!meta) {
    throw new Error(`content/lessons/${lessonDir}/chapters/${chapterDir} has no chapter.yaml`)
  }

  const chapterPath = `content/lessons/${lessonDir}/chapters/${chapterDir}`
  const { order, slug } = splitPrefixedName(chapterDir, chapterPath)

  return {
    directory: chapterDir,
    slug: meta.slug ?? slug,
    title: meta.title,
    summary: meta.summary,
    estimatedMinutes: meta.estimatedMinutes,
    directoryOrder: order,
    steps: [],
  }
}

const lessonMetaByDir = new Map()
for (const [path, raw] of Object.entries(lessonMetaModules)) {
  const match = path.match(LESSON_META_PATH)
  if (match) lessonMetaByDir.set(match[1], parseMetaFile(raw, path))
}

const chapterMetaByDir = new Map()
for (const [path, raw] of Object.entries(chapterMetaModules)) {
  const match = path.match(CHAPTER_META_PATH)
  if (match) chapterMetaByDir.set(`${match[1]}/${match[2]}`, parseMetaFile(raw, path))
}

const lessonsByDirectory = new Map()

for (const [path, stepModule] of Object.entries(stepModules)) {
  const nested = path.match(NESTED_STEP_PATH)
  const flat = nested ? null : path.match(FLAT_STEP_PATH)
  if (!nested && !flat) {
    throw new Error(`${path} is not in a recognised location — expected .../steps/<nn>-<slug>.mdx`)
  }

  const { frontmatter } = stepModule
  validateStepFrontmatter(frontmatter, path)

  const lessonDirectory = nested ? nested[1] : flat[1]
  const fileName = nested ? nested[3] : flat[2]

  if (!lessonsByDirectory.has(lessonDirectory)) {
    lessonsByDirectory.set(lessonDirectory, buildLesson(lessonDirectory))
  }
  const lesson = lessonsByDirectory.get(lessonDirectory)

  const { order, slug } = splitPrefixedName(fileName, path)
  const step = {
    id: `${lesson.slug}/${slug}`,
    lessonSlug: lesson.slug,
    stepSlug: slug,
    order,
    sourcePath: path,
    frontmatter,
    Component: stepModule.default,
  }

  if (nested) {
    const chapterDirectory = nested[2]
    let chapter = lesson.chapters.find((entry) => entry.directory === chapterDirectory)
    if (!chapter) {
      chapter = buildChapter(lessonDirectory, chapterDirectory)
      lesson.chapters.push(chapter)
    }
    step.chapterSlug = chapter.slug
    chapter.steps.push(step)
  } else {
    lesson.steps.push(step)
  }
}

export const lessons = [...lessonsByDirectory.values()].sort(
  (first, second) => first.directoryOrder - second.directoryOrder,
)

for (const lesson of lessons) {
  if (lesson.chapters.length > 0) {
    lesson.chapters.sort((first, second) => first.directoryOrder - second.directoryOrder)
    for (const chapter of lesson.chapters) {
      chapter.steps.sort((first, second) => first.order - second.order)
    }
    lesson.steps = lesson.chapters.flatMap((chapter) => chapter.steps)
  } else {
    lesson.steps.sort((first, second) => first.order - second.order)
  }
}

export const stepsBySlug = new Map()
export const flatOrder = []

for (const lesson of lessons) {
  lesson.steps.forEach((step, index) => {
    step.lessonTitle = lesson.title
    step.lessonNumber = lesson.number
    step.positionInLesson = index + 1
    step.totalInLesson = lesson.steps.length

    if (step.chapterSlug) {
      const chapter = lesson.chapters.find((entry) => entry.slug === step.chapterSlug)
      step.chapterTitle = chapter.title
    }

    if (stepsBySlug.has(step.id)) {
      throw new Error(`Two steps share the id "${step.id}" — slugs must be unique within a lesson`)
    }

    stepsBySlug.set(step.id, step)
    flatOrder.push(step.id)
  })
}

export function getStep(stepId) {
  return stepsBySlug.get(stepId)
}

export function getAdjacentSteps(stepId) {
  const index = flatOrder.indexOf(stepId)
  if (index === -1) return { previous: null, next: null }

  return {
    previous: index > 0 ? stepsBySlug.get(flatOrder[index - 1]) : null,
    next: index < flatOrder.length - 1 ? stepsBySlug.get(flatOrder[index + 1]) : null,
  }
}
