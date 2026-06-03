/**
 * Détection automatique opening/ending par empreinte audio (chromaprint via ffmpeg).
 *
 * Principe : l'OP (et l'ED) est un segment audio IDENTIQUE entre les épisodes d'une
 * même saison. On empreinte chaque épisode (int32 ~7.9/s), on aligne chaque épisode
 * sur un épisode de référence (histogramme d'offsets), puis on trouve la plus longue
 * séquence concordante. Segment en début = opening, en fin = ending.
 * On écrit `op:[début,fin]` / `ed:[début,fin]` (secondes) dans le JOSN des épisodes.
 *
 * Usage : node scripts/detect-op-ed-chromaprint.mjs <job> [--apply]
 *   <job> = aot   (source locale + cible src/data/aot-videos.json, saison S04)
 *   --apply : écrit dans le JSON (sinon, dry-run : rapport seulement)
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const TEMP = path.join(os.tmpdir(), 'opdet')
fs.mkdirSync(TEMP, { recursive: true })

// ── Jobs : où sont les sources et comment mapper vers le JSON ──
const SRC_AOT = 'F:\\Brams-Score-By-Freydiss-new\\public\\anime\\[Tsundere-Raws] Shingeki no Kyojin S4 - BATCH VOSTFR (WKN) [1080p]'
const JOBS = {
  aot: {
    json: path.join(root, 'src', 'data', 'aot-videos.json'),
    // épisodes ciblés = saison S04 ; clé d'appariement source→entrée = numéro d'épisode
    match: v => /S04E(\d+)/.exec(v.src || '')?.[1],
    sources: () => fs.readdirSync(SRC_AOT)
      .filter(f => /\.mp4$/i.test(f))
      .map(f => ({ ep: String(parseInt(/S4\s*-\s*(\d{1,2})/i.exec(f)?.[1], 10)).padStart(2, '0'), file: path.join(SRC_AOT, f) }))
      .filter(x => x.ep !== 'NaN'),
  },
}

const popcount = x => { x = x | 0; let c = 0; while (x) { c += x & 1; x >>>= 1 } return c }

function audioDuration(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' })
  return parseFloat(r.stdout.trim()) || 0
}

function fingerprint(file) {
  const out = path.join(TEMP, 'fp_' + Buffer.from(file).toString('hex').slice(-16) + '.bin')
  spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', file, '-ac', '1', '-f', 'chromaprint', '-fp_format', 'raw', out])
  const buf = fs.readFileSync(out)
  const fp = new Int32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4))
  const dur = audioDuration(file)
  return { fp, itemDur: dur / fp.length, dur }
}

// Trouve les segments partagés entre X et la référence R. Renvoie des runs {start,end} (s) dans X.
function sharedRuns(R, X, itemDur) {
  // index des valeurs de R (on ignore les valeurs trop fréquentes = silence/bruit commun)
  const idxByVal = new Map()
  for (let i = 0; i < R.length; i++) {
    const a = idxByVal.get(R[i]); if (a) a.push(i); else idxByVal.set(R[i], [i])
  }
  // histogramme des offsets (i_R - j_X) sur les correspondances exactes
  const offCount = new Map()
  for (let j = 0; j < X.length; j++) {
    const list = idxByVal.get(X[j]); if (!list || list.length > 12) continue
    for (const i of list) { const o = i - j; offCount.set(o, (offCount.get(o) || 0) + 1) }
  }
  const topOffsets = [...offCount.entries()].filter(e => e[1] >= 40).sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => e[0])

  const minItems = Math.round(50 / itemDur)   // segment ≥ 50 s
  const runs = []
  for (const d of topOffsets) {
    let runStart = -1, gap = 0
    for (let j = 0; j < X.length; j++) {
      const i = j + d
      const ok = i >= 0 && i < R.length && popcount(R[i] ^ X[j]) <= 6
      if (ok) { if (runStart < 0) runStart = j; gap = 0 }
      else if (runStart >= 0) {
        if (++gap > 20) { if (j - gap - runStart >= minItems) runs.push([runStart, j - gap]); runStart = -1; gap = 0 }
      }
    }
    if (runStart >= 0 && X.length - runStart >= minItems) runs.push([runStart, X.length - 1])
  }
  // fusionne les runs qui se chevauchent, convertit en secondes
  runs.sort((a, b) => a[0] - b[0])
  const merged = []
  for (const r of runs) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1] + minItems / 2) last[1] = Math.max(last[1], r[1])
    else merged.push([...r])
  }
  return merged.map(([s, e]) => [Math.round(s * itemDur), Math.round(e * itemDur)])
}

function main() {
  const jobKey = (process.argv[2] || '').toLowerCase()
  const apply = process.argv.includes('--apply')
  const job = JOBS[jobKey]
  if (!job) { console.log('Job inconnu. Dispo :', Object.keys(JOBS).join(', ')); process.exit(1) }

  const sources = job.sources().sort((a, b) => a.ep.localeCompare(b.ep))
  console.log(`${sources.length} épisodes — empreinte...`)
  const fps = {}
  for (const s of sources) { process.stdout.write(`  Ep${s.ep}...`); fps[s.ep] = fingerprint(s.file); process.stdout.write(` ${fps[s.ep].fp.length} items (${fps[s.ep].dur | 0}s)\n`) }

  const eps = sources.map(s => s.ep)
  const result = {}
  for (let k = 0; k < eps.length; k++) {
    const ep = eps[k]
    const ref = fps[eps[(k + 1) % eps.length]]      // référence = épisode voisin
    const { fp, itemDur, dur } = fps[ep]
    const runs = sharedRuns(ref.fp, fp, itemDur)
    // classe : opening = segment dont le milieu est dans les 45 premiers %, ending = dans les 45 derniers %
    let op = null, ed = null
    for (const [s, e] of runs) {
      const mid = (s + e) / 2
      if (mid < dur * 0.45 && (e - s) >= 60 && (!op || (e - s) > (op[1] - op[0]))) op = [s, e]
      else if (mid > dur * 0.5 && (e - s) >= 50 && (!ed || (e - s) > (ed[1] - ed[0]))) ed = [s, e]
    }
    result[ep] = { op, ed, runs }
    console.log(`Ep${ep}: op=${op ? op.join('-') : '—'}  ed=${ed ? ed.join('-') : '—'}  (runs: ${runs.map(r => r.join('-')).join(', ') || 'aucun'})`)
  }

  if (apply) {
    const data = JSON.parse(fs.readFileSync(job.json, 'utf8'))
    let n = 0
    for (const v of data) {
      const ep = job.match(v); if (!ep) continue
      const r = result[ep]; if (!r) continue
      if (r.op) { v.op = r.op; n++ }
      if (r.ed) { v.ed = r.ed }
    }
    fs.writeFileSync(job.json, JSON.stringify(data, null, 2), 'utf8')
    console.log(`\n✓ marqueurs écrits dans ${path.basename(job.json)} (${n} épisodes avec OP)`)
  } else {
    console.log('\n(dry-run — relance avec --apply pour écrire dans le JSON)')
  }
}
main()
