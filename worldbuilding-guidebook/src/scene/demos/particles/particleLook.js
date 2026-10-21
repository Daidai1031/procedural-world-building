import { BufferAttribute, BufferGeometry } from 'three'

// Dot and Puff both draw from this geometry. It reads the state's arrays
// directly and owns no numbers of its own.
export function buildPointsGeometry(state) {
  const geometry = new BufferGeometry()
  // #region shared-positions
  geometry.setAttribute('position', new BufferAttribute(state.position, 3))
  // #endregion
  return geometry
}
