// ── ScanCard — carte portrait d'un manga dans le hub ─────────────────────────
// Même gabarit qu'AnimeCard (2:3, survol CSS .ah2-art / .ah2-ov) pour que les
// deux rangées se lisent pareil, mais le contenu parle lecture : parution,
// chapitres disponibles, progression et reprise au dernier chapitre ouvert.
import { useState } from 'react'
import { C, FONT_BODY, RADIUS_CARD } from './tokens.js'

const fmtNum = n => (Number.isInteger(n) ? String(n) : String(Math.floor(n)))

export default function ScanCard({ scan, progress, width = 180, onOpen }) {
  const [loaded, setLoaded] = useState(false)
  const p = progress || { read: 0, current: null, pct: 0, started: false }
  const range = scan.first != null && scan.last != null && scan.first !== scan.last
    ? `Ch. ${fmtNum(scan.first)}–${fmtNum(scan.last)}`
    : `${scan.chapters} chapitres`
  const cta = p.current != null ? `Reprendre ch. ${fmtNum(Number(p.current))}` : 'Commencer'

  return (
    <div
      role="button" tabIndex={0} aria-label={`${scan.title} — scans`} className="ah2-card"
      onClick={() => onOpen?.(scan, p.current)}
      onKeyDown={e => { if (e.key === 'Enter') onOpen?.(scan, p.current) }}
      style={{ width, flexShrink: 0, cursor: 'pointer', fontFamily: FONT_BODY, outline: 'none' }}
    >
      <div className="ah2-art" style={{
        position: 'relative', aspectRatio: '2 / 3', borderRadius: RADIUS_CARD, overflow: 'hidden',
        background: 'rgba(255,255,255,0.04)',
      }}>
        {!loaded && (
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(100deg, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 60%)',
            backgroundSize: '200% 100%', animation: 'ah2-shimmer 1.4s linear infinite',
          }} />
        )}
        <img
          src={scan.cover} alt="" loading="lazy" decoding="async"
          onLoad={() => setLoaded(true)}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top',
            opacity: loaded ? 1 : 0, transition: 'opacity 240ms ease',
          }}
        />

        {/* Coin haut : type + parution. Liseré à la couleur de la série. */}
        <div style={{ position: 'absolute', top: 8, left: 8, right: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <span style={{
            padding: '3px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
            background: 'rgba(0,0,0,0.62)', color: C.text, backdropFilter: 'blur(4px)',
            boxShadow: `inset 0 -2px 0 ${scan.color}`,
          }}>SCAN</span>
          {scan.status === 'encours' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 7px', borderRadius: 6, fontSize: 10, fontWeight: 600,
              background: 'rgba(0,0,0,0.62)', color: C.text, backdropFilter: 'blur(4px)',
            }}>
              <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
              En parution
            </span>
          )}
        </div>

        {/* Survol / focus : fiche courte + action */}
        <div className="ah2-ov" style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          background: 'linear-gradient(180deg, transparent 35%, rgba(11,14,20,0.94) 100%)', padding: 10,
        }}>
          {scan.author && (
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {scan.author}
            </div>
          )}
          <div style={{ fontSize: 11.5, color: C.dim, display: 'flex', gap: 6, marginBottom: 8 }}>
            {scan.score != null && <span style={{ color: C.brass, fontWeight: 600 }}>★ {(scan.score / 10).toFixed(1)}</span>}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(scan.genres || []).join(' · ')}</span>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 10px', borderRadius: 8, background: C.brass, color: '#14110A',
            fontSize: 12, fontWeight: 700,
          }}>📖 {cta}</span>
        </div>

        {p.pct > 0 && (
          <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,0.15)' }}>
            <div style={{ width: `${p.pct}%`, height: '100%', background: C.brass }} />
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {scan.title}
        </div>
        <div style={{ fontSize: 11.5, color: C.faint, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.read > 0 ? `${p.read}/${scan.chapters} lus` : range}
        </div>
      </div>
    </div>
  )
}

// ── ScanResumeCard — carte 16:9 de la rangée « Reprendre » ───────────────────
// Même format que les reprises d'épisodes. Une couverture portrait étirée en
// 16:9 serait illisible : fond flouté de la couverture + vignette nette.
export function ScanResumeCard({ scan, progress, onOpen }) {
  const p = progress
  return (
    <div style={{ width: 280, flexShrink: 0 }}>
      <div role="button" tabIndex={0} className="ah2-card"
        aria-label={`Reprendre ${scan.title}, chapitre ${p.current}`}
        onClick={() => onOpen?.(scan, p.current)}
        onKeyDown={e => { if (e.key === 'Enter') onOpen?.(scan, p.current) }}
        style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', background: 'rgba(255,255,255,0.04)' }}>
        <img src={scan.cover} alt="" aria-hidden loading="lazy" decoding="async"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(18px) saturate(1.2) brightness(.55)', transform: 'scale(1.2)' }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${scan.color}33, transparent 70%)` }} />
        <img src={scan.cover} alt="" loading="lazy" decoding="async"
          style={{ position: 'absolute', left: 12, top: 12, bottom: 15, aspectRatio: '2/3', height: 'calc(100% - 27px)', objectFit: 'cover', borderRadius: 7, boxShadow: '0 8px 22px -8px rgba(0,0,0,.8)' }} />
        <div style={{ position: 'absolute', left: 12, right: 12, top: 0, bottom: 15, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 108 }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', color: C.brass }}>📖 SCAN</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scan.title}</span>
          <span style={{ fontSize: 12.5, color: C.text, marginTop: 6, fontWeight: 600 }}>Chapitre {fmtNum(Number(p.current))}</span>
          <span style={{ fontSize: 11.5, color: C.dim, marginTop: 2 }}>{p.read}/{scan.chapters} lus</span>
        </div>
        <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,0.15)' }}>
          <div style={{ width: `${Math.max(p.pct, 2)}%`, height: '100%', background: C.brass }} />
        </div>
      </div>
    </div>
  )
}
