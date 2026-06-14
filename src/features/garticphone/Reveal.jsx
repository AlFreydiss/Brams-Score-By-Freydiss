// Brams Phone — REVEAL. Reconstruit les albums, lecture cinématique page par page
// (transitions flashback), nom de l'auteur par page. L'hôte avance / autoplay.
// Carte récap finale partageable : album rendu sur canvas offscreen → PNG.
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { type, fonts } from '../../styles/typography.js'
import { C, GRAD, alpha, panel, KEYFRAMES } from './theme.js'
import { Btn, Waiting } from './ui.jsx'
import { buildAlbums } from './logic/rotation.js'

function authorName(players, userId) {
  const p = players.find((x) => String(x.user_id) === String(userId))
  return p?.display_name || 'Inconnu'
}

// Rendu d'un album entier sur un canvas offscreen → dataURL PNG (partage Discord).
async function renderAlbumPng(album, players) {
  const cards = album.pages
  const cw = 760, pad = 28, gap = 18
  // pré-charge les images de dessin
  const imgs = {}
  await Promise.all(cards.filter((c) => c.type === 'drawing' && c.content).map((c) => new Promise((res) => {
    const im = new Image(); im.crossOrigin = 'anonymous'
    im.onload = () => { imgs[c.content] = im; res() }
    im.onerror = () => res()
    im.src = c.content
  })))
  // hauteur dynamique
  let h = pad + 60
  const heights = cards.map((c) => {
    const ch = c.type === 'drawing' ? 380 : 86
    h += ch + gap
    return ch
  })
  h += pad
  const cv = document.createElement('canvas')
  cv.width = cw; cv.height = h
  const ctx = cv.getContext('2d')
  ctx.fillStyle = '#0a1018'; ctx.fillRect(0, 0, cw, h)
  ctx.fillStyle = '#d7a829'; ctx.font = '800 30px ' + fonts.display
  ctx.fillText('Brams Phone — Album', pad, pad + 30)
  ctx.fillStyle = 'rgba(243,239,226,0.5)'; ctx.font = '500 14px ' + fonts.body
  ctx.fillText(`Carnet de ${authorName(players, cards[0]?.author_user_id)}`, pad, pad + 52)
  let y = pad + 70
  cards.forEach((c, i) => {
    const ch = heights[i]
    ctx.fillStyle = 'rgba(231,194,90,0.85)'; ctx.font = '700 12px ' + fonts.body
    ctx.fillText(authorName(players, c.author_user_id).toUpperCase(), pad, y + 4)
    y += 14
    if (c.type === 'drawing' && imgs[c.content]) {
      const im = imgs[c.content]
      const ratio = Math.min((cw - pad * 2) / im.width, (ch - 8) / im.height)
      const dw = im.width * ratio, dh = im.height * ratio
      ctx.drawImage(im, pad, y, dw, dh)
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
        {kind} · {authorName(players, page?.author_user_id)}
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

export default function Reveal({ room, players, n, isHost, allPages, onReplay }) {
  const [pages, setPages] = useState(null)
  const [albumIdx, setAlbumIdx] = useState(0)
  const [pageIdx, setPageIdx] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    let alive = true
    allPages().then((p) => { if (alive) setPages(p || []) })
    return () => { alive = false }
  }, [allPages])

  const albums = useMemo(() => pages ? buildAlbums(pages, n).filter((a) => a.pages.length) : [], [pages, n])
  const album = albums[albumIdx] || null
  const page = album?.pages[pageIdx] || null
  const lastPageOfAlbum = album && pageIdx >= album.pages.length - 1
  const lastAlbum = albumIdx >= albums.length - 1
  const finished = lastAlbum && lastPageOfAlbum

  const next = useCallback(() => {
    if (!album) return
    if (pageIdx < album.pages.length - 1) setPageIdx((i) => i + 1)
    else if (albumIdx < albums.length - 1) { setAlbumIdx((i) => i + 1); setPageIdx(0) }
  }, [album, pageIdx, albumIdx, albums.length])

  // Autoplay : avance toutes les 3.2s.
  useEffect(() => {
    if (!autoplay || finished || !album) return
    const t = setTimeout(next, 3200)
    return () => clearTimeout(t)
  }, [autoplay, finished, album, next])

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

  return (
    <div style={{ width: 'min(880px, 100%)', margin: '0 auto', display: 'grid', gap: 18 }}>
      <style>{KEYFRAMES}</style>

      {/* Header album */}
      <div style={{ ...panel, padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ ...type.eyebrow, color: C.gold, marginBottom: 6 }}>Le grand dévoilement</div>
          <div style={{ ...type.h2, color: C.parchment }}>Carnet de {authorName(players, album?.pages[0]?.author_user_id)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ ...type.small, color: C.textMut }}>{albumIdx + 1}/{albums.length}</span>
          <Btn variant="ghost" onClick={() => setAutoplay((a) => !a)} style={{ minHeight: 40, padding: '0 14px' }}>{autoplay ? '⏸ Auto' : '▶ Auto'}</Btn>
        </div>
      </div>

      {/* Scène */}
      <div style={{ ...panel, padding: 'clamp(18px,3vw,28px)', minHeight: 320 }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(540px 220px at 50% 0%, ${alpha(C.sea, 0.12)}, transparent 64%)` }} />
        <div key={`${albumIdx}-${pageIdx}`} style={{ position: 'relative' }}>
          <PageCard page={page} players={players} kind={kind} />
        </div>
        {/* progression dans l'album */}
        <div style={{ display: 'flex', gap: 5, marginTop: 18, position: 'relative' }}>
          {album?.pages.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= pageIdx ? C.gold : 'rgba(255,255,255,0.1)', transition: 'background .3s' }} />
          ))}
        </div>
      </div>

      {/* Contrôles */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Btn variant="ghost" onClick={share} disabled={sharing}>{sharing ? 'Génération…' : '📥 Partager cet album'}</Btn>
        <div style={{ display: 'flex', gap: 10 }}>
          {!finished ? (
            <Btn variant="gold" onClick={() => { setAutoplay(false); next() }}>Suivant →</Btn>
          ) : (
            isHost
              ? <Btn variant="gold" onClick={onReplay}>Rejouer une partie</Btn>
              : <span style={{ ...type.small, color: C.textMut, alignSelf: 'center' }}>Le capitaine peut relancer.</span>
          )}
        </div>
      </div>

      {finished && (
        <div style={{ ...panel, padding: 22, textAlign: 'center', background: GRAD.sea, color: '#eafaff', border: 'none' }}>
          <div style={{ fontSize: 34, marginBottom: 6 }}>🏴‍☠️</div>
          <div style={{ ...type.h2, color: '#fff' }}>Fin de l'aventure !</div>
          <div style={{ ...type.body, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Partage tes albums préférés sur le Discord.</div>
        </div>
      )}
    </div>
  )
}
