import { getInset } from '../scene/insetRegistry.js'
import { useSceneStore } from '../store/sceneStore.js'
import CompareInset from './CompareInset.jsx'
import './InsetCard.css'

// §5 Top-right when the step declares scene.inset. It trades places with the 3D
// scene over 300ms — the point being that the two are the same numbers, which a
// cut would hide. The map is click-anywhere because nothing else happens inside
// it; the 3D scene answers to its caption button instead, so that dragging it
// still orbits.
export default function InsetCard() {
  const insetKey = useSceneStore((state) => state.insetKey)
  const insetSwapped = useSceneStore((state) => state.insetSwapped)
  const toggleInsetSwapped = useSceneStore((state) => state.toggleInsetSwapped)
  const compare = useSceneStore((state) => state.compare)

  const inset = getInset(insetKey)
  if (!inset) return null

  const { component: InsetView, caption } = inset

  if (compare) {
    return (
      <div className="view-slot inset" data-slot={insetSwapped ? 'full' : 'corner'}>
        <div className="view-slot__surface">
          <CompareInset key={compare.label} component={InsetView} compare={compare} />
        </div>
        {!insetSwapped && (
          <p className="view-slot__caption">
            <button type="button" className="view-slot__caption-button" onClick={toggleInsetSwapped} aria-label={`${caption}. Swap it with the 3D scene.`}>
              {caption}
            </button>
          </p>
        )}
      </div>
    )
  }

  if (insetSwapped) {
    return (
      <div className="view-slot inset" data-slot="full">
        <div className="view-slot__surface">
          <InsetView />
        </div>
      </div>
    )
  }

  return (
    <div className="view-slot inset" data-slot="corner">
      <button
        type="button"
        className="view-slot__surface inset__button"
        onClick={toggleInsetSwapped}
        aria-label={`${caption}. Swap it with the 3D scene.`}
      >
        <InsetView />
      </button>
      <p className="view-slot__caption">{caption}</p>
    </div>
  )
}
