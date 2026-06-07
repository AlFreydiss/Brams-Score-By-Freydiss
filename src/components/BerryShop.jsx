// ── Boutique Brams — refonte style shop de jeu (Fortnite / LOL) ──────────────
// Pour l'instant : uniquement les FONDS D'OPENING (le reste sera ajouté petit à
// petit). Panneau "featured" animé en haut + grille de cartes rareté-colorées.
// Achat / équipement / solde via REST direct (anti-hang, voir supabaseRest.js).
import { useEffect, useMemo, useState, useCallback } from 'react'
import confetti from 'canvas-confetti'
import { useAuth } from '../contexts/AuthContext.jsx'
import { fetchShopBalance, fetchOwnedBackgrounds, purchaseShopItem } from '../lib/berryShop.js'
import { useOpeningBg } from '../contexts/OpeningBgContext.jsx'
import { OPENING_BACKGROUNDS } from '../data/opening-backgrounds.js'
import OpeningBgMedia from './social/OpeningBgMedia.jsx'

const GOLD = '#d4a017'
const RARITY = {
  Commun:     { color: '#8a9bb5', label: 'Commun',     rank: 1 },
  Rare:       { color: '#4db5ff', label: 'Rare',       rank: 2 },
  Epique:     { color: '#ad6bff', label: 'Épique',     rank: 3 },
  Legendaire: { color: '#f6b34b', label: 'Légendaire', rank: 4 },
  Mythique:   { color: '#e86bff', label: 'Mythique',   rank: 5 },
  Secret:     { color: '#e8d5a3', label: 'Secret',     rank: 6 },
}
const rar = (r) => RARITY[r] || RARITY.Commun
const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Number(n || 0))

export default function BerryShop() {
  const { isAuthenticated } = useAuth()
  const { equippedId, equip, preview, cancelPreview } = useOpeningBg()

  const catalog = useMemo(
    () => [...OPENING_BACKGROUNDS].sort((a, b) => rar(b.rarity).rank - rar(a.rarity).rank || b.price - a.price),
    []
  )

  const [balance, setBalance] = useState(0)
  const [owned, setOwned] = useState(() => new Set())
  const [selected, setSelected] = useState(catalog[0] || null)
  const [busy, setBusy] = useState(null) // id en cours d'achat
  const [toast, setToast] = useState(null)

  const flash = useCallback((msg, kind = 'info') => {
    setToast({ msg, kind })
    window.setTimeout(() => setToast(null), 2600)
  }, [])

  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setBalance(0); setOwned(new Set()); return }
    const [bal, bgs] = await Promise.all([fetchShopBalance(), fetchOwnedBackgrounds()])
    setBalance(bal)
    setOwned(new Set(bgs.map(b => b.item_id)))
  }, [isAuthenticated])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => () => cancelPreview(), [cancelPreview])

  const isOwned = (bg) => owned.has(bg.id) || owned.has(bg.shopItemId)
  const isEquipped = (bg) => equippedId === bg.id

  async function buy(bg) {
    if (!isAuthenticated) { flash('Connecte-toi pour acheter.', 'error'); return }
    if (isOwned(bg)) return
    if (balance < bg.price) { flash(`Il te manque ${fmt(bg.price - balance)} ฿`, 'error'); return }
    setBusy(bg.id)
    const { error } = await purchaseShopItem(bg.shopItemId)
    setBusy(null)
    if (error) { flash(error.message || 'Achat impossible', 'error'); return }
    confetti({ particleCount: 120, spread: 75, origin: { y: 0.7 }, colors: [rar(bg.rarity).color, GOLD, '#fff'] })
    flash(`« ${bg.opTitle} » débloqué !`, 'success')
    await refresh()
  }

  async function doEquip(bg) {
    if (!isOwned(bg)) return
    await equip(bg.id)
    flash(`« ${bg.opTitle} » équipé sur ton profil.`, 'success')
  }

  const sel = selected || catalog[0]
  const selOwned = sel && isOwned(sel)
  const selEquipped = sel && isEquipped(sel)

  return (
    <div style={{ minHeight: '100vh', background: '#08090d', color: '#f3f3f5', paddingTop: 88 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px 80px' }}>

        {/* En-tête + solde */}
        <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, margin: '8px 0 22px' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: GOLD, marginBottom: 6 }}>Brams Shop</div>
            <h1 style={{ margin: 0, fontSize: 34, fontWeight: 900, letterSpacing: '-0.02em' }}>Boutique</h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Fonds d'opening animés pour ton profil. D'autres objets arrivent bientôt.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', borderRadius: 14, background: 'rgba(212,160,23,0.10)', border: '1px solid rgba(212,160,23,0.30)' }}>
            <span style={{ fontSize: 20 }}>💰</span>
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>Ton solde</div>
              <strong style={{ fontSize: 19, color: GOLD }}>{fmt(balance)} ฿</strong>
            </div>
          </div>
        </header>

        {/* Panneau featured */}
        {sel && (
          <section style={{ position: 'relative', borderRadius: 22, overflow: 'hidden', border: `1px solid ${rar(sel.rarity).color}55`, marginBottom: 30, minHeight: 340, boxShadow: `0 0 60px ${rar(sel.rarity).color}22` }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <OpeningBgMedia key={sel.id} bg={sel} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, rgba(8,9,13,0.92) 0%, rgba(8,9,13,0.72) 42%, rgba(8,9,13,0.18) 100%)` }} />
            <div style={{ position: 'relative', padding: '34px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 340, maxWidth: 620 }}>
              <span style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase', color: '#0b0c0e', background: rar(sel.rarity).color, padding: '4px 12px', borderRadius: 99, marginBottom: 14 }}>
                {rar(sel.rarity).label}
              </span>
              <h2 style={{ margin: 0, fontSize: 40, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.02 }}>{sel.opTitle}</h2>
              <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.62)', marginTop: 6 }}>{sel.anime} · <span style={{ color: 'rgba(255,255,255,0.45)' }}>{sel.artist}</span></div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.72)', lineHeight: 1.55, margin: '14px 0 20px', maxWidth: 520 }}>{sel.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                {selEquipped ? (
                  <span style={{ padding: '12px 22px', borderRadius: 12, background: 'rgba(46,204,113,0.14)', border: '1px solid rgba(46,204,113,0.4)', color: '#5fe39b', fontWeight: 800, fontSize: 14 }}>✓ Équipé</span>
                ) : selOwned ? (
                  <button type="button" onClick={() => doEquip(sel)} style={{ padding: '12px 26px', borderRadius: 12, border: 'none', background: GOLD, color: '#0b0c0e', fontWeight: 900, fontSize: 14.5, cursor: 'pointer' }}>Équiper</button>
                ) : (
                  <button type="button" onClick={() => buy(sel)} disabled={busy === sel.id}
                    style={{ padding: '12px 26px', borderRadius: 12, border: 'none', background: balance >= sel.price ? GOLD : 'rgba(255,255,255,0.10)', color: balance >= sel.price ? '#0b0c0e' : 'rgba(255,255,255,0.5)', fontWeight: 900, fontSize: 14.5, cursor: busy === sel.id ? 'wait' : 'pointer', opacity: busy === sel.id ? 0.7 : 1 }}>
                    {busy === sel.id ? 'Achat…' : `Acheter · ${fmt(sel.price)} ฿`}
                  </button>
                )}
                <button type="button" onClick={() => preview(sel.id, 9000)} style={{ padding: '12px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.18)', background: 'transparent', color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
                  👁 Aperçu plein écran
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Grille des fonds */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 16 }}>
          {catalog.map(bg => {
            const r = rar(bg.rarity)
            const ownedBg = isOwned(bg)
            const equippedBg = isEquipped(bg)
            const active = sel?.id === bg.id
            return (
              <button
                key={bg.id}
                type="button"
                onClick={() => setSelected(bg)}
                onMouseEnter={() => { setSelected(bg); preview(bg.id, 60000) }}
                onMouseLeave={() => cancelPreview()}
                style={{
                  position: 'relative', textAlign: 'left', cursor: 'pointer', padding: 0,
                  borderRadius: 16, overflow: 'hidden', aspectRatio: '3 / 4',
                  border: `1px solid ${active ? r.color : 'rgba(255,255,255,0.08)'}`,
                  background: `linear-gradient(160deg, ${bg.overlayStart}, ${bg.overlayEnd})`,
                  boxShadow: active ? `0 0 0 1px ${r.color}, 0 14px 40px ${r.color}33` : '0 8px 24px rgba(0,0,0,0.4)',
                  transform: active ? 'translateY(-4px)' : 'none', transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
                  fontFamily: 'inherit', color: '#fff',
                }}
              >
                {/* Vignette YouTube floutée en fond (best-effort, dégradé si 404) */}
                <img src={`https://i.ytimg.com/vi/${bg.ytId}/hqdefault.jpg`} alt="" loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 30%, ${bg.overlayEnd} 95%)` }} />

                {/* Bandeau rareté */}
                <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 9.5, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: '#0b0c0e', background: r.color, padding: '3px 9px', borderRadius: 99 }}>{r.label}</span>
                {equippedBg && <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 800, color: '#5fe39b', background: 'rgba(8,9,13,0.7)', padding: '3px 8px', borderRadius: 99 }}>✓ Équipé</span>}
                {ownedBg && !equippedBg && <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, fontWeight: 800, color: GOLD, background: 'rgba(8,9,13,0.7)', padding: '3px 8px', borderRadius: 99 }}>Possédé</span>}

                {/* Bas de carte */}
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 13px' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.15, textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>{bg.opTitle}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.65)', marginBottom: 10, textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>{bg.anime}</div>
                  {equippedBg ? (
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#5fe39b' }}>Équipé</div>
                  ) : ownedBg ? (
                    <span onClick={(e) => { e.stopPropagation(); doEquip(bg) }} role="button" tabIndex={0}
                      style={{ display: 'block', textAlign: 'center', fontSize: 12.5, fontWeight: 800, color: '#0b0c0e', background: GOLD, borderRadius: 9, padding: '8px 0' }}>Équiper</span>
                  ) : (
                    <span onClick={(e) => { e.stopPropagation(); buy(bg) }} role="button" tabIndex={0}
                      style={{ display: 'block', textAlign: 'center', fontSize: 12.5, fontWeight: 800, color: balance >= bg.price ? '#0b0c0e' : 'rgba(255,255,255,0.55)', background: balance >= bg.price ? GOLD : 'rgba(255,255,255,0.10)', borderRadius: 9, padding: '8px 0' }}>
                      {busy === bg.id ? 'Achat…' : `${fmt(bg.price)} ฿`}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 400, padding: '13px 22px', borderRadius: 12, fontWeight: 800, fontSize: 14, color: '#fff',
          background: toast.kind === 'error' ? 'rgba(224,82,74,0.95)' : toast.kind === 'success' ? 'rgba(46,204,113,0.95)' : 'rgba(20,21,26,0.96)',
          border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
