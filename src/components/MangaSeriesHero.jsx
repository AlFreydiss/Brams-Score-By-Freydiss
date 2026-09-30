import { useState } from 'react'
// ── En-tête de série des pages /manga/<slug> ─────────────────────────────────
// La page n'avait pour identité qu'un titre de 16 px : ni couverture, ni
// auteur, ni idée de ce qu'on avait déjà lu. Ce bandeau reprend la fiche du
// catalogue (scans-catalog.js) et met la reprise en action principale.
const fmt = n => (Number.isInteger(Number(n)) ? String(n) : String(Math.floor(Number(n))))


export default function MangaSeriesHero({ series, color, chapterCount, readCount, resume, first, last, onResume, onFirst, onLast, freshCount = 0, remaining = null, onAnimeNext = null, onMarkUpTo, hasChapter }) {
  const [upTo, setUpTo] = useState('')
  const [upToErr, setUpToErr] = useState(false)
  const submitUpTo = (e) => {
    e.preventDefault()
    const n = Number(String(upTo).replace(',', '.'))
    // Un numéro manquant (JJK saute le ch. 20) reste valable : on marque tout ce qui le précède.
    if (!Number.isFinite(n) || n < Number(first) || n > Number(last)) { setUpToErr(true); return }
    setUpToErr(false); setUpTo(''); onMarkUpTo?.(n)
  }
  const pct = chapterCount ? Math.round((readCount / chapterCount) * 100) : 0
  const meta = [
    series.author,
    series.year,
    series.status === 'encours' ? 'En parution' : series.status === 'termine' ? 'Série terminée' : null,
  ].filter(Boolean)

  const btn = (primary) => ({
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 11, cursor: 'pointer',
    fontFamily: 'var(--body)', fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap',
    background: primary ? color : 'rgba(255,255,255,0.07)', color: '#fff',
    border: primary ? 'none' : '1px solid rgba(255,255,255,0.14)',
    boxShadow: primary ? `0 10px 30px -10px ${color}` : 'none',
  })

  return (
    <section className="msh" style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 22, border: '1px solid rgba(255,255,255,0.08)', padding: 0 }}>
      <style>{`
        .msh-in { display: flex; gap: 26px; align-items: flex-end; padding: 26px; position: relative; }
        .msh-cover { width: 168px; flex-shrink: 0; }
        @media (max-width: 640px) {
          .msh-in { flex-direction: column; align-items: flex-start; gap: 16px; padding: 18px; }
          .msh-cover { width: 112px; }
          .msh-actions > button { flex: 1 1 auto; justify-content: center; }
        }
      `}</style>
      {/* Fond : la couverture floutée, teintée de la couleur de la série */}
      <img src={series.cover} alt="" aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(38px) saturate(1.3) brightness(.45)', transform: 'scale(1.3)' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(100deg, rgba(10,10,14,.92) 0%, rgba(10,10,14,.7) 50%, ${color}33 100%)` }} />

      <div className="msh-in">
        <img className="msh-cover" src={series.cover} alt={`Couverture de ${series.title}`}
          style={{ aspectRatio: '2/3', objectFit: 'cover', borderRadius: 12, boxShadow: '0 24px 50px -18px rgba(0,0,0,.9)', border: '1px solid rgba(255,255,255,0.1)' }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.2em', color, marginBottom: 8 }}>📖 SCAN · VF</div>
          <h1 style={{ margin: 0, fontFamily: 'var(--display)', fontWeight: 900, fontSize: 'clamp(26px, 4vw, 44px)', lineHeight: 1.05, color: '#fff' }}>{series.title}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 12px', marginTop: 10, fontSize: 13.5, color: 'rgba(255,255,255,.72)' }}>
            {series.score != null && <span style={{ color: '#F5C451', fontWeight: 800 }}>★ {(series.score / 10).toFixed(1)}</span>}
            {meta.map(m => <span key={m}>{m}</span>)}
            {series.status === 'encours' && <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', marginLeft: -6 }} />}
          </div>
          {series.genres?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {series.genres.map(g => (
                <span key={g} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,.8)', border: `1px solid ${color}66`, background: `${color}14` }}>{g}</span>
              ))}
            </div>
          )}

          {/* Progression */}
          <div style={{ marginTop: 16, maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.7)', marginBottom: 6 }}>
              <span>
                {readCount > 0 ? `${readCount} / ${chapterCount} chapitres lus` : `${chapterCount} chapitres disponibles · ch. ${fmt(first)} à ${fmt(last)}`}
                {remaining && <span style={{ color: 'rgba(255,255,255,.5)', fontWeight: 600 }}> · ≈ {remaining} {readCount > 0 ? 'restantes' : 'de lecture'}</span>}
              </span>
              {readCount > 0 && <span style={{ color }}>{pct} %</span>}
            </div>
            <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(pct, readCount > 0 ? 1.5 : 0)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .4s ease' }} />
            </div>
          </div>

          {freshCount > 0 && (
            <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 700, color: '#EBCB88' }}>
              ✦ {freshCount} nouveau{freshCount > 1 ? 'x' : ''} chapitre{freshCount > 1 ? 's' : ''} depuis ta dernière visite
            </div>
          )}

          {/* Pont anime → manga : l'info que tout le monde cherche en finissant
              une saison. N'apparaît que pour les fins de saison vérifiées. */}
          {series.animeEnd && onAnimeNext && !(resume && Number(resume.num) > series.animeEnd.last) && (
            <button onClick={onAnimeNext} style={{
              display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '10px 14px', borderRadius: 11, cursor: 'pointer', textAlign: 'left',
              background: 'rgba(235,203,136,0.09)', border: '1px solid rgba(235,203,136,0.35)', color: '#fff', fontFamily: 'var(--body)', maxWidth: 460,
            }}>
              <span aria-hidden style={{ fontSize: 18 }}>🎬</span>
              <span style={{ fontSize: 13, lineHeight: 1.4 }}>
                <b>Tu as fini l'anime ?</b> {series.animeEnd.season} s'arrête au ch. {series.animeEnd.last}.<br />
                <span style={{ color: '#EBCB88', fontWeight: 800 }}>Continue au chapitre {series.animeEnd.next} →</span>
              </span>
            </button>
          )}

          <div className="msh-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
            {resume ? (
              <button style={btn(true)} onClick={onResume}>
                ▶ Reprendre ch. {fmt(resume.num)}{resume.page > 0 ? ` · p. ${resume.page + 1}` : ''}
              </button>
            ) : (
              <button style={btn(true)} onClick={onFirst}>▶ Commencer · ch. {fmt(first)}</button>
            )}
            {resume && Number(resume.num) !== Number(first) && (
              <button style={btn(false)} onClick={onFirst}>Depuis le début</button>
            )}
            <button style={btn(false)} onClick={onLast}>Dernier chapitre · {fmt(last)}</button>
          </div>

          {/* Déjà lu ailleurs : on indique où on en est, la reprise suit. */}
          {onMarkUpTo && (
            <form onSubmit={submitUpTo} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap', fontSize: 12.5, color: 'rgba(255,255,255,.6)' }}>
              <label htmlFor="msh-upto">Déjà lu ailleurs ? J'en suis au ch.</label>
              <input id="msh-upto" inputMode="decimal" value={upTo} onChange={e => { setUpTo(e.target.value); setUpToErr(false) }} placeholder={fmt(first)}
                style={{ width: 64, padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: `1px solid ${upToErr ? '#f87171' : 'rgba(255,255,255,0.14)'}`, color: '#fff', fontSize: 13, fontFamily: 'var(--body)' }} />
              <button type="submit" disabled={!upTo} style={{ padding: '6px 12px', borderRadius: 8, cursor: upTo ? 'pointer' : 'default', fontSize: 12.5, fontWeight: 700, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.4)', color: '#34d399' }}>Marquer lu</button>
              {upToErr && <span style={{ color: '#f87171' }}>Entre le ch. {fmt(first)} et le ch. {fmt(last)}.</span>}
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
