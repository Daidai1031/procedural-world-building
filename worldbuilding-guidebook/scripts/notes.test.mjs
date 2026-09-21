import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BOLD_MARKER, ITALIC_MARKER, parseNote, toggleMarker } from '../src/notes/noteFormat.js'

const text = (value) => ({ type: 'text', text: value })
const bold = (...children) => ({ type: 'bold', children })
const italic = (...children) => ({ type: 'italic', children })

test('bold and italic markers become formatted nodes', () => {
  assert.deepEqual(parseNote('a **b** c _d_ e'), [[[text('a '), bold(text('b')), text(' c '), italic(text('d')), text(' e')]]])
})

test('a single asterisk is read as italic, and formats can nest', () => {
  assert.deepEqual(parseNote('*slanted*'), [[[italic(text('slanted'))]]])
  assert.deepEqual(parseNote('**bold and _slanted_**'), [[[bold(text('bold and '), italic(text('slanted')))]]])
})

test('markers that do not hug their text, and underscores inside words, stay literal', () => {
  assert.deepEqual(parseNote('use my_variable_name here'), [[[text('use my_variable_name here')]]])
  assert.deepEqual(parseNote('2 * 3 * 4'), [[[text('2 * 3 * 4')]]])
  assert.deepEqual(parseNote('half **open'), [[[text('half **open')]]])
  assert.deepEqual(parseNote('** spaced **'), [[[text('** spaced **')]]])
})

test('a closing marker after a space still closes, so a selection that ended on a space is not lost', () => {
  assert.deepEqual(parseNote('**Choose with care. ** Then go'), [[[bold(text('Choose with care. ')), text(' Then go')]]])
})

test('a blank line starts a paragraph and a single line break stays a line', () => {
  assert.deepEqual(parseNote('one\ntwo\n\n\nthree'), [[[text('one')], [text('two')]], [[text('three')]]])
  assert.deepEqual(parseNote('  \n\n  '), [])
})

test('note text is never turned into markup', () => {
  assert.deepEqual(parseNote('<b>x</b> <script>alert(1)</script>'), [[[text('<b>x</b> <script>alert(1)</script>')]]])
})

test('toggleMarker wraps the selection and unwraps it again', () => {
  const wrapped = toggleMarker('say hello now', 4, 9, BOLD_MARKER)
  assert.equal(wrapped.value, 'say **hello** now')
  assert.equal(wrapped.value.slice(wrapped.selectionStart, wrapped.selectionEnd), 'hello')

  const unwrapped = toggleMarker(wrapped.value, wrapped.selectionStart, wrapped.selectionEnd, BOLD_MARKER)
  assert.equal(unwrapped.value, 'say hello now')
  assert.equal(unwrapped.value.slice(unwrapped.selectionStart, unwrapped.selectionEnd), 'hello')
})

test('toggleMarker keeps spaces at the edges of the selection outside the markers', () => {
  const result = toggleMarker('say  hello now', 3, 10, BOLD_MARKER)
  assert.equal(result.value, 'say  **hello** now')
  assert.equal(result.value.slice(result.selectionStart, result.selectionEnd), 'hello')
  assert.deepEqual(parseNote(result.value), [[[text('say  '), bold(text('hello')), text(' now')]]])

  const unwrapped = toggleMarker(result.value, result.selectionStart, result.selectionEnd, BOLD_MARKER)
  assert.equal(unwrapped.value, 'say  hello now')
})

test('toggleMarker with only spaces selected treats it as nothing selected', () => {
  const result = toggleMarker('a   b', 1, 4, ITALIC_MARKER)
  assert.equal(result.value, 'a_   _b')
})

test('toggleMarker with nothing selected leaves the caret between a pair', () => {
  const result = toggleMarker('ab', 1, 1, ITALIC_MARKER)
  assert.equal(result.value, 'a__b')
  assert.equal(result.selectionStart, 2)
  assert.equal(result.selectionEnd, 2)
})

test('italic does not mistake a bold marker for its own', () => {
  const result = toggleMarker('**bold**', 2, 6, ITALIC_MARKER)
  assert.equal(result.value, '**_bold_**')
  assert.deepEqual(parseNote(result.value), [[[bold(italic(text('bold')))]]])
})
