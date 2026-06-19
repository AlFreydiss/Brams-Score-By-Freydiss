// Brams Phone — REVEAL. Albums reconstruits, lecture cinématique page par page
// (flip + flash doré), auteur + n° de page. L'HÔTE pilote (broadcast reveal_step) →
// tout le monde voit la même page ; autoplay réglable. Réactions emojis flottantes
// broadcastées à tous (canal room). Carte récap finale partageable (canvas → PNG).
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { type, fonts } from '../../styles/typography.js'
import { C, GRAD, alpha, panel, KEYFRAMES } from './theme.js'
import { Btn, Waiting } from './ui.jsx'
import { buildAlbums } from './logic/rotation.js'

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

function PageCard({ page, players, kind }) {
  return (
    <div data-bp-anim style={{ animation: 'bp-bookflip .6s cubic-bezier(.22,.8,.22,1)' }}>
      <div style={{ ...type.eyebrow, color: C.gold, marginBottom: 10 }}>
        {kind} · {authorName(page)}
      </div>
      {page?.type === 'drawing' ? (
        page.content ? (
          <img src={page.content} alt="" style={{ display: 'block', width: '100%', maxHeight: 460, objectFit: 'contain', borderRadius: 14, border: `1px solid ${C.hairTop}`, background: '#fff' }} />
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

export default function Reveal({ room, players, n, isHost, allPages, onReplay,
  revealStep, sendRevealStep, sendReaction, onReaction }) {
  const [pages, setPages] = useState(null)
  const [albumIdx, setAlbumIdx] = useState(0)
  const [pageIdx, setPageIdx] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const [sharing, setSharing] = useState(false)
  const guided = !isHost // l'invité suit le dévoilement piloté par l'hôte
  const fxRef = useRef(null)

  const loadPages = useCallback(() => { allPages().then((p) => setPages(p || [])).catch(() => {}) }, [allPages])
  useEffect(() => { let alive = true; allPages().then((p) => { if (alive) setPages(p || []) }).catch(() => {}); return () => { alive = false } }, [allPages])

  const albums = useMemo(() => pages ? buildAlbums(pages, n).filter((a) => a.pages.length) : [], [pages, n])
  const album = albums[albumIdx] || null
  const page = album?.pages[pageIdx] || null
  const lastPageOfAlbum = album && pageIdx >= album.pages.length - 1
  const lastAlbum = albumIdx >= albums.length - 1
  const finished = lastAlbum && lastPageOfAlbum

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

  useEffect(() => {
    if (!onReaction) return
    return onReaction((p) => spawn(p?.emoji))
  }, [onReaction, spawn])

  const react = (emoji) => { sendReaction?.(emoji); spawn(emoji) }

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
      `}</style>

      {/* Header album */}
      <div style={{ ...panel, padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ ...type.eyebrow, color: C.gold, marginBottom: 6 }}>Le grand dévoilement</div>
          <div style={{ ...type.h2, color: C.parchment }}>Carnet de {startAuthor}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ ...type.small, color: C.textMut }}>Album {albumIdx + 1}/{albums.length} · page {pageIdx + 1}/{album?.pages.length}</span>
          {!guided && <Btn variant="ghost" onClick={() => setAutoplay((a) => !a)} style={{ minHeight: 40, padding: '0 14px' }}>{autoplay ? '⏸ Auto' : '▶ Auto'}</Btn>}
        </div>
      </div>

      {/* Scène */}
      <div style={{ ...panel, padding: 'clamp(18px,3vw,28px)', minHeight: 320 }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(540px 220px at 50% 0%, ${alpha(C.sea, 0.12)}, transparent 64%)` }} />
        {/* flash doré façon flashback à chaque page */}
        <div key={`flash-${albumIdx}-${pageIdx}`} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(60% 60% at 50% 45%, ${alpha(C.goldSoft, 0.9)}, transparent 70%)`, mixBlendMode: 'screen', animation: 'bpGoldFlash .5s ease-out forwards' }} />
        <div key={`${albumIdx}-${pageIdx}`} style={{ position: 'relative' }}>
          <PageCard page={page} players={players} kind={kind} />
        </div>
        {/* progression dans l'album */}
        <div style={{ display: 'flex', gap: 5, marginTop: 18, position: 'relative' }}>
          {album?.pages.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= pageIdx ? C.gold : 'rgba(255,255,255,0.1)', transition: 'background .3s' }} />
          ))}
        </div>
        {/* réactions flottantes (overlay) */}
        <div ref={fxRef} aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 3 }} />
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
