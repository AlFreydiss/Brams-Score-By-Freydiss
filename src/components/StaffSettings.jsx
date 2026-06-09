import { useState, useMemo, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Page « Paramètres » du Staff Panel — design premium sobre, deux panneaux
// (nav verticale + contenu), barre d'enregistrement sticky. Inline styles only.
// State local persisté en localStorage SAUF les webhooks (gardés en mémoire le
// temps de la session — secrets). TODO BACKEND : table `staff_settings`, valida-
// tion rôle admin côté serveur (ne jamais faire confiance au front).
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  bg: '#08090D', panel: '#0A0B0F', card: '#0F1014', cardHi: '#13141A',
  border: 'rgba(255,255,255,0.05)', borderHi: 'rgba(191,164,106,0.26)',
  gold: '#BFA46A', goldSoft: 'rgba(191,164,106,0.10)',
  pos: '#6fae8b', neg: '#c98b86', negSoft: 'rgba(201,139,134,0.07)', negHi: 'rgba(201,139,134,0.28)',
  text: '#E7E5DE', sub: '#9A9AA6', muted: '#6C6C78', dim: '#43434F',
}
const CINZEL = "'Cinzel', serif"
const LS_KEY = 'brams_staff_settings_v1'
const LS_SNAPS = 'brams_staff_settings_snaps_v1'
const ACCENTS = [
  { id: 'or', color: '#BFA46A' }, { id: 'rouge', color: '#c98b86' },
  { id: 'violet', color: '#9b8cf0' }, { id: 'emeraude', color: '#6fae8b' },
]

const STAFF_ROLES = ['Créateur', 'Admin', 'Modérateur', 'Support', 'Helper']
const PERMISSIONS = [
  { key: 'view_revenue', label: 'Voir les revenus', admin: true },
  { key: 'manage_members', label: 'Gérer les membres' },
  { key: 'ban_mute', label: 'Bannir / mute' },
  { key: 'edit_berries', label: 'Modifier les Berries', admin: true },
  { key: 'manage_shop', label: 'Gérer la boutique', admin: true },
  { key: 'handle_reports', label: 'Gérer les signalements' },
  { key: 'view_logs', label: 'Accéder aux logs' },
  { key: 'edit_settings', label: 'Modifier les paramètres', admin: true },
]
const RARITY_CONFIG = [
  { id: 'commun', label: 'Commun', color: '#9aa0a6', min: 400000 },
  { id: 'rare', label: 'Rare', color: '#5b8def', min: 600000 },
  { id: 'epique', label: 'Épique', color: '#a368e8', min: 900000 },
  { id: 'legendaire', label: 'Légendaire', color: '#e0b341', min: 1500000 },
  { id: 'mythique', label: 'Mythique', color: '#e05b6a', min: 2500000 },
  { id: 'interdit', label: 'Interdit', color: '#c0392b', min: 5000000 },
]
const REPORT_CATEGORIES = ['Spam', 'Harcèlement', 'Contenu NSFW', 'Triche', 'Usurpation', 'Autre']
const WEBHOOK_KEYS = ['webhookMod', 'webhookRevenue', 'webhookErrors', 'webhookBigBuy']

const DEFAULT_SETTINGS = {
  general: { maintenance: false, maintenanceMsg: 'Le site revient vite — on prépare quelque chose de grand. 🏴‍☠️', announce: '', announceAt: '', registrations: true },
  moderation: { muteDefault: '1h', banDefault: '7j', autoHide: 3, msgPerMin: 8, postCooldown: 30, bannedWords: '', allowImages: true, allowVideos: true, allowPosts: true, allowDM: true, slowMode: false },
  reports: { autoAssign: true, urgentThreshold: 5, hideAfter: 3, discordNotify: true },
  economy: { perMessage: 2, daily: 50, dailyCooldown: 24, streakBonus: 10, transferTax: 5, transferLimit: 1000, antiFarm: true, eventMultiplier: 1, eventUntil: '', monthlyReset: false },
  shop: { active: true, purchaseLimit: 5, tempDiscount: 0, flashSale: false },
  notifications: { webhookMod: '', webhookRevenue: '', webhookErrors: '', webhookBigBuy: '', adminEmail: '', criticalAlerts: true },
  security: { admin2fa: false, sessionExpiry: '7j', confirmSensitive: true, ipBlock: true, auditImmutable: true, ipAllowlist: [] },
  ui: { accent: 'or' },
  permissions: {
    'Créateur': Object.fromEntries(PERMISSIONS.map(p => [p.key, true])),
    'Admin': Object.fromEntries(PERMISSIONS.map(p => [p.key, true])),
    'Modérateur': { view_revenue: false, manage_members: true, ban_mute: true, edit_berries: false, manage_shop: false, handle_reports: true, view_logs: true, edit_settings: false },
    'Support': { view_revenue: false, manage_members: true, ban_mute: false, edit_berries: false, manage_shop: false, handle_reports: true, view_logs: true, edit_settings: false },
    'Helper': { view_revenue: false, manage_members: false, ban_mute: false, edit_berries: false, manage_shop: false, handle_reports: true, view_logs: false, edit_settings: false },
  },
}

const AUDIT_LOG = [
  { type: 'ban', author: 'Al Freydiss', target: 'Spandam', date: 'il y a 4min' },
  { type: 'settings', author: 'Brams', target: 'Économie · multiplicateur x2', date: 'il y a 1h' },
  { type: 'berries', author: 'Al Freydiss', target: '+5000 → Lamar', date: 'il y a 3h' },
  { type: 'shop', author: 'Berat', target: 'Réduction -20% activée', date: 'hier' },
  { type: 'mute', author: 'Modérateur', target: 'Buggy · 1h', date: 'hier' },
]
const LOG_COLOR = { ban: C.neg, mute: C.gold, settings: C.gold, berries: C.pos, shop: C.gold }

const SECTIONS = [
  { id: 'general', label: 'Général', desc: 'Site & annonces' },
  { id: 'permissions', label: 'Permissions', desc: 'Rôles & droits' },
  { id: 'moderation', label: 'Modération', desc: 'Règles & limites' },
  { id: 'reports', label: 'Signalements', desc: 'File & catégories' },
  { id: 'economy', label: 'Berries', desc: 'Économie & events' },
  { id: 'shop', label: 'Boutique', desc: 'Items & prix' },
  { id: 'notifications', label: 'Notifications', desc: 'Webhooks & email' },
  { id: 'security', label: 'Sécurité', desc: '2FA · sessions · IP' },
  { id: 'logs', label: 'Journal', desc: 'Audit des actions' },
  { id: 'danger', label: 'Zone danger', desc: 'Actions sensibles', danger: true },
]

const maskWebhook = (url) => {
  if (!url) return ''
  const m = url.match(/^https:\/\/discord\.com\/api\/webhooks\/(\d+)\/.+$/)
  return m ? `…/${m[1].slice(0, 4)}••••/${'•'.repeat(6)}` : '•••••••• · configuré'
}
const stripSecrets = (st) => ({ ...st, notifications: { ...st.notifications, ...Object.fromEntries(WEBHOOK_KEYS.map(k => [k, ''])) } })
// Merge PROFOND par section : une config sauvegardée par une version antérieure
// ne doit pas perdre les clés ajoutées depuis (sinon inputs uncontrolled).
const mergeSettings = (parsed) => {
  const out = { ...DEFAULT_SETTINGS }
  for (const k of Object.keys(DEFAULT_SETTINGS)) {
    const dv = DEFAULT_SETTINGS[k], pv = parsed?.[k]
    if (pv && typeof pv === 'object' && !Array.isArray(pv) && typeof dv === 'object') out[k] = { ...dv, ...pv }
    else if (pv !== undefined) out[k] = pv
  }
  return out
}

// ── Primitives ─────────────────────────────────────────────────────────────
function Toggle({ on, onChange, disabled, accent = C.gold }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => !disabled && onChange(!on)}
      style={{ width: 38, height: 22, borderRadius: 999, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', padding: 2, background: on ? accent : 'rgba(255,255,255,0.09)', transition: 'background .2s', opacity: disabled ? 0.4 : 1, flexShrink: 0 }}>
      <span style={{ display: 'block', width: 18, height: 18, borderRadius: '50%', background: '#0b0c0e', transform: on ? 'translateX(16px)' : 'translateX(0)', transition: 'transform .2s' }} />
    </button>
  )
}
const inputBase = { background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 11px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }
function TextInput({ value, onChange, placeholder, type = 'text', width, accent = C.gold }) {
  const [f, setF] = useState(false)
  return <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} onFocus={() => setF(true)} onBlur={() => setF(false)}
    style={{ ...inputBase, width: width || 160, borderColor: f ? accent : C.border, transition: 'border .15s' }} />
}
function NumberInput({ value, onChange, suffix }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><TextInput type="number" value={value} onChange={v => onChange(v === '' ? '' : Number(v))} width={84} />{suffix && <span style={{ fontSize: 12, color: C.muted }}>{suffix}</span>}</span>
}
function SelectInput({ value, onChange, options, width = 130 }) {
  return <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputBase, width, cursor: 'pointer' }}>{options.map(o => <option key={o.value} value={o.value} style={{ background: C.card }}>{o.label}</option>)}</select>
}
function GhostBtn({ children, onClick, danger, accent = C.gold }) {
  const [h, setH] = useState(false)
  return <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    style={{ ...inputBase, cursor: 'pointer', fontWeight: 600, padding: '8px 13px', color: danger ? C.neg : (h ? C.text : C.sub), borderColor: h ? (danger ? C.negHi : C.borderHi) : C.border, background: h ? 'rgba(255,255,255,0.05)' : 'transparent', whiteSpace: 'nowrap' }}>{children}</button>
}
function Row({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: '13px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ minWidth: 0 }}><div style={{ fontSize: 13.5, color: C.text, fontWeight: 500 }}>{label}</div>{hint && <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{hint}</div>}</div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}
function Section({ title, desc, children, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : 30 }}>
      <div style={{ marginBottom: 4 }}><span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{title}</span></div>
      {desc && <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 14 }}>{desc}</div>}
      <div>{children}</div>
    </div>
  )
}

// ── Panneaux ─────────────────────────────────────────────────────────────────
function GeneralPanel({ s, set, accent }) {
  return (
    <Section title="Général" desc="État du site, maintenance et annonces." last>
      <Row label="Mode maintenance" hint="Coupe l'accès public (le staff garde l'accès)."><Toggle on={s.maintenance} onChange={v => set('general', 'maintenance', v)} accent={accent} /></Row>
      <Row label="Message de maintenance"><TextInput value={s.maintenanceMsg} onChange={v => set('general', 'maintenanceMsg', v)} width={300} accent={accent} /></Row>
      <Row label="Annonce globale" hint="Bandeau en haut du site (vide = aucun)."><TextInput value={s.announce} onChange={v => set('general', 'announce', v)} placeholder="ex : Tournoi ce soir 21h !" width={300} accent={accent} /></Row>
      <Row label="Programmer l'annonce"><TextInput type="datetime-local" value={s.announceAt} onChange={v => set('general', 'announceAt', v)} width={220} accent={accent} /></Row>
      <Row label="Inscriptions ouvertes"><Toggle on={s.registrations} onChange={v => set('general', 'registrations', v)} accent={accent} /></Row>
    </Section>
  )
}
function PermissionsPanel({ s, setPerm, isAdmin, accent }) {
  return (
    <Section title="Permissions" desc="Droits accordés à chaque rôle staff." last>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
          <thead><tr><th style={{ textAlign: 'left', fontSize: 11.5, color: C.muted, fontWeight: 500, padding: '6px 10px 10px 0' }}>Permission</th>{STAFF_ROLES.map(r => <th key={r} style={{ fontSize: 11.5, color: r === 'Créateur' ? accent : C.muted, fontWeight: 600, padding: '6px 6px 10px', textAlign: 'center' }}>{r}</th>)}</tr></thead>
          <tbody>{PERMISSIONS.map(p => (
            <tr key={p.key} style={{ borderTop: `1px solid ${C.border}` }}>
              <td style={{ fontSize: 13, color: C.text, padding: '12px 10px 12px 0' }}>{p.label}{p.admin && <span style={{ marginLeft: 7, fontSize: 9, fontWeight: 700, color: C.neg, border: `1px solid ${C.negHi}`, borderRadius: 4, padding: '1px 5px' }}>ADMIN</span>}</td>
              {STAFF_ROLES.map(role => <td key={role} style={{ textAlign: 'center', padding: '8px 6px' }}><span style={{ display: 'inline-flex' }}><Toggle on={!!s.permissions[role]?.[p.key]} disabled={role === 'Créateur' || !isAdmin} onChange={v => setPerm(role, p.key, v)} accent={accent} /></span></td>)}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 14 }}>Le Créateur a tous les droits (verrouillé). Actions <span style={{ color: C.neg }}>ADMIN</span> = admins uniquement.</div>
    </Section>
  )
}
function ModerationPanel({ s, set, accent }) {
  return (
    <Section title="Modération" desc="Règles, limites et types de contenu autorisés." last>
      <Row label="Durée mute par défaut"><SelectInput value={s.muteDefault} onChange={v => set('moderation', 'muteDefault', v)} options={['10min', '1h', '6h', '24h'].map(x => ({ value: x, label: x }))} width={110} /></Row>
      <Row label="Durée ban par défaut"><SelectInput value={s.banDefault} onChange={v => set('moderation', 'banDefault', v)} options={['1j', '7j', '30j', 'définitif'].map(x => ({ value: x, label: x }))} width={110} /></Row>
      <Row label="Slow mode global" hint="Force un délai entre messages partout."><Toggle on={s.slowMode} onChange={v => set('moderation', 'slowMode', v)} accent={accent} /></Row>
      <Row label="Masquer après X signalements"><NumberInput value={s.autoHide} onChange={v => set('moderation', 'autoHide', v)} suffix="reports" /></Row>
      <Row label="Limite messages / minute"><NumberInput value={s.msgPerMin} onChange={v => set('moderation', 'msgPerMin', v)} suffix="msg" /></Row>
      <Row label="Cooldown posts"><NumberInput value={s.postCooldown} onChange={v => set('moderation', 'postCooldown', v)} suffix="s" /></Row>
      <Row label="Mots interdits" hint="Séparés par des virgules."><TextInput value={s.bannedWords} onChange={v => set('moderation', 'bannedWords', v)} placeholder="mot1, mot2…" width={240} accent={accent} /></Row>
      <Row label="Autoriser images"><Toggle on={s.allowImages} onChange={v => set('moderation', 'allowImages', v)} accent={accent} /></Row>
      <Row label="Autoriser vidéos"><Toggle on={s.allowVideos} onChange={v => set('moderation', 'allowVideos', v)} accent={accent} /></Row>
      <Row label="Autoriser posts"><Toggle on={s.allowPosts} onChange={v => set('moderation', 'allowPosts', v)} accent={accent} /></Row>
      <Row label="Autoriser DM"><Toggle on={s.allowDM} onChange={v => set('moderation', 'allowDM', v)} accent={accent} /></Row>
    </Section>
  )
}
function ReportsPanel({ s, set, accent }) {
  return (
    <>
      <Section title="Signalements" desc="Traitement de la file de modération.">
        <Row label="Auto-assignation au staff"><Toggle on={s.autoAssign} onChange={v => set('reports', 'autoAssign', v)} accent={accent} /></Row>
        <Row label="Seuil urgent"><NumberInput value={s.urgentThreshold} onChange={v => set('reports', 'urgentThreshold', v)} suffix="reports" /></Row>
        <Row label="Masquer après X reports"><NumberInput value={s.hideAfter} onChange={v => set('reports', 'hideAfter', v)} suffix="reports" /></Row>
        <Row label="Notif Discord (urgent)"><Toggle on={s.discordNotify} onChange={v => set('reports', 'discordNotify', v)} accent={accent} /></Row>
      </Section>
      <Section title="Catégories" desc="Motifs proposés lors d'un signalement." last>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{REPORT_CATEGORIES.map(c => <span key={c} style={{ fontSize: 12.5, color: C.sub, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 999, padding: '5px 12px' }}>{c}</span>)}</div>
      </Section>
    </>
  )
}
function EconomyPanel({ s, set, accent, onToast }) {
  const quick = (mult, hours, label) => { const until = new Date(Date.now() + hours * 3600000).toISOString().slice(0, 16); set('economy', 'eventMultiplier', mult); set('economy', 'eventUntil', until); onToast(`Événement ${label} armé — Berries ×${mult} (${hours}h)`) }
  return (
    <>
      <Section title="Événement express" desc="Booste les gains de Berries en un clic.">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <GhostBtn onClick={() => quick(2, 1, 'Flash')} accent={accent}>×2 · 1h</GhostBtn>
          <GhostBtn onClick={() => quick(2, 24, 'Journée')} accent={accent}>×2 · 24h</GhostBtn>
          <GhostBtn onClick={() => quick(3, 48, 'Weekend')} accent={accent}>×3 · 48h</GhostBtn>
          <GhostBtn onClick={() => { set('economy', 'eventMultiplier', 1); set('economy', 'eventUntil', ''); onToast('Événement désactivé') }}>Stop</GhostBtn>
        </div>
        {s.eventUntil && s.eventMultiplier > 1 && <div style={{ fontSize: 12, color: accent, marginTop: 11 }}>Actif : ×{s.eventMultiplier} jusqu'au {new Date(s.eventUntil).toLocaleString('fr-FR')}</div>}
      </Section>
      <Section title="Brams Score / Berries" desc="Gains, transferts et anti-abus." last>
        <Row label="Gain par message"><NumberInput value={s.perMessage} onChange={v => set('economy', 'perMessage', v)} suffix="🪙" /></Row>
        <Row label="Daily reward"><NumberInput value={s.daily} onChange={v => set('economy', 'daily', v)} suffix="🪙" /></Row>
        <Row label="Cooldown daily"><NumberInput value={s.dailyCooldown} onChange={v => set('economy', 'dailyCooldown', v)} suffix="h" /></Row>
        <Row label="Bonus streak"><NumberInput value={s.streakBonus} onChange={v => set('economy', 'streakBonus', v)} suffix="%/j" /></Row>
        <Row label="Taxe transfert"><NumberInput value={s.transferTax} onChange={v => set('economy', 'transferTax', v)} suffix="%" /></Row>
        <Row label="Limite transfert / jour"><NumberInput value={s.transferLimit} onChange={v => set('economy', 'transferLimit', v)} suffix="🪙" /></Row>
        <Row label="Anti-farm"><Toggle on={s.antiFarm} onChange={v => set('economy', 'antiFarm', v)} accent={accent} /></Row>
        <Row label="Reset classement mensuel"><Toggle on={s.monthlyReset} onChange={v => set('economy', 'monthlyReset', v)} accent={accent} /></Row>
      </Section>
    </>
  )
}
function ShopPanel({ s, set, accent }) {
  return (
    <>
      <Section title="Boutique" desc="Disponibilité et promotions.">
        <Row label="Boutique active"><Toggle on={s.active} onChange={v => set('shop', 'active', v)} accent={accent} /></Row>
        <Row label="Flash sale" hint="Bandeau promo + réduction globale."><Toggle on={s.flashSale} onChange={v => set('shop', 'flashSale', v)} accent={accent} /></Row>
        <Row label="Réduction temporaire"><NumberInput value={s.tempDiscount} onChange={v => set('shop', 'tempDiscount', v)} suffix="%" /></Row>
        <Row label="Limite achat / jour"><NumberInput value={s.purchaseLimit} onChange={v => set('shop', 'purchaseLimit', v)} suffix="items" /></Row>
      </Section>
      <Section title="Prix minimum par rareté" last>
        <div style={{ display: 'flex', flexDirection: 'column' }}>{RARITY_CONFIG.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: r.color }}>{r.label}</span><span style={{ fontSize: 13, color: C.muted }}>{r.min.toLocaleString('fr-FR')} 🪙</span>
          </div>
        ))}</div>
      </Section>
    </>
  )
}
function NotificationsPanel({ s, set, accent, reveal, setReveal, onToast }) {
  const hooks = [['webhookMod', 'Modération'], ['webhookRevenue', 'Revenus'], ['webhookErrors', 'Erreurs'], ['webhookBigBuy', 'Gros achat']]
  return (
    <Section title="Notifications" desc="Webhooks Discord & alertes. Les secrets restent en mémoire (jamais sauvegardés)." last>
      {hooks.map(([key, label]) => (
        <Row key={key} label={`Webhook ${label}`} hint={s[key] ? maskWebhook(s[key]) : 'Non configuré'}>
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <TextInput type={reveal === key ? 'text' : 'password'} value={s[key]} onChange={v => set('notifications', key, v)} placeholder="https://discord.com/api/webhooks/…" width={210} accent={accent} />
            <button onClick={() => setReveal(reveal === key ? null : key)} title="Afficher/masquer" style={{ ...inputBase, cursor: 'pointer', padding: '8px 9px', color: C.muted }}>{reveal === key ? '🙈' : '👁'}</button>
            <button onClick={() => { if (!s[key]) return onToast('Vide'); try { navigator.clipboard.writeText(s[key]); onToast('Copié') } catch { onToast('Copie impossible') } }} title="Copier" style={{ ...inputBase, cursor: 'pointer', padding: '8px 9px', color: C.muted }}>📋</button>
            <button onClick={() => onToast(s[key] ? `Ping test → ${label}` : 'Configure d\'abord')} title="Tester" style={{ ...inputBase, cursor: 'pointer', padding: '8px 11px', color: accent, borderColor: C.borderHi }}>Test</button>
          </span>
        </Row>
      ))}
      <Row label="Email admin"><TextInput type="email" value={s.adminEmail} onChange={v => set('notifications', 'adminEmail', v)} placeholder="admin@…" width={230} accent={accent} /></Row>
      <Row label="Alertes critiques"><Toggle on={s.criticalAlerts} onChange={v => set('notifications', 'criticalAlerts', v)} accent={accent} /></Row>
    </Section>
  )
}
function SecurityPanel({ s, set, accent, onToast }) {
  const [ip, setIp] = useState('')
  const addIp = () => { const v = ip.trim(); if (!v) return; if ((s.ipAllowlist || []).includes(v)) return onToast('Déjà présente'); set('security', 'ipAllowlist', [...(s.ipAllowlist || []), v]); setIp(''); onToast(`IP ${v} ajoutée`) }
  return (
    <>
      <Section title="Sécurité" desc="Authentification, sessions et protections.">
        <Row label="2FA obligatoire (admins)"><Toggle on={s.admin2fa} onChange={v => set('security', 'admin2fa', v)} accent={accent} /></Row>
        <Row label="Expiration de session"><SelectInput value={s.sessionExpiry} onChange={v => set('security', 'sessionExpiry', v)} options={['24h', '7j', '30j'].map(x => ({ value: x, label: x }))} width={110} /></Row>
        <Row label="Confirmation action sensible" hint="Re-demande le mot de passe."><Toggle on={s.confirmSensitive} onChange={v => set('security', 'confirmSensitive', v)} accent={accent} /></Row>
        <Row label="Blocage IP suspectes"><Toggle on={s.ipBlock} onChange={v => set('security', 'ipBlock', v)} accent={accent} /></Row>
        <Row label="Journal d'audit non supprimable"><Toggle on={s.auditImmutable} onChange={v => set('security', 'auditImmutable', v)} accent={accent} /></Row>
      </Section>
      <Section title="Liste blanche IP" desc="Restreint l'accès staff à ces adresses." last>
        <div style={{ display: 'flex', gap: 8 }}><TextInput value={ip} onChange={setIp} placeholder="ex : 81.250.x.x" width={220} accent={accent} /><GhostBtn onClick={addIp} accent={accent}>Ajouter</GhostBtn></div>
        {(s.ipAllowlist || []).length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>{(s.ipAllowlist || []).map(x => (
            <span key={x} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: C.text, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 999, padding: '4px 8px 4px 12px' }}>{x}<button onClick={() => set('security', 'ipAllowlist', s.ipAllowlist.filter(i => i !== x))} style={{ background: 'none', border: 'none', color: C.neg, cursor: 'pointer', fontSize: 13, padding: 0 }}>✕</button></span>
          ))}</div>
        ) : <div style={{ fontSize: 12, color: C.muted, marginTop: 11 }}>Aucune IP — accès non restreint.</div>}
      </Section>
    </>
  )
}
function LogsPanel() {
  const [f, setF] = useState('all')
  const rows = useMemo(() => f === 'all' ? AUDIT_LOG : AUDIT_LOG.filter(l => l.type === f), [f])
  return (
    <Section title="Journal d'audit" desc="Historique des actions sensibles (lecture seule)." last>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>{['all', 'ban', 'mute', 'settings', 'berries', 'shop'].map(t => (
        <button key={t} onClick={() => setF(t)} style={{ fontSize: 12, padding: '5px 11px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${f === t ? C.borderHi : C.border}`, background: f === t ? C.goldSoft : 'transparent', color: f === t ? C.gold : C.muted }}>{t === 'all' ? 'Tout' : t}</button>
      ))}</div>
      <div>{rows.map((l, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: LOG_COLOR[l.type] || C.muted, border: `1px solid ${(LOG_COLOR[l.type] || C.muted)}44`, borderRadius: 5, padding: '2px 7px', minWidth: 60, textAlign: 'center', textTransform: 'uppercase' }}>{l.type}</span>
          <span style={{ flex: 1, fontSize: 13, color: C.text }}><strong>{l.author}</strong> <span style={{ color: C.muted }}>→</span> {l.target}</span>
          <span style={{ fontSize: 11.5, color: C.muted, flexShrink: 0 }}>{l.date}</span>
        </div>
      ))}</div>
    </Section>
  )
}
function DangerPanel({ isAdmin, onAction }) {
  const [confirm, setConfirm] = useState(null)
  const actions = [
    { id: 'maintenance', label: 'Activer le mode maintenance', desc: 'Coupe l\'accès public immédiatement.' },
    { id: 'reset_ranking', label: 'Reset classement mensuel', desc: 'Heures vocales de la période → 0.' },
    { id: 'close_reg', label: 'Désactiver les inscriptions', desc: 'Bloque les nouvelles arrivées.' },
    { id: 'purge_logs', label: 'Purger les anciens logs', desc: 'Logs de plus de 90 jours.' },
    { id: 'reset_economy', label: 'Réinitialiser l\'économie Berries', desc: 'IRRÉVERSIBLE — tous les soldes à zéro.' },
  ]
  return (
    <Section title="Zone danger" desc={isAdmin ? 'Actions sensibles — confirmation requise.' : 'Réservées aux admins.'} last>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{actions.map(a => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '12px 14px', background: C.negSoft, border: `1px solid ${C.negHi}`, borderRadius: 10 }}>
          <div style={{ minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 500, color: C.text }}>{a.label}</div><div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{a.desc}</div></div>
          {confirm === a.id ? (
            <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => { onAction(a.label); setConfirm(null) }} style={{ fontSize: 12, fontWeight: 700, padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: C.neg, color: '#0b0c0e' }}>Confirmer</button>
              <button onClick={() => setConfirm(null)} style={{ fontSize: 12, padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, cursor: 'pointer', background: 'transparent', color: C.muted }}>Annuler</button>
            </span>
          ) : <button disabled={!isAdmin} onClick={() => setConfirm(a.id)} style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 600, padding: '8px 14px', borderRadius: 8, cursor: isAdmin ? 'pointer' : 'not-allowed', border: `1px solid ${C.negHi}`, background: 'transparent', color: C.neg, opacity: isAdmin ? 1 : 0.5 }}>{isAdmin ? 'Exécuter' : '🔒'}</button>}
        </div>
      ))}</div>
    </Section>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StaffSettings({ isAdmin = false }) {
  const [saved, setSaved] = useState(() => { try { return mergeSettings(JSON.parse(localStorage.getItem(LS_KEY) || '{}')) } catch { return DEFAULT_SETTINGS } })
  const [draft, setDraft] = useState(saved)
  const [active, setActive] = useState('general')
  const [reveal, setReveal] = useState(null)
  const [toast, setToast] = useState(null)
  const [menu, setMenu] = useState(false)
  const [snaps, setSnaps] = useState(() => { try { return JSON.parse(localStorage.getItem(LS_SNAPS) || '[]') } catch { return [] } })
  const fileRef = useRef(null), toastTimer = useRef(null)

  const accent = ACCENTS.find(a => a.id === draft.ui?.accent)?.color || C.gold
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])
  const flash = (m) => { setToast(m); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 2400) }
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const set = (sec, k, v) => setDraft(d => ({ ...d, [sec]: { ...d[sec], [k]: v } }))
  const setPerm = (role, k, v) => setDraft(d => ({ ...d, permissions: { ...d.permissions, [role]: { ...d.permissions[role], [k]: v } } }))

  const save = () => {
    // Les webhooks (secrets) ne sont PAS persistés → mémoire de session uniquement.
    // TODO BACKEND : POST /api/staff/settings, secrets chiffrés côté serveur.
    try { localStorage.setItem(LS_KEY, JSON.stringify(stripSecrets(draft))) } catch {}
    const next = [{ at: Date.now(), data: stripSecrets(draft) }, ...snaps].slice(0, 8)
    setSnaps(next); try { localStorage.setItem(LS_SNAPS, JSON.stringify(next)) } catch {}
    setSaved(draft); flash('Paramètres enregistrés')
  }
  const exportJson = () => { const b = new Blob([JSON.stringify(stripSecrets(draft), null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `brams-settings-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(u); flash('Config exportée'); setMenu(false) }
  const importJson = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { setDraft({ ...DEFAULT_SETTINGS, ...JSON.parse(r.result) }); flash('Config importée — Enregistrer pour appliquer') } catch { flash('Fichier invalide') } }; r.readAsText(f); if (fileRef.current) fileRef.current.value = '' }
  const onDanger = (label) => flash(`« ${label} » — confirmé (exécution = TODO backend)`)

  const panels = {
    general: <GeneralPanel s={draft.general} set={set} accent={accent} />,
    permissions: <PermissionsPanel s={draft} setPerm={setPerm} isAdmin={isAdmin} accent={accent} />,
    moderation: <ModerationPanel s={draft.moderation} set={set} accent={accent} />,
    reports: <ReportsPanel s={draft.reports} set={set} accent={accent} />,
    economy: <EconomyPanel s={draft.economy} set={set} accent={accent} onToast={flash} />,
    shop: <ShopPanel s={draft.shop} set={set} accent={accent} />,
    notifications: <NotificationsPanel s={draft.notifications} set={set} accent={accent} reveal={reveal} setReveal={setReveal} onToast={flash} />,
    security: <SecurityPanel s={draft.security} set={set} accent={accent} onToast={flash} />,
    logs: <LogsPanel />,
    danger: <DangerPanel isAdmin={isAdmin} onAction={onDanger} />,
  }

  return (
    <div style={{ position: 'relative', paddingBottom: dirty ? 76 : 20 }}>
      <input ref={fileRef} type="file" accept="application/json" onChange={importJson} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: CINZEL, fontSize: 25, color: C.text, margin: 0, letterSpacing: '.01em' }}>Paramètres</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 5 }}>Centre de contrôle — modération, économie, boutique & sécurité.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {ACCENTS.map(a => <button key={a.id} onClick={() => set('ui', 'accent', a.id)} title={a.id} style={{ width: 18, height: 18, borderRadius: '50%', background: a.color, cursor: 'pointer', border: draft.ui?.accent === a.id ? '2px solid #fff' : '2px solid transparent', outline: `1px solid ${C.border}` }} />)}
          </div>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenu(m => !m)} style={{ ...inputBase, cursor: 'pointer', padding: '8px 12px', color: C.sub, fontWeight: 700, letterSpacing: '.08em' }}>•••</button>
            {menu && (
              <div style={{ position: 'absolute', top: '112%', right: 0, zIndex: 30, minWidth: 190, background: C.cardHi, border: `1px solid ${C.borderHi}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 18px 44px rgba(0,0,0,.55)' }}>
                {[['Importer une config', () => { fileRef.current?.click(); setMenu(false) }], ['Exporter la config', exportJson], [`Historique (${snaps.length})`, () => { setActive('snaps'); setMenu(false) }], ['Restaurer les défauts', () => { setDraft(DEFAULT_SETTINGS); flash('Défauts chargés — Enregistrer'); setMenu(false) }]].map(([lbl, fn]) => (
                  <button key={lbl} onClick={fn} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: `1px solid ${C.border}`, color: C.text, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{lbl}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deux panneaux */}
      <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start' }}>
        {/* Nav verticale */}
        <nav style={{ width: 210, flexShrink: 0, position: 'sticky', top: 8 }}>
          {SECTIONS.map(s => {
            const on = active === s.id
            return (
              <button key={s.id} onClick={() => setActive(s.id)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 13px', marginBottom: 3, borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', border: 'none',
                  background: on ? (s.danger ? C.negSoft : C.goldSoft) : 'transparent', borderLeft: `2px solid ${on ? (s.danger ? C.neg : accent) : 'transparent'}` }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
                onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent' }}>
                <div style={{ fontSize: 13.5, fontWeight: on ? 600 : 500, color: on ? (s.danger ? C.neg : accent) : C.text }}>{s.label}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{s.desc}</div>
              </button>
            )
          })}
        </nav>

        {/* Contenu */}
        <div style={{ flex: 1, minWidth: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '26px 28px' }}>
          {active === 'snaps' ? (
            <Section title="Historique des sauvegardes" desc="Restaure une version précédente (les secrets ne sont jamais inclus)." last>
              {snaps.length === 0 ? <div style={{ fontSize: 13, color: C.muted }}>Aucune sauvegarde. Clique « Enregistrer » pour créer un point.</div> : snaps.map((sn, i) => (
                <div key={sn.at} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.text }}>{i === 0 ? '● ' : ''}{new Date(sn.at).toLocaleString('fr-FR')}</span>
                  <GhostBtn onClick={() => { setDraft(d => ({ ...sn.data, notifications: d.notifications })); flash('Snapshot restauré — Enregistrer') }} accent={accent}>Restaurer</GhostBtn>
                </div>
              ))}
            </Section>
          ) : panels[active]}
        </div>
      </div>

      {/* Barre d'enregistrement sticky */}
      {dirty && (
        <div style={{ position: 'sticky', bottom: 0, marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 18px', background: 'rgba(13,14,18,0.92)', backdropFilter: 'blur(14px)', border: `1px solid ${C.borderHi}`, borderRadius: 12, boxShadow: '0 14px 40px rgba(0,0,0,.5)' }}>
          <span style={{ fontSize: 13, color: C.sub }}><span style={{ color: accent }}>●</span> Modifications non enregistrées</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setDraft(saved); flash('Annulé') }} style={{ fontSize: 13, fontWeight: 600, padding: '9px 16px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${C.border}`, background: 'transparent', color: C.sub }}>Annuler</button>
            <button onClick={save} style={{ fontSize: 13, fontWeight: 700, padding: '9px 20px', borderRadius: 9, cursor: 'pointer', border: 'none', background: accent, color: '#0b0c0e' }}>Enregistrer</button>
          </span>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 26, right: 26, zIndex: 50, background: C.cardHi, border: `1px solid ${accent}55`, borderRadius: 11, padding: '12px 18px', color: C.text, fontSize: 13.5, fontWeight: 500, boxShadow: '0 16px 44px rgba(0,0,0,.55)', animation: 'fadeIn .25s ease' }}>{toast}</div>}
    </div>
  )
}
