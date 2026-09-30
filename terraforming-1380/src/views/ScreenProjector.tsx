import { useEffect, type RefObject } from 'react'
import { useThree } from '@react-three/fiber'
import { Vector3 } from 'three'

export type ProjectToScreen = (position: [number, number, number]) => { x: number; y: number }

// Lets DOM overlays start from a world position, e.g. a collected resource flying to the warehouse.
export function ScreenProjector({ projectRef }: { projectRef: RefObject<ProjectToScreen | null> }) {
  const camera = useThree((state) => state.camera)
  const canvas = useThree((state) => state.gl.domElement)
  useEffect(() => {
    const point = new Vector3()
    projectRef.current = (position) => {
      point.set(...position).project(camera)
      const rect = canvas.getBoundingClientRect()
      return { x: rect.left + (point.x + 1) / 2 * rect.width, y: rect.top + (1 - point.y) / 2 * rect.height }
    }
    return () => { projectRef.current = null }
  }, [camera, canvas, projectRef])
  return null
}
