// src/components/staff/AnalyticsTab.jsx
// Dashboard analytics complet — Staff Panel Brams Community
// Inline styles exclusivement. Supabase + VITE_ANALYTICS_KEY.
import { useEffect, useState, useCallback, useRef } from 'react';
import { sbRpc } from '../../lib/supabaseRest.js';

const KEY = import.meta.env.VITE_ANALYTICS_KEY;
const REFRESH_MS = 30_000;

// ── Palette ────────────────────────────────────────────────────
const C = {
  gold: '#d4af37',
  goldFaint: 'rgba(212,175,55,0.1)',
  goldBorder: 'rgba(212,175,55,0.2)',
  text: '#e8e6e1',
  muted: '#8a8f98',
  card: 'rgba(255,255,255,0.035)',
  line: 'rgba(255,255,255,0.06)',
  green: '#3fd68f',
  greenFaint: 'rgba(63,214,143,0.12)',
  red: '#e05a5a',
  blue: '#5b8def',
};

const card  = (x = {}) => ({ background: C.card, border: `1px solid ${C.goldBorder}`, borderRadius: 14, padding: '16px 18px', ...x });
const label = { fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.muted };

// ── Mappings ────────────────────────────────────────────────────
const PAGE_NAMES = { '/': 'Accueil', '/boutique': 'Boutique', '/soutenir': 'Nous Soutenir', '/crew': 'Crew', '/le-fil': 'Le Fil', '/messages': 'Messages', '/animes': 'Animes' };
const EVENT_MAP  = {
  pageview:       { icon: '🗺️', verb: 'a visité' },
  anime_view:     { icon: '📺', verb: 'a regardé' },
  boutique_view:  { icon: '🛒', verb: 'a vu' },
  soutien_click:  { icon: '💛', verb: 'a cliqué Soutenir' },
  embarquer_click:{ icon: '⚓', verb: 'a cliqué Embarquer' },
};

const pageName = (p) => PAGE_NAMES[p] || p || '/';
const timeAgo  = (iso) => { const s = Math.floor((Date.now() - new Date(iso)) / 1000); return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s/60)}min` : `${Math.floor(s/3600)}h`; };
const fmtSec   = (s)   => { if (!s) return '—'; return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; };
const initials = (n)   => (!n || n === 'Visiteur' || n === 'Anonyme') ? '?' : n.slice(0,2).toUpperCase();
const deltaVal = (a,b) => (!b || b === 0) ? null : Math.round(((a-b)/b)*100);

// ── Hooks ───────────────────────────────────────────────────────
function useCountUp(target, dur = 650) {
  const [v, setV] = useState(0);
  const raf = useRef();
  useEffect(() => {
    const n = Number(target);
    if (isNaN(n)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(n); return; }
    const t0 = performance.now();
    const run = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      setV(Math.round((1 - Math.pow(1 - p, 3)) * n));
      if (p < 1) raf.current = requestAnimationFrame(run);
    };
    raf.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);
  return v;
}

// ── Composants ─────────────────────────────────────────────────

function PulseDot({ color = C.green, size = 8 }) {
  return (
    <span style={{ position:'relative', display:'inline-block', width:size, height:size, flexShrink:0 }}>
      <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:color, opacity:0.25, animation:'bpulse 2s ease-out infinite' }} />
      <span style={{ position:'absolute', inset:1, borderRadius:'50%', background:color }} />
      <style>{`@keyframes bpulse{0%,100%{transform:scale(1);opacity:.25}50%{transform:scale(2.4);opacity:0}}`}</style>
    </span>
  );
}

// ── KPI Card ────────────────────────────────────────────────────
function KpiCard({ label: lbl, value, accent, yesterday, isTime }) {
  const displayed = useCountUp(value);
  const d = yesterday !== undefined ? deltaVal(value, yesterday) : null;
  return (
    <div style={card({ flex:'1 1 140px', minWidth:140 })}>
      <div style={{ ...label, display:'flex', alignItems:'center', gap:6 }}>
        {accent === C.green && <PulseDot />}
        {lbl}
      </div>
      <div style={{ fontSize:38, fontWeight:800, marginTop:8, lineHeight:1, color: accent || C.text, fontVariantNumeric:'tabular-nums' }}>
        {isTime ? fmtSec(displayed) : displayed}
      </div>
      {d !== null && (
        <div style={{ fontSize:11, marginTop:5, fontWeight:600, color: d >= 0 ? C.green : C.red }}>
          {d >= 0 ? '↑' : '↓'} {Math.abs(d)}% vs hier
        </div>
      )}
    </div>
  );
}

// ── En ligne maintenant ─────────────────────────────────────────
function OnlinePanel({ users }) {
  return (
    <div style={card({ flex:'0 0 330px', minWidth:280 })}>
      <div style={{ ...label, display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <PulseDot color={C.green} />
        En ligne maintenant
        <span style={{ marginLeft:'auto', fontSize:14, fontWeight:800, color:C.text }}>
          {users.length}
        </span>
      </div>

      {users.length === 0 && (
        <div style={{ fontSize:13, color:C.muted, padding:'12px 0' }}>Personne sur le site pour le moment.</div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {users.map((u, i) => {
          const isMember = !!u.user_id;
          const freshSec = Math.floor((Date.now() - new Date(u.last_seen)) / 1000);
          return (
            <div key={u.session_id || i} style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'9px 10px', borderRadius:10,
              background: i === 0 ? C.goldFaint : 'rgba(255,255,255,0.02)',
              border:`1px solid ${i === 0 ? C.goldBorder : 'rgba(255,255,255,0.04)'}`,
            }}>
              {/* avatar */}
              <div style={{ position:'relative', flexShrink:0 }}>
                <div style={{
                  width:34, height:34, borderRadius:'50%',
                  background: isMember ? C.goldFaint : 'rgba(255,255,255,0.06)',
                  border:`1.5px solid ${isMember ? C.gold : C.line}`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:12, fontWeight:700, color: isMember ? C.gold : C.muted,
                }}>
                  {initials(u.username)}
                </div>
                <span style={{
                  position:'absolute', bottom:0, right:0, width:9, height:9, borderRadius:'50%',
                  background: freshSec < 45 ? C.green : C.gold,
                  border:'1.5px solid #0a0e14',
                }} />
              </div>

              {/* infos */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color: isMember ? C.text : C.muted }}>
                  {u.username}
                  {isMember && <span style={{ marginLeft:6, fontSize:10, color:C.gold }}>✦</span>}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2, fontSize:11 }}>
                  <span>{u.device === 'mobile' ? '📱' : '💻'}</span>
                  <span style={{ color:C.gold, opacity:0.85 }}>{pageName(u.current_page)}</span>
                </div>
              </div>

              <div style={{ fontSize:10, color:C.muted, flexShrink:0 }}>
                {timeAgo(u.last_seen)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Flux d'activité ─────────────────────────────────────────────
function LiveFeed({ events }) {
  return (
    <div style={card({ flex:1, minWidth:260 })}>
      <div style={{ ...label, marginBottom:14 }}>⚡ Activité en direct</div>
      {events.length === 0 && (
        <div style={{ fontSize:13, color:C.muted }}>Aucun événement encore.</div>
      )}
      <div style={{ display:'flex', flexDirection:'column', overflowY:'auto', maxHeight:400 }}>
        {events.map((e, i) => {
          const ev = EVENT_MAP[e.event_type] || { icon:'•', verb: e.event_type };
          const target = e.metadata?.title || e.metadata?.item || pageName(e.page);
          return (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'8px 2px',
              borderBottom:`1px solid ${C.line}`,
              fontSize:12.5,
            }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{ev.icon}</span>
              <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                <span style={{ color: e.user_id ? C.gold : C.muted, fontWeight:600 }}>{e.username}</span>
                {' '}
                <span style={{ color:C.muted }}>{ev.verb}</span>
                {' '}
                <span style={{ color:C.text }}>{target}</span>
              </span>
              <span style={{ fontSize:10, color:C.muted, flexShrink:0 }}>{timeAgo(e.created_at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Graphique trafic SVG ────────────────────────────────────────
function TrafficChart({ data }) {
  if (!data.length) return null;
  const W = 560, H = 90, padL = 4, padR = 4, padT = 8, padB = 20;
  const iW = W - padL - padR;
  const iH = H - padT - padB;
  const maxV = Math.max(1, ...data.map(d => Number(d.visitors)));
  const pts = data.map((d, i) => ({
    x: padL + (i / Math.max(data.length - 1, 1)) * iW,
    y: padT + iH - (Number(d.visitors) / maxV) * iH,
    ...d,
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${pts[pts.length-1].x},${padT+iH} L${pts[0].x},${padT+iH} Z`;
  return (
    <div style={card({})}>
      <div style={{ ...label, marginBottom:10 }}>Visiteurs par jour</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', overflow:'visible' }}>
        <defs>
          <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.gold} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={C.gold} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill="url(#gc)" />
        <path d={line} fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill={C.gold} stroke="#0a0e14" strokeWidth={1.5}/>
            <text x={p.x} y={H} textAnchor="middle" fill={C.muted} fontSize={8}>
              {new Date(p.day).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Top liste ───────────────────────────────────────────────────
function TopList({ title, rows, empty }) {
  const max = Math.max(1, ...rows.map(r => Number(r.views)));
  return (
    <div style={card({ flex:1, minWidth:240 })}>
      <div style={{ ...label, marginBottom:14 }}>{title}</div>
      {rows.length === 0 && <div style={{ fontSize:13, color:C.muted }}>{empty}</div>}
      {rows.map((r, i) => (
        <div key={i} style={{ marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4 }}>
            <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:C.text, minWidth:0 }}>
              <span style={{ color:C.gold, fontWeight:800, flexShrink:0 }}>{i+1}</span>
              <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {r.label || r.page || '?'}
              </span>
            </span>
            <span style={{ fontSize:11, color:C.muted, flexShrink:0, marginLeft:8 }}>
              {r.views} <span style={{ opacity:.6 }}>({r.visitors})</span>
            </span>
          </div>
          <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.06)' }}>
            <div style={{ height:'100%', width:`${(Number(r.views)/max)*100}%`, borderRadius:2, background:C.gold, transition:'width .5s ease' }}/>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Sources d'acquisition ───────────────────────────────────────
const ACQ_ICONS = {
  'Discord': '💬', 'Ami / bouche-à-oreille': '🤝', 'TikTok': '🎵', 'YouTube': '▶️',
  'Instagram': '📸', 'Twitter/X': '🐦', 'Reddit': '👽', 'Google / recherche': '🔍', 'Autre': '✏️',
};
function AcquisitionPanel({ data }) {
  const total = data?.total || 0;
  const rows = Array.isArray(data?.sources) ? data.sources : [];
  const max = Math.max(1, ...rows.map(r => Number(r.count) || 0));
  return (
    <div style={card({ flex:'1 1 320px', minWidth:280 })}>
      <div style={{ ...label, marginBottom:12 }}>🌐 Sources d'acquisition · {total} réponse{total>1?'s':''}</div>
      {rows.length === 0 ? (
        <div style={{ fontSize:13, color:C.muted }}>Aucune réponse pour l'instant — le sondage s'affiche à la 1ère visite.</div>
      ) : rows.map((r) => {
        const cnt = Number(r.count) || 0;
        const pct = total ? Math.round((cnt / total) * 100) : 0;
        return (
          <div key={r.source} style={{ marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, marginBottom:4 }}>
              <span style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
                <span style={{ flexShrink:0 }}>{ACQ_ICONS[r.source] || '🌐'}</span>
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.source}</span>
              </span>
              <span style={{ fontSize:12, color:C.muted, flexShrink:0, marginLeft:8, fontVariantNumeric:'tabular-nums' }}>
                {cnt} <span style={{ opacity:.6 }}>({pct}%)</span>
              </span>
            </div>
            <div style={{ height:6, borderRadius:3, background:'rgba(255,255,255,0.06)' }}>
              <div style={{ height:'100%', width:`${(cnt/max)*100}%`, borderRadius:3, background:C.gold, transition:'width .5s ease' }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Composant principal ─────────────────────────────────────────
export default function AnalyticsTab() {
  const [ov, setOv]           = useState(null);
  const [daily, setDaily]     = useState([]);
  const [topPages, setTP]     = useState([]);
  const [topAnimes, setTA]    = useState([]);
  const [online, setOnline]   = useState([]);
  const [feed, setFeed]       = useState([]);
  const [acq, setAcq]         = useState({ total:0, sources:[] });
  const [period, setPeriod]   = useState(14);
  const [error, setError]     = useState(null);
  const [lastUpdate, setLast] = useState(null);

  const load = useCallback(async () => {
    // REST direct (sbRpc) au lieu de supabase.rpc() : le client supabase-js peut
    // hanger sur le verrou d'auth → load() ne se terminait jamais et les KPI
    // restaient à 0 SANS erreur. sbRpc renvoie le résultat direct (objet/array),
    // ou { ok:false, error } en cas d'échec (clé absente, réseau…).
    const [a, b, c, d, e, f, g] = await Promise.all([
      sbRpc('analytics_overview',    { p_key:KEY }),
      sbRpc('analytics_daily',       { p_key:KEY, p_days:period }),
      sbRpc('analytics_top_pages',   { p_key:KEY, p_days:period, p_limit:6 }),
      sbRpc('analytics_top_events',  { p_key:KEY, p_event:'anime_view', p_days:period, p_limit:6 }),
      sbRpc('analytics_online_users',{ p_key:KEY }),
      sbRpc('analytics_live_feed',   { p_key:KEY, p_limit:35 }),
      sbRpc('analytics_acquisition', { p_key:KEY, p_days:period }),
    ]);
    const fail = [a,b,c,d,e,f,g].find(r => r && r.ok === false);
    if (fail) { setError(fail.error || 'Erreur analytics'); return; }
    setOv(a || null);
    setDaily(Array.isArray(b) ? b : []);
    setTP(Array.isArray(c) ? c : []);
    setTA(Array.isArray(d) ? d : []);
    setOnline(Array.isArray(e) ? e : []);
    setFeed(Array.isArray(f) ? f : []);
    setAcq(g && Array.isArray(g.sources) ? g : { total:0, sources:[] });
    setError(null); setLast(new Date());
  }, [period]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, color:C.text }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800 }}>
            📡 Analytics
            {online.length > 0 && (
              <span style={{ marginLeft:12, fontSize:12, fontWeight:600, color:C.green, verticalAlign:'middle' }}>
                ● {online.length} en ligne
              </span>
            )}
          </div>
          {lastUpdate && (
            <div style={{ fontSize:11, color:C.muted, marginTop:3 }}>
              Mis à jour à {lastUpdate.toLocaleTimeString('fr-FR')} · refresh auto 30s
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:6 }}>
          {[7,14,30].map(d => (
            <button key={d} onClick={() => setPeriod(d)} style={{
              padding:'5px 12px', borderRadius:8, cursor:'pointer',
              fontSize:12, fontWeight:700,
              background: period===d ? C.goldFaint : 'transparent',
              color: period===d ? C.gold : C.muted,
              border:`1px solid ${period===d ? C.goldBorder : 'rgba(255,255,255,0.08)'}`,
            }}>
              {d}j
            </button>
          ))}
        </div>
      </div>

      {/* ── Erreur ── */}
      {error && (
        <div style={card({ borderColor:C.red, color:C.red, fontSize:13 })}>
          ⚠️ {error} — Vérifie <code>VITE_ANALYTICS_KEY</code> et la clé dans <code>analytics_config</code>.
        </div>
      )}

      {/* ── KPIs ── */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        <KpiCard label="En ligne"         value={ov?.online_now       ?? 0} accent={C.green} />
        <KpiCard label="Membres connectés" value={ov?.members_online   ?? 0} accent={C.gold} />
        <KpiCard label="Visiteurs aujourd'hui" value={ov?.visitors_today  ?? 0} yesterday={ov?.visitors_yesterday} />
        <KpiCard label="Pages vues"        value={ov?.pageviews_today  ?? 0} yesterday={ov?.pageviews_yesterday} />
        <KpiCard label="Durée moy. session" value={ov?.avg_session_sec ?? 0} isTime />
      </div>

      {/* ── En ligne + Flux ── */}
      <div style={{ display:'flex', gap:14, flexWrap:'wrap', alignItems:'flex-start' }}>
        <OnlinePanel users={online} />
        <LiveFeed events={feed} />
      </div>

      {/* ── Graphique trafic ── */}
      <TrafficChart data={daily} />

      {/* ── Top listes ── */}
      <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
        <TopList
          title="Top pages"
          rows={topPages}
          empty="Aucune donnée — le tracking tourne ?"
        />
        <TopList
          title="📺 Top animes regardés"
          rows={topAnimes}
          empty="Pas encore de données — pense à appeler track('anime_view', { title }) sur ta page anime."
        />
      </div>

      {/* ── Sources d'acquisition ── */}
      <AcquisitionPanel data={acq} />

    </div>
  );
}
