// ── Fond décoratif doré (style Undercover) ───────────────────────────────────
// Couches de lumière or + grille fine + notes de musique dorées qui tombent
// doucement du haut + traînées lumineuses lentes. Sobre, stylé, AUCUN pétale.
// Réutilisé sur Blind Test, Le Fil… Layer fixe plein écran.
// base = derrière le contenu (zIndex), notes devant (particlesZIndex).
import { useMemo } from 'react'
import { createPortal } from 'react-dom'

const NOTE_GLYPHS = ['♪', '♫', '♩', '♬', '𝄞']

const CSS = `
  @keyframes gbx-breathe { 0%,100%{opacity:.45} 50%{opacity:.8} }
  @keyframes gbx-fall { 0%{transform:translateY(-12vh) rotate(-8deg);opacity:0} 10%{opacity:1} 88%{opacity:1} 100%{transform:translateY(112vh) rotate(10deg);opacity:0} }
  @keyframes gbx-sway { 0%,100%{margin-left:-12px} 50%{margin-left:12px} }
  @keyframes gbx-sheen { 0%{transform:translateX(-30%) rotate(8deg);opacity:0} 50%{opacity:.5} 100%{transform:translateX(130%) rotate(8deg);opacity:0} }
  @keyframes gbx-eq { 0%,100%{transform:scaleY(.22)} 50%{transform:scaleY(1)} }
  @media (prefers-reduced-motion: reduce){ .gbx-note,.gbx-sheen,.gbx-eqbar{ animation:none !important } }
`

// notesOnly : ne rend QUE les notes qui tombent. Utilisé quand la page a déjà
// son propre décor — les couches base (grille animée, sheen, équaliseur) sous
// un overlay sombre créent du ghosting (formes/bandes qui transparaissent).
export default function GoldBackdrop({ count = 16, zIndex = 0, particlesZIndex = 1, portalNotes = false, notesOnly = false }) {
  // Notes de musique qui tombent du haut, sobrement (thème blind test).
  const notes = useMemo(() => Array.from({ length: count }, (_, i) => {
    const r = (n) => ((Math.sin(i * 73.13 + n * 19.7) + 1) / 2)
    return {
      left: Math.round(r(1) * 96) + 2,
      size: 13 + Math.round(r(2) * 22),
      dur: 16 + Math.round(r(3) * 16),
      delay: -Math.round(r(4) * 26),
      sway: 5 + Math.round(r(5) * 5),
      opacity: 0.10 + r(6) * 0.16,
      glyph: NOTE_GLYPHS[i % NOTE_GLYPHS.length],
    }
  }), [count])

  // Motif équaliseur (thème musique) : barres dorées qui pulsent en bas.
  const bars = useMemo(() => Array.from({ length: 48 }, (_, i) => {
    const r = (n) => ((Math.sin(i * 41.7 + n * 7.3) + 1) / 2)
    return { dur: 0.7 + r(1) * 1.4, delay: -r(2) * 2, h: 26 + Math.round(r(3) * 70) }
  }), [])

  return (
    <>
      <style>{CSS}</style>

      {/* Couches de couleur (or profond) */}
      {!notesOnly && (
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `
          radial-gradient(900px 540px at 14% -8%, rgba(212,175,90,0.16), transparent 60%),
          radial-gradient(760px 520px at 88% 6%, rgba(255,205,110,0.10), transparent 62%),
          radial-gradient(820px 680px at 50% 118%, rgba(160,120,40,0.10), transparent 64%),
          linear-gradient(180deg, #0b0a07 0%, #0e0c08 56%, #0a0906 100%)` }} />
        {/* Grille fine dorée, masquée en fondu */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.5, animation: 'gbx-breathe 12s ease-in-out infinite',
          backgroundImage: 'linear-gradient(rgba(212,175,90,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,90,.05) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'linear-gradient(180deg, transparent, black 14%, black 78%, transparent)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent, black 14%, black 78%, transparent)' }} />
        {/* Traînée lumineuse oblique très lente (effet "stylé") */}
        <div style={{ position: 'absolute', top: '-20%', left: 0, width: '40%', height: '140%',
          background: 'linear-gradient(90deg, transparent, rgba(255,210,120,0.05), transparent)',
          filter: 'blur(40px)', animation: 'gbx-sheen 16s ease-in-out infinite' }} />

        {/* Motif équaliseur animé (thème musique du blind test) — barres dorées en bas, discret */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 180, display: 'flex', alignItems: 'flex-end', gap: 3, padding: '0 8px',
          opacity: 0.34, maskImage: 'linear-gradient(180deg, transparent, black 78%)', WebkitMaskImage: 'linear-gradient(180deg, transparent, black 78%)' }}>
          {bars.map((b, i) => (
            <span key={i} className="gbx-eqbar" style={{
              flex: 1, height: `${b.h}%`, transformOrigin: 'bottom', borderRadius: '3px 3px 0 0',
              background: 'linear-gradient(180deg, rgba(226,190,110,.5), rgba(160,120,40,.06))',
              animation: `gbx-eq ${b.dur}s ease-in-out ${b.delay}s infinite`,
            }} />
          ))}
        </div>
      </div>
      )}

      {/* Notes de musique dorées qui tombent du haut (devant le contenu, décoratives).
          portalNotes : rendues dans document.body pour echapper aux stacking contexts
          parents (ex. isolation:isolate de PageLayout) et passer au-dessus de tout. */}
      {(() => {
        const layer = (
          <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: particlesZIndex, pointerEvents: 'none', overflow: 'hidden' }}>
            {notes.map((n, i) => (
              <span key={i} className="gbx-note" style={{
                position: 'absolute', top: '-12vh', left: `${n.left}%`,
                fontSize: n.size, lineHeight: 1, color: 'rgba(226,190,110,1)', opacity: n.opacity,
                textShadow: '0 0 10px rgba(226,190,110,.35)',
                animation: `gbx-fall ${n.dur}s linear ${n.delay}s infinite`,
              }}>
                <span style={{ display: 'inline-block', animation: `gbx-sway ${n.sway}s ease-in-out infinite` }}>{n.glyph}</span>
              </span>
            ))}
          </div>
        )
        return portalNotes ? createPortal(layer, document.body) : layer
      })()}
    </>
  )
}
