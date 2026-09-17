export default function TerrainLegend({ simulation }) {
  return (
    <div className="terrain-legend" role="group" aria-label="Terrain elevation colours">
      <span className="control__label">Elevation</span>
      <div>
        <span><i className="terrain-legend__low" aria-hidden="true" />Low</span>
        <span><i className="terrain-legend__middle" aria-hidden="true" />Mid</span>
        <span><i className="terrain-legend__high" aria-hidden="true" />High</span>
        {simulation && <span><i className="terrain-legend__water" aria-hidden="true" />Water</span>}
      </div>
    </div>
  )
}
