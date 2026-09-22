// Cross-device configuration: save the current viewport/params state and
// learning progress to Firestore under the signed-in user, and load it back.
// One document per user holds the current configuration. See
// docs/tutorials/firebase-setup.md.
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './client.js'
import { useProgressStore } from '../store/progressStore.js'
import { useSceneStore } from '../store/sceneStore.js'

function buildSnapshot() {
  const scene = useSceneStore.getState()
  const progress = useProgressStore.getState()
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
    },
  }
}

function applySnapshot(snapshot) {
  if (snapshot.scene) useSceneStore.getState().restoreConfig(snapshot.scene)
  if (snapshot.progress) useProgressStore.getState().restoreProgress(snapshot.progress)
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
