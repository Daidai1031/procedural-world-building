export const NOTE_MAX_LENGTH = 2000
export const BOLD_MARKER = '**'
export const ITALIC_MARKER = '_'

// A note is plain text with two kinds of marker: **bold** and _italic_. A single
// *italic* is read as well, for anyone used to Markdown. An opening marker has
// to hug its text, so "2 ** 3" is not bold, and an underscore inside a word
// (snake_case) is left alone. A closing marker may follow a space, because a
// selection dragged across a word often ends on one.
const INLINE_PATTERN = new RegExp(
  [
    String.raw`\*\*(?=\S)(.+?)\*\*`,
    String.raw`(?<![\w*])\*(?=[^\s*])(.+?)\*(?![\w*])`,
    String.raw`(?<!\w)_(?=\S)(.+?)_(?!\w)`,
  ].join('|'),
  'g',
)

function parseInline(text) {
  const nodes = []
  let position = 0

  for (const match of text.matchAll(INLINE_PATTERN)) {
    if (match.index > position) nodes.push({ type: 'text', text: text.slice(position, match.index) })

    if (match[1] !== undefined) nodes.push({ type: 'bold', children: parseInline(match[1]) })
    else nodes.push({ type: 'italic', children: parseInline(match[2] ?? match[3]) })

    position = match.index + match[0].length
  }

  if (position < text.length) nodes.push({ type: 'text', text: text.slice(position) })
  return nodes
}

// A blank line starts a new paragraph; a single line break stays a line break.
// Returns paragraphs, each a list of lines, each a list of inline nodes.
export function parseNote(text) {
  return text
    .trim()
    .split(/\n{2,}/)
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => paragraph.split('\n').map(parseInline))
}

// Puts a marker around the selection, or takes it off if the selection already
// has it. With nothing selected the markers go in as a pair with the caret
// between them.
export function toggleMarker(value, rangeStart, rangeEnd, marker) {
  // Spaces at the edges of the selection stay outside the markers, since a
  // marker only counts when it hugs its text.
  const dragged = value.slice(rangeStart, rangeEnd)
  const hasText = dragged.trim() !== ''
  const selectionStart = hasText ? rangeStart + dragged.length - dragged.trimStart().length : rangeStart
  const selectionEnd = hasText ? rangeEnd - (dragged.length - dragged.trimEnd().length) : rangeEnd

  const before = value.slice(0, selectionStart)
  const selected = value.slice(selectionStart, selectionEnd)
  const after = value.slice(selectionEnd)
  const length = marker.length

  if (before.endsWith(marker) && after.startsWith(marker)) {
    return {
      value: before.slice(0, -length) + selected + after.slice(length),
      selectionStart: selectionStart - length,
      selectionEnd: selectionEnd - length,
    }
  }

  return {
    value: before + marker + selected + marker + after,
    selectionStart: selectionStart + length,
    selectionEnd: selectionEnd + length,
  }
}
