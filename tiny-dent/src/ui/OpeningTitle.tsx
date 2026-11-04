import { useEffect, useState } from 'react'

export function OpeningTitle({ onComplete }: { onComplete: () => void }) {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const fade = window.setTimeout(() => setLeaving(true), 2100)
    const finish = window.setTimeout(onComplete, 2400)
    return () => { window.clearTimeout(fade); window.clearTimeout(finish) }
  }, [onComplete])
  return <section className="opening-title" data-leaving={leaving} aria-label="Game introduction">
    <div className="opening-title-copy">
      <h1>Tiny Dent</h1>
      <em>We’re here to put a dent in the universe.</em>
    </div>
    <button onClick={onComplete}>Skip intro →</button>
  </section>
}
