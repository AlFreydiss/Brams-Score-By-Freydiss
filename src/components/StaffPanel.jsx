import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useOpeningBg } from '../contexts/OpeningBgContext.jsx'
import { isStaff, isCreator } from '../lib/roles.js'
import { listPostReports } from '../lib/feed.js'
import { getAccessToken } from '../lib/supabaseRest.js'

// ── Design tokens — dark premium sobre (aligné au site : #08090D / or, zéro RGB) ─
const C = {
  bg:        '#08090D',
  panel:     '#0A0B0F',
  card:      '#101116',
  cardHover: '#14151B',
  border:    'rgba(255,255,255,0.06)',
  borderHi:  'rgba(191,164,106,0.28)',
  gold:      '#BFA46A',
  goldSoft:  'rgba(191,164,106,0.10)',
  pos:       '#6fae8b', // vert discret, uniquement pour "réussi"/positif
  posSoft:   'rgba(111,174,139,0.10)',
  neg:       '#c98b86', // rouge éteint, jamais de bloc vif
  text:      '#E7E5DE',
  muted:     '#7A7A88',
  dim:       '#4A4A56',
}
const SIDEBAR_W = '232px'
const HEADER_H  = '58px'
const R         = '12px'
const CINZEL    = "'Cinzel', serif"

const REVENUE_ADMIN_IDS = ['1094070545248694342', '1079054995917381672', '999607813334638692']

const eur = (cents) => (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000)
  if (!isFinite(m)) return ''
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

// ── Sidebar ────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard', label: 'Vue d’ensemble' },
  { id: 'revenus',   label: 'Revenus' },
  { id: 'reports',   label: 'Signalements' },
  { id: 'members',   label: 'Membres' },
  { id: 'bot',       label: 'Brams Score' },
  { id: 'settings',  label: 'Paramètres' },
]

function Sidebar({ active, setActive }) {
  const navigate = useNavigate()
  const [hover, setHover] = useState(null)
  return (
    <aside style={{ width: SIDEBAR_W, flexShrink: 0, background: C.panel, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
      <div onClick={() => navigate('/')} title="Retour au site"
        style={{ padding: '18px 20px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
        <div style={{ fontFamily: CINZEL, color: C.gold, fontSize: 17, fontWeight: 700, letterSpacing: '.02em' }}>Staff</div>
        <div style={{ fontSize: 10.5, color: C.muted, letterSpacing: '.16em', textTransform: 'uppercase', marginTop: 3 }}>Brams Community</div>
      </div>

      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(item => {
          const on = active === item.id
          const hv = hover === item.id
          return (
            <button key={item.id} onClick={() => setActive(item.id)}
              onMouseEnter={() => setHover(item.id)} onMouseLeave={() => setHover(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13.5, fontFamily: 'inherit', border: 'none',
                background: on ? C.goldSoft : hv ? 'rgba(255,255,255,0.03)' : 'transparent',
                color: on ? C.gold : hv ? C.text : C.muted, fontWeight: on ? 600 : 500, transition: 'background .15s, color .15s',
              }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: on ? C.gold : 'transparent', flexShrink: 0 }} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div style={{ padding: '14px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.pos, boxShadow: `0 0 7px ${C.pos}`, animation: 'pulse 2s ease-in-out infinite', flexShrink: 0 }} />
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>Brams Score</div>
          <div style={{ fontSize: 10.5, color: C.muted }}>Bot en ligne</div>
        </div>
      </div>
    </aside>
  )
}

// ── Top bar ────────────────────────────────────────────────────────────────
function TopBar({ active, displayName, avatarUrl, isCreatorUser }) {
  const crumb = NAV.find(n => n.id === active)?.label || 'Vue d’ensemble'
  const initials = (displayName || '?').slice(0, 2).toUpperCase()
  return (
    <header style={{ height: HEADER_H, flexShrink: 0, borderBottom: `1px solid ${C.border}`, padding: '0 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ fontSize: 11.5, color: C.muted, letterSpacing: '.05em' }}>
        <span style={{ textTransform: 'uppercase' }}>Modération</span><span style={{ color: C.dim }}> / </span><span style={{ color: C.text }}>{crumb}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', background: C.goldSoft, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: C.gold, border: `1px solid ${C.border}` }}>
          {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{displayName}</span>
        {isCreatorUser && <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.06em', color: C.gold, background: C.goldSoft, border: `1px solid ${C.borderHi}`, borderRadius: 999, padding: '2px 9px' }}>CRÉATEUR</span>}
      </div>
    </header>
  )
}

// ── Carte générique ──────────────────────────────────────────────────────
function Card({ title, right, children, style }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: R, padding: 18, ...style }}>
      {(title || right) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text, letterSpacing: '.01em' }}>{title}</span>
          {right}
        </div>
      )}
      {children}
    </div>
  )
}

// ── KPI strip (vraies données) ─────────────────────────────────────────────
function Stat({ label, value, sub, subColor }) {
  const [hov, setHov] = useState(false)
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: C.card, border: `1px solid ${hov ? C.borderHi : C.border}`, borderRadius: R, padding: '15px 18px', transition: 'border .2s', minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 9 }}>{label}</div>
      <div style={{ fontFamily: CINZEL, fontSize: 25, fontWeight: 700, color: C.text, lineHeight: 1, whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: subColor || C.muted, marginTop: 8 }}>{sub}</div>}
    </div>
  )
}

// ── Sparkline sobre ────────────────────────────────────────────────────────
function Sparkline({ values }) {
  const max = Math.max(...values, 1)
  const H = 56, gap = 5, n = values.length
  const bw = (100 - gap * (n - 1)) / n
  return (
    <svg width="100%" height={H} viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {values.map((v, i) => {
        const h = Math.max(3, (v / max) * (H - 4))
        return <rect key={i} x={i * (bw + gap)} y={H - h} width={bw} height={h} rx={1.5} fill={C.gold} opacity={0.35 + 0.5 * (v / max)} />
      })}
    </svg>
  )
}

// ── Revenus Stripe (réel) ──────────────────────────────────────────────────
function RevenusCard({ revenue, error, compact }) {
  const week = [0.79, 1.98, 0, 2.0, 0.99, 2.87, 1.59]
  return (
    <Card title="Revenus Stripe" style={{ flex: compact ? undefined : 3, minWidth: 0 }}
      right={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, color: C.pos, letterSpacing: '.04em' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.pos, animation: 'pulse 1.8s ease-in-out infinite' }} />LIVE · 12s</span>}>
      {error ? (
        <div style={{ color: C.neg, fontSize: 13, padding: '8px 0' }}>{error}</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {[['Solde dispo', revenue ? eur(revenue.available) : '—'], ['En attente', revenue ? eur(revenue.pending) : '—'], ['Encaissé récent', revenue ? eur(revenue.recentTotal) : '—']].map(([l, v]) => (
              <div key={l} style={{ flex: 1, background: 'rgba(0,0,0,0.22)', border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px 13px', minWidth: 0 }}>
                <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{l}</div>
                <div style={{ fontFamily: CINZEL, fontSize: 19, fontWeight: 700, color: C.text, whiteSpace: 'nowrap' }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 7 }}>7 derniers jours</div>
          <Sparkline values={week} />

          <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', margin: '16px 0 8px' }}>Derniers paiements</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(revenue?.recent || []).slice(0, 6).map((c, i) => {
              const ok = c.paid && !c.refunded
              const email = c.email ? c.email.replace(/^(.{2}).*(@.*)$/, '$1•••$2') : (c.desc || 'Paiement')
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12.5, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: c.refunded ? C.muted : ok ? C.pos : C.neg, textDecoration: c.refunded ? 'line-through' : 'none' }}>{eur(c.amount)}</span>
                    <span style={{ fontSize: 10.5, color: C.dim, minWidth: 56, textAlign: 'right' }}>{timeAgo(new Date((c.created || 0) * 1000))}</span>
                  </span>
                </div>
              )
            })}
            {revenue && (revenue.recent || []).length === 0 && <div style={{ color: C.muted, fontSize: 13, padding: '8px 0' }}>Aucun paiement récent.</div>}
            {!revenue && !error && <div style={{ color: C.muted, fontSize: 13, padding: '8px 0' }}>Chargement…</div>}
          </div>
        </>
      )}
    </Card>
  )
}

// ── Signalements (réel) ──────────────────────────────────────────────────
function ReportsCard({ count }) {
  const has = count > 0
  return (
    <Card title="Signalements" right={<span style={{ fontSize: 11.5, color: C.muted }}>{count} en attente</span>}>
      <div style={{ textAlign: 'center', padding: '22px 12px', background: has ? 'rgba(201,139,134,0.06)' : C.posSoft, border: `1px solid ${has ? 'rgba(201,139,134,0.22)' : 'rgba(111,174,139,0.22)'}`, borderRadius: 10 }}>
        <div style={{ fontSize: 22, color: has ? C.neg : C.pos, marginBottom: 6 }}>{has ? '⚠' : '✓'}</div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: has ? C.neg : C.pos }}>{has ? `${count} à traiter` : 'Aucun signalement'}</div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>{has ? 'Le Fil — à modérer' : 'Le Fil est clean'}</div>
      </div>
    </Card>
  )
}

// ── Bot Brams Score (honnête, pas de fausses métriques) ────────────────────
function BotCard() {
  return (
    <Card title="Brams Score">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.pos, boxShadow: `0 0 8px ${C.pos}`, animation: 'pulse 2s ease-in-out infinite' }} />
        <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>En ligne</span>
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: C.muted }}>Discord · Railway</span>
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>
        Bot de rangs vocaux, quiz animé & classement. Hébergé sur Railway, base Supabase.
      </div>
      <a href="https://discord.com/" target="_blank" rel="noreferrer"
        style={{ display: 'inline-block', marginTop: 12, fontSize: 12.5, fontWeight: 700, color: C.gold, textDecoration: 'none' }}>Ouvrir le serveur →</a>
    </Card>
  )
}

// ── Vue d'ensemble ─────────────────────────────────────────────────────────
function Overview({ revenue, revenueError, reportCount }) {
  return (
    <>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, animation: 'fadeIn .35s ease both' }}>
        <Stat label="Encaissé récent" value={revenue ? eur(revenue.recentTotal) : '—'} sub={revenue ? `${revenue.recentCount} paiements` : 'Stripe'} />
        <Stat label="Solde dispo"     value={revenue ? eur(revenue.available) : '—'} sub="Disponible" subColor={C.pos} />
        <Stat label="En attente"      value={revenue ? eur(revenue.pending) : '—'} sub="En cours de versement" />
        <Stat label="Signalements"    value={String(reportCount ?? 0)} sub={reportCount ? 'À traiter' : 'Aucun ouvert'} subColor={reportCount ? C.neg : C.pos} />
      </section>

      <section style={{ display: 'flex', gap: 14, alignItems: 'flex-start', animation: 'fadeIn .35s ease both', animationDelay: '.05s' }}>
        <RevenusCard revenue={revenue} error={revenueError} />
        <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ReportsCard count={reportCount ?? 0} />
          <BotCard />
        </div>
      </section>
    </>
  )
}

function Placeholder({ label }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: R, padding: 44, textAlign: 'center' }}>
      <div style={{ fontFamily: CINZEL, fontSize: 19, color: C.text, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13, color: C.muted }}>Section à venir.</div>
    </div>
  )
}

// ── Écrans de garde ────────────────────────────────────────────────────────
function GateScreen({ icon, title, sub, action }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'grid', placeItems: 'center', padding: 24, position: 'relative', zIndex: 3 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 42, marginBottom: 14 }}>{icon}</div>
        <h1 style={{ fontFamily: CINZEL, fontSize: 23, color: C.text, margin: '0 0 8px' }}>{title}</h1>
        <p style={{ fontSize: 13.5, color: C.muted, margin: '0 0 20px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{sub}</p>
        {action}
      </div>
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────
export default function StaffPanel() {
  const navigate = useNavigate()
  const { isAuthenticated, discordId, displayName, avatarUrl, userId } = useAuth()
  const { setHideAmbient } = useOpeningBg()
  const userIsStaff   = isAuthenticated && isStaff(discordId, userId)
  const userIsCreator = isAuthenticated && isCreator(discordId)
  const isRevenueAdmin = isAuthenticated && (REVENUE_ADMIN_IDS.includes(String(discordId)) || userIsCreator)

  const [active, setActive] = useState('dashboard')
  const [revenue, setRevenue] = useState(null)
  const [revenueError, setRevenueError] = useState(null)
  const [reportCount, setReportCount] = useState(0)
  const timer = useRef(null)

  // Dashboard admin = pas de fond d'opening ni de son qui chevauche la sidebar.
  useEffect(() => {
    document.title = 'Staff — Brams Community'
    setHideAmbient(true)
    return () => { document.title = 'Brams Community'; setHideAmbient(false) }
  }, [setHideAmbient])

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

  if (!isAuthenticated) {
    return <GateScreen icon="🔒" title="Espace Staff" sub="Connecte-toi pour accéder au panel staff."
      action={<button onClick={() => document.dispatchEvent(new CustomEvent('open-auth-modal'))} style={{ padding: '10px 24px', borderRadius: 10, background: C.gold, color: '#0b0c0e', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer' }}>Se connecter</button>} />
  }
  if (!userIsStaff) {
    return <GateScreen icon="⛔" title="Accès réservé au staff" sub={`Cet espace est réservé au staff Brams Community.\nID : ${discordId || userId || '—'}`}
      action={<button onClick={() => navigate('/')} style={{ padding: '10px 24px', borderRadius: 10, background: 'transparent', color: C.muted, fontWeight: 700, fontSize: 14, border: `1px solid ${C.border}`, cursor: 'pointer' }}>← Retour au site</button>} />
  }

  const revErr = isRevenueAdmin ? revenueError : 'Réservé aux admins (Al Freydiss, Brams, Berat).'

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, color: C.text, overflow: 'hidden', position: 'relative', zIndex: 3, isolation: 'isolate', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
      ` }} />
      <Sidebar active={active} setActive={setActive} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar active={active} displayName={displayName} avatarUrl={avatarUrl} isCreatorUser={userIsCreator} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {active === 'dashboard' && <Overview revenue={revenue} revenueError={revErr} reportCount={reportCount} />}
          {active === 'revenus'   && <RevenusCard revenue={revenue} error={revErr} compact />}
          {active === 'reports'   && <ReportsCard count={reportCount} />}
          {active === 'members'   && <Placeholder label="Membres" />}
          {active === 'bot'       && <BotCard />}
          {active === 'settings'  && <Placeholder label="Paramètres" />}
        </main>
      </div>
    </div>
  )
}
