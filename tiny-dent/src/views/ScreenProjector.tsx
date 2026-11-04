import { useEffect, type RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector3 } from 'three'

export type ProjectToScreen = (position: [number, number, number]) => { x: number; y: number }
// A world-space sphere as a screen circle: center in client pixels and radius in pixels.
export type ProjectSphere = (position: [number, number, number], radius: number) => { x: number; y: number; r: number }

// Lets DOM overlays start from a world position, e.g. a collected resource flying to the warehouse.
export function ScreenProjector({ projectRef, sphereRef }: { projectRef: RefObject<ProjectToScreen | null>; sphereRef?: RefObject<ProjectSphere | null> }) {
  const camera = useThree((state) => state.camera)
  const canvas = useThree((state) => state.gl.domElement)
  useEffect(() => {
    const point = new Vector3()
    const edge = new Vector3()
    const right = new Vector3()
    projectRef.current = (position) => {
      point.set(...position).project(camera)
      const rect = canvas.getBoundingClientRect()
      return { x: rect.left + (point.x + 1) / 2 * rect.width, y: rect.top + (1 - point.y) / 2 * rect.height }
    }
    if (sphereRef) sphereRef.current = (position, radius) => {
      const rect = canvas.getBoundingClientRect()
      point.set(...position).project(camera)
      // One radius to the camera's right shows how many pixels the sphere spans at that depth.
      right.setFromMatrixColumn(camera.matrixWorld, 0)
      edge.set(...position).addScaledVector(right, radius).project(camera)
      return { x: rect.left + (point.x + 1) / 2 * rect.width, y: rect.top + (1 - point.y) / 2 * rect.height,
        r: Math.abs(edge.x - point.x) / 2 * rect.width }
    }
    return () => { projectRef.current = null; if (sphereRef) sphereRef.current = null }
  }, [camera, canvas, projectRef, sphereRef])
  return null
}
