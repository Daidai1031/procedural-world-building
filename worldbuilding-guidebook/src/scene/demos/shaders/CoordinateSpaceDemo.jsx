import { useEffect, useMemo, useRef } from 'react'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { useSceneStore } from '../../../store/sceneStore.js'
import { readToken } from '../../../styles/readToken.js'
import TerrainWorld from '../proceduralMaps/TerrainWorld.jsx'
import { buildMarchingMesh } from '../voxels/marchingCubes.js'
import { shaderColor } from './shaderColor.js'
import { sampleDensityGrid, VOXEL_WORLD_SIZE } from '../voxels/voxelMath.js'

// Local space: the stripe reads each chunk's own, untransformed vertex
// position, so it restarts at 0 wherever a chunk happens to sit.
export const localStripeVertexShader = `
  varying float vStripeCoord;

  // #region localStripeVertexShader
  void main() {
    vStripeCoord = position.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  // #endregion localStripeVertexShader
`

// World space: the stripe reads the position after modelMatrix, which
// carries each chunk's own placement, so the coordinate keeps counting
// across every chunk instead of resetting.
export const worldStripeVertexShader = `
  varying float vStripeCoord;

  // #region worldStripeVertexShader
  void main() {
    vStripeCoord = (modelMatrix * vec4(position, 1.0)).x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  // #endregion worldStripeVertexShader
`

// Both vertex shaders feed the same rule: a hard two-colour stripe, so the
// only variable being studied is which position reaches this varying.
export const stripeFragmentShader = `
  varying float vStripeCoord;
  uniform vec3 uLowColor;
  uniform vec3 uHighColor;
  uniform float uStripeFrequency;

  void main() {
    float stripe = step(0.5, fract(vStripeCoord * uStripeFrequency));
    gl_FragColor = vec4(mix(uLowColor, uHighColor, stripe), 1.0);
  }
`

const CHUNK_RESOLUTION = 16
// Just above the tallest ridge the "ground" shape ever reaches, so the dots
// float clearly over the terrain instead of near the top of the frame.
const MARKER_HEIGHT = 4.2
const MARKER_RADIUS = 0.22

// A floating dot makes an otherwise invisible number (where is "zero"?)
// something the learner can actually look at. One dot per chunk marks that
// chunk's own local origin; the single world-origin dot sits exactly on the
// seam, because that is where these two chunks happen to meet.
function OriginMarker({ x, colorToken }) {
  const color = useMemo(() => readToken(colorToken), [colorToken])
  return (
    <mesh position={[x, MARKER_HEIGHT, 0]}>
      <sphereGeometry args={[MARKER_RADIUS, 16, 16]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

function StripeChunk({ offsetX, space, vertexShader, uniforms, wireframe }) {
  const geometry = useMemo(() => {
    const mesh = buildMarchingMesh(sampleDensityGrid('ground', CHUNK_RESOLUTION), CHUNK_RESOLUTION)
    const surface = new BufferGeometry()
    surface.setAttribute('position', new Float32BufferAttribute(mesh.positions, 3))
    surface.setAttribute('normal', new Float32BufferAttribute(mesh.normals, 3))
    return surface
  }, [])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh geometry={geometry} position={[offsetX, 0, 0]} castShadow receiveShadow>
      {/* Three.js compiles a program once and caches it, so the vertex
          shader has to remount (a new key) rather than update in place, or
          switching space would silently keep running the old program. */}
      <shaderMaterial
        key={space}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={stripeFragmentShader}
        wireframe={wireframe}
      />
    </mesh>
  )
}

// Two "ground" chunks placed edge to edge, so the same stripe rule either
// lines up across the seam (world space) or does not (local space). Held in
// a ref, not useMemo, and read during render on purpose: the same reasoning
// as ShaderLabDemo's heightSlope uniforms. .oxlintrc.json turns off
// react/refs for this whole folder for that reason.
export default function CoordinateSpaceDemo() {
  const params = useSceneStore((state) => state.params)
  const wireframe = useSceneStore((state) => state.wireframe)
  const space = params.coordinateSpace === 'world' ? 'world' : 'local'
  const vertexShader = space === 'world' ? worldStripeVertexShader : localStripeVertexShader

  const uniforms = useRef(null)
  if (uniforms.current === null) {
    uniforms.current = {
      uLowColor: { value: shaderColor('--meadow-deep') },
      uHighColor: { value: shaderColor('--summit') },
      uStripeFrequency: { value: params.coordinateStripeFrequency },
    }
  }
  uniforms.current.uStripeFrequency.value = params.coordinateStripeFrequency

  return (
    <TerrainWorld worldSize={VOXEL_WORLD_SIZE * 2}>
      <StripeChunk
        offsetX={-VOXEL_WORLD_SIZE / 2}
        space={space}
        vertexShader={vertexShader}
        uniforms={uniforms.current}
        wireframe={wireframe}
      />
      <StripeChunk
        offsetX={VOXEL_WORLD_SIZE / 2}
        space={space}
        vertexShader={vertexShader}
        uniforms={uniforms.current}
        wireframe={wireframe}
      />
      <OriginMarker x={-VOXEL_WORLD_SIZE / 2} colorToken="--ink-dim" />
      <OriginMarker x={VOXEL_WORLD_SIZE / 2} colorToken="--ink-dim" />
      <OriginMarker x={0} colorToken="--clay" />
    </TerrainWorld>
  )
}
