import { useEffect, useState } from 'react'
import { isSoundOn, setSoundOn, unlockSound } from '../audio/surfaceAudio'

// SUR-13: the choice is kept between visits. The first press anywhere on the page unlocks audio.
export function SoundToggle() {
  const [on, setOn] = useState(isSoundOn)
  useEffect(() => {
    window.addEventListener('pointerdown', unlockSound, { once: true })
    return () => window.removeEventListener('pointerdown', unlockSound)
  }, [])
  const toggle = () => {
    setSoundOn(!on)
    setOn(!on)
    if (!on) unlockSound()
  }
  return <button type="button" aria-pressed={on} onClick={toggle}>Sound {on ? 'on' : 'off'}</button>
}
