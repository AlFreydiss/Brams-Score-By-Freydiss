import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { isStaff, isCreator } from '../lib/roles.js'
import { listPostReports, resolvePostReport } from '../lib/feed.js'
import { getAccessToken } from '../lib/supabaseRest.js'
import { T } from './social/socialStyles.js'
import Navbar from './Navbar.jsx'
import StaffChat from './social/StaffChat.jsx'

// Revenus Stripe : réservé aux admins (créateur Al Freydiss + Brams + Berat).
const REVENUE_ADMIN_IDS = ['1094070545248694342', '1079054995917381672', '999607813334638692']
const eur = (cents) => (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

function RevenuePanel() {
  const [data, setData]       = useState(null)
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(true)
  const timer = useRef(null)

  const load = useCallback(async () => {
    try {
      const token = await getAccessToken().catch(() => null)
      const res = await fetch('/api/stripe-revenue', { headers: { Authorization: `Bearer ${token || ''}` } })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Erreur')
      setData(j); setError(null)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  // Temps réel : refresh toutes les 12s tant que l'onglet est visible.
  useEffect(() => {
    load()
    const tick = () => { if (!document.hidden) load() }
    timer.current = setInterval(tick, 12000)
    return () => clearInterval(timer.current)
  }, [load])

  const Stat = ({ label, value, accent }) => (
    <div style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: T.textFaint, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent || '#fff', lineHeight: 1 }}>{value}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'min(620px, 70vh)', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(99,231,150,0.18)', background: T.panel }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>💶</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Revenus Stripe</div>
            <div style={{ fontSize: 11, color: '#63e796' }}>
              {loading && !data ? 'Chargement…' : (<><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#63e796', marginRight: 6, boxShadow: '0 0 8px #63e796' }} />temps réel · MAJ 12s</>)}
            </div>
          </div>
        </div>
        <button onClick={load} title="Rafraîchir"
          style={{ border: `1px solid ${T.border}`, background: 'transparent', color: T.textFaint, borderRadius: 9, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>↻</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#e0524a', fontSize: 13 }}>✕ {error}</div>
        ) : !data ? (
          <div style={{ padding: 30, textAlign: 'center', color: T.textFaint, fontSize: 13 }}>Chargement…</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Stat label="Solde dispo" value={eur(data.available)} accent="#63e796" />
              <Stat label="En attente" value={eur(data.pending)} accent="#e8b84a" />
              <Stat label={`Volume récent (${data.recentCount})`} value={eur(data.recentTotal)} />
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: T.textFaint, marginTop: 4 }}>
              Derniers paiements
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.recent.length === 0 ? (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: T.textFaint, fontSize: 13 }}>Aucun paiement.</div>
              ) : data.recent.map((c, i) => {
                const ok = c.paid && !c.refunded
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'rgba(0,0,0,0.25)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '9px 12px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: T.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email || c.desc || 'Paiement'}</div>
                      <div style={{ fontSize: 11, color: T.textFaint }}>{timeAgo(new Date(c.created * 1000).toISOString())}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: c.refunded ? T.textFaint : ok ? '#63e796' : '#e0524a', textDecoration: c.refunded ? 'line-through' : 'none' }}>{eur(c.amount)}</span>
                      <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 7px', borderRadius: 6, color: c.refunded ? T.textFaint : ok ? '#63e796' : '#e0524a', background: c.refunded ? 'rgba(255,255,255,0.05)' : ok ? 'rgba(99,231,150,0.12)' : 'rgba(224,82,74,0.12)' }}>
                        {c.refunded ? 'REMBOURSÉ' : ok ? 'RÉUSSI' : c.status?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function timeAgo(iso) {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return `il y a ${Math.floor(h / 24)}j`
}

function ReportCard({ r, onResolve, busy }) {
  const excerpt = r.post_deleted
    ? '— post déjà supprimé —'
    : (r.post_content ? (r.post_content.length > 220 ? r.post_content.slice(0, 220) + '…' : r.post_content) : (r.post_media_url ? '🖼️ (média seul)' : '—'))
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 12.5, color: T.textFaint }}>
          🚩 <strong style={{ color: T.text }}>{r.reporter_name}</strong> · {timeAgo(r.created_at)}
        </span>
        {r.report_count > 1 && (
          <span style={{ fontSize: 10.5, fontWeight: 800, color: '#e0524a', background: 'rgba(224,82,74,0.12)', border: '1px solid rgba(224,82,74,0.3)', borderRadius: 6, padding: '2px 7px' }}>
            {r.report_count} signalements
          </span>
        )}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: '#e0524a', marginBottom: 8, wordBreak: 'break-word' }}>« {r.reason} »</div>

      <div style={{ background: 'rgba(0,0,0,0.25)', border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 12px', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: T.textFaint, marginBottom: 4 }}>Post de <strong style={{ color: T.text }}>{r.post_author_name}</strong></div>
        <div style={{ fontSize: 13.5, color: r.post_deleted ? T.textFaint : T.text, lineHeight: 1.5, wordBreak: 'break-word', fontStyle: r.post_deleted ? 'italic' : 'normal' }}>{excerpt}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button disabled={busy} onClick={() => onResolve(r.id, 'dismiss')}
          style={{ padding: '7px 14px', borderRadius: 9, border: `1px solid ${T.border}`, background: 'transparent', color: T.textFaint, fontSize: 12, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}>
          Rejeter le signalement
        </button>
        {!r.post_deleted && (
          <button disabled={busy} onClick={() => onResolve(r.id, 'delete_post')}
            style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(224,82,74,0.4)', background: 'rgba(224,82,74,0.12)', color: '#e0524a', fontSize: 12, fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}>
            🗑 Supprimer le post
          </button>
        )}
      </div>
    </div>
  )
}

function ReportsPanel() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [busyId, setBusyId]   = useState(null)

  const load = useCallback(async () => {
    const { reports, error } = await listPostReports('open')
    setReports(reports); setError(error); setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function onResolve(id, action) {
    if (action === 'delete_post' && !window.confirm('Supprimer définitivement ce post du Fil ?')) return
    setBusyId(id)
    const res = await resolvePostReport(id, action)
    setBusyId(null)
    if (res?.ok) setReports(prev => prev.filter(r => r.id !== id))
    else alert(res?.error || 'Action échouée')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'min(620px, 70vh)', borderRadius: 16, overflow: 'hidden', border: `1px solid ${T.border}`, background: T.panel }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🚩</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Signalements</div>
            <div style={{ fontSize: 11, color: T.textFaint }}>{loading ? 'Chargement…' : `${reports.length} en attente`}</div>
          </div>
        </div>
        <button onClick={() => { setLoading(true); load() }} title="Rafraîchir"
          style={{ border: `1px solid ${T.border}`, background: 'transparent', color: T.textFaint, borderRadius: 9, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>↻</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? <div style={{ padding: 30, textAlign: 'center', color: T.textFaint, fontSize: 13 }}>Chargement…</div>
          : error ? <div style={{ padding: 30, textAlign: 'center', color: '#e0524a', fontSize: 13 }}>✕ {error}<br /><span style={{ color: T.textFaint, fontSize: 11 }}>(migration 20260601_post_reports.sql lancée ?)</span></div>
          : reports.length === 0 ? <div style={{ padding: '48px 20px', textAlign: 'center', color: T.textFaint, fontSize: 14 }}>✨<br />Aucun signalement en attente.</div>
          : reports.map(r => <ReportCard key={r.id} r={r} onResolve={onResolve} busy={busyId === r.id} />)}
      </div>
    </div>
  )
}

export default function StaffPanel() {
  const { isAuthenticated, discordId, displayName, userId } = useAuth()
  const userIsStaff   = isAuthenticated && isStaff(discordId, userId)
  const userIsCreator = isAuthenticated && isCreator(discordId)
  const userIsRevenueAdmin = isAuthenticated && (REVENUE_ADMIN_IDS.includes(String(discordId)) || userIsCreator)

  useEffect(() => {
    document.title = 'Staff Panel — Brams Community'
    return () => { document.title = 'Brams Community' }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#08090D', position: 'relative', zIndex: 3, isolation: 'isolate', overflowX: 'hidden' }}>
      <Navbar />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '100px 24px 60px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.15em', color: T.gold, textTransform: 'uppercase', marginBottom: 12 }}>
            Modération
          </div>
          <h1 style={{ fontFamily: "'Pirata One', cursive", fontSize: 'clamp(32px,5vw,52px)', color: '#fff', marginBottom: 10, lineHeight: 1.1 }}>
            Staff Panel
          </h1>
          {isAuthenticated && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              Connecté en tant que <strong style={{ color: T.gold }}>{displayName}</strong>
              {userIsCreator && (
                <span style={{ marginLeft: 8, background: 'rgba(255,215,0,0.15)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.35)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>CRÉATEUR</span>
              )}
              {userIsStaff && !userIsCreator && (
                <span style={{ marginLeft: 8, background: 'rgba(212,160,23,0.15)', color: T.gold, border: '1px solid rgba(212,160,23,0.3)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>STAFF</span>
              )}
              {!userIsStaff && (
                <span style={{ marginLeft: 8, background: 'rgba(224,82,74,0.12)', color: '#e0524a', border: '1px solid rgba(224,82,74,0.25)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>VISITEUR</span>
              )}
            </p>
          )}
        </div>

        {/* Non connecté */}
        {!isAuthenticated && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 24 }}>Connecte-toi pour accéder au panel staff.</p>
            <button onClick={() => document.dispatchEvent(new CustomEvent('open-auth-modal'))}
              style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#d4a017,#e8b84a)', color: '#1a1a1a', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
              Se connecter
            </button>
          </div>
        )}

        {/* Connecté mais pas staff */}
        {isAuthenticated && !userIsStaff && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: T.surface, border: '1px solid rgba(224,82,74,0.2)', borderRadius: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⛔</div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 8 }}>Accès réservé au staff Brams Community.</p>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>ID Discord : {discordId || userId || '—'}</p>
          </div>
        )}

        {/* Contenu staff — 2 colonnes desktop, empilé mobile */}
        {isAuthenticated && userIsStaff && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, alignItems: 'start' }}>
            {userIsRevenueAdmin && <RevenuePanel />}
            <ReportsPanel />
            <StaffChat />
          </div>
        )}
      </div>
    </div>
  )
}
