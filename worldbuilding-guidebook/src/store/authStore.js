import { create } from 'zustand'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth, firebaseConfigured } from '../firebase/client.js'

// Mirrors tutorStore's shape: unknown until the listener reports in, then
// either a user or null. `ready` distinguishes "still checking" from
// "checked, signed out" so the account drawer does not flash a sign-in form
// for a learner who is actually already signed in.
export const useAuthStore = create((set) => ({
  user: null,
  ready: !firebaseConfigured,
  busy: false,
  error: '',
  isOpen: false,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  // Called once, from AppLayout. A no-op when Firebase is not configured —
  // `ready` is already true in that case, so the drawer goes straight to its
  // "not configured" note.
  init: () => {
    if (!firebaseConfigured || !auth) return
    onAuthStateChanged(auth, (user) => set({ user, ready: true }))
  },

  signUp: async (email, password) => {
    set({ busy: true, error: '' })
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (error) {
      set({ error: error.message })
      throw error
    } finally {
      set({ busy: false })
    }
  },

  signIn: async (email, password) => {
    set({ busy: true, error: '' })
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      set({ error: error.message })
      throw error
    } finally {
      set({ busy: false })
    }
  },

  signOutUser: async () => {
    await signOut(auth)
  },
}))
