// Freydiss Phone : upload du dessin. Chemin nominal = canvas → PNG → R2 (presign,
// réutilise /api/r2-presign de TierListPage, exige un compte connecté). FALLBACK
// universel = image compressée inline (data URL JPEG) pour que le dessin s'affiche
// TOUJOURS, même pour un invité non connecté ou si R2 est indisponible. Avant, les
// invités ne pouvaient pas uploader → leur dessin manquait au reveal/à la description.
import { getAccessToken } from './supabaseRest.js'

function canvasToPngBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}

// Image compressée inline : downscale (≤720 px de large) + JPEG qualité 0.72 sur fond
// blanc → ~40-90 ko, transportable dans content (text) sans R2.
function compressedDataUrl(canvas) {
  const maxW = 720
  const scale = Math.min(1, maxW / canvas.width)
  const w = Math.max(1, Math.round(canvas.width * scale))
  const h = Math.max(1, Math.round(canvas.height * scale))
  const oc = document.createElement('canvas')
  oc.width = w; oc.height = h
  const cx = oc.getContext('2d')
  cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, w, h)
  cx.drawImage(canvas, 0, 0, w, h)
  return oc.toDataURL('image/jpeg', 0.72)
}

async function tryR2(canvas, roomCode, token) {
  const blob = await canvasToPngBlob(canvas)
  if (!blob) return null
  // 2 tentatives : un glitch réseau / 5xx transitoire ne doit pas perdre le dessin.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const filename = `gartic-${String(roomCode).toLowerCase()}-${crypto.randomUUID().slice(0, 12)}.png`
      const presign = await fetch('/api/r2-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filename, contentType: 'image/png', size: blob.size }),
      })
      const info = await presign.json().catch(() => ({}))
      if (!presign.ok) throw new Error(info.error || `presign ${presign.status}`)
      if (!info.uploadUrl || !info.publicUrl) throw new Error('presign incomplet')
      const put = await fetch(info.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: blob })
      if (!put.ok) throw new Error(`upload R2 ${put.status}`)
      return info.publicUrl
    } catch {
      // retry une fois, puis on bascule sur le fallback inline
    }
  }
  return null
}

export async function uploadDrawing(canvas, roomCode) {
  const token = await getAccessToken().catch(() => null)
  if (token) {
    const url = await tryR2(canvas, roomCode, token)
    if (url) return url
  }
  // Invité non connecté OU R2 indisponible → image inline (toujours affichable).
  return compressedDataUrl(canvas)
}
