// ── Aperçu des abonnés (pile d'avatars + "Suivi par …") ──────────────────────
// Montre qui suit ce profil et remplit l'espace du header. Clic → modale abonnés.
import { useState, useEffect, useRef } from 'react'
import { listFollowers } from '../../lib/social.js'

export default function FollowersPreview({ targetId, count, onOpen }) {
  const [list, setList] = useState(null)
  const aliveRef = useRef(true)
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false } }, [])
  useEffect(() => {
    if (!targetId) return
    listFollowers(targetId).then(l => { if (aliveRef.current) setList(Array.isArray(l) ? l : []) })
  }, [targetId])

  if (!list || list.length === 0) return null

  const shown = list.slice(0, 5)
  const names = list.slice(0, 2).map(u => u.username || `Pirate #${String(u.user_id).slice(-4)}`)
  const total = count ?? list.length
  const extra = Math.max(0, total - names.length)

  return (
    <button type="button" className="pfx-ig-followers" onClick={onOpen} aria-label="Voir les abonnés">
      <div className="pfx-ig-fstack">
        {shown.map(u => (
          <span key={u.user_id} className="pfx-ig-favatar">
            {u.avatar_url ? <img src={u.avatar_url} alt="" /> : (u.username || '?').slice(0, 2).toUpperCase()}
          </span>
        ))}
      </div>
      <span className="pfx-ig-ftext">
        Suivi par <strong>{names.join(', ')}</strong>{extra > 0 ? ` et ${extra} autre${extra > 1 ? 's' : ''}` : ''}
      </span>
    </button>
  )
}
