// Guess Who — formats audio (logique PURE, testée sous Node).
export function baseMime(mime) {
  return String(mime || '').split(';')[0].trim() || 'audio/webm'
}

const CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
export function pickRecorderMime(isSupported) {
  for (const m of CANDIDATES) {
    try { if (isSupported(m)) return m } catch { /* implémentation partielle */ }
  }
  return ''
}

// Repli inline (invité ou R2 indisponible) : base64 par blocs, plafonné.
export async function blobToDataUrl(blob, maxChars = 200000) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const prefix = `data:${baseMime(blob.type)};base64,`
  if (prefix.length + Math.ceil(bytes.length / 3) * 4 > maxChars) return null
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return prefix + btoa(bin)
}
