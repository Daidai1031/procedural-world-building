import { useSceneStore } from '../../../store/sceneStore.js'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sampleProceduralMap } from './noiseMath.js'
import { elevationColors, heightColor } from './worldPalette.js'
import { readToken } from '../../../styles/readToken.js'

const TERRAIN_SIZE = 10

export default function TerrainPreview({ settings, wireframe, compareRevision }) {
  const overrideRevision = useSceneStore((state) => state.overrideRevision)
  const mesh = useRef(null)
  const transition = useRef(null)
  const previousRevision = useRef(compareRevision)
  const geometry = useMemo(() => {
    const terrain = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, settings.resolution, settings.resolution)
    terrain.rotateX(-Math.PI / 2)
    terrain.setAttribute('color', new THREE.BufferAttribute(new Float32Array(terrain.attributes.position.count * 3), 3))
    return terrain
  }, [settings.resolution])

  useLayoutEffect(() => {
    const activeGeometry = mesh.current.geometry
    const positions = activeGeometry.attributes.position
    const colors = activeGeometry.attributes.color
    const fromPositions = positions.array.slice()
    const fromColors = colors.array.slice()
    const toPositions = positions.array.slice()
    const toColors = colors.array.slice()
    const palette = elevationColors()
    const color = new THREE.Color()
    for (let index = 0; index < positions.count; index += 1) {
      const value = sampleProceduralMap(positions.getX(index), positions.getZ(index), settings)
      toPositions[index * 3 + 1] = value * settings.amplitude
      heightColor(value, color, palette)
      color.toArray(toColors, index * 3)
    }
    const shouldMorph = previousRevision.current !== compareRevision && !matchMedia('(prefers-reduced-motion: reduce)').matches
    previousRevision.current = compareRevision
    if (shouldMorph) {
      transition.current = { fromPositions, fromColors, toPositions, toColors, elapsed: 0, duration: parseFloat(readToken('--duration-compare')) / 1000 }
    } else {
      transition.current = null
      positions.array.set(toPositions)
      colors.array.set(toColors)
      positions.needsUpdate = true
      colors.needsUpdate = true
      activeGeometry.computeVertexNormals()
      activeGeometry.computeBoundingSphere()
    }
  }, [geometry, settings, compareRevision, overrideRevision])

  useFrame((_, delta) => {
    const morph = transition.current
    if (!morph) return
    morph.elapsed += delta
    const progress = Math.min(1, morph.elapsed / morph.duration)
    const amount = progress * progress * (3 - 2 * progress)
    const activeGeometry = mesh.current.geometry
    const positions = activeGeometry.attributes.position
    const colors = activeGeometry.attributes.color
    for (let index = 0; index < positions.array.length; index += 1) {
      positions.array[index] = THREE.MathUtils.lerp(morph.fromPositions[index], morph.toPositions[index], amount)
      colors.array[index] = THREE.MathUtils.lerp(morph.fromColors[index], morph.toColors[index], amount)
    }
    positions.needsUpdate = true
    colors.needsUpdate = true
    activeGeometry.computeVertexNormals()
    activeGeometry.computeBoundingSphere()
    if (progress === 1) transition.current = null
  })

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh ref={mesh} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial vertexColors wireframe={wireframe} roughness={0.78} metalness={0.03} side={THREE.DoubleSide} />
    </mesh>
  )
}
