import type { MutableRefObject } from 'react'
import { resourceColors } from '../config/resourceColors'
import type { ResourceCategory } from '../world/resourceClusters'
import type { createRunStore } from '../state/runState'
import { powerDemand, sellMinerals } from '../systems/economy'
import { tuning } from '../config/tuning'

export function SitePanel({ useRunStore, slotRefs }: {
  useRunStore: ReturnType<typeof createRunStore>
  slotRefs: MutableRefObject<Partial<Record<ResourceCategory, HTMLElement | null>>>
}) {
  const economy = useRunStore(s => s.economy)
  const capital = useRunStore(s => s.metrics.capital)
  const soil = useRunStore(s => s.soil)
  const discoveries = useRunStore(s => s.discoveries)
  const demand = useRunStore(powerDemand)
  const isAuto = useRunStore(s => s.loadout.activeTool === 'auto')
  const power = isAuto ? demand : 0
  const stock = economy.mineralStock
  return <aside className="site-panel" aria-label="Site logistics">
    <p className="kicker">Logistics / depot 1380</p><h2>Site warehouse</h2>
    <ul className="warehouse" aria-label="Material storage">
      <li className="warehouse-slot">
        <span ref={element => { slotRefs.current.mineral = element }} className="storage-bay">
              <svg viewBox="0 0 150 110" role="img" aria-label={'Minerals' + ': ' + stock + ' units in storage'}>
                <path d="M10 70 L70 38 L140 70 L80 104 Z" fill="#d9d3c3" stroke="#aaa391" />
                <path d="M10 70 V77 L80 110 L140 77 V70 L80 104 Z" fill="#b7ae99" />
                {[0, 1, 2].map((lane) => <path key={lane} d={'M' + (25 + lane * 18) + ' ' + (78 - lane * 10) + ' l55 26'} stroke="#f3f1eb" strokeWidth="2" />)}
                {Array.from({ length: Math.min(stock, 12) }, (_, index) => {
                  const x = 28 + (index % 3) * 21 + Math.floor((index % 6) / 3) * 18
                  const y = 67 + (index % 3) * 10 - Math.floor((index % 6) / 3) * 10 - Math.floor(index / 6) * 22
                  return <g key={index} transform={'translate(' + x + ' ' + y + ')'} fill={resourceColors.mineral} stroke="#353632" strokeWidth="0.7">
                    <path d="M0 0 l16 -8 16 8 -16 8 Z" /><path d="M0 0 v18 l16 8 V8 Z" /><path d="M16 8 l16 -8 v18 l-16 8 Z" />
                    <path d="M0 0 l16 -8 16 8 -16 8 Z" fill="white" fillOpacity=".25" /><path d="M16 8 l16 -8 v18 l-16 8 Z" fill="black" fillOpacity=".18" />
                  </g>
                })}
                {stock === 0 && <text x="75" y="78" textAnchor="middle" fill="#62635c" fontSize="10">EMPTY BAY</text>}
              </svg>

        </span>
        <span className="slot-name"><small>Bay 01 / export</small>Minerals</span><strong className="slot-count">{stock}</strong>
      </li>
      <li className="warehouse-slot">
        <span className="storage-bay"><svg viewBox="0 0 150 110" role="img" aria-label={'Soil stock: ' + soil}>
          <path d="M10 70 L70 38 L140 70 L80 104 Z" fill="#d9d3c3" stroke="#aaa391" />
          <path d="M10 70 V77 L80 110 L140 77 V70 L80 104 Z" fill="#b7ae99" />
          {soil > 0 ? <g transform={'translate(75 83) scale(' + Math.min(1, 0.3 + Math.log1p(soil) / 10) + ')'}>
            <path d="M-55 0 L-16 -49 L12 -63 L54 -3 L0 22 Z" fill="#9d8567" />
            <path d="M12 -63 L0 22 L54 -3 Z" fill="#76634f" />
            <path d="M-16 -49 L12 -63 L0 -16 L-55 0 Z" fill="#c3ad86" />
          </g> : <text x="75" y="78" textAnchor="middle" fill="#62635c" fontSize="10">EMPTY BAY</text>}
        </svg></span>
        <span className="slot-name"><small>Bay 02 / construction</small>Soil</span><strong className="slot-count">{soil}</strong>
      </li>
    </ul>
    <button className="sell-minerals" disabled={!stock || economy.bankrupt} onClick={() => sellMinerals(useRunStore)}>
      {stock ? 'Sell minerals · +₡' + stock * tuning.economy.mineralPrice : 'No minerals to sell'}
    </button>
    <section className="operations" aria-label="Operating account">
      <div className="account-balance" data-debt={capital <= 0}><span>Available funds</span>
        <strong>{capital < 0 ? '−' : ''}₡{Math.abs(capital).toFixed(2)}</strong></div>
      <dl><dt>Mineral sales</dt><dd>+₡{economy.revenue.toFixed(2)}</dd>
        <dt>Electricity paid</dt><dd>−₡{economy.electricitySpent.toFixed(2)}</dd>
        <dt>Power draw</dt><dd>{power} kW</dd>
        <dt>Running cost</dt><dd>₡{(power * tuning.economy.electricityRate).toFixed(2)}/min</dd></dl>
    </section>
    <div className="discovery-log" aria-label="Discoveries">
      <span ref={element => { slotRefs.current.life = element }}>Life found <strong>{discoveries.lifeClusterIds.length}</strong></span>
      <span ref={element => { slotRefs.current.memory = element }}>Archives found <strong>{discoveries.artifactIds.length}</strong></span>
    </div>
  </aside>
}
