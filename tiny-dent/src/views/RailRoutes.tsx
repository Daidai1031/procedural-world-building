import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Color, Line, LineBasicMaterial, Mesh, Vector3 } from 'three'
import type { createRunStore } from '../state/runState'
import { registryFor } from '../state/planets'
import type { SystemLayout } from '../systems/systemView'
import { shipmentPoint } from '../systems/logistics'
import { palette } from '../config/palette'
import { tuning } from '../config/tuning'
import { systemViewFrame } from '../state/systemView'
import { useRailLayers } from '../state/railLayers'

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const lift = new Vector3(0, 0.5, 0)

// LOG-09: solid rail lines between joined planets and a small marker per train in transit. Drawn only in the system view.
export function RailRoutes({ layout, store }: { layout: SystemLayout; store: ReturnType<typeof createRunStore> }) {
  const logistics = registryFor(store).logistics
  const routes = logistics(state => state.routes)
  const shipments = logistics(state => state.shipments)
  const layers = useRailLayers()
  const lines = useMemo(() => routes.filter(route => route.status === 'open' && layout.positions[route.a] && layout.positions[route.b]).map(route => {
    const geometry = new BufferGeometry().setFromPoints([new Vector3(...layout.positions[route.a]).add(lift), new Vector3(...layout.positions[route.b]).add(lift)])
    const line = new Line(geometry, new LineBasicMaterial({ color: new Color(palette.system.rail), transparent: true, opacity: 0 }))
    line.frustumCulled = false
    line.raycast = () => {}
    return { id: route.id, line }
  }), [routes, layout])
  useEffect(() => () => lines.forEach(({ line }) => { line.geometry.dispose(); (line.material as LineBasicMaterial).dispose() }), [lines])
  const trains = useRef(new Map<string, Mesh>())
  const point = useMemo(() => new Vector3(), [])

  useFrame(() => {
    const fade = smoothstep(tuning.system.fade.marks[0], tuning.system.fade.marks[1], systemViewFrame.pull)
    for (const { line } of lines) { line.visible = layers.routes && fade > 0.001; (line.material as LineBasicMaterial).opacity = 0.9 * fade }
    const state = logistics.getState()
    for (const shipment of state.shipments) {
      const mesh = trains.current.get(shipment.id)
      if (!mesh) continue
      const at = shipmentPoint(shipment, state.routes, layout.positions, state.tick)
      mesh.visible = layers.flow && fade > 0.001 && !!at
      if (at) mesh.position.copy(point.set(...at).add(lift))
    }
  })

  return <>
    {lines.map(({ id, line }) => <primitive key={id} object={line} />)}
    {shipments.filter(s => s.status === 'transit').map(s => <mesh key={s.id} ref={mesh => { if (mesh) trains.current.set(s.id, mesh); else trains.current.delete(s.id) }} visible={false} raycast={() => {}}>
      <sphereGeometry args={[0.16, 10, 8]} /><meshBasicMaterial color={palette.system.rail} />
    </mesh>)}
  </>
}
