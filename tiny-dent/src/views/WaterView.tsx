import { DoubleSide } from 'three'

// D-073/WAT-03: the water is drawn as a translucent sphere over the real seabed, which shows through and changes when it is
// dug or built on. It takes no clicks, so the terrain tools work through it. A dry planet draws nothing.
export function WaterView({ radius, opaque = false }: { radius: number; opaque?: boolean }) {
  if (!(radius > 0)) return null
  return <mesh raycast={() => {}} renderOrder={1}>
    <sphereGeometry args={[radius, 72, 54]} />
    {opaque
      ? <meshBasicMaterial color="#6aa6c8" transparent opacity={0.34} depthWrite={false} side={DoubleSide} />
      : <meshPhysicalMaterial color="#5b9cc2" transparent opacity={0.4} roughness={0.06} metalness={0} clearcoat={1} clearcoatRoughness={0.05} depthWrite={false} />}
  </mesh>
}
