// ── Modale d'édition du profil (sa propre perso : bio + citation) ────────────
// updateProfileSettings résout le discord_id côté serveur → impossible d'éditer
// le profil d'un autre membre. On renvoie les settings frais via onSaved().
import { useState } from 'react'
import { updateProfileSettings } from '../../lib/profile.js'

const BIO_MAX = 280
const QUOTE_MAX = 160

export default function ProfileEditModal({ settings, onClose, onSaved }) {
  const [bio,    setBio]    = useState(settings?.bio || '')
  const [quote,  setQuote]  = useState(settings?.quote || '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const save = async () => {
    setSaving(true); setError(null)
    const { data, error } = await updateProfileSettings({ bio, quote })
    setSaving(false)
    if (error || data?.ok === false) { setError(error?.message || data?.error || 'Échec de la sauvegarde.'); return }
    onSaved?.({ ...settings, bio, quote })
    onClose?.()
  }

  return (
    <div className="pfx-modal-overlay" onClick={onClose}>
      <div className="pfx-modal" onClick={e => e.stopPropagation()}>
        <h2 className="pfx-modal-h">Personnaliser mon profil</h2>

        <div className="pfx-field">
          <label>Citation <span className="pfx-char">{quote.length}/{QUOTE_MAX}</span></label>
          <input className="pfx-input" value={quote} maxLength={QUOTE_MAX}
            onChange={e => setQuote(e.target.value)} placeholder="Ta devise de pirate…" />
        </div>

        <div className="pfx-field">
          <label>Bio <span className="pfx-char">{bio.length}/{BIO_MAX}</span></label>
          <textarea className="pfx-textarea" value={bio} maxLength={BIO_MAX} rows={4}
            onChange={e => setBio(e.target.value)} placeholder="Présente-toi à l'équipage…" />
        </div>

        {error && <p style={{ color: '#ff8b7a', fontSize: 12.5, margin: '0 0 10px' }}>{error}</p>}

        <div className="pfx-modal-actions">
          <button className="pfx-btn pfx-btn-ghost" type="button" onClick={onClose} disabled={saving}>Annuler</button>
          <button className="pfx-btn pfx-btn-gold" type="button" onClick={save} disabled={saving}>
            {saving ? 'Sauvegarde…' : '✓ Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
