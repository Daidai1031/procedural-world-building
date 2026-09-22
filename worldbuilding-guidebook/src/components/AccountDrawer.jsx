import { useEffect, useRef, useState } from 'react'
import { firebaseConfigured } from '../firebase/client.js'
import { loadConfiguration, saveConfiguration } from '../firebase/configSync.js'
import { useAuthStore } from '../store/authStore.js'
import './AccountDrawer.css'

function SignInForm() {
  const busy = useAuthStore((state) => state.busy)
  const error = useAuthStore((state) => state.error)
  const [mode, setMode] = useState('signIn')

  async function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = form.get('email')
    const password = form.get('password')
    const action = mode === 'signIn' ? useAuthStore.getState().signIn : useAuthStore.getState().signUp
    try {
      await action(email, password)
    } catch {
      // The store already recorded the message; the form just stays open.
    }
  }

  return (
    <form className="account-drawer__form" onSubmit={submit}>
      <p className="account-drawer__note">
        Sign in to save your settings and progress to your account, and load them on
        another device.
      </p>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required minLength={6} />
      </label>
      <div className="account-drawer__actions">
        <button type="submit" disabled={busy}>
          {busy ? 'Working…' : mode === 'signIn' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" className="account-drawer__link" onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}>
          {mode === 'signIn' ? 'Need an account? Create one' : 'Have an account? Sign in'}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}

function ConfigPanel({ uid }) {
  const [status, setStatus] = useState('')
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState('')

  async function handleSave() {
    setStatus('saving')
    setError('')
    try {
      await saveConfiguration(uid)
      setSavedAt(new Date())
      setStatus('saved')
    } catch (saveError) {
      setError(saveError.message)
      setStatus('')
    }
  }

  async function handleLoad() {
    setStatus('loading')
    setError('')
    try {
      const data = await loadConfiguration(uid)
      setStatus(data ? 'loaded' : 'empty')
    } catch (loadError) {
      setError(loadError.message)
      setStatus('')
    }
  }

  return (
    <div className="account-drawer__config">
      <div className="account-drawer__actions">
        <button type="button" onClick={handleSave} disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save configuration'}
        </button>
        <button type="button" onClick={handleLoad} disabled={status === 'loading'}>
          {status === 'loading' ? 'Loading…' : 'Load configuration'}
        </button>
      </div>
      <p role="status" className="account-drawer__note">
        {status === 'saved' && `Saved ${savedAt.toLocaleTimeString()}.`}
        {status === 'loaded' && 'Loaded. Your params, view toggles, and progress are restored.'}
        {status === 'empty' && 'No saved configuration yet — save one first.'}
      </p>
      {error && <p role="alert">{error}</p>}
    </div>
  )
}

export default function AccountDrawer() {
  const isOpen = useAuthStore((state) => state.isOpen)
  const ready = useAuthStore((state) => state.ready)
  const user = useAuthStore((state) => state.user)
  const panel = useRef(null)

  useEffect(() => {
    function keydown(event) {
      if (event.key === 'Escape') useAuthStore.getState().close()
    }
    if (isOpen) window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const previous = document.activeElement
    panel.current?.querySelector('input, button')?.focus()
    return () => previous?.isConnected && previous.focus()
  }, [isOpen])

  if (!isOpen) return null

  return (
    <aside ref={panel} id="account-drawer" className="account-drawer" role="dialog" aria-label="Account">
      <header>
        <h2>Account</h2>
        <button type="button" onClick={useAuthStore.getState().close} aria-label="Close account panel">Close</button>
      </header>

      {!firebaseConfigured && (
        <p className="account-drawer__note">
          Firebase is not configured for this build. Add the VITE_FIREBASE_* values from
          your Firebase project to .env.local — see docs/tutorials/firebase-setup.md.
        </p>
      )}

      {firebaseConfigured && !ready && <p role="status">Checking sign-in…</p>}

      {firebaseConfigured && ready && !user && <SignInForm />}

      {firebaseConfigured && ready && user && (
        <>
          <p className="account-drawer__note">Signed in as {user.email}.</p>
          <ConfigPanel uid={user.uid} />
          <button type="button" className="account-drawer__link" onClick={() => useAuthStore.getState().signOutUser()}>
            Sign out
          </button>
        </>
      )}
    </aside>
  )
}
