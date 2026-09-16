// The four entities of Lesson 01, moved from the original SceneAnatomyLesson.
// colorToken names a custom property in styles/tokens.css rather than a hex, so
// the objects in the scene and the interface over it are one palette.
export const entities = [
  {
    id: 'box',
    name: 'Box',
    subtitle: 'Matte orange',
    colorToken: '--object-box',
    position: [-2.5, 0.75, 0],
    geometry: { kind: 'box', args: [1.5, 1.5, 1.5] },
    material: { kind: 'standard', roughness: 0.65, metalness: 0.05 },
    castShadow: true,
    receiveShadow: true,
  },
  {
    id: 'sphere',
    name: 'Sphere',
    subtitle: 'Polished metal',
    colorToken: '--water',
    position: [0, 1, 0],
    geometry: { kind: 'sphere', args: [1, 48, 48] },
    material: { kind: 'standard', roughness: 0.15, metalness: 0.9 },
    castShadow: true,
    receiveShadow: true,
  },
  {
    id: 'cone',
    name: 'Cone',
    subtitle: 'Unlit yellow',
    colorToken: '--summit',
    position: [2.5, 0.9, 0],
    geometry: { kind: 'cylinder', args: [0, 0.9, 1.8, 32] },
    material: { kind: 'basic' },
    castShadow: true,
    receiveShadow: false,
  },
  {
    id: 'torus',
    name: 'Torus knot',
    subtitle: 'Glossy green',
    colorToken: '--moss',
    position: [0, 1, -3],
    geometry: { kind: 'torusKnot', args: [0.6, 0.2, 160, 32] },
    material: { kind: 'standard', roughness: 0.25, metalness: 0.4 },
    castShadow: true,
    receiveShadow: false,
  },
]

export const SELECTED_SCALE = 1.08
