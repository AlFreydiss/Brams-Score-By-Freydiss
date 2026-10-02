// Résumé court de l'appareil pour le journal d'erreurs (jamais l'UA complet).
const APP = /(Discord|Instagram|FBAN|FBAV|Snapchat|TikTok|Twitter)/i

export function deviceSummary(ua) {
  const s = String(ua || '')
  const device = /iPhone|iPod/.test(s) ? 'iPhone' : /iPad/.test(s) ? 'iPad' : /Android/.test(s) ? 'Android'
    : /Windows|Macintosh|Linux|CrOS/.test(s) ? 'PC' : 'Inconnu'
  const app = s.match(APP)
  let browser = 'Autre'
  if (app) browser = /FBA[NV]/i.test(app[1]) ? 'Facebook' : app[1]
  else if (/Edg\/(\d+)/.test(s)) browser = `Edge ${s.match(/Edg\/(\d+)/)[1]}`
  else if (/Firefox\/(\d+)/.test(s)) browser = `Firefox ${s.match(/Firefox\/(\d+)/)[1]}`
  else if (/Chrome\/(\d+)/.test(s)) browser = `Chrome ${s.match(/Chrome\/(\d+)/)[1]}`
  else if (/Version\/(\d+).*Safari/.test(s)) browser = `Safari ${s.match(/Version\/(\d+)/)[1]}`
  return `${device} · ${browser}`.slice(0, 80)
}
