import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useProgressStore } from '../store/progressStore.js'
import {
  BOLD_MARKER,
  ITALIC_MARKER,
  NOTE_MAX_LENGTH,
  parseNote,
  toggleMarker,
} from '../notes/noteFormat.js'

export const STEP_NOTE_ID = 'step-note'

function renderNodes(nodes) {
  return nodes.map((node, index) => {
    if (node.type === 'bold') return <strong key={index}>{renderNodes(node.children)}</strong>
    if (node.type === 'italic') return <em key={index}>{renderNodes(node.children)}</em>
    return node.text
  })
}

function NoteQuote({ text }) {
  return (
    <blockquote className="step-note__quote">
      {parseNote(text).map((lines, paragraphIndex) => (
        <p key={paragraphIndex}>
          {lines.map((nodes, lineIndex) => (
            <span key={lineIndex}>
              {lineIndex > 0 && <br />}
              {renderNodes(nodes)}
            </span>
          ))}
        </p>
      ))}
    </blockquote>
  )
}

function DotsIcon() {
  return (
    <svg className="dots-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="3.5" cy="8" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="12.5" cy="8" r="1.25" />
    </svg>
  )
}

function NoteEditor({ stepId, savedNote, onClose }) {
  const saveNote = useProgressStore((state) => state.saveNote)
  const [draft, setDraft] = useState(savedNote)
  const textareaRef = useRef(null)
  const pendingSelection = useRef(null)

  useEffect(() => {
    const textarea = textareaRef.current
    textarea.focus()
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
  }, [])

  // A formatting change replaces the whole value, which drops the selection, so
  // the new one is put back once React has written the text.
  useLayoutEffect(() => {
    if (!pendingSelection.current) return

    const [start, end] = pendingSelection.current
    pendingSelection.current = null
    textareaRef.current.focus()
    textareaRef.current.setSelectionRange(start, end)
  }, [draft])

  function format(marker) {
    const { selectionStart, selectionEnd } = textareaRef.current
    const result = toggleMarker(draft, selectionStart, selectionEnd, marker)
    pendingSelection.current = [result.selectionStart, result.selectionEnd]
    setDraft(result.value)
  }

  function save() {
    saveNote(stepId, draft)
    onClose()
  }

  function handleKeyDown(event) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return

    const key = event.key.toLowerCase()
    if (key === 'b' || key === 'i') {
      // Ctrl+B is also the outline rail's shortcut. Inside the note it means bold.
      event.preventDefault()
      event.stopPropagation()
      format(key === 'b' ? BOLD_MARKER : ITALIC_MARKER)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      save()
    }
  }

  const isRemoving = savedNote && !draft.trim()

  return (
    <form
      id={STEP_NOTE_ID}
      className="step-note step-note--editing"
      aria-label="Your note"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <div className="step-note__toolbar" role="toolbar" aria-label="Text formatting">
        <button type="button" className="step-note__format" data-format="bold" aria-label="Bold" title="Bold (Ctrl+B)" onClick={() => format(BOLD_MARKER)}>
          B
        </button>
        <button type="button" className="step-note__format" data-format="italic" aria-label="Italic" title="Italic (Ctrl+I)" onClick={() => format(ITALIC_MARKER)}>
          I
        </button>
      </div>

      <textarea
        ref={textareaRef}
        className="step-note__input"
        aria-label="Your note"
        aria-describedby="step-note-hint"
        value={draft}
        maxLength={NOTE_MAX_LENGTH}
        rows={5}
        spellCheck
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
      />

      <p className="step-note__hint" id="step-note-hint">
        Select text, then press B or I. A blank line starts a new paragraph.
      </p>

      <div className="step-note__actions">
        <button type="submit" className="step-note__save">
          {isRemoving ? 'Remove note' : 'Save'}
        </button>
        <button type="button" className="step-note__cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  )
}

// The saved note, with a menu behind the three dots. Deleting asks first, since
// a note cannot be brought back.
function SavedNote({ stepId, text, onEdit, onClose }) {
  const saveNote = useProgressStore((state) => state.saveNote)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const keepRef = useRef(null)

  const menuItems = () => [...menuRef.current.querySelectorAll('[role="menuitem"]')]

  useEffect(() => {
    if (isMenuOpen) menuItems()[0].focus()
  }, [isMenuOpen])

  useEffect(() => {
    if (isConfirming) keepRef.current.focus()
  }, [isConfirming])

  function closeMenu() {
    setIsMenuOpen(false)
    triggerRef.current?.focus()
  }

  function handleMenuKeyDown(event) {
    const items = menuItems()
    const index = items.indexOf(document.activeElement)

    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      closeMenu()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      items[(index + 1) % items.length].focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      items[(index - 1 + items.length) % items.length].focus()
    }
  }

  function deleteNote() {
    saveNote(stepId, '')
    onClose()
  }

  return (
    <section id={STEP_NOTE_ID} className="step-note" aria-label="Your note" tabIndex={-1}>
      <div className="step-note__header">
        <p className="step-note__label">Your note</p>

        <div
          className="step-note__menu"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setIsMenuOpen(false)
          }}
        >
          <button
            type="button"
            ref={triggerRef}
            className="step-card__toggle"
            aria-label="Note options"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <DotsIcon />
          </button>

          {isMenuOpen && (
            <div ref={menuRef} className="step-note__menu-list" role="menu" aria-label="Note options" onKeyDown={handleMenuKeyDown}>
              <button
                type="button"
                role="menuitem"
                className="step-note__menu-item"
                onClick={() => {
                  setIsMenuOpen(false)
                  onEdit()
                }}
              >
                Edit note
              </button>
              <button
                type="button"
                role="menuitem"
                className="step-note__menu-item"
                data-danger="true"
                onClick={() => {
                  setIsMenuOpen(false)
                  setIsConfirming(true)
                }}
              >
                Delete note
              </button>
            </div>
          )}
        </div>
      </div>

      {isConfirming ? (
        <div className="step-note__confirm" role="group" aria-label="Delete this note?">
          <p>Delete this note? This cannot be undone.</p>
          <div className="step-note__actions">
            <button type="button" ref={keepRef} className="step-note__save" onClick={() => setIsConfirming(false)}>
              Keep
            </button>
            <button type="button" className="step-note__cancel step-note__delete" onClick={deleteNote}>
              Delete
            </button>
          </div>
        </div>
      ) : (
        <NoteQuote text={text} />
      )}
    </section>
  )
}

// The learner's own note for one step, at the foot of the card. While editing it
// is a small form; once saved it is a panel on its own soft fill.
export default function StepNote({ stepId, isEditing, onEdit, onClose }) {
  const savedNote = useProgressStore((state) => state.notes[stepId] ?? '')

  if (isEditing) return <NoteEditor stepId={stepId} savedNote={savedNote} onClose={onClose} />
  if (!savedNote) return null

  return <SavedNote stepId={stepId} text={savedNote} onEdit={onEdit} onClose={onClose} />
}
