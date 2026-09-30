// ── En-tête de série des pages /manga/<slug> ─────────────────────────────────
// La page n'avait pour identité qu'un titre de 16 px : ni couverture, ni
// auteur, ni idée de ce qu'on avait déjà lu. Ce bandeau reprend la fiche du
// catalogue (scans-catalog.js) et met la reprise en action principale.
const fmt = n => (Number.isInteger(Number(n)) ? String(n) : String(Math.floor(Number(n))))

export default function MangaSeriesHero({ series, color, chapterCount, readCount, resume, first, last, onResume, onFirst, onLast }) {
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
              <span>{readCount > 0 ? `${readCount} / ${chapterCount} chapitres lus` : `${chapterCount} chapitres disponibles · ch. ${fmt(first)} à ${fmt(last)}`}</span>
              {readCount > 0 && <span style={{ color }}>{pct} %</span>}
            </div>
            <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(pct, readCount > 0 ? 1.5 : 0)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .4s ease' }} />
            </div>
          </div>

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
        </div>
      </div>
    </section>
  )
}
