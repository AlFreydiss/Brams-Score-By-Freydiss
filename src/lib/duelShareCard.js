// Carte partageable de l'Arène du jour.
//
// generateShareCard() (shareCardGenerator.js) est verrouillé sur la mise en page
// du Wrapped : avatar, pseudo, heures de vocal. Le duel du jour n'a rien de tout
// ça. On dessine donc notre propre carte, mais on réutilise shareCanvas() pour
// la sortie — c'est lui qui gère l'API de partage native quand elle existe et
// retombe sur un téléchargement sinon.

const W = 1080, H = 1080
const PINK = '#e85aa0'
const PURPLE = '#9d5aff'

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Coupe au caractère près : les titres d'openings sont parfois très longs et
// déborderaient de la carte.
function fit(ctx, text, maxWidth) {
  let s = String(text || '')
  if (ctx.measureText(s).width <= maxWidth) return s
  while (s.length > 1 && ctx.measureText(s + '…').width > maxWidth) s = s.slice(0, -1)
  return s + '…'
}

export async function drawDuelCard({ dateLabel, verdict, picks, streak }) {
  // Sans ça, le premier rendu utilise la police de secours : les polices du site
  // ne sont pas forcément prêtes au moment du clic.
  if (document.fonts?.ready) { try { await document.fonts.ready } catch {} }

  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // Fond : nuit + deux auras, comme l'arène du site.
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0d0614'); bg.addColorStop(0.55, '#090410'); bg.addColorStop(1, '#050308')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

  const auraA = ctx.createRadialGradient(W * 0.2, H * 0.1, 40, W * 0.2, H * 0.1, W * 0.75)
  auraA.addColorStop(0, 'rgba(232,90,160,.30)'); auraA.addColorStop(1, 'transparent')
  ctx.fillStyle = auraA; ctx.fillRect(0, 0, W, H)
  const auraB = ctx.createRadialGradient(W * 0.85, H * 0.2, 40, W * 0.85, H * 0.2, W * 0.7)
  auraB.addColorStop(0, 'rgba(157,90,255,.26)'); auraB.addColorStop(1, 'transparent')
  ctx.fillStyle = auraB; ctx.fillRect(0, 0, W, H)

  // Sol en perspective : lignes qui convergent vers l'horizon.
  ctx.save()
  ctx.strokeStyle = 'rgba(232,90,160,.20)'
  ctx.lineWidth = 2
  // Sous la cinquième ligne : plus haut, la perspective traversait le dernier
  // titre et le rendait moins lisible.
  const horizon = H * 0.80
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath()
    ctx.moveTo(W / 2 + i * 26, horizon)
    ctx.lineTo(W / 2 + i * 190, H)
    ctx.stroke()
  }
  for (let i = 1; i <= 7; i++) {
    const y = horizon + Math.pow(i / 7, 2.2) * (H - horizon)
    ctx.globalAlpha = 0.5 - i * 0.05
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }
  ctx.restore()

  // Ligne d'horizon
  const hz = ctx.createLinearGradient(0, 0, W, 0)
  hz.addColorStop(0, 'transparent'); hz.addColorStop(0.35, PINK)
  hz.addColorStop(0.65, PURPLE); hz.addColorStop(1, 'transparent')
  ctx.fillStyle = hz; ctx.fillRect(0, horizon - 1, W, 3)

  // Cadre
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(232,90,160,.45)'
  roundRect(ctx, 34, 34, W - 68, H - 68, 34); ctx.stroke()

  const cx = W / 2
  ctx.textAlign = 'center'

  // En-tête
  ctx.fillStyle = 'rgba(255,255,255,.45)'
  ctx.font = "800 26px 'Inter', system-ui, sans-serif"
  ctx.fillText('⚡ ARÈNE DU JOUR  ·  ' + String(dateLabel || '').toUpperCase(), cx, 130)

  // Verdict
  const grad = ctx.createLinearGradient(cx - 320, 0, cx + 320, 0)
  grad.addColorStop(0, '#f9a8d4'); grad.addColorStop(0.5, PINK); grad.addColorStop(1, PURPLE)
  ctx.fillStyle = grad
  ctx.font = "900 92px 'Pirata One', 'Inter', system-ui, sans-serif"
  ctx.fillText(fit(ctx, verdict || 'Tes 5 verdicts', W - 160), cx, 248)

  // Les cinq gagnants
  const rows = (picks || []).slice(0, 5)
  const top = 330
  const rowH = 108
  ctx.textAlign = 'left'
  rows.forEach((p, i) => {
    const y = top + i * rowH
    const color = p.color || PINK

    roundRect(ctx, 90, y, W - 180, 88, 18)
    ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fill()
    ctx.lineWidth = 2; ctx.strokeStyle = color + '55'; ctx.stroke()

    // Pastille de rang
    ctx.beginPath(); ctx.arc(140, y + 44, 20, 0, Math.PI * 2)
    ctx.fillStyle = color + '33'; ctx.fill()
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke()
    ctx.textAlign = 'center'
    ctx.fillStyle = '#fff'
    ctx.font = "800 22px 'Inter', system-ui, sans-serif"
    ctx.fillText(String(i + 1), 140, y + 52)

    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(255,255,255,.95)'
    ctx.font = "700 33px 'Inter', system-ui, sans-serif"
    ctx.fillText(fit(ctx, p.title, W - 380), 184, y + 40)

    ctx.fillStyle = 'rgba(255,255,255,.42)'
    ctx.font = "500 23px 'Inter', system-ui, sans-serif"
    ctx.fillText(fit(ctx, p.anime, W - 380), 184, y + 72)
  })

  // Pied de carte
  ctx.textAlign = 'center'
  if (streak > 0) {
    ctx.fillStyle = '#fbbf24'
    ctx.font = "800 27px 'Inter', system-ui, sans-serif"
    ctx.fillText('🔥 ' + streak + ' jour' + (streak > 1 ? 's' : '') + ' d’affilée', cx, H - 132)
  }
  ctx.fillStyle = 'rgba(255,255,255,.5)'
  ctx.font = "700 26px 'Inter', system-ui, sans-serif"
  ctx.fillText('brams.community/tournoi', cx, H - 78)

  return canvas
}
