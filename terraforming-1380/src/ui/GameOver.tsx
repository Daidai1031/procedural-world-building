import { tuning } from '../config/tuning'

export function GameOver() {
  return <section className="game-over" role="alertdialog" aria-modal="true" aria-labelledby="game-over-title">
    <div className="game-over-copy">
      <p>Contract #1380 terminated</p>
      <h1 id="game-over-title">You are bankrupt</h1>
      <em>Funds fell to −₡{-tuning.economy.bankruptcyLimit}. The crew has been recalled. Game over.</em>
      <button autoFocus onClick={() => window.location.reload()}>Start a new contract</button>
    </div>
  </section>
}
