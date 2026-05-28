import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useSocial } from '../../contexts/SocialContext.jsx'
import {
  getRelationship, sendFriendRequest, respondFriendRequest, cancelFriendRequest,
  removeFriend, blockUser, unblockUser, getOrCreateDm,
} from '../../lib/social.js'
import { btn, T } from './socialStyles.js'

// Boutons d'action sur le profil d'un utilisateur, selon l'état relationnel.
// targetId = discord_id du profil affiché.
export default function RelationshipActions({ targetId }) {
  const { isAuthenticated, discordId } = useAuth()
  const { refreshCounts } = useSocial()
  const navigate = useNavigate()
  const [rel, setRel]       = useState(null)   // { state, request_id? }
  const [busy, setBusy]     = useState(false)
  const [error, setError]   = useState(null)

  const load = useCallback(async () => {
    if (!targetId) return
    const r = await getRelationship(targetId)
    setRel(r)
  }, [targetId])

  useEffect(() => { load() }, [load])

  // Ne rien afficher sur son propre profil ou si non connecté
  if (!isAuthenticated || !targetId || String(targetId) === String(discordId)) return null
  if (!rel) return null

  async function run(fn) {
    setBusy(true); setError(null)
    const res = await fn()
    setBusy(false)
    if (res?.ok === false) { setError(res.error || 'Erreur'); return }
    await load()
    refreshCounts()
  }

  async function openDm() {
    setBusy(true); setError(null)
    const res = await getOrCreateDm(targetId)
    setBusy(false)
    if (res?.ok && res.conversation_id) navigate(`/messages/${res.conversation_id}`)
    else setError(res?.error || 'Impossible d\'ouvrir la conversation')
  }

  const state = rel.state
  const row = { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={row}>
        {state === 'none' && (
          <button style={btn('gold')} disabled={busy} onClick={() => run(() => sendFriendRequest(targetId))}>
            ＋ Ajouter en ami
          </button>
        )}

        {state === 'pending_sent' && (
          <>
            <button style={btn('ghost')} disabled>⏳ Demande envoyée</button>
            <button style={btn('red')} disabled={busy} onClick={() => run(() => cancelFriendRequest(targetId))}>
              Annuler
            </button>
          </>
        )}

        {state === 'pending_received' && (
          <>
            <button style={btn('green')} disabled={busy} onClick={() => run(() => respondFriendRequest(rel.request_id, true))}>
              ✓ Accepter
            </button>
            <button style={btn('red')} disabled={busy} onClick={() => run(() => respondFriendRequest(rel.request_id, false))}>
              ✕ Refuser
            </button>
          </>
        )}

        {state === 'friends' && (
          <>
            <button style={btn('gold')} disabled={busy} onClick={openDm}>💬 Message</button>
            <button style={btn('default')} disabled title="Appel — bientôt disponible" >📞 Appeler</button>
            <button style={btn('ghost')} disabled={busy} onClick={() => run(() => removeFriend(targetId))}>
              Retirer
            </button>
          </>
        )}

        {state === 'blocked_by_me' && (
          <button style={btn('default')} disabled={busy} onClick={() => run(() => unblockUser(targetId))}>
            Débloquer
          </button>
        )}

        {/* blocked_me : aucune action — on n'expose rien */}

        {state !== 'blocked_by_me' && state !== 'blocked_me' && (
          <button style={btn('ghost')} disabled={busy} onClick={() => run(() => blockUser(targetId))} title="Bloquer">
            🚫
          </button>
        )}
      </div>

      {error && <span style={{ fontSize: 12, color: T.red }}>{error}</span>}
    </div>
  )
}
