// ─────────────────────────────────────────────────────────────────────────────
// SettingsTab (Dames) — réglages de l'univers, persistés localStorage (diffusion
// live vers PlayTab via useDraughtsSettings). Thème de damier, couleurs des pions,
// numéros de cases, surbrillances, animations (+ vitesse), sons (+ volume), niveau
// IA par défaut, info "prise maximale forcée" (toujours ON, règle internationale).
// Tokens = neutralTheme. Accent univers = bleu-acier (props.accent). Inline only.
// ─────────────────────────────────────────────────────────────────────────────
import { ui, fonts, damesBoard, damesPieces, DAMES_BOARD_DEFAUT } from '../../../features/games/neutralTheme.js'
import { useDraughtsSettings } from '../logic/useDraughtsSettings.js'
import { LEVELS } from '../logic/useDraughtsGame.js'
import { Panel, SectionTitle, Toggle, SettingRow, Segment, Btn } from '../ui/controls.jsx'
import MiniBoard from '../ui/MiniBoard.jsx'

const SPEEDS = [['rapide', 'Rapide'], ['normal', 'Normal'], ['lent', 'Lent']]
const PREVIEW_ROWS = ['.c.c', 'c.c.', '.p.p', 'p.p.']

export default function SettingsTab({ accent = ui.accent }) {
  const { settings, update, reset } = useDraughtsSettings()
  const s = settings

  return (
    <div style={{ minHeight: '100%', padding: 'clamp(18px, 3vw, 40px) clamp(16px, 4vw, 48px)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 960 }}>
        <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, marginBottom: 26 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: accent, fontWeight: 700 }}>Dames internationales</div>
            <h1 style={{ margin: '8px 0 0', fontFamily: fonts.display, fontWeight: 800, fontSize: 'clamp(26px, 4.4vw, 36px)', color: ui.text, letterSpacing: '-.5px' }}>Paramètres</h1>
          </div>
          <Btn accent={accent} onClick={reset}>Réinitialiser</Btn>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, alignItems: 'start' }}>

          {/* Plateau */}
          <Panel>
            <SectionTitle accent={accent} hint="Habillage du damier et lisibilité des cases.">Plateau</SectionTitle>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <MiniBoard rows={PREVIEW_ROWS} accent={accent} size={132} />
              <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(damesBoard).map(([id, t]) => {
                  const on = (s.boardTheme || DAMES_BOARD_DEFAUT) === id
                  return (
                    <button key={id} onClick={() => update({ boardTheme: id })}
                      style={{ appearance: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, padding: '8px 11px', borderRadius: ui.radius.md, background: on ? ui.surfaceHi : 'transparent', border: `1px solid ${on ? accent : ui.line}`, transition: 'border-color .15s, background .15s' }}>
                      <span aria-hidden style={{ display: 'flex', width: 30, height: 30, borderRadius: 6, overflow: 'hidden', boxShadow: `0 0 0 1px ${ui.line}` }}>
                        <span style={{ flex: 1, background: t.clair }} /><span style={{ flex: 1, background: t.sombre }} />
                      </span>
                      <span style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: 13.5, color: on ? ui.text : ui.textDim }}>{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <SettingRow title="Numéros de cases" desc="Numérotation internationale 1–50.">
              <Toggle accent={accent} checked={s.coords} onChange={(v) => update({ coords: v })} label="Numéros de cases" />
            </SettingRow>
          </Panel>

          {/* Pions */}
          <Panel>
            <SectionTitle accent={accent} hint="Les pions restent neutres : graphite (Foncé) et ivoire (Clair), dame liserée d’or.">Pions</SectionTitle>
            <div style={{ display: 'flex', gap: 18, justifyContent: 'center', padding: '6px 0 4px' }}>
              {[['fonce', 'Foncé'], ['clair', 'Clair']].map(([k, lbl]) => {
                const c = damesPieces[k]
                return (
                  <div key={k} style={{ textAlign: 'center' }}>
                    <span aria-hidden style={{ display: 'inline-grid', placeItems: 'center', width: 46, height: 46, borderRadius: '50%', background: `radial-gradient(circle at 38% 30%, ${c.haut}, ${c.base} 60%, ${c.bord})`, boxShadow: `inset 0 -4px 8px rgba(0,0,0,.4), 0 3px 7px rgba(0,0,0,.4)` }} />
                    <div style={{ fontSize: 11.5, color: ui.textDim, fontWeight: 600, marginTop: 7 }}>{lbl}</div>
                  </div>
                )
              })}
              <div style={{ textAlign: 'center' }}>
                <span aria-hidden style={{ display: 'inline-grid', placeItems: 'center', width: 46, height: 46, borderRadius: '50%', background: `radial-gradient(circle at 38% 30%, ${damesPieces.fonce.haut}, ${damesPieces.fonce.base})`, boxShadow: `inset 0 0 0 3px ${damesPieces.roi}, 0 3px 7px rgba(0,0,0,.4)` }}>
                  <svg viewBox="0 0 24 24" aria-hidden style={{ width: 20, height: 20 }}><path d="M3 8l3.5 3L12 5l5.5 6L21 8l-1.6 9H4.6L3 8z" fill="none" stroke={damesPieces.roi} strokeWidth="1.8" strokeLinejoin="round" /></svg>
                </span>
                <div style={{ fontSize: 11.5, color: ui.textDim, fontWeight: 600, marginTop: 7 }}>Dame</div>
              </div>
            </div>
            <SettingRow title="Surbrillances" desc="Coups légaux, cibles et rafle obligatoire sur le plateau.">
              <Toggle accent={accent} checked={s.highlights} onChange={(v) => update({ highlights: v })} label="Surbrillances" />
            </SettingRow>
          </Panel>

          {/* Animations */}
          <Panel>
            <SectionTitle accent={accent} hint="Déplacements, rafles et couronnements.">Animations</SectionTitle>
            <SettingRow title="Animations" desc="Désactivez pour un rendu instantané.">
              <Toggle accent={accent} checked={s.animations} onChange={(v) => update({ animations: v })} label="Animations" />
            </SettingRow>
            <SettingRow title="Vitesse">
              <Segment items={SPEEDS} value={s.animSpeed} onChange={(v) => update({ animSpeed: v })} accent={accent} size="sm" />
            </SettingRow>
          </Panel>

          {/* Sons */}
          <Panel>
            <SectionTitle accent={accent} hint="Effets sonores synthétisés, sobres.">Sons</SectionTitle>
            <SettingRow title="Effets sonores">
              <Toggle accent={accent} checked={s.sounds} onChange={(v) => update({ sounds: v })} label="Sons" />
            </SettingRow>
            <SettingRow title="Volume">
              <input type="range" min={0} max={1} step={0.05} value={s.volume} disabled={!s.sounds}
                onChange={(e) => update({ volume: parseFloat(e.target.value) })}
                aria-label="Volume"
                style={{ width: 150, accentColor: accent, opacity: s.sounds ? 1 : 0.4, cursor: s.sounds ? 'pointer' : 'not-allowed' }} />
            </SettingRow>
          </Panel>

          {/* Jeu / IA */}
          <Panel style={{ gridColumn: '1 / -1' }}>
            <SectionTitle accent={accent} hint="Niveau de l’adversaire en solo et règles de la partie.">Jeu</SectionTitle>
            <SettingRow title="Niveau de l’IA par défaut" desc="Appliqué à la prochaine partie solo.">
              <Segment items={LEVELS} value={s.aiLevel} onChange={(v) => update({ aiLevel: v })} accent={accent} size="sm" />
            </SettingRow>
            <SettingRow title="Prise maximale forcée" desc="Règle internationale : capturer est obligatoire, et toujours la rafle la plus longue. Non désactivable.">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: ui.radius.pill, background: `${accent}1c`, border: `1px solid ${accent}55`, color: accent, fontFamily: fonts.body, fontWeight: 700, fontSize: 12, letterSpacing: '.4px' }}>
                <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />Toujours active
              </span>
            </SettingRow>
            <SettingRow title="Dames volantes" desc="Les dames se déplacent et capturent à distance sur la diagonale. Standard 10×10.">
              <span style={{ fontFamily: fonts.body, fontSize: 12.5, color: ui.textMute, fontWeight: 600 }}>Activées</span>
            </SettingRow>
          </Panel>
        </div>

        <p style={{ margin: '20px 2px 0', fontFamily: fonts.body, fontSize: 12, color: ui.textMute, lineHeight: 1.55 }}>
          Réglages enregistrés sur cet appareil.
        </p>
      </div>
    </div>
  )
}
