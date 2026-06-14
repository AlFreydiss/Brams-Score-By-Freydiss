// Sondage "Comment tu nous as connus ?" — modal 1ère visite (tous).
// Non-bloquant, dismissible. Réponse → analytics_sessions (anon) + profil (si connecté,
// dédup cross-device via RPC). Flag localStorage = ne re-montre jamais. Inline styles only.
import { useEffect, useRef, useState } from 'react';
import { setAcquisitionSource } from '../lib/analytics.js';

const DONE_KEY = 'bc_acq_done';
const DELAY_MS = 2500; // laisse le site s'afficher avant de demander

const SOURCES = [
  { label: 'Discord',                icon: '💬' },
  { label: 'Ami / bouche-à-oreille', icon: '🤝' },
  { label: 'TikTok',                 icon: '🎵' },
  { label: 'YouTube',                icon: '▶️' },
  { label: 'Instagram',              icon: '📸' },
  { label: 'Twitter/X',              icon: '🐦' },
  { label: 'Reddit',                 icon: '👽' },
  { label: 'Google / recherche',     icon: '🔍' },
  { label: 'Autre',                  icon: '✏️' },
];

const GOLD = '#d4af37';
const BG   = '#0E0F13';
const TEXT = '#e8e6e1';
const MUT  = '#8a8f98';
const TITLE_FONT = "'Bricolage Grotesque', system-ui, sans-serif";

export default function AcquisitionModal({ discordId, authReady = true }) {
  const [show, setShow]     = useState(false);
  const [other, setOther]   = useState(false);
  const [text, setText]     = useState('');
  const [thanks, setThanks] = useState(false);
  const scheduledRef = useRef(false);

  // Sondage = visiteurs NON connectés, et une seule fois dans la vie du navigateur.
  // Le flag est posé dès l'affichage → même un reload ne le re-montre pas.
  useEffect(() => {
    if (!authReady || scheduledRef.current) return;
    scheduledRef.current = true;
    if (discordId) return;                        // connecté → jamais
    if (localStorage.getItem(DONE_KEY)) return;   // déjà vu → jamais
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/brams-phone')) return; // pas par-dessus le jeu
    const t = setTimeout(() => {
      localStorage.setItem(DONE_KEY, '1');
      setShow(true);
    }, DELAY_MS);
    return () => clearTimeout(t);
  }, [authReady, discordId]);

  const finish = () => setShow(false);

  const choose = (source, detail = null) => {
    setThanks(true);
    setAcquisitionSource(source, detail);
    setTimeout(() => setShow(false), 1300);
  };

  const skip = () => finish();

  if (!show) return null;

  return (
    <div
      onClick={skip}
      style={{
        position: 'fixed', inset: 0, zIndex: 10050,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18,
        background: 'rgba(4,5,8,0.62)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        animation: 'acqfade .28s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Comment nous avez-vous connus"
        style={{
          position: 'relative', width: 'min(460px, 100%)',
          background: `linear-gradient(165deg, #14161c, ${BG})`,
          border: `1px solid rgba(212,175,55,0.20)`, borderTop: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 20, padding: '26px 24px 20px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55)', color: TEXT,
          animation: 'acqpop .34s cubic-bezier(.16,1,.3,1)',
        }}
      >
        <button
          onClick={skip} aria-label="Fermer"
          style={{
            position: 'absolute', top: 12, right: 12, width: 30, height: 30, lineHeight: '30px',
            borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
            color: MUT, fontSize: 16, cursor: 'pointer', textAlign: 'center', padding: 0,
          }}
        >×</button>

        {thanks ? (
          <div style={{ textAlign: 'center', padding: '26px 8px 18px' }}>
            <div style={{ fontSize: 40 }}>🙏</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 10, fontFamily: TITLE_FONT }}>Merci !</div>
            <div style={{ fontSize: 13, color: MUT, marginTop: 6 }}>Ça nous aide à faire grandir l'équipage ⚓</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD }}>
              Bienvenue à bord
            </div>
            <h2 style={{ margin: '8px 0 4px', fontSize: 23, fontWeight: 800, lineHeight: 1.15, fontFamily: TITLE_FONT }}>
              Comment tu nous as <span style={{ color: GOLD }}>connus</span> ? 🧭
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: MUT }}>
              Une seule question — ça nous aide énormément.
            </p>

            {!other ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {SOURCES.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => (s.label === 'Autre' ? setOther(true) : choose(s.label))}
                    style={optBtn}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'none'; }}
                  >
                    <span style={{ fontSize: 17 }}>{s.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={60}
                  placeholder="Dis-nous où…"
                  onKeyDown={(e) => { if (e.key === 'Enter') choose('Autre', text.trim() || null); }}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,175,55,0.3)',
                    color: TEXT, fontSize: 14, outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setOther(false)} style={{ ...optBtn, flex: '0 0 auto', justifyContent: 'center', color: MUT }}>← Retour</button>
                  <button
                    onClick={() => choose('Autre', text.trim() || null)}
                    style={{ flex: 1, padding: '11px 13px', borderRadius: 10, border: 'none', cursor: 'pointer',
                             background: GOLD, color: '#1a1405', fontWeight: 800, fontSize: 14 }}
                  >Valider</button>
                </div>
              </div>
            )}

            <button onClick={skip} style={{ display: 'block', margin: '14px auto 0', background: 'none', border: 'none',
                                            color: MUT, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
              Passer
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes acqfade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes acqpop  { from { opacity: 0; transform: translateY(14px) scale(.97) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { [aria-modal="true"], [aria-label="Comment nous avez-vous connus"] { animation: none !important } }
      `}</style>
    </div>
  );
}

const optBtn = {
  display: 'flex', alignItems: 'center', gap: 9, padding: '11px 12px', borderRadius: 10,
  background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)',
  color: '#e8e6e1', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
  transition: 'transform .15s ease, border-color .15s ease', minWidth: 0,
};
