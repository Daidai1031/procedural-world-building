import { getStep } from '../content/loader.js'
import { getInset } from '../scene/insetRegistry.js'
import { useSceneStore } from '../store/sceneStore.js'
import './SceneLegend.css'

// An item with a `when` map only shows while every listed param has that value,
// so one legend can follow a compare toggle.
function isShown(item, params) {
  return Object.entries(item.when ?? {}).every(([key, value]) => params[key] === value)
}

// A long nested formula has no spaces to wrap at, so offer a break after each
// opening bracket instead of letting it split in the middle of a name.
function formulaWithBreaks(formula) {
  return formula.split('(').flatMap((part, index, parts) =>
    index < parts.length - 1 ? [part, '(', <wbr key={index} />] : [part],
  )
}

// A key to the colours in the 3D scene, on the right edge under the inset. Its
// words come from the step's scene.legend, because a sentence a learner reads
// belongs in content, not in a component.
export default function SceneLegend() {
  const stepId = useSceneStore((state) => state.stepId)
  const params = useSceneStore((state) => state.params)
  const insetKey = useSceneStore((state) => state.insetKey)

  const legend = stepId ? getStep(stepId)?.frontmatter.scene?.legend : null
  if (!legend) return null

  const items = legend.items.filter((item) => isShown(item, params))
  if (items.length === 0) return null

  return (
    <div className="scene-legend" data-below-inset={getInset(insetKey) !== null} role="group" aria-label={legend.title}>
      <h2 className="scene-legend__title">{legend.title}</h2>
      <ul className="scene-legend__list">
        {items.map((item) => (
          <li className="scene-legend__row" key={item.label}>
            {/* A row with no swatch describes something the scene does not draw,
                so it keeps the same indent without a colour to point at. */}
            <i
              className="scene-legend__swatch"
              data-shape={item.swatch ? (item.shape ?? 'block') : 'none'}
              style={item.swatch ? { '--swatch-color': `var(--${item.swatch})` } : undefined}
              aria-hidden="true"
            />
            <span className="scene-legend__text">
              <span className="scene-legend__label">{item.label}</span>
              {item.formula && <code className="scene-legend__formula">{formulaWithBreaks(item.formula)}</code>}
              {item.note && <span className="scene-legend__note">{item.note}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
