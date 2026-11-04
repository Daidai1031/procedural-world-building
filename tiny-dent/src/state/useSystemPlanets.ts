import { useEffect, useState } from 'react'
import type { createRunStore } from './runState'
import { systemPlanets, type SystemPlanet } from '../systems/system'
import { useSystemView } from './systemView'

// The known worlds, read when the pull-back starts and then once a second while it is open, so descriptions
// follow the running planet. Nothing is polled in orbit view.
export function useSystemPlanets(store: ReturnType<typeof createRunStore>): SystemPlanet[] {
  const open = useSystemView(state => state.phase !== 'orbit')
  const [planets, setPlanets] = useState(() => systemPlanets(store))
  useEffect(() => {
    if (!open) return
    setPlanets(systemPlanets(store))
    const timer = window.setInterval(() => setPlanets(systemPlanets(store)), 1000)
    return () => window.clearInterval(timer)
  }, [store, open])
  return planets
}
