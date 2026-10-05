import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

// Vue « Tableau » : tout le bracket, un tour par colonne.
// Gagnant en clair, perdant estompé et barré, duel en cours encadré.

function roundName(size) {
  if (size === 2) return 'Finale'
  if (size === 4) return 'Demies'
  if (size === 8) return 'Quarts'
  if (size === 16) return 'Huitièmes'
  return `Tour de ${size}`
}

function Entry({ p, state }) {
  if (!p) return <div className="vb-entry is-tbd"><span className="vb-thumb" /><span className="vb-name">À venir</span></div>
  return (
    <div className={`vb-entry ${state}`}>
      <img className="vb-thumb" src={p.img} alt="" loading="lazy" />
      <span className="vb-name">{p.title}</span>
    </div>
  )
}

export default function Bracket({ rounds, currentId, onClose }) {
  const currentRef = useRef(null)
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', inline: 'center' })
    const onKey = e => { if (e.key === 'Escape' || e.key === 't' || e.key === 'T') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div className="vb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="vb-box" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }} onClick={e => e.stopPropagation()}>
        <div className="vb-head">
          <h2>Tableau</h2>
          <button type="button" onClick={onClose}>Fermer</button>
        </div>
        <div className="vb-scroll">
          <div className="vb-grid">
          {rounds.map(round => (
            <section key={round.id} className="vb-col">
              <h3>{roundName(round.size)}</h3>
              <div className="vb-matches">
                {round.matches.filter(m => m.left || m.right || round.size < rounds[0].size).map(m => {
                  const done = m.status === 'closed' && m.winnerId
                  const st = side => !done ? '' : (m[side]?.id === m.winnerId ? 'is-win' : 'is-lose')
                  const now = m.id === currentId
                  return (
                    <div key={m.id} ref={now ? currentRef : null} className={`vb-match ${now ? 'is-now' : ''}`}>
                      <Entry p={m.left} state={st('left')} />
                      <Entry p={m.right} state={st('right')} />
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Image de partage ───────────────────────────────────────────────────────
// Carte 1200×675 du top 4, dessinée dans un canvas puis téléchargée en PNG.
const loadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src })

function drawFit(ctx, img, x, y, w, h, mode = 'contain') {
  if (!img) return
  const s = mode === 'cover' ? Math.max(w / img.width, h / img.height) : Math.min(w / img.width, h / img.height)
  const iw = img.width * s, ih = img.height * s
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip()
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih)
  ctx.restore()
}

function ellipsis(ctx, text, max) {
  if (ctx.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1)
  return t + '…'
}

export async function makeShareImage({ title, ranking, url }) {
  await document.fonts?.ready
  const W = 1200, H = 675
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)
  // trame de points
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  for (let y = 12; y < H; y += 18) for (let x = 12; x < W; x += 18) { ctx.beginPath(); ctx.arc(x, y, 1, 0, 6.283); ctx.fill() }

  const imgs = await Promise.all(ranking.slice(0, 4).map(r => loadImg(r.p.img)))
  // champion
  const cx = 48, cy = 96, cw = 640, ch = 500
  ctx.fillStyle = '#060606'; ctx.fillRect(cx, cy, cw, ch)
  drawFit(ctx, imgs[0], cx, cy, cw, ch)
  ctx.strokeStyle = '#ececec'; ctx.lineWidth = 2; ctx.strokeRect(cx + 1, cy + 1, cw - 2, ch - 2)

  ctx.fillStyle = '#7c7e85'; ctx.font = '500 20px Inter, sans-serif'
  ctx.fillText(`Mon top · ${title}`, 48, 62)
  ctx.textAlign = 'right'; ctx.fillText(url.replace(/^https?:\/\//, ''), W - 48, 62); ctx.textAlign = 'left'

  ctx.fillStyle = '#ececec'; ctx.font = '800 30px Archivo, Inter, sans-serif'
  ctx.fillText(ellipsis(ctx, ranking[0].p.title, cw - 20), cx, cy + ch + 36)
  ctx.fillStyle = '#7c7e85'; ctx.font = '500 17px Inter, sans-serif'
  ctx.fillText(ellipsis(ctx, `Champion · ${ranking[0].p.subtitle}`, cw), cx, cy + ch + 60)

  // 2 → 4
  const lx = 720, lw = W - lx - 48, rowH = 160
  ranking.slice(1, 4).forEach((r, i) => {
    const y = cy + i * (rowH + 10)
    ctx.fillStyle = '#060606'; ctx.fillRect(lx, y, 190, rowH)
    drawFit(ctx, imgs[i + 1], lx, y, 190, rowH, 'cover')
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1; ctx.strokeRect(lx + 0.5, y + 0.5, 189, rowH - 1)
    ctx.fillStyle = '#7c7e85'; ctx.font = '600 15px Inter, sans-serif'
    ctx.fillText(`${i + 2}`, lx + 210, y + 30)
    ctx.fillStyle = '#ececec'; ctx.font = '700 21px Archivo, Inter, sans-serif'
    ctx.fillText(ellipsis(ctx, r.p.title, lw - 210), lx + 210, y + 62)
    ctx.fillStyle = '#7c7e85'; ctx.font = '500 15px Inter, sans-serif'
    ctx.fillText(ellipsis(ctx, r.p.subtitle, lw - 210), lx + 210, y + 88)
  })

  return new Promise(res => c.toBlob(res, 'image/png'))
}
