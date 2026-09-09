import { useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { sampleSimulationGrid } from './simulationMath.js'

const LOW_COLOR = new THREE.Color('#99B7F5')
const MID_COLOR = new THREE.Color('#267F53')
const HIGH_COLOR = new THREE.Color('#FCCA59')

function heightColor(value, target) {
  if (value < 0.5) return target.lerpColors(LOW_COLOR, MID_COLOR, value / 0.5)
  return target.lerpColors(MID_COLOR, HIGH_COLOR, Math.min(1, (value - 0.5) / 0.5))
}

function SimulatedTerrainMesh({ simulation, settings, mapSettings, wireframe }) {
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

    for (let index = 0; index < positions.count; index += 1) {
      const u = positions.getX(index) / settings.worldSize + 0.5
      const v = positions.getZ(index) / settings.worldSize + 0.5
      const value = sampleSimulationGrid(simulation.height, simulation.size, u, v)
      positions.setY(index, value * mapSettings.amplitude)
      heightColor(value, color)
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

export default function SimulationTerrainPreview({ simulation, settings, mapSettings, wireframe }) {
  return (
    <section className="terrain-preview" aria-labelledby="simulation-terrain-title">
      <header className="preview-header preview-header--overlay">
        <span>3D updated height field</span>
        <strong id="simulation-terrain-title">Eroded terrain{wireframe ? ' · Wireframe' : ''}</strong>
      </header>
      <Canvas
        shadows
        camera={{ position: [8, 6.5, 8], fov: 48, near: 0.1, far: 200 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#ffffff']} />
        <ambientLight intensity={0.58} />
        <hemisphereLight args={['#c4ddff', '#493d31', 0.45]} />
        <directionalLight
          position={[7, 10, 5]}
          intensity={2.15}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />

        <SimulatedTerrainMesh
          simulation={simulation}
          settings={settings}
          mapSettings={mapSettings}
          wireframe={wireframe}
        />
        <Grid
          position={[0, -0.03, 0]}
          args={[settings.worldSize + 2, settings.worldSize + 2]}
          cellSize={settings.worldSize / 10}
          cellThickness={0.55}
          cellColor="#cbced2"
          sectionSize={settings.worldSize / 2}
          sectionThickness={1.1}
          sectionColor="#F296BD"
          fadeDistance={settings.worldSize * 2.5}
          fadeStrength={1}
        />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={4}
          maxDistance={32}
          maxPolarAngle={Math.PI / 2.03}
          target={[0, mapSettings.amplitude * 0.35, 0]}
        />
      </Canvas>
    </section>
  )
}
