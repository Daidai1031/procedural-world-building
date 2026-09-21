import { useEffect, useMemo } from 'react'
import { BufferAttribute, Color, DoubleSide, PlaneGeometry } from 'three'
import { readToken } from '../../../styles/readToken.js'
import { sampleSimulationGrid } from './simulationMath.js'

// Water lies on the terrain as a layer of the same shape. How deep the water is
// shows in how opaque it is, not in how high it stands: drawing the true water
// surface (height + water) lifts it off the ground along ridges and edges, so
// the layer would no longer sit on the mountain. Rain and evaporation leave a
// thin film on flat ground, about rainfall * (1 - evaporation) / evaporation
// deep. That film is left transparent and only water deeper than it is drawn,
// so what shows is water that has gathered in low ground and moves between
// updates.
const LIFT = 0.012
const MAX_DISPLAY_DEPTH = 0.012
const FILM_TO_FIRST_VISIBLE = 0.9
const FILM_TO_FULLY_VISIBLE = 3
const MAX_ALPHA = 0.85

function smoothstep(low, high, value) {
  const amount = Math.min(1, Math.max(0, (value - low) / (high - low)))
  return amount * amount * (3 - 2 * amount)
}

export default function WaterSurface({ simulation, settings, mapSettings }) {
  const waterColor = useMemo(() => new Color(readToken('--erosion-water')), [])

  const geometry = useMemo(() => {
    const film = (settings.rainfall * (1 - settings.evaporation)) / settings.evaporation
    const surface = new PlaneGeometry(settings.worldSize, settings.worldSize, mapSettings.resolution, mapSettings.resolution)
    surface.rotateX(-Math.PI / 2)

    const positions = surface.attributes.position
    const colors = new Float32Array(positions.count * 4)

    for (let index = 0; index < positions.count; index += 1) {
      const u = positions.getX(index) / settings.worldSize + 0.5
      const v = positions.getZ(index) / settings.worldSize + 0.5
      const height = sampleSimulationGrid(simulation.height, simulation.size, u, v)
      const water = sampleSimulationGrid(simulation.water, simulation.size, u, v)

      positions.setY(index, height * mapSettings.amplitude + LIFT + Math.min(water * mapSettings.amplitude, MAX_DISPLAY_DEPTH))
      colors[index * 4] = waterColor.r
      colors[index * 4 + 1] = waterColor.g
      colors[index * 4 + 2] = waterColor.b
      colors[index * 4 + 3] = MAX_ALPHA * smoothstep(film * FILM_TO_FIRST_VISIBLE, film * FILM_TO_FULLY_VISIBLE, water)
    }

    surface.setAttribute('color', new BufferAttribute(colors, 4))
    surface.computeVertexNormals()
    return surface
  }, [simulation, settings.worldSize, settings.rainfall, settings.evaporation, mapSettings.amplitude, mapSettings.resolution, waterColor])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} renderOrder={1}>
      <meshStandardMaterial vertexColors transparent depthWrite={false} roughness={0.2} metalness={0} side={DoubleSide} />
    </mesh>
  )
}
