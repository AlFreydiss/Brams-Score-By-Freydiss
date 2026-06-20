// ── Aperçu plein écran de l'avatar (clic sur l'avatar du profil) ─────────────
export default function AvatarPreviewModal({ src, alt, ringColor, onClose }) {
  if (!src) return null
  return (
    <div className="pfx-modal-overlay pfx-avatar-overlay" onClick={onClose}>
      <div className="pfx-avatar-preview" onClick={e => e.stopPropagation()} style={{ '--ring': ringColor || '#d4a017' }}>
        <img loading="lazy" decoding="async" src={src} alt={alt || 'Avatar'} />
      </div>
      <button type="button" className="pfx-avatar-preview-close" onClick={onClose} aria-label="Fermer">✕</button>
    </div>
  )
}
