import { useEffect } from 'react'

const TYPING_TAGS = ['INPUT', 'SELECT', 'TEXTAREA']

// Arrow keys belong to whatever the learner is currently operating — a slider, a
// select, the card's resize separator — before they belong to step navigation.
function claimsArrowKeys(target) {
  if (!target || !target.tagName) return false
  if (target.isContentEditable) return true
  if (TYPING_TAGS.includes(target.tagName)) return true

  return target.getAttribute('role') === 'separator'
}

function isCommandChord(event) {
  return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey
}

// ← and → walk the lesson. Pass null for an end of the sequence.
export function useStepArrowKeys(goToPreviousStep, goToNextStep) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (claimsArrowKeys(event.target)) return

      let go = null
      if (event.key === 'ArrowLeft') go = goToPreviousStep
      else if (event.key === 'ArrowRight') go = goToNextStep
      if (!go) return

      event.preventDefault()
      go()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPreviousStep, goToNextStep])
}

// ⌘B outline rail, ⌘\ card collapse, Esc closes whatever is open.
export function useShellKeys({ toggleRail, toggleCard, closeOverlays }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeOverlays()
        return
      }

      if (!isCommandChord(event)) return

      if (event.key === 'b' || event.key === 'B') {
        event.preventDefault()
        toggleRail()
        return
      }

      if (event.key === '\\') {
        event.preventDefault()
        toggleCard()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleRail, toggleCard, closeOverlays])
}
