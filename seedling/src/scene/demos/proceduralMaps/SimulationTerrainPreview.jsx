import { useEffect, useMemo } from 'react'


import * as THREE from 'three'
import { sampleSimulationGrid } from './simulationMath.js'

import { elevationColors, heightColor } from './worldPalette.js'

export default function SimulationTerrainPreview({ simulation, settings, mapSettings, wireframe }) {
  const geometry = useMemo(() => {
    const segments = mapSettings.resolution
    const terrain = new THREE.PlaneGeometry(
      settings.worldSize,
      settings.worldSize,
      segments,
      segments,
    )
    terrain.rotateX(-Math.PI / 2)

    const positions = terrain.attributes.position
    const colors = new Float32Array(positions.count * 3)
    const color = new THREE.Color()
    const palette = elevationColors()

    for (let index = 0; index < positions.count; index += 1) {
      const u = positions.getX(index) / settings.worldSize + 0.5
      const v = positions.getZ(index) / settings.worldSize + 0.5
      const value = sampleSimulationGrid(simulation.height, simulation.size, u, v)
      positions.setY(index, value * mapSettings.amplitude)
      heightColor(value, color, palette, 0.5)
      colors[index * 3] = color.r
      colors[index * 3 + 1] = color.g
      colors[index * 3 + 2] = color.b
    }

    terrain.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    terrain.computeVertexNormals()
    return terrain
  }, [mapSettings.amplitude, mapSettings.resolution, settings.worldSize, simulation])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        vertexColors
        wireframe={wireframe}
        roughness={0.82}
        metalness={0.02}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

