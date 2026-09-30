// Cross-device configuration: save the current viewport/params state and
// learning progress to Firestore under the signed-in user, and load it back.
// One document per user holds the current configuration. See
// docs/tutorials/firebase-setup.md.
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './client.js'
import { useCompositeLabStore } from '../store/compositeLabStore.js'
import { useProgressStore } from '../store/progressStore.js'
import { useSceneStore } from '../store/sceneStore.js'

function buildSnapshot() {
  const scene = useSceneStore.getState()
  const progress = useProgressStore.getState()
  const compositeLab = useCompositeLabStore.getState()
  return {
    scene: {
      params: scene.params,
      projection: scene.projection,
      wireframe: scene.wireframe,
      axesVisible: scene.axesVisible,
      grayscale: scene.grayscale,
      outlinesVisible: scene.outlinesVisible,
      insetSwapped: scene.insetSwapped,
    },
    progress: {
      completedStepIds: progress.completedStepIds,
      lastStepId: progress.lastStepId,
      notes: progress.notes,
      practiceResults: progress.practiceResults,
      finalProjectStepIds: progress.finalProjectStepIds,
    },
    compositeLab: {
      terrain: compositeLab.terrain,
      layers: compositeLab.layers,
      presets: compositeLab.presets,
    },
  }
}

function applySnapshot(snapshot) {
  if (snapshot.scene) useSceneStore.getState().restoreConfig(snapshot.scene)
  if (snapshot.progress) useProgressStore.getState().restoreProgress(snapshot.progress)
  if (snapshot.compositeLab) useCompositeLabStore.getState().restoreCompositeLab(snapshot.compositeLab)
}

export async function saveConfiguration(uid) {
  const snapshot = buildSnapshot()
  await setDoc(doc(db, 'users', uid), { ...snapshot, savedAt: serverTimestamp() })
  return snapshot
}

export async function loadConfiguration(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  const data = snap.data()
  applySnapshot(data)
  return data
}

// ---- automatic saving -------------------------------------------------------

const AUTO_SAVE_DELAY_MS = 2000
let activeSync = null

// Loads the account's configuration once, then saves it again a moment after
// any of the three stores changes. Nothing is saved until that first load has
// finished, so a fresh browser's defaults can never overwrite the cloud copy.
// An account with no saved configuration yet gets this browser's state.
export function startAutoSync(uid, onStatus) {
  stopAutoSync()
  let cancelled = false
  let timer = null
  let lastSaved = null
  const unsubscribers = []

  async function push() {
    timer = null
    if (JSON.stringify(buildSnapshot()) === lastSaved) return
    onStatus('saving')
    try {
      lastSaved = JSON.stringify(await saveConfiguration(uid))
      onStatus('saved')
    } catch {
      onStatus('error')
    }
  }

  function schedule() {
    clearTimeout(timer)
    timer = setTimeout(push, AUTO_SAVE_DELAY_MS)
  }

  // A pending save goes out at once when the tab is hidden or closed.
  async function flush() {
    if (timer === null) return
    clearTimeout(timer)
    await push()
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') flush()
  }

  activeSync = {
    flush,
    stop: () => {
      cancelled = true
      clearTimeout(timer)
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    },
  }

  async function begin() {
    onStatus('loading')
    try {
      const data = await loadConfiguration(uid)
      if (cancelled) return
      if (data) lastSaved = JSON.stringify(buildSnapshot())
      else await push()
    } catch {
      if (!cancelled) onStatus('error')
      return
    }
    if (cancelled) return
    onStatus('saved')
    unsubscribers.push(
      useSceneStore.subscribe(schedule),
      useProgressStore.subscribe(schedule),
      useCompositeLabStore.subscribe(schedule),
    )
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', flush)
    unsubscribers.push(
      () => document.removeEventListener('visibilitychange', handleVisibilityChange),
      () => window.removeEventListener('pagehide', flush),
    )
  }

  begin()
}

export function stopAutoSync() {
  activeSync?.stop()
  activeSync = null
}

export async function flushAutoSync() {
  await activeSync?.flush()
}
