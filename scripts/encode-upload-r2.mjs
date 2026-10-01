#!/usr/bin/env node
// ── Encodage GPU + envoi R2 d'une liste d'épisodes / films ──────────────────
//
// Les sources (MKV x265 / AV1, audio FLAC / Opus, sous-titres ASS) ne se lisent
// pas dans un navigateur. Pour chaque job du fichier JSON :
//   · vidéo → H.264 NVENC 1080p, audio choisi par langue → AAC stéréo,
//     MP4 « faststart » (lecture avant la fin du téléchargement) ;
//   · piste de sous-titres choisie par langue (la « Full » d'abord) → WebVTT ;
//   · miniature 640 px prise à 40 % de la durée.
// Tout va sur Cloudflare R2 (jamais Supabase Storage : egress). Un objet déjà
// présent est sauté : relancer la même commande reprend là où ça s'est arrêté.
//
//   node scripts/encode-upload-r2.mjs <jobs.json> [--only 3,4] [--dry]
//
// Job : { "src": "F:/…/ep.mkv", "key": "anime/kny/S03E01",
//         "audio": "jpn", "subs": "fre", "variants": [{ "suffix": "vf", "audio": "fre" }] }
// → <key>-vostfr.mp4 (ou -<suffix>.mp4 par variante), <key>-fr.vtt, thumbnail.

import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { spawn, execFileSync } from 'node:child_process'
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, unlinkSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

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

const argv = process.argv.slice(2)
const jobsFile = argv.find(a => !a.startsWith('--'))
const DRY = argv.includes('--dry')
const onlyArg = argv[argv.indexOf('--only') + 1]
const ONLY = argv.includes('--only') ? new Set(onlyArg.split(',').map(Number)) : null
if (!jobsFile) { console.error('usage: encode-upload-r2.mjs <jobs.json> [--only 1,2] [--dry]'); process.exit(1) }
const jobs = JSON.parse(readFileSync(jobsFile, 'utf8'))

const TMP = process.env.ENCODE_TMP || 'F:/brams-encode-tmp'
mkdirSync(TMP, { recursive: true })

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

async function exists(key) {
  try { await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key })); return true } catch { return false }
}
async function put(key, file, type) {
  const up = new Upload({
    client: s3, queueSize: 4, partSize: 32 * 1024 * 1024,
    params: { Bucket: R2_BUCKET_NAME, Key: key, Body: createReadStream(file), ContentType: type, CacheControl: 'public, max-age=31536000, immutable' },
  })
  let last = 0
  up.on('httpUploadProgress', p => {
    const pct = p.total ? Math.floor((p.loaded / p.total) * 100) : 0
    if (pct >= last + 10) { last = pct; process.stdout.write(` ${pct}%`) }
  })
  await up.done()
}

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-stats', '-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] })
    let tail = ''
    child.stderr.on('data', d => { tail = (tail + d).slice(-2000) })
    child.on('close', code => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${tail.slice(-400)}`))))
  })
}

function probe(src) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=index,codec_type,codec_name:stream_tags=language,title:format=duration', '-of', 'json', src]).toString()
  return JSON.parse(out)
}
const lang = s => (s.tags?.language || '').toLowerCase()

function pickAudio(info, want) {
  const a = info.streams.filter(s => s.codec_type === 'audio')
  return (a.find(s => lang(s) === want) || a[0])?.index
}
function pickSubs(info, want) {
  const text = info.streams.filter(s => s.codec_type === 'subtitle' && /ass|ssa|subrip|mov_text|webvtt/.test(s.codec_name) && lang(s) === want)
  return (text.find(s => /full|complet/i.test(s.tags?.title || '')) || text.find(s => !/forced|sign/i.test(s.tags?.title || '')) || text[0])?.index
}

const base = key => key.split('/').pop()
const dir = key => key.split('/').slice(0, -1).join('/')

let n = 0
for (const [i, job] of jobs.entries()) {
  if (ONLY && !ONLY.has(i)) continue
  n++
  if (!existsSync(job.src)) { console.log(`\n[${i}] SOURCE ABSENTE ${job.src}`); continue }
  const info = probe(job.src)
  const dur = Number(info.format?.duration) || 0
  const variants = job.variants || [{ suffix: 'vostfr', audio: job.audio || 'jpn' }]
  const subIdx = job.subs === false ? undefined : pickSubs(info, job.subs || 'fre')
  console.log(`\n[${i}] ${basename(job.src).slice(0, 70)} (${Math.round(dur / 60)} min) → ${job.key}  subs#${subIdx ?? '-'}`)
  if (DRY) { variants.forEach(v => console.log(`     ${job.key}-${v.suffix}.mp4 audio#${pickAudio(info, v.audio)}`)); continue }

  for (const v of variants) {
    const key = `${job.key}-${v.suffix}.mp4`
    if (await exists(key)) { console.log(`     = ${key} déjà en ligne`); continue }
    const out = join(TMP, `${base(job.key)}-${v.suffix}.mp4`)
    const t0 = Date.now()
    process.stdout.write(`     encodage ${v.suffix}…`)
    await run([
      '-hwaccel', 'cuda', '-i', job.src,
      '-map', '0:v:0', '-map', `0:${pickAudio(info, v.audio)}`,
      '-c:v', 'h264_nvenc', '-preset', 'p5', '-tune', 'hq', '-rc', 'vbr', '-cq', '23', '-b:v', '0', '-maxrate', '7M', '-bufsize', '14M',
      '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-vf', "scale='min(1920,iw)':-2",
      '-c:a', 'aac', '-b:a', '160k', '-ac', '2',
      '-map_metadata', '-1', '-map_chapters', '-1', '-movflags', '+faststart', out,
    ])
    const mb = (statSync(out).size / 1048576).toFixed(0)
    process.stdout.write(` ${((Date.now() - t0) / 1000).toFixed(0)} s, ${mb} Mo — envoi`)
    await put(key, out, 'video/mp4')
    unlinkSync(out)
    console.log(' ✓')
  }

  if (subIdx != null) {
    const key = `${job.key}-fr.vtt`
    if (!(await exists(key))) {
      const out = join(TMP, `${base(job.key)}-fr.vtt`)
      await run(['-i', job.src, '-map', `0:${subIdx}`, '-c:s', 'webvtt', out])
      await put(key, out, 'text/vtt; charset=utf-8'); unlinkSync(out)
      console.log(`     ✓ ${key}`)
    }
  }

  const thumbKey = job.thumbKey || `${dir(job.key)}/thumbnails/${base(job.key)}.jpg`
  if (!(await exists(thumbKey))) {
    const out = join(TMP, `${base(job.key)}.jpg`)
    // 0:V:0 = vraie piste vidéo (ignore les images de couverture des MKV, qui
    // faisaient échouer l'extraction). Repli à 10 %, puis on continue sans
    // miniature plutôt que d'arrêter tout l'encodage.
    let ok = false
    for (const at of [job.thumbAt ?? 0.4, 0.1]) {
      try {
        await run(['-ss', String(Math.round(dur * at)), '-i', job.src, '-map', '0:V:0', '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '3', out])
        ok = true
        break
      } catch { /* essai suivant */ }
    }
    if (ok) {
      await put(thumbKey, out, 'image/jpeg'); unlinkSync(out)
      console.log(`     ✓ ${thumbKey}`)
    } else {
      console.log(`     ✗ miniature impossible pour ${job.key} (épisode quand même en ligne)`)
    }
  }
}
console.log(`\nterminé : ${n} job(s)`)
