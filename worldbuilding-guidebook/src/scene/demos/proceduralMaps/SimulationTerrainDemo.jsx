import { useEffect, useMemo } from 'react'
import { useSceneStore } from '../../../store/sceneStore.js'
import { mapSettingsFromParams, simulationSettingsFromParams } from './params.js'
import { useSimulationState } from './simulationState.js'
import SimulationTerrainPreview from './SimulationTerrainPreview.jsx'
import TerrainWorld from './TerrainWorld.jsx'
import { useWireframeShortcut } from './useWireframeShortcut.js'

export default function SimulationTerrainDemo() {
  const params = useSceneStore((state) => state.params)
  const isRunning = useSceneStore((state) => state.isRunning)
  const simulation = useSimulationState((state) => state.simulation)
  const step = useSimulationState((state) => state.step)
  const settings = useMemo(() => simulationSettingsFromParams(params), [params])
  const mapSettings = useMemo(() => mapSettingsFromParams(params), [params])
  useWireframeShortcut()

  useEffect(() => {
    if (!isRunning) return
    const timer = setInterval(step, 1000 / settings.stepsPerSecond)
    return () => clearInterval(timer)
  }, [isRunning, settings.stepsPerSecond, step])

  return (
    <TerrainWorld simulation worldSize={settings.worldSize}>
      <SimulationTerrainPreview simulation={simulation} settings={settings} mapSettings={mapSettings} wireframe={params.mapWireframe} />
    </TerrainWorld>
  )
}
