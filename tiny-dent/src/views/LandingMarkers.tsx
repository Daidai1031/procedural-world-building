import { Quaternion, Vector3 } from 'three'
import type { LandingSite } from '../systems/exploration'

export function LandingMarkers({ sites, onLand }: { sites: LandingSite[]; onLand: (site: LandingSite) => void }) {
  return <group>{sites.filter(s => s.available).map(site => <group key={site.id} position={site.position}
    quaternion={new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...site.direction))}
    onClick={event => { event.stopPropagation(); if (event.button === 0 && event.delta < 5) onLand(site) }}>
    <mesh><ringGeometry args={[0.075, 0.095, 32]} /><meshBasicMaterial color="#546d59" side={2} /></mesh>
    <mesh position={[0, 0, 0.045]}><octahedronGeometry args={[0.045]} /><meshStandardMaterial color="#f3f1eb" emissive="#546d59" emissiveIntensity={0.35} /></mesh>
  </group>)}</group>
}
