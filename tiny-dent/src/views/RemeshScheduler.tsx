import { useFrame, useThree } from '@react-three/fiber'
import { tuning } from '../config/tuning'
import type { PlanetWorld } from '../world/planet'

export function RemeshScheduler({ world, onRemesh }: { world: PlanetWorld; onRemesh: () => void }) {
  const { camera } = useThree()
  useFrame(() => {
    const remeshed = world.remeshDirty(tuning.remesh.timeBudgetMs)
    const lodChanged = world.setLodCamera(camera.position, tuning.remesh.timeBudgetMs)
    if (remeshed || lodChanged) onRemesh()
  })
  return null
}
