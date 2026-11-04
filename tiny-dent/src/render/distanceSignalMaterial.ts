import { Color, ShaderMaterial, Vector3 } from 'three'

// DET-04: Lesson 04's world-space distance falloff, anchored to the scan point.
const vertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPosition, 1.0);
  }
`

const fragmentShader = `
  uniform vec3 uProbePosition;
  uniform vec3 uSignalColor;
  uniform float uScanRadius;
  uniform float uScanWidth;
  uniform float uOpacity;
  varying vec3 vWorldPosition;
  void main() {
    float d = distance(vWorldPosition, uProbePosition);
    float nearProbe = 1.0 - smoothstep(uScanRadius - uScanWidth, uScanRadius, d);
    if (nearProbe <= 0.01) discard;
    gl_FragColor = vec4(uSignalColor, nearProbe * uOpacity);
  }
`

export function createDistanceSignalMaterial(center: [number, number, number], radius: number,
  fadeWidth: number, color: string, opacity: number) {
  return new ShaderMaterial({
    uniforms: {
      uProbePosition: { value: new Vector3(...center) },
      uSignalColor: { value: new Color(color) },
      uScanRadius: { value: radius },
      uScanWidth: { value: fadeWidth },
      uOpacity: { value: opacity },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
}
