import { Color, MeshStandardMaterial, Vector3, Vector4 } from 'three'
import { palette } from '../config/palette'
import { resourceColors } from '../config/resourceColors'
import { tuning } from '../config/tuning'
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

// VIS-02: procedural grain in world space, blended across all three axes.
// No UVs are stored, so remeshing cannot stretch the pattern.
// D-027 surface C: value by height above the base radius, darker on steep slopes, graphite contour
// lines by distance from the planet center. All three are world-space, so edits reshape the lines.
// Resource glow: Lesson 04's world-space distance falloff, anchored to each resource point, so buried
// targets tint the terrain around them without a camera-dependent term.
export function createTerrainMaterial(clusters: ResourceCluster[] = []) {
  const material = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, metalness: 0 })
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
      uBaseRadius: { value: VOXEL_WORLD_SIZE * 0.34 },
      uHeightRange: { value: contour.heightRange },
      uContourSpacing: { value: contour.spacing },
      uContourMajor: { value: contour.majorEvery },
      uLow: { value: new Color(palette.terrain.low) },
      uHigh: { value: new Color(palette.terrain.high) },
      uSteep: { value: new Color(palette.terrain.steep) },
      uContourColor: { value: new Color(palette.terrain.contour) },
      uAtmoColor: { value: new Color(palette.atmosphere) },
      uRim: { value: tuning.visual.atmosphere.rim },
      uAreaCenter: { value: workArea.center },
      uAreaRadius: workArea.radius,
      uAreaOn: workArea.enabled,
      uAreaInner: { value: tuning.visual.workArea.innerSpacingFactor },
    })
    if (count > 0) {
      shader.uniforms.uResources = { value: resources }
      shader.uniforms.uGlowColors = { value: glowColors }
    }
    const declarations = `
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
      }`
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTerrainPosition;\nvarying vec3 vTerrainNormal;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vTerrainPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vTerrainNormal = normalize(mat3(modelMatrix) * normal);`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vTerrainPosition;\nvarying vec3 vTerrainNormal;${declarations}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
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
        if (uAreaOn > 0.5) {
          float fromCenter = distance(vTerrainPosition, uAreaCenter);
          float inside = 1.0 - smoothstep(uAreaRadius - 0.015, uAreaRadius + 0.015, fromCenter);
          float dense = clamp((1.0 - min(contourPixels(rings / uAreaInner), 1.0)) * 0.5 + major * 0.4, 0.0, 0.85);
          float edge = 1.0 - min(abs(fromCenter - uAreaRadius) / max(fwidth(fromCenter) * 1.3, 0.00001), 1.0);
          ink = max(mix(ink * 0.5, dense, inside), edge * 0.55);
          surface *= mix(1.0, 0.93, inside);
        }
        diffuseColor.rgb = mix(surface, uContourColor, ink) * (1.0 + 0.055 * grain);
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
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += glowTint * glowAmount * uGlowEmissive;`)
      // D-027 atmosphere C4: the planet's limb leans toward the atmosphere color.
      .replace('#include <opaque_fragment>', `float limb = 1.0 - abs(dot(normal, normalize(vViewPosition)));
        outgoingLight = mix(outgoingLight, uAtmoColor, uRim * pow(limb, 2.6));
        #include <opaque_fragment>`)
  }
  material.userData.resources = resources
  material.customProgramCacheKey = () => `terrain-contour-glow-v2-${count}`
  return material
}
