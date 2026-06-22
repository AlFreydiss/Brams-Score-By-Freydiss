// ── /echecs : hub du module — choix du mode, profil ELO, leaderboard ─────────
// Lobby NEUTRE PREMIUM (niveau chess.com / lichess) : cartes de mode épurées,
// chips de cadence par famille, sélecteur de thème de plateau, carte profil +
// leaderboard. Tokens via neutralTheme (THEME). Styles inline only.
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import SoloVsIA from './modes/SoloVsIA.jsx'
import Matchmaking from './modes/Matchmaking.jsx'
import MultiOnline from './modes/MultiOnline.jsx'
import DeuxJoueursLocal from './modes/DeuxJoueursLocal.jsx'
import { assurerProfil, getProfil, getLeaderboard, getPartieEnCours } from './lib/api.js'
import { rangPourElo } from './lib/elo.js'
import {
  THEME, modeTroisD, setModeTroisD, THEMES_PLATEAU, themePlateau, setThemePlateau,
  CADENCES, CADENCE_CATEGORIES, CADENCE_DEFAUT, CLE_CADENCE,
} from './constants.js'
import { sons, isMuted, setMuted } from './lib/sons.js'
import BarreJeu from '../../components/BarreJeu.jsx'

// ── Icônes SVG inline (pas d'emoji UI ; trait fin, héritent currentColor) ─────
const Icon = ({ d, size = 22, fill = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {d}
  </svg>
)
const ICONS = {
  ia: <Icon d={<><rect x="4" y="8" width="16" height="11" rx="2" /><path d="M12 8V4M9 4h6M8.5 13h.01M15.5 13h.01M9 16.5h6" /></>} />,
  online: <Icon d={<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.4 2.5 15.6 0 18M12 3c-2.5 2.4-2.5 15.6 0 18" /></>} />,
  local: <Icon d={<><circle cx="8" cy="9" r="2.4" /><circle cx="16" cy="9" r="2.4" /><path d="M3.5 19c0-2.5 2-4.2 4.5-4.2S12.5 16.5 12.5 19M11.5 19c0-2.5 2-4.2 4.5-4.2S20.5 16.5 20.5 19" /></>} />,
  board: <Icon d={<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></>} />,
  trophy: <Icon d={<><path d="M6 4h12v3a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V4ZM6 6H4v1a2 2 0 0 0 2 2M18 6h2v1a2 2 0 0 1-2 2M10 11v3M14 11v3M8 19h8M9 16h6v3H9z" /></>} />,
  cube: <Icon d={<><path d="M12 3 4 7v10l8 4 8-4V7l-8-4ZM4 7l8 4 8-4M12 11v10" /></>} size={18} />,
  grid: <Icon d={<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /></>} size={18} />,
  sound: <Icon d={<><path d="M11 5 6 9H3v6h3l5 4V5ZM15.5 8.5a5 5 0 0 1 0 7M18 6a8 8 0 0 1 0 12" /></>} size={18} />,
  mute: <Icon d={<><path d="M11 5 6 9H3v6h3l5 4V5ZM22 9l-6 6M16 9l6 6" /></>} size={18} />,
  arrow: <Icon d={<path d="M5 12h14M13 6l6 6-6 6" />} size={16} />,
  resume: <Icon d={<><circle cx="12" cy="12" r="9" /><path d="m10 8 5 4-5 4V8Z" /></>} size={18} />,
  lock: <Icon d={<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>} size={15} />,
}

// ── Carte de mode (clavier-accessible, hover sobre) ───────────────────────────
function CarteMode({ icon, titre, texte, cta, onClick, desactive, note, primaire }) {
  const [hover, setHover] = useState(false)
  const focusable = !desactive
  return (
    <div
      role="button" tabIndex={focusable ? 0 : -1} aria-disabled={desactive}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)} onBlur={() => setHover(false)}
      onClick={desactive ? undefined : onClick}
      onKeyDown={e => { if (!desactive && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick?.() } }}
      style={{
        flex: '1 1 240px', minWidth: 240, padding: '22px 22px 20px', borderRadius: THEME.radius.lg,
        background: hover && !desactive ? THEME.surfaceHi : THEME.surface,
        border: `1px solid ${hover && !desactive ? 'rgba(200,164,92,0.45)' : THEME.cardBorder}`,
        boxShadow: hover && !desactive ? '0 22px 48px -26px rgba(0,0,0,.75)' : '0 14px 34px -26px rgba(0,0,0,.6)',
        cursor: desactive ? 'default' : 'pointer', transition: 'border-color .18s, background .18s, transform .18s, box-shadow .18s',
        transform: hover && !desactive ? 'translateY(-2px)' : 'none', opacity: desactive ? 0.62 : 1,
        outline: 'none', position: 'relative', overflow: 'hidden',
      }}
    >
      {primaire && (
        <span style={{ position: 'absolute', top: 14, right: 14, fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: THEME.accentInk, background: `linear-gradient(135deg, ${THEME.goldHi}, ${THEME.gold})`, padding: '3px 9px', borderRadius: 999 }}>Classé</span>
      )}
      <div style={{
        width: 46, height: 46, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover && !desactive ? 'rgba(200,164,92,0.14)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${THEME.cardBorder}`, color: hover && !desactive ? THEME.goldHi : THEME.textDim,
        transition: 'color .18s, background .18s',
      }}>{icon}</div>
      <h3 style={{ margin: '14px 0 6px', fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 19, color: THEME.text, letterSpacing: '-0.01em' }}>{titre}</h3>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: THEME.textDim }}>{texte}</p>
      <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 13, color: desactive ? THEME.muted : THEME.goldHi }}>
        {desactive ? note : <>{cta} {ICONS.arrow}</>}
      </div>
    </div>
  )
}

// ── Chips de cadence (groupées par famille) — purement informatives au lobby ──
function CadencesApercu({ cadence, onPick }) {
  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.cardBorder}`, borderRadius: THEME.radius.lg, padding: '16px 18px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: THEME.muted, marginBottom: 12 }}>Cadences</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {CADENCE_CATEGORIES.map(cat => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ width: 74, flexShrink: 0, fontSize: 12, fontWeight: 700, color: THEME.textDim }}>{cat}</span>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {CADENCES.filter(c => c.cat === cat).map(c => {
                const actif = c.id === cadence
                return (
                  <button key={c.id} onClick={() => onPick(c.id)} aria-pressed={actif} style={{
                    fontFamily: THEME.fontMono, fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums',
                    padding: '6px 12px', borderRadius: 999, cursor: 'pointer', minHeight: 30,
                    color: actif ? THEME.accentInk : THEME.text,
                    background: actif ? `linear-gradient(135deg, ${THEME.goldHi}, ${THEME.gold})` : THEME.surfaceHi,
                    border: `1px solid ${actif ? 'transparent' : THEME.cardBorder}`,
                    transition: 'background .15s, color .15s, border-color .15s',
                  }}>{c.id}</button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Sélecteur de thème de plateau (mini swatches, façon chess.com) ────────────
function SelecteurTheme({ themeP, onPick }) {
  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.cardBorder}`, borderRadius: THEME.radius.lg, padding: '16px 18px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: THEME.muted, marginBottom: 12 }}>Thème du plateau</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {Object.values(THEMES_PLATEAU).map(t => {
          const actif = t.id === themeP
          return (
            <button key={t.id} onClick={() => onPick(t.id)} aria-pressed={actif} title={t.label} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer',
              padding: 6, borderRadius: 12, background: 'transparent',
              border: `1px solid ${actif ? 'rgba(200,164,92,0.55)' : 'transparent'}`,
            }}>
              <span style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', width: 38, height: 38, borderRadius: 8, overflow: 'hidden', boxShadow: actif ? '0 0 0 2px rgba(200,164,92,0.4)' : '0 0 0 1px rgba(0,0,0,.4)' }}>
                <span style={{ background: t.claire }} /><span style={{ background: t.foncee }} />
                <span style={{ background: t.foncee }} /><span style={{ background: t.claire }} />
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: actif ? THEME.goldHi : THEME.textDim }}>{t.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Leaderboard({ entries }) {
  if (!entries?.length) return null
  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.cardBorder}`, borderRadius: THEME.radius.lg, padding: '16px 18px' }}>
      <h3 style={{ margin: '0 0 12px', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 16, color: THEME.text }}>
        <span style={{ color: THEME.goldHi }}>{ICONS.trophy}</span> Meilleurs ELO
      </h3>
      {entries.map((e, i) => {
        const rang = rangPourElo(e.elo)
        return (
          <div key={e.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderTop: i ? `1px solid ${THEME.cardBorder}` : 'none' }}>
            <span style={{ width: 22, textAlign: 'center', fontWeight: 800, fontSize: 13, fontFamily: THEME.fontMono, color: i < 3 ? THEME.goldHi : THEME.muted }}>{i + 1}</span>
            {e.avatar
              ? <img loading="lazy" decoding="async" src={e.avatar} alt="" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} />
              : <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: THEME.muted }}>♟</span>}
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: THEME.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.pseudo || 'Joueur'}</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: rang.couleur }}>{rang.label}</span>
            <span style={{ fontFamily: THEME.fontMono, fontWeight: 700, fontSize: 14, color: THEME.goldHi, fontVariantNumeric: 'tabular-nums' }}>{e.elo}</span>
          </div>
        )
      })}
    </div>
  )
}

function MonProfil({ profil, pseudo, avatar }) {
  const elo = profil?.elo ?? 1200
  const rang = rangPourElo(elo)
  return (
    <div style={{ background: THEME.surface, border: `1px solid ${THEME.cardBorder}`, borderRadius: THEME.radius.lg, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {avatar
          ? <img loading="lazy" decoding="async" src={avatar} alt="" style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover' }} />
          : <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: THEME.muted }}>♟</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 16, color: THEME.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pseudo}</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: rang.couleur, marginTop: 2 }}>{rang.label} · {rang.zone}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: THEME.fontMono, fontWeight: 700, fontSize: 26, color: THEME.goldHi, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{elo}</div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: THEME.muted, textTransform: 'uppercase', marginTop: 3 }}>ELO</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {[
          { l: 'Parties', v: profil?.parties ?? 0, c: THEME.text },
          { l: 'Victoires', v: profil?.victoires ?? 0, c: THEME.success },
          { l: 'Nulles', v: profil?.nulles ?? 0, c: THEME.blue },
          { l: 'Défaites', v: profil?.defaites ?? 0, c: THEME.accent },
          { l: 'Record', v: profil?.plus_haut_elo ?? elo, c: THEME.goldHi },
        ].map(s => (
          <div key={s.l} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: THEME.surfaceHi, border: `1px solid ${THEME.cardBorder}` }}>
            <div style={{ fontFamily: THEME.fontMono, fontWeight: 700, fontSize: 16, color: s.c, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: THEME.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 3 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Bouton de la barre (chrome neutre, accessible) ────────────────────────────
function BoutonBarre({ onClick, title, actif, children }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} style={{
      height: 38, minWidth: 38, padding: '0 12px', borderRadius: 11, cursor: 'pointer',
      fontSize: 13, fontWeight: 700, fontFamily: THEME.fontBody,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      background: actif ? 'rgba(200,164,92,0.12)' : THEME.surface,
      border: `1px solid ${actif ? 'rgba(200,164,92,0.42)' : THEME.cardBorder}`,
      color: actif ? THEME.goldHi : THEME.text, transition: 'background .15s, border-color .15s',
    }}>{children}</button>
  )
}

export default function EchecsPage() {
  const { userId, displayName, avatarUrl, isAuthenticated, signInWithDiscord } = useAuth()
  const [mode, setMode] = useState({ type: 'hub' })   // hub | solo | local | matchmaking | partie
  const [profil, setProfil] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [partieEnCours, setPartieEnCours] = useState(null)
  const [mute, setMute] = useState(isMuted())
  const [troisD, setTroisD] = useState(modeTroisD())
  const [themeP, setThemeP] = useState(() => themePlateau().id)
  const [cadence, setCadence] = useState(() => { try { return localStorage.getItem(CLE_CADENCE) || CADENCE_DEFAUT } catch { return CADENCE_DEFAUT } })

  const choisirCadence = useCallback(id => {
    setCadence(id)
    try { localStorage.setItem(CLE_CADENCE, id) } catch {}
  }, [])

  const rechargerHub = useCallback(() => {
    if (!userId) return
    getProfil(userId).then(setProfil)
    getPartieEnCours(userId).then(setPartieEnCours)
  }, [userId])

  useEffect(() => {
    getLeaderboard(10).then(setLeaderboard)
    if (userId) {
      assurerProfil(displayName, avatarUrl).then(() => rechargerHub())
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (mode.type === 'hub') { rechargerHub(); getLeaderboard(10).then(setLeaderboard) } }, [mode.type, rechargerHub])

  const ouvrirPartie = useCallback(id => setMode({ type: 'partie', id }), [])

  // en partie : header compact + page large pour laisser TOUTE la place au plateau
  const enJeu = ['solo', 'local', 'partie'].includes(mode.type)

  return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(1100px 480px at 50% -10%, rgba(200,164,92,0.06), transparent 60%), ${THEME.bg}`, paddingBottom: enJeu ? 24 : 80 }}>
      <BarreJeu titre="Échecs">
        {!troisD && (
          <BoutonBarre
            onClick={() => {
              const ids = Object.keys(THEMES_PLATEAU)
              const next = ids[(ids.indexOf(themeP) + 1) % ids.length]
              setThemeP(next); setThemePlateau(next)
            }}
            title={`Thème du plateau : ${THEMES_PLATEAU[themeP]?.label}`}
          >
            <span style={{ display: 'inline-flex', width: 15, height: 15, borderRadius: 4, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(0,0,0,.3)' }}>
              <span style={{ width: 7.5, background: THEMES_PLATEAU[themeP]?.claire }} />
              <span style={{ width: 7.5, background: THEMES_PLATEAU[themeP]?.foncee }} />
            </span>
          </BoutonBarre>
        )}
        <BoutonBarre
          onClick={() => { const v = !troisD; setTroisD(v); setModeTroisD(v) }}
          title={troisD ? 'Passer en vue 2D classique' : 'Passer en vue 3D'} actif={troisD}
        >
          {troisD ? ICONS.cube : ICONS.grid} {troisD ? '3D' : '2D'}
        </BoutonBarre>
        <BoutonBarre
          onClick={() => { const m = !mute; setMute(m); setMuted(m); sons.debloquer() }}
          title={mute ? 'Activer les sons' : 'Couper les sons'}
        >
          {mute ? ICONS.mute : ICONS.sound}
        </BoutonBarre>
      </BarreJeu>

      <div style={{ maxWidth: enJeu ? 1640 : 1120, margin: '0 auto', padding: '20px 18px 0', fontFamily: THEME.fontBody }}>

        {mode.type === 'hub' && (
          <>
            <div style={{ marginBottom: 22 }}>
              <h1 style={{ margin: 0, fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 'clamp(26px,4vw,38px)', color: THEME.text, letterSpacing: '-0.02em' }}>
                Jouer aux échecs
              </h1>
              <p style={{ margin: '6px 0 0', color: THEME.textDim, fontSize: 14.5, maxWidth: 560 }}>
                Affronte Stockfish ou les membres de la communauté. Horloges, classement ELO, analyse moteur post-partie.
              </p>
            </div>

            {partieEnCours && (
              <div
                role="button" tabIndex={0}
                onClick={() => ouvrirPartie(partieEnCours.id)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrirPartie(partieEnCours.id) } }}
                style={{ marginBottom: 18, padding: '14px 18px', borderRadius: THEME.radius.md, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(200,164,92,0.08)', border: '1px solid rgba(200,164,92,0.4)', outline: 'none' }}
              >
                <span style={{ color: THEME.goldHi }}>{ICONS.resume}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14.5, color: THEME.goldHi }}>Partie en cours</div>
                  <div style={{ fontSize: 12.5, color: THEME.textDim }}>
                    {partieEnCours.blanc_pseudo} vs {partieEnCours.noir_pseudo} · {partieEnCours.cadence}
                  </div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 13.5, color: THEME.goldHi }}>Reprendre {ICONS.arrow}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
              <CarteMode
                icon={ICONS.ia} titre="Contre l'IA"
                texte="Six niveaux calibrés ou une force sur-mesure réglable à l'ELO. Partie non classée, coup annulable, indices."
                cta="Choisir un niveau" onClick={() => setMode({ type: 'solo' })}
              />
              <CarteMode
                icon={ICONS.online} titre="En ligne classé" primaire
                texte="Matchmaking par ELO contre les membres. Horloges serveur, nulle, abandon, revanche — ton classement en jeu."
                cta="Trouver un adversaire"
                onClick={() => (isAuthenticated ? setMode({ type: 'matchmaking' }) : signInWithDiscord?.())}
                desactive={!isAuthenticated}
                note={<><span style={{ display: 'inline-flex', verticalAlign: '-2px', marginRight: 5 }}>{ICONS.lock}</span>Connexion Discord requise</>}
              />
              <CarteMode
                icon={ICONS.local} titre="2 joueurs"
                texte="Le plateau complet sur un seul écran : parfait pour jouer à deux sur le canapé ou poser une position."
                cta="Jouer en local" onClick={() => setMode({ type: 'local' })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 14 }}>
              <CadencesApercu cadence={cadence} onPick={choisirCadence} />
              <SelecteurTheme themeP={themeP} onPick={id => { setThemeP(id); setThemePlateau(id) }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 14 }}>
              {isAuthenticated && <MonProfil profil={profil} pseudo={displayName} avatar={avatarUrl} />}
              <Leaderboard entries={leaderboard} />
            </div>
          </>
        )}

        {mode.type === 'solo' && (
          <SoloVsIA profil={profil} pseudo={displayName || 'Moi'} avatar={avatarUrl} troisD={troisD} onQuitter={() => setMode({ type: 'hub' })} />
        )}
        {mode.type === 'local' && (
          <DeuxJoueursLocal troisD={troisD} onQuitter={() => setMode({ type: 'hub' })} />
        )}
        {mode.type === 'matchmaking' && (
          <Matchmaking
            monUid={userId} pseudo={displayName} avatar={avatarUrl} profil={profil}
            onPartieTrouvee={ouvrirPartie}
            onQuitter={() => setMode({ type: 'hub' })}
          />
        )}
        {mode.type === 'partie' && (
          <MultiOnline
            partieId={mode.id} monUid={userId} troisD={troisD}
            onQuitter={() => setMode({ type: 'hub' })}
            onRejoindrePartie={ouvrirPartie}
          />
        )}
      </div>
    </div>
  )
}
