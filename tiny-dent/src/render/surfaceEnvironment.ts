import { BackSide, Color, Mesh, PMREMGenerator, Scene, ShaderMaterial, SphereGeometry, type Texture, type WebGLRenderer } from 'three'
import { palette } from '../config/palette'

const environments = new WeakMap<WebGLRenderer, Texture>()

// D-060: what polished materials reflect. The page's starfield is a 2D canvas behind the scene, so three.js cannot see
// it; this is a small stand-in sky of the same paper over dark space with a scatter of stars, filtered once per renderer.
export function surfaceEnvironment(renderer: WebGLRenderer) {
  const known = environments.get(renderer)
  if (known) return known
  const { zenith, nadir, star } = palette.surface.space
  const dome = new Mesh(new SphereGeometry(10, 48, 24), new ShaderMaterial({
    side: BackSide,
    uniforms: { uZenith: { value: new Color(zenith) }, uNadir: { value: new Color(nadir) }, uStar: { value: new Color(star) } },
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uZenith;
      uniform vec3 uNadir;
      uniform vec3 uStar;
      varying vec3 vDirection;
      void main() {
        vec3 direction = normalize(vDirection);
        vec3 sky = mix(uNadir, uZenith, smoothstep(-0.25, 0.75, direction.y));
        vec3 cell = floor(direction * 26.0);
        float twinkle = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float spot = 1.0 - smoothstep(0.08, 0.3, length(fract(direction * 26.0) - 0.5));
        gl_FragColor = vec4(mix(sky, uStar, step(0.88, twinkle) * spot), 1.0);
      }`,
  }))
  const scene = new Scene()
  scene.add(dome)
  const generator = new PMREMGenerator(renderer)
  const { texture } = generator.fromScene(scene, 0.01)
  generator.dispose()
  dome.geometry.dispose()
  dome.material.dispose()
  environments.set(renderer, texture)
  return texture
}
