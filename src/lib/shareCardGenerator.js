// ── shareCardGenerator — cartes PNG Wrapped/Flashback (canvas natif, zéro lib) ─
// Deux formats : '916' (1080×1920, stories) et '11' (1080×1080, X/Discord).
// Module partagé entre le Wrapped et le Flashback (carte souvenir).

const GOLD = '#F5D97B'
const GOLD_DEEP = '#BFA46A'

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'   // CDN Discord/R2 envoient ACAO:* — sinon fallback initiales
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function drawNoise(ctx, w, h) {
  // grain léger : points aléatoires clairsemés (suffisant à l'échelle 1080)
  ctx.save()
  ctx.globalAlpha = 0.05
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000'
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2)
  }
  ctx.restore()
}

function drawAvatar(ctx, img, name, cx, cy, r) {
  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath()
  ctx.fillStyle = '#101a2e'; ctx.fill()
  ctx.clip()
  if (img) ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2)
  else {
    ctx.fillStyle = GOLD
    ctx.font = `800 ${Math.round(r * 0.7)}px 'Bricolage Grotesque', 'Inter', sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText((name || '?').slice(0, 2).toUpperCase(), cx, cy + r * 0.05)
  }
  ctx.restore()
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.lineWidth = Math.max(6, r * 0.07); ctx.strokeStyle = GOLD; ctx.stroke()
}

/**
 * data : { username, avatar_url, period_label, hours, binome:{username}, percentile, rank, prime:{end} }
 * format : '916' | '11'
 * variant : 'wrapped' | 'flashback' (flashback = carte souvenir « 1 AN SUR GRAND LINE »)
 */
export async function generateShareCard(data, format = '916', variant = 'wrapped') {
  const W = 1080, H = format === '916' ? 1920 : 1080
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // Fond nuit en mer
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0A1A33'); bg.addColorStop(0.55, '#06101F'); bg.addColorStop(1, '#040A14')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  const halo = ctx.createRadialGradient(W / 2, H * 0.28, 60, W / 2, H * 0.28, W * 0.8)
  halo.addColorStop(0, 'rgba(245,217,123,0.12)'); halo.addColorStop(1, 'transparent')
  ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H)
  drawNoise(ctx, W, H)

  // Cadre doré
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(245,217,123,.55)'
  roundRect(ctx, 36, 36, W - 72, H - 72, 36); ctx.stroke()

  const cx = W / 2
  let y = format === '916' ? 250 : 150

  // En-tête
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(245,217,123,.85)'
  ctx.font = "800 34px 'Bricolage Grotesque', 'Inter', sans-serif"
  ctx.fillText(variant === 'flashback' ? '— FLASHBACK —' : `BRAMS WRAPPED · ${(data.period_label || '').toUpperCase()}`, cx, y)
  y += format === '916' ? 130 : 100

  // Avatar
  const img = await loadImage(data.avatar_url)
  const avR = format === '916' ? 140 : 110
  drawAvatar(ctx, img, data.username, cx, y + avR, avR)
  y += avR * 2 + 80

  // Pseudo
  ctx.fillStyle = '#fff'
  ctx.font = "italic 800 76px 'Bricolage Grotesque', 'Inter', sans-serif"
  ctx.fillText(String(data.username || '').slice(0, 18), cx, y)
  y += 64

  if (variant === 'flashback') {
    ctx.fillStyle = GOLD
    ctx.font = "800 52px 'Bricolage Grotesque', 'Inter', sans-serif"
    ctx.fillText('1 AN SUR GRAND LINE', cx, y + 40)
    y += 130
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.55)'
    ctx.font = "700 32px 'Inter', sans-serif"
    ctx.fillText(data.rank ? `Rang : ${data.rank}` : ' ', cx, y)
    y += format === '916' ? 110 : 80
  }

  // Stats (cartes 2×2)
  const stats = [
    ['⏱', `${Math.round(data.hours || 0)}h`, 'EN VOCAL'],
    ['🤝', (data.binome?.username || '—').slice(0, 10), 'BINÔME'],
    ['🏆', data.percentile != null ? `TOP ${data.percentile}%` : '—', 'DES PIRATES'],
    ['฿', data.prime?.end != null ? (data.prime.end >= 1e6 ? `${(data.prime.end / 1e6).toFixed(1)}M` : String(data.prime.end)) : '—', 'DE PRIME'],
  ]
  const cardW = (W - 72 * 2 - 24) / 2, cardH = format === '916' ? 220 : 190
  stats.forEach(([ic, v, l], i) => {
    const x = 72 + (i % 2) * (cardW + 24)
    const yy = y + Math.floor(i / 2) * (cardH + 24)
    ctx.fillStyle = 'rgba(255,255,255,.05)'
    roundRect(ctx, x, yy, cardW, cardH, 26); ctx.fill()
    ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(245,217,123,.35)'; ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,.85)'
    ctx.font = "48px 'Inter', sans-serif"
    ctx.fillText(ic, x + cardW / 2, yy + 66)
    ctx.fillStyle = GOLD
    ctx.font = "800 56px 'Bricolage Grotesque', 'Inter', sans-serif"
    ctx.fillText(String(v), x + cardW / 2, yy + 136)
    ctx.fillStyle = 'rgba(255,255,255,.5)'
    ctx.font = "700 24px 'Inter', sans-serif"
    ctx.fillText(l, x + cardW / 2, yy + 178)
  })
  y += cardH * 2 + 24

  // Footer marque (le KPI viralité : logo + URL bien visibles)
  const fy = H - (format === '916' ? 170 : 120)
  ctx.fillStyle = GOLD_DEEP
  ctx.font = "800 40px 'Bricolage Grotesque', 'Inter', sans-serif"
  ctx.fillText('🏴‍☠️ BRAMS COMMUNITY', cx, fy)
  ctx.fillStyle = 'rgba(255,255,255,.7)'
  ctx.font = "700 30px 'Inter', sans-serif"
  ctx.fillText('brams.community', cx, fy + 46)

  return canvas
}

export async function shareCanvas(canvas, filename = 'brams-wrapped.png') {
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
  if (!blob) return false
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Mon Brams Wrapped 🏴‍☠️' }); return true } catch { /* annulé */ }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return true
}
