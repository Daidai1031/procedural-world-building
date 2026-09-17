import { useSimulationState } from '../demos/proceduralMaps/simulationState.js'
import SimulationMapPreview from '../demos/proceduralMaps/SimulationMapPreview.jsx'

export default function SimulationMap() {
  const simulation = useSimulationState((state) => state.simulation)
  return <SimulationMapPreview simulation={simulation} />
}
