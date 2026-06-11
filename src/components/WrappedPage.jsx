// ── BRAMS WRAPPED — stories plein écran (réf. Spotify Wrapped / IG stories) ──
// /wrapped/:token : payload via RPC get_wrapped (token unique, RLS verrouillée).
// ?mock=1 = données de démo pour itérer sur le design. Mobile-first 390×844 ;
// desktop : cadre 9:16 centré sur le fond du site. Tap droite/gauche, hold =
// pause, auto-advance 6 s, barre segmentée. prefers-reduced-motion respecté.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { sbRpc } from '../lib/supabaseRest.js'

const GOLD = '#F5D97B'
const GOLD_DEEP = '#BFA46A'
const NIGHT = '#06101F'
const NIGHT2 = '#0A1A33'
const DISPLAY = "'Bricolage Grotesque', 'Space Grotesk', 'Inter', sans-serif"

const MOCK = {
  username: 'Al Freydiss', avatar_url: null, period_label: '30 derniers jours',
  hours: 220.3, binome: { username: 'Berat', avatar_url: null, hours: 87.4 },
  top_channels: [{ name: '🎙️ Grand Line', hours: 96 }, { name: '🏴‍☠️ Thousand Sunny', hours: 61 }, { name: '🌊 Vogue Merry', hours: 33 }],
  best_day: { date: '2026-06-02', hours: 11.2 }, longest: { date: '2026-05-28', hours: 9.8 },
  prime: { start: 141_200_000, end: 168_300_000 }, rank: 'Roi des pirates',
  percentile: 3, streak: 17, berrys: 27_100_000, signature_day: 'dimanche soir', duels: null,
}

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`

const CSS = `
  @keyframes wrFadeUp { from { opacity: 0; transform: translateY(22px) } to { opacity: 1; transform: none } }
  @keyframes wrPop { 0% { transform: scale(.6); opacity: 0 } 70% { transform: scale(1.06) } 100% { transform: scale(1); opacity: 1 } }
  @keyframes wrWave { 0%,100% { transform: translateX(0) } 50% { transform: translateX(-28px) } }
  @keyframes wrBurst { from { transform: translate(0,0) scale(1); opacity: 1 } to { transform: translate(var(--dx), var(--dy)) scale(.2); opacity: 0 } }
  @keyframes wrGlow { 0%,100% { text-shadow: 0 0 24px rgba(245,217,123,.45) } 50% { text-shadow: 0 0 60px rgba(245,217,123,.9) } }
  @keyframes wrMeet { from { transform: translateX(var(--from)) } to { transform: none } }
  @media (prefers-reduced-motion: reduce) { * { animation-duration: .001s !important; transition-duration: .001s !important } }
`

const fmtH = (h) => (h >= 100 ? Math.round(h) : Math.round(h * 10) / 10).toLocaleString('fr-FR')
const fmtB = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n)
const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) } catch { return iso } }

function CountUp({ value, dur = 1400, decimals = 0 }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf, t0
    const step = (t) => {
      if (!t0) t0 = t
      const p = Math.min(1, (t - t0) / dur)
      setV(value * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, dur])
  return <>{v.toLocaleString('fr-FR', { maximumFractionDigits: decimals, minimumFractionDigits: 0 })}</>
}

function Burst({ count = 22, color = GOLD }) {
  const parts = useMemo(() => Array.from({ length: count }, (_, i) => ({
    dx: `${(Math.random() - 0.5) * 320}px`, dy: `${(Math.random() - 0.5) * 320}px`,
    delay: Math.random() * 0.25, size: 3 + Math.random() * 5,
  })), [count])
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'grid', placeItems: 'center' }}>
      {parts.map((p, i) => (
        <span key={i} style={{
          position: 'absolute', width: p.size, height: p.size, borderRadius: '50%', background: color,
          '--dx': p.dx, '--dy': p.dy, animation: `wrBurst 1.1s ${p.delay}s ease-out both`,
        }} />
      ))}
    </div>
  )
}

function Avatar({ url, name, size = 84, border = GOLD }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, display: 'grid', placeItems: 'center', background: '#10182a', border: `3px solid ${border}`, fontSize: size / 3, fontWeight: 800, color: GOLD }}>
      {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (name || '?').slice(0, 2).toUpperCase()}
    </span>
  )
}

// Cadre commun d'une slide : palette propre + contenu centré
function Slide({ bg, children }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 26px 90px', textAlign: 'center', background: bg, overflow: 'hidden' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: NOISE, pointerEvents: 'none' }} />
      {children}
    </div>
  )
}

const kicker = { fontSize: 12, fontWeight: 800, letterSpacing: '.3em', textTransform: 'uppercase', color: 'rgba(245,217,123,.75)', marginBottom: 18, animation: 'wrFadeUp .6s .1s both' }
const giant = { fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(64px, 24vw, 120px)', lineHeight: .95, color: GOLD, animation: 'wrPop .7s .25s both', fontStyle: 'italic' }
const body = { fontSize: 17, lineHeight: 1.5, color: 'rgba(235,240,250,.88)', maxWidth: 300, animation: 'wrFadeUp .6s .5s both', fontWeight: 600 }

export default function WrappedPage() {
  const { token } = useParams()
  const [params] = useSearchParams()
  const isMock = params.get('mock') === '1'
  const [data, setData] = useState(isMock ? MOCK : null)
  const [err, setErr] = useState(null)
  const [idx, setIdx] = useState(0)
  const [held, setHeld] = useState(false)
  const holdTimer = useRef(null)
  const reduced = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, [])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (isMock) return
    sbRpc('get_wrapped', { p_token: token }, { tag: 'wrapped' })
      .then(r => { if (r?.ok) setData({ ...(r.payload || {}), username: r.payload?.username }) ; else setErr(r?.error || 'token_invalide') })
      .catch(() => setErr('erreur'))
  }, [token, isMock])

  const d = data
  const slides = useMemo(() => {
    if (!d) return []
    const s = []
    s.push({ key: 'intro', render: () => (
      <Slide bg={`radial-gradient(120% 80% at 50% 110%, ${NIGHT2}, ${NIGHT} 70%)`}>
        <div aria-hidden style={{ position: 'absolute', bottom: -20, left: -40, right: -40, height: 130, opacity: .5, animation: 'wrWave 7s ease-in-out infinite' }}>
          <svg viewBox="0 0 500 80" preserveAspectRatio="none" style={{ width: '120%', height: '100%' }}>
            <path d="M0 40 Q 60 10 125 40 T 250 40 T 375 40 T 500 40 V 80 H 0 Z" fill="rgba(191,164,106,.18)" />
            <path d="M0 55 Q 60 30 125 55 T 250 55 T 375 55 T 500 55 V 80 H 0 Z" fill="rgba(60,110,190,.22)" />
          </svg>
        </div>
        <Avatar url={d.avatar_url} name={d.username} size={92} />
        <div style={{ ...kicker, marginTop: 26 }}>{d.period_label || 'Ta saison'} sur Grand Line</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, color: '#fff', lineHeight: 1.15, animation: 'wrFadeUp .6s .3s both' }}>
          {d.username},<br />ton log de bord est prêt. 🧭
        </div>
        <div style={{ ...body, marginTop: 18, color: 'rgba(235,240,250,.6)', fontSize: 14 }}>Tape à droite pour tourner les pages</div>
      </Slide>
    ) })
    s.push({ key: 'hours', render: () => (
      <Slide bg={`radial-gradient(110% 70% at 50% -10%, #123, ${NIGHT})`}>
        <Burst />
        <div style={kicker}>Heures en vocal</div>
        <div style={giant}><CountUp value={d.hours || 0} decimals={d.hours < 100 ? 1 : 0} /></div>
        <div style={{ ...body, marginTop: 20 }}>heures passées au micro avec tes nakamas.</div>
      </Slide>
    ) })
    {
      const eps = Math.max(1, Math.round((d.hours || 0) * 60 / 24))
      const op = (d.hours || 0) * 60 / (1100 * 24)
      s.push({ key: 'fun', render: () => (
        <Slide bg={`linear-gradient(170deg, #1A0F08, ${NIGHT})`}>
          <div style={kicker}>Soit l'équivalent de</div>
          <div style={{ ...giant, fontSize: 'clamp(52px, 18vw, 96px)' }}>{eps.toLocaleString('fr-FR')}</div>
          <div style={{ ...body, marginTop: 16 }}>
            épisodes d'anime{op >= 1 ? <> — ou <strong style={{ color: GOLD }}>{op.toFixed(1)}×</strong> l'intégrale de One Piece 🏴‍☠️</> : <> de 24 minutes, d'affilée.</>}
          </div>
        </Slide>
      ) })
    }
    if (d.best_day) s.push({ key: 'bestday', render: () => (
      <Slide bg={`linear-gradient(180deg, #160A1E, ${NIGHT})`}>
        <div style={kicker}>Ton jour de feu</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, color: '#fff', animation: 'wrPop .6s .2s both' }}>{fmtDate(d.best_day.date)}</div>
        <div style={{ ...giant, fontSize: 'clamp(56px, 20vw, 100px)', marginTop: 10 }}>{fmtH(d.best_day.hours)}h</div>
        <div style={{ ...body, marginTop: 16 }}>en une seule journée. Le serveur s'en souvient encore. 🔥</div>
      </Slide>
    ) })
    if (d.streak > 1) s.push({ key: 'streak', render: () => (
      <Slide bg={`linear-gradient(200deg, #051B12, ${NIGHT})`}>
        <div style={kicker}>Streak record</div>
        <div style={giant}>{d.streak}</div>
        <div style={{ ...body, marginTop: 18 }}>jours d'affilée avec au moins un passage en vocal. La constance d'un vrai capitaine. ⚓</div>
      </Slide>
    ) })
    if (d.top_channels?.length) s.push({ key: 'channels', render: () => (
      <Slide bg={`linear-gradient(160deg, #0D1B2E, ${NIGHT})`}>
        <div style={kicker}>Tes eaux préférées</div>
        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {d.top_channels.slice(0, 3).map((c, i) => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 14, background: i === 0 ? 'rgba(245,217,123,.12)' : 'rgba(255,255,255,.05)', border: `1px solid ${i === 0 ? 'rgba(245,217,123,.45)' : 'rgba(255,255,255,.1)'}`, animation: `wrFadeUp .5s ${.15 + i * .15}s both` }}>
              <span style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 800, fontSize: 22, color: i === 0 ? GOLD : 'rgba(255,255,255,.45)', width: 30 }}>#{i + 1}</span>
              <span style={{ flex: 1, textAlign: 'left', fontWeight: 700, fontSize: 15, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              <span style={{ fontWeight: 800, fontSize: 14, color: i === 0 ? GOLD : 'rgba(255,255,255,.6)' }}>{fmtH(c.hours)}h</span>
            </div>
          ))}
        </div>
      </Slide>
    ) })
    if (d.binome?.username) s.push({ key: 'binome', render: () => (
      <Slide bg={`radial-gradient(100% 70% at 50% 30%, #1C1230, ${NIGHT})`}>
        <div style={kicker}>Ton binôme</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: -10, marginBottom: 24 }}>
          <span style={{ animation: 'wrMeet .9s .2s both', '--from': '-60px', zIndex: 1 }}><Avatar url={d.avatar_url} name={d.username} size={96} /></span>
          <span style={{ animation: 'wrMeet .9s .2s both', '--from': '60px', marginLeft: -18 }}><Avatar url={d.binome.avatar_url} name={d.binome.username} size={96} border="#A66CFF" /></span>
        </div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 32, color: '#fff', lineHeight: 1.2, animation: 'wrFadeUp .6s .5s both' }}>
          Toi et <span style={{ color: GOLD }}>{d.binome.username}</span>
        </div>
        <div style={{ ...giant, fontSize: 'clamp(48px, 17vw, 88px)', marginTop: 8 }}>{fmtH(d.binome.hours)}h</div>
        <div style={{ ...body, marginTop: 14 }}>ensemble en vocal. Nakama. 🤝</div>
      </Slide>
    ) })
    if (d.longest) s.push({ key: 'longest', render: () => (
      <Slide bg={`linear-gradient(190deg, #1E1406, ${NIGHT})`}>
        <div style={kicker}>Ta plus longue traversée</div>
        <div style={{ ...giant, fontSize: 'clamp(56px, 20vw, 100px)' }}>{fmtH(d.longest.hours)}h</div>
        <div style={{ ...body, marginTop: 16 }}>d'affilée le {fmtDate(d.longest.date)}. Repose-toi, moussaillon. 😴</div>
      </Slide>
    ) })
    if (d.prime?.end != null) s.push({ key: 'prime', render: () => (
      <Slide bg={`linear-gradient(180deg, #170D05, #0E0903)`}>
        <div style={kicker}>Avis de recherche</div>
        <div style={{ padding: '22px 26px', background: `${NOISE}, linear-gradient(180deg, #20150A, #150D05)`, border: `2px solid rgba(245,217,123,.6)`, borderRadius: 6, animation: 'wrPop .6s .2s both' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.42em', color: '#E0524A', marginBottom: 8 }}>WANTED</div>
          <Avatar url={d.avatar_url} name={d.username} size={88} border="rgba(245,217,123,.6)" />
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 22, color: '#fff', margin: '10px 0 4px' }}>{d.username}</div>
          {d.prime.start != null && <div style={{ fontFamily: 'monospace', fontSize: 16, color: 'rgba(255,255,255,.4)', textDecoration: 'line-through' }}>฿ {fmtB(d.prime.start)}</div>}
          <div style={{ fontFamily: 'monospace', fontSize: 30, fontWeight: 800, color: GOLD, animation: 'wrGlow 2.4s infinite' }}>฿ <CountUp value={d.prime.end} /></div>
        </div>
        {d.prime.start > 0 && (
          <div style={{ ...body, marginTop: 18 }}>+{Math.round(((d.prime.end - d.prime.start) / Math.max(1, d.prime.start)) * 100)}% sur la période. Le Gouvernement Mondial te surveille. 👁️</div>
        )}
      </Slide>
    ) })
    if (d.percentile != null) s.push({ key: 'percentile', render: () => (
      <Slide bg={`radial-gradient(120% 90% at 50% 50%, #2A1F08, ${NIGHT})`}>
        <Burst count={34} />
        <div style={kicker}>Ta place sur Grand Line</div>
        <div style={{ ...giant, fontSize: 'clamp(58px, 21vw, 104px)', animation: 'wrPop .7s .25s both, wrGlow 2.6s 1s infinite' }}>TOP {d.percentile}%</div>
        <div style={{ ...body, marginTop: 18 }}>des pirates de Brams. {d.rank ? <>Rang : <strong style={{ color: GOLD }}>{d.rank}</strong>.</> : null} 👑</div>
      </Slide>
    ) })
    s.push({ key: 'final', render: () => (
      <Slide bg={`radial-gradient(120% 80% at 50% 110%, ${NIGHT2}, ${NIGHT} 75%)`}>
        <div style={kicker}>Récap du log de bord</div>
        <div style={{ width: '100%', maxWidth: 320, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, animation: 'wrFadeUp .5s .2s both' }}>
          {[
            ['⏱️', `${fmtH(d.hours || 0)}h`, 'vocal'],
            ['🤝', d.binome?.username || '—', 'binôme'],
            ['🏆', d.percentile != null ? `TOP ${d.percentile}%` : '—', 'des pirates'],
            ['🎖️', d.rank || '—', 'rang'],
          ].map(([ic, v, l]) => (
            <div key={l} style={{ padding: '14px 10px', borderRadius: 14, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(245,217,123,.25)' }}>
              <div style={{ fontSize: 18 }}>{ic}</div>
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 17, color: GOLD, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 22, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.55)', animation: 'wrFadeUp .5s .4s both' }}>
          🏴‍☠️ brams.community
        </div>
      </Slide>
    ) })
    return s
  }, [d])

  // Auto-advance 6 s (pause au hold), reset au changement de slide
  useEffect(() => {
    if (!slides.length || held || reduced) return
    const t = setTimeout(() => setIdx(i => Math.min(i + 1, slides.length - 1)), 6000)
    return () => clearTimeout(t)
  }, [idx, slides.length, held, reduced])

  const go = useCallback((dir) => setIdx(i => Math.max(0, Math.min(slides.length - 1, i + dir))), [slides.length])
  const onDown = () => { holdTimer.current = setTimeout(() => setHeld(true), 220) }
  const onUp = (e, dir) => {
    clearTimeout(holdTimer.current)
    if (held) { setHeld(false); return }
    go(dir)
  }

  if (err) return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: NIGHT, color: '#fff', fontFamily: DISPLAY, textAlign: 'center', padding: 24 }}>
      <div>
        <div style={{ fontSize: 44, marginBottom: 14 }}>🧭</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Ce Log Pose ne pointe nulle part…</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', marginTop: 8 }}>Lien invalide ou expiré. Tape /wrapped sur le Discord pour recevoir le tien.</div>
      </div>
    </div>
  )
  if (!d) return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: NIGHT, color: GOLD, fontFamily: DISPLAY, fontWeight: 800 }}>
      🧭 Déchiffrage du Log Pose…
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: `radial-gradient(900px 600px at 70% -10%, rgba(60,110,190,.12), transparent), ${NIGHT}`, display: 'grid', placeItems: 'center', fontFamily: DISPLAY }}>
      <style>{CSS}</style>
      {/* Cadre story 9:16 (plein écran mobile, centré desktop) */}
      <div style={{ position: 'relative', width: 'min(100vw, calc(100dvh * 9 / 16))', height: '100dvh', maxHeight: '100dvh', overflow: 'hidden', background: NIGHT, boxShadow: '0 0 80px rgba(0,0,0,.7)', userSelect: 'none' }}>
        {/* Barre segmentée */}
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 5, display: 'flex', gap: 4 }}>
          {slides.map((s, i) => (
            <span key={s.key} style={{ flex: 1, height: 3, borderRadius: 2, overflow: 'hidden', background: 'rgba(255,255,255,.22)' }}>
              <span style={{ display: 'block', height: '100%', background: GOLD, width: i < idx ? '100%' : i === idx ? undefined : '0%',
                ...(i === idx && !held && !reduced ? { animation: 'wrFill 6s linear forwards' } : i === idx ? { width: '40%' } : {}) }} />
            </span>
          ))}
          <style>{'@keyframes wrFill { from { width: 0 } to { width: 100% } }'}</style>
        </div>
        {/* Slide courante */}
        {slides[idx]?.render()}
        {/* Zones tactiles gauche/droite */}
        <button aria-label="Précédent" onPointerDown={onDown} onPointerUp={(e) => onUp(e, -1)}
          style={{ position: 'absolute', inset: '0 70% 0 0', background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 4 }} />
        <button aria-label="Suivant" onPointerDown={onDown} onPointerUp={(e) => onUp(e, 1)}
          style={{ position: 'absolute', inset: '0 0 0 30%', background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 4 }} />
      </div>
    </div>
  )
}
