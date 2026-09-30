import { useFrame } from '@react-three/fiber'
import { tuning } from '../config/tuning'
import type { PlanetWorld } from '../world/planet'

export function RemeshScheduler({ world, onRemesh }: { world: PlanetWorld; onRemesh: () => void }) {
  useFrame(() => {
    // TERR-04: rebuild dirty chunks over frames, then refresh their render meshes.
    if (world.remeshDirty(tuning.remesh.timeBudgetMs)) onRemesh()
  })
  return null
}
