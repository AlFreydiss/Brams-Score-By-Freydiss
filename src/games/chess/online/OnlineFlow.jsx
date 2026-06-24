// ── OnlineFlow : orchestrateur du classé en ligne dans l'univers Échecs ──────
// Gère l'authentification (Discord requis), le profil ELO, la reprise de partie
// en cours, et la machine d'états menu → game. Rendu sobre (neutralTheme).
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../../contexts/AuthContext.jsx'
import { assurerProfil, getProfil, getPartieEnCours } from '../../../features/echecs/lib/api.js'
import { ui, fonts } from '../../../features/games/neutralTheme.js'
import ChessMatchmaking from './ChessMatchmaking.jsx'
import ChessOnlineGame from './ChessOnlineGame.jsx'
import SpectatorList from '../../_shell/arena/SpectatorList.jsx'

export default function OnlineFlow({ accent = '#b09467' }) {
  const { userId, displayName, avatarUrl, isAuthenticated, signInWithDiscord } = useAuth()
  const [profil, setProfil] = useState(null)
  const [partieEnCours, setPartieEnCours] = useState(null)   // partie à reprendre (banner)
  const [vue, setVue] = useState('menu')                     // 'menu' | 'game'
  const [partieId, setPartieId] = useState(null)
  const [pret, setPret] = useState(false)

  // Charge le profil ELO + détecte une partie en cours à reprendre.
  const charger = useCallback(async () => {
    if (!userId) return
    await assurerProfil(displayName, avatarUrl)
    const [p, ec] = await Promise.all([getProfil(userId), getPartieEnCours(userId)])
    setProfil(p)
    setPartieEnCours(ec)
    setPret(true)
  }, [userId, displayName, avatarUrl])

  useEffect(() => {
    if (!isAuthenticated || !userId) { setPret(false); return }
    let mort = false
    setPret(false)
    ;(async () => {
      await assurerProfil(displayName, avatarUrl)
      const [p, ec] = await Promise.all([getProfil(userId), getPartieEnCours(userId)])
      if (mort) return
      setProfil(p); setPartieEnCours(ec); setPret(true)
    })()
    return () => { mort = true }
  }, [isAuthenticated, userId, displayName, avatarUrl])

  const ouvrirPartie = useCallback(id => {
    setPartieId(id); setVue('game')
  }, [])

  // Quitter une partie → retour menu + rechargement du profil (ELO à jour).
  const quitterPartie = useCallback(() => {
    setVue('menu'); setPartieId(null)
    charger()
  }, [charger])

  // ── Connexion requise ──
  if (!isAuthenticated) {
    return (
      <div style={{
        maxWidth: 460, margin: '8px auto 40px', padding: '24px 22px', textAlign: 'center',
        background: ui.surface, border: `1px solid ${ui.line}`, borderRadius: ui.radius.lg,
      }}>
        <style>{`button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`}</style>
        <div aria-hidden style={{ width: 38, height: 4, borderRadius: 2, background: accent, margin: '0 auto 16px' }} />
        <h3 style={{ margin: 0, font: `800 20px ${fonts.display}`, letterSpacing: '-0.02em', color: ui.text }}>
          Connexion requise pour le classé
        </h3>
        <p style={{ margin: '8px 0 18px', font: `500 13.5px ${fonts.body}`, color: ui.textDim, lineHeight: 1.6 }}>
          Connecte-toi avec Discord pour rejoindre le matchmaking, gagner de l'ELO et grimper au classement.
        </p>
        <button onClick={() => signInWithDiscord()} style={{
          padding: '12px 22px', borderRadius: ui.radius.md, cursor: 'pointer',
          font: `800 14px ${fonts.display}`, color: '#15110a', background: accent, border: 'none',
          transition: 'filter .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)' }}
          onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}>
          Se connecter avec Discord
        </button>
      </div>
    )
  }

  if (!pret) {
    return <div style={{ textAlign: 'center', padding: 60, color: ui.textDim, font: `500 14px ${fonts.body}` }}>Chargement du profil classé…</div>
  }

  // ── Partie en cours ──
  if (vue === 'game' && partieId) {
    return (
      <ChessOnlineGame
        partieId={partieId}
        monUid={userId}
        onQuitter={quitterPartie}
        onRejoindrePartie={ouvrirPartie}
      />
    )
  }

  // ── Mode spectateur (lecture seule des parties classées en cours) ──
  if (vue === 'spectate') {
    return <SpectatorList game="chess" accent={accent} onRetour={() => setVue('menu')} />
  }

  // ── Menu : reprise éventuelle + matchmaking ──
  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <style>{`button:focus-visible{outline:2px solid ${accent};outline-offset:2px}`}</style>
      {partieEnCours && (
        <div style={{
          maxWidth: 560, margin: '8px auto 0', padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
          background: ui.surfaceHi, border: `1px solid ${ui.lineHi}`, borderRadius: ui.radius.md,
        }}>
          <span style={{ font: `600 13px ${fonts.body}`, color: ui.textDim }}>
            Tu as une partie classée en cours.
          </span>
          <button onClick={() => ouvrirPartie(partieEnCours.id)} style={{
            padding: '9px 16px', borderRadius: ui.radius.sm, cursor: 'pointer',
            font: `700 13px ${fonts.body}`, color: '#15110a', background: accent, border: 'none',
            transition: 'filter .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.08)' }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}>
            Reprendre la partie en cours
          </button>
        </div>
      )}
      <ChessMatchmaking
        profil={profil}
        pseudo={displayName}
        avatar={avatarUrl}
        monUid={userId}
        onPartieTrouvee={ouvrirPartie}
        onQuitter={() => { /* dans l'univers, le menu mode est géré par PlayTab — no-op */ }}
      />
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 4px 40px' }}>
        <button onClick={() => setVue('spectate')} style={{
          width: '100%', padding: '11px', borderRadius: ui.radius.sm, cursor: 'pointer',
          font: `700 13px ${fonts.body}`, color: ui.textDim,
          background: ui.surface, border: `1px solid ${ui.line}`, transition: 'color .15s, border-color .15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.color = ui.text; e.currentTarget.style.borderColor = ui.lineHi }}
          onMouseLeave={e => { e.currentTarget.style.color = ui.textDim; e.currentTarget.style.borderColor = ui.line }}>
          Regarder une partie en direct
        </button>
      </div>
    </div>
  )
}
