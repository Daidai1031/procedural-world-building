import { useSceneStore } from '../store/sceneStore.js'
import { useSimulationState } from '../scene/demos/proceduralMaps/simulationState.js'
import { getSimulationStats } from '../scene/demos/proceduralMaps/simulationMath.js'

export default function SimulationControls() {
  const isRunning = useSceneStore((state) => state.isRunning)
  const setIsRunning = useSceneStore((state) => state.setIsRunning)
  const simulation = useSimulationState((state) => state.simulation)
  const worldSize = useSceneStore((state) => state.params.erosionWorldSize)
  const resolution = useSceneStore((state) => state.params.mapResolution)
  const stats = getSimulationStats(simulation, worldSize)
  const step = useSimulationState((state) => state.step)
  const reset = useSimulationState((state) => state.reset)

  return (
    <div className="simulation-controls" role="group" aria-label="Simulation playback">
      <output className="control__value" aria-label="Current timestep">Timestep {simulation.iteration}</output>
      <div className="simulation-controls__buttons">
        <button type="button" aria-pressed={isRunning} onClick={() => setIsRunning(!isRunning)}>
          {isRunning ? 'Pause erosion' : 'Start erosion'}
        </button>
        <button type="button" disabled={isRunning} onClick={step}>Step once</button>
        <button type="button" onClick={reset}>Reset terrain</button>
      </div>
      <details className="simulation-controls__measurements">
        <summary>Measurements</summary>
        <dl>
          <div><dt>Cell spacing</dt><dd>{stats.cellSize.toFixed(2)} units</dd></div>
          <div><dt>Simulation cells</dt><dd>{stats.cellCount.toLocaleString()}</dd></div>
          <div><dt>Mesh vertices</dt><dd>{((resolution + 1) ** 2).toLocaleString()}</dd></div>
          <div><dt>Water</dt><dd>{stats.totalWater.toFixed(1)}</dd></div>
          <div><dt>Height range</dt><dd>{stats.minimumHeight.toFixed(2)}–{stats.maximumHeight.toFixed(2)}</dd></div>
        </dl>
      </details>
    </div>
  )
}
