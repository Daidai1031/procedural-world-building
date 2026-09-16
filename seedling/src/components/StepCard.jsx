import { useRef } from 'react'
import { Link } from 'react-router-dom'
import Practice from '../practice/Practice.jsx'
import EditableCode from '../practice/EditableCode.jsx'
import CodeBlock from './CodeBlock.jsx'
import snippets from '../generated/snippets.json'
import { CARD_MAX_WIDTH, CARD_MIN_WIDTH, useUiStore } from '../store/uiStore.js'
import './StepCard.css'

const NUDGE_STEP = 16
const PAGE_STEP = 64

function stepPath(step) {
  return `/lesson/${step.lessonSlug}/${step.stepSlug}`
}

function padOrdinal(value) {
  return String(value).padStart(2, '0')
}

function Chevron({ direction }) {
  const points = direction === 'left' ? '9.5,3 5,8 9.5,13' : '6.5,3 11,8 6.5,13'

  return (
    <svg className="chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <polyline points={points} />
    </svg>
  )
}

// A window splitter. Pointer drag and arrow keys change the same value, and the
// current width is announced rather than left to sighted guesswork.
function ResizeHandle() {
  const cardWidth = useUiStore((state) => state.cardWidth)
  const setCardWidth = useUiStore((state) => state.setCardWidth)
  const dragOrigin = useRef(null)

  function handlePointerDown(event) {
    if (event.button !== 0) return

    dragOrigin.current = { pointerX: event.clientX, width: cardWidth }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event) {
    if (!dragOrigin.current) return

    const { pointerX, width } = dragOrigin.current
    setCardWidth(width + (event.clientX - pointerX))
  }

  function handlePointerUp(event) {
    if (!dragOrigin.current) return

    dragOrigin.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function handleKeyDown(event) {
    const moves = {
      ArrowLeft: cardWidth - NUDGE_STEP,
      ArrowRight: cardWidth + NUDGE_STEP,
      PageDown: cardWidth - PAGE_STEP,
      PageUp: cardWidth + PAGE_STEP,
      Home: CARD_MIN_WIDTH,
      End: CARD_MAX_WIDTH,
    }

    const next = moves[event.key]
    if (next === undefined) return

    event.preventDefault()
    setCardWidth(next)
  }

  return (
    <div
      className="step-card__resize"
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label="Card width"
      aria-valuemin={CARD_MIN_WIDTH}
      aria-valuemax={CARD_MAX_WIDTH}
      aria-valuenow={cardWidth}
      aria-valuetext={`${cardWidth} pixels`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    />
  )
}

// The collapsed strip is 44px wide, so the destination titles live in the
// accessible name rather than on screen.
function StubLink({ step, direction }) {
  if (!step) {
    return (
      <span className="step-card__stub-link" data-empty="true" aria-hidden="true">
        <Chevron direction={direction} />
      </span>
    )
  }

  const role = direction === 'left' ? 'Previous' : 'Next'

  return (
    <Link
      className="step-card__stub-link"
      to={stepPath(step)}
      rel={direction === 'left' ? 'prev' : 'next'}
      aria-label={`${role}: ${step.frontmatter.title}`}
    >
      <Chevron direction={direction} />
    </Link>
  )
}

function StepLink({ step, direction }) {
  if (!step) return <span className="step-card__nav-slot" />

  return (
    <Link
      className="step-card__nav-link"
      to={stepPath(step)}
      rel={direction === 'left' ? 'prev' : 'next'}
      data-direction={direction}
    >
      <span className="step-card__nav-role">{direction === 'left' ? 'Previous' : 'Next'}</span>
      <span className="step-card__nav-title">{step.frontmatter.title}</span>
    </Link>
  )
}

export default function StepCard({ step, previousStep, nextStep }) {
  const { frontmatter, Component } = step
  const group = step.chapterTitle ?? step.lessonTitle
  const cardWidth = useUiStore((state) => state.cardWidth)
  const cardCollapsed = useUiStore((state) => state.cardCollapsed)
  const toggleCardCollapsed = useUiStore((state) => state.toggleCardCollapsed)

  if (cardCollapsed) {
    return (
      <article className="step-card step-card--collapsed" aria-label={frontmatter.title}>
        <button
          type="button"
          className="step-card__toggle"
          onClick={toggleCardCollapsed}
          aria-expanded={false}
          aria-label="Expand the lesson card"
        >
          <Chevron direction="right" />
        </button>

        <p className="step-card__ordinal">{padOrdinal(step.positionInLesson)}</p>

        <nav className="step-card__stub-nav" aria-label="Step navigation">
          <StubLink step={previousStep} direction="left" />
          <StubLink step={nextStep} direction="right" />
        </nav>
      </article>
    )
  }

  return (
    <article
      className="step-card"
      style={{ '--card-width': `${cardWidth}px` }}
      aria-labelledby="step-card-title"
    >
      {/* Keyed on the step so the one orchestrated moment in the app — §8's
          220ms rise and fade — replays on navigation, and the scroll position
          returns to the top of the new step. */}
      <div className="step-card__body" key={step.id}>
        <header className="step-card__header">
          <p className="step-card__context">
            <span className="step-card__lesson">
              <span className="step-card__lesson-number">Lesson {step.lessonNumber}</span>
              <span className="step-card__lesson-title">{group}</span>
            </span>
            <span className="step-card__position">
              {padOrdinal(step.positionInLesson)}
              <span className="step-card__position-total">/{padOrdinal(step.totalInLesson)}</span>
            </span>
          </p>

          <h1 id="step-card-title" className="step-card__title">
            {frontmatter.title}
          </h1>
          <p className="step-card__goal">{frontmatter.goal}</p>
        </header>

        <div className="step-card__prose">
          <Component />
        </div>

        {frontmatter.code && (frontmatter.code.editable ? <EditableCode stepId={step.id} reference={frontmatter.code} snippet={snippets[step.id]} /> : <CodeBlock stepId={step.id} reference={frontmatter.code} snippet={snippets[step.id]} />)}
        {frontmatter.practice && <Practice stepId={step.id} task={frontmatter.practice} snippet={snippets[`${step.id}:practice`]} />}
        {/* Inline tutor input (I3) in Phase 5. */}
      </div>

      <nav className="step-card__nav" aria-label="Step navigation">
        <StepLink step={previousStep} direction="left" />
        <StepLink step={nextStep} direction="right" />
      </nav>

      <button
        type="button"
        className="step-card__toggle step-card__toggle--inline"
        onClick={toggleCardCollapsed}
        aria-expanded={true}
        aria-label="Collapse the lesson card"
      >
        <Chevron direction="left" />
      </button>

      <ResizeHandle />
    </article>
  )
}
