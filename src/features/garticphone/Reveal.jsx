// Brams Phone — REVEAL. Albums reconstruits, lecture cinématique page par page
// (flip + flash doré), auteur + n° de page. L'HÔTE pilote (broadcast reveal_step) →
// tout le monde voit la même page ; autoplay réglable. Réactions emojis flottantes
// broadcastées à tous (canal room). Carte récap finale partageable (canvas → PNG).
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { type, fonts } from '../../styles/typography.js'
import { C, GRAD, alpha, panel, KEYFRAMES } from './theme.js'
import { Btn, Waiting } from './ui.jsx'
import { buildAlbums } from './logic/rotation.js'
import { playSound } from './sound.js'

const REACTIONS = ['😂', '🔥', '💀', '😮', '❤️', '🏴‍☠️']

// L'auteur de chaque page est fourni par le RPC gartic_all_pages sous la forme
// { author: { name, avatar } } — PAS author_user_id. On lit donc page.author.name,
// sinon tout l'album affichait « Inconnu ».
function authorName(page) {
  return page?.author?.name || 'Inconnu'
}

// Rendu d'un album entier sur un canvas offscreen → dataURL PNG (partage Discord).
async function renderAlbumPng(album, players) {
  const cards = album.pages
  const cw = 760, pad = 28, gap = 18
  const imgs = {}
  await Promise.all(cards.filter((c) => c.type === 'drawing' && c.content).map((c) => new Promise((res) => {
    const im = new Image(); im.crossOrigin = 'anonymous'
    im.onload = () => { imgs[c.content] = im; res() }
    im.onerror = () => res()
    im.src = c.content
  })))
  let h = pad + 60
  const heights = cards.map((c) => { const ch = c.type === 'drawing' ? 380 : 86; h += ch + gap; return ch })
  h += pad
  const cv = document.createElement('canvas')
  cv.width = cw; cv.height = h
  const ctx = cv.getContext('2d')
  ctx.fillStyle = '#0a1018'; ctx.fillRect(0, 0, cw, h)
  ctx.fillStyle = '#d7a829'; ctx.font = '800 30px ' + fonts.display
  ctx.fillText('🏴‍☠️ Brams Phone — Album', pad, pad + 30)
  ctx.fillStyle = 'rgba(243,239,226,0.5)'; ctx.font = '500 14px ' + fonts.body
  ctx.fillText(`Carnet de ${authorName(cards[0])}`, pad, pad + 52)
  let y = pad + 70
  cards.forEach((c, i) => {
    const ch = heights[i]
    ctx.fillStyle = 'rgba(231,194,90,0.85)'; ctx.font = '700 12px ' + fonts.body
    ctx.fillText(authorName(c).toUpperCase(), pad, y + 4)
    y += 14
    if (c.type === 'drawing' && imgs[c.content]) {
      const im = imgs[c.content]
      const ratio = Math.min((cw - pad * 2) / im.width, (ch - 8) / im.height)
      ctx.drawImage(im, pad, y, im.width * ratio, im.height * ratio)
    } else {
      ctx.fillStyle = '#f3efe2'; ctx.font = '500 22px ' + fonts.body
      const words = String(c.content || '—').split(' ')
      let line = '', ly = y + 28
      for (const w of words) {
        if (ctx.measureText(line + w).width > cw - pad * 2) { ctx.fillText(line, pad, ly); line = w + ' '; ly += 28 }
        else line += w + ' '
      }
      ctx.fillText(line, pad, ly)
    }
    y += ch + gap
  })
  return cv.toDataURL('image/png')
}

function PageCard({ page, players, kind, climax }) {
  // climax = dernière page d'un carnet (la punchline) → entrée plus dramatique.
  const anim = climax
    ? 'bp-reveal-in .8s cubic-bezier(.16,1,.3,1)'
    : 'bp-bookflip .6s cubic-bezier(.22,.8,.22,1)'
  return (
    <div data-bp-anim style={{ animation: anim }}>
      <div style={{ ...type.eyebrow, color: C.gold, marginBottom: 10 }}>
        {kind} · {authorName(page)}
      </div>
      {page?.type === 'drawing' ? (
        page.content ? (
          <img loading="lazy" decoding="async" src={page.content} alt="" style={{ display: 'block', width: '100%', maxHeight: 460, objectFit: 'contain', borderRadius: 14, border: `1px solid ${C.hairTop}`, background: '#fff' }} />
        ) : (
          <div style={{ borderRadius: 14, background: '#fff', color: '#999', minHeight: 200, display: 'grid', placeItems: 'center' }}>Dessin manquant</div>
        )
      ) : (
        <div style={{ ...type.h2, color: C.text, padding: '24px 22px', borderRadius: 14, background: alpha(C.gold, 0.07), border: `1px solid ${C.hair}`, textAlign: 'center', lineHeight: 1.4 }}>
          “{page?.content || '—'}”
        </div>
      )}
    </div>
  )
}

export default function Reveal({ room, players, n, isHost, allPages, onReplay, userId,
  revealStep, sendRevealStep, sendReaction, onReaction }) {
  const [pages, setPages] = useState(null)
  const [albumIdx, setAlbumIdx] = useState(0)
  const [pageIdx, setPageIdx] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const [sharing, setSharing] = useState(false)
  const guided = !isHost // l'invité suit le dévoilement piloté par l'hôte
  const fxRef = useRef(null)
  const burstRef = useRef(null)
  const [reactCounts, setReactCounts] = useState({}) // réactions cumulées par album (book → n)
  const lastBurstRef = useRef(-1)
  // Vote « coup de cœur » : un bulletin par votant (clé = from), réécrasable s'il
  // change d'avis. On stocke le book (siège auteur, stable) plutôt que l'index
  // positionnel pour rester robuste si la liste filtrée diffère entre pairs.
  const [votes, setVotes] = useState({}) // { [from]: book }
  const [myVote, setMyVote] = useState(null) // book voté par moi (feedback local)

  const loadPages = useCallback(() => { allPages().then((p) => setPages(p || [])).catch(() => {}) }, [allPages])
  useEffect(() => { let alive = true; allPages().then((p) => { if (alive) setPages(p || []) }).catch(() => {}); return () => { alive = false } }, [allPages])

  const albums = useMemo(() => pages ? buildAlbums(pages, n).filter((a) => a.pages.length) : [], [pages, n])
  const album = albums[albumIdx] || null
  const page = album?.pages[pageIdx] || null
  const lastPageOfAlbum = album && pageIdx >= album.pages.length - 1
  // climax = on atteint la dernière page d'un carnet qui en compte plusieurs → la "punchline".
  const climax = lastPageOfAlbum && (album?.pages.length || 0) > 1
  const lastAlbum = albumIdx >= albums.length - 1
  const finished = lastAlbum && lastPageOfAlbum

  // ── Agrégation des bulletins « coup de cœur » (1 par votant, clé=book) ───────
  // tally[book] = nombre de cœurs ; on joint au libellé d'auteur du carnet et on
  // trie pour le podium. totalVotes = participation affichée.
  const voteTally = useMemo(() => {
    const counts = {}
    for (const book of Object.values(votes)) counts[book] = (counts[book] || 0) + 1
    const rows = albums.map((a) => ({
      book: a.book,
      author: authorName(a.pages[0]),
      count: counts[a.book] || 0,
    }))
    rows.sort((x, y) => y.count - x.count)
    return rows
  }, [votes, albums])
  const totalVotes = useMemo(() => Object.keys(votes).length, [votes])
  const topCount = voteTally[0]?.count || 0

  // ── Réactions flottantes (spawn DOM + animation CSS GPU, auto-retrait) ───────
  const spawn = useCallback((emoji) => {
    const layer = fxRef.current; if (!layer || !emoji) return
    if (layer.childElementCount > 60) layer.firstChild?.remove() // anti-flood (peer hostile / spam)
    const el = document.createElement('div')
    el.textContent = emoji
    el.style.cssText = `position:absolute;bottom:6%;left:${8 + Math.random() * 84}%;font-size:${22 + Math.random() * 18}px;pointer-events:none;will-change:transform,opacity;transform:translateX(-50%);animation:bpReact ${1.7 + Math.random() * 1.3}s cubic-bezier(.3,.7,.3,1) forwards`
    layer.appendChild(el)
    const kill = () => el.remove()
    el.addEventListener('animationend', kill)
    setTimeout(kill, 3600) // filet si animationend ne se déclenche pas (onglet en veille)
  }, [])

  // Explosion de particules dorées (fin d'album = "punchline" du carnet). DOM +
  // CSS GPU, auto-retrait, pas de raf permanent. Réutilise l'idée du layer emojis.
  const burst = useCallback(() => {
    const layer = burstRef.current; if (!layer) return
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const N = 26
    for (let i = 0; i < N; i++) {
      const el = document.createElement('div')
      const ang = (Math.PI * 2 * i) / N + Math.random() * 0.5
      const dist = 120 + Math.random() * 180
      const dx = Math.cos(ang) * dist
      const dy = Math.sin(ang) * dist - 60 // léger biais vers le haut (gravité inversée façon feu d'artifice)
      const sz = 6 + Math.random() * 8
      const gold = Math.random() > 0.5 ? C.gold : C.goldSoft
      el.className = 'bp-confetti-pc'
      el.style.cssText = `position:absolute;left:50%;top:46%;width:${sz}px;height:${sz}px;border-radius:${Math.random() > 0.5 ? '50%' : '2px'};background:${gold};box-shadow:0 0 8px ${alpha(gold, 0.7)};pointer-events:none;will-change:transform,opacity;--bp-dx:${dx}px;--bp-dy:${dy}px;--bp-rot:${(Math.random() * 720 - 360).toFixed(0)}deg;animation:bp-confetti ${1.1 + Math.random() * 0.7}s cubic-bezier(.15,.6,.3,1) forwards`
      layer.appendChild(el)
      const kill = () => el.remove()
      el.addEventListener('animationend', kill)
      setTimeout(kill, 2200)
    }
  }, [])

  useEffect(() => {
    if (!onReaction) return
    return onReaction((p) => {
      // Vote « coup de cœur » : transite sur le même canal réactions (emoji:'vote',
      // book = album voté, from = votant). Pas un vrai emoji → on n'en fait PAS
      // une particule flottante, on l'agrège dans le décompte des cœurs.
      if (p?.emoji === 'vote') {
        if (typeof p.album !== 'undefined' && p.from != null) {
          setVotes((v) => ({ ...v, [String(p.from)]: p.album }))
        }
        return
      }
      spawn(p?.emoji)
      if (p?.emoji) setReactCounts((m) => ({ ...m, [albumIdx]: (m[albumIdx] || 0) + 1 }))
    })
  }, [onReaction, spawn, albumIdx])

  const react = (emoji) => {
    sendReaction?.(emoji); spawn(emoji)
    setReactCounts((m) => ({ ...m, [albumIdx]: (m[albumIdx] || 0) + 1 }))
  }

  // Voter pour un carnet (par son book stable). Broadcast sur le canal réactions ;
  // application optimiste locale immédiate. Un seul bulletin par votant (réécrasable).
  const voteFor = useCallback((book) => {
    if (book == null) return
    sendReaction?.('vote', { album: book })
    setMyVote(book)
    // Clé alignée sur le `from` rebroadcasté → si le canal nous renvoie notre
    // propre vote, il écrase ce bulletin optimiste au lieu d'en créer un second.
    setVotes((v) => ({ ...v, [String(userId)]: book }))
    playSound('reveal')
  }, [sendReaction, userId])

  // Blip sonore au changement de page du dévoilement (feedback de défilement).
  useEffect(() => { if (album && pages) playSound('reveal') }, [albumIdx, pageIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // Explosion dorée quand un carnet atteint sa page finale (une seule fois/album).
  useEffect(() => {
    if (!album || !pages || !climax) return
    if (lastBurstRef.current === albumIdx) return
    lastBurstRef.current = albumIdx
    burst()
  }, [album, pages, climax, albumIdx, burst])

  // ── Synchro hôte ↔ invités ───────────────────────────────────────────────
  // Invité : suit la position broadcastée. Hôte : diffuse sa position courante.
  useEffect(() => {
    if (!guided || !revealStep) return
    // id d'album stable (book = siège auteur) → robuste si la liste filtrée diffère
    // transitoirement entre pairs (fetch partiel). Index positionnel = page fausse.
    const idx = albums.findIndex((x) => x.book === revealStep.a)
    if (idx >= 0) setAlbumIdx(idx)
    else loadPages()  // on suit une page qu'on n'a pas encore → refetch (filet anti-freeze)
    if (typeof revealStep.p === 'number') setPageIdx(revealStep.p)
  }, [guided, revealStep, albums, loadPages])

  useEffect(() => {
    if (guided || !albums.length) return
    sendRevealStep?.({ a: albums[albumIdx]?.book, p: pageIdx })
  }, [guided, albumIdx, pageIdx, albums, sendRevealStep])

  const next = useCallback(() => {
    if (!album) return
    if (pageIdx < album.pages.length - 1) setPageIdx((i) => i + 1)
    else if (albumIdx < albums.length - 1) { setAlbumIdx((i) => i + 1); setPageIdx(0) }
  }, [album, pageIdx, albumIdx, albums.length])

  // Autoplay (hôte uniquement) : avance toutes les 3.2s.
  useEffect(() => {
    if (guided || !autoplay || finished || !album) return
    const t = setTimeout(next, 3200)
    return () => clearTimeout(t)
  }, [guided, autoplay, finished, album, next])

  const share = async () => {
    if (!album) return
    setSharing(true)
    try {
      const url = await renderAlbumPng(album, players)
      const a = document.createElement('a')
      a.href = url; a.download = `brams-phone-${room.code}-album${albumIdx + 1}.png`
      a.click()
      if (navigator.share && navigator.canShare) {
        const blob = await (await fetch(url)).blob()
        const file = new File([blob], a.download, { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'Brams Phone' }).catch(() => {})
      }
    } catch {}
    setSharing(false)
  }

  if (!pages) {
    return <div style={{ ...panel, padding: 30, maxWidth: 760, margin: '0 auto' }}><Waiting label="Reconstruction des albums…" /></div>
  }
  if (!albums.length) {
    return <div style={{ ...panel, padding: 30, maxWidth: 760, margin: '0 auto', textAlign: 'center', color: C.textMut }}>Aucun album à révéler.</div>
  }

  const kind = page?.page_index === 0 ? 'Phrase de départ' : page?.type === 'drawing' ? 'Dessin' : 'Description'
  const startAuthor = authorName(album?.pages[0])
  const endAuthor = authorName(album?.pages[album.pages.length - 1])

  return (
    <div style={{ width: 'min(880px, 100%)', margin: '0 auto', display: 'grid', gap: 18 }}>
      <style>{KEYFRAMES}</style>
      <style>{`
        @keyframes bpReact { 0%{opacity:0;transform:translate(-50%,0) scale(.5)} 12%{opacity:1} 100%{opacity:0;transform:translate(-50%,-300px) scale(1.15) rotate(8deg)} }
        @keyframes bpGoldFlash { 0%{opacity:.55} 100%{opacity:0} }
        @keyframes bp-podium-grow { from{transform:scaleX(0)} to{transform:scaleX(1)} }
        @media (prefers-reduced-motion: reduce) { [data-bp-anim]{animation:none !important} }
      `}</style>

      {/* Header album */}
      <div style={{ ...panel, padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ ...type.eyebrow, color: C.gold, marginBottom: 6 }}>Le grand dévoilement</div>
          <div style={{ ...type.h2, color: C.parchment }}>Carnet de {startAuthor}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {(reactCounts[albumIdx] || 0) > 0 && (
            <span data-bp-anim title="Réactions sur ce carnet" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999,
              ...type.small, color: C.parchment, fontWeight: 800,
              background: alpha(C.gold, 0.12), border: `1px solid ${alpha(C.gold, 0.32)}`,
              animation: 'bp-ready-pop .3s cubic-bezier(.2,1.3,.3,1)',
            }}>
              💛 {reactCounts[albumIdx]}
            </span>
          )}
          <span style={{ ...type.small, color: C.textMut }}>Album {albumIdx + 1}/{albums.length} · page {pageIdx + 1}/{album?.pages.length}</span>
          {!guided && <Btn variant="ghost" onClick={() => setAutoplay((a) => !a)} style={{ minHeight: 40, padding: '0 14px' }}>{autoplay ? '⏸ Auto' : '▶ Auto'}</Btn>}
        </div>
      </div>

      {/* Scène */}
      <div style={{ ...panel, padding: 'clamp(18px,3vw,28px)', minHeight: 320 }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(540px 220px at 50% 0%, ${alpha(C.sea, 0.12)}, transparent 64%)` }} />
        {/* flash doré façon flashback à chaque page */}
        <div key={`flash-${albumIdx}-${pageIdx}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: lastPageOfAlbum ? `radial-gradient(70% 70% at 50% 45%, ${alpha(C.goldSoft, 1)}, transparent 72%)` : `radial-gradient(60% 60% at 50% 45%, ${alpha(C.goldSoft, 0.9)}, transparent 70%)`, mixBlendMode: 'screen', animation: lastPageOfAlbum ? 'bpGoldFlash .8s ease-out forwards' : 'bpGoldFlash .5s ease-out forwards' }} />
        {/* Build-up "PUNCHLINE" : court mot doré qui surgit juste avant la page finale du carnet */}
        {climax && (
          <div key={`buildup-${albumIdx}`} data-bp-anim aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 4, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <div className="bp-buildup" style={{
              animation: 'bp-buildup .9s cubic-bezier(.2,.9,.2,1) forwards',
              fontFamily: fonts.display, fontWeight: 900, letterSpacing: '0.08em',
              fontSize: 'clamp(1.6rem,5vw,3rem)', color: C.goldSoft,
              textShadow: `0 0 40px ${alpha(C.gold, 0.7)}, 0 6px 30px ${alpha(C.bgDeep, 0.9)}`,
            }}>PUNCHLINE</div>
          </div>
        )}
        <div key={`${albumIdx}-${pageIdx}`} style={{ position: 'relative', ...(lastPageOfAlbum ? { boxShadow: `0 0 0 1px ${alpha(C.gold, 0.4)}, 0 0 40px ${alpha(C.gold, 0.18)}`, borderRadius: 16 } : {}) }}>
          <PageCard page={page} players={players} kind={kind} climax={climax} />
        </div>
        {/* progression dans l'album */}
        <div style={{ display: 'flex', gap: 5, marginTop: 18, position: 'relative' }}>
          {album?.pages.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= pageIdx ? C.gold : 'rgba(255,255,255,0.1)', transition: 'background .3s' }} />
          ))}
        </div>
        {/* réactions flottantes (overlay) */}
        <div ref={fxRef} aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 3 }} />
        {/* explosion de particules dorées (fin de carnet) */}
        <div ref={burstRef} aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 5 }} />
      </div>

      {/* Barre de réactions (tout le monde) */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {REACTIONS.map((e) => (
          <button key={e} onClick={() => react(e)} aria-label={`Réagir ${e}`} style={{
            width: 46, height: 46, borderRadius: 13, fontSize: 22, cursor: 'pointer',
            border: `1px solid ${C.hairSoft}`, background: 'rgba(255,255,255,0.04)',
            transition: 'transform .12s ease, border-color .12s ease',
          }}
            onMouseEnter={(ev) => { ev.currentTarget.style.transform = 'translateY(-3px) scale(1.08)'; ev.currentTarget.style.borderColor = alpha(C.gold, 0.5) }}
            onMouseLeave={(ev) => { ev.currentTarget.style.transform = 'none'; ev.currentTarget.style.borderColor = C.hairSoft }}
          >{e}</button>
        ))}
      </div>

      {/* Récap fin d'album */}
      {lastPageOfAlbum && !finished && (
        <div style={{ ...panel, padding: '14px 20px', textAlign: 'center', ...type.body, color: C.textMut }}>
          🎬 Ce carnet a dérivé de <strong style={{ color: C.parchment }}>{startAuthor}</strong> à <strong style={{ color: C.parchment }}>{endAuthor}</strong>.
        </div>
      )}

      {/* Contrôles */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Btn variant="ghost" onClick={share} disabled={sharing}>{sharing ? 'Génération…' : '📥 Partager cet album'}</Btn>
        <div style={{ display: 'flex', gap: 10 }}>
          {guided ? (
            !finished && <span style={{ ...type.small, color: C.textMut, alignSelf: 'center' }}>🎙️ Le capitaine pilote le dévoilement.</span>
          ) : !finished ? (
            <Btn variant="gold" onClick={() => { setAutoplay(false); next() }}>{lastPageOfAlbum ? 'Album suivant →' : 'Suivant →'}</Btn>
          ) : (
            <Btn variant="gold" onClick={onReplay}>Rejouer une partie</Btn>
          )}
        </div>
      </div>

      {/* ── Coup de cœur : vote pour le meilleur carnet (fin du dévoilement) ─── */}
      {finished && (
        <div data-bp-anim style={{ ...panel, padding: 'clamp(18px,3vw,26px)', animation: 'bp-ready-pop .4s cubic-bezier(.2,1,.3,1)' }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ ...type.eyebrow, color: C.gold, marginBottom: 6 }}>Coup de cœur</div>
            <div style={{ ...type.h2, color: C.parchment }}>🏆 Album le plus aimé</div>
            <div style={{ ...type.small, color: C.textMut, marginTop: 4 }}>
              {totalVotes > 0
                ? `${totalVotes} vote${totalVotes > 1 ? 's' : ''} · ${myVote == null ? 'à toi de choisir' : 'tu peux changer d\'avis'}`
                : 'Vote pour ton carnet préféré'}
            </div>
          </div>

          {/* Bulletins : un bouton par carnet (auteur de départ) */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: voteTally.length ? 20 : 0 }}>
            {albums.map((a) => {
              const mine = myVote === a.book
              return (
                <button key={a.book} onClick={() => voteFor(a.book)}
                  aria-pressed={mine} aria-label={`Voter pour le carnet de ${authorName(a.pages[0])}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
                    padding: '8px 14px', borderRadius: 999, ...type.small, fontWeight: 800,
                    color: mine ? C.bgDeep : C.parchment,
                    background: mine ? C.gold : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${mine ? C.gold : C.hairSoft}`,
                    transition: 'transform .12s ease, border-color .12s ease, background .15s ease',
                  }}
                  onMouseEnter={(ev) => { if (!mine) { ev.currentTarget.style.transform = 'translateY(-2px)'; ev.currentTarget.style.borderColor = alpha(C.gold, 0.5) } }}
                  onMouseLeave={(ev) => { ev.currentTarget.style.transform = 'none'; if (!mine) ev.currentTarget.style.borderColor = C.hairSoft }}
                >
                  {mine ? '💛' : '🤍'} {authorName(a.pages[0])}
                </button>
              )
            })}
          </div>

          {/* Podium : carnets triés par cœurs reçus */}
          {totalVotes > 0 && (
            <div style={{ display: 'grid', gap: 8, maxWidth: 520, margin: '0 auto' }}>
              {voteTally.filter((r) => r.count > 0).slice(0, 3).map((r, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'
                const leader = i === 0 && r.count === topCount
                const pct = topCount > 0 ? Math.round((r.count / topCount) * 100) : 0
                return (
                  <div key={r.book} data-bp-anim style={{
                    position: 'relative', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderRadius: 14,
                    background: leader ? alpha(C.gold, 0.1) : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${leader ? alpha(C.gold, 0.4) : C.hair}`,
                    animation: `bp-ready-pop .35s cubic-bezier(.2,1.1,.3,1) ${i * 0.07}s both`,
                  }}>
                    {/* jauge proportionnelle au leader (fond) */}
                    <div aria-hidden style={{
                      position: 'absolute', inset: 0, width: `${pct}%`,
                      background: `linear-gradient(90deg, ${alpha(C.gold, leader ? 0.18 : 0.08)}, transparent)`,
                      transformOrigin: 'left', animation: 'bp-podium-grow .6s cubic-bezier(.2,.9,.3,1) both',
                    }} />
                    <span style={{ fontSize: 22, position: 'relative' }}>{medal}</span>
                    <span style={{ ...type.body, color: leader ? C.parchment : C.text, fontWeight: leader ? 900 : 700, position: 'relative', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Carnet de {r.author}
                    </span>
                    <span style={{ ...type.small, color: leader ? C.gold : C.textMut, fontWeight: 800, position: 'relative' }}>
                      {r.count} 💛
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {finished && (
        <div style={{ ...panel, padding: 22, textAlign: 'center', background: GRAD.sea, color: '#eafaff', border: 'none' }}>
          <div style={{ fontSize: 34, marginBottom: 6 }}>🏴‍☠️</div>
          <div style={{ ...type.h2, color: '#fff' }}>Fin de l'aventure !</div>
          <div style={{ ...type.body, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Partage tes albums préférés sur le Discord.</div>
          {guided && <div style={{ ...type.small, color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>Le capitaine peut relancer une partie.</div>}
        </div>
      )}
    </div>
  )
}
