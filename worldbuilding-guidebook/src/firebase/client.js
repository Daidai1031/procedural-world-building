// Firebase client SDK, initialised once from the VITE_FIREBASE_* env vars (see
// .env.example and docs/tutorials/firebase-setup.md). These values identify the
// project; they are not secrets — Firestore access is enforced by the
// security rules in firestore.rules, not by hiding this config. That is why
// it is fine for them to live in a client bundle, unlike the server-only keys
// in api/ (spec/SPEC.md's "No secrets in the client" is about those).
//
// Only Auth and Firestore — no Storage. Storage requires the Blaze
// (pay-as-you-go) plan; Auth and Firestore stay on the free Spark plan. See
// the note in docs/tutorials/firebase-setup.md.
//
// A learner who has not set up a Firebase project yet should still get a
// working site: every export below is null when the config is incomplete, and
// callers check `firebaseConfigured` before touching auth/db.
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean)

const app = firebaseConfigured ? initializeApp(firebaseConfig) : null

export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
