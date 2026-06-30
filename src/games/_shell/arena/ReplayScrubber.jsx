// ─────────────────────────────────────────────────────────────────────────────
// ReplayScrubber — barre de contrôle de replay PARTAGÉE (Échecs + Dames).
//   ⏮ début · ◀ préc · ▶/⏸ play-pause (auto-advance) · ▶ suiv · ⏭ fin
//   + scrubber <input range> (seek à n'importe quel demi-coup)
//   + sélecteur de vitesse 0.5× / 1× / 2×.
// Découplé du moteur : pilote un index 0..total via les callbacks. `index` = demi-coup
// AFFICHÉ (0 = position après le 1er coup ; -1/`total-1` selon le câblage appelant ;
// ici on travaille en index "affiché" 0..total où index===total ⇒ position finale).
// L'auto-play est géré par l'appelant (playing + onTogglePlay) — ce composant n'est
// que de la présentation/commande. Sobre, accent or, focus-visible, reduced-motion-safe.
// Styles inline only. Tokens = neutralTheme + arenaTokens (accent passé en prop).
// ─────────────────────────────────────────────────────────────────────────────
import { ui, fonts } from '../../../features/games/neutralTheme.js'

const SPEEDS = [0.5, 1, 2]

// Bouton de transport carré (icône). `wide` pour le play/pause central.
function TBtn({ onClick, disabled, label, accent, active, children }) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className="rs-btn"
      style={{
        flex: '1 1 0', minWidth: 36, height: 36, borderRadius: ui.radius.sm,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        font: `700 14px ${fonts.body}`,
        color: disabled ? ui.textMute : (active ? ui.accentInk : ui.text),
        background: active ? accent : ui.surface,
        border: `1px solid ${active ? accent : ui.line}`,
        opacity: disabled ? 0.45 : 1,
        transition: 'background .14s, border-color .14s, color .14s',
      }}
      onMouseEnter={e => { if (!disabled && !active) { e.currentTarget.style.background = ui.surfaceHi; e.currentTarget.style.borderColor = ui.lineHi } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = ui.surface; e.currentTarget.style.borderColor = ui.line } }}
    >
      {children}
    </button>
  )
}

export default function ReplayScrubber({
  index, total, onSeek,
  playing = false, onTogglePlay,
  speed = 1, onSpeed,
  accent = ui.accent,
}) {
  // index courant en valeur de slider : 0 = avant le 1er coup, total = position finale.
  // L'appelant nous passe `index` ∈ [0..total] (demi-coups joués jusqu'ici).
  const max = Math.max(0, total)
  const val = Math.max(0, Math.min(max, index))
  const auDebut = val <= 0
  const aLaFin = val >= max
  const vide = total === 0

  return (
    <div
      role="group" aria-label="Lecture de la partie"
      style={{
        display: 'flex', flexDirection: 'column', gap: 9,
        padding: '11px 12px', borderRadius: ui.radius.md,
        background: ui.surface, border: `1px solid ${ui.line}`,
      }}
    >
      <style>{`
        .rs-btn:focus-visible{ outline:2px solid ${accent}; outline-offset:2px; }
        .rs-range:focus-visible{ outline:2px solid ${accent}; outline-offset:3px; }
        .rs-range{ -webkit-appearance:none; appearance:none; width:100%; height:6px; border-radius:999px;
          background:${ui.bg}; border:1px solid ${ui.line}; cursor:pointer; }
        .rs-range::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:16px; height:16px;
          border-radius:50%; background:${accent}; border:2px solid ${ui.bgElev}; box-shadow:0 1px 4px rgba(0,0,0,.5); cursor:pointer; }
        .rs-range::-moz-range-thumb{ width:16px; height:16px; border-radius:50%; background:${accent};
          border:2px solid ${ui.bgElev}; box-shadow:0 1px 4px rgba(0,0,0,.5); cursor:pointer; }
        .rs-range:disabled{ opacity:.5; cursor:default; }
        .rs-speed:focus-visible{ outline:2px solid ${accent}; outline-offset:2px; }
      `}</style>

      {/* transport */}
      <div style={{ display: 'flex', gap: 6 }}>
        <TBtn onClick={() => onSeek(0)} disabled={vide || auDebut} label="Aller au début" accent={accent}>⏮</TBtn>
        <TBtn onClick={() => onSeek(val - 1)} disabled={vide || auDebut} label="Coup précédent" accent={accent}>◀</TBtn>
        <TBtn onClick={onTogglePlay} disabled={vide} label={playing ? 'Pause' : 'Lecture'} accent={accent} active={playing}>
          {playing ? '⏸' : '▶'}
        </TBtn>
        <TBtn onClick={() => onSeek(val + 1)} disabled={vide || aLaFin} label="Coup suivant" accent={accent}>▶</TBtn>
        <TBtn onClick={() => onSeek(max)} disabled={vide || aLaFin} label="Aller à la fin" accent={accent}>⏭</TBtn>
      </div>

      {/* scrubber + compteur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="range" className="rs-range"
          min={0} max={max} step={1} value={val} disabled={vide}
          onChange={e => onSeek(Number(e.target.value))}
          aria-label="Position dans la partie"
          aria-valuetext={`Coup ${val} sur ${max}`}
        />
        <span style={{
          flexShrink: 0, minWidth: 52, textAlign: 'right',
          font: `600 11.5px ${fonts.mono}`, color: ui.textDim, fontVariantNumeric: 'tabular-nums',
        }}>{val}/{max}</span>
      </div>

      {/* vitesse */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ font: `700 9.5px ${fonts.body}`, letterSpacing: '0.1em', textTransform: 'uppercase', color: ui.textMute }}>Vitesse</span>
        <div style={{ display: 'inline-flex', gap: 4, background: ui.bg, border: `1px solid ${ui.line}`, borderRadius: ui.radius.pill, padding: 3 }}>
          {SPEEDS.map(s => {
            const on = speed === s
            return (
              <button
                key={s} type="button" className="rs-speed"
                onClick={() => onSpeed?.(s)} aria-pressed={on}
                style={{
                  appearance: 'none', border: 0, cursor: 'pointer',
                  padding: '4px 11px', borderRadius: ui.radius.pill,
                  font: `700 11.5px ${fonts.mono}`, fontVariantNumeric: 'tabular-nums',
                  background: on ? accent : 'transparent',
                  color: on ? ui.accentInk : ui.textDim,
                  transition: 'background .14s, color .14s',
                }}
              >{s}×</button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
