import { useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { sampleProceduralMap } from './noiseMath.js'

const TERRAIN_SIZE = 10
const LOW_COLOR = new THREE.Color('#99B7F5')
const MID_COLOR = new THREE.Color('#267F53')
const HIGH_COLOR = new THREE.Color('#FCCA59')

function heightColor(value, target) {
  if (value < 0.52) return target.lerpColors(LOW_COLOR, MID_COLOR, value / 0.52)
  return target.lerpColors(MID_COLOR, HIGH_COLOR, (value - 0.52) / 0.48)
}

function TerrainMesh({ settings }) {
  const geometry = useMemo(() => {
    const terrain = new THREE.PlaneGeometry(
      TERRAIN_SIZE,
      TERRAIN_SIZE,
      settings.resolution,
      settings.resolution,
    )
    terrain.rotateX(-Math.PI / 2)

    const positions = terrain.attributes.position
    const colors = new Float32Array(positions.count * 3)
    const color = new THREE.Color()

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index)
      const z = positions.getZ(index)
      const value = sampleProceduralMap(x, z, settings)
      positions.setY(index, value * settings.amplitude)
      heightColor(value, color)
      colors[index * 3] = color.r
      colors[index * 3 + 1] = color.g
      colors[index * 3 + 2] = color.b
    }

    terrain.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    terrain.computeVertexNormals()
    return terrain
  }, [settings])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.78} metalness={0.03} side={THREE.DoubleSide} />
    </mesh>
  )
}

export default function TerrainPreview({ settings }) {
  return (
    <section className="terrain-preview" aria-labelledby="terrain-preview-title">
      <header className="preview-header preview-header--overlay">
        <span>3D output</span>
        <strong id="terrain-preview-title">Height field</strong>
      </header>
      <Canvas
        shadows
        camera={{ position: [8, 6.5, 8], fov: 48, near: 0.1, far: 200 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#ffffff']} />
        <ambientLight intensity={0.6} />
        <hemisphereLight args={['#bcd4ff', '#4a3b2a', 0.45]} />
        <directionalLight
          position={[7, 10, 5]}
          intensity={2.1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />

        <TerrainMesh settings={settings} />
        <Grid
          position={[0, -0.03, 0]}
          args={[12, 12]}
          cellSize={0.5}
          cellThickness={0.55}
          cellColor="#cbced2"
          sectionSize={2.5}
          sectionThickness={1.1}
          sectionColor="#F296BD"
          fadeDistance={25}
          fadeStrength={1}
        />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={4}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2.03}
          target={[0, 0.8, 0]}
        />
      </Canvas>
    </section>
  )
}
