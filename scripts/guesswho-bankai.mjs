#!/usr/bin/env node
// Guess Who : découpe des cris de Bankai depuis un fichier audio local
// (passages sonores détectés par silencedetect → segs.json). Pour un passage
// long, on garde la fenêtre de 5 s la plus forte (le cri). Envoi R2 + SQL.
//   node scripts/guesswho-bankai.mjs <dossier contenant src.wav et segs.json>
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bestWindow } from './guesswho/cues.mjs'

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
const DIR = process.argv[2]
const s3 = new S3Client({
  region: 'auto', endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

function run(args, capture = false) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', capture ? 'pipe' : 'ignore', 'pipe'] })
    const out = []; let err = ''
    if (capture) p.stdout.on('data', (d) => out.push(d))
    p.stderr.on('data', (d) => { err += d })
    p.on('close', (c) => c === 0 ? resolve(Buffer.concat(out)) : reject(new Error(err.slice(-300))))
  })
}

const src = join(DIR, 'src.wav')
const segs = JSON.parse(readFileSync(join(DIR, 'segs.json'), 'utf8')).filter(([a, b]) => b - a >= 1.5)
const rows = []
let n = 0
for (const [a, b] of segs) {
  const len = b - a
  let start = a, duration = Math.min(6, len)
  if (len > 6) {
    const pcm = await run(['-hide_banner', '-ss', String(a), '-t', String(len), '-i', src, '-ac', '1', '-ar', '200', '-f', 'f32le', '-'], true)
    const samples = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 4))
    start = a + bestWindow(samples, 200, 5, 0)
    duration = 5
  }
  n++
  const id = `bleach-bankai-yt-${String(n).padStart(2, '0')}`
  const file = join(DIR, `${id}.mp3`)
  await run(['-hide_banner', '-y', '-ss', start.toFixed(2), '-t', String(duration), '-i', src, '-vn', '-ac', '1', '-ar', '44100',
    '-af', 'afade=t=in:d=0.05,afade=t=out:st=' + (duration - 0.15).toFixed(2) + ':d=0.15,loudnorm=I=-16:TP=-1.5',
    '-c:a', 'libmp3lame', '-b:a', '96k', file])
  const key = `guesswho/clips/${id}.mp3`
  let there = false
  try { await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key })); there = true } catch {}
  if (!there) await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: readFileSync(file), ContentType: 'audio/mpeg' }))
  rows.push({ id, url: `${PUBLIC}/${key}`, duration: Math.round(duration * 100) / 100, at: Math.round(start), file })
  console.log(`✓ ${id} (${Math.round(start)} s)`)
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`
writeFileSync(join(DIR, 'bankai.sql'), rows.map((r) =>
  `insert into guesswho_clips(id, title, anime, lang, kind, url, duration, enabled) values (${q(r.id)}, 'Bankai !', 'Bleach', 'ja', 'technique', ${q(r.url)}, ${r.duration}, true) on conflict (id) do update set url = excluded.url, duration = excluded.duration;`,
).join('\n') + '\n')
writeFileSync(join(DIR, 'ecoute.html'), `<!doctype html><meta charset="utf-8"><title>Bankai — validation</title>
<style>body{background:#0b0b10;color:#eee;font:15px system-ui;padding:24px}li{margin:8px 0;list-style:none}audio{vertical-align:middle;height:30px}textarea{width:100%;height:120px}</style>
<h1>Bankai — sons à valider</h1><p>Décoche les mauvais, puis colle la requête du bas dans Supabase.</p>
<ul>${rows.map((r) => `<li><label><input type="checkbox" value="${r.id}" checked> ${r.id} (à ${r.at} s)</label> <audio controls preload="none" src="${r.file.replace(/\\/g, '/')}"></audio></li>`).join('')}</ul>
<textarea id="sql" readonly></textarea>
<script>const u=()=>{const off=[...document.querySelectorAll('input:not(:checked)')].map(i=>"'"+i.value+"'");document.getElementById('sql').value=off.length?'update guesswho_clips set enabled = false where id in ('+off.join(', ')+');':'-- tout est gardé'};document.querySelectorAll('input').forEach(i=>i.onchange=u);u()</script>`)
console.log(`\n${rows.length} Bankai → ${join(DIR, 'bankai.sql')}`)
