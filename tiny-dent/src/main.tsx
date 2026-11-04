import { createRoot } from 'react-dom/client'
import { App } from './App'
import { readStartup } from './config/startup'
import { createRunStore } from './state/runState'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/outfit'
import '@fontsource/audiowide'
import './style.css'

// DBG-01, TECH-04: initialize the one run store before mounting the view.
const startup = readStartup(window.location.search)
const useRunStore = createRunStore(startup.seed)
if (startup.debug) (window as unknown as { __run: typeof useRunStore }).__run = useRunStore
// Travelling replaces the seed; remount the app so each planet's views rebuild from its stored world. The title plays once.
let introPlayed = false
function Root() {
  const seed = useRunStore(state => state.seed)
  const intro = !introPlayed
  introPlayed = true
  return <App key={seed} useRunStore={useRunStore} debug={startup.debug} intro={intro && seed === startup.seed} />
}
createRoot(document.getElementById('root')!).render(<Root />)
