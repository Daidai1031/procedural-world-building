import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { tuning } from '../config/tuning'
import type { createRunStore } from '../state/runState'
import { stepBackgroundPlanets } from '../systems/simulation'

export function BackgroundRunner({ store, active }: { store: ReturnType<typeof createRunStore>; active: boolean }) {
  const accumulator = useRef(0)
  useFrame((_, delta) => {
    if (!active) { accumulator.current = 0; return }
    const step = 1 / tuning.miner.tickRate
    accumulator.current = Math.min(accumulator.current + delta, step * tuning.miner.maxStepsPerFrame)
    while (accumulator.current >= step) {
      accumulator.current -= step
      stepBackgroundPlanets(store)
    }
  })
  return null
}
