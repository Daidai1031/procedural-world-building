import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { PMREMGenerator } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// A metal surface shows you its surroundings and nothing else. With nothing to
// reflect, the sphere renders black and step 03 — "most of what you see is the
// scene reflected back at you" — contradicts the picture beside it.
// RoomEnvironment is generated in memory, so this costs no network request.
export default function useStudioEnvironment() {
  const renderer = useThree((state) => state.gl)

  const environment = useMemo(() => {
    const generator = new PMREMGenerator(renderer)
    const texture = generator.fromScene(new RoomEnvironment(), 0.04).texture
    generator.dispose()
    return texture
  }, [renderer])

  useEffect(() => () => environment.dispose(), [environment])

  return environment
}

