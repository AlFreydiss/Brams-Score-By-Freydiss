// ── Modale d'édition du profil ───────────────────────────────────────────────
// updateProfileSettings résout le discord_id côté serveur → impossible d'éditer
// le profil d'un autre membre. Champs : citation, bio, lien, bannière, visibilité,
// + équiper un fond d'opening possédé (equipShopItem). Preview live à droite.
import { useState } from 'react'
import { updateProfileSettings } from '../../lib/profile.js'
import { equipShopItem } from '../../lib/berryShop.js'
import { uploadAttachment } from '../../lib/social.js'
import { getBgById } from '../../data/opening-backgrounds.js'

const BIO_MAX = 280
const QUOTE_MAX = 160
const ALLOWED_IMG = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

const VISIBILITY = [
  { v: 'public',  label: 'Public',  desc: 'Visible par tous' },
  { v: 'members', label: 'Membres', desc: 'Membres connectés' },
  { v: 'private', label: 'Privé',   desc: 'Toi uniquement' },
]

const DM_PRIVACY = [
  { v: 'everyone', label: 'Tous',   desc: 'Tout le monde peut te DM' },
  { v: 'friends',  label: 'Amis',   desc: 'Seulement tes amis (suivi mutuel)' },
  { v: 'nobody',   label: 'Fermé',  desc: 'Personne ne peut te DM' },
]

export default function ProfileEditModal({ data, settings, onClose, onSaved }) {
  const shopData = data?.shopData
  const [bio,        setBio]        = useState(settings?.bio || '')
  const [quote,      setQuote]      = useState(settings?.quote || '')
  const [link,       setLink]       = useState(settings?.link || '')
  const [banner,     setBanner]     = useState(settings?.banner_url || '')
  const [visibility, setVisibility] = useState(settings?.visibility || 'public')
  const [dmPrivacy,  setDmPrivacy]  = useState(settings?.dm_privacy || 'friends')
  const [saving,     setSaving]     = useState(false)
  const [uploading,  setUploading]  = useState(false)
  const [error,      setError]      = useState(null)
  const [equipBusy,  setEquipBusy]  = useState(null)

  // Fonds d'opening possédés ET disponibles (vidéo R2 présente dans le catalogue).
  const bgItems = (shopData?.inventory || []).filter(i =>
    i?.shop_items?.reward_type === 'opening_background' && getBgById(i.item_id)?.videoUrl)
  const equippedItemId = bgItems.find(i => i.equipped)?.item_id || null

  async function onBanner(e) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    if (!ALLOWED_IMG.includes(f.type)) { setError('Format image non supporté'); return }
    if (f.size > 30 * 1024 * 1024) { setError('Image trop lourde (max 30 Mo)'); return }
    setUploading(true); setError(null)
    const up = await uploadAttachment(f)
    setUploading(false)
    if (up?.error) { setError(up.error); return }
    setBanner(up.url)
  }

  async function equip(itemId) {
    if (equipBusy) return
    setEquipBusy(itemId); setError(null)
    const res = await equipShopItem(itemId)
    setEquipBusy(null)
    if (res?.error || res?.data?.ok === false) { setError(res?.error?.message || 'Équipement impossible'); return }
    data?.refresh?.()   // rafraîchit l'inventaire + le fond du header (sans skeleton)
  }

  const save = async () => {
    setSaving(true); setError(null)
    const patch = { bio, quote, link, banner_url: banner, visibility, dm_privacy: dmPrivacy }
    const { data: res, error } = await updateProfileSettings(patch)
    setSaving(false)
    if (error || res?.ok === false) { setError(error?.message || res?.error || 'Échec de la sauvegarde.'); return }
    onSaved?.({ ...settings, ...patch })
    onClose?.()
  }

  return (
    <div className="pfx-modal-overlay" onClick={onClose}>
      <div className="pfx-modal pfx-edit-modal" onClick={e => e.stopPropagation()}>
        <h2 className="pfx-modal-h">Personnaliser mon profil</h2>

        <div className="pfx-edit-grid">
          {/* Formulaire */}
          <div className="pfx-edit-form">
            <div className="pfx-field">
              <label>Citation <span className="pfx-char">{quote.length}/{QUOTE_MAX}</span></label>
              <input className="pfx-input" value={quote} maxLength={QUOTE_MAX}
                onChange={e => setQuote(e.target.value)} placeholder="Ta devise de pirate…" />
            </div>

            <div className="pfx-field">
              <label>Bio <span className="pfx-char">{bio.length}/{BIO_MAX}</span></label>
              <textarea className="pfx-textarea" value={bio} maxLength={BIO_MAX} rows={3}
                onChange={e => setBio(e.target.value)} placeholder="Présente-toi à l'équipage…" />
            </div>

            <div className="pfx-field">
              <label>Lien externe</label>
              <input className="pfx-input" value={link} onChange={e => setLink(e.target.value)}
                placeholder="https://…" inputMode="url" />
            </div>

            <div className="pfx-field">
              <label>Bannière</label>
              <div className="pfx-banner-row">
                <label className="pfx-btn pfx-btn-ghost" style={{ cursor: 'pointer' }}>
                  {uploading ? 'Envoi…' : banner ? 'Changer' : 'Importer une image'}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onBanner} style={{ display: 'none' }} />
                </label>
                {banner && <button type="button" className="pfx-btn pfx-btn-ghost" onClick={() => setBanner('')}>Retirer</button>}
              </div>
            </div>

            <div className="pfx-field">
              <label>Visibilité</label>
              <div className="pfx-vis-row">
                {VISIBILITY.map(o => (
                  <button key={o.v} type="button" title={o.desc}
                    className={`pfx-vis${visibility === o.v ? ' active' : ''}`} onClick={() => setVisibility(o.v)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pfx-field">
              <label>Qui peut m'envoyer un message</label>
              <div className="pfx-vis-row">
                {DM_PRIVACY.map(o => (
                  <button key={o.v} type="button" title={o.desc}
                    className={`pfx-vis${dmPrivacy === o.v ? ' active' : ''}`} onClick={() => setDmPrivacy(o.v)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {bgItems.length > 0 && (
              <div className="pfx-field">
                <label>Fond d'opening équipé</label>
                <div className="pfx-bg-picker">
                  <button type="button" disabled={!!equipBusy}
                    className={`pfx-bg-opt${!equippedItemId ? ' active' : ''}`}
                    onClick={() => equippedItemId && equip(equippedItemId)}>
                    <span>Hero par défaut</span>
                    {!equippedItemId && <em>✓</em>}
                  </button>
                  {bgItems.map(i => {
                    const bg = getBgById(i.item_id)
                    const on = i.item_id === equippedItemId
                    return (
                      <button key={i.item_id} type="button" disabled={!!equipBusy}
                        className={`pfx-bg-opt${on ? ' active' : ''}`} onClick={() => equip(i.item_id)}>
                        <span>{bg?.opTitle || i.shop_items?.name || i.item_id}</span>
                        {on && <em>✓</em>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Preview live */}
          <div className="pfx-edit-preview">
            <span className="pfx-edit-preview-lbl">Aperçu</span>
            <div className="pfx-preview-card">
              {banner && <img className="pfx-preview-banner" src={banner} alt="" />}
              <div className="pfx-preview-body">
                <strong>{data?.member?.username || 'Pirate'}</strong>
                {quote && <p className="pfx-preview-quote">« {quote} »</p>}
                {bio && <p className="pfx-preview-bio">{bio}</p>}
                {link && <span className="pfx-preview-link">🔗 {link.replace(/^https?:\/\/(www\.)?/, '')}</span>}
              </div>
            </div>
          </div>
        </div>

        {error && <p className="pfx-edit-err">{error}</p>}

        <div className="pfx-modal-actions">
          <button className="pfx-btn pfx-btn-ghost" type="button" onClick={onClose} disabled={saving}>Annuler</button>
          <button className="pfx-btn pfx-btn-gold" type="button" onClick={save} disabled={saving || uploading}>
            {saving ? 'Sauvegarde…' : '✓ Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
