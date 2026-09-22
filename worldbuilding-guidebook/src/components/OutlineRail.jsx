import { useTutorStore } from '../tutor/tutorStore.js'
import { TUTOR_ENABLED } from '../tutor/tutorEnabled.js'
import { Link, useMatch } from 'react-router-dom'
import { lessons } from '../content/loader.js'
import { useAuthStore } from '../store/authStore.js'
import { useProgressStore } from '../store/progressStore.js'
import { useUiStore } from '../store/uiStore.js'
import './OutlineRail.css'

function padOrdinal(value) {
  return String(value).padStart(2, '0')
}

function PinIcon({ pinned }) {
  return (
    <svg className="rail__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M9.5 1.5 14.5 6.5 12 7 9 10l-.5 4L2 7.5l4-.5 3-3z" fill={pinned ? 'currentcolor' : 'none'} />
      <line x1="7.5" y1="9.5" x2="3" y2="14" />
    </svg>
  )
}

function TutorIcon() {
  return (
    <svg className="rail__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M2.5 3.5h11a1 1 0 0 1 1 1V10a1 1 0 0 1-1 1H6l-2.5 2.5V11H2.5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
      <line x1="5" y1="6.25" x2="11" y2="6.25" />
      <line x1="5" y1="8.5" x2="8.5" y2="8.5" />
    </svg>
  )
}

function ExpandHintIcon() {
  return (
    <svg className="rail__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <polyline points="10 4 6 8 10 12" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg className="rail__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M2 8 8 2.5 14 8" />
      <path d="M3.5 7v6.5h9V7" />
      <path d="M6.5 13.5v-4h3v4" />
    </svg>
  )
}

function AccountIcon() {
  return (
    <svg className="rail__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="5.5" r="2.75" />
      <path d="M2.75 14c0-2.9 2.35-5 5.25-5s5.25 2.1 5.25 5" />
    </svg>
  )
}

function StepRow({ step, isCurrent, isComplete }) {
  return (
    <li>
      <Link
        className="rail__step"
        to={`/lesson/${step.lessonSlug}/${step.stepSlug}`}
        data-current={isCurrent}
        aria-current={isCurrent ? 'step' : undefined}
      >
        <span className="rail__mark" data-complete={isComplete} aria-hidden="true" />
        <span className="rail__number">{padOrdinal(step.positionInLesson)}</span>
        <span className="rail__title">{step.frontmatter.title}</span>
        {isComplete && <span className="rail__sr-only">Completed</span>}
      </Link>
    </li>
  )
}

// A lesson the learner has not opened: one bold row, no nested steps.
// Opening it — following the link — is what expands it.
function LessonSummaryRow({ lesson }) {
  return (
    <Link className="rail__lesson-row" to={`/lesson/${lesson.slug}`}>
      <span className="rail__number">{padOrdinal(lesson.number)}</span>
      <span className="rail__title">{lesson.title}</span>
    </Link>
  )
}

// The open lesson: the same bold row (not a link — the learner is already
// here), plus its chapters and steps indented underneath, one level down and
// visibly lighter than the lesson row itself.
function LessonDetail({ lesson, groups, currentStepId, completedStepIds }) {
  return (
    <div className="rail__lesson-open">
      <p className="rail__lesson-row" aria-current="location">
        <span className="rail__number">{padOrdinal(lesson.number)}</span>
        <span className="rail__title">{lesson.title}</span>
      </p>
      <div className="rail__lesson-steps">
        {groups.map((group) => (
          <section className="rail__group" key={group.key}>
            {group.title && <h2 className="rail__group-title">{group.title}</h2>}
            <ol className="rail__steps">
              {group.steps.map((step) => (
                <StepRow
                  key={step.id}
                  step={step}
                  isCurrent={step.id === currentStepId}
                  isComplete={completedStepIds.includes(step.id)}
                />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  )
}

// Collapsed-only progress rail: one dot per step in the open lesson, filled
// for a completed step and solid for the one the learner is on right now —
// visible exactly when the real step list (with its own marks) is not. See
// .rail__progress in the stylesheet for the cross-fade with .rail__scroll.
function CollapsedProgress({ steps, currentStepId, completedStepIds }) {
  const completeCount = steps.filter((step) => completedStepIds.includes(step.id)).length

  return (
    <div className="rail__progress">
      <span className="rail__sr-only">
        {completeCount} of {steps.length} steps complete
      </span>
      {steps.map((step) => (
        <span
          key={step.id}
          className="rail__progress-dot"
          data-current={step.id === currentStepId}
          data-complete={completedStepIds.includes(step.id)}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

// §5 48px collapsed, 280px on hover or ⌘B. Hovering floats the rail over the
// card; pinning it pushes the card aside instead, so the prose does not reflow
// every time the outline is glanced at.
export default function OutlineRail() {
  const match = useMatch('/lesson/:lessonSlug/:stepSlug')
  const railPinned = useUiStore((state) => state.railPinned)
  const toggleRailPinned = useUiStore((state) => state.toggleRailPinned)
  const completedStepIds = useProgressStore((state) => state.completedStepIds)
  const accountUser = useAuthStore((state) => state.user)

  const lessonSlug = match?.params.lessonSlug
  const lesson = lessons.find((entry) => entry.slug === lessonSlug)
  const currentStepId = lessonSlug && match ? `${lessonSlug}/${match.params.stepSlug}` : null

  if (!lesson) return null

  const groups =
    lesson.chapters.length > 0
      ? lesson.chapters.map((chapter) => ({ key: chapter.slug, title: chapter.title, steps: chapter.steps }))
      : [{ key: lesson.slug, title: null, steps: lesson.steps }]

  return (
    <nav className="rail" data-pinned={railPinned} aria-label="Lesson outline">
      {/* The pin sits first so it stays reachable at the collapsed width — the
          rest of the head only exists once there is room for it. */}
      <div className="rail__head">
        <button
          type="button"
          className="rail__pin"
          onClick={toggleRailPinned}
          aria-pressed={railPinned}
          aria-label="Keep the outline open"
        >
          <PinIcon pinned={railPinned} />
        </button>
        <p className="rail__lesson">
          <span className="rail__lesson-number">Lesson {lesson.number}</span>
          <span className="rail__lesson-title">{lesson.title}</span>
        </p>
      </div>

      <CollapsedProgress steps={lesson.steps} currentStepId={currentStepId} completedStepIds={completedStepIds} />

      <div className="rail__scroll">
        {TUTOR_ENABLED && (
          <button type="button" className="rail__tutor" aria-label="Open course tutor" aria-controls="tutor-drawer" onClick={() => useTutorStore.getState().open()} title="Course tutor (Ctrl/Cmd+K)">
            <TutorIcon />
            <span className="rail__tutor-label">Ask tutor</span>
          </button>
        )}
        {/* Lessons 1–3 in order. Only the one the learner opened — the current
            route — expands to show its chapters and steps; the rest are one
            row each, and following a row's link is what opens it. */}
        {lessons.map((entry) =>
          entry.slug === lessonSlug ? (
            <LessonDetail
              key={entry.slug}
              lesson={entry}
              groups={groups}
              currentStepId={currentStepId}
              completedStepIds={completedStepIds}
            />
          ) : (
            <LessonSummaryRow key={entry.slug} lesson={entry} />
          ),
        )}
      </div>

      {/* Account and Home are utility exits, not lesson content, so they sit
          below all of it. */}
      <div className="rail__foot">
        <button type="button" className="rail__exit" aria-label="Open account panel" aria-controls="account-drawer" onClick={() => useAuthStore.getState().open()}>
          <AccountIcon />
          <span className="rail__exit-label">{accountUser ? accountUser.email : 'Account'}</span>
        </button>
        <Link className="rail__exit" to="/" aria-label="Back to the last visited step">
          <HomeIcon />
          <span className="rail__exit-label">Home</span>
        </Link>
      </div>

      {/* Decorative only — hovering, focusing, or pinning the rail is what
          actually opens it. The only thing the 48px collapsed rail shows. */}
      <span className="rail__hint" aria-hidden="true">
        <ExpandHintIcon />
      </span>
    </nav>
  )
}
