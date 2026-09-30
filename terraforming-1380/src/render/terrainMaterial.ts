import { Color, MeshStandardMaterial, Vector3, Vector4 } from 'three'
import { resourceColors } from '../config/resourceColors'
import { tuning } from '../config/tuning'
import type { ResourceCluster } from '../world/resourceClusters'

// A collected resource stops glowing: its `w` flag scales the glow to zero without recompiling the shader.
export function setResourceGlowActive(material: MeshStandardMaterial, active: boolean[]) {
  const resources = material.userData.resources as Vector4[]
  resources.forEach((resource, index) => { resource.w = active[index] ? 1 : 0 })
}

// VIS-02: procedural grain in world space, blended across all three axes.
// No UVs are stored, so remeshing cannot stretch the pattern.
// Resource glow: Lesson 04's world-space distance falloff, anchored to each resource point, so buried
// targets tint the terrain around them without a camera-dependent term.
export function createTerrainMaterial(clusters: ResourceCluster[] = []) {
  const material = new MeshStandardMaterial({ color: '#888782', roughness: 0.95, metalness: 0 })
  const count = clusters.length
  const resources = clusters.map((cluster) => new Vector4(...cluster.position, 1))
  const glowColors = clusters.map((cluster) => {
    const color = new Color(resourceColors[cluster.category])
    return new Vector3(color.r, color.g, color.b)
  })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGlowRadius = { value: tuning.glow.radius }
    shader.uniforms.uGlowAlbedoMix = { value: tuning.glow.albedoMix }
    shader.uniforms.uGlowEmissive = { value: tuning.glow.emissive }
    if (count > 0) {
      shader.uniforms.uResources = { value: resources }
      shader.uniforms.uGlowColors = { value: glowColors }
    }
    const glowDeclarations = `
      uniform float uGlowRadius;
      uniform float uGlowAlbedoMix;
      uniform float uGlowEmissive;${count > 0 ? `
      uniform vec4 uResources[${count}];
      uniform vec3 uGlowColors[${count}];` : ''}`
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTerrainPosition;\nvarying vec3 vTerrainNormal;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vTerrainPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vTerrainNormal = normalize(mat3(modelMatrix) * normal);`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vTerrainPosition;\nvarying vec3 vTerrainNormal;${glowDeclarations}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 weight = pow(abs(normalize(vTerrainNormal)), vec3(4.0));
        weight /= max(weight.x + weight.y + weight.z, 0.0001);
        vec3 p = vTerrainPosition * 17.0;
        float yz = sin(p.y) * sin(p.z * 1.17);
        float xz = sin(p.x * 1.11) * sin(p.z);
        float xy = sin(p.x) * sin(p.y * 1.09);
        float grain = dot(weight, vec3(yz, xz, xy));
        diffuseColor.rgb *= 1.0 + 0.055 * grain;
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
  }
  material.userData.resources = resources
  material.customProgramCacheKey = () => `terrain-triplanar-glow-v1-${count}`
  return material
}
