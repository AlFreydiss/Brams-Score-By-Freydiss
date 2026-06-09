// Cagnotte Brams — section premium (style Ko-fi mais dark/or One Piece) :
// barre de progression vers un objectif + feed des soutiens (nom, montant,
// message, date). Lecture publique ; le staff édite l'objectif et ajoute des
// soutiens en live (table donors + cagnotte, RLS). Aucun Leetchi.
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { isStaff } from '../lib/roles.js'
import { fetchCagnotte, addDonor, deleteDonor, updateCagnotte } from '../lib/supabase.js'

const GOLD = '#d8bd7e', GOLD_HI = '#f5b50a'
const DISCORD_URL = 'https://discord.gg/4FgezPpnGU'

function timeAgo(iso) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return "à l'instant"
  const m = Math.floor(s / 60); if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60); if (h < 24) return `il y a ${h} h`
  const j = Math.floor(h / 24); if (j < 30) return `il y a ${j} j`
  return `il y a ${Math.floor(j / 30)} mois`
}
const euro = (n) => `${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('fr-FR')} €`
const initial = (name) => (name || '?').trim().slice(0, 1).toUpperCase()
const HUES = ['#e0524a', '#a855f7', '#3b82f6', '#16a34a', '#f59e0b', '#ec4899']
const hueFor = (s) => HUES[[...(s || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length]

export default function CagnotteSection({ compact }) {
  const { discordId, userId } = useAuth()
  const staff = isStaff(discordId, userId)
  const [data, setData] = useState(null)
  const [name, setName] = useState(''), [amount, setAmount] = useState(''), [msg, setMsg] = useState('')
  const [goalEdit, setGoalEdit] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => fetchCagnotte().then(setData)
  useEffect(() => { load() }, [])
  if (!data) return null

  const { goal, title, subtitle, donors, total } = data
  const pct = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0

  const add = async () => {
    const n = name.trim(); if (!n || busy) return
    setBusy(true)
    await addDonor(n, parseFloat(String(amount).replace(',', '.')) || 0, msg.trim())
    setName(''); setAmount(''); setMsg(''); await load(); setBusy(false)
  }
  const saveGoal = async () => {
    const g = parseFloat(String(goalEdit).replace(',', '.')); if (!g || busy) return
    setBusy(true); await updateCagnotte({ goal: g }); setGoalEdit(''); await load(); setBusy(false)
  }

  return (
    <section style={{ width: '100%', maxWidth: compact ? 500 : 980, margin: compact ? '24px 0 0' : '0 auto' }}>
      <style>{`@keyframes cag-grow{from{width:0}} @keyframes cag-shine{0%{background-position:200% 0}100%{background-position:-200% 0}} .cag-feed::-webkit-scrollbar{width:6px}.cag-feed::-webkit-scrollbar-thumb{background:rgba(212,176,110,.25);border-radius:3px}`}</style>
      <div style={{
        borderRadius: 18, overflow: 'hidden', border: `1px solid rgba(191,164,106,0.22)`,
        background: 'linear-gradient(180deg, rgba(26,22,15,0.92), rgba(14,12,9,0.96))',
        boxShadow: '0 24px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        {/* Header + objectif */}
        <div style={{ padding: compact ? '18px 18px 14px' : '24px 26px 18px', position: 'relative' }}>
          <div aria-hidden style={{ position: 'absolute', top: -40, left: '30%', width: 260, height: 160, background: `radial-gradient(ellipse, ${GOLD_HI}22, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>🪙</span>
            <h3 style={{ margin: 0, fontFamily: "'Pirata One', serif", fontSize: compact ? 24 : 30, color: '#f4ecd8' }}>{title}</h3>
          </div>
          {subtitle && <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgba(205,189,151,0.7)', fontFamily: "'Cinzel', serif" }}>{subtitle}</p>}

          {/* Barre de progression */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
            <span style={{ fontSize: compact ? 19 : 24, fontWeight: 900, color: GOLD_HI, fontFamily: "'Cinzel', serif" }}>{euro(total)}</span>
            <span style={{ fontSize: 12.5, color: 'rgba(205,189,151,0.6)' }}>objectif {euro(goal)}</span>
          </div>
          <div style={{ height: 12, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{
              width: `${pct}%`, height: '100%', borderRadius: 99, animation: 'cag-grow 1.1s cubic-bezier(.22,1,.36,1)',
              background: `linear-gradient(90deg, ${GOLD}, ${GOLD_HI}, #ffe9a8, ${GOLD_HI})`, backgroundSize: '200% 100%',
              boxShadow: `0 0 16px ${GOLD_HI}66`,
            }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 800, color: pct >= 100 ? '#7fe6a8' : GOLD, fontFamily: "'Cinzel', serif" }}>
            {pct >= 100 ? '🎉 Objectif atteint, merci les nakamas !' : `${pct}% de l'objectif`}
          </div>

          <Link to="/soutenir" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '10px 20px', borderRadius: 11, textDecoration: 'none',
            background: `linear-gradient(180deg, ${GOLD_HI}, #d4920a)`, color: '#1a1206', fontWeight: 900, fontSize: 13.5, fontFamily: "'Cinzel', serif", boxShadow: `0 10px 28px ${GOLD_HI}33`,
          }}>💛 Soutenir le projet</Link>
        </div>

        {/* Feed des soutiens */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: compact ? '12px 18px 16px' : '14px 26px 20px' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(205,189,151,0.5)', marginBottom: 10 }}>Ils ont soutenu · {donors.length}</div>
          <div className="cag-feed" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: compact ? 220 : 360, overflowY: 'auto', paddingRight: 4 }}>
            {!donors.length && <span style={{ fontSize: 13, color: 'rgba(205,189,151,0.5)' }}>Sois le premier à soutenir 🏴‍☠️</span>}
            {donors.map(d => (
              <div key={d.id} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 900, color: '#fff', fontSize: 15, background: `linear-gradient(135deg, ${hueFor(d.name)}, ${hueFor(d.name)}aa)` }}>{initial(d.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 14, color: '#f4ecd8' }}>{d.name}</strong>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: '#1a1206', background: GOLD, borderRadius: 999, padding: '1px 8px' }}>{euro(d.amount)}</span>
                    <span style={{ fontSize: 11, color: 'rgba(205,189,151,0.45)' }}>{timeAgo(d.created_at)}</span>
                    {staff && <button onClick={() => deleteDonor(d.id).then(load)} title="Retirer" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#caa', cursor: 'pointer', fontSize: 12 }}>✕</button>}
                  </div>
                  {d.message && <div style={{ marginTop: 4, fontSize: 12.5, color: 'rgba(244,236,216,0.8)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 9, padding: '7px 10px' }}>{d.message}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Staff : ajouter un soutien + éditer l'objectif */}
          {staff && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom" style={inp(120)} />
                <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="€" inputMode="decimal" style={inp(60)} />
                <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Message (optionnel)" style={{ ...inp(140), flex: 1 }} onKeyDown={e => e.key === 'Enter' && add()} />
                <button onClick={add} disabled={busy} style={btn}>+ Soutien</button>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, color: 'rgba(205,189,151,0.55)' }}>Objectif :</span>
                <input value={goalEdit} onChange={e => setGoalEdit(e.target.value)} placeholder={`${goal} €`} inputMode="decimal" style={inp(70)} onKeyDown={e => e.key === 'Enter' && saveGoal()} />
                <button onClick={saveGoal} disabled={busy} style={{ ...btn, background: 'rgba(255,255,255,0.06)', color: GOLD }}>Maj objectif</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

const inp = (w) => ({ width: w, minWidth: 0, padding: '8px 11px', borderRadius: 9, border: '1px solid rgba(191,164,106,0.3)', background: 'rgba(255,255,255,0.04)', color: '#f4ecd8', fontSize: 13, fontFamily: 'inherit', outline: 'none' })
const btn = { padding: '8px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', background: `linear-gradient(180deg,#e8c878,#c49a4a)`, color: '#1a1206', fontWeight: 800, fontSize: 13, fontFamily: 'inherit' }
