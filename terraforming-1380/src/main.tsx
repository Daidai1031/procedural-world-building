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
// Travelling to a new planet replaces the seed; remount the app so the world and its views start fresh.
function Root() {
  const seed = useRunStore(state => state.seed)
  return <App key={seed} useRunStore={useRunStore} debug={startup.debug} intro={seed === startup.seed} />
}
createRoot(document.getElementById('root')!).render(<Root />)
