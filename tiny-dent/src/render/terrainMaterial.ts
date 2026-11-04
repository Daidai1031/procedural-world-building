import { Color, MeshPhysicalMaterial, MeshStandardMaterial, ShaderChunk, Vector3, Vector4, type Texture } from 'three'
import { palette } from '../config/palette'
import { resourceColors } from '../config/resourceColors'
import { tuning } from '../config/tuning'
import { surfaces, type SurfaceKind, type SurfaceProfile } from '../content/surfaces'
import type { ResourceCluster } from '../world/resourceClusters'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'

// A collected resource stops glowing: its `w` flag scales the glow to zero without recompiling the shader.
export function setResourceGlowActive(material: MeshStandardMaterial, active: boolean[]) {
  const resources = material.userData.resources as Vector4[]
  resources.forEach((resource, index) => { resource.w = active[index] ? 1 : 0 })
}

// D-027 work area D: inside a robot's spherical work area the contours double in density and darken, and
// the sphere's intersection with the ground is drawn as one contour-weight line. One area shows at a time.
const workArea = { center: new Vector3(), radius: { value: 0 }, enabled: { value: 0 } }
export function showWorkArea(area: { center: [number, number, number]; radius: number } | null) {
  if (area) workArea.center.set(...area.center)
  workArea.radius.value = area?.radius ?? 0
  workArea.enabled.value = area ? 1 : 0
}

// Only the active planet moves: fur wind and jelly ripples read these. A source is x, y, z and its disturbance level.
const motion = { time: { value: 0 }, ripples: { value: Array.from({ length: tuning.residents.disturbance.maxSources }, () => new Vector4()) } }
export function setTerrainMotion(time: number, sources: readonly { position: readonly number[]; level: number }[]) {
  motion.time.value = time
  motion.ripples.value.forEach((ripple, index) => {
    const source = sources[index]
    if (source) ripple.set(source.position[0], source.position[1], source.position[2], source.level)
    else ripple.w = 0
  })
}

// SUR-14: how many hair shells this machine can afford. It stays lowered across planets.
export const furShells = { value: tuning.surface.fur.shells as number }

interface Tone { low: string; high: string; steep: string; contour: string; scar: string }

// D-060: what one material adds to the shared terrain shader. `declare` is fragment scope. `shade` runs after the
// height, slope and contour values exist and may change `surface` and `ink`. `finish` runs after the work area and sets
// `terrainCut` (toward uCutRoughness), `terrainSolid` (less transmission) and `terrainGlow` (added light).
interface Recipe { tone: Tone; declare?: string; shade: string; finish?: string; cutRoughness?: number; uniforms?: Record<string, { value: unknown }> }

const rockTone: Tone = { ...palette.terrain, scar: palette.surface.rock.scar }

const recipes: Record<SurfaceKind, Recipe> = {
  rock: { tone: rockTone, shade: 'surface = mix(surface, uScar, scar * 0.4);' },
  // Contours and scratches change how light scatters, not the color: grooves in polished metal.
  metal: {
    tone: palette.surface.metal, cutRoughness: 0.72,
    shade: `
      // One random brightness per thin line, not a sine: at orbit distance that reads as texture instead of a moire.
      float brushLine = floor(dot(vTerrainPosition, vec3(0.31, 0.87, 0.38)) * 140.0 + 2.0 * sin(dot(vTerrainPosition, vec3(0.9, -0.2, 0.4)) * 7.0));
      float scratches = scar * (0.45 + 0.55 * fract(sin(brushLine * 12.9898) * 43758.5453));
      surface = mix(surface, uScar, scratches * 0.7);
      float groove = ink;
      ink *= 0.3;`,
    finish: 'terrainCut = max(groove, scratches * 0.8);',
  },
  // Toy plastic: a few saturated bands cut hard by height, thin bright parting lines, stress whitening where it was bent.
  plastic: {
    tone: { low: palette.surface.plastic.bands[0], high: palette.surface.plastic.bands[1], steep: palette.surface.plastic.bands[0],
      contour: palette.surface.plastic.contour, scar: palette.surface.plastic.scar },
    uniforms: { uBands: { value: palette.surface.plastic.bands.map(color => new Color(color)) } },
    declare: `uniform vec3 uBands[${palette.surface.plastic.bands.length}];`,
    shade: `
      float bandAt = clamp(0.5 + height * 0.5, 0.0, 0.999) * ${palette.surface.plastic.bands.length}.0;
      surface = uBands[int(floor(bandAt))];
      surface = mix(surface, uScar, smoothstep(0.1, 0.9, scar) * 0.55);
      ink = (1.0 - min(contourPixels(rings / uContourMajor) * 0.8, 1.0)) * 0.85;`,
  },
  // The bare hide under the shells. Dug ground shows skin; regrown ground stays pale because scar never falls.
  fur: {
    tone: palette.surface.fur,
    uniforms: { uSkin: { value: new Color(palette.surface.fur.skin) } },
    declare: 'uniform vec3 uSkin;',
    shade: `
      surface = mix(surface, uScar, scar * 0.6);
      surface = mix(surface, uSkin, smoothstep(0.15, 0.75, bald));
      ink *= 0.3;`,
  },
  jelly: {
    tone: palette.surface.jelly,
    shade: `
      float bruise = smoothstep(0.15, 1.0, scar);
      surface = mix(surface, uScar, bruise * 0.45);
      ink *= 0.35;`,
    finish: 'terrainSolid = bruise * 0.4;',
  },
  // World-space cracks: the distance between the two nearest cell centers falls to zero along cell borders.
  ice: {
    tone: palette.surface.ice,
    declare: `
      vec3 crackHash(vec3 cell) {
        return fract(sin(vec3(dot(cell, vec3(127.1, 311.7, 74.7)), dot(cell, vec3(269.5, 183.3, 246.1)), dot(cell, vec3(113.5, 271.9, 124.6)))) * 43758.5453);
      }
      float crackEdge(vec3 p) {
        vec3 cell = floor(p), part = p - cell;
        float nearest = 8.0, second = 8.0;
        for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
          vec3 offset = vec3(float(x), float(y), float(z));
          vec3 to = offset + crackHash(cell + offset) - part;
          float d = dot(to, to);
          if (d < nearest) { second = nearest; nearest = d; }
          else if (d < second) second = d;
        }
        return sqrt(second) - sqrt(nearest);
      }`,
    shade: `
      float crack = 0.0;
      if (scar > 0.02) {
        float wide = 1.0 - smoothstep(0.0, 0.05 + 0.1 * scar, crackEdge(vTerrainPosition * 4.2));
        float fine = 1.0 - smoothstep(0.0, 0.1, crackEdge(vTerrainPosition * 13.0));
        crack = clamp(wide + fine * 0.6 * smoothstep(0.3, 0.9, scar), 0.0, 1.0) * smoothstep(0.02, 0.45, scar);
      }
      surface = mix(surface, uScar, crack);
      ink *= 0.3;`,
    finish: 'terrainSolid = crack * 0.85; terrainGlow = uScar * crack * 0.35;',
  },
}

// Shells of hair over the fur hide. `vRoot` is the position on the hide, so one strand stays one strand across shells.
const shellVertex = `
  attribute vec3 aEdit;
  uniform float uShells;
  uniform float uFurLength;
  uniform float uFurTime;
  varying vec3 vRoot;
  varying float vShell;`
const shellMove = `
  vRoot = (modelMatrix * vec4(position, 1.0)).xyz;
  vShell = float(gl_InstanceID + 1) / uShells;
  vec3 furUp = normalize(vRoot);
  vec3 furSway = vec3(sin(uFurTime * 1.3 + vRoot.x * 2.3 + vRoot.y), sin(uFurTime * 1.1 + vRoot.y * 2.1 + vRoot.z), sin(uFurTime * 1.7 + vRoot.z * 2.7)) * ${tuning.surface.fur.wind.toFixed(3)};
  vec3 furComb = normalize(cross(furUp, vec3(0.31, 0.92, 0.23)));
  float furLength = uFurLength * (1.0 - aEdit.y) * (1.0 - aEdit.z * 0.45);
  transformed += normal * vShell * furLength
    + (furSway - furUp * ${tuning.surface.fur.droop.toFixed(3)} + furComb * aEdit.z * 0.9) * vShell * vShell * furLength;`
const shellDeclare = `
  uniform float uFurDensity;
  varying vec3 vRoot;
  varying float vShell;
  vec3 furHash(vec3 cell) {
    return fract(sin(vec3(dot(cell, vec3(127.1, 311.7, 74.7)), dot(cell, vec3(269.5, 183.3, 246.1)), dot(cell, vec3(113.5, 271.9, 124.6)))) * 43758.5453);
  }`
const shellCut = `
  vec3 furAt = vRoot * uFurDensity;
  vec3 furJitter = furHash(floor(furAt));
  float furLeft = 1.0 - vShell / (0.45 + 0.55 * furJitter.x);
  if (furLeft <= 0.0 || vEdit.y > 0.85 || length(fract(furAt) - (0.3 + 0.4 * furJitter)) > furLeft * 0.75) discard;`

// Jelly: every disturbance source pushes a ripple through the ground. The slope goes to the fragment as a tilted normal.
const rippleVertex = `
  uniform vec4 uRipples[${tuning.residents.disturbance.maxSources}];
  uniform float uRippleTime;
  varying vec3 vRippleTilt;`
const rippleMove = `
  vec3 rippleWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  float rippleHeight = 0.012 * sin(uRippleTime * 1.1 + rippleWorld.y * 1.4 + rippleWorld.x);
  vRippleTilt = vec3(0.0);
  for (int i = 0; i < ${tuning.residents.disturbance.maxSources}; i++) {
    if (uRipples[i].w <= 0.0) continue;
    vec3 away = rippleWorld - uRipples[i].xyz;
    float d = length(away);
    float reach = max(0.0, 1.0 - d / ${tuning.surface.ripple.reach.toFixed(3)});
    if (reach <= 0.0) continue;
    float wave = d * ${tuning.surface.ripple.frequency.toFixed(3)} - uRippleTime * ${tuning.surface.ripple.speed.toFixed(3)};
    float strength = uRipples[i].w * reach * reach * ${tuning.surface.ripple.height.toFixed(3)};
    rippleHeight += strength * sin(wave);
    vRippleTilt += normalize(away + vec3(0.0001)) * strength * cos(wave) * ${tuning.surface.ripple.frequency.toFixed(3)};
  }
  transformed += normal * rippleHeight;`

export interface TerrainOptions {
  /** The shared environment map; materials that reflect need it. */
  env?: Texture | null
  /** No transmission or ripples: the system view draws other worlds this way (SUR-14). */
  opaque?: boolean
  /** Draw hair shells instead of the fur hide. */
  shell?: boolean
}

function surfaceMaterial(profile: SurfaceProfile, { env, opaque, shell }: TerrainOptions) {
  const { look } = profile
  const physical = !shell && (look.clearcoat !== undefined || look.sheen !== undefined || (look.transmission !== undefined && !opaque))
  const base = { color: '#ffffff', roughness: look.roughness, metalness: look.metalness }
  const material = physical
    ? new MeshPhysicalMaterial({ ...base, clearcoat: look.clearcoat ?? 0, clearcoatRoughness: look.clearcoatRoughness ?? 0,
      sheen: look.sheen ?? 0, sheenRoughness: look.sheenRoughness ?? 1, transmission: opaque ? 0 : look.transmission ?? 0,
      thickness: look.thickness ?? 0, ior: look.ior ?? 1.5, attenuationDistance: look.attenuationDistance ?? Infinity,
      attenuationColor: look.attenuation ? palette.surface[look.attenuation].attenuation : '#ffffff' })
    : new MeshStandardMaterial(base)
  if (env && look.envMapIntensity) {
    material.envMap = env
    material.envMapIntensity = look.envMapIntensity
  }
  return material
}

// VIS-02: procedural grain in world space, blended across all three axes.
// No UVs are stored, so remeshing cannot stretch the pattern.
// D-027 surface C: value by height above the base radius, darker on steep slopes, graphite contour
// lines by distance from the planet center. All three are world-space, so edits reshape the lines.
// Resource glow: Lesson 04's world-space distance falloff, anchored to each resource point, so buried
// targets tint the terrain around them without a camera-dependent term.
// D-060: a material keeps all of this and swaps the base class and a few lines; see `recipes`.
export function createTerrainMaterial(clusters: ResourceCluster[] = [], baseRadius = VOXEL_WORLD_SIZE * 0.34, kind: SurfaceKind = 'rock', options: TerrainOptions = {}) {
  const profile = surfaces[kind]
  const recipe = recipes[kind]
  const { opaque = false, shell = false } = options
  const rippling = kind === 'jelly' && !opaque
  const transmissive = (profile.look as SurfaceProfile['look']).transmission !== undefined && !opaque
  const material = surfaceMaterial(profile, options)
  const count = clusters.length
  const resources = clusters.map((cluster) => new Vector4(...cluster.position, 1))
  const glowColors = clusters.map((cluster) => {
    const color = new Color(resourceColors[cluster.category])
    return new Vector3(color.r, color.g, color.b)
  })
  const { contour } = tuning.visual
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uGlowRadius: { value: tuning.glow.radius },
      uGlowAlbedoMix: { value: tuning.glow.albedoMix },
      uGlowEmissive: { value: tuning.glow.emissive },
      uBaseRadius: { value: baseRadius },
      uHeightRange: { value: contour.heightRange },
      uContourSpacing: { value: contour.spacing },
      uContourMajor: { value: contour.majorEvery },
      uLow: { value: new Color(recipe.tone.low) },
      uHigh: { value: new Color(recipe.tone.high) },
      uSteep: { value: new Color(recipe.tone.steep) },
      uContourColor: { value: new Color(recipe.tone.contour) },
      uScar: { value: new Color(recipe.tone.scar) },
      uCutRoughness: { value: recipe.cutRoughness ?? profile.look.roughness },
      uAtmoColor: { value: new Color(palette.atmosphere) },
      uRim: { value: tuning.visual.atmosphere.rim },
      uAreaCenter: { value: workArea.center },
      uAreaRadius: workArea.radius,
      uAreaOn: workArea.enabled,
      uAreaInner: { value: tuning.visual.workArea.innerSpacingFactor },
      ...recipe.uniforms,
    })
    if (count > 0) {
      shader.uniforms.uResources = { value: resources }
      shader.uniforms.uGlowColors = { value: glowColors }
    }
    if (shell) {
      Object.assign(shader.uniforms, { uShells: furShells, uFurLength: { value: tuning.surface.fur.length },
        uFurDensity: { value: tuning.surface.fur.density }, uFurTime: motion.time })
    }
    if (rippling) Object.assign(shader.uniforms, { uRipples: motion.ripples, uRippleTime: motion.time })
    const declarations = `
      varying vec3 vEdit;
      uniform float uGlowRadius;
      uniform float uGlowAlbedoMix;
      uniform float uGlowEmissive;
      uniform float uBaseRadius;
      uniform float uHeightRange;
      uniform float uContourSpacing;
      uniform float uContourMajor;
      uniform vec3 uLow;
      uniform vec3 uHigh;
      uniform vec3 uSteep;
      uniform vec3 uContourColor;
      uniform vec3 uScar;
      uniform float uCutRoughness;
      uniform vec3 uAtmoColor;
      uniform float uRim;
      uniform vec3 uAreaCenter;
      uniform float uAreaRadius;
      uniform float uAreaOn;
      uniform float uAreaInner;${count > 0 ? `
      uniform vec4 uResources[${count}];
      uniform vec3 uGlowColors[${count}];` : ''}
      // Distance to the nearest contour, in screen pixels: lines stay one pixel wide at every zoom.
      float contourPixels(float value) {
        return abs(fract(value) - 0.5) / max(fwidth(value), 0.0001);
      }
      ${recipe.declare ?? ''}${shell ? shellDeclare : ''}${rippling ? 'varying vec3 vRippleTilt;' : ''}`
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vTerrainPosition;
        varying vec3 vTerrainNormal;
        varying vec3 vEdit;
        ${shell ? shellVertex : 'attribute vec3 aEdit;'}
        ${rippling ? rippleVertex : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vEdit = aEdit;
        ${shell ? shellMove : ''}${rippling ? rippleMove : ''}`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vTerrainPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vTerrainNormal = normalize(mat3(modelMatrix) * normal);`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vTerrainPosition;\nvarying vec3 vTerrainNormal;${declarations}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        ${shell ? shellCut : ''}
        vec3 terrainNormal = normalize(vTerrainNormal);
        vec3 weight = pow(abs(terrainNormal), vec3(4.0));
        weight /= max(weight.x + weight.y + weight.z, 0.0001);
        vec3 p = vTerrainPosition * 17.0;
        float yz = sin(p.y) * sin(p.z * 1.17);
        float xz = sin(p.x * 1.11) * sin(p.z);
        float xy = sin(p.x) * sin(p.y * 1.09);
        float grain = dot(weight, vec3(yz, xz, xy));
        float radius = length(vTerrainPosition);
        vec3 up = vTerrainPosition / max(radius, 0.0001);
        float height = clamp((radius - uBaseRadius) / uHeightRange, -1.0, 1.0);
        float slope = 1.0 - clamp(dot(terrainNormal, up), 0.0, 1.0);
        vec3 surface = mix(uLow, uHigh, smoothstep(-0.85, 0.85, height));
        surface = mix(surface, uSteep, smoothstep(0.18, 0.55, slope));
        float rings = radius / uContourSpacing;
        float major = 1.0 - min(contourPixels(rings / uContourMajor) * 0.7, 1.0);
        float ink = clamp((1.0 - min(contourPixels(rings), 1.0)) * 0.42 + major * 0.3, 0.0, 0.7);
        float scar = vEdit.x;
        float bald = vEdit.y;
        ${recipe.shade}
        if (uAreaOn > 0.5) {
          float fromCenter = distance(vTerrainPosition, uAreaCenter);
          float inside = 1.0 - smoothstep(uAreaRadius - 0.015, uAreaRadius + 0.015, fromCenter);
          float dense = clamp((1.0 - min(contourPixels(rings / uAreaInner), 1.0)) * 0.5 + major * 0.4, 0.0, 0.85);
          float edge = 1.0 - min(abs(fromCenter - uAreaRadius) / max(fwidth(fromCenter) * 1.3, 0.00001), 1.0);
          ink = max(mix(ink * 0.5, dense, inside), edge * 0.55);
          surface *= mix(1.0, 0.93, inside);
        }
        float terrainCut = 0.0;
        float terrainSolid = 0.0;
        vec3 terrainGlow = vec3(0.0);
        ${recipe.finish ?? ''}
        diffuseColor.rgb = mix(surface, uContourColor, ink) * (1.0 + 0.055 * grain);
        ${shell ? 'diffuseColor.rgb *= mix(0.62, 1.12, vShell);' : ''}
        vec3 glowTint = vec3(0.0);
        float glowAmount = 0.0;
        ${count > 0 ? `for (int i = 0; i < ${count}; i++) {
          float d = distance(vTerrainPosition, uResources[i].xyz);
          float g = 1.0 - smoothstep(0.0, uGlowRadius, d);
          g *= g * uResources[i].w;
          glowTint += uGlowColors[i] * g;
          glowAmount += g;
        }` : ''}
        glowTint /= max(glowAmount, 0.0001);
        glowAmount = min(glowAmount, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, glowTint, glowAmount * uGlowAlbedoMix);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, uCutRoughness, terrainCut);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += glowTint * glowAmount * uGlowEmissive + terrainGlow;`)
      // D-027 atmosphere C4: the planet's limb leans toward the atmosphere color.
      .replace('#include <opaque_fragment>', `float limb = 1.0 - abs(dot(normal, normalize(vViewPosition)));
        outgoingLight = mix(outgoingLight, uAtmoColor, uRim * pow(limb, 2.6));
        #include <opaque_fragment>`)
    if (transmissive) {
      // Cracks and bruises cloud the material instead of tinting what is seen through it.
      shader.fragmentShader = shader.fragmentShader.replace('#include <transmission_fragment>',
        ShaderChunk.transmission_fragment.replace('material.transmission = transmission;', 'material.transmission = transmission * (1.0 - terrainSolid);'))
    }
    if (rippling) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = normalize(normal - mat3(viewMatrix) * vRippleTilt);`)
    }
  }
  material.userData.resources = resources
  material.customProgramCacheKey = () => `terrain-contour-glow-v3-${kind}-${opaque ? 'opaque' : 'live'}-${shell ? 'shell' : 'hide'}-${count}`
  return material
}
