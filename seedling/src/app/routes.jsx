import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { flatOrder, lessons, stepsBySlug } from '../content/loader.js'
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
