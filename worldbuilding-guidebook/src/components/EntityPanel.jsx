import { entities } from '../scene/demos/sceneAnatomy/entities.js'
import { getInset } from '../scene/insetRegistry.js'
import { useSceneStore } from '../store/sceneStore.js'
import './EntityPanel.css'

function EyeIcon({ hidden }) {
  return (
    <svg className="entity-panel__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z" />
      {hidden ? <line x1="2" y1="2" x2="14" y2="14" /> : <circle cx="8" cy="8" r="2" />}
    </svg>
  )
}

// Lesson 01's own panel: entities.js already lists everything the demo can
// select, so this is the same list, made visible instead of hidden behind a
// dropdown. Clicking an object in the 3D scene or the 2D plan still selects
// it directly — this is the discoverable version of that, plus the ability
// to hide an entity to see past it.
export default function EntityPanel() {
  const demoKey = useSceneStore((state) => state.demoKey)
  const unlocked = useSceneStore((state) => state.unlocked)
  const selectedEntity = useSceneStore((state) => state.params.selectedEntity)
  const hiddenEntities = useSceneStore((state) => state.hiddenEntities)
  const setParam = useSceneStore((state) => state.setParam)
  const toggleEntityHidden = useSceneStore((state) => state.toggleEntityHidden)
  const insetKey = useSceneStore((state) => state.insetKey)

  if (demoKey !== 'scene-anatomy' || !unlocked.includes('selectedEntity')) return null

  // The corner slot holds whichever view isn't full-bleed — the 2D plan, or
  // the 3D scene once the two are swapped. Either way something floats there
  // on steps that declare an inset, so stack below it rather than under it.
  const insetInCorner = getInset(insetKey) !== null

  return (
    <div className="entity-panel" data-below-inset={insetInCorner} role="group" aria-label="Entities">
      <h2 className="entity-panel__title">Entities</h2>
      <ul className="entity-panel__list">
        {entities.map((entity) => {
          const isSelected = entity.id === selectedEntity
          const isHidden = hiddenEntities.includes(entity.id)

          return (
            <li className="entity-panel__row" key={entity.id} data-selected={isSelected} data-hidden={isHidden}>
              <button
                type="button"
                className="entity-panel__select"
                data-entity-id={entity.id}
                aria-current={isSelected ? 'true' : undefined}
                onClick={() => setParam('selectedEntity', entity.id)}
              >
                <i className="entity-panel__swatch" style={{ backgroundColor: `var(${entity.colorToken})` }} aria-hidden="true" />
                <span className="entity-panel__names">
                  <span className="entity-panel__name">{entity.name}</span>
                  <span className="entity-panel__subtitle">{entity.subtitle}</span>
                </span>
              </button>
              <button
                type="button"
                className="entity-panel__visibility"
                aria-pressed={isHidden}
                aria-label={`${isHidden ? 'Show' : 'Hide'} ${entity.name}`}
                onClick={() => toggleEntityHidden(entity.id)}
              >
                <EyeIcon hidden={isHidden} />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
