// Freydiss Phone : upload du dessin (canvas → PNG → R2). Réutilise le flux presign
// de TierListPage (/api/r2-presign). ⚠️ Exige un compte connecté (token) — les
// invités peuvent jouer les phases texte mais pas uploader un dessin.
import { getAccessToken } from './supabaseRest.js'

function canvasToPngBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}

export async function uploadDrawing(canvas, roomCode) {
  const blob = await canvasToPngBlob(canvas)
  if (!blob) throw new Error('canvas vide')
  const token = await getAccessToken()
  if (!token) { const e = new Error('login_required'); e.code = 'login_required'; throw e }

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
}
