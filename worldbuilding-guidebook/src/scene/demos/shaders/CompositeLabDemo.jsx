import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
import { useSceneStore } from '../../../store/sceneStore.js'
import { useCompositeLabBuildStore, useCompositeLabStore } from '../../../store/compositeLabStore.js'
import TerrainWorld from '../proceduralMaps/TerrainWorld.jsx'
import { buildMarchingMeshInCells, createSampler, sampleGradient, volumeCellRange } from '../voxels/marchingCubes.js'
import { COLOR_TOP_HEIGHT } from '../voxels/VoxelTerrainDemo.jsx'
import { sampleDensityGrid, VOXEL_WORLD_SIZE } from '../voxels/voxelMath.js'
import { createMatcapTexture } from './matcapTexture.js'
import { shaderColorFromHex } from './shaderColor.js'
import { getWaterTexture } from './waterMath.js'

function concatFloat32(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const merged = new Float32Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }
  return merged
}

// Marching cubes over a full 64-resolution volume is heavy enough to freeze
// the main thread for a visible moment (the Resolution slider used to queue
// one of these per drag tick, via a synchronous useMemo, which is what made
// the panel feel like it "caught up late"). Splitting the volume into Z
// bands and yielding to requestAnimationFrame between them keeps the tab
// responsive and gives the panel a real percentage to show, instead of a
// spinner with nothing behind it.
function buildTerrainMeshChunked(shape, resolution, onProgress, isCancelled) {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      if (isCancelled()) return resolve(null)
      const densities = sampleDensityGrid(shape, resolution)
      const valueAt = createSampler(densities, resolution)
      const gradientAt = (sampleX, sampleY, sampleZ) => sampleGradient(densities, resolution, sampleX, sampleY, sampleZ)
      const fullRange = volumeCellRange(resolution)
      const zStart = fullRange.min[2]
      const zEnd = fullRange.max[2]
      const totalZ = zEnd - zStart
      const bandCount = Math.max(4, Math.ceil(resolution / 4))
      const bandSize = Math.max(1, Math.ceil(totalZ / bandCount))
      const positionChunks = []
      const normalChunks = []
      let z = zStart

      onProgress(0)
      function step() {
        if (isCancelled()) return resolve(null)
        const bandEnd = Math.min(z + bandSize, zEnd)
        const cells = { min: [fullRange.min[0], fullRange.min[1], z], max: [fullRange.max[0], fullRange.max[1], bandEnd] }
        const chunk = buildMarchingMeshInCells({ resolution, cells, valueAt, gradientAt })
        positionChunks.push(chunk.positions)
        normalChunks.push(chunk.normals)
        z = bandEnd
        onProgress(Math.round(((z - zStart) / totalZ) * 100))
        if (z < zEnd) {
          requestAnimationFrame(step)
        } else {
          resolve({ positions: concatFloat32(positionChunks), normals: concatFloat32(normalChunks) })
        }
      }
      step()
    })
  })
}

// Every technique from Steps 01-08, layered instead of chosen one at a time.
// Height ramp is the base; everything else mixes on top of it in a fixed
// order, gated by its own enabled flag. Vertex displacement runs first, in
// the vertex stage, so every later read (height ratio, water lookup, view
// direction) already sees the moved surface.
const compositeVertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;

  uniform float uRippleEnabled;
  uniform float uRippleAmplitude;
  uniform float uRippleFrequency;
  uniform float uRippleSpeed;
  uniform float uTime;

  void main() {
    vec3 displaced = position;
    if (uRippleEnabled > 0.5) {
      float upness = smoothstep(0.2, 0.6, normal.y);
      float amplitude = uRippleAmplitude * upness;
      float wave = sin(length(position.xz) * uRippleFrequency - uTime * uRippleSpeed);
      displaced = position + normal * (amplitude * wave);
    }
    vWorldPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`

const compositeFragmentShader = `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;

  uniform vec3 uLowColor;
  uniform vec3 uMidColor;
  uniform vec3 uHighColor;
  uniform float uMidpoint;
  uniform float uMaxHeight;

  uniform float uSlopeEnabled;
  uniform float uSlopeThreshold;
  uniform float uSlopeWidth;
  uniform vec3 uRockColor;

  uniform float uSnowEnabled;
  uniform float uSnowLine;
  uniform vec3 uSnowColor;

  uniform float uWaterEnabled;
  uniform float uPuddleThreshold;
  uniform vec3 uWaterColor;
  uniform sampler2D uWaterTexture;

  uniform float uScanEnabled;
  uniform vec3 uProbePosition;
  uniform float uScanRadius;
  uniform vec3 uScanColor;

  uniform float uFresnelEnabled;
  uniform float uRimPower;
  uniform vec3 uRimColor;

  uniform float uMatcapEnabled;
  uniform float uMatcapStrength;
  uniform sampler2D uMatcapTexture;

  void main() {
    float heightRatio = clamp(vWorldPosition.y / uMaxHeight, 0.0, 1.0);
    vec3 color = heightRatio < uMidpoint
      ? mix(uLowColor, uMidColor, clamp(heightRatio / uMidpoint, 0.0, 1.0))
      : mix(uMidColor, uHighColor, clamp((heightRatio - uMidpoint) / (1.0 - uMidpoint), 0.0, 1.0));

    vec3 normal = normalize(vWorldNormal);

    if (uSlopeEnabled > 0.5) {
      float steepness = 1.0 - clamp(dot(normal, vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
      float rock = smoothstep(uSlopeThreshold, uSlopeThreshold + uSlopeWidth, steepness);
      color = mix(color, uRockColor, rock);
    }

    if (uSnowEnabled > 0.5) {
      float snow = smoothstep(uSnowLine, uSnowLine + 0.1, heightRatio);
      color = mix(color, uSnowColor, snow);
    }

    if (uWaterEnabled > 0.5) {
      // 6.0 here must match VOXEL_WORLD_SIZE in voxelMath.js.
      vec2 waterUv = vec2(vWorldPosition.x, vWorldPosition.z) / 6.0 + 0.5;
      float waterDepth = texture2D(uWaterTexture, waterUv).r;
      float puddle = smoothstep(uPuddleThreshold, uPuddleThreshold + 0.08, waterDepth);
      color = mix(color, uWaterColor, puddle);
    }

    if (uScanEnabled > 0.5) {
      float d = distance(vWorldPosition, uProbePosition);
      float nearProbe = 1.0 - smoothstep(uScanRadius, uScanRadius + 0.8, d);
      color = mix(color, uScanColor, nearProbe);
    }

    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    if (uFresnelEnabled > 0.5) {
      float facing = clamp(dot(normal, viewDirection), 0.0, 1.0);
      float rim = pow(1.0 - facing, uRimPower);
      color = mix(color, uRimColor, rim);
    }

    if (uMatcapEnabled > 0.5) {
      vec2 matcapUv = normalize(vViewNormal).xy * 0.5 + 0.5;
      vec3 matcapColor = texture2D(uMatcapTexture, matcapUv).rgb;
      color = mix(color, matcapColor, uMatcapStrength);
    }

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`

const PROBE_POSITION = new Vector3(0, 2, 0)

export default function CompositeLabDemo() {
  const wireframe = useSceneStore((state) => state.wireframe)
  const terrain = useCompositeLabStore((state) => state.terrain)
  const layers = useCompositeLabStore((state) => state.layers)
  const setBuildStatus = useCompositeLabBuildStore((state) => state.setStatus)

  // The old terrain keeps rendering while the new one builds in the
  // background, so changing Resolution never blanks the scene — it just
  // swaps in once buildTerrainMeshChunked resolves. buildTokenRef lets a
  // still-running build recognise it has been superseded and drop its result
  // instead of racing a build for a since-changed terrain.
  const [meshData, setMeshData] = useState(null)
  const buildTokenRef = useRef(0)

  useEffect(() => {
    const token = (buildTokenRef.current += 1)
    setBuildStatus({ isBuilding: true, progress: 0 })
    buildTerrainMeshChunked(
      terrain.shape,
      terrain.resolution,
      (progress) => { if (buildTokenRef.current === token) setBuildStatus({ isBuilding: true, progress }) },
      () => buildTokenRef.current !== token,
    ).then((mesh) => {
      if (!mesh || buildTokenRef.current !== token) return
      setMeshData(mesh)
      setBuildStatus({ isBuilding: false, progress: 100 })
    })
  }, [terrain.shape, terrain.resolution, setBuildStatus])

  const geometry = useMemo(() => {
    if (!meshData) return null
    const surface = new BufferGeometry()
    surface.setAttribute('position', new Float32BufferAttribute(meshData.positions, 3))
    surface.setAttribute('normal', new Float32BufferAttribute(meshData.normals, 3))
    return surface
  }, [meshData])
  useEffect(() => () => geometry?.dispose(), [geometry])

  const matcapTexture = useMemo(
    () => createMatcapTexture(layers.matcap.angle, [layers.matcap.highlightColor, layers.matcap.midColor, layers.matcap.shadowColor]),
    [layers.matcap.angle, layers.matcap.highlightColor, layers.matcap.midColor, layers.matcap.shadowColor],
  )
  useEffect(() => () => matcapTexture.dispose(), [matcapTexture])

  // Built once, for the material's initial mount only. react-three-fiber's
  // <shaderMaterial uniforms={...}> special-cases ShaderMaterial by copying
  // each named uniform's value into the material's own internal uniforms
  // object — but in testing that copy only ever ran on the very first
  // application, not on later re-renders with the same outer object
  // reference, so mutating this object after mount never reached the GPU
  // (confirmed by screenshotting Step 04's Rock threshold slider at two
  // values and finding the canvas pixels identical, before the same fix was
  // applied there). Every value that can change after mount is instead
  // written directly into the live material's uniforms through a ref, in the
  // effect below. .oxlintrc.json turns off react/refs for this whole folder
  // for the mutation this still requires.
  const uniformsRef = useRef(null)
  if (uniformsRef.current === null) {
    uniformsRef.current = {
      uLowColor: { value: shaderColorFromHex(layers.height.lowColor) },
      uMidColor: { value: shaderColorFromHex(layers.height.midColor) },
      uHighColor: { value: shaderColorFromHex(layers.height.highColor) },
      uMidpoint: { value: layers.height.midpoint },
      uMaxHeight: { value: COLOR_TOP_HEIGHT },

      uSlopeEnabled: { value: layers.slope.enabled ? 1 : 0 },
      uSlopeThreshold: { value: layers.slope.threshold },
      uSlopeWidth: { value: layers.slope.width },
      uRockColor: { value: shaderColorFromHex(layers.slope.color) },

      uSnowEnabled: { value: layers.snow.enabled ? 1 : 0 },
      uSnowLine: { value: layers.snow.line },
      uSnowColor: { value: shaderColorFromHex(layers.snow.color) },

      uWaterEnabled: { value: layers.water.enabled ? 1 : 0 },
      uPuddleThreshold: { value: layers.water.threshold },
      uWaterColor: { value: shaderColorFromHex(layers.water.color) },
      uWaterTexture: { value: getWaterTexture() },

      uScanEnabled: { value: layers.scan.enabled ? 1 : 0 },
      uProbePosition: { value: PROBE_POSITION },
      uScanRadius: { value: layers.scan.radius },
      uScanColor: { value: shaderColorFromHex(layers.scan.color) },

      uFresnelEnabled: { value: layers.fresnel.enabled ? 1 : 0 },
      uRimPower: { value: layers.fresnel.power },
      uRimColor: { value: shaderColorFromHex(layers.fresnel.color) },

      uMatcapEnabled: { value: layers.matcap.enabled ? 1 : 0 },
      uMatcapStrength: { value: layers.matcap.strength },
      uMatcapTexture: { value: matcapTexture },

      uRippleEnabled: { value: layers.ripple.enabled ? 1 : 0 },
      uRippleAmplitude: { value: layers.ripple.amplitude },
      uRippleFrequency: { value: layers.ripple.frequency },
      uRippleSpeed: { value: layers.ripple.speed },
      uTime: { value: 0 },
    }
  }

  const materialRef = useRef(null)
  useEffect(() => {
    const material = materialRef.current
    if (!material) return
    const mu = material.uniforms
    mu.uLowColor.value = shaderColorFromHex(layers.height.lowColor)
    mu.uMidColor.value = shaderColorFromHex(layers.height.midColor)
    mu.uHighColor.value = shaderColorFromHex(layers.height.highColor)
    mu.uMidpoint.value = layers.height.midpoint

    mu.uSlopeEnabled.value = layers.slope.enabled ? 1 : 0
    mu.uSlopeThreshold.value = layers.slope.threshold
    mu.uSlopeWidth.value = layers.slope.width
    mu.uRockColor.value = shaderColorFromHex(layers.slope.color)

    mu.uSnowEnabled.value = layers.snow.enabled ? 1 : 0
    mu.uSnowLine.value = layers.snow.line
    mu.uSnowColor.value = shaderColorFromHex(layers.snow.color)

    mu.uWaterEnabled.value = layers.water.enabled ? 1 : 0
    mu.uPuddleThreshold.value = layers.water.threshold
    mu.uWaterColor.value = shaderColorFromHex(layers.water.color)

    mu.uScanEnabled.value = layers.scan.enabled ? 1 : 0
    mu.uScanRadius.value = layers.scan.radius
    mu.uScanColor.value = shaderColorFromHex(layers.scan.color)

    mu.uFresnelEnabled.value = layers.fresnel.enabled ? 1 : 0
    mu.uRimPower.value = layers.fresnel.power
    mu.uRimColor.value = shaderColorFromHex(layers.fresnel.color)

    mu.uMatcapEnabled.value = layers.matcap.enabled ? 1 : 0
    mu.uMatcapStrength.value = layers.matcap.strength
    mu.uMatcapTexture.value = matcapTexture

    mu.uRippleEnabled.value = layers.ripple.enabled ? 1 : 0
    mu.uRippleAmplitude.value = layers.ripple.amplitude
    mu.uRippleFrequency.value = layers.ripple.frequency
    mu.uRippleSpeed.value = layers.ripple.speed
  }, [layers, matcapTexture])

  // Per-frame, not per-render, so it has to reach the live material through
  // this same ref rather than wait for the effect above, which only runs
  // after a React commit.
  useFrame((state) => {
    if (layers.ripple.enabled && materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <TerrainWorld worldSize={VOXEL_WORLD_SIZE}>
      {geometry && (
        <mesh geometry={geometry} castShadow receiveShadow>
          <shaderMaterial
            ref={materialRef}
            uniforms={uniformsRef.current}
            vertexShader={compositeVertexShader}
            fragmentShader={compositeFragmentShader}
            wireframe={wireframe}
          />
        </mesh>
      )}
      {layers.scan.enabled && layers.scan.showMarker && (
        <mesh position={PROBE_POSITION}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshBasicMaterial color={layers.scan.color} />
        </mesh>
      )}
    </TerrainWorld>
  )
}
