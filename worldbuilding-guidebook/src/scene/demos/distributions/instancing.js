import { useCallback, useLayoutEffect } from 'react'
import { Matrix4 } from 'three'
import { scatterParams } from './params.js'
import { instanceMatrix } from './scatter.js'

// Every instanced mesh is created once at the largest count and then told how
// many instances to draw, so moving Candidate count never rebuilds a mesh.
export const INSTANCE_CAPACITY = scatterParams.scatterCandidateCount.max

// matrixFor(candidate, target) builds each instance's transform, so an asset can
// stretch or tilt its instances its own way.
export function useInstanceMatrices(meshRef, candidates, matrixFor) {
  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const matrix = new Matrix4()
    candidates.forEach((candidate, index) => mesh.setMatrixAt(index, matrixFor(candidate, matrix)))
    mesh.count = candidates.length
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [meshRef, candidates, matrixFor])
}

// Places one instance at every candidate. The scale is the same for all of them
// and never depends on how many candidates there are.
export function useInstancePlacement(meshRef, candidates, scale) {
  const matrixFor = useCallback((candidate, matrix) => instanceMatrix(candidate, scale, matrix), [scale])
  useInstanceMatrices(meshRef, candidates, matrixFor)
}
