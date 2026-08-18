// ── BRAMS WRAPPED — log de bord 9:16 ────────────────────────────────────────
// Lecture : recap personnel ciné (Spotify Wrapped x journal de bord pirate).
// Dial : variance 8 / motion 7 / density 4. Clash Display + or champagne.
// Binôme = même salon (payload v2). ?mock=1 pour itérer le design.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { sbRpc } from '../lib/supabaseRest.js'
import { generateShareCard, shareCanvas } from '../lib/shareCardGenerator.js'

const GOLD = '#C9A46A'
const INK = '#07080C'
const PAPER = '#E6D8C2'
const DISPLAY = "'Clash Display', 'Bricolage Grotesque', 'Syne', sans-serif"
const BODY = "'Bricolage Grotesque', 'Inter', sans-serif"

const MOCK = {
  v: 2, username: 'Al Freydiss', avatar_url: null, period_label: '30 derniers jours',
  hours: 187.4, binome: { username: 'Berat', avatar_url: null, hours: 41.2 },
  top_channels: [{ name: 'Thousand Sunny', hours: 72 }, { name: 'Grand Line', hours: 48 }, { name: 'Vogue Merry', hours: 21 }],
  best_day: { date: '2026-06-02', hours: 11.2 }, longest: { date: '2026-05-28', hours: 9.8 },
  prime: { start: 141200000, end: 168300000 }, rank: 'Roi des pirates',
  percentile: 3, streak: 17, signature_day: 'dimanche', messages: 1840,
  vibe: 'night_owl', night_share: 0.58, day_share: 0.22,
  days_on_server: 412, joined_at: '2025-06-11', berrys: 27100000,
}

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.07'/%3E%3C/svg%3E")`

const CSS = `
  @keyframes wrIn { from { opacity: 0; transform: translateY(28px) } to { opacity: 1; transform: none } }
  @keyframes wrPop { 0% { transform: scale(.72); opacity: 0 } 68% { transform: scale(1.04) } 100% { transform: scale(1); opacity: 1 } }
  @keyframes wrSpin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
  @keyframes wrWave { 0%,100% { transform: translateX(0) } 50% { transform: translateX(-36px) } }
  @keyframes wrBurst { from { transform: translate(0,0) scale(1); opacity: 1 } to { transform: translate(var(--dx), var(--dy)) scale(.15); opacity: 0 } }
  @keyframes wrPulse { 0%,100% { opacity: .35 } 50% { opacity: .7 } }
  @keyframes wrMeetL { from { transform: translateX(-54px); opacity: 0 } to { transform: none; opacity: 1 } }
  @keyframes wrMeetR { from { transform: translateX(54px); opacity: 0 } to { transform: none; opacity: 1 } }
  @keyframes wrFill { from { width: 0 } to { width: 100% } }
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: .001s !important; transition-duration: .001s !important }
  }
`

const fmtH = (h) => (h >= 100 ? Math.round(h) : Math.round((h || 0) * 10) / 10).toLocaleString('fr-FR')
const fmtB = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n ?? 0)
const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) } catch { return iso } }
const fmtJoin = (iso) => { try { return new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) } catch { return iso } }

function CountUp({ value, dur = 1300, decimals = 0 }) {
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
  return <>{v.toLocaleString('fr-FR', { maximumFractionDigits: decimals })}</>
}

function Burst({ count = 18, color = GOLD }) {
  const parts = useMemo(() => Array.from({ length: count }, () => ({
    dx: `${(Math.random() - 0.5) * 300}px`, dy: `${(Math.random() - 0.5) * 300}px`,
    delay: Math.random() * 0.22, size: 2.5 + Math.random() * 4.5,
  })), [count])
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'grid', placeItems: 'center' }}>
      {parts.map((p, i) => (
        <span key={i} style={{
          position: 'absolute', width: p.size, height: p.size, borderRadius: '50%', background: color,
          '--dx': p.dx, '--dy': p.dy, animation: `wrBurst 1s ${p.delay}s ease-out both`,
        }} />
      ))}
    </div>
  )
}

function Avatar({ url, name, size = 84, border = GOLD }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      display: 'grid', placeItems: 'center', background: '#12100C',
      border: `2px solid ${border}`, fontSize: size / 3.2, fontWeight: 800, color: GOLD, fontFamily: DISPLAY,
    }}>
      {url
        ? <img loading="lazy" decoding="async" src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (name || '?').slice(0, 2).toUpperCase()}
    </span>
  )
}

function Compass({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden style={{ animation: 'wrSpin 28s linear infinite' }}>
      <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(201,164,106,.28)" strokeWidth="1.2" />
      <circle cx="60" cy="60" r="38" fill="none" stroke="rgba(201,164,106,.18)" strokeWidth="1" />
      <path d="M60 10 L66 60 L60 52 L54 60 Z" fill={GOLD} />
      <path d="M60 110 L54 60 L60 68 L66 60 Z" fill="rgba(230,216,194,.35)" />
      <circle cx="60" cy="60" r="4" fill={GOLD} />
    </svg>
  )
}

function Slide({ bg, children }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '72px 26px 96px',
      textAlign: 'center', background: bg, overflow: 'hidden',
    }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: NOISE, pointerEvents: 'none' }} />
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(120% 80% at 50% 100%, transparent 40%, rgba(0,0,0,.45))',
      }} />
      {children}
    </div>
  )
}

const kick = { fontFamily: BODY, fontSize: 11, fontWeight: 700, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(201,164,106,.72)', marginBottom: 16, animation: 'wrIn .55s .08s both' }
const giant = { fontFamily: DISPLAY, fontWeight: 700, fontSize: 'clamp(68px, 22vw, 118px)', lineHeight: 0.92, letterSpacing: '-.04em', color: GOLD, animation: 'wrPop .75s .18s both' }
const copy = { fontFamily: BODY, fontSize: 16.5, lineHeight: 1.45, color: 'rgba(230,216,194,.82)', maxWidth: 300, animation: 'wrIn .55s .42s both', fontWeight: 500 }

export default function WrappedPage() {
  const { token } = useParams()
  const [params] = useSearchParams()
  const isMock = params.get('mock') === '1'
  const [data, setData] = useState(isMock ? MOCK : null)
  const [err, setErr] = useState(null)
  const [idx, setIdx] = useState(0)
  const [held, setHeld] = useState(false)
  const [copied, setCopied] = useState(false)
  const holdTimer = useRef(null)
  const touchX = useRef(null)

  const trackShare = useCallback(() => {
    if (!isMock) sbRpc('wrapped_share', { p_token: token }, { tag: 'wrapped' }).catch(() => {})
  }, [token, isMock])
  const doShare = useCallback(async (format) => {
    try {
      const canvas = await generateShareCard(data, format, 'wrapped')
      await shareCanvas(canvas, `brams-wrapped-${format === '916' ? 'story' : 'carre'}.png`)
      trackShare()
    } catch (e) { console.error('[wrapped share]', e) }
  }, [data, trackShare])
  const copyLink = useCallback(() => {
    navigator.clipboard?.writeText(window.location.href.split('?')[0])
    setCopied(true); setTimeout(() => setCopied(false), 1800)
    trackShare()
  }, [trackShare])
  const reduced = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches, [])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (isMock) return
    sbRpc('get_wrapped', { p_token: token }, { tag: 'wrapped' })
      .then(r => { if (r?.ok) setData({ ...(r.payload || {}) }); else setErr(r?.error || 'token_invalide') })
      .catch(() => setErr('erreur'))
  }, [token, isMock])

  const d = data
  const slides = useMemo(() => {
    if (!d) return []
    const s = []

    s.push({ key: 'intro', render: () => (
      <Slide bg={`radial-gradient(90% 70% at 50% 0%, #1A140C, ${INK})`}>
        <div aria-hidden style={{ position: 'absolute', bottom: -8, left: -50, right: -50, height: 150, opacity: .55, animation: 'wrWave 8s ease-in-out infinite' }}>
          <svg viewBox="0 0 500 90" preserveAspectRatio="none" style={{ width: '130%', height: '100%' }}>
            <path d="M0 42 Q 70 8 140 42 T 280 42 T 420 42 T 560 42 V 90 H 0 Z" fill="rgba(201,164,106,.14)" />
            <path d="M0 58 Q 70 28 140 58 T 280 58 T 420 58 T 560 58 V 90 H 0 Z" fill="rgba(12,22,40,.55)" />
          </svg>
        </div>
        <Compass size={108} />
        <div style={{ ...kick, marginTop: 22 }}>{d.period_label || 'Ta saison'}</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 36, color: PAPER, lineHeight: 1.08, letterSpacing: '-.03em', animation: 'wrIn .6s .25s both', maxWidth: 320 }}>
          {d.username}
        </div>
        <div style={{ ...copy, marginTop: 14, color: 'rgba(230,216,194,.55)', fontSize: 14 }}>
          Ton log de bord est ouvert.
        </div>
      </Slide>
    ) })

    if (d.days_on_server >= 30) s.push({ key: 'tenure', render: () => (
      <Slide bg={`linear-gradient(180deg, #120E09, ${INK})`}>
        <div style={kick}>À bord depuis</div>
        <div style={giant}>{d.days_on_server}</div>
        <div style={{ ...copy, marginTop: 16 }}>
          jours{d.joined_at ? ` (depuis ${fmtJoin(d.joined_at)})` : ''}. Le navire te connaît.
        </div>
      </Slide>
    ) })

    s.push({ key: 'hours', render: () => (
      <Slide bg={`radial-gradient(100% 70% at 50% -8%, #1C160C, ${INK})`}>
        <Burst />
        <div style={kick}>Heures en vocal</div>
        <div style={giant}><CountUp value={d.hours || 0} decimals={(d.hours || 0) < 100 ? 1 : 0} /></div>
        <div style={{ ...copy, marginTop: 18 }}>heures au micro, sur les 30 derniers jours.</div>
      </Slide>
    ) })

    {
      const eps = Math.max(1, Math.round((d.hours || 0) * 60 / 24))
      const op = (d.hours || 0) * 60 / (1100 * 24)
      s.push({ key: 'fun', render: () => (
        <Slide bg={`linear-gradient(165deg, #1A1008, ${INK})`}>
          <div style={kick}>Soit l'équivalent de</div>
          <div style={{ ...giant, fontSize: 'clamp(54px, 18vw, 96px)' }}>{eps.toLocaleString('fr-FR')}</div>
          <div style={{ ...copy, marginTop: 16 }}>
            {op >= 1
              ? <>épisodes de 24 min. Ou <span style={{ color: GOLD }}>{op.toFixed(1)}×</span> l'intégrale de One Piece.</>
              : <>épisodes de 24 minutes, d'affilée.</>}
          </div>
        </Slide>
      ) })
    }

    if (d.vibe === 'night_owl' || d.vibe === 'daytime') s.push({ key: 'vibe', render: () => (
      <Slide bg={d.vibe === 'night_owl'
        ? `radial-gradient(90% 80% at 50% 20%, #0E1630, ${INK})`
        : `radial-gradient(90% 80% at 50% 110%, #2A1C0A, ${INK})`}>
        <div style={{ fontSize: 52, animation: 'wrPop .6s .15s both' }}>{d.vibe === 'night_owl' ? '☾' : '☀'}</div>
        <div style={{ ...giant, fontSize: 'clamp(36px, 11vw, 52px)', marginTop: 10, letterSpacing: '-.03em' }}>
          {d.vibe === 'night_owl' ? 'Oiseau de nuit' : 'Lève-tôt'}
        </div>
        <div style={{ ...copy, marginTop: 16 }}>
          {d.vibe === 'night_owl'
            ? `${Math.round((d.night_share || 0) * 100)}% de tes heures tombent entre 22h et 6h.`
            : `${Math.round((d.day_share || 0) * 100)}% de tes heures tombent en journée.`}
        </div>
      </Slide>
    ) })

    if (d.best_day) s.push({ key: 'bestday', render: () => (
      <Slide bg={`linear-gradient(180deg, #160A10, ${INK})`}>
        <div style={kick}>Jour de feu</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 28, color: PAPER, animation: 'wrPop .55s .15s both' }}>{fmtDate(d.best_day.date)}</div>
        <div style={{ ...giant, fontSize: 'clamp(56px, 19vw, 96px)', marginTop: 8 }}>{fmtH(d.best_day.hours)}h</div>
        <div style={{ ...copy, marginTop: 14 }}>en une seule journée.</div>
      </Slide>
    ) })

    if (d.streak > 1) s.push({ key: 'streak', render: () => (
      <Slide bg={`linear-gradient(200deg, #07160F, ${INK})`}>
        <div style={kick}>Série</div>
        <div style={giant}>{d.streak}</div>
        <div style={{ ...copy, marginTop: 16 }}>jours d'affilée avec au moins un passage en vocal.</div>
      </Slide>
    ) })

    if (d.signature_day) s.push({ key: 'sig', render: () => (
      <Slide bg={`linear-gradient(160deg, #10140C, ${INK})`}>
        <div style={kick}>Ton jour</div>
        <div style={{ ...giant, fontSize: 'clamp(42px, 13vw, 64px)', textTransform: 'capitalize' }}>{d.signature_day}</div>
        <div style={{ ...copy, marginTop: 16 }}>c'est là que tu occupes le plus le pont.</div>
      </Slide>
    ) })

    if (d.top_channels?.length) s.push({ key: 'channels', render: () => (
      <Slide bg={`linear-gradient(160deg, #0C141C, ${INK})`}>
        <div style={kick}>Tes eaux</div>
        <div style={{ width: '100%', maxWidth: 318, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {d.top_channels.slice(0, 3).map((c, i) => (
            <div key={c.name} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 4,
              background: i === 0 ? 'rgba(201,164,106,.12)' : 'rgba(255,255,255,.03)',
              border: `1px solid ${i === 0 ? 'rgba(201,164,106,.45)' : 'rgba(230,216,194,.1)'}`,
              animation: `wrIn .45s ${.12 + i * .12}s both`,
            }}>
              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 20, color: i === 0 ? GOLD : 'rgba(230,216,194,.35)', width: 28 }}>{i + 1}</span>
              <span style={{ flex: 1, textAlign: 'left', fontWeight: 600, fontSize: 14.5, color: PAPER, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: BODY }}>{c.name}</span>
              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, color: i === 0 ? GOLD : 'rgba(230,216,194,.55)' }}>{fmtH(c.hours)}h</span>
            </div>
          ))}
        </div>
      </Slide>
    ) })

    if (d.binome?.username) s.push({ key: 'binome', render: () => (
      <Slide bg={`radial-gradient(100% 70% at 50% 28%, #1A1208, ${INK})`}>
        <div style={kick}>Même salon, même mer</div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ animation: 'wrMeetL .75s .15s both', zIndex: 1 }}><Avatar url={d.avatar_url} name={d.username} size={92} /></span>
          <span style={{ animation: 'wrMeetR .75s .15s both', marginLeft: -16 }}><Avatar url={d.binome.avatar_url} name={d.binome.username} size={92} border="#8C6A3A" /></span>
        </div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 28, color: PAPER, lineHeight: 1.15, animation: 'wrIn .5s .4s both', maxWidth: 320 }}>
          Toi et <span style={{ color: GOLD }}>{d.binome.username}</span>
        </div>
        <div style={{ ...giant, fontSize: 'clamp(46px, 16vw, 84px)', marginTop: 8 }}>{fmtH(d.binome.hours)}h</div>
        <div style={{ ...copy, marginTop: 12 }}>ensemble, dans le même salon. Pas juste en ligne en même temps.</div>
      </Slide>
    ) })

    if (d.longest) s.push({ key: 'longest', render: () => (
      <Slide bg={`linear-gradient(190deg, #1A1206, ${INK})`}>
        <div style={kick}>Plus longue session</div>
        <div style={{ ...giant, fontSize: 'clamp(56px, 19vw, 96px)' }}>{fmtH(d.longest.hours)}h</div>
        <div style={{ ...copy, marginTop: 16 }}>d'affilée le {fmtDate(d.longest.date)}.</div>
      </Slide>
    ) })

    if (d.messages > 0) s.push({ key: 'msgs', render: () => (
      <Slide bg={`linear-gradient(175deg, #101018, ${INK})`}>
        <div style={kick}>Au clavier</div>
        <div style={giant}><CountUp value={d.messages} /></div>
        <div style={{ ...copy, marginTop: 16 }}>messages en 30 jours.</div>
      </Slide>
    ) })

    if (d.prime?.end != null) s.push({ key: 'prime', render: () => (
      <Slide bg={`linear-gradient(180deg, #140C06, #080604)`}>
        <div style={{
          width: 'min(86%, 300px)', padding: '22px 20px 20px',
          background: `linear-gradient(180deg, #2A1C10, #171008)`,
          border: `2px solid ${GOLD}`, borderRadius: 2, animation: 'wrPop .6s .15s both',
          boxShadow: '0 18px 50px rgba(0,0,0,.45)',
        }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 12, fontWeight: 700, letterSpacing: '.38em', color: '#9A2B2B', marginBottom: 10 }}>WANTED</div>
          <Avatar url={d.avatar_url} name={d.username} size={80} border="rgba(201,164,106,.55)" />
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, color: PAPER, margin: '10px 0 6px' }}>{d.username}</div>
          {d.prime.start > 0 && (
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'rgba(230,216,194,.35)', textDecoration: 'line-through' }}>฿ {fmtB(d.prime.start)}</div>
          )}
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 26, fontWeight: 700, color: GOLD }}>
            ฿ <CountUp value={d.prime.end} />
          </div>
        </div>
        {d.rank && <div style={{ ...copy, marginTop: 16 }}>Rang actuel : <span style={{ color: GOLD }}>{d.rank}</span></div>}
      </Slide>
    ) })

    if (d.percentile != null) s.push({ key: 'pct', render: () => (
      <Slide bg={`radial-gradient(110% 80% at 50% 40%, #24180A, ${INK})`}>
        <Burst count={26} />
        <div style={kick}>Parmi les pirates</div>
        <div style={{ ...giant, fontSize: 'clamp(52px, 18vw, 92px)' }}>TOP {d.percentile}%</div>
        <div style={{ ...copy, marginTop: 16 }}>du vocal sur Brams, ces 30 jours.</div>
      </Slide>
    ) })

    s.push({ key: 'final', render: () => (
      <Slide bg={`radial-gradient(120% 80% at 50% 110%, #16110A, ${INK})`}>
        <div style={kick}>Fin du log</div>
        <div style={{ width: '100%', maxWidth: 318, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, animation: 'wrIn .45s .15s both' }}>
          {[
            [`${fmtH(d.hours || 0)}h`, 'vocal'],
            [d.binome?.username || 'solo', 'binôme'],
            [d.percentile != null ? `TOP ${d.percentile}%` : '-', 'rang vocal'],
            [d.rank || 'Moussaillon', 'grade'],
          ].map(([v, l]) => (
            <div key={l} style={{ padding: '14px 10px', background: 'rgba(201,164,106,.06)', border: '1px solid rgba(201,164,106,.22)' }}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, color: GOLD, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
              <div style={{ fontFamily: BODY, fontSize: 10.5, color: 'rgba(230,216,194,.45)', fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20, animation: 'wrIn .45s .35s both', position: 'relative', zIndex: 6 }}>
          {[
            ['Story 9:16', () => doShare('916')],
            ['Carré 1:1', () => doShare('11')],
            [copied ? 'Lien copié' : 'Copier le lien', copyLink],
          ].map(([label, fn]) => (
            <button key={label} type="button" onClick={(e) => { e.stopPropagation(); fn() }} style={{
              padding: '11px 14px', cursor: 'pointer', fontFamily: DISPLAY, fontWeight: 600, fontSize: 13,
              background: 'transparent', border: `1.5px solid ${GOLD}`, color: GOLD, borderRadius: 2,
            }}>{label}</button>
          ))}
        </div>
        <div style={{ marginTop: 16, fontFamily: BODY, fontSize: 12.5, fontWeight: 600, color: 'rgba(230,216,194,.4)', animation: 'wrIn .45s .45s both' }}>
          brams.community
        </div>
      </Slide>
    ) })
    return s
  }, [d, copied, doShare, copyLink])

  useEffect(() => {
    if (!slides.length || held || reduced) return
    const t = setTimeout(() => setIdx(i => Math.min(i + 1, slides.length - 1)), 6200)
    return () => clearTimeout(t)
  }, [idx, slides.length, held, reduced])

  const go = useCallback((dir) => setIdx(i => Math.max(0, Math.min(slides.length - 1, i + dir))), [slides.length])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(1) }
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const onDown = (e) => {
    touchX.current = e.clientX ?? e.touches?.[0]?.clientX ?? null
    holdTimer.current = setTimeout(() => setHeld(true), 220)
  }
  const onUp = (e, dir) => {
    clearTimeout(holdTimer.current)
    if (held) { setHeld(false); return }
    const x = e.clientX ?? e.changedTouches?.[0]?.clientX
    if (touchX.current != null && x != null && Math.abs(x - touchX.current) > 50) {
      go(x < touchX.current ? 1 : -1)
      return
    }
    go(dir)
  }

  if (err) return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: INK, color: PAPER, fontFamily: DISPLAY, textAlign: 'center', padding: 24 }}>
      <div>
        <Compass size={72} />
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 16 }}>Ce log ne mène nulle part</div>
        <div style={{ fontFamily: BODY, fontSize: 14, color: 'rgba(230,216,194,.5)', marginTop: 8 }}>Lien invalide ou expiré. Tape /wrapped sur Discord.</div>
      </div>
    </div>
  )
  if (!d) return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: INK, color: GOLD, fontFamily: DISPLAY, fontWeight: 700 }}>
      Ouverture du log…
    </div>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000, background: INK,
      display: 'grid', placeItems: 'center', fontFamily: BODY,
    }}>
      <style>{CSS}</style>
      <div style={{
        position: 'relative', width: 'min(100vw, calc(100dvh * 9 / 16))',
        height: '100dvh', maxHeight: '100dvh', overflow: 'hidden', background: INK,
        boxShadow: '0 0 80px rgba(0,0,0,.7)', userSelect: 'none',
      }}>
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 5, display: 'flex', gap: 3 }}>
          {slides.map((sl, i) => (
            <span key={sl.key} style={{ flex: 1, height: 2.5, overflow: 'hidden', background: 'rgba(230,216,194,.18)' }}>
              <span style={{
                display: 'block', height: '100%', background: GOLD,
                width: i < idx ? '100%' : i === idx ? undefined : '0%',
                ...(i === idx && !held && !reduced ? { animation: 'wrFill 6.2s linear forwards' } : i === idx ? { width: '40%' } : {}),
              }} />
            </span>
          ))}
        </div>
        {slides[idx]?.render()}
        <button type="button" aria-label="Précédent" onPointerDown={onDown} onPointerUp={(e) => onUp(e, -1)}
          style={{ position: 'absolute', inset: '0 68% 0 0', background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 4 }} />
        <button type="button" aria-label="Suivant" onPointerDown={onDown} onPointerUp={(e) => onUp(e, 1)}
          style={{ position: 'absolute', inset: '0 0 0 32%', background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 4 }} />
      </div>
    </div>
  )
}
