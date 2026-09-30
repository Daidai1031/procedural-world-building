import { useLayoutEffect, useRef } from 'react'
import type { ResourceCategory } from '../world/resourceClusters'
import { resourceColors } from '../config/resourceColors'

export const resourceGlyphs: Record<ResourceCategory, string> = { mineral: '◇', life: '○', memory: '□' }

export interface CollectFlight { key: string; category: ResourceCategory; from: { x: number; y: number } }

// COL-02: a collected resource arcs from where it was exposed to its warehouse slot.
export function CollectChip({ flight, target, onDone }: {
  flight: CollectFlight
  target: HTMLElement | null
  onDone: () => void
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const finished = useRef(onDone)
  finished.current = onDone
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || !target || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finished.current()
      return
    }
    const rect = target.getBoundingClientRect()
    const to = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    const at = (x: number, y: number, scale: number) => `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${scale})`
    const lift = Math.min(90, Math.abs(to.x - flight.from.x) * 0.25 + 30)
    const animation = element.animate([
      { transform: at(flight.from.x, flight.from.y, 0.6), opacity: 0 },
      { transform: at(flight.from.x, flight.from.y - lift * 0.5, 1.7), opacity: 1, offset: 0.2 },
      { transform: at((flight.from.x + to.x) / 2, Math.min(flight.from.y, to.y) - lift, 1.3), opacity: 1, offset: 0.55 },
      { transform: at(to.x, to.y, 0.8), opacity: 0.9 },
    ], { duration: 850, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' })
    animation.onfinish = () => finished.current()
    return () => animation.cancel()
  }, [flight, target])
  return <span ref={ref} className="collect-chip" aria-hidden="true"
    style={{ color: resourceColors[flight.category] }}>{resourceGlyphs[flight.category]}</span>
}
