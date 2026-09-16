import { useCallback, useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import StepCard from '../components/StepCard.jsx'
import { getAdjacentSteps, stepsBySlug } from '../content/loader.js'
import { useStepArrowKeys } from '../hooks/useKeyboardShortcuts.js'
import { useProgressStore } from '../store/progressStore.js'
import { useSceneStore } from '../store/sceneStore.js'

const COMPLETE_AFTER_MS = 5000

function stepPath(step) {
  return `/lesson/${step.lessonSlug}/${step.stepSlug}`
}

export default function StepView() {
  const { lessonSlug, stepSlug } = useParams()
  const step = stepsBySlug.get(`${lessonSlug}/${stepSlug}`)
  const navigate = useNavigate()

  const setDemoKey = useSceneStore((state) => state.setDemoKey)
  const setInsetKey = useSceneStore((state) => state.setInsetKey)
  const setInsetSwapped = useSceneStore((state) => state.setInsetSwapped)
  const setUnlocked = useSceneStore((state) => state.setUnlocked)
  const setCompare = useSceneStore((state) => state.setCompare)
  const requestCameraReset = useSceneStore((state) => state.requestCameraReset)
  const setLastStepId = useProgressStore((state) => state.setLastStepId)
  const markStepComplete = useProgressStore((state) => state.markStepComplete)

  const { previous, next } = step ? getAdjacentSteps(step.id) : { previous: null, next: null }

  const goToPrevious = useCallback(
    () => previous && navigate(stepPath(previous)),
    [previous, navigate],
  )
  const goToNext = useCallback(() => next && navigate(stepPath(next)), [next, navigate])

  useStepArrowKeys(previous ? goToPrevious : null, next ? goToNext : null)

  useEffect(() => {
    if (!step) return

    const scene = step.frontmatter.scene ?? {}
    setDemoKey(scene.demo ?? null)
    setInsetKey(scene.inset ?? null)
    // A step starts with its own view forward, whatever the last step ended on.
    setInsetSwapped(false)
    setUnlocked(scene.unlock ?? [])
    setCompare(scene.compare ?? null)
    setLastStepId(step.id)

    if (scene.resetCamera) requestCameraReset()
  }, [
    step,
    setDemoKey,
    setInsetKey,
    setInsetSwapped,
    setUnlocked,
    setCompare,
    setLastStepId,
    requestCameraReset,
  ])

  useEffect(() => {
    if (!step) return

    const timer = setTimeout(() => markStepComplete(step.id), COMPLETE_AFTER_MS)
    return () => clearTimeout(timer)
  }, [step, markStepComplete])

  if (!step) return <Navigate to="/" replace />

  return <StepCard step={step} previousStep={previous} nextStep={next} />
}
