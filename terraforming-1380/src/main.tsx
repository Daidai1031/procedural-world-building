import { createRoot } from 'react-dom/client'
import { App } from './App'
import { readStartup } from './config/startup'
import { createRunStore } from './state/runState'
import './style.css'

// DBG-01, TECH-04: initialize the one run store before mounting the view.
const startup = readStartup(window.location.search)
const useRunStore = createRunStore(startup.seed)
createRoot(document.getElementById('root')!).render(<App useRunStore={useRunStore} debug={startup.debug} />)
