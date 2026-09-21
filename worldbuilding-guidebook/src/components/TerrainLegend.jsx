import { getInset } from '../scene/insetRegistry.js'
import { useSceneStore } from '../store/sceneStore.js'
import './TerrainLegend.css'

export default function TerrainLegend() {
  const demoKey = useSceneStore((state) => state.demoKey)
  const insetKey = useSceneStore((state) => state.insetKey)
  const grayscale = useSceneStore((state) => state.grayscale)
  const isTerrain = ['noise-terrain', 'simulation-terrain'].includes(demoKey)
  const isSimulation = demoKey === 'simulation-terrain'

  if (!isTerrain) return null

  return (
    <div
      className="terrain-legend"
      data-below-inset={getInset(insetKey) !== null}
      data-grayscale={grayscale}
      role="group"
      aria-label="Terrain elevation colours"
    >
      <h2 className="terrain-legend__title">Elevation</h2>
      <div className="terrain-legend__scale">
        <div
          className="terrain-legend__gradient"
          role="img"
          aria-label="Elevation from low terrain through middle terrain to high terrain"
        />
        <div className="terrain-legend__labels" aria-hidden="true">
          <span>Low</span>
          <span>Mid</span>
          <span>High</span>
        </div>
        {isSimulation && (
          <div className="terrain-legend__water">
            <i aria-hidden="true" />
            <span>Water</span>
          </div>
        )}
      </div>
    </div>
  )
}
