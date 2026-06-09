import { useState, useMemo, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Page « Paramètres » du Staff Panel — centre de contrôle premium sobre.
// Inline styles only. State local persisté en localStorage. Chaque bouton fait
// quelque chose de réel (toast, export/import, snapshots…). TODO BACKEND marqués :
// brancher sur une table `staff_settings` avec validation rôle admin côté serveur.
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  bg: '#08090D', panel: '#0A0B0F', card: '#101116', cardHover: '#14151B',
  border: 'rgba(255,255,255,0.06)', borderHi: 'rgba(191,164,106,0.28)',
  gold: '#BFA46A', goldSoft: 'rgba(191,164,106,0.10)',
  pos: '#6fae8b', posSoft: 'rgba(111,174,139,0.10)',
  neg: '#c98b86', negSoft: 'rgba(201,139,134,0.08)', negHi: 'rgba(201,139,134,0.30)',
  text: '#E7E5DE', muted: '#7A7A88', dim: '#4A4A56',
}
const R = '12px'
const CINZEL = "'Cinzel', serif"
const LS_KEY = 'brams_staff_settings_v1'
const LS_SNAPS = 'brams_staff_settings_snaps_v1'
const ACCENTS = [
  { id: 'or', label: 'Or', color: '#BFA46A' },
  { id: 'rouge', label: 'Rouge', color: '#c98b86' },
  { id: 'violet', label: 'Violet', color: '#9b8cf0' },
  { id: 'emeraude', label: 'Émeraude', color: '#6fae8b' },
]

// ── Constantes métier ──────────────────────────────────────────────────────
const STAFF_ROLES = ['Créateur', 'Admin', 'Modérateur', 'Support', 'Helper']
const PERMISSIONS = [
  { key: 'view_revenue',   label: 'Voir les revenus',     admin: true },
  { key: 'manage_members', label: 'Gérer les membres' },
  { key: 'ban_mute',       label: 'Bannir / mute' },
  { key: 'edit_berries',   label: 'Modifier les Berries',  admin: true },
  { key: 'manage_shop',    label: 'Gérer la boutique',     admin: true },
  { key: 'handle_reports', label: 'Gérer les signalements' },
  { key: 'view_logs',      label: 'Accéder aux logs' },
  { key: 'edit_settings',  label: 'Modifier les paramètres', admin: true },
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

const DEFAULT_SETTINGS = {
  general: { maintenance: false, maintenanceMsg: 'Le site revient vite — on prépare quelque chose de grand. 🏴‍☠️', announce: '', announceAt: '', registrations: true, lang: 'fr', tz: 'Europe/Paris' },
  moderation: { muteDefault: '1h', banDefault: '7j', autoHide: 3, msgPerMin: 8, postCooldown: 30, bannedWords: '', allowImages: true, allowVideos: true, allowPosts: true, allowDM: true, slowMode: false },
  reports: { autoAssign: true, urgentThreshold: 5, hideAfter: 3, discordNotify: true },
  economy: { perMessage: 2, daily: 50, dailyCooldown: 24, streakBonus: 10, transferTax: 5, transferLimit: 1000, antiFarm: true, eventMultiplier: 1, eventUntil: '', monthlyReset: false },
  shop: { active: true, purchaseLimit: 5, tempDiscount: 0, flashSale: false },
  notifications: { webhookMod: '', webhookRevenue: '', webhookErrors: '', webhookBigBuy: '', adminEmail: '', criticalAlerts: true },
  security: { admin2fa: false, sessionExpiry: '7j', confirmSensitive: true, ipBlock: true, auditImmutable: true, ipAllowlist: [] },
  ui: { accent: 'or' },
  permissions: {
    'Créateur':   Object.fromEntries(PERMISSIONS.map(p => [p.key, true])),
    'Admin':      Object.fromEntries(PERMISSIONS.map(p => [p.key, true])),
    'Modérateur': { view_revenue: false, manage_members: true, ban_mute: true, edit_berries: false, manage_shop: false, handle_reports: true, view_logs: true, edit_settings: false },
    'Support':    { view_revenue: false, manage_members: true, ban_mute: false, edit_berries: false, manage_shop: false, handle_reports: true, view_logs: true, edit_settings: false },
    'Helper':     { view_revenue: false, manage_members: false, ban_mute: false, edit_berries: false, manage_shop: false, handle_reports: true, view_logs: false, edit_settings: false },
  },
}

const AUDIT_LOG = [
  { type: 'ban',      author: 'Al Freydiss', target: 'Spandam',  date: 'il y a 4min' },
  { type: 'settings', author: 'Brams',       target: 'Économie · multiplicateur x2', date: 'il y a 1h' },
  { type: 'berries',  author: 'Al Freydiss', target: '+5000 → Lamar', date: 'il y a 3h' },
  { type: 'shop',     author: 'Berat',       target: 'Réduction -20% activée', date: 'hier' },
  { type: 'mute',     author: 'Modérateur',  target: 'Buggy · 1h', date: 'hier' },
]
const LOG_COLOR = { ban: C.neg, mute: C.gold, settings: C.gold, berries: C.pos, shop: C.gold }

// Index plat pour la recherche (command palette).
const SETTINGS_INDEX = [
  ['Mode maintenance', 'general'], ['Message de maintenance', 'general'], ['Annonce globale', 'general'], ['Inscriptions', 'general'], ['Langue', 'general'], ['Fuseau horaire', 'general'],
  ['Permissions par rôle', 'permissions'],
  ['Durée mute', 'moderation'], ['Durée ban', 'moderation'], ['Mots interdits', 'moderation'], ['Limite messages', 'moderation'], ['Slow mode', 'moderation'],
  ['Signalements urgents', 'reports'], ['Catégories de report', 'reports'],
  ['Gain par message', 'economy'], ['Daily reward', 'economy'], ['Taxe transfert', 'economy'], ['Multiplicateur événement', 'economy'], ['Reset mensuel', 'economy'],
  ['Boutique active', 'shop'], ['Réduction', 'shop'], ['Flash sale', 'shop'], ['Prix par rareté', 'shop'],
  ['Webhook Discord', 'notifications'], ['Email admin', 'notifications'],
  ['2FA admins', 'security'], ['Session', 'security'], ['Liste blanche IP', 'security'],
  ['Journal d\'audit', 'logs'],
]

const maskWebhook = (url) => {
  if (!url) return ''
  const m = url.match(/^https:\/\/discord\.com\/api\/webhooks\/(\d+)\/(.+)$/)
  if (!m) return url.length > 18 ? url.slice(0, 14) + '••••' : url
  return `https://discord.com/api/webhooks/${m[1].slice(0, 4)}••••/${'•'.repeat(8)}`
}

// ── Primitives UI ──────────────────────────────────────────────────────────
function Toggle({ on, onChange, disabled, accent = C.gold }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled}
      onClick={() => !disabled && onChange(!on)}
      style={{ width: 40, height: 23, borderRadius: 999, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', padding: 2, background: on ? accent : 'rgba(255,255,255,0.1)', transition: 'background .2s', opacity: disabled ? 0.45 : 1, flexShrink: 0 }}>
      <span style={{ display: 'block', width: 19, height: 19, borderRadius: '50%', background: '#0b0c0e', transform: on ? 'translateX(17px)' : 'translateX(0)', transition: 'transform .2s' }} />
    </button>
  )
}

const inputStyle = { background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 11px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }

function TextInput({ value, onChange, placeholder, type = 'text', width, accent = C.gold }) {
  const [foc, setFoc] = useState(false)
  return <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
    onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
    style={{ ...inputStyle, width: width || 150, borderColor: foc ? accent : C.border, transition: 'border .15s' }} />
}
function NumberInput({ value, onChange, suffix, width = 84 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <TextInput type="number" value={value} onChange={v => onChange(v === '' ? '' : Number(v))} width={width} />
      {suffix && <span style={{ fontSize: 12, color: C.muted }}>{suffix}</span>}
    </span>
  )
}
function SelectInput({ value, onChange, options, width = 150 }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, width, cursor: 'pointer' }}>
      {options.map(o => <option key={o.value} value={o.value} style={{ background: C.card }}>{o.label}</option>)}
    </select>
  )
}
function MiniBtn({ children, onClick, title, danger }) {
  const [hov, setHov] = useState(false)
  return <button onClick={onClick} title={title} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
    style={{ ...inputStyle, cursor: 'pointer', padding: '8px 12px', fontWeight: 600,
      color: danger ? C.neg : (hov ? C.text : C.muted), borderColor: hov ? (danger ? C.negHi : C.borderHi) : C.border, background: hov ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)' }}>{children}</button>
}

function SettingRow({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, color: C.text, fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}
function Card({ title, children, accent }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: R, padding: 20 }}>
      {title && <div style={{ fontSize: 14, fontWeight: 700, color: accent || C.text, marginBottom: 12 }}>{title}</div>}
      {children}
    </div>
  )
}
function StatusCard({ tag, value, ok, hint }) {
  const [hov, setHov] = useState(false)
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: C.card, border: `1px solid ${hov ? C.borderHi : C.border}`, borderRadius: R, padding: '15px 17px', transition: 'border .2s' }}>
      <div style={{ fontSize: 10.5, color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>{tag}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: ok ? C.pos : C.gold, boxShadow: `0 0 7px ${ok ? C.pos : C.gold}` }} />
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{value}</span>
      </div>
      {hint && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>{hint}</div>}
    </div>
  )
}

// ── Panels ─────────────────────────────────────────────────────────────────
function GeneralPanel({ s, set, accent }) {
  return (
    <Card title="Général">
      <SettingRow label="Mode maintenance" hint="Coupe l'accès public au site (le staff garde l'accès)."><Toggle on={s.maintenance} onChange={v => set('general', 'maintenance', v)} accent={accent} /></SettingRow>
      <SettingRow label="Message de maintenance"><TextInput value={s.maintenanceMsg} onChange={v => set('general', 'maintenanceMsg', v)} width={280} accent={accent} /></SettingRow>
      <SettingRow label="Annonce globale" hint="Bandeau en haut du site (vide = aucun)."><TextInput value={s.announce} onChange={v => set('general', 'announce', v)} placeholder="ex : Tournoi ce soir 21h !" width={280} accent={accent} /></SettingRow>
      <SettingRow label="Programmer l'annonce" hint="Feature : publie l'annonce à cette date/heure."><TextInput type="datetime-local" value={s.announceAt} onChange={v => set('general', 'announceAt', v)} width={210} accent={accent} /></SettingRow>
      <SettingRow label="Inscriptions ouvertes"><Toggle on={s.registrations} onChange={v => set('general', 'registrations', v)} accent={accent} /></SettingRow>
      <SettingRow label="Langue par défaut"><SelectInput value={s.lang} onChange={v => set('general', 'lang', v)} options={[{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }]} width={130} /></SettingRow>
      <SettingRow label="Fuseau horaire"><SelectInput value={s.tz} onChange={v => set('general', 'tz', v)} options={[{ value: 'Europe/Paris', label: 'Europe/Paris' }, { value: 'UTC', label: 'UTC' }]} width={150} /></SettingRow>
    </Card>
  )
}

function PermissionsPanel({ s, setPerm, isAdmin, accent }) {
  return (
    <Card title="Permissions par rôle">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 620 }}>
          <thead><tr>
            <th style={{ textAlign: 'left', fontSize: 11.5, color: C.muted, fontWeight: 600, padding: '8px 10px 8px 0' }}>Permission</th>
            {STAFF_ROLES.map(role => <th key={role} style={{ fontSize: 11.5, color: role === 'Créateur' ? accent : C.muted, fontWeight: 700, padding: '8px 6px', textAlign: 'center' }}>{role}</th>)}
          </tr></thead>
          <tbody>
            {PERMISSIONS.map(p => (
              <tr key={p.key} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ fontSize: 13, color: C.text, padding: '11px 10px 11px 0' }}>{p.label}{p.admin && <span style={{ marginLeft: 7, fontSize: 9.5, fontWeight: 800, color: C.neg, background: C.negSoft, border: `1px solid ${C.negHi}`, borderRadius: 5, padding: '1px 5px' }}>ADMIN</span>}</td>
                {STAFF_ROLES.map(role => {
                  const locked = role === 'Créateur' || !isAdmin
                  return <td key={role} style={{ textAlign: 'center', padding: '8px 6px' }}><span style={{ display: 'inline-flex' }}><Toggle on={!!s.permissions[role]?.[p.key]} disabled={locked} onChange={v => setPerm(role, p.key, v)} accent={accent} /></span></td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 12 }}>Le rôle Créateur a tous les droits (non modifiable). Les actions <span style={{ color: C.neg }}>ADMIN</span> sont réservées aux admins.</div>
    </Card>
  )
}

function ModerationPanel({ s, set, accent }) {
  return (
    <Card title="Modération">
      <SettingRow label="Durée mute par défaut"><SelectInput value={s.muteDefault} onChange={v => set('moderation', 'muteDefault', v)} options={['10min', '1h', '6h', '24h'].map(x => ({ value: x, label: x }))} width={110} /></SettingRow>
      <SettingRow label="Durée ban par défaut"><SelectInput value={s.banDefault} onChange={v => set('moderation', 'banDefault', v)} options={['1j', '7j', '30j', 'définitif'].map(x => ({ value: x, label: x }))} width={110} /></SettingRow>
      <SettingRow label="Slow mode global" hint="Force un délai entre messages partout."><Toggle on={s.slowMode} onChange={v => set('moderation', 'slowMode', v)} accent={accent} /></SettingRow>
      <SettingRow label="Masquer après X signalements"><NumberInput value={s.autoHide} onChange={v => set('moderation', 'autoHide', v)} suffix="reports" /></SettingRow>
      <SettingRow label="Limite messages / minute"><NumberInput value={s.msgPerMin} onChange={v => set('moderation', 'msgPerMin', v)} suffix="msg" /></SettingRow>
      <SettingRow label="Cooldown posts / commentaires"><NumberInput value={s.postCooldown} onChange={v => set('moderation', 'postCooldown', v)} suffix="s" /></SettingRow>
      <SettingRow label="Mots interdits" hint="Séparés par des virgules."><TextInput value={s.bannedWords} onChange={v => set('moderation', 'bannedWords', v)} placeholder="mot1, mot2…" width={240} accent={accent} /></SettingRow>
      <SettingRow label="Autoriser les images"><Toggle on={s.allowImages} onChange={v => set('moderation', 'allowImages', v)} accent={accent} /></SettingRow>
      <SettingRow label="Autoriser les vidéos"><Toggle on={s.allowVideos} onChange={v => set('moderation', 'allowVideos', v)} accent={accent} /></SettingRow>
      <SettingRow label="Autoriser les posts"><Toggle on={s.allowPosts} onChange={v => set('moderation', 'allowPosts', v)} accent={accent} /></SettingRow>
      <SettingRow label="Autoriser les DM"><Toggle on={s.allowDM} onChange={v => set('moderation', 'allowDM', v)} accent={accent} /></SettingRow>
    </Card>
  )
}

function ReportsPanel({ s, set, accent }) {
  return (
    <>
      <Card title="Signalements">
        <SettingRow label="Auto-assignation au staff"><Toggle on={s.autoAssign} onChange={v => set('reports', 'autoAssign', v)} accent={accent} /></SettingRow>
        <SettingRow label="Seuil urgent"><NumberInput value={s.urgentThreshold} onChange={v => set('reports', 'urgentThreshold', v)} suffix="reports" /></SettingRow>
        <SettingRow label="Masquer le contenu après X reports"><NumberInput value={s.hideAfter} onChange={v => set('reports', 'hideAfter', v)} suffix="reports" /></SettingRow>
        <SettingRow label="Notif Discord pour report urgent"><Toggle on={s.discordNotify} onChange={v => set('reports', 'discordNotify', v)} accent={accent} /></SettingRow>
      </Card>
      <Card title="Catégories">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {REPORT_CATEGORIES.map(cat => <span key={cat} style={{ fontSize: 12.5, color: C.text, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 999, padding: '5px 12px' }}>{cat}</span>)}
        </div>
      </Card>
    </>
  )
}

function EconomyPanel({ s, set, accent, onToast }) {
  const quickEvent = (mult, hours, label) => {
    const until = new Date(Date.now() + hours * 3600000).toISOString().slice(0, 16)
    set('economy', 'eventMultiplier', mult)
    set('economy', 'eventUntil', until)
    onToast(`⚡ Événement ${label} armé — Berries x${mult} pendant ${hours}h`)
  }
  return (
    <>
      <Card title="Événement rapide (Berries)">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <MiniBtn onClick={() => quickEvent(2, 1, 'Flash')}>⚡ x2 · 1h</MiniBtn>
          <MiniBtn onClick={() => quickEvent(2, 24, 'Journée')}>⚡ x2 · 24h</MiniBtn>
          <MiniBtn onClick={() => quickEvent(3, 48, 'Weekend')}>🔥 x3 · 48h</MiniBtn>
          <MiniBtn onClick={() => { set('economy', 'eventMultiplier', 1); set('economy', 'eventUntil', ''); onToast('Événement désactivé') }}>Stop</MiniBtn>
        </div>
        {s.eventUntil && s.eventMultiplier > 1 && <div style={{ fontSize: 12, color: accent, marginTop: 10 }}>Actif : Berries x{s.eventMultiplier} jusqu'au {new Date(s.eventUntil).toLocaleString('fr-FR')}</div>}
      </Card>
      <Card title="Brams Score / Berries">
        <SettingRow label="Gain par message"><NumberInput value={s.perMessage} onChange={v => set('economy', 'perMessage', v)} suffix="🪙" /></SettingRow>
        <SettingRow label="Daily reward"><NumberInput value={s.daily} onChange={v => set('economy', 'daily', v)} suffix="🪙" /></SettingRow>
        <SettingRow label="Cooldown daily"><NumberInput value={s.dailyCooldown} onChange={v => set('economy', 'dailyCooldown', v)} suffix="h" /></SettingRow>
        <SettingRow label="Bonus streak"><NumberInput value={s.streakBonus} onChange={v => set('economy', 'streakBonus', v)} suffix="%/j" /></SettingRow>
        <SettingRow label="Taxe transfert"><NumberInput value={s.transferTax} onChange={v => set('economy', 'transferTax', v)} suffix="%" /></SettingRow>
        <SettingRow label="Limite transfert / jour"><NumberInput value={s.transferLimit} onChange={v => set('economy', 'transferLimit', v)} suffix="🪙" /></SettingRow>
        <SettingRow label="Anti-farm" hint="Détecte le spam pour gratter des berries."><Toggle on={s.antiFarm} onChange={v => set('economy', 'antiFarm', v)} accent={accent} /></SettingRow>
        <SettingRow label="Reset classement mensuel"><Toggle on={s.monthlyReset} onChange={v => set('economy', 'monthlyReset', v)} accent={accent} /></SettingRow>
      </Card>
    </>
  )
}

function ShopPanel({ s, set, accent }) {
  return (
    <>
      <Card title="Boutique">
        <SettingRow label="Boutique active"><Toggle on={s.active} onChange={v => set('shop', 'active', v)} accent={accent} /></SettingRow>
        <SettingRow label="Flash sale" hint="Bandeau promo + réduction sur toute la boutique."><Toggle on={s.flashSale} onChange={v => set('shop', 'flashSale', v)} accent={accent} /></SettingRow>
        <SettingRow label="Réduction temporaire"><NumberInput value={s.tempDiscount} onChange={v => set('shop', 'tempDiscount', v)} suffix="%" /></SettingRow>
        <SettingRow label="Limite achat / jour"><NumberInput value={s.purchaseLimit} onChange={v => set('shop', 'purchaseLimit', v)} suffix="items" /></SettingRow>
      </Card>
      <Card title="Prix minimum par rareté">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {RARITY_CONFIG.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.label}</span>
              <span style={{ fontSize: 13, color: C.muted }}>{r.min.toLocaleString('fr-FR')} 🪙</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

function NotificationsPanel({ s, set, accent, reveal, setReveal, onToast }) {
  const hooks = [['webhookMod', 'Webhook modération'], ['webhookRevenue', 'Webhook revenus'], ['webhookErrors', 'Webhook erreurs'], ['webhookBigBuy', 'Webhook gros achat']]
  const test = (label, url) => onToast(url ? `🔔 Ping de test envoyé → ${label}` : 'Configure d\'abord ce webhook')
  const copy = (url) => { if (!url) return onToast('Vide'); try { navigator.clipboard.writeText(url); onToast('📋 Webhook copié') } catch { onToast('Copie impossible') } }
  return (
    <Card title="Notifications">
      {hooks.map(([key, label]) => (
        <SettingRow key={key} label={label} hint={s[key] ? maskWebhook(s[key]) : 'Non configuré'}>
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <TextInput type={reveal === key ? 'text' : 'password'} value={s[key]} onChange={v => set('notifications', key, v)} placeholder="https://discord.com/api/webhooks/…" width={210} accent={accent} />
            <button onClick={() => setReveal(reveal === key ? null : key)} title="Afficher / masquer" style={{ ...inputStyle, cursor: 'pointer', padding: '8px 9px', color: C.muted }}>{reveal === key ? '🙈' : '👁'}</button>
            <button onClick={() => copy(s[key])} title="Copier" style={{ ...inputStyle, cursor: 'pointer', padding: '8px 9px', color: C.muted }}>📋</button>
            <button onClick={() => test(label, s[key])} title="Tester" style={{ ...inputStyle, cursor: 'pointer', padding: '8px 9px', color: accent, borderColor: C.borderHi }}>Test</button>
          </span>
        </SettingRow>
      ))}
      <SettingRow label="Email admin"><TextInput type="email" value={s.adminEmail} onChange={v => set('notifications', 'adminEmail', v)} placeholder="admin@…" width={230} accent={accent} /></SettingRow>
      <SettingRow label="Alertes critiques"><Toggle on={s.criticalAlerts} onChange={v => set('notifications', 'criticalAlerts', v)} accent={accent} /></SettingRow>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 12 }}>⚠ Les webhooks sont des secrets : <span style={{ color: accent }}>TODO backend</span> — chiffrer/garder côté serveur, jamais en clair côté client.</div>
    </Card>
  )
}

function SecurityPanel({ s, set, accent, onToast }) {
  const [ip, setIp] = useState('')
  const addIp = () => {
    const v = ip.trim()
    if (!v) return
    if ((s.ipAllowlist || []).includes(v)) { onToast('IP déjà dans la liste'); return }
    set('security', 'ipAllowlist', [...(s.ipAllowlist || []), v]); setIp(''); onToast(`✓ IP ${v} ajoutée`)
  }
  const rmIp = (x) => set('security', 'ipAllowlist', (s.ipAllowlist || []).filter(i => i !== x))
  return (
    <>
      <Card title="Sécurité">
        <SettingRow label="2FA obligatoire pour les admins"><Toggle on={s.admin2fa} onChange={v => set('security', 'admin2fa', v)} accent={accent} /></SettingRow>
        <SettingRow label="Expiration de session"><SelectInput value={s.sessionExpiry} onChange={v => set('security', 'sessionExpiry', v)} options={['24h', '7j', '30j'].map(x => ({ value: x, label: x }))} width={110} /></SettingRow>
        <SettingRow label="Confirmation pour action sensible" hint="Re-demande le mot de passe avant les actions à risque."><Toggle on={s.confirmSensitive} onChange={v => set('security', 'confirmSensitive', v)} accent={accent} /></SettingRow>
        <SettingRow label="Blocage des IP suspectes"><Toggle on={s.ipBlock} onChange={v => set('security', 'ipBlock', v)} accent={accent} /></SettingRow>
        <SettingRow label="Journal d'audit non supprimable"><Toggle on={s.auditImmutable} onChange={v => set('security', 'auditImmutable', v)} accent={accent} /></SettingRow>
      </Card>
      <Card title="Liste blanche IP (accès staff)">
        <div style={{ display: 'flex', gap: 8 }}>
          <TextInput value={ip} onChange={setIp} placeholder="ex : 81.250.x.x" width={220} accent={accent} />
          <MiniBtn onClick={addIp}>+ Ajouter</MiniBtn>
        </div>
        {(s.ipAllowlist || []).length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
            {(s.ipAllowlist || []).map(x => (
              <span key={x} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: C.text, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 999, padding: '4px 8px 4px 12px' }}>
                {x}<button onClick={() => rmIp(x)} style={{ background: 'none', border: 'none', color: C.neg, cursor: 'pointer', fontSize: 13, padding: 0 }}>✕</button>
              </span>
            ))}
          </div>
        ) : <div style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>Aucune IP — l'accès staff n'est pas restreint par IP.</div>}
      </Card>
    </>
  )
}

function LogsPanel() {
  const [filter, setFilter] = useState('all')
  const rows = useMemo(() => filter === 'all' ? AUDIT_LOG : AUDIT_LOG.filter(l => l.type === filter), [filter])
  return (
    <Card title="Journal d'audit">
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {['all', 'ban', 'mute', 'settings', 'berries', 'shop'].map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{ fontSize: 12, padding: '5px 11px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${filter === t ? C.borderHi : C.border}`, background: filter === t ? C.goldSoft : 'transparent', color: filter === t ? C.gold : C.muted }}>{t === 'all' ? 'Tout' : t}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: LOG_COLOR[l.type] || C.muted, background: (LOG_COLOR[l.type] || C.muted) + '1a', borderRadius: 5, padding: '2px 7px', minWidth: 64, textAlign: 'center', textTransform: 'uppercase' }}>{l.type}</span>
            <span style={{ flex: 1, fontSize: 13, color: C.text }}><strong>{l.author}</strong> <span style={{ color: C.muted }}>→</span> {l.target}</span>
            <span style={{ fontSize: 11.5, color: C.muted, flexShrink: 0 }}>{l.date}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 12 }}><span style={{ color: C.gold }}>TODO backend</span> — table <code>audit_logs</code> (lecture seule).</div>
    </Card>
  )
}

function DangerZone({ isAdmin, onAction }) {
  const [confirm, setConfirm] = useState(null)
  const actions = [
    { id: 'maintenance', label: 'Activer le mode maintenance', desc: 'Coupe l\'accès public immédiatement.' },
    { id: 'reset_ranking', label: 'Reset classement mensuel', desc: 'Remet les heures vocales de la période à zéro.' },
    { id: 'close_reg', label: 'Désactiver les inscriptions', desc: 'Bloque les nouvelles arrivées.' },
    { id: 'purge_logs', label: 'Purger les anciens logs', desc: 'Supprime les logs de plus de 90 jours.' },
    { id: 'reset_economy', label: 'Réinitialiser l\'économie Berries', desc: 'IRRÉVERSIBLE — remet tous les soldes à zéro.' },
  ]
  return (
    <div style={{ background: C.negSoft, border: `1px solid ${C.negHi}`, borderRadius: R, padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: C.neg, marginBottom: 4 }}>⚠ Zone danger</div>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 16 }}>Actions sensibles. {isAdmin ? 'Confirmation requise.' : 'Réservées aux admins.'}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {actions.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '11px 13px', background: 'rgba(0,0,0,0.2)', border: `1px solid ${C.border}`, borderRadius: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{a.label}</div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{a.desc}</div>
            </div>
            {confirm === a.id ? (
              <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => { onAction(a.id, a.label); setConfirm(null) }} style={{ fontSize: 12, fontWeight: 800, padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: C.neg, color: '#0b0c0e' }}>Confirmer</button>
                <button onClick={() => setConfirm(null)} style={{ fontSize: 12, padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.border}`, cursor: 'pointer', background: 'transparent', color: C.muted }}>Annuler</button>
              </span>
            ) : (
              <button disabled={!isAdmin} onClick={() => setConfirm(a.id)} style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700, padding: '8px 14px', borderRadius: 8, cursor: isAdmin ? 'pointer' : 'not-allowed', border: `1px solid ${C.negHi}`, background: 'transparent', color: C.neg, opacity: isAdmin ? 1 : 0.5 }}>{isAdmin ? 'Exécuter' : '🔒 Admin'}</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'general', label: 'Général' }, { id: 'permissions', label: 'Permissions' },
  { id: 'moderation', label: 'Modération' }, { id: 'reports', label: 'Signalements' },
  { id: 'economy', label: 'Berries' }, { id: 'shop', label: 'Boutique' },
  { id: 'notifications', label: 'Notifications' }, { id: 'security', label: 'Sécurité' }, { id: 'logs', label: 'Logs' },
]

export default function StaffSettings({ isAdmin = false }) {
  const [saved, setSaved] = useState(() => {
    try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(LS_KEY) || '{}') } } catch { return DEFAULT_SETTINGS }
  })
  const [draft, setDraft] = useState(saved)
  const [tab, setTab] = useState('general')
  const [reveal, setReveal] = useState(null)
  const [toast, setToast] = useState(null)
  const [query, setQuery] = useState('')
  const [snaps, setSnaps] = useState(() => { try { return JSON.parse(localStorage.getItem(LS_SNAPS) || '[]') } catch { return [] } })
  const [showSnaps, setShowSnaps] = useState(false)
  const fileRef = useRef(null)
  const toastTimer = useRef(null)

  const accent = ACCENTS.find(a => a.id === draft.ui?.accent)?.color || C.gold
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])

  const flash = (msg) => { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 2600) }
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const set = (section, key, value) => setDraft(d => ({ ...d, [section]: { ...d[section], [key]: value } }))
  const setPerm = (role, key, value) => setDraft(d => ({ ...d, permissions: { ...d.permissions, [role]: { ...d.permissions[role], [key]: value } } }))

  const save = () => {
    // TODO BACKEND : POST /api/staff/settings (validation rôle admin côté serveur).
    try { localStorage.setItem(LS_KEY, JSON.stringify(draft)) } catch {}
    const snap = { at: Date.now(), data: draft }
    const next = [snap, ...snaps].slice(0, 8)
    setSnaps(next); try { localStorage.setItem(LS_SNAPS, JSON.stringify(next)) } catch {}
    setSaved(draft); flash('✓ Paramètres enregistrés (+ snapshot)')
  }
  const reset = () => { setDraft(saved); flash('Modifications annulées') }
  const restoreDefaults = () => { setDraft(DEFAULT_SETTINGS); flash('Valeurs par défaut chargées — pense à Enregistrer') }
  const restoreSnap = (snap) => { setDraft(snap.data); setShowSnaps(false); flash('Snapshot restauré — Enregistrer pour appliquer') }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `brams-staff-settings-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(url); flash('📥 Config exportée')
  }
  const importJson = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const r = new FileReader()
    r.onload = () => { try { setDraft({ ...DEFAULT_SETTINGS, ...JSON.parse(r.result) }); flash('📤 Config importée — Enregistrer pour appliquer') } catch { flash('Fichier invalide') } }
    r.readAsText(file); if (fileRef.current) fileRef.current.value = ''
  }

  const onDanger = (id, label) => flash(`⚠ « ${label} » — confirmé (exécution réelle = TODO backend sécurisé)`)

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? SETTINGS_INDEX.filter(([l]) => l.toLowerCase().includes(q)).slice(0, 6) : []
  }, [query])

  const g = draft.general, m = draft.moderation
  const quick = [
    { label: 'Maintenance', on: g.maintenance, act: () => set('general', 'maintenance', !g.maintenance) },
    { label: 'Inscriptions', on: g.registrations, act: () => set('general', 'registrations', !g.registrations) },
    { label: 'Boutique', on: draft.shop.active, act: () => set('shop', 'active', !draft.shop.active) },
    { label: 'Slow mode', on: m.slowMode, act: () => set('moderation', 'slowMode', !m.slowMode) },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40, position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', borderLeft: `3px solid ${accent}`, paddingLeft: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontFamily: CINZEL, fontSize: 24, color: C.text, margin: 0 }}>Paramètres</h1>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.06em', color: accent, background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent}44`, borderRadius: 999, padding: '2px 9px' }}>CENTRE DE CONTRÔLE</span>
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Modération, économie, boutique & sécurité de Brams Community.</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input ref={fileRef} type="file" accept="application/json" onChange={importJson} style={{ display: 'none' }} />
          <MiniBtn onClick={() => fileRef.current?.click()} title="Importer une config JSON">Importer</MiniBtn>
          <MiniBtn onClick={exportJson} title="Exporter la config en JSON">Exporter</MiniBtn>
          <MiniBtn onClick={() => setShowSnaps(s => !s)} title="Historique des sauvegardes">Historique ({snaps.length})</MiniBtn>
          {dirty && <span style={{ fontSize: 12, color: accent }}>● non enregistré</span>}
          <button onClick={reset} disabled={!dirty} style={{ fontSize: 13, fontWeight: 700, padding: '9px 16px', borderRadius: 9, cursor: dirty ? 'pointer' : 'default', border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, opacity: dirty ? 1 : 0.5 }}>Réinitialiser</button>
          <button onClick={save} disabled={!dirty} style={{ fontSize: 13, fontWeight: 800, padding: '9px 18px', borderRadius: 9, cursor: dirty ? 'pointer' : 'default', border: 'none', background: dirty ? accent : 'rgba(255,255,255,0.08)', color: dirty ? '#0b0c0e' : C.muted }}>Enregistrer</button>
        </div>
      </div>

      {/* Snapshots */}
      {showSnaps && (
        <Card title="Historique des sauvegardes">
          {snaps.length === 0 ? <div style={{ fontSize: 13, color: C.muted }}>Aucune sauvegarde encore. Clique « Enregistrer » pour créer un snapshot.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {snaps.map((sn, i) => (
                <div key={sn.at} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.text }}>{i === 0 ? '🟢 ' : ''}{new Date(sn.at).toLocaleString('fr-FR')}</span>
                  <MiniBtn onClick={() => restoreSnap(sn)}>Restaurer</MiniBtn>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Recherche + Accent + Actions rapides */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
          <TextInput value={query} onChange={setQuery} placeholder="🔎 Rechercher un paramètre…" width="100%" accent={accent} />
          {searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, zIndex: 20, background: C.card, border: `1px solid ${C.borderHi}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 16px 40px rgba(0,0,0,.5)' }}>
              {searchResults.map(([label, t]) => (
                <button key={label} onClick={() => { setTab(t); setQuery('') }} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '9px 13px', background: 'transparent', border: 'none', cursor: 'pointer', color: C.text, fontSize: 13, fontFamily: 'inherit', borderBottom: `1px solid ${C.border}` }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {label}<span style={{ color: C.muted, fontSize: 11 }}>{TABS.find(x => x.id === t)?.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 11.5, color: C.muted }}>Accent</span>
          {ACCENTS.map(a => (
            <button key={a.id} onClick={() => set('ui', 'accent', a.id)} title={a.label}
              style={{ width: 20, height: 20, borderRadius: '50%', background: a.color, cursor: 'pointer', border: draft.ui?.accent === a.id ? '2px solid #fff' : `2px solid transparent`, outline: `1px solid ${C.border}` }} />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {quick.map(q => (
          <button key={q.label} onClick={q.act}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, padding: '7px 13px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${q.on ? accent + '55' : C.border}`, background: q.on ? 'rgba(255,255,255,0.04)' : 'transparent', color: q.on ? accent : C.muted }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: q.on ? accent : C.dim }} />{q.label}
          </button>
        ))}
      </div>

      {/* Cartes statut */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatusCard tag="Maintenance" value={g.maintenance ? 'Activée' : 'Désactivée'} ok={!g.maintenance} hint={g.maintenance ? 'Site fermé' : 'Site ouvert'} />
        <StatusCard tag="Sécurité staff" value={draft.security.admin2fa ? '2FA active' : '2FA off'} ok={draft.security.admin2fa} hint={`Session ${draft.security.sessionExpiry}`} />
        <StatusCard tag="Économie Berries" value={draft.economy.eventMultiplier > 1 ? `Event x${draft.economy.eventMultiplier}` : 'Stable'} ok={draft.economy.eventMultiplier === 1} hint={draft.economy.antiFarm ? 'Anti-farm actif' : 'Anti-farm off'} />
        <StatusCard tag="Webhooks Discord" value={draft.notifications.webhookMod ? 'Connecté' : 'À configurer'} ok={!!draft.notifications.webhookMod} hint="Modération" />
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', borderBottom: `1px solid ${C.border}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ fontSize: 13, fontWeight: tab === t.id ? 700 : 500, padding: '10px 14px', cursor: 'pointer', fontFamily: 'inherit', border: 'none', background: 'transparent', color: tab === t.id ? accent : C.muted, borderBottom: `2px solid ${tab === t.id ? accent : 'transparent'}`, whiteSpace: 'nowrap', marginBottom: -1 }}>{t.label}</button>
        ))}
      </div>

      {/* Panel actif */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {tab === 'general' && <GeneralPanel s={g} set={set} accent={accent} />}
        {tab === 'permissions' && <PermissionsPanel s={draft} setPerm={setPerm} isAdmin={isAdmin} accent={accent} />}
        {tab === 'moderation' && <ModerationPanel s={m} set={set} accent={accent} />}
        {tab === 'reports' && <ReportsPanel s={draft.reports} set={set} accent={accent} />}
        {tab === 'economy' && <EconomyPanel s={draft.economy} set={set} accent={accent} onToast={flash} />}
        {tab === 'shop' && <ShopPanel s={draft.shop} set={set} accent={accent} />}
        {tab === 'notifications' && <NotificationsPanel s={draft.notifications} set={set} accent={accent} reveal={reveal} setReveal={setReveal} onToast={flash} />}
        {tab === 'security' && <SecurityPanel s={draft.security} set={set} accent={accent} onToast={flash} />}
        {tab === 'logs' && <LogsPanel />}
      </div>

      {/* Danger + reset défauts */}
      <DangerZone isAdmin={isAdmin} onAction={onDanger} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={restoreDefaults} style={{ fontSize: 12.5, color: C.muted, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 9, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>↺ Restaurer les valeurs par défaut</button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 26, right: 26, zIndex: 50, background: C.card, border: `1px solid ${accent}55`, borderRadius: 12, padding: '12px 18px', color: C.text, fontSize: 13.5, fontWeight: 600, boxShadow: '0 16px 44px rgba(0,0,0,.55)', animation: 'fadeIn .25s ease' }}>{toast}</div>
      )}
    </div>
  )
}
