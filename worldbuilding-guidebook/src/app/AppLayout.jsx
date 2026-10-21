import TutorDrawer from '../tutor/Tutor.jsx'
import { TUTOR_ENABLED } from '../tutor/tutorEnabled.js'
import { useCallback, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import AccountDrawer from '../components/AccountDrawer.jsx'
import CompositeLabPanel from '../components/CompositeLabPanel.jsx'
import ControlStrip from '../components/ControlStrip.jsx'
import BranchingPanel from '../components/BranchingPanel.jsx'
import { BRANCHING_DEMOS } from '../scene/demos/branching/params.js'
import PathPanel from '../components/PathPanel.jsx'
import { PATH_DEMOS } from '../scene/demos/paths/params.js'
import ParticlePanel from '../components/ParticlePanel.jsx'
import { PARTICLE_DEMOS } from '../scene/demos/particles/params.js'
import EntityPanel from '../components/EntityPanel.jsx'
import InsetCard from '../components/InsetCard.jsx'
import OutlineRail from '../components/OutlineRail.jsx'
import SceneLegend from '../components/SceneLegend.jsx'
import TerrainLegend from '../components/TerrainLegend.jsx'
import { useShellKeys } from '../hooks/useKeyboardShortcuts.js'
import SceneHost from '../scene/SceneHost.jsx'
import { useAuthStore } from '../store/authStore.js'
import { useSceneStore } from '../store/sceneStore.js'
import { useUiStore } from '../store/uiStore.js'
import './layout.css'

export default function AppLayout() {
  const isParticles = useSceneStore((state) => PARTICLE_DEMOS.includes(state.demoKey))
  const isBranching = useSceneStore((state) => BRANCHING_DEMOS.includes(state.demoKey))
  const isPaths = useSceneStore((state) => PATH_DEMOS.includes(state.demoKey))
  const railPinned = useUiStore((state) => state.railPinned)
  const cardWidth = useUiStore((state) => state.cardWidth)
  const cardCollapsed = useUiStore((state) => state.cardCollapsed)
  const toggleRailPinned = useUiStore((state) => state.toggleRailPinned)
  const toggleCardCollapsed = useUiStore((state) => state.toggleCardCollapsed)
  const unpinRail = useUiStore((state) => state.unpinRail)
  const setInsetSwapped = useSceneStore((state) => state.setInsetSwapped)

  const closeOverlays = useCallback(() => {
    unpinRail()
    setInsetSwapped(false)
  }, [unpinRail, setInsetSwapped])

  useShellKeys({
    toggleRail: toggleRailPinned,
    toggleCard: toggleCardCollapsed,
    closeOverlays,
  })

  // Once per app lifetime — subscribes to Firebase auth state, if configured.
  useEffect(() => {
    useAuthStore.getState().init()
  }, [])

  return (
    <div
      className="app"
      data-rail-pinned={railPinned}
      data-paths={isPaths}
      data-particles={isParticles}
      data-branching={isBranching}
      style={{ '--layout-card-width': cardCollapsed ? 'var(--card-collapsed-width)' : `${cardWidth}px` }}
    >
      <SceneHost />
      <OutlineRail />
      <div className="app__content">
        <Outlet />
      </div>
      <InsetCard />
      <EntityPanel />
      <SceneLegend />
      <TerrainLegend />
      <CompositeLabPanel />
      {isPaths ? <PathPanel /> : isParticles ? <ParticlePanel /> : isBranching ? <BranchingPanel /> : <ControlStrip />}
      <AccountDrawer />
      {TUTOR_ENABLED && <TutorDrawer />}
    </div>
  )
}
