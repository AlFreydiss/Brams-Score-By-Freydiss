#!/usr/bin/env node
// ── Guess Who : génère le pack de sons ───────────────────────────────────────
// 1. Techniques : cherche les noms de techniques dans les sous-titres VTT des
//    épisodes R2 (src/data/*-videos.json), coupe 2–6 s sur la piste VF et la
//    piste JA quand elles existent.
// 2. Openings : 6 s autour du passage le plus fort des openings Blind Test.
// Sortie : mp3 sur R2 (guesswho/clips/<id>.mp3), seed.sql (enabled=false) et
// ecoute.html pour valider à l'oreille. Un objet déjà sur R2 est sauté.
//
//   node scripts/guesswho-build-clips.mjs [--dry] [--max 80]

import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseVtt, findTechniqueCues, clipWindow, bestWindow, clipId } from './guesswho/cues.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const env = {}
for (const p of [join(ROOT, '.env.local'), join(ROOT, '.env')]) {
  try {
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) env[m[1].trim()] ??= m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {}
}
const { CF_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = { ...env, ...process.env }
const PUBLIC = 'https://pub-d5e23a54185c409aba2673d9a21d2b1d.r2.dev'
const argv = process.argv.slice(2)
const DRY = argv.includes('--dry')
const MAX = Number(argv[argv.indexOf('--max') + 1]) || 80
const OUT = join(process.env.ENCODE_TMP || 'F:/brams-encode-tmp', 'guesswho')
mkdirSync(OUT, { recursive: true })

const s3 = new S3Client({
  region: 'auto', endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})
async function exists(key) {
  try { await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key })); return true } catch { return false }
}

// Techniques par série (motifs sur le texte FR des sous-titres, accents ignorés).
const KEYWORDS = {
  dbs: [
    { label: 'Kamehameha', patterns: [/kam[eé]ham[eé]ha/i] },
    { label: 'Final Flash', patterns: [/final flash/i] },
    { label: 'Genki Dama', patterns: [/genki ?dama/i] },
  ],
  jjk: [
    { label: 'Extension du territoire', patterns: [/(extension|expansion) du territoire/i, /ryo[uū]?iki tenkai/i] },
    { label: 'Éclair noir', patterns: [/[eé]clair noir/i, /black flash/i] },
    { label: 'Violet', patterns: [/\bviolet\b/i, /hollow purple/i] },
  ],
  kny: [
    { label: "Souffle de l'eau", patterns: [/(souffle|respiration) de l.eau/i] },
    { label: 'Souffle de la foudre', patterns: [/(souffle|respiration) de la foudre/i, /premi[eè]re forme/i] },
    { label: 'Danse du dieu du feu', patterns: [/danse du dieu du feu/i, /hinokami/i] },
  ],
  bleach: [
    { label: 'Bankai', patterns: [/\bbankai\b/i] },
    { label: 'Getsuga Tensho', patterns: [/getsuga tensh[oō]/i] },
  ],
  hxh: [{ label: 'Jajanken', patterns: [/jajanken/i, /janken/i] }],
  mha: [
    { label: 'Smash', patterns: [/(detroit|texas|delaware|united states of) smash/i] },
    { label: 'Plus Ultra', patterns: [/plus ultra/i] },
  ],
  bc: [{ label: 'Empereur-Mage', patterns: [/empereur[- ]mage/i] }],
  sl: [{ label: 'Lève-toi', patterns: [/\bl[eè]ve[- ]toi\b/i, /\barise\b/i] }],
  aot: [{ label: 'Offrez vos cœurs', patterns: [/offrez vos c(œ|oe)urs/i] }],
  fireforce: [{ label: 'Latom', patterns: [/\blatom\b/i] }],
}

function run(cmd, args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', capture ? 'pipe' : 'ignore', 'pipe'] })
    const chunks = []; let err = ''
    if (capture) p.stdout.on('data', (d) => chunks.push(d))
    p.stderr.on('data', (d) => { err += d })
    p.on('close', (code) => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(err.slice(-400))))
  })
}

async function cutMp3(src, start, duration, file) {
  await run('ffmpeg', ['-hide_banner', '-y', '-ss', String(start), '-i', src, '-t', String(duration),
    '-vn', '-ac', '1', '-ar', '44100', '-af', 'afade=t=in:d=0.05,loudnorm=I=-16:TP=-1.5',
    '-c:a', 'libmp3lame', '-b:a', '96k', file])
}

async function upload(id, file) {
  const key = `guesswho/clips/${id}.mp3`
  if (DRY || await exists(key)) return `${PUBLIC}/${key}`
  await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: readFileSync(file), ContentType: 'audio/mpeg' }))
  return `${PUBLIC}/${key}`
}

async function pool(items, n, fn) {
  const out = []; let i = 0
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]).catch((e) => ({ error: e.message })) }
  }))
  return out
}

async function techniqueClips() {
  const clips = []
  for (const [series, keywords] of Object.entries(KEYWORDS)) {
    const file = join(ROOT, 'src/data', `${series}-videos.json`)
    let videos
    try { videos = JSON.parse(readFileSync(file, 'utf8')) } catch { console.log(`  (pas de ${series}-videos.json)`); continue }
    const vtts = await pool(videos, 8, async (v) => {
      const sub = (v.subtitles || []).find((s) => s.srclang === 'fr') || v.subtitles?.[0]
      if (!sub) return null
      const res = await fetch(sub.src)
      return res.ok ? { v, cues: parseVtt(await res.text()) } : null
    })
    const perKeyword = new Map()
    for (const item of vtts) {
      if (!item?.cues) continue
      for (const hit of findTechniqueCues(item.cues, keywords, 1)) {
        const n = perKeyword.get(hit.label) || 0
        if (n >= 3) continue
        perKeyword.set(hit.label, n + 1)
        const tracks = (item.v.audio?.length ? item.v.audio : [{ srclang: item.v.preferredAudioLang || 'ja', mediaSrc: item.v.src }])
          .filter((a) => a.mediaSrc && (a.srclang === 'fr' || a.srclang === 'ja'))
        for (const a of tracks) {
          const ep = item.v.progressKey || `ep${item.v.episode}`
          clips.push({
            id: clipId([series, ep, a.srclang, hit.label]),
            title: hit.label, anime: series, lang: a.srclang, kind: 'technique',
            src: a.mediaSrc, ...clipWindow(hit),
          })
        }
      }
    }
    console.log(`  ${series} : ${[...perKeyword.values()].reduce((x, y) => x + y, 0)} répliques trouvées`)
  }
  return clips
}

async function openingClips(limit) {
  const mod = await import(pathToFileURL(join(ROOT, 'src/data/opening-r2-catalog.js')).href)
  const list = mod.OPENING_R2_CATALOG.filter((o) => o.type === 'OP').slice(0, limit)
  return pool(list, 4, async (o) => {
    const pcm = await run('ffmpeg', ['-hide_banner', '-t', '75', '-i', o.audioUrl, '-vn', '-ac', '1', '-ar', '200', '-f', 'f32le', '-'], { capture: true })
    const samples = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 4))
    return { id: clipId(['op', o.id]), title: o.title, anime: o.anime, lang: 'ja', kind: 'opening',
      src: o.audioUrl, start: bestWindow(samples, 200, 6, 12), duration: 6 }
  })
}

const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`

async function main() {
  console.log('Techniques…')
  const tech = await techniqueClips()
  console.log('Openings…')
  const ops = (await openingClips(40)).filter((c) => c && !c.error)
  const all = [...tech, ...ops].slice(0, MAX)
  console.log(`${all.length} extraits à couper`)
  const done = await pool(all, 3, async (c) => {
    const file = join(OUT, `${c.id}.mp3`)
    await cutMp3(c.src, c.start, c.duration, file)
    const url = await upload(c.id, file)
    console.log(`  ✓ ${c.id}`)
    return { ...c, url, file }
  })
  const ok = done.filter((c) => c && !c.error)
  writeFileSync(join(OUT, 'clips.json'), JSON.stringify(ok, null, 2))
  writeFileSync(join(OUT, 'seed.sql'), ok.map((c) =>
    `insert into guesswho_clips(id, title, anime, lang, kind, url, duration, enabled) values (${sqlStr(c.id)}, ${sqlStr(c.title)}, ${sqlStr(c.anime)}, ${sqlStr(c.lang)}, ${sqlStr(c.kind)}, ${sqlStr(c.url)}, ${c.duration}, false) on conflict (id) do update set title = excluded.title, url = excluded.url, duration = excluded.duration;`,
  ).join('\n') + '\n')
  writeFileSync(join(OUT, 'ecoute.html'), `<!doctype html><meta charset="utf-8"><title>Guess Who — validation des sons</title>
<style>body{background:#0b0b10;color:#eee;font:15px system-ui;padding:24px}li{margin:8px 0;list-style:none}audio{vertical-align:middle;height:30px}textarea{width:100%;height:120px}</style>
<h1>Guess Who — sons à valider</h1><p>Écoute, coche ceux qui sont bons, puis copie la requête SQL du bas dans Supabase.</p>
<ul>${ok.map((c) => `<li><label><input type="checkbox" value="${c.id}" checked> <b>${c.title}</b> — ${c.anime} (${c.lang.toUpperCase()}, ${c.kind})</label> <audio controls preload="none" src="${c.file.replace(/\\/g, '/')}"></audio></li>`).join('')}</ul>
<textarea id="sql" readonly></textarea>
<script>const u=()=>{const ids=[...document.querySelectorAll('input:checked')].map(i=>"'"+i.value+"'");document.getElementById('sql').value='update guesswho_clips set enabled = (id in ('+(ids.join(', ')||"''")+'));'};document.querySelectorAll('input').forEach(i=>i.onchange=u);u()</script>`)
  console.log(`\nFini : ${ok.length} sons. Fichiers dans ${OUT} (seed.sql, ecoute.html).`)
  const failed = done.filter((c) => c?.error)
  if (failed.length) console.log(`${failed.length} échecs (ignorés).`)
}

main().catch((e) => { console.error(e); process.exit(1) })
