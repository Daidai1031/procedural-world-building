import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Color, Float32BufferAttribute, Vector3 } from 'three'
import { useSceneStore } from '../../../store/sceneStore.js'
import { readToken } from '../../../styles/readToken.js'
import TerrainWorld from '../proceduralMaps/TerrainWorld.jsx'
import { elevationColors } from '../proceduralMaps/worldPalette.js'
import { buildMarchingMesh } from '../voxels/marchingCubes.js'
import { voxelSettingsFromParams } from '../voxels/params.js'
import { COLOR_TOP_HEIGHT } from '../voxels/VoxelTerrainDemo.jsx'
import { sampleDensityGrid, VOXEL_WORLD_SIZE } from '../voxels/voxelMath.js'
import { createMatcapTexture } from './matcapTexture.js'
import { shaderColor, toShaderColors } from './shaderColor.js'
import { getWaterTexture } from './waterMath.js'

// Study 1: the vertex stage only projects the existing mesh. No terrain data
// changes when the material switches.
export const flatVertexShader = `
  // #region flatVertexShader
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  // #endregion flatVertexShader
`

// Every fragment receives the same uniform colour. Unlike the baseline, this
// deliberately does not evaluate scene lighting.
export const flatFragmentShader = `
  // #region flatFragmentShader
  uniform vec3 uColor;
  void main() {
    gl_FragColor = vec4(uColor, 1.0);
  }
  // #endregion flatFragmentShader
`

// Study 2: reads world position per fragment, so the colour band a learner
// sees is computed fresh at every point instead of fixed once per vertex.
export const heightVertexShader = `
  varying vec3 vWorldPosition;

  void main() {
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Two separate ideas share one fragment shader: a continuous low/mid/high
// blend (mix), and a soft threshold band on top (smoothstep) for snow.
export const heightFragmentShader = `
  varying vec3 vWorldPosition;

  uniform vec3 uLowColor;
  uniform vec3 uMidColor;
  uniform vec3 uHighColor;
  uniform vec3 uSnowColor;
  uniform float uMaxHeight;
  uniform float uMidpoint;
  uniform float uSnowLine;

  void main() {
    // #region heightRampStudy
    float heightRatio = clamp(vWorldPosition.y / uMaxHeight, 0.0, 1.0);
    vec3 color = heightRatio < uMidpoint
      ? mix(uLowColor, uMidColor, clamp(heightRatio / uMidpoint, 0.0, 1.0))
      : mix(uMidColor, uHighColor, clamp((heightRatio - uMidpoint) / (1.0 - uMidpoint), 0.0, 1.0));
    // #endregion heightRampStudy

    // #region snowBandStudy
    float snow = smoothstep(uSnowLine, uSnowLine + 0.1, heightRatio);
    color = mix(color, uSnowColor, snow);
    // #endregion snowBandStudy

    gl_FragColor = vec4(color, 1.0);
  }
`

// Study 3: reads world position and world normal per fragment, so the height
// band and the slope mask stay continuous across the whole mesh instead of
// being fixed per vertex.
export const heightSlopeVertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// The height ramp mirrors worldPalette.heightColor (two mixes meeting at
// uMidpoint) so this GPU study and the CPU-coloured voxel meshes read the same
// altitude the same way. The slope mask then darkens steep faces toward rock,
// independently of altitude.
export const heightSlopeFragmentShader = `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  uniform vec3 uLowColor;
  uniform vec3 uMidColor;
  uniform vec3 uHighColor;
  uniform vec3 uRockColor;
  uniform float uMaxHeight;
  uniform float uMidpoint;
  uniform float uSlopeThreshold;
  uniform float uSlopeWidth;

  void main() {
    // #region heightSlopeStudy
    float heightRatio = clamp(vWorldPosition.y / uMaxHeight, 0.0, 1.0);
    vec3 elevation = heightRatio < uMidpoint
      ? mix(uLowColor, uMidColor, clamp(heightRatio / uMidpoint, 0.0, 1.0))
      : mix(uMidColor, uHighColor, clamp((heightRatio - uMidpoint) / (1.0 - uMidpoint), 0.0, 1.0));

    // #region slopeSteepnessStudy
    float steepness = 1.0 - clamp(dot(normalize(vWorldNormal), vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
    // #endregion slopeSteepnessStudy
    // #region slopeRockStudy
    float rock = smoothstep(uSlopeThreshold, uSlopeThreshold + uSlopeWidth, steepness);
    vec3 color = mix(elevation, uRockColor, rock);
    // #endregion slopeRockStudy
    // #endregion heightSlopeStudy
    gl_FragColor = vec4(color, 1.0);
  }
`

// Study 4: highlights a fixed world-space point regardless of camera. The
// probe marker mesh (drawn separately, below) shows the learner where
// uProbePosition actually is, since a uniform by itself is invisible.
export const distanceVertexShader = `
  varying vec3 vWorldPosition;

  void main() {
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const distanceFragmentShader = `
  varying vec3 vWorldPosition;

  uniform vec3 uBaseColor;
  uniform vec3 uSignalColor;
  uniform vec3 uProbePosition;
  uniform float uScanRadius;
  uniform float uScanWidth;

  void main() {
    // #region distanceStudy
    float d = distance(vWorldPosition, uProbePosition);
    float nearProbe = 1.0 - smoothstep(uScanRadius, uScanRadius + uScanWidth, d);
    vec3 color = mix(uBaseColor, uSignalColor, nearProbe);
    // #endregion distanceStudy
    gl_FragColor = vec4(color, 1.0);
  }
`

// Study 5: highlights whichever part of the surface faces away from the
// camera, so unlike the distance study it moves as the camera orbits instead
// of staying anchored to a world position. cameraPosition is a uniform
// three.js supplies automatically to every ShaderMaterial.
export const fresnelVertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const fresnelFragmentShader = `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  uniform vec3 uBaseColor;
  uniform vec3 uRimColor;
  uniform float uRimPower;

  void main() {
    // #region fresnelStudy
    float facing = clamp(dot(normalize(vWorldNormal), normalize(cameraPosition - vWorldPosition)), 0.0, 1.0);
    float rim = pow(1.0 - facing, uRimPower);
    vec3 color = mix(uBaseColor, uRimColor, rim);
    // #endregion fresnelStudy
    gl_FragColor = vec4(color, 1.0);
  }
`

// Where the distance study's probe sits in the world, and how far its scan
// glow reaches past the Scan radius control before fully fading.
const PROBE_POSITION = new Vector3(0, 2, 0)
const SCAN_TRANSITION_WIDTH = 0.8

// Study 6: reads a view-space normal, the same "moves with the camera" space
// Study 5 used for cameraPosition, then looks up a colour from a small
// picture — a captured material look — instead of computing any light.
export const matcapVertexShader = `
  varying vec3 vViewNormal;

  // #region matcapNormalStudy
  void main() {
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  // #endregion matcapNormalStudy
`

export const matcapFragmentShader = `
  varying vec3 vViewNormal;
  uniform sampler2D uMatcap;

  // #region matcapUvStudy
  void main() {
    vec2 matcapUv = normalize(vViewNormal).xy * 0.5 + 0.5;
    vec3 color = texture2D(uMatcap, matcapUv).rgb;
    gl_FragColor = vec4(color, 1.0);
  }
  // #endregion matcapUvStudy
`

// Study 7: the height ramp from Study 2, plus a second lookup — this time
// into a CPU-computed data texture instead of a photo — for where standing
// water would actually sit.
export const waterVertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const waterFragmentShader = `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  uniform vec3 uLowColor;
  uniform vec3 uMidColor;
  uniform vec3 uHighColor;
  uniform vec3 uWaterColor;
  uniform sampler2D uWaterTexture;
  uniform float uMaxHeight;
  uniform float uMidpoint;
  uniform float uPuddleThreshold;

  void main() {
    float heightRatio = clamp(vWorldPosition.y / uMaxHeight, 0.0, 1.0);
    vec3 color = heightRatio < uMidpoint
      ? mix(uLowColor, uMidColor, clamp(heightRatio / uMidpoint, 0.0, 1.0))
      : mix(uMidColor, uHighColor, clamp((heightRatio - uMidpoint) / (1.0 - uMidpoint), 0.0, 1.0));

    // #region waterUvStudy
    // 6.0 here must match VOXEL_WORLD_SIZE in voxelMath.js.
    vec2 waterUv = vec2(vWorldPosition.x, vWorldPosition.z) / 6.0 + 0.5;
    // #endregion waterUvStudy
    // #region waterMaskStudy
    float waterDepth = texture2D(uWaterTexture, waterUv).r;
    float puddle = smoothstep(uPuddleThreshold, uPuddleThreshold + 0.08, waterDepth);
    color = mix(color, uWaterColor, puddle);
    // #endregion waterMaskStudy

    // Finishing touch, past what the mask study above teaches: a
    // depth-based tint so a puddle reads as a body of liquid rather than a
    // flat fill — darker where it is deep, lighter toward the shore.
    vec3 shallowTint = mix(color, uWaterColor, 0.5);
    vec3 deepTint = mix(uWaterColor, vec3(0.0), 0.15);
    color = mix(color, mix(shallowTint, deepTint, clamp(waterDepth * 1.2, 0.0, 1.0)), puddle);

    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float grazing = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.0);
    color += grazing * 0.25 * puddle;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`

// Study 8: the vertex stage this time moves the mesh itself, instead of only
// projecting it. varying vWorldPosition is read from the displaced position,
// not the original one, so the height ramp below responds to where a vertex
// actually ends up.
export const displacementVertexShader = `
  varying vec3 vWorldPosition;

  uniform float uAmplitude;
  uniform float uFrequency;
  uniform float uSpeed;
  uniform float uTime;

  void main() {
    // Ground's own walls are near-vertical; rippling them along their own
    // sideways-facing normal would pull neighbouring wall vertices apart and
    // tear the surface open. Fading the amplitude out below this keeps the
    // ripple to the roughly upward-facing ground it was meant for.
    float amplitude = uAmplitude * smoothstep(0.2, 0.6, normal.y);
    // #region rippleDisplacementStudy
    float wave = sin(length(position.xz) * uFrequency - uTime * uSpeed);
    vec3 displaced = position + normal * (amplitude * wave);
    // #endregion rippleDisplacementStudy
    // #region worldPositionFromDisplacedStudy
    vWorldPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    // #endregion worldPositionFromDisplacedStudy
  }
`

export const displacementFragmentShader = `
  varying vec3 vWorldPosition;

  uniform vec3 uLowColor;
  uniform vec3 uMidColor;
  uniform vec3 uHighColor;
  uniform float uMaxHeight;
  uniform float uMidpoint;

  void main() {
    float heightRatio = clamp(vWorldPosition.y / uMaxHeight, 0.0, 1.0);
    vec3 color = heightRatio < uMidpoint
      ? mix(uLowColor, uMidColor, clamp(heightRatio / uMidpoint, 0.0, 1.0))
      : mix(uMidColor, uHighColor, clamp((heightRatio - uMidpoint) / (1.0 - uMidpoint), 0.0, 1.0));
    gl_FragColor = vec4(color, 1.0);
  }
`

// The soft width of the rock transition is fixed; only where it starts
// (uSlopeThreshold) is exposed as a control.
// Narrower than before to match the Rock threshold control's measured
// range (0.05-0.4): a 0.18-wide band left almost every threshold value
// blending toward, but never quite reaching, full rock.
const SLOPE_TRANSITION_WIDTH = 0.08
const HEIGHT_RAMP_MIDPOINT = 0.52

// Fixed, not exposed as controls: only Ripple amplitude is a learner-facing
// variable for this study. Wavelength (2*pi / frequency) is about 1.26 world
// units — at the default 16-resolution mesh (0.375 world units per cell)
// that is about 3.4 samples per wave, enough to look smooth; at the lowest
// resolution, 8 (0.75 per cell), it drops to about 1.7, below the 2 samples
// a wave needs to be represented at all, so the ripple visibly breaks up
// instead of just looking coarser — that collapse is the point of Step 08.
const RIPPLE_FREQUENCY = 5
const RIPPLE_SPEED = 1.6

export default function ShaderLabDemo() {
  const params = useSceneStore((state) => state.params)
  const wireframe = useSceneStore((state) => state.wireframe)
  const grayscale = useSceneStore((state) => state.grayscale)
  const { shape, resolution } = voxelSettingsFromParams(params)
  const geometry = useMemo(() => {
    const mesh = buildMarchingMesh(sampleDensityGrid(shape, resolution), resolution)
    const surface = new BufferGeometry()
    surface.setAttribute('position', new Float32BufferAttribute(mesh.positions, 3))
    surface.setAttribute('normal', new Float32BufferAttribute(mesh.normals, 3))
    return surface
  }, [shape, resolution])
  const flatUniforms = useMemo(() => ({ uColor: { value: new Color('#84a493').convertLinearToSRGB() } }), [])

  // Coloured synchronously at creation, not left white for an effect to fix
  // later: when this mode is a step's auto-applied initial compare side, the
  // very first WebGL frame is drawn before any effect runs, and a mesh that
  // starts out fully white on a white page reads as nothing rendered at all.
  const heightUniforms = useRef(null)
  if (heightUniforms.current === null) {
    const [lowColor, midColor, highColor] = toShaderColors(elevationColors(grayscale))
    heightUniforms.current = {
      uLowColor: { value: lowColor },
      uMidColor: { value: midColor },
      uHighColor: { value: highColor },
      uSnowColor: { value: shaderColor('--paper') },
      uMaxHeight: { value: COLOR_TOP_HEIGHT },
      uMidpoint: { value: HEIGHT_RAMP_MIDPOINT },
      uSnowLine: { value: params.shaderSnowLine },
    }
  }

  // <shaderMaterial uniforms={...}> only copies these values into the
  // material's own uniforms object when React re-renders and re-applies that
  // prop; react-three-fiber does not appear to re-run that copy on later
  // renders when the outer object passed as `uniforms` keeps the same
  // reference (as a ref-held object does), so mutating heightUniforms.current
  // above never reached the compiled program in testing — confirmed by
  // screenshotting the Snow line slider at two values and finding the canvas
  // pixels byte-identical. Writing straight into the live material's own
  // uniforms through a ref, instead, does reach the GPU; see the same fix on
  // Step 08's vertex displacement study and CompositeLabDemo.jsx.
  const heightMaterialRef = useRef(null)
  useEffect(() => {
    const material = heightMaterialRef.current
    if (!material) return
    const [lowColor, midColor, highColor] = toShaderColors(elevationColors(grayscale))
    material.uniforms.uLowColor.value = lowColor
    material.uniforms.uMidColor.value = midColor
    material.uniforms.uHighColor.value = highColor
    material.uniforms.uSnowColor.value = shaderColor('--paper')
  }, [grayscale])
  useEffect(() => {
    const material = heightMaterialRef.current
    if (material) material.uniforms.uSnowLine.value = params.shaderSnowLine
  }, [params.shaderSnowLine])

  heightUniforms.current.uSnowLine.value = params.shaderSnowLine

  // Held in a ref, not useMemo, and read during render on purpose: a
  // ShaderMaterial's uniforms object is meant to be mutated in place and kept
  // as the same object across renders, so dragging the slider or toggling
  // grayscale never recompiles the material. .oxlintrc.json turns off
  // react/refs for this file for that reason.
  const heightSlopeUniforms = useRef(null)
  if (heightSlopeUniforms.current === null) {
    const [lowColor, midColor, highColor] = toShaderColors(elevationColors(grayscale))
    heightSlopeUniforms.current = {
      uLowColor: { value: lowColor },
      uMidColor: { value: midColor },
      uHighColor: { value: highColor },
      uRockColor: { value: shaderColor('--ink-dim') },
      uMaxHeight: { value: COLOR_TOP_HEIGHT },
      uMidpoint: { value: HEIGHT_RAMP_MIDPOINT },
      uSlopeThreshold: { value: params.shaderSlopeThreshold },
      uSlopeWidth: { value: SLOPE_TRANSITION_WIDTH },
    }
  }

  // Same fix as heightMaterialRef above: writes go to the live material
  // through a ref, not to this uniforms object, which react-three-fiber does
  // not appear to re-copy from on a later render.
  const heightSlopeMaterialRef = useRef(null)
  useEffect(() => {
    const material = heightSlopeMaterialRef.current
    if (!material) return
    const [lowColor, midColor, highColor] = toShaderColors(elevationColors(grayscale))
    material.uniforms.uLowColor.value = lowColor
    material.uniforms.uMidColor.value = midColor
    material.uniforms.uHighColor.value = highColor
    material.uniforms.uRockColor.value = shaderColor('--ink-dim')
  }, [grayscale])
  useEffect(() => {
    const material = heightSlopeMaterialRef.current
    if (material) material.uniforms.uSlopeThreshold.value = params.shaderSlopeThreshold
  }, [params.shaderSlopeThreshold])

  heightSlopeUniforms.current.uSlopeThreshold.value = params.shaderSlopeThreshold

  // Recreated (not mutated) whenever Scan radius changes, and keyed by that
  // same value below: mutating uScanRadius.value in place did not reach the
  // compiled program reliably for this material, so a fresh uniforms object
  // and a fresh material on every change sidesteps that instead of relying on
  // it.
  const distanceUniforms = useMemo(() => ({
    uBaseColor: { value: shaderColor('--meadow-deep') },
    uSignalColor: { value: shaderColor('--clay') },
    uProbePosition: { value: PROBE_POSITION },
    uScanRadius: { value: params.shaderScanRadius },
    uScanWidth: { value: SCAN_TRANSITION_WIDTH },
  }), [params.shaderScanRadius])

  // Same reasoning as distanceUniforms above, keyed on Rim power instead.
  const fresnelUniforms = useMemo(() => ({
    uBaseColor: { value: shaderColor('--meadow-deep') },
    uRimColor: { value: shaderColor('--summit') },
    uRimPower: { value: params.shaderRimPower },
  }), [params.shaderRimPower])

  // A fresh canvas (and texture) redrawn whenever Highlight angle changes;
  // disposed when replaced or on unmount, same as the dot texture in
  // RainFall.jsx.
  const matcapTexture = useMemo(() => createMatcapTexture(params.shaderMatcapAngle), [params.shaderMatcapAngle])
  useEffect(() => () => matcapTexture.dispose(), [matcapTexture])
  const matcapUniforms = useMemo(() => ({ uMatcap: { value: matcapTexture } }), [matcapTexture])

  // getWaterTexture() is a pure function of groundHeight, cached at module
  // scope — it never needs to change with voxel shape, resolution, or any
  // control here, unlike matcapTexture above. Same recreate-on-change and
  // key-remount reasoning as distanceUniforms for uPuddleThreshold, the one
  // value here that does change.
  const waterUniforms = useMemo(() => {
    const [lowColor, midColor, highColor] = toShaderColors(elevationColors(grayscale))
    return {
      uLowColor: { value: lowColor },
      uMidColor: { value: midColor },
      uHighColor: { value: highColor },
      uWaterColor: { value: shaderColor('--erosion-water') },
      uWaterTexture: { value: getWaterTexture() },
      uMaxHeight: { value: COLOR_TOP_HEIGHT },
      uMidpoint: { value: HEIGHT_RAMP_MIDPOINT },
      uPuddleThreshold: { value: params.shaderPuddleThreshold },
    }
  }, [grayscale, params.shaderPuddleThreshold])

  // Same recreate-on-change and key-remount reasoning as distanceUniforms,
  // keyed on Ripple amplitude — the one control here.
  const displacementUniforms = useMemo(() => {
    const [lowColor, midColor, highColor] = toShaderColors(elevationColors(grayscale))
    return {
      uLowColor: { value: lowColor },
      uMidColor: { value: midColor },
      uHighColor: { value: highColor },
      uMaxHeight: { value: COLOR_TOP_HEIGHT },
      uMidpoint: { value: HEIGHT_RAMP_MIDPOINT },
      uAmplitude: { value: params.shaderRippleAmplitude },
      uFrequency: { value: RIPPLE_FREQUENCY },
      uSpeed: { value: RIPPLE_SPEED },
      uTime: { value: 0 },
    }
  }, [grayscale, params.shaderRippleAmplitude])

  // R3F's <shaderMaterial uniforms={...}> only copies these values into the
  // material's own uniforms object when React re-renders and re-applies that
  // prop — a per-frame mutation of displacementUniforms.uTime.value itself
  // never reaches the compiled program, since nothing re-renders every
  // frame. Mutating the live material's uniforms through a ref, instead of
  // the plain object handed to the uniforms prop, is what actually reaches
  // the GPU every frame; .oxlintrc.json turns off react/immutability for
  // this file for that reason, same as react/refs above.
  const displacementMaterialRef = useRef(null)
  useFrame((state) => {
    if (params.shaderMode === 'displacement' && displacementMaterialRef.current) {
      displacementMaterialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <TerrainWorld worldSize={VOXEL_WORLD_SIZE}>
      <mesh geometry={geometry} castShadow receiveShadow>
        {params.shaderMode === 'flat' ? (
          <shaderMaterial
            key="flat"
            uniforms={flatUniforms}
            vertexShader={flatVertexShader}
            fragmentShader={flatFragmentShader}
            wireframe={wireframe}
          />
        ) : params.shaderMode === 'height' ? (
          <shaderMaterial
            key="height"
            ref={heightMaterialRef}
            uniforms={heightUniforms.current}
            vertexShader={heightVertexShader}
            fragmentShader={heightFragmentShader}
            wireframe={wireframe}
          />
        ) : params.shaderMode === 'heightSlope' ? (
          <shaderMaterial
            key="heightSlope"
            ref={heightSlopeMaterialRef}
            uniforms={heightSlopeUniforms.current}
            vertexShader={heightSlopeVertexShader}
            fragmentShader={heightSlopeFragmentShader}
            wireframe={wireframe}
          />
        ) : params.shaderMode === 'distance' ? (
          <shaderMaterial
            key={`distance-${params.shaderScanRadius}`}
            uniforms={distanceUniforms}
            vertexShader={distanceVertexShader}
            fragmentShader={distanceFragmentShader}
            wireframe={wireframe}
          />
        ) : params.shaderMode === 'fresnel' ? (
          <shaderMaterial
            key={`fresnel-${params.shaderRimPower}`}
            uniforms={fresnelUniforms}
            vertexShader={fresnelVertexShader}
            fragmentShader={fresnelFragmentShader}
            wireframe={wireframe}
          />
        ) : params.shaderMode === 'matcap' ? (
          <shaderMaterial
            key={`matcap-${params.shaderMatcapAngle}`}
            uniforms={matcapUniforms}
            vertexShader={matcapVertexShader}
            fragmentShader={matcapFragmentShader}
            wireframe={wireframe}
          />
        ) : params.shaderMode === 'water' ? (
          <shaderMaterial
            key={`water-${params.shaderPuddleThreshold}`}
            uniforms={waterUniforms}
            vertexShader={waterVertexShader}
            fragmentShader={waterFragmentShader}
            wireframe={wireframe}
          />
        ) : params.shaderMode === 'displacement' ? (
          <shaderMaterial
            key={`displacement-${params.shaderRippleAmplitude}`}
            ref={displacementMaterialRef}
            uniforms={displacementUniforms}
            vertexShader={displacementVertexShader}
            fragmentShader={displacementFragmentShader}
            wireframe={wireframe}
          />
        ) : (
          <meshStandardMaterial key="standard" color="#84a493" roughness={0.9} wireframe={wireframe} />
        )}
      </mesh>
      {params.shaderMode === 'distance' && (
        <mesh position={PROBE_POSITION}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshBasicMaterial color={readToken('--clay')} />
        </mesh>
      )}
    </TerrainWorld>
  )
}
