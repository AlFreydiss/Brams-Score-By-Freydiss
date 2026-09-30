#!/usr/bin/env node
// ── Repères opening / ending depuis les chapitres des MKV sources ────────────
//
// Le lecteur affiche « Passer l'intro » et enchaîne l'épisode suivant dès le
// générique de fin — mais seulement si l'épisode porte op / ed dans son JSON.
// Plus de 600 épisodes n'en avaient pas. Les sorties BD rangent justement
// l'opening et l'ending dans des chapitres : on les relit ici.
//
// Garde-fou : la vidéo en ligne doit avoir la durée de la source (±1,5 s),
// sinon les temps tomberaient à côté. Un épisode qui a déjà op/ed est laissé.
//
//   node scripts/markers-from-chapters.mjs <serie> [--write]
//   séries : kny, hxh, bleach

import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = 'F:/Brams-Score-By-Freydiss-new/public/anime'

// progressKey → fichier source
const SERIES = {
  kny: {
    json: 'kny-videos.json', dir: 'Kimetsu no Yaiba',
    key: f => { const m = f.match(/S(\d+)E(\d+)/); return m && !/Movie|Gakuen/.test(f) ? `kny-S${m[1].padStart(2, '0')}E${m[2].padStart(2, '0')}` : null },
  },
  hxh: {
    json: 'hxh-videos.json', dir: 'Hunter x Hunter (2011) MULTI BDrip 1080p FLAC x265-GundamGuy',
    key: f => { const m = f.match(/\(2011\) - (\d{3}) /); return m ? `hxh-E${m[1]}` : null },
  },
  bleach: {
    json: 'bleach-videos.json', dir: 'Bleach',
    key: f => { const m = f.match(/S01E(\d{3}) BDRIP/); return m ? `S01E${m[1]}` : null },
  },
}

const OP_RE = /opening|\bop\b|générique d'ouverture|generique d'ouverture|شارة البداية/i
const ED_RE = /ending|\bed\b|générique de fin|generique de fin|شارة النهاية/i

function walk(d, out = []) {
  for (const f of readdirSync(d)) {
    const p = join(d, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.mkv$/i.test(f)) out.push(p)
  }
  return out
}

const probeJson = (target, args) => JSON.parse(execFileSync('ffprobe', ['-v', 'error', ...args, '-of', 'json', target], { timeout: 60000 }).toString())

function markers(file) {
  const j = probeJson(file, ['-show_chapters', '-show_entries', 'format=duration'])
  const dur = Number(j.format?.duration) || 0
  const ch = (j.chapters || []).map(c => ({ t: c.tags?.title || '', s: Number(c.start_time), e: Number(c.end_time) }))
  if (!ch.length) return { dur }
  const r = x => Math.round(x * 10) / 10
  // Un opening commence dans le premier tiers : l'épisode 1 de Kimetsu passe sa
  // chanson d'ouverture en générique de FIN, un « Passer l'intro » là serait absurde.
  let op = ch.find(c => OP_RE.test(c.t) && c.s < dur * 0.4)
  let ed = [...ch].reverse().find(c => ED_RE.test(c.t))
  // Chapitres sans nom : on reconnaît le générique à sa durée (≈ 1 min 30).
  if (!op) op = ch.find(c => c.s < 200 && c.e - c.s >= 60 && c.e - c.s <= 120)
  if (!ed) ed = [...ch].reverse().find(c => c.s > dur * 0.8 && c.e - c.s >= 55 && c.e - c.s <= 100)
  return { dur, op: op ? [r(op.s), r(op.e)] : null, ed: ed ? [r(ed.s), r(ed.e)] : null }
}

const [name, ...rest] = process.argv.slice(2)
const cfg = SERIES[name]
if (!cfg) { console.error('séries :', Object.keys(SERIES).join(', ')); process.exit(1) }
const WRITE = rest.includes('--write')

const jsonPath = join(ROOT, 'src', 'data', cfg.json)
const raw = readFileSync(jsonPath, 'utf8')
const videos = JSON.parse(raw)
const byKey = new Map(videos.map(v => [v.progressKey, v]))
const files = new Map(walk(join(SRC, cfg.dir)).map(f => [cfg.key(f.split(/[\\/]/).pop()), f]).filter(([k]) => k))

let added = 0, skipped = 0, mismatch = 0
for (const [key, file] of files) {
  const v = byKey.get(key)
  if (!v || (v.op && v.ed)) { skipped++; continue }
  const m = markers(file)
  if (!m.op && !m.ed) { skipped++; continue }
  let online = 0
  try { online = Number(probeJson(v.src, ['-show_entries', 'format=duration']).format?.duration) || 0 } catch {}
  if (!online || Math.abs(online - m.dur) > 1.5) { mismatch++; console.log(`  ≠ ${key} source ${m.dur.toFixed(1)} s / en ligne ${online.toFixed(1)} s`); continue }
  if (m.op && !v.op) v.op = m.op
  if (m.ed && !v.ed) v.ed = m.ed
  added++
  console.log(`  ✓ ${key} op ${JSON.stringify(v.op)} ed ${JSON.stringify(v.ed)}`)
}
console.log(`\n${name} : ${added} épisode(s) balisés · ${skipped} sautés · ${mismatch} durées différentes`)
if (WRITE && added) {
  const eol = raw.includes('\r\n') ? '\r\n' : '\n'
  writeFileSync(jsonPath, JSON.stringify(videos, null, 2).replace(/\n/g, eol) + eol)
  console.log(`écrit ${cfg.json}`)
}
