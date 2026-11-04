import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { tuning } from '../config/tuning'
import { stepSimulation } from '../systems/simulation'
import type { createRunStore } from '../state/runState'
import type { PlanetWorld } from '../world/planet'
import type { ResourceCluster } from '../world/resourceClusters'

// AUT-11: simulation advances in fixed steps; frame time only decides how many steps run this frame.
export function MinerRunner({ world, store, active, onCollect }: {
  world: PlanetWorld
  store: ReturnType<typeof createRunStore>
  active: boolean
  onCollect: (collected: ResourceCluster[]) => void
}) {
  const accumulator = useRef(0)
  useFrame((_, delta) => {
    // Manual mode freezes the crew: nothing moves or digs where the player cannot see it.
    if (!active) {
      accumulator.current = 0
      return
    }
    const step = 1 / tuning.miner.tickRate
    accumulator.current = Math.min(accumulator.current + delta, step * tuning.miner.maxStepsPerFrame)
    while (accumulator.current >= step) {
      accumulator.current -= step
      const collected = stepSimulation(world, store)
      if (collected.length > 0) onCollect(collected)
    }
  })
  return null
}
