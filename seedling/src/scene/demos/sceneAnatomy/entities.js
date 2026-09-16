// Plan-and-picker metadata only. The literal meshes in SceneAnatomyDemo.jsx
// are the source of truth. Keep these positions and approximate 2D footprint
// radii in step with those meshes by hand; radii are not geometry arguments.
export const entities = [
  {
    id: 'box',
    name: 'Box',
    subtitle: 'Matte orange',
    colorToken: '--object-box',
    planPosition: [-2.5, 0],
    planRadius: 0.75,
  },
  {
    id: 'sphere',
    name: 'Sphere',
    subtitle: 'Polished metal',
    colorToken: '--water',
    planPosition: [0, 0],
    planRadius: 1,
  },
  {
    id: 'cone',
    name: 'Cone',
    subtitle: 'Unlit yellow',
    colorToken: '--summit',
    planPosition: [2.5, 0],
    planRadius: 0.9,
  },
  {
    id: 'torus',
    name: 'Torus knot',
    subtitle: 'Glossy green',
    colorToken: '--moss',
    planPosition: [0, -3],
    planRadius: 0.8,
  },
]
