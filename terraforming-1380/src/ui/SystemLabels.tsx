import { useEffect, useRef, type RefObject } from 'react'
import type { SystemPlanet } from '../systems/system'
import type { SystemLayout } from '../systems/systemView'
import type { ProjectSphere } from '../views/ScreenProjector'
import { planetConfig } from '../world/planet'
import { VOXEL_WORLD_SIZE } from '../world/voxels/voxelMath.js'
import { tuning } from '../config/tuning'
import { systemViewFrame, useSystemView } from '../state/systemView'

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// SYS-06: a plain-text tag above every world. Positions are written straight to the DOM from the camera's frame,
// so moving the camera never re-renders React.
export function SystemLabels({ planets, layout, sphereRef }: { planets: SystemPlanet[]; layout: SystemLayout; sphereRef: RefObject<ProjectSphere | null> }) {
  const tags = useRef(new Map<string, HTMLElement>())
  const hover = useSystemView(state => state.hover)
  const focus = useSystemView(state => state.focus)

  useEffect(() => {
    const tick = () => {
      const project = sphereRef.current
      const [from, to] = tuning.system.fade.otherWorlds
      const opacity = smoothstep(from, to, systemViewFrame.pull)
      for (const planet of planets) {
        const tag = tags.current.get(planet.seed)
        const at = layout.positions[planet.seed]
        if (!tag || !at || !project) continue
        const { x, y, r } = project(at, planetConfig(planet.seed).radius * VOXEL_WORLD_SIZE)
        tag.style.opacity = String(opacity)
        tag.style.transform = `translate(${x.toFixed(1)}px, ${(y - r - 8).toFixed(1)}px) translate(-50%, -100%)`
      }
    }
    systemViewFrame.ticks.add(tick)
    return () => { systemViewFrame.ticks.delete(tick) }
  }, [planets, layout, sphereRef])

  return <div className="system-tags" aria-hidden="true">
    {planets.filter(planet => layout.positions[planet.seed]).map(planet => <div key={planet.seed} className="system-tag"
      ref={element => { if (element) tags.current.set(planet.seed, element); else tags.current.delete(planet.seed) }}
      data-active={planet.active} data-open={hover === planet.seed || focus === planet.seed}>
      <strong>{planet.name}</strong>
      {planet.active && <em>YOU ARE HERE</em>}
      {(hover === planet.seed || focus === planet.seed) && <small>{planet.traits}</small>}
    </div>)}
  </div>
}
