import { useEffect, useState } from 'react'
import type { createRunStore } from '../state/runState'
import { antennaCount, broadcast } from '../systems/signal'
import { tuning } from '../config/tuning'

export function PlanetStatus({ useRunStore }: { useRunStore: ReturnType<typeof createRunStore> }) {
  const remaining = useRunStore(s => s.planetRemaining)
  const biosphere = useRunStore(s => s.metrics.biosphere)
  const stability = useRunStore(s => s.metrics.stability)
  const development = useRunStore(s => s.metrics.developmentReadiness)
  const plants = useRunStore(s => s.structures.filter(s => s.kind === 'plant').length)
  const antennas = useRunStore(antennaCount)
  const broadcasts = useRunStore(s => s.signal.broadcastCount)
  const bankrupt = useRunStore(s => s.economy.bankrupt)
  const [sending, setSending] = useState(false)
  useEffect(() => {
    if (!sending) return
    const timer = window.setTimeout(() => setSending(false), tuning.signal.pulseSeconds * 1000)
    return () => window.clearTimeout(timer)
  }, [sending])
  const send = () => { if (broadcast(useRunStore)) setSending(true) }
  return <section className="planet-status" aria-label="Planet condition">
    <p className="kicker">Planet condition</p>
    <div className="planet-remaining"><strong>{(remaining * 100).toFixed(1)}%</strong><span>Planet remaining</span></div>
    <dl className="planet-indicators">
      {([['Biosphere', biosphere, 'Living plants, terrain retained and disturbed life sites'],
        ['Prepared ground', development, 'Estimate from terrain shaped by the Builder, weighted by remaining mass'],
        ['Stability', stability, 'Estimate from remaining mass; local structural failures are not yet simulated']] as const).map(([name, value, description]) =>
        <div key={name} title={description}><dt>{name}<small>estimated</small></dt><dd>{value.toFixed(1)}<small>/100</small></dd>
          <meter min={0} max={100} value={value} aria-label={name} /></div>)}
    </dl>
    <p className="planet-life">{plants} living plants <span>·</span> {antennas} antennas</p>
    <button className="broadcast" disabled={!antennas || sending || bankrupt} onClick={send}>
      {sending ? 'Broadcasting…' : antennas ? `Broadcast signal · ${antennas} antenna${antennas === 1 ? '' : 's'}` : 'Broadcast needs an antenna'}
    </button>
    <p className="planet-life">{broadcasts ? `${broadcasts} signal${broadcasts === 1 ? '' : 's'} sent` : 'No signal sent yet'}</p>
  </section>
}
