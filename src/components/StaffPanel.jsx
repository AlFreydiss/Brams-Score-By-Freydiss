import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useOpeningBg } from '../contexts/OpeningBgContext.jsx'
import { isStaff, isCreator } from '../lib/roles.js'
import { listPostReports } from '../lib/feed.js'
import { getAccessToken } from '../lib/supabaseRest.js'
import StaffSettings from './StaffSettings.jsx'
import AnalyticsTab from './staff/AnalyticsTab.jsx'

// ── Tokens (mêmes que StaffSettings — dark premium sobre) ───────────────────
const C = {
  bg: '#08090D', panel: '#0A0B0F', card: '#0F1014', cardHi: '#13141A',
  border: 'rgba(255,255,255,0.05)', borderHi: 'rgba(191,164,106,0.26)',
  gold: '#BFA46A', goldSoft: 'rgba(191,164,106,0.10)',
  pos: '#6fae8b', posSoft: 'rgba(111,174,139,0.10)',
  neg: '#c98b86', negSoft: 'rgba(201,139,134,0.07)',
  text: '#E7E5DE', sub: '#9A9AA6', muted: '#6C6C78', dim: '#43434F',
}
const SIDEBAR_W = '232px', HEADER_H = '58px', CINZEL = "'Cinzel', serif"
const REVENUE_ADMIN_IDS = ['1094070545248694342', '1079054995917381672', '999607813334638692']

const eur = (cents) => (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000)
  if (!isFinite(m)) return ''
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60); if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

// 7 derniers jours à partir des paiements récents (données RÉELLES, bucketées).
function last7Series(recent) {
  const now = new Date(), days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i)
    days.push({ ts: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), label: `${d.getDate()}/${d.getMonth() + 1}`, value: 0 })
  }
  for (const c of recent || []) {
    if (!c.paid || c.refunded) continue
    const d = new Date((c.created || 0) * 1000)
    const k = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const day = days.find(x => x.ts === k); if (day) day.value += c.amount
  }
  return days
}

// ── Graphique de revenus (SVG pur, aire dégradée, courbe lissée) ────────────
function RevenueChart({ series, accent = C.gold }) {
  const W = 600, H = 150, padX = 6, padTop = 14, padBot = 22
  const max = Math.max(...series.map(s => s.value), 100)
  const n = series.length
  const xs = (i) => padX + (i * (W - padX * 2)) / (n - 1)
  const ys = (v) => padTop + (1 - v / max) * (H - padTop - padBot)
  const pts = series.map((s, i) => [xs(i), ys(s.value)])
  // courbe lissée (Catmull-Rom → Bézier)
  let line = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[Math.max(0, i - 1)], [x1, y1] = pts[i], [x2, y2] = pts[i + 1], [x3, y3] = pts[Math.min(n - 1, i + 2)]
    const c1x = x1 + (x2 - x0) / 6, c1y = y1 + (y2 - y0) / 6
    const c2x = x2 - (x3 - x1) / 6, c2y = y2 - (y3 - y1) / 6
    line += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`
  }
  const area = `${line} L ${xs(n - 1)} ${H - padBot} L ${xs(0)} ${H - padBot} Z`
  const total = series.reduce((a, s) => a + s.value, 0)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em' }}>Revenus · 7 jours</span>
        <span style={{ fontFamily: CINZEL, fontSize: 20, fontWeight: 700, color: C.text }}>{eur(total)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(g => <line key={g} x1={padX} x2={W - padX} y1={padTop + g * (H - padTop - padBot)} y2={padTop + g * (H - padTop - padBot)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />)}
        <path d={area} fill="url(#revFill)" />
        <path d={line} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={i === n - 1 ? 4 : 2.5} fill={i === n - 1 ? accent : C.bg} stroke={accent} strokeWidth="1.5" />
            {i === n - 1 && <circle cx={x} cy={y} r="7" fill="none" stroke={accent} strokeOpacity="0.4" strokeWidth="1" />}
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {series.map((s, i) => <span key={i} style={{ fontSize: 10, color: C.dim }}>{s.label}</span>)}
      </div>
    </div>
  )
}

// ── Primitives ──────────────────────────────────────────────────────────────
function Card({ children, style }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, ...style }}>{children}</div>
}
function Kpi({ label, value, sub, subColor }) {
  const [h, setH] = useState(false)
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ background: C.card, border: `1px solid ${h ? C.borderHi : C.border}`, borderRadius: 14, padding: '16px 18px', transition: 'border .2s', minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 9 }}>{label}</div>
      <div style={{ fontFamily: CINZEL, fontSize: 24, fontWeight: 700, color: C.text, lineHeight: 1, whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: subColor || C.muted, marginTop: 8 }}>{sub}</div>}
    </div>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'overview', label: "Vue d'ensemble" }, { id: 'revenus', label: 'Revenus' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'reports', label: 'Signalements' }, { id: 'members', label: 'Membres' },
  { id: 'bot', label: 'Brams Score' }, { id: 'settings', label: 'Paramètres' },
]
function Sidebar({ active, setActive, badge }) {
  const navigate = useNavigate(); const [hov, setHov] = useState(null)
  return (
    <aside style={{ width: SIDEBAR_W, flexShrink: 0, background: C.panel, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
      <div onClick={() => navigate('/')} title="Retour au site" style={{ padding: '18px 20px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
        <div style={{ fontFamily: CINZEL, color: C.gold, fontSize: 17, fontWeight: 700, letterSpacing: '.02em' }}>Staff</div>
        <div style={{ fontSize: 10.5, color: C.muted, letterSpacing: '.16em', textTransform: 'uppercase', marginTop: 3 }}>Brams Community</div>
      </div>
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(it => {
          const on = active === it.id, hv = hov === it.id
          return (
            <button key={it.id} onClick={() => setActive(it.id)} onMouseEnter={() => setHov(it.id)} onMouseLeave={() => setHov(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13.5, fontFamily: 'inherit', border: 'none',
                background: on ? C.goldSoft : hv ? 'rgba(255,255,255,0.03)' : 'transparent', color: on ? C.gold : hv ? C.text : C.sub, fontWeight: on ? 600 : 500, transition: 'background .15s, color .15s' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: on ? C.gold : 'transparent', flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.id === 'reports' && badge > 0 && <span style={{ fontSize: 10.5, fontWeight: 800, color: C.neg, background: C.negSoft, borderRadius: 999, padding: '1px 7px' }}>{badge}</span>}
            </button>
          )
        })}
      </nav>
      <div style={{ padding: '14px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.pos, boxShadow: `0 0 7px ${C.pos}`, animation: 'pulse 2s ease-in-out infinite', flexShrink: 0 }} />
        <div style={{ lineHeight: 1.25 }}><div style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>Brams Score</div><div style={{ fontSize: 10.5, color: C.muted }}>Bot en ligne</div></div>
      </div>
    </aside>
  )
}
function TopBar({ active, displayName, avatarUrl, isCreatorUser }) {
  const crumb = NAV.find(n => n.id === active)?.label || "Vue d'ensemble"
  const initials = (displayName || '?').slice(0, 2).toUpperCase()
  return (
    <header style={{ height: HEADER_H, flexShrink: 0, borderBottom: `1px solid ${C.border}`, padding: '0 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ fontSize: 11.5, color: C.muted, letterSpacing: '.05em' }}><span style={{ textTransform: 'uppercase' }}>Modération</span><span style={{ color: C.dim }}> / </span><span style={{ color: C.text }}>{crumb}</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', background: C.goldSoft, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: C.gold, border: `1px solid ${C.border}` }}>{avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{displayName}</span>
        {isCreatorUser && <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.06em', color: C.gold, background: C.goldSoft, border: `1px solid ${C.borderHi}`, borderRadius: 999, padding: '2px 9px' }}>CRÉATEUR</span>}
      </div>
    </header>
  )
}

// ── Paiements récents ────────────────────────────────────────────────────────
function PaymentsList({ recent, limit = 8 }) {
  if (!recent) return <div style={{ color: C.muted, fontSize: 13, padding: '8px 0' }}>Chargement…</div>
  if (recent.length === 0) return <div style={{ color: C.muted, fontSize: 13, padding: '8px 0' }}>Aucun paiement récent.</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {recent.slice(0, limit).map((c, i) => {
        const ok = c.paid && !c.refunded
        const email = c.email ? c.email.replace(/^(.{2}).*(@.*)$/, '$1•••$2') : (c.desc || 'Paiement')
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12.5, color: C.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: c.refunded ? C.muted : ok ? C.pos : C.neg, textDecoration: c.refunded ? 'line-through' : 'none' }}>{eur(c.amount)}</span>
              <span style={{ fontSize: 10.5, color: C.dim, minWidth: 54, textAlign: 'right' }}>{timeAgo(new Date((c.created || 0) * 1000))}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

function SectionTitle({ children, right }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}><span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{children}</span>{right}</div>
}
function LiveTag() {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, color: C.pos, letterSpacing: '.04em' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.pos, animation: 'pulse 1.8s ease-in-out infinite' }} />LIVE · 12s</span>
}

// ── Vues ─────────────────────────────────────────────────────────────────────
function Overview({ revenue, revErr, reportCount }) {
  const series = useMemo(() => last7Series(revenue?.recent), [revenue])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <Kpi label="Encaissé récent" value={revenue ? eur(revenue.recentTotal) : '—'} sub={revenue ? `${revenue.recentCount} paiements` : 'Stripe'} />
        <Kpi label="Solde dispo" value={revenue ? eur(revenue.available) : '—'} sub="Disponible" subColor={C.pos} />
        <Kpi label="En attente" value={revenue ? eur(revenue.pending) : '—'} sub="En cours de versement" />
        <Kpi label="Signalements" value={String(reportCount ?? 0)} sub={reportCount ? 'À traiter' : 'Aucun ouvert'} subColor={reportCount ? C.neg : C.pos} />
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <Card style={{ flex: 3, minWidth: 0 }}>
          <SectionTitle right={<LiveTag />}>Revenus Stripe</SectionTitle>
          {revErr ? <div style={{ color: C.neg, fontSize: 13, padding: '8px 0' }}>{revErr}</div> : <RevenueChart series={series} />}
        </Card>
        <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <SectionTitle>Signalements</SectionTitle>
            <div style={{ textAlign: 'center', padding: '20px 12px', background: reportCount ? C.negSoft : C.posSoft, border: `1px solid ${reportCount ? C.neg + '40' : C.pos + '40'}`, borderRadius: 10 }}>
              <div style={{ fontSize: 22, color: reportCount ? C.neg : C.pos, marginBottom: 6 }}>{reportCount ? '⚠' : '✓'}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: reportCount ? C.neg : C.pos }}>{reportCount ? `${reportCount} à traiter` : 'Aucun signalement'}</div>
            </div>
          </Card>
          <Card>
            <SectionTitle>Derniers paiements</SectionTitle>
            <PaymentsList recent={revErr ? [] : revenue?.recent} limit={4} />
          </Card>
        </div>
      </div>
    </div>
  )
}
function RevenusView({ revenue, revErr }) {
  const series = useMemo(() => last7Series(revenue?.recent), [revenue])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <Kpi label="Solde dispo" value={revenue ? eur(revenue.available) : '—'} subColor={C.pos} sub="Disponible" />
        <Kpi label="En attente" value={revenue ? eur(revenue.pending) : '—'} sub="Versement à venir" />
        <Kpi label="Encaissé récent" value={revenue ? eur(revenue.recentTotal) : '—'} sub={revenue ? `${revenue.recentCount} paiements` : '—'} />
      </div>
      <Card><SectionTitle right={<LiveTag />}>Évolution</SectionTitle>{revErr ? <div style={{ color: C.neg, fontSize: 13 }}>{revErr}</div> : <RevenueChart series={series} />}</Card>
      <Card><SectionTitle>Tous les paiements récents</SectionTitle><PaymentsList recent={revErr ? [] : revenue?.recent} limit={20} /></Card>
    </div>
  )
}
function ReportsView({ reportCount }) {
  return <Card><SectionTitle>Signalements</SectionTitle>
    <div style={{ textAlign: 'center', padding: '34px 12px', background: reportCount ? C.negSoft : C.posSoft, border: `1px solid ${reportCount ? C.neg + '40' : C.pos + '40'}`, borderRadius: 12 }}>
      <div style={{ fontSize: 30, color: reportCount ? C.neg : C.pos, marginBottom: 8 }}>{reportCount ? '⚠' : '✓'}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: reportCount ? C.neg : C.pos }}>{reportCount ? `${reportCount} signalement(s) à traiter` : 'Aucun signalement ouvert'}</div>
      <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6 }}>Le Fil — modération communautaire</div>
    </div>
  </Card>
}
function BotView() {
  return <Card><SectionTitle>Brams Score</SectionTitle>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.pos, boxShadow: `0 0 8px ${C.pos}`, animation: 'pulse 2s ease-in-out infinite' }} />
      <span style={{ fontSize: 13.5, color: C.text, fontWeight: 600 }}>En ligne</span>
      <span style={{ marginLeft: 'auto', fontSize: 11.5, color: C.muted }}>Discord · Railway · Supabase</span>
    </div>
    <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>Bot de rangs vocaux, quiz animé & classement de la communauté.</div>
  </Card>
}
function PlaceholderView({ label }) {
  return <Card style={{ padding: 44, textAlign: 'center' }}><div style={{ fontFamily: CINZEL, fontSize: 19, color: C.text, marginBottom: 6 }}>{label}</div><div style={{ fontSize: 13, color: C.muted }}>Section à venir.</div></Card>
}
function GateScreen({ icon, title, sub, action }) {
  return <div style={{ minHeight: '100vh', background: C.bg, display: 'grid', placeItems: 'center', padding: 24, position: 'relative', zIndex: 3 }}>
    <div style={{ textAlign: 'center', maxWidth: 420 }}>
      <div style={{ fontSize: 42, marginBottom: 14 }}>{icon}</div>
      <h1 style={{ fontFamily: CINZEL, fontSize: 23, color: C.text, margin: '0 0 8px' }}>{title}</h1>
      <p style={{ fontSize: 13.5, color: C.muted, margin: '0 0 20px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{sub}</p>{action}
    </div>
  </div>
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function StaffPanel() {
  const navigate = useNavigate()
  const { isAuthenticated, discordId, displayName, avatarUrl, userId } = useAuth()
  const { setHideAmbient } = useOpeningBg()
  const userIsStaff = isAuthenticated && isStaff(discordId, userId)
  const userIsCreator = isAuthenticated && isCreator(discordId)
  const isRevenueAdmin = isAuthenticated && (REVENUE_ADMIN_IDS.includes(String(discordId)) || userIsCreator)

  const [active, setActive] = useState('overview')
  const [revenue, setRevenue] = useState(null)
  const [revenueError, setRevenueError] = useState(null)
  const [reportCount, setReportCount] = useState(0)
  const timer = useRef(null)

  useEffect(() => { document.title = 'Staff — Brams Community'; setHideAmbient(true); return () => { document.title = 'Brams Community'; setHideAmbient(false) } }, [setHideAmbient])

  const loadRevenue = useCallback(async () => {
    if (!isRevenueAdmin) return
    try {
      const token = await getAccessToken().catch(() => null)
      const res = await fetch('/api/stripe-revenue', { headers: { Authorization: `Bearer ${token || ''}` } })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Erreur')
      setRevenue(j); setRevenueError(null)
    } catch (e) { setRevenueError(e.message) }
  }, [isRevenueAdmin])

  useEffect(() => {
    if (!userIsStaff) return
    loadRevenue()
    timer.current = setInterval(() => { if (!document.hidden) loadRevenue() }, 12000)
    listPostReports('open').then(({ reports }) => setReportCount(Array.isArray(reports) ? reports.length : 0)).catch(() => {})
    return () => clearInterval(timer.current)
  }, [userIsStaff, loadRevenue])

  if (!isAuthenticated) return <GateScreen icon="🔒" title="Espace Staff" sub="Connecte-toi pour accéder au panel staff." action={<button onClick={() => document.dispatchEvent(new CustomEvent('open-auth-modal'))} style={{ padding: '10px 24px', borderRadius: 10, background: C.gold, color: '#0b0c0e', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer' }}>Se connecter</button>} />
  if (!userIsStaff) return <GateScreen icon="⛔" title="Accès réservé au staff" sub={`Réservé au staff Brams Community.\nID : ${discordId || userId || '—'}`} action={<button onClick={() => navigate('/')} style={{ padding: '10px 24px', borderRadius: 10, background: 'transparent', color: C.muted, fontWeight: 700, fontSize: 14, border: `1px solid ${C.border}`, cursor: 'pointer' }}>← Retour au site</button>} />

  const revErr = isRevenueAdmin ? revenueError : 'Réservé aux admins (Al Freydiss, Brams, Berat).'
  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.text, overflow: 'hidden', position: 'relative', zIndex: 3, isolation: 'isolate', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}} @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}` }} />
      <Sidebar active={active} setActive={setActive} badge={reportCount} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar active={active} displayName={displayName} avatarUrl={avatarUrl} isCreatorUser={userIsCreator} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div key={active} style={{ animation: 'fadeIn .3s ease both' }}>
            {active === 'overview' && <Overview revenue={revenue} revErr={revErr} reportCount={reportCount} />}
            {active === 'revenus' && <RevenusView revenue={revenue} revErr={revErr} />}
            {active === 'analytics' && <AnalyticsTab />}
            {active === 'reports' && <ReportsView reportCount={reportCount} />}
            {active === 'members' && <PlaceholderView label="Membres" />}
            {active === 'bot' && <BotView />}
            {active === 'settings' && <StaffSettings isAdmin={isRevenueAdmin} />}
          </div>
        </main>
      </div>
    </div>
  )
}
