import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { flatOrder, lessons, stepsBySlug } from '../content/loader.js'
import { legacyLessons } from '../lessons/index.js'
import { useProgressStore } from '../store/progressStore.js'
import AppLayout from './AppLayout.jsx'
import StepView from './StepView.jsx'

function stepPath(step) {
  return `/lesson/${step.lessonSlug}/${step.stepSlug}`
}

function LastVisitedStep() {
  const lastStepId = useProgressStore((state) => state.lastStepId)
  const step = (lastStepId && stepsBySlug.get(lastStepId)) || stepsBySlug.get(flatOrder[0])

  return <Navigate to={stepPath(step)} replace />
}

function FirstStepOfLesson() {
  const { lessonSlug } = useParams()
  const lesson = lessons.find((entry) => entry.slug === lessonSlug)

  if (!lesson || lesson.steps.length === 0) return <Navigate to="/" replace />

  return <Navigate to={stepPath(lesson.steps[0])} replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LastVisitedStep />} />
      <Route element={<AppLayout />}>
        <Route path="/lesson/:lessonSlug" element={<FirstStepOfLesson />} />
        <Route path="/lesson/:lessonSlug/:stepSlug" element={<StepView />} />
      </Route>
      {/* Lesson 02 until it migrates in Phase 3. It brings its own canvases, so it
          lives outside AppLayout and never renders alongside SceneHost. */}
      {legacyLessons.map((lesson) => (
        <Route
          key={lesson.id}
          path={lesson.path}
          element={
            <>
              <nav className="legacy-back" aria-label="Back to the course">
                <Link to="/">← Back to Lesson 01</Link>
              </nav>
              <lesson.component />
            </>
          }
        />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
