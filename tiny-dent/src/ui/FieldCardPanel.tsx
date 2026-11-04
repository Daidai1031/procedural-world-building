import type { FieldCard } from '../systems/fieldVisit'

export function FieldCardPanel({ card, onClose }: { card: FieldCard; onClose: () => void }) {
  return <aside className="field-card" aria-label={card.title}>
    <p className="kicker">{card.kicker}</p>
    <div className="field-card-title">
      <h2>{card.title}</h2>
      <button type="button" onClick={onClose} aria-label="Close card">×</button>
    </div>
    <p>{card.body}</p>
  </aside>
}
