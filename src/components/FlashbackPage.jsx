// ── FLASHBACK — cinématique d'anime (sépia → couleur) ────────────────────────
// /flashback/:token : milestones via RPC get_flashback (token unique).
// ?mock=1 pour le design. Scènes en fondu auto (ou clic pour avancer), filtre
// flashback (sépia + vignettage + grain + rayures), climax = retour couleur.
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { sbRpc } from '../lib/supabaseRest.js'
import { generateShareCard, shareCanvas } from '../lib/shareCardGenerator.js'

const GOLD = '#F5D97B'
const DISPLAY = "'Bricolage Grotesque', 'Space Grotesk', 'Inter', sans-serif"

const MOCK = {
  username: 'Al Freydiss', avatar_url: null, type: 'anniversaire-1an',
  joined_at: '2025-06-11', rank: 'Roi des pirates',
  rankups: [
    { rank: 'Pirate', date: '2025-07-02' },
    { rank: 'Shichibukai', date: '2025-09-18' },
    { rank: 'Yonkou', date: '2026-01-25' },
    { rank: 'Roi des pirates', date: '2026-04-30' },
  ],
  best_day: { date: '2026-03-14', hours: 11.2 },
  companions: ['Berat', 'BLAZE', '_myr14m_'],
  prime: { end: 168_300_000 }, hours: 880, percentile: 3,
}

const NARRATION = {
  intro: (d) => `IL Y A UN AN…`,
  arrivee: (d) => `Un inconnu accoste au port de Brams. Personne ne connaît encore son nom.`,
  premiers: (d) => `Les premières heures en vocal. Les premières voix amies dans la nuit.`,
  montee: (d) => `Puis la mer reconnaît les siens. Les rangs tombent, un à un.`,
  compagnons: (d) => `Sur la route, des nakamas. ${d.companions?.slice(0, 3).join(', ')}.`,
  gloire: (d) => d.best_day ? `Le ${fmtD(d.best_day.date)} : ${d.best_day.hours}h en un jour. Le serveur s'en souvient.` : `Des records. Des nuits entières sur Grand Line.`,
}
const fmtD = (iso) => { try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return iso } }

const CSS = `
  @keyframes fbFade { from { opacity: 0; transform: scale(.97) } to { opacity: 1; transform: none } }
  @keyframes fbScratch { 0%,100% { opacity: .06; transform: translateX(0) } 50% { opacity: .12; transform: translateX(3px) } }
  @keyframes fbGrain { 0%,100% { transform: translate(0,0) } 25% { transform: translate(-2%,1%) } 50% { transform: translate(1%,-2%) } 75% { transform: translate(2%,2%) } }
  @keyframes fbColor { from { filter: sepia(.85) saturate(.45) contrast(1.05) brightness(.92) } to { filter: none } }
  @media (prefers-reduced-motion: reduce) { * { animation-duration: .001s !important; transition-duration: .001s !important } }
`

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='2'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.16'/%3E%3C/svg%3E")`

export default function FlashbackPage() {
  const { token } = useParams()
  const [params] = useSearchParams()
  const isMock = params.get('mock') === '1'
  const [data, setData] = useState(isMock ? MOCK : null)
  const [err, setErr] = useState(null)
  const [scene, setScene] = useState(0)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (isMock) return
    sbRpc('get_flashback', { p_token: token }, { tag: 'flashback' })
      .then(r => { if (r?.ok) setData({ ...(r.payload || {}), type: r.type }); else setErr(r?.error || 'token_invalide') })
      .catch(() => setErr('erreur'))
  }, [token, isMock])

  const d = data
  const scenes = useMemo(() => {
    if (!d) return []
    const s = []
    s.push({ key: 'intro', big: NARRATION.intro(d), sub: null })
    s.push({ key: 'arrivee', big: fmtD(d.joined_at), sub: NARRATION.arrivee(d) })
    s.push({ key: 'premiers', big: '⚓', sub: NARRATION.premiers(d) })
    if (d.rankups?.length) s.push({ key: 'montee', big: null, sub: NARRATION.montee(d), rankups: d.rankups })
    if (d.companions?.length) s.push({ key: 'compagnons', big: '🤝', sub: NARRATION.compagnons(d) })
    s.push({ key: 'gloire', big: d.best_day ? `${d.best_day.hours}h` : '👑', sub: NARRATION.gloire(d) })
    s.push({ key: 'finale', color: true })
    return s
  }, [d])

  // Auto-avance (7 s), clic = suivante
  useEffect(() => {
    if (!scenes.length || scene >= scenes.length - 1) return
    const t = setTimeout(() => setScene(i => i + 1), 7000)
    return () => clearTimeout(t)
  }, [scene, scenes.length])
  const next = useCallback(() => setScene(i => Math.min(scenes.length - 1, i + 1)), [scenes.length])

  const souvenir = useCallback(async () => {
    try {
      const canvas = await generateShareCard(d, '916', 'flashback')
      await shareCanvas(canvas, 'brams-flashback.png')
    } catch (e) { console.error('[flashback card]', e) }
  }, [d])

  if (err) return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#0A0908', color: '#fff', fontFamily: DISPLAY, textAlign: 'center', padding: 24 }}>
      <div>
        <div style={{ fontSize: 44, marginBottom: 14 }}>📜</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Ce souvenir s'est effacé…</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', marginTop: 8 }}>Lien invalide ou expiré.</div>
      </div>
    </div>
  )
  if (!d) return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#0A0908', color: GOLD, fontFamily: DISPLAY, fontWeight: 800 }}>
      📜 On rembobine la pellicule…
    </div>
  )

  const sc = scenes[scene]
  const isFinale = !!sc?.color

  return (
    <div onClick={next} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: '#0A0908', fontFamily: DISPLAY, cursor: 'pointer', overflow: 'hidden' }}>
      <style>{CSS}</style>

      {/* Calque filmé : sépia + grain + rayures + vignettage — disparaît à la finale */}
      <div style={{
        position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 26, textAlign: 'center',
        background: 'radial-gradient(110% 80% at 50% 40%, #2A2118, #14100B 75%)',
        filter: isFinale ? 'none' : 'sepia(.85) saturate(.45) contrast(1.05) brightness(.92)',
        animation: isFinale ? 'fbColor 2.4s ease both' : 'none',
        transition: 'filter 2.4s ease',
      }}>
        {/* contenu de scène */}
        {!isFinale ? (
          <div key={sc.key} style={{ animation: 'fbFade 1.4s ease both', maxWidth: 420 }}>
            {sc.big && (
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontStyle: 'italic', fontSize: sc.key === 'intro' ? 'clamp(40px, 11vw, 72px)' : 'clamp(34px, 9vw, 58px)', color: '#EFE3C8', letterSpacing: '.02em', textShadow: '0 2px 30px rgba(0,0,0,.7)' }}>
                {sc.big}
              </div>
            )}
            {sc.rankups && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '8px 0 16px' }}>
                {sc.rankups.map((r, i) => (
                  <div key={r.rank} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 12, animation: `fbFade .9s ${0.4 + i * 0.55}s both` }}>
                    <span style={{ fontWeight: 800, fontStyle: 'italic', fontSize: 24, color: '#EFE3C8' }}>{r.rank}</span>
                    <span style={{ fontSize: 13, color: 'rgba(239,227,200,.55)', fontWeight: 700 }}>{fmtD(r.date)}</span>
                  </div>
                ))}
              </div>
            )}
            {sc.sub && (
              <p style={{ fontSize: 18, lineHeight: 1.65, color: 'rgba(239,227,200,.8)', fontWeight: 600, marginTop: 16 }}>{sc.sub}</p>
            )}
          </div>
        ) : (
          <div style={{ animation: 'fbFade 1.6s .8s both', maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 130, height: 130, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 18px', border: `4px solid ${GOLD}`, display: 'grid', placeItems: 'center', background: '#101a2e', fontSize: 40, fontWeight: 800, color: GOLD }}>
              {d.avatar_url ? <img src={d.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (d.username || '?').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontStyle: 'italic', fontSize: 'clamp(30px, 8vw, 46px)', color: '#fff' }}>{d.username}</div>
            {d.rank && <div style={{ fontSize: 15, fontWeight: 800, color: GOLD, marginTop: 6 }}>⚓ {d.rank}</div>}
            <p style={{ fontSize: 19, lineHeight: 1.6, color: 'rgba(255,255,255,.85)', fontWeight: 700, margin: '22px 0 6px' }}>
              …et c'est ainsi que la légende commença.
            </p>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', fontWeight: 700 }}>{fmtD(new Date().toISOString())} · brams.community</div>
            <button onClick={souvenir} style={{
              marginTop: 24, padding: '13px 22px', borderRadius: 12, cursor: 'pointer', fontFamily: DISPLAY,
              background: 'rgba(245,217,123,.16)', border: `1.5px solid ${GOLD}`, color: GOLD, fontWeight: 800, fontSize: 14.5,
            }}>📜 Télécharger ma carte souvenir</button>
          </div>
        )}
      </div>

      {/* Grain + rayures du filtre flashback (au-dessus, masqués à la finale) */}
      {!isFinale && (
        <>
          <div aria-hidden style={{ position: 'absolute', inset: '-10%', background: NOISE, animation: 'fbGrain .9s steps(4) infinite', pointerEvents: 'none' }} />
          <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(90deg, transparent 0 120px, rgba(0,0,0,.25) 120px 121px, transparent 121px 260px)', animation: 'fbScratch 1.6s ease-in-out infinite' }} />
          <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 180px 60px rgba(0,0,0,.85)' }} />
        </>
      )}
    </div>
  )
}
