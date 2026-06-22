// ── SettingsTab (Échecs) : préférences complètes, persistées localStorage ───
// Sections : Échiquier · Jeu · Animations · Sons · IA. Persistance via
// useChessSettings (clé 'brams_chess_settings') + module sons (volume/mute).
// Pas de helper game_settings Supabase trivial disponible → localStorage only
// (documenté ici et dans useChessSettings.js). Aperçu live du board (MiniBoard).
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import { useChessSettings } from '../logic/useChessSettings.js'
import { BOARD_IDS, boardParId } from '../logic/boards.js'
import { NIVEAUX_IA } from '../../../features/echecs/lib/niveauxIA.js'
import MiniBoard from '../ui/MiniBoard.jsx'

const BRASS = '#b09467'
const FEN_APERCU = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1'

function Section({ titre, children }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <h3 style={{ margin: '0 0 12px', font: `700 12px ${fonts.body}`, letterSpacing: '0.09em', textTransform: 'uppercase', color: ui.textMute }}>{titre}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </section>
  )
}

function Ligne({ label, hint, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      padding: '11px 14px', borderRadius: ui.radius.sm, background: ui.surface, border: `1px solid ${ui.line}`,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ font: `600 13.5px ${fonts.body}`, color: ui.text }}>{label}</div>
        {hint && <div style={{ font: `400 11.5px ${fonts.body}`, color: ui.textMute, marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function Toggle({ on, onChange }) {
  return (
    <button
      role="switch" aria-checked={on} onClick={() => onChange(!on)}
      style={{
        width: 44, height: 25, borderRadius: 999, cursor: 'pointer', position: 'relative',
        background: on ? BRASS : ui.surfaceHi, border: `1px solid ${on ? BRASS : ui.lineHi}`,
        transition: 'background .18s, border-color .18s',
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: on ? 21 : 2, width: 19, height: 19, borderRadius: '50%',
        background: on ? '#15110a' : ui.text, transition: 'left .18s',
      }} />
    </button>
  )
}

function Segments({ value, options, onChange }) {
  return (
    <div style={{ display: 'inline-flex', gap: 4, background: ui.bg, padding: 3, borderRadius: ui.radius.sm, border: `1px solid ${ui.line}` }}>
      {options.map(o => {
        const a = value === o.id
        return (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            padding: '5px 11px', borderRadius: 6, cursor: 'pointer', border: 'none',
            font: `600 12px ${fonts.body}`, color: a ? '#15110a' : ui.textDim,
            background: a ? BRASS : 'transparent', transition: 'background .15s, color .15s',
          }}>{o.l}</button>
        )
      })}
    </div>
  )
}

export default function SettingsTab() {
  const { reglages, set, volume, setVolume, muet, setMuet, reinitialiser } = useChessSettings()

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '22px 18px 50px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 28, alignItems: 'start' }}>
        <div>
          <h2 style={{ margin: '0 0 22px', font: `800 24px ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text }}>Paramètres</h2>

          <Section titre="Échiquier">
            <Ligne label="Thème de l'échiquier" hint="Couleurs des cases">
              <Segments value={reglages.board} onChange={v => set({ board: v })}
                options={BOARD_IDS.map(id => ({ id, l: boardParId(id).label }))} />
            </Ligne>
            <Ligne label="Jeu de pièces" hint="cburnett (par défaut)">
              <Segments value={reglages.pieceSet} onChange={v => set({ pieceSet: v })}
                options={[{ id: 'cburnett', l: 'cburnett' }]} />
            </Ligne>
            <Ligne label="Coordonnées" hint="a–h / 1–8 autour du plateau">
              <Toggle on={reglages.coords} onChange={v => set({ coords: v })} />
            </Ligne>
            <Ligne label="Surbrillance des coups légaux" hint="Pastilles sur les cases jouables">
              <Toggle on={reglages.surbrillanceLegale} onChange={v => set({ surbrillanceLegale: v })} />
            </Ligne>
          </Section>

          <Section titre="Jeu">
            <Ligne label="Promotion automatique en Dame" hint="Sinon, choix Dame / Tour / Fou / Cavalier">
              <Toggle on={reglages.autoQueen} onChange={v => set({ autoQueen: v })} />
            </Ligne>
            <Ligne label="Retourner l'échiquier (2 joueurs)" hint="Le plateau pivote à chaque coup en local">
              <Toggle on={reglages.autoFlipLocal} onChange={v => set({ autoFlipLocal: v })} />
            </Ligne>
            <Ligne label="Coups anticipés (premoves)" hint="Préparer un coup pendant le tour adverse (vs IA)">
              <Toggle on={reglages.premoves} onChange={v => set({ premoves: v })} />
            </Ligne>
          </Section>

          <Section titre="Animations">
            <Ligne label="Animer les pièces">
              <Toggle on={reglages.animations} onChange={v => set({ animations: v })} />
            </Ligne>
            <Ligne label="Vitesse d'animation" hint={`${reglages.vitesseAnim} ms`}>
              <input type="range" min={80} max={400} step={20} value={reglages.vitesseAnim}
                disabled={!reglages.animations}
                onChange={e => set({ vitesseAnim: parseInt(e.target.value, 10) })}
                aria-label="Vitesse d'animation"
                style={{ width: 150, accentColor: BRASS, opacity: reglages.animations ? 1 : 0.4 }} />
            </Ligne>
          </Section>

          <Section titre="Sons">
            <Ligne label="Activer les sons">
              <Toggle on={!muet} onChange={v => setMuet(!v)} />
            </Ligne>
            <Ligne label="Volume" hint={`${Math.round(volume * 100)}%`}>
              <input type="range" min={0} max={1} step={0.05} value={volume}
                disabled={muet}
                onChange={e => setVolume(parseFloat(e.target.value))}
                aria-label="Volume"
                style={{ width: 150, accentColor: BRASS, opacity: muet ? 0.4 : 1 }} />
            </Ligne>
          </Section>

          <Section titre="Intelligence artificielle">
            <Ligne label="Niveau par défaut" hint="Pré-sélectionné en lançant une partie">
              <select value={reglages.niveauIa} onChange={e => set({ niveauIa: e.target.value })}
                style={{
                  padding: '7px 11px', borderRadius: ui.radius.sm, cursor: 'pointer',
                  background: ui.bg, color: ui.text, border: `1px solid ${ui.lineHi}`,
                  font: `600 12.5px ${fonts.body}`,
                }}>
                {NIVEAUX_IA.map(n => <option key={n.id} value={n.id}>{n.label}{n.limitStrength ? ` (~${n.elo})` : ' (max)'}</option>)}
              </select>
            </Ligne>
          </Section>

          <button onClick={reinitialiser} style={{
            padding: '9px 16px', borderRadius: ui.radius.sm, cursor: 'pointer',
            font: `600 12.5px ${fonts.body}`, color: ui.textDim, background: 'transparent', border: `1px solid ${ui.line}`,
          }}
            onMouseEnter={e => { e.currentTarget.style.color = ui.text; e.currentTarget.style.borderColor = ui.lineHi }}
            onMouseLeave={e => { e.currentTarget.style.color = ui.textDim; e.currentTarget.style.borderColor = ui.line }}>
            Réinitialiser les paramètres
          </button>
          <p style={{ marginTop: 12, font: `400 11.5px ${fonts.body}`, color: ui.textMute }}>
            Préférences enregistrées sur cet appareil.
          </p>
        </div>

        {/* Aperçu live */}
        <div style={{ position: 'sticky', top: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <span style={{ font: `700 11px ${fonts.body}`, letterSpacing: '0.09em', textTransform: 'uppercase', color: ui.textMute }}>Aperçu</span>
          <MiniBoard fen={FEN_APERCU} taille={228} boardId={reglages.board} coords={reglages.coords} />
        </div>

        <style>{`@media (max-width:760px){ div[style*="grid-template-columns: minmax(0,1fr) auto"]{ grid-template-columns:1fr !important } }`}</style>
      </div>
    </div>
  )
}
