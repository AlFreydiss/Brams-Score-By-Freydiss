// ── /echecs : hub du module — choix du mode, profil ELO, leaderboard ─────────
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import SoloVsIA from './modes/SoloVsIA.jsx'
import Matchmaking from './modes/Matchmaking.jsx'
import MultiOnline from './modes/MultiOnline.jsx'
import DeuxJoueursLocal from './modes/DeuxJoueursLocal.jsx'
import { assurerProfil, getProfil, getLeaderboard, getPartieEnCours } from './lib/api.js'
import { rangPourElo } from './lib/elo.js'
import { THEME, modeTroisD, setModeTroisD, THEMES_PLATEAU, themePlateau, setThemePlateau } from './constants.js'
import { sons, isMuted, setMuted } from './lib/sons.js'
import BarreJeu from '../../components/BarreJeu.jsx'

function CarteMode({ emoji, titre, texte, cta, onClick, accent, desactive, note }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={desactive ? undefined : onClick}
      style={{
        flex: '1 1 240px', minWidth: 240, padding: '26px 24px', borderRadius: 20,
        background: THEME.card, backdropFilter: 'blur(10px)',
        border: `1px solid ${hover && !desactive ? (accent || THEME.gold) + '66' : THEME.cardBorder}`,
        boxShadow: hover && !desactive ? `0 24px 60px -22px ${(accent || THEME.gold)}44` : '0 16px 40px -24px rgba(0,0,0,.7)',
        cursor: desactive ? 'default' : 'pointer', transition: 'border-color .2s, box-shadow .2s, transform .2s',
        transform: hover && !desactive ? 'translateY(-3px)' : 'none', opacity: desactive ? 0.6 : 1,
      }}
    >
      <div style={{ fontSize: 38, lineHeight: 1 }}>{emoji}</div>
      <h3 style={{ margin: '12px 0 6px', fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 20, color: THEME.text }}>{titre}</h3>
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: THEME.muted }}>{texte}</p>
      <div style={{ marginTop: 16, fontWeight: 800, fontSize: 13.5, color: accent || THEME.gold }}>
        {desactive ? note : cta + ' →'}
      </div>
    </div>
  )
}

function Leaderboard({ entries }) {
  if (!entries?.length) return null
  return (
    <div style={{ background: THEME.card, border: `1px solid ${THEME.cardBorder}`, borderRadius: 20, padding: '18px 20px' }}>
      <h3 style={{ margin: '0 0 12px', fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 17, color: THEME.text }}>
        🏆 Top ELO de la communauté
      </h3>
      {entries.map((e, i) => {
        const rang = rangPourElo(e.elo)
        return (
          <div key={e.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px', borderTop: i ? `1px solid ${THEME.cardBorder}` : 'none' }}>
            <span style={{ width: 24, textAlign: 'center', fontWeight: 800, fontSize: 13, color: i < 3 ? THEME.gold : THEME.muted }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
            </span>
            {e.avatar
              ? <img loading="lazy" decoding="async" src={e.avatar} alt="" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} />
              : <span style={{ width: 28, textAlign: 'center', fontSize: 16 }}>{rang.emoji}</span>}
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: THEME.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.pseudo || 'Pirate'}</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: rang.couleur }}>{rang.label}</span>
            <span style={{ fontWeight: 800, fontSize: 14, color: THEME.gold, fontVariantNumeric: 'tabular-nums' }}>{e.elo}</span>
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
    <div style={{ background: THEME.card, border: `1px solid ${THEME.cardBorder}`, borderRadius: 20, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {avatar
          ? <img loading="lazy" decoding="async" src={avatar} alt="" style={{ width: 52, height: 52, borderRadius: 14, objectFit: 'cover' }} />
          : <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{rang.emoji}</div>}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 16, color: THEME.text }}>{pseudo}</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: rang.couleur, marginTop: 2 }}>{rang.emoji} {rang.label} · {rang.zone}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: THEME.fontDisplay, fontWeight: 800, fontSize: 26, color: THEME.gold, fontVariantNumeric: 'tabular-nums' }}>{elo}</div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', color: THEME.muted, textTransform: 'uppercase' }}>ELO</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {[
          { l: 'Parties', v: profil?.parties ?? 0, c: THEME.text },
          { l: 'Victoires', v: profil?.victoires ?? 0, c: THEME.success },
          { l: 'Nulles', v: profil?.nulles ?? 0, c: THEME.blue },
          { l: 'Défaites', v: profil?.defaites ?? 0, c: THEME.accent },
          { l: 'Record', v: profil?.plus_haut_elo ?? elo, c: THEME.gold },
        ].map(s => (
          <div key={s.l} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.cardBorder}` }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: s.c, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
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
    <div style={{ minHeight: '100vh', background: `radial-gradient(1100px 500px at 50% -8%, rgba(224,82,74,0.10), transparent 60%), radial-gradient(900px 420px at 85% 8%, rgba(255,215,0,0.05), transparent 55%), ${THEME.bg}`, paddingTop: 0, paddingBottom: enJeu ? 24 : 80 }}>
      <BarreJeu titre="Échecs Brams">
        {!troisD && (
          <button
            onClick={() => {
              const ids = Object.keys(THEMES_PLATEAU)
              const next = ids[(ids.indexOf(themeP) + 1) % ids.length]
              setThemeP(next); setThemePlateau(next)
            }}
            title={`Thème du plateau : ${THEMES_PLATEAU[themeP]?.label}`}
            style={{ height: 42, padding: '0 12px', borderRadius: 12, cursor: 'pointer', fontSize: 13.5, fontWeight: 800, fontFamily: THEME.fontBody, background: THEME.card, border: `1px solid ${THEME.cardBorder}`, color: THEME.text, display: 'inline-flex', alignItems: 'center', gap: 7 }}
          >
            <span style={{ display: 'inline-flex', width: 16, height: 16, borderRadius: 4, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(0,0,0,.3)' }}>
              <span style={{ width: 8, background: THEMES_PLATEAU[themeP]?.claire }} />
              <span style={{ width: 8, background: THEMES_PLATEAU[themeP]?.foncee }} />
            </span>
            {THEMES_PLATEAU[themeP]?.emoji}
          </button>
        )}
        <button
          onClick={() => { const v = !troisD; setTroisD(v); setModeTroisD(v) }}
          title={troisD ? 'Passer en vue 2D classique' : 'Passer en vue 3D'}
          style={{ height: 42, padding: '0 14px', borderRadius: 12, cursor: 'pointer', fontSize: 13.5, fontWeight: 800, fontFamily: THEME.fontBody, background: troisD ? 'rgba(255,215,0,0.10)' : THEME.card, border: `1px solid ${troisD ? 'rgba(255,215,0,0.45)' : THEME.cardBorder}`, color: troisD ? THEME.gold : THEME.text }}
        >
          {troisD ? '🧊 3D' : '▦ 2D'}
        </button>
        <button
          onClick={() => { const m = !mute; setMute(m); setMuted(m); sons.debloquer() }}
          title={mute ? 'Activer les sons' : 'Couper les sons'}
          style={{ width: 42, height: 42, borderRadius: 12, cursor: 'pointer', fontSize: 18, background: THEME.card, border: `1px solid ${THEME.cardBorder}`, color: THEME.text }}
        >
          {mute ? '🔇' : '🔊'}
        </button>
      </BarreJeu>
      <div style={{ maxWidth: enJeu ? 1640 : 1080, margin: '0 auto', padding: '18px 18px 0', fontFamily: THEME.fontBody }}>

        {/* Sous-titre du hub (sous la barre, mode hub uniquement) */}
        {!enJeu && (
          <p style={{ margin: '0 0 22px', color: THEME.muted, fontSize: 14 }}>
            Défie Stockfish ou les membres de l'équipage — ELO et rangs One Piece à la clé.
          </p>
        )}

        {mode.type === 'hub' && (
          <>
            {partieEnCours && (
              <div
                onClick={() => ouvrirPartie(partieEnCours.id)}
                style={{ marginBottom: 18, padding: '14px 18px', borderRadius: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.4)' }}
              >
                <span style={{ fontSize: 24 }}>⏳</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14.5, color: THEME.gold }}>Tu as une partie en cours !</div>
                  <div style={{ fontSize: 12.5, color: THEME.muted }}>
                    {partieEnCours.blanc_pseudo} vs {partieEnCours.noir_pseudo} · cadence {partieEnCours.cadence}
                  </div>
                </div>
                <span style={{ fontWeight: 800, fontSize: 13.5, color: THEME.gold }}>Reprendre →</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 22 }}>
              <CarteMode
                emoji="🤖" titre="Contre l'IA" accent={THEME.accent}
                texte="Six niveaux calibrés, de Mousse (~800 ELO) à Yonkou (pleine puissance Stockfish 18). Partie non classée, coup annulable."
                cta="Défier Stockfish" onClick={() => setMode({ type: 'solo' })}
              />
              <CarteMode
                emoji="🌊" titre="En ligne classé" accent={THEME.gold}
                texte="Matchmaking par ELO contre les membres du serveur. Horloges, nulle, abandon, revanche — et ton rang One Piece en jeu."
                cta="Trouver un adversaire"
                onClick={() => (isAuthenticated ? setMode({ type: 'matchmaking' }) : signInWithDiscord?.())}
                desactive={!isAuthenticated} note="🔒 Connexion Discord requise — clique pour te connecter"
              />
              <CarteMode
                emoji="🪑" titre="2 joueurs locaux" accent={THEME.blue}
                texte="Le plateau complet sur un seul écran : parfait pour jouer à deux sur le canapé ou analyser une position."
                cta="Jouer à deux" onClick={() => setMode({ type: 'local' })}
              />
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
